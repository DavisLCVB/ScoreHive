#pragma once
#ifndef WORKER_HPP
#define WORKER_HPP

#include <aliases.hpp>
#include <server/server.hpp>

class Worker {
 public:
  static auto main(i32 argc, char** argv) -> i32;
};

#endif  // WORKER_HPP