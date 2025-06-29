#pragma once
#ifndef DATABASE_HPP
#define DATABASE_HPP

#include <system/aliases.hpp>
#include <string>
#include <vector>
#include <map>
#include <nlohmann/json.hpp>
#include <pqxx/pqxx>

using json = nlohmann::json;

struct AnswerKey {
  i32 qst_idx;
  i32 rans_idx;
};

struct ExamResult {
  std::string id_exam;   // UUID string
  std::string process;   // Process UUID
  std::string area;      // Area UUID
  i32 correct_answers;
  i32 wrong_answers;
  i32 unscored_answers;
  double score;
};

/**
 * @brief Database interface for ScoreHive cluster
 * @details Provides functions to interact with the database for 
 *          answer keys and exam results storage/retrieval
 */
class Database {
public:
  static Database& instance();
  ~Database() = default;

  /**
   * @brief Get answer keys for a specific process and area
   * @param process Process UUID to get answers for
   * @param area Area UUID to get answers for
   * @return Map of question index to correct answer index
   */
  std::map<i32, i32> get_answer_keys(const std::string& process, const std::string& area);

  /**
   * @brief Save exam results to database
   * @param results Vector of exam results to save
   * @return True if successful, false otherwise
   */
  bool save_exam_results(const std::vector<ExamResult>& results);

  /**
   * @brief Get exam results for a specific process
   * @param process Process UUID to get results for
   * @return Vector of exam results
   */
  std::vector<ExamResult> get_exam_results(const std::string& process);

  /**
   * @brief Initialize database connection
   * @param connection_string Database connection configuration
   * @return True if successful, false otherwise
   */
  bool initialize(const std::string& connection_string);

  /**
   * @brief Check if database is connected and ready
   * @return True if ready, false otherwise
   */
  bool is_connected() const;

private:
  Database() = default;
  static Database* _instance;
  bool _connected = false;
  
  // Database connection handle
  std::unique_ptr<pqxx::connection> _db_connection = nullptr;
};

#endif // DATABASE_HPP