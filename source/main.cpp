#include <aliases.hpp>
#include <iostream>
#include <pool/pool.hpp>
#include <server/server.hpp>
#include <system/shutdown.hpp>
#include <thread>

void server_main(Server& server);

i32 main(unused i32 argc, unused char** argv) {
  try {
    IOContext context;
    Server server(context);
    GracefulShutdown<Server> shutdown(context, server);
    server_main(server);
    context.run();
    return 0;
  } catch (const Exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    return 1;
  }
}

void server_main(Server& server) {
  server.set_task([](String request) {
    // Aca se procesa la información del request
    String response = "Hello, " + request;
    return response;
  });
  server.start(8080);
}