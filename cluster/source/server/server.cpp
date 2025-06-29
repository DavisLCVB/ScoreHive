#include "server.hpp"
#include <mpi.h>
#include <spdlog/spdlog.h>
#include <array>
#include <cstring>
#include <domain/answers.hpp>
#include <domain/coordinator.hpp>
#include <nlohmann/json.hpp>
#include <server/watcher.hpp>
#include <sstream>
#include <string>

using json = nlohmann::json;

Server::Server(boost::asio::io_context& io_context, const ServerConfig& config)
    : _io_context(io_context), _config(config) {
  MPI_Comm_size(MPI_COMM_WORLD, &_mpi_size);
}

void Server::start() {
  spdlog::info("Starting async server on port {}...", _config.port);

  // Start MPIWatcher
  MPIWatcher::instance().start(_io_context, _mpi_size);

  // Create acceptor
  _acceptor = std::make_unique<boost::asio::ip::tcp::acceptor>(_io_context);

  boost::asio::ip::tcp::endpoint endpoint(boost::asio::ip::tcp::v4(),
                                          _config.port);
  _acceptor->open(endpoint.protocol());
  _acceptor->set_option(boost::asio::ip::tcp::acceptor::reuse_address(true));
  _acceptor->bind(endpoint);
  _acceptor->listen(_config.backlog);

  _start_accept();
  spdlog::info("Server started successfully");
}

void Server::stop() {
  spdlog::info("Stopping server...");
  _shutdown = true;

  if (_acceptor) {
    _acceptor->close();
  }

  MPIWatcher::instance().stop();
  spdlog::info("Server stopped");
}

void Server::_start_accept() {
  if (_shutdown) {
    return;
  }

  auto socket = std::make_shared<boost::asio::ip::tcp::socket>(_io_context);

  _acceptor->async_accept(
      *socket, [this, socket](const boost::system::error_code& error) {
        _handle_accept(socket, error);
      });
}

void Server::_handle_accept(
    std::shared_ptr<boost::asio::ip::tcp::socket> socket,
    const boost::system::error_code& error) {
  if (!error) {
    spdlog::debug("Client connected from {}",
                  socket->remote_endpoint().address().to_string());
    _handle_client(socket);
  } else {
    spdlog::error("Accept error: {}", error.message());
  }

  _start_accept();
}

void Server::_handle_client(
    std::shared_ptr<boost::asio::ip::tcp::socket> socket) {
  auto buffer = std::make_shared<std::vector<char>>(8192);
  auto message = std::make_shared<std::string>();

  _read_async(socket, buffer, message);
}

void Server::_read_async(std::shared_ptr<boost::asio::ip::tcp::socket> socket,
                         std::shared_ptr<std::vector<char>> buffer,
                         std::shared_ptr<std::string> message) {
  socket->async_read_some(
      boost::asio::buffer(*buffer),
      [this, socket, buffer, message](const boost::system::error_code& error,
                                      std::size_t bytes_transferred) {
        _handle_read(socket, buffer, message, error, bytes_transferred);
      });
}

void Server::_handle_read(std::shared_ptr<boost::asio::ip::tcp::socket> socket,
                          std::shared_ptr<std::vector<char>> buffer,
                          std::shared_ptr<std::string> message,
                          const boost::system::error_code& error,
                          std::size_t bytes_transferred) {
  if (error) {
    if (error != boost::asio::error::eof) {
      spdlog::error("Read error: {}", error.message());
    }
    return;
  }

  message->append(buffer->data(), bytes_transferred);

  if (message->size() > _config.max_message_size) {
    spdlog::error("Message size exceeds maximum allowed size");
    ScoreHiveResponse error_response;
    error_response.code = ScoreHiveResponseCode::ERROR;
    error_response.data = "Message too large";
    error_response.length = error_response.data.size();
    _send_response(socket, error_response);
    return;
  }

  // Check if we have a complete message (ends with '$')
  if (message->find('$') != std::string::npos) {
    ScoreHiveRequest request;
    try {
      _parse_request(*message, request);
      spdlog::debug("Request parsed successfully");

      // Handle different request types
      if (request.command == ScoreHiveCommand::REVIEW) {
        _handle_review(socket, request);
      } else {
        // Handle other commands synchronously
        ScoreHiveResponse response;
        _handle_request_sync(request, response);
        _send_response(socket, response);
      }
    } catch (const std::exception& e) {
      spdlog::error("Failed to parse request: {}", e.what());
      ScoreHiveResponse error_response;
      error_response.code = ScoreHiveResponseCode::ERROR;
      error_response.data = e.what();
      error_response.length = error_response.data.size();
      _send_response(socket, error_response);
    }
  } else {
    // Continue reading
    _read_async(socket, buffer, message);
  }
}

