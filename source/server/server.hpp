#pragma once
#ifndef SERVER_HPP
#define SERVER_HPP

#include <aliases.hpp>
#include <pool/pool.hpp>

class Server {
 public:
  Server(IOContext& context);

  ~Server();

  auto start(u16 port) -> void;

  template <typename F, typename... Args>
    requires TaskType<F, String, Args...>
  auto set_task(F&& task, Args&&... args) -> void {
    _process_connection_task = std::make_shared<std::function<String(String)>>(
        [task = std::forward<F>(task), ... cap_args = std::forward<Args>(args)](
            const String& input) -> String {
          return task(input, cap_args...);
        });
  }

  auto stop() -> void;

 private:
  IOContext& _context;
  UniquePtr<Acceptor> _acceptor;
  Atomic<bool> _running;
  Atomic<u64> _connections;
  ThreadPool _thread_pool;
  SharedPtr<std::function<String(String)>> _process_connection_task;
  IOContextWorkGuard _work_guard;

  auto _start_accept() -> void;
  auto _process_connection(SharedPtr<Socket> socket) -> void;
  auto _start(u16 port) -> void;
  auto _start_shutdown_monitor() -> void;
  static auto _scape_text(const String& request) -> String;
};

#endif  // SERVER_HPP