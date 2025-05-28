#pragma once
#ifndef WORKER_HPP
#define WORKER_HPP

#include <aliases.hpp>
#include <nlohmann/json.hpp>
#include <server/server.hpp>

class Worker {
 public:
  static auto main(i32 argc, char** argv) -> i32;
  ~Worker() = default;

 private:
  Map<u16, u16> _answers;

  Worker() = default;
  Worker(const Worker&) = delete;
  Worker(Worker&&) = delete;
  auto operator=(const Worker&) -> Worker& = delete;
  auto operator=(Worker&&) -> Worker& = delete;

  static auto _get_instance() -> Worker&;
  static UniquePtr<Worker> _instance;

  static auto _process_request(const String& request) -> String;

  auto _parse_command(const String& request) -> Vector<String>;
  auto _execute_command(const String& command, const Vector<String>& parts)
      -> String;

  auto _handle_echo(const Vector<String>& parts) -> String;
  auto _handle_set_answers(const Vector<String>& parts) -> String;
  auto _handle_get_answers() -> String;
  auto _handle_check_answers(const Vector<String>& parts) -> String;

  auto _format_response(const String& content) -> String;
  auto _format_error(const String& error) -> String;

  auto _set_answers_from_json(const nlohmann::json& json) -> void;
  auto _get_answers_as_json() const -> nlohmann::json;
  auto _check_answers_from_json(const nlohmann::json& user_answers) const
      -> nlohmann::json;
};

#endif  // WORKER_HPP