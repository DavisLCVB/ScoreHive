#pragma once
#ifndef PROTOCOL_HPP
#define PROTOCOL_HPP

#include <string>
#include <system/aliases.hpp>

// Undef any conflicting macros
#ifdef ECHO
#undef ECHO
#endif
enum class ScoreHiveCommand : u8 {
  GET_ANSWERS = 0,
  SET_ANSWERS = 1,
  REVIEW = 2,
  ECHO = 3,
  SHUTDOWN = 4
};

enum class ScoreHiveResponseCode : u8 {
  OK = 0,
  ERROR = 1,
  NOT_FOUND = 2,
  INVALID_REQUEST = 3
};

// Estructuras para request y response
struct ScoreHiveRequest {
  ScoreHiveCommand command;
  u32 length;
  std::string data;

  ScoreHiveRequest() : command(ScoreHiveCommand::GET_ANSWERS), length(0) {}
};

struct ScoreHiveResponse {
  ScoreHiveResponseCode code;
  u32 length;
  std::string data;

  ScoreHiveResponse() : code(ScoreHiveResponseCode::OK), length(0) {}
};

static constexpr u8 MAX_COMMAND = 4; /** Maximum number of commands */

#endif  // PROTOCOL_HPP