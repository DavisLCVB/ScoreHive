#include "environment.hpp"
#include <cstdlib>

Map<String, String> Environment::_env;

auto Environment::load() -> void {
  _env["ROLE"] = _required("ROLE");
  _env["PORT"] = _required("PORT");
  _env["DEBUG"] = _optional("DEBUG", "0");
  if (_env["ROLE"] == "orch") {
    _env["HOST"] = _required("HOST");
  }
}

auto Environment::get(const String& key) -> String {
  auto value = _env.find(key);
  if (value == _env.end()) {
    throw std::runtime_error("Environment variable " + key + " is not set");
  }
  return value->second;
}

auto Environment::_required(const String& key) -> String {
  auto value = std::getenv(key.c_str());
  if (!value) {
    throw std::runtime_error("Environment variable " + key + " is required");
  }
  return String(value);
}

auto Environment::_optional(const String& key, const String& default_value)
    -> String {
  auto value = std::getenv(key.c_str());
  if (!value) {
    return default_value;
  }
  return String(value);
}