#pragma once
#ifndef SPDLOG_WRAPPER_HPP
#define SPDLOG_WRAPPER_HPP

#include <spdlog/spdlog.h>
#include <iostream>
#include <system/environment.hpp>

class Logger {
 public:
  static auto config() -> void {
    try {
      const auto& debug_mode = Environment::get("DEBUG");
      spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] %v");
      if (debug_mode == "1") {
        spdlog::set_level(spdlog::level::debug);
      } else {
        spdlog::set_level(spdlog::level::info);
      }
      spdlog::flush_every(std::chrono::seconds(5));
      spdlog::info("Logging system initialized");
    } catch (const std::exception& e) {
      std::cerr << "Failed to initialize logging: " << e.what() << std::endl;
      throw;
    }
  }
};
#endif  // SPDLOG_WRAPPER_HPP