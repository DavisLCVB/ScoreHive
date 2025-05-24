#include "server.hpp"
#include <iostream>

Server::Server(IOContext& context)
    : _context(context), _thread_pool(std::thread::hardware_concurrency()) {}

void Server::start(u16 port) {
  _server_thread = JThread([this, port]() { _start(port); });
}

auto Server::_start(u16 port) -> void {
  std::cout << "Server started" << std::endl;
  if (!_process_connection_task) {
    throw std::runtime_error("Process connection task is not set");
  }
  _acceptor = std::make_unique<Acceptor>(_context, Endpoint(TCP::v4(), port));
  _running = true;
  _start_accept();
}

auto Server::_start_accept() -> void {
  if (!_running) {
    std::cout << "Not accepting connection" << std::endl;
    return;
  }
  SharedPtr<Socket> socket = std::make_shared<Socket>(_context);
  _acceptor->async_accept(
      *socket, [this, socket](const boost::system::error_code& error) {
        if (!_running) {
          return;
        }
        if (!error) {
          std::cout << "New connection accepted" << std::endl;
          _process_connection(socket);
          _start_accept();
        } else if (error) {
          std::cout << "Error accepting connection: " << error.message()
                    << std::endl;
          if (socket->is_open()) {
            socket->shutdown(Socket::shutdown_both);
            socket->close();
          }
        }
      });
}

auto Server::_process_connection(unused SharedPtr<Socket> socket) -> void {
  _thread_pool.add_task([this, socket]() -> void {
    try {
      // 1. Recibir la información
      boost::asio::streambuf stream_buffer;
      ErrorCode error;
      asio::read_until(*socket, stream_buffer, '$', error);
      String request(
          asio::buffers_begin(stream_buffer.data()),
          asio::buffers_begin(stream_buffer.data()) + stream_buffer.size() - 1);
      request.pop_back();
      if (error) {
        std::cout << "Error reading from socket: " << error.message()
                  << std::endl;
        return;
      }

      // 2. Procesar la información (en el mismo hilo del pool)
      if (_process_connection_task) {
        String response = (*_process_connection_task)(request);

        // 3. Enviar respuesta
        ErrorCode send_error;
        socket->send(asio::buffer(response), 0, send_error);

        if (send_error) {
          std::cout << "Error sending response: " << send_error.message()
                    << std::endl;
        }
      }

    } catch (const std::exception& e) {
      std::cout << "Error processing connection: " << e.what() << std::endl;
    }
  });
}

auto Server::stop() -> void {
  std::cout << "Stopping server" << std::endl;
  _running = false;
  if (_acceptor) {
    _acceptor->close();
  }
  if (_server_thread.joinable()) {
    _server_thread.join();
  }
}

Server::~Server() {
  if (_running) {
    stop();
  }
}