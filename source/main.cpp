#include <actors/worker.hpp>
#include <client/client.hpp>
#include <iostream>
#include <system/environment.hpp>
#include <system/logger.hpp>

i32 orch_main();

i32 main(i32 argc, char** argv) {
  try {
    Environment::load();
    Logger::config();
    const auto& role = Environment::get("ROLE");
    if (role == "worker") {
      return Worker::main(argc, argv);
    } else if (role == "orch") {
      return orch_main();
    }
  } catch (const Exception& e) {
    std::cerr << "Error: " << e.what() << std::endl;
    return 1;
  }
}

class PeriodicRequester {
 private:
  IOContext& _io_context;

 public:
  PeriodicRequester(IOContext& io_context) : _io_context(io_context) {}

  void start() { send_request(); }

 private:
  void send_request() {
    spdlog::info("Sending periodic request");

    auto client = std::make_shared<Client>(_io_context);

    client->connect(Endpoint{"localhost", 8080}, [this, client](
                                                     const ErrorCode& conn_err,
                                                     bool) {
      if (conn_err) {
        spdlog::error("Failed to connect to server: {}", conn_err.message());
      } else {
        client->send_request(
            "[echo] Hello",
            [this, client](const ErrorCode& send_err, const String& response) {
              if (send_err) {
                spdlog::error("Failed to send request: {}", send_err.message());
              } else {
                spdlog::info("Received response: {}", response);
              }
            });
      }
      schedule_next();
    });
  }

  void schedule_next() {
    auto timer = std::make_shared<SteadyTimer>(_io_context);
    timer->expires_after(std::chrono::seconds(3));
    timer->async_wait([this, timer](const ErrorCode& timer_err) {
      if (!timer_err) {
        send_request();
      }
    });
  }
};

i32 orch_main() {
  IOContext io_context;
  PeriodicRequester periodic_requester(io_context);
  periodic_requester.start();
  io_context.run();
  return 0;
}