#include <aliases.hpp>
#include <iostream>
#include <pool/pool.hpp>
#include <server/server.hpp>
#include <system/shutdown.hpp>
#include <system/spdlog_wrapper.hpp>
#include <thread>

void setup_logging();
i32 server_main();
String get_role(int argc, char** argv);

i32 main(UNUSED i32 argc, UNUSED char** argv) {
  try {
    setup_logging();
    String role = get_role(argc, argv);
    if (role == "server") {
      return server_main();
    } else if (role == "client") {
      return 0;
    }
  } catch (const Exception& e) {
    spdlog::error("Error: {}", e.what());
    return 1;
  }
}

i32 server_main() {
  IOContext context;
  Server server(context);
  GracefulShutdown<Server> shutdown(context, server);
  server.set_task([](String request) {
    String response = "Hello, " + request;
    return response;
  });
  server.start(8080);
  context.run();
  return 0;
}

void setup_logging() {
  try {
    spdlog::set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%^%l%$] [thread %t] %v");
    spdlog::set_level(spdlog::level::debug);
    spdlog::flush_every(std::chrono::seconds(3));
    spdlog::info("Logging system initialized");
  } catch (const std::exception& e) {
    std::cerr << "Failed to initialize logging: " << e.what() << std::endl;
    throw;
  }
}

String get_role(int argc, char** argv) {
  if (argc < 2) {
    throw std::runtime_error("Role not specified");
  }
  String role = argv[1];
  if (role != "server" && role != "client") {
    throw std::runtime_error("Invalid role: " + role);
  }
  return role;
}