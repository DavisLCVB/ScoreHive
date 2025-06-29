#include <mpi.h>
#include <boost/asio.hpp>
#include <domain/coordinator.hpp>
#include <domain/evaluator.hpp>
#include <iostream>
#include <server/server.hpp>
#include <system/aliases.hpp>
#include <system/logger.hpp>
#include <database/database.hpp>
#include <thread>

i32 main(i32 argc, char** argv) {
  MPI_Init(&argc, &argv);
  i32 rank, size;
  MPI_Comm_rank(MPI_COMM_WORLD, &rank);
  MPI_Comm_size(MPI_COMM_WORLD, &size);
  Logger::config(rank);
  if (rank == 0) {
    boost::asio::io_context io_context;
    ServerConfig config;
    Server server(io_context, config);
    
    // Start the server asynchronously
    server.start();
    
    // Initialize database connection
    if (!Database::instance().initialize("")) {
        spdlog::error("Failed to initialize database connection");
        MPI_Finalize();
        return 1;
    }
    spdlog::info("Database connection initialized successfully");
    
    // Run the io_context in a separate thread to handle async operations
    std::thread io_thread([&io_context]() {
      try {
        io_context.run();
      } catch (const std::exception& e) {
        spdlog::error("IO context error: {}", e.what());
      }
    });
    
    spdlog::info("Master process started, server running on background thread");
    
    // Wait for the io_context to finish
    io_thread.join();
    
    MPICoordinator::instance().free_types();
  } else {
    spdlog::info("Worker {} started", rank);
    bool shutdown = false;
    while (!shutdown) {
      auto& coordinator = MPICoordinator::instance();
      auto [exams, command] = coordinator.receive_from_master(0);
      if (command == MPICommand::SHUTDOWN) {
        shutdown = true;
        coordinator.free_types();
        spdlog::info("Worker {} received shutdown signal", rank);
        break;
      }
      spdlog::info("Worker {} received exams count: {}", rank, exams.size());
      auto results = Evaluator::instance().evaluate_exam_batch(exams);
      coordinator.send_to_master(results, 0);
    }
  }
  MPI_Finalize();
  return 0;
}