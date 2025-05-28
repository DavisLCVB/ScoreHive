#pragma once
#ifndef CLIENT_HPP
#define CLIENT_HPP

#include <aliases.hpp>
#include <server/server.hpp>

struct Endpoint {
  String host;
  u16 port;
};

class Client {
 public:
  using ResponseCallback =
      Function<void(const ErrorCode&, const String& response)>;
  using ConnectionCallback = Function<void(const ErrorCode&, bool)>;
  Client(IOContext& io_context);
  ~Client();
  auto connect(const Endpoint& endpoint, ConnectionCallback callback) -> void;
  auto send_request(const String& request, ResponseCallback callback) -> void;
  auto close() -> void;

 private:
  IOContext& _io_context;
  bool _connected;
  UniquePtr<Socket> _socket;
};

#endif  // CLIENT_HPP