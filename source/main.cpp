#include <aliases.hpp>
#include <iostream>
#include <pool/pool.hpp>
#include <server/server.hpp>
#include <system/shutdown.hpp>
#include <system/spdlog_wrapper.hpp>
#include <thread>

void setup_logging();

void server_main(Server& server);

i32 main(UNUSED i32 argc, UNUSED char** argv) {
  try {
    setup_logging();
    IOContext context;
    Server server(context);
    GracefulShutdown<Server> shutdown(context, server);
    server_main(server);
    context.run();
    return 0;
  } catch (const Exception& e) {
    spdlog::error("Error: {}", e.what());
    return 1;
  }
}

void server_main(Server& server) {
  server.set_task([](String request) {
    String response = "Hello, " + request;
    return response;
  });
  server.start(8080);
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