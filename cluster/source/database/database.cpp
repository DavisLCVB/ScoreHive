#include "database.hpp"
#include <spdlog/spdlog.h>
#include <cstdlib> // For getenv

Database* Database::_instance = nullptr;

Database& Database::instance() {
  if (!_instance) {
    _instance = new Database();
  }
  return *_instance;
}

bool Database::initialize(const std::string& /*connection_string*/) {
    try {
        const char* dbname = std::getenv("PGDATABASE");
        const char* user = std::getenv("PGUSER");
        const char* password = std::getenv("PGPASSWORD");
        const char* host = std::getenv("PGHOST");
        const char* port = std::getenv("PGPORT");

        if (!dbname || !user || !password || !host || !port) {
            spdlog::error("Database environment variables not set (PGDATABASE, PGUSER, PGPASSWORD, PGHOST, PGPORT)");
            return false;
        }

        std::string conn_str = "dbname=" + std::string(dbname) +
                               " user=" + std::string(user) +
                               " password=" + std::string(password) +
                               " hostaddr=" + std::string(host) +
                               " port=" + std::string(port);

        _db_connection = std::make_unique<pqxx::connection>(conn_str);
        _connected = _db_connection->is_open();

        if (_connected) {
            spdlog::info("Database connection successful to {}", _db_connection->dbname());
        } else {
            spdlog::error("Database connection failed.");
        }
        return _connected;

    } catch (const std::exception &e) {
        spdlog::error("Database connection failed: {}", e.what());
        _connected = false;
        return false;
    }
}

bool Database::is_connected() const {
  return _connected && _db_connection && _db_connection->is_open();
}

std::map<i32, i32> Database::get_answer_keys(const std::string& process, const std::string& area) {
    if (!is_connected()) {
        spdlog::error("No database connection.");
        return {};
    }
    std::map<i32, i32> answer_keys;
    try {
        pqxx::work txn(*_db_connection);
        pqxx::result r = txn.exec(pqxx::zview("SELECT question_index, right_answer_index FROM get_answer_keys($1, $2)"), pqxx::params(process, area));

        for (auto row : r) {
            answer_keys[row[0].as<i32>()] = row[1].as<i32>();
        }
        txn.commit();
    } catch (const std::exception &e) {
        spdlog::error("Failed to get answer keys for process {}: {}", process, e.what());
    }
    return answer_keys;
}

bool Database::save_exam_results(const std::vector<ExamResult>& results) {
    if (!is_connected()) {
        spdlog::error("No database connection.");
        return false;
    }
    try {
        pqxx::work txn(*_db_connection);
        for (const auto& result : results) {
            txn.exec(pqxx::zview("SELECT save_exam_result($1, $2, $3, $4, $5, $6, $7)"),
                            pqxx::params(result.id_exam, result.process, result.area,
                            result.correct_answers, result.wrong_answers,
                            result.unscored_answers, result.score));
        }
        txn.commit();
        spdlog::info("Successfully saved {} exam results.", results.size());
        return true;
    } catch (const std::exception &e) {
        spdlog::error("Failed to save exam results: {}", e.what());
        return false;
    }
}

std::vector<ExamResult> Database::get_exam_results(const std::string& process) {
    if (!is_connected()) {
        spdlog::error("No database connection.");
        return {};
    }
    std::vector<ExamResult> results;
    try {
        pqxx::work txn(*_db_connection);
        pqxx::result r = txn.exec(pqxx::zview("SELECT * FROM get_exam_results($1)"), pqxx::params(process));

        for (auto row : r) {
            results.emplace_back(
                row["id_exam"].as<std::string>(),
                row["process_id"].as<std::string>(),
                row["area_id"].as<std::string>(),
                row["correct_answers"].as<i32>(),
                row["wrong_answers"].as<i32>(),
                row["unscored_answers"].as<i32>(),
                row["score"].as<double>()
            );
        }
        txn.commit();
    } catch (const std::exception &e) {
        spdlog::error("Failed to get exam results for process {}: {}", process, e.what());
    }
    return results;
}