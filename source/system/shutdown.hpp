#pragma once
#ifndef SHUTDOWN_HPP
#define SHUTDOWN_HPP

#include <aliases.hpp>
#include <concepts>
#include <system/spdlog_wrapper.hpp>

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
        String signal_name;
        switch (signal_number) {
          case SIGINT:
            signal_name = "SIGINT";
            break;
          case SIGTERM:
            signal_name = "SIGTERM";
            break;
          case SIGQUIT:
            signal_name = "SIGQUIT";
            break;
          default:
            signal_name = "unknown";
            break;
        }
        spdlog::info(
            "Received signal {} ({}).\nInitializing graceful shutdown...",
            signal_number, signal_name);
        _t.stop();
      }
    });
  }
};

#endif  // SHUTDOWN_HPP