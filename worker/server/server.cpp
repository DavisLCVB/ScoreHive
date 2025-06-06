#include "server.hpp"
#include <iostream>
#include <regex>
#include <system/logger.hpp>

Server::Server(IOContext& context)
    : _context(context),
      _thread_pool(std::thread::hardware_concurrency()),
      _work_guard(asio::make_work_guard(context)) {}

auto Server::start(u16 port) -> void {
  if (!_process_connection_task) {
    throw std::runtime_error("Process connection task is not set");
  }
  _acceptor =
      std::make_unique<Acceptor>(_context, TCPEndpoint(TCP::v4(), port));
  _running = true;
  spdlog::info("Server started on port {}", port);
  _start_accept();
}

auto Server::_start_accept() -> void {
  if (!_running) {
    return;
  }
  SharedPtr<Socket> socket = std::make_shared<Socket>(_context);
  _acceptor->async_accept(*socket, [this, socket](const ErrorCode& acc_err) {
    if (!_running) {
      return;
    }
    if (!acc_err) {
      _process_connection(socket);
      _start_accept();
    } else {
      if (acc_err == error::bad_descriptor) {
        spdlog::error("Critical error: {}", acc_err.message());
        return;
      }
      try {
        auto timer = std::make_shared<SteadyTimer>(_context);
        timer->expires_after(std::chrono::milliseconds(100));
        timer->async_wait([this, timer](UNUSED const ErrorCode& tim_err) {
          _start_accept();
        });
      } catch (const Exception& e) {
        spdlog::error("Critical error setting up retry timer: {}", e.what());
      }
      return;
    }
  });
}

auto Server::_process_connection(UNUSED SharedPtr<Socket> socket) -> void {
  spdlog::debug("New connection from {}",
                socket->remote_endpoint().address().to_string());
  _connections++;
  auto read_buffer = std::make_shared<Streambuf>();
  auto read_callback = [this, socket, read_buffer](const ErrorCode& r_err,
                                                   u64 r_bytes) -> void {
    if (!r_err) {
      auto task_callback = [this, socket, read_buffer, r_bytes]() -> void {
        try {
          String request(
              asio::buffers_begin(read_buffer->data()),
              asio::buffers_begin(read_buffer->data()) + r_bytes - 4);
          if (!_process_connection_task) {
            throw std::runtime_error("Process connection task is not set");
          }

          spdlog::debug("Request: {}", Server::_scape_text(request));
          String response = (*_process_connection_task)(request);
          spdlog::debug("Response: {}", Server::_scape_text(response));
          auto write_buffer =
              std::make_shared<String>(std::move(response) + "\r\n\r\n");
          auto write_callback = [this, socket, write_buffer](
                                    const ErrorCode& w_err,
                                    UNUSED u64 w_bytes) -> void {
            if (w_err) {
              spdlog::error("Error sending response: {}", w_err.message());
            } else {
              spdlog::debug("Response sent to {}",
                            socket->remote_endpoint().address().to_string());
            }
            _connections--;
          };
          asio::async_write(*socket, asio::buffer(*write_buffer),
                            write_callback);
        } catch (const Exception& e) {
          spdlog::error("Error processing connection: {}", e.what());
          _connections--;
        }
      };
      _thread_pool.add_task(task_callback);
    } else {
      spdlog::error("Error reading request: {}", r_err.message());
      _connections--;
    }
  };
  asio::async_read_until(*socket, *read_buffer, "\r\n\r\n", read_callback);
}

auto Server::stop() -> void {
  _running = false;
  if (_acceptor) {
    _acceptor->close();
  }
  if (_connections > 0) {
    spdlog::info("Waiting for {} connections to finish", _connections.load());
  }
  _start_shutdown_monitor();
}

auto Server::_start_shutdown_monitor() -> void {
  auto monitor_timer = std::make_shared<SteadyTimer>(_context);
  monitor_timer->expires_after(std::chrono::milliseconds(500));

  monitor_timer->async_wait([this, monitor_timer](const ErrorCode& error) {
    if (!error) {
      if (_connections > 0) {
        _start_shutdown_monitor();
      } else {
        _work_guard.reset();
      }
    } else {
      spdlog::error("Error starting shutdown monitor: {}", error.message());
    }
  });
}

auto Server::_scape_text(const String& request) -> String {
  String result = request;
  result = std::regex_replace(result, std::regex("\r\n"), "\\r\\n");
  result = std::regex_replace(result, std::regex("\r"), "\\r");
  result = std::regex_replace(result, std::regex("\n"), "\\n");
  return result;
}

Server::~Server() {
  if (_running) {
    stop();
  }
}