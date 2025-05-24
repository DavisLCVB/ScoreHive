#pragma once
#ifndef SHUTDOWN_HPP
#define SHUTDOWN_HPP

#include <aliases.hpp>
#include <concepts>

template <typename T>
concept Stoppable = requires(T t) { t.stop(); };

template <Stoppable T>
class GracefulShutdown {
 public:
  GracefulShutdown(IOContext& context, T& t)
      : _t(t), _stop(false), _signals(context, SIGINT, SIGTERM, SIGQUIT) {
    _setup_handlers();
  }

 private:
  T& _t;
  bool _stop;
  SignalSet _signals;

  auto _setup_handlers() -> void {
    _signals.async_wait([this](const ErrorCode& error, int signal_number) {
      if (!error && !_stop) {
        _stop = true;
        std::cout << "Received signal " << signal_number;
        switch (signal_number) {
          case SIGINT:
            std::cout << " (SIGINT)";
            break;
          case SIGTERM:
            std::cout << " (SIGTERM)";
            break;
          case SIGQUIT:
            std::cout << " (SIGQUIT)";
            break;
          default:
            std::cout << " (unknown)";
            break;
        }
        std::cout << ". Initializing graceful shutdown..." << std::endl;
        _t.stop();
      }
    });
  }
};

#endif  // SHUTDOWN_HPP