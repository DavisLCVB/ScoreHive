#include "worker.hpp"
#include <system/logger.hpp>
#include <system/shutdown.hpp>

UniquePtr<Worker> Worker::_instance = nullptr;

auto Worker::_get_instance() -> Worker& {
  static OnceFlag flag;
  std::call_once(flag, []() { _instance.reset(new Worker()); });
  return *_instance;
}

auto Worker::main(UNUSED i32 argc, UNUSED char** argv) -> i32 {
  Logger::config();
  IOContext context;
  Server server(context);
  GracefulShutdown<Server> shutdown(context, server);
  server.set_task(&Worker::_process_request);
  server.start(8080);
  context.run();
  return 0;
}

auto Worker::_process_request(const String& request) -> String {
  try {
    auto& instance = _get_instance();
    auto parts = instance._parse_command(request);
    if (parts.empty()) {
      return instance._format_error("Empty request");
    }

    const String& command = parts[0];
    return instance._execute_command(command, parts);

  } catch (const std::exception& e) {
    auto& instance = _get_instance();
    return instance._format_error(e.what());
  }
}

auto Worker::_parse_command(const String& request) -> Vector<String> {
  Vector<String> parts;
  StringStream ss(request);
  String token;

  while (std::getline(ss, token, ' ')) {
    if (!token.empty()) {
      parts.push_back(token);
    }
  }

  return parts;
}

auto Worker::_execute_command(const String& command,
                              const Vector<String>& parts) -> String {
  if (command == "[echo]") {
    return _handle_echo(parts);
  }
  if (command == "[set-answers]") {
    return _handle_set_answers(parts);
  }
  if (command == "[get-answers]") {
    return _handle_get_answers();
  }
  if (command == "[check]") {
    return _handle_check_answers(parts);
  }

  return _format_error("Invalid command: " + command);
}

auto Worker::_handle_echo(const Vector<String>& parts) -> String {
  if (parts.size() < 2) {
    return _format_error("Echo command requires a message");
  }

  return _format_response(parts[1]);
}

auto Worker::_handle_set_answers(const Vector<String>& parts) -> String {
  if (parts.size() < 2) {
    return _format_error("Set-answers command requires JSON data");
  }

  try {
    auto json = nlohmann::json::parse(parts[1]);
    _set_answers_from_json(json);

    return _format_response("Answers set successfully");

  } catch (const nlohmann::json::parse_error& e) {
    return _format_error("JSON parse error: " + String(e.what()));
  } catch (const std::exception& e) {
    return _format_error("Error setting answers: " + String(e.what()));
  }
}

auto Worker::_handle_get_answers() -> String {
  try {
    auto answers_json = _get_answers_as_json();

    return _format_response(answers_json.dump(2));

  } catch (const std::exception& e) {
    return _format_error("Error getting answers: " + String(e.what()));
  }
}

auto Worker::_handle_check_answers(const Vector<String>& parts) -> String {
  if (parts.size() < 2) {
    return _format_error("Check command requires JSON data");
  }

  try {
    auto user_answers = nlohmann::json::parse(parts[1]);
    auto result = _check_answers_from_json(user_answers);

    return _format_response(result.dump(2));

  } catch (const nlohmann::json::parse_error& e) {
    return _format_error("JSON parse error: " + String(e.what()));
  } catch (const std::exception& e) {
    return _format_error("Error checking answers: " + String(e.what()));
  }
}

auto Worker::_format_response(const String& content) -> String {
  return "[response]\r\n" + content + "\r\n\r\n";
}

auto Worker::_format_error(const String& error) -> String {
  return _format_response("ERROR: " + error);
}

auto Worker::_set_answers_from_json(const nlohmann::json& json) -> void {
  Map<u16, u16> new_answers;

  for (const auto& item : json) {
    if (!item.contains("question_id") || !item.contains("answer_index")) {
      throw std::runtime_error(
          "Invalid answer format: missing required fields");
    }

    u16 question_id = item["question_id"].get<u16>();
    u16 answer_index = item["answer_index"].get<u16>();

    new_answers[question_id] = answer_index;
  }

  _answers = std::move(new_answers);
}

auto Worker::_get_answers_as_json() const -> nlohmann::json {
  nlohmann::json result = nlohmann::json::array();

  for (const auto& [question_id, answer_index] : _answers) {
    result.push_back(
        {{"question_id", question_id}, {"answer_index", answer_index}});
  }

  return result;
}

auto Worker::_check_answers_from_json(const nlohmann::json& user_answers) const
    -> nlohmann::json {
  nlohmann::json result_answers = nlohmann::json::array();
  u64 correct_count = 0;

  for (const auto& user_answer : user_answers) {
    if (!user_answer.contains("question_id") ||
        !user_answer.contains("answer_index")) {
      continue;
    }

    u16 question_id = user_answer["question_id"].get<u16>();
    u16 user_answer_index = user_answer["answer_index"].get<u16>();

    auto it = _answers.find(question_id);
    if (it != _answers.end()) {
      bool is_correct = (it->second == user_answer_index);

      result_answers.push_back(
          {{"question_id", question_id}, {"is_correct", is_correct}});

      if (is_correct) {
        correct_count++;
      }
    }
  }

  return nlohmann::json{{"correct_answers", correct_count},
                        {"total_questions", result_answers.size()},
                        {"answers", result_answers}};
}