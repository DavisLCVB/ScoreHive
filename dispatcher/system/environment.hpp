#pragma once
#ifndef ENVIROMENT_HPP
#define ENVIROMENT_HPP

#include <aliases.hpp>

class Environment {
 public:
  static auto load() -> void;
  ~Environment() = default;
  static auto get(const String& key) -> String;

 private:
  Environment() = default;
  static Map<String, String> _env;
  static auto _required(const String& key) -> String;
  static auto _optional(const String& key, const String& default_value)
      -> String;
};

#endif  // ENVIROMENT_HPP