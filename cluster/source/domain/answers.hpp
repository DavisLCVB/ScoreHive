#pragma once
#ifndef ANSWERS_HPP
#define ANSWERS_HPP

#include <map>
#include <memory>
#include <nlohmann/json.hpp>
#include <optional>
#include <string>
#include <system/aliases.hpp>
#include <vector>

using json = nlohmann::json;

struct Answer {
  i32 qst_idx;
  i32 rans_idx;
  NLOHMANN_DEFINE_TYPE_INTRUSIVE(Answer, qst_idx, rans_idx)
};

struct ExamAnswers {
  std::string process;  // Process UUID
  std::string area;     // Area UUID
  std::vector<Answer> answers;
  NLOHMANN_DEFINE_TYPE_INTRUSIVE(ExamAnswers, process, area, answers)
};

class AnswersManager {
 public:
  static AnswersManager& instance();
  ~AnswersManager() = default;
  void load_from_json(const json& answers_json);
  std::string serialize_for_mpi(const std::vector<std::string>& required_processes) const;
  void deserialize_from_mpi(const std::string& serialized_data);
  std::map<i32, i32> get_answers(const std::string& process);
  std::string save_to_json() const;

 private:
  AnswersManager() = default;
  static std::unique_ptr<AnswersManager> _instance;
  std::map<std::string, ExamAnswers> _answers;  // keyed by process UUID
  std::map<std::string, std::map<i32, i32>> _cache_answers; // keyed by process UUID
};

#endif  // ANSWERS_HPP