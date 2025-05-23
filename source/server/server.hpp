#pragma once
#ifndef SERVER_HPP
#define SERVER_HPP

#include <aliases.hpp>

class Server {
 public:
  Server() = default;
  ~Server() = default;

  void start();
};

#endif  // SERVER_HPP