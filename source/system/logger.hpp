#pragma once
#ifndef SPDLOG_WRAPPER_HPP
#define SPDLOG_WRAPPER_HPP

#include <spdlog/spdlog.h>
#include <iostream>

class Logger {
 public:
  static auto config() -> void {
    try {
      spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] %v");
      spdlog::set_level(spdlog::level::debug);
      spdlog::flush_every(std::chrono::seconds(3));
      spdlog::info("Logging system initialized");
    } catch (const std::exception& e) {
      std::cerr << "Failed to initialize logging: " << e.what() << std::endl;
      throw;
    }
  }
};
#endif  // SPDLOG_WRAPPER_HPP