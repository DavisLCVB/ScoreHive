#include <aliases.hpp>
#include <iostream>
#include <pool/pool.hpp>
#include <server/server.hpp>
#include <system/shutdown.hpp>
#include <thread>

i32 main(unused i32 argc, unused char** argv) {
  try {

    IOContext context;
    Server server(context);
    GracefulShutdown<Server> shutdown(context, server);
    server.set_task([](String request) {
      // Aca se procesa la información del request
      String response = "Hello, " + request;
      return response;
    });
    server.start(8080);
    context.run();
    return 0;
  } catch (const std::exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    return 1;
  }
}