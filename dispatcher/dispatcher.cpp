#include "dispatcher.hpp"
#include <aliases.hpp>
#include <system/environment.hpp>
#include <system/logger.hpp>

i32 main(UNUSED i32 argc, UNUSED char** argv) {
  try {
    Environment::load();
    Logger::config();
  } catch (const Exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
  }
}