#include "client.hpp"
#include <system/logger.hpp>

Client::Client(IOContext& io_context)
    : _io_context(io_context), _connected(false) {}

auto Client::connect(const Endpoint& endpoint, ConnectionCallback callback)
    -> void {
  if (_connected) {
    callback(error::make_error_code(error::already_connected), false);
    return;
  }

  _socket = std::make_unique<Socket>(_io_context);
  auto resolver = std::make_shared<Resolver>(_io_context);

  auto resolver_callback = [this, callback, resolver](
                               const ErrorCode& resolve_err,
                               Resolver::results_type endpoints) {
    if (resolve_err) {
      spdlog::error("DNS resolution failed: {}", resolve_err.message());
      callback(resolve_err, false);
      return;
    }

    if (endpoints.empty()) {
      spdlog::error("No endpoints found for host");
      callback(error::make_error_code(error::host_not_found), false);
      return;
    }

    auto connect_callback = [this, callback](const ErrorCode& connect_err,
                                             const TCPEndpoint& tcp_endpoint) {
      if (!connect_err) {
        _connected = true;
        spdlog::info("Connected to server at {}:{}",
                     tcp_endpoint.address().to_string(), tcp_endpoint.port());
        callback(ErrorCode(), true);
      } else {
        spdlog::error("Failed to connect to server: {}", connect_err.message());
        callback(connect_err, false);
      }
    };

    asio::async_connect(*_socket, endpoints, connect_callback);
  };

  resolver->async_resolve(endpoint.host, std::to_string(endpoint.port),
                          resolver_callback);
}

auto Client::send_request(const String& request, ResponseCallback callback)
    -> void {
  if (!_connected || !_socket) {
    spdlog::error("Cannot send request: not connected");
    callback(asio::error::not_connected, "");
    return;  // ¡IMPORTANTE: Este return faltaba!
  }

  auto request_buffer = std::make_shared<String>(request + "\r\n\r\n");

  auto write_callback = [this, request_buffer, callback](
                            const ErrorCode& write_err,
                            std::size_t bytes_written) {
    if (write_err) {
      spdlog::error("Failed to send request: {}", write_err.message());
      callback(write_err, "");
      return;
    }

    spdlog::debug("Sent {} bytes", bytes_written);

    auto response_buffer = std::make_shared<Streambuf>();
    auto read_callback = [this, response_buffer, callback](
                             const ErrorCode& read_err, std::size_t) {
      if (read_err) {
        spdlog::error("Failed to read response: {}", read_err.message());
        callback(read_err, "");
        return;
      }

      auto buffers = response_buffer->data();
      std::size_t total_size = asio::buffer_size(buffers);

      if (total_size < 4) {
        spdlog::warn("Response too short: {} bytes", total_size);
        callback(error::make_error_code(error::message_size), "");
        return;
      }

      String response;
      response.reserve(total_size - 4);

      auto begin = asio::buffers_begin(buffers);
      auto end = begin + (total_size - 4);
      response.assign(begin, end);

      if (response.empty()) {
        spdlog::warn("Received empty response");
        callback(error::make_error_code(error::eof), response);
      } else {
        spdlog::info("Received response: {} bytes", response.size());
        callback(ErrorCode(), response);
      }
    };

    asio::async_read_until(*_socket, *response_buffer, "\r\n\r\n",
                           read_callback);
  };

  asio::async_write(*_socket, asio::buffer(*request_buffer), write_callback);
}

auto Client::close() -> void {
  if (_socket) {
    ErrorCode ec;
    _socket->close(ec);
    if (ec && ec != asio::error::not_connected) {
      spdlog::warn("Error closing socket: {}", ec.message());
    }
  }
  _connected = false;
  spdlog::info("Connection closed");
}

Client::~Client() {
  close();
}