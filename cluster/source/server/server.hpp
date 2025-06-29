#pragma once
#ifndef SERVER_HPP
#define SERVER_HPP

#include <array>
#include <utility>
#include <boost/asio.hpp>
#include <map>
#include <memory>
#include <server/protocol.hpp>
#include <string>
#include <system/aliases.hpp>

/**
 * @brief Server configuration
 */
struct ServerConfig {
  u16 port = 8080;                    /** Port to listen on */
  u16 backlog = 10;                   /** Backlog for the listen socket */
  u32 max_message_size = 10 * 1024 * 1024; /** Maximum message size (10MB default) */
};

/**
 * @brief Server class
 */
class Server {
 public:
  /**
   * @brief Constructor
   * @param io_context Boost ASIO io_context for async operations
   * @param config Server configuration
   */
  Server(boost::asio::io_context& io_context, const ServerConfig& config = ServerConfig());

  /**
   * @brief Start the server
   * @note This function is non-blocking and uses async operations
   * @details Starts accepting client connections asynchronously
   */
  void start();

  /**
   * @brief Stop the server
   * @details Stops accepting new connections and closes existing ones
   */
  void stop();

 private:
  /**
   * @brief Buffer type
   * @note This is a template that creates an array of characters with a
   *       specified size.
   */
  template <size_t N>
  using buffer = std::array<char, N>;

  /**
   * @brief Parse the request
   * @param message The message to parse
   * @param request The request object to populate
   */
  void _parse_request(const std::string& message, ScoreHiveRequest& request);

  /**
   * @brief Parse the response
   * @param response The response object to parse
   * @return The response message
   */
  std::string _parse_response(const ScoreHiveResponse& response);

  /**
   * @brief Handle the request synchronously
   * @param request The request to handle
   * @param response The response to populate
   */
  void _handle_request_sync(const ScoreHiveRequest& request, ScoreHiveResponse& response);

  /**
   * @brief Start accepting connections
   */
  void _start_accept();

  /**
   * @brief Handle accepted connection
   */
  void _handle_accept(std::shared_ptr<boost::asio::ip::tcp::socket> socket,
                      const boost::system::error_code& error);

  /**
   * @brief Handle client connection
   */
  void _handle_client(std::shared_ptr<boost::asio::ip::tcp::socket> socket);

  /**
   * @brief Read data from the client asynchronously
   */
  void _read_async(std::shared_ptr<boost::asio::ip::tcp::socket> socket,
                   std::shared_ptr<std::vector<char>> buffer,
                   std::shared_ptr<std::string> message);

  /**
   * @brief Handle read completion
   */
  void _handle_read(std::shared_ptr<boost::asio::ip::tcp::socket> socket,
                    std::shared_ptr<std::vector<char>> buffer,
                    std::shared_ptr<std::string> message,
                    const boost::system::error_code& error,
                    std::size_t bytes_transferred);

  /**
   * @brief Send response asynchronously
   */
  void _send_response(std::shared_ptr<boost::asio::ip::tcp::socket> socket,
                      const ScoreHiveResponse& response);


  /**
   * @brief Handle the GET_ANSWERS request
   * @details This function will handle the GET_ANSWERS request. It will return
   *          all the answers in the AnswersManager.
   */
  void _handle_get_answers(const ScoreHiveRequest& request, ScoreHiveResponse& response);

  /**
   * @brief Handle the SET_ANSWERS request
   * @details This function will handle the SET_ANSWERS request. It will set the
   *          answers in the AnswersManager (override).
   */
  void _handle_set_answers(const ScoreHiveRequest& request, ScoreHiveResponse& response);

  /**
   * @brief Handle the REVIEW request
   * @details This function will handle the REVIEW request. It will queue the
   *          exams for review processing by MPIWatcher.
   */
  void _handle_review(std::shared_ptr<boost::asio::ip::tcp::socket> socket,
                      const ScoreHiveRequest& request);

  /**
   * @brief Handle the ECHO request
   * @details This function will handle the ECHO request. It will return the
   *          message received.
   */
  void _handle_echo(const ScoreHiveRequest& request, ScoreHiveResponse& response);

  /**
   * @brief Handle the SHUTDOWN request
   * @details This function will handle the SHUTDOWN request. It will set the
   *          shutdown flag to true and send a shutdown signal to the workers.
   */
  void _handle_shutdown(const ScoreHiveRequest& request, ScoreHiveResponse& response);

  /**
   * @brief Handle a bad request
   * @details This function will handle a bad request. It will set the response
   *          code to BAD_REQUEST and the response data to the error message.
   */
  void _handle_bad_request(const ScoreHiveRequest& request, ScoreHiveResponse& response);

  boost::asio::io_context& _io_context;                    /** IO context */
  std::unique_ptr<boost::asio::ip::tcp::acceptor> _acceptor; /** TCP acceptor */
  ServerConfig _config;                                    /** Server configuration */
  i32 _mpi_size;                                          /** MPI size */
  std::atomic<bool> _shutdown{false};                     /** Shutdown flag */
};

#endif  // SERVER_HPP