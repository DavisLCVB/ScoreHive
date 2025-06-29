#pragma once
#ifndef WATCHER_HPP
#define WATCHER_HPP

#include <utility>
#include <boost/asio.hpp>
#include <condition_variable>
#include <functional>
#include <mutex>
#include <nlohmann/json.hpp>
#include <queue>
#include <server/protocol.hpp>
#include <system/aliases.hpp>
#include <thread>

using json = nlohmann::json;

struct ReviewRequest {
  json exams_data;
  std::function<void(const ScoreHiveResponse&)> callback;
  u64 request_id;
};

class MPIWatcher {
 public:
  static MPIWatcher& instance();
  
  void start(boost::asio::io_context& io_context, i32 mpi_size);
  void stop();
  void enqueue_review_request(const json& exams_data, 
                              std::function<void(const ScoreHiveResponse&)> callback);
  
  bool is_running() const { return _running; }
  ~MPIWatcher();

 private:
  MPIWatcher() = default;
  
  void _worker_thread();
  void _process_review_request(const ReviewRequest& request);
  
  static std::unique_ptr<MPIWatcher> _instance;
  static std::mutex _instance_mutex;
  
  std::queue<ReviewRequest> _request_queue;
  std::mutex _queue_mutex;
  std::condition_variable _queue_cv;
  
  std::thread _worker_thread_handle;
  std::atomic<bool> _running{false};
  std::atomic<bool> _should_stop{false};
  
  boost::asio::io_context* _io_context = nullptr;
  i32 _mpi_size = 0;
  u64 _next_request_id = 1;
};

#endif  // WATCHER_HPP