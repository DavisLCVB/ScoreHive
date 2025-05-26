#include "worker.hpp"
#include <system/logger.hpp>
#include <system/shutdown.hpp>

auto Worker::main(UNUSED i32 argc, UNUSED char** argv) -> i32 {
  Logger::config();
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