void Server::_parse_request(const std::string& message,
                            ScoreHiveRequest& request) {
  std::istringstream iss(message);
  std::string token;
  if (!std::getline(iss, token, ' ') || token != "SH") {
    throw std::runtime_error("Invalid magic string");
  }
  if (!std::getline(iss, token, ' ')) {
    throw std::runtime_error("Missing command");
  }
  size_t pos = token.find('$');
  if (pos != std::string::npos) {
    token = token.substr(0, pos);
  }
  u8 command = static_cast<u8>(std::stoi(token));
  if (command > MAX_COMMAND) {
    throw std::runtime_error("Invalid command");
  }
  if (command == 0) {
    request.command = ScoreHiveCommand::GET_ANSWERS;
    request.length = 0;
    request.data = "";
    return;
  }
  if (command == 4) {
    request.command = ScoreHiveCommand::SHUTDOWN;
    request.length = 0;
    request.data = "";
    return;
  }
  if (!std::getline(iss, token, ' ')) {
    throw std::runtime_error("Missing length");
  }
  u32 length = static_cast<u32>(std::stoi(token));
  if (length > _config.max_message_size) {
    throw std::runtime_error("Length exceeds the maximum allowed size");
  }
  if (!std::getline(iss, token, '$')) {
    throw std::runtime_error("Missing delimiter");
  }
  if (token.size() != length) {
    throw std::runtime_error("Data length mismatch");
  }
  request.command = static_cast<ScoreHiveCommand>(command);
  request.length = length;
  request.data = token;
}

void Server::_handle_request_sync(const ScoreHiveRequest& request,
                                  ScoreHiveResponse& response) {
  switch (request.command) {
    case ScoreHiveCommand::GET_ANSWERS:
      _handle_get_answers(request, response);
      break;
    case ScoreHiveCommand::SET_ANSWERS:
      _handle_set_answers(request, response);
      break;
    case ScoreHiveCommand::ECHO:
      _handle_echo(request, response);
      break;
    case ScoreHiveCommand::SHUTDOWN:
      _handle_shutdown(request, response);
      break;
    default:
      _handle_bad_request(request, response);
      break;
  }
}

void Server::_handle_get_answers(
    [[maybe_unused]] const ScoreHiveRequest& request,
    ScoreHiveResponse& response) {
  auto data = AnswersManager::instance().save_to_json();
  response.code = ScoreHiveResponseCode::OK;
  response.length = data.size();
  response.data = data;
}

void Server::_handle_set_answers(const ScoreHiveRequest& request,
                                 ScoreHiveResponse& response) {
  auto data = json::parse(request.data);
  try {
    AnswersManager::instance().load_from_json(data);
  } catch (std::exception& e) {
    std::string message = "Set Answers Error: " + std::string(e.what());
    spdlog::error(message);
    response.code = ScoreHiveResponseCode::ERROR;
    response.length = message.size();
    response.data = message;
    return;
  }
  std::string message = "Set Answers OK";
  response.code = ScoreHiveResponseCode::OK;
  response.length = message.size();
  response.data = message;
}

void Server::_handle_review(
    std::shared_ptr<boost::asio::ip::tcp::socket> socket,
    const ScoreHiveRequest& request) {
  try {
    auto exams_json = json::parse(request.data);

    // Enqueue the review request asynchronously
    MPIWatcher::instance().enqueue_review_request(
        exams_json, [this, socket](const ScoreHiveResponse& response) {
          _send_response(socket, response);
        });

    spdlog::debug("Review request enqueued for async processing");
  } catch (const std::exception& e) {
    std::string message = "Review Error: " + std::string(e.what());
    spdlog::error(message);

    ScoreHiveResponse error_response;
    error_response.code = ScoreHiveResponseCode::ERROR;
    error_response.length = message.size();
    error_response.data = message;

    _send_response(socket, error_response);
  }
}

void Server::_handle_echo(const ScoreHiveRequest& request,
                          ScoreHiveResponse& response) {
  auto data = request.data;
  data = "Echo " + data;
  response.code = ScoreHiveResponseCode::OK;
  response.length = data.size();
  response.data = data;
}

void Server::_handle_shutdown([[maybe_unused]] const ScoreHiveRequest& request,
                              ScoreHiveResponse& response) {
  _shutdown = true;
  std::string message = "Server received shutdown signal";
  response.code = ScoreHiveResponseCode::OK;
  response.length = message.size();
  response.data = message;
  spdlog::info(message);
  auto& coordinator = MPICoordinator::instance();
  coordinator.send_shutdown_signal(_mpi_size);

  // Stop the server
  boost::asio::post(_io_context, [this]() { stop(); });
}

void Server::_handle_bad_request(
    [[maybe_unused]] const ScoreHiveRequest& request,
    ScoreHiveResponse& response) {
  response.code = ScoreHiveResponseCode::ERROR;
  response.length = 0;
  response.data = "Bad Request";
}

std::string Server::_parse_response(const ScoreHiveResponse& response) {
  std::string response_str = "SH";
  response_str += " ";
  response_str += std::to_string(static_cast<u8>(response.code));
  response_str += " ";
  response_str += std::to_string(response.length);
  response_str += " ";
  response_str += response.data;
  response_str += "$\r\n";
  return response_str;
}

void Server::_send_response(
    std::shared_ptr<boost::asio::ip::tcp::socket> socket,
    const ScoreHiveResponse& response) {
  auto response_str = std::make_shared<std::string>(_parse_response(response));

  boost::asio::async_write(
      *socket, boost::asio::buffer(*response_str),
      [socket, response_str](const boost::system::error_code& error,
                             std::size_t bytes_transferred) {
        if (error) {
          spdlog::error("Write error: {}", error.message());
        } else {
          spdlog::debug("Response sent successfully ({} bytes)",
                        bytes_transferred);
        }
        // Socket will be closed automatically when shared_ptr goes out of scope
      });
}