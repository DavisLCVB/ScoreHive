#include "watcher.hpp"
#include <domain/coordinator.hpp>
#include <spdlog/spdlog.h>

std::unique_ptr<MPIWatcher> MPIWatcher::_instance = nullptr;
std::mutex MPIWatcher::_instance_mutex;

MPIWatcher& MPIWatcher::instance() {
  std::lock_guard<std::mutex> lock(_instance_mutex);
  if (!_instance) {
    _instance = std::unique_ptr<MPIWatcher>(new MPIWatcher());
  }
  return *_instance;
}

MPIWatcher::~MPIWatcher() {
  stop();
}

void MPIWatcher::start(boost::asio::io_context& io_context, i32 mpi_size) {
  if (_running) {
    spdlog::warn("MPIWatcher already running");
    return;
  }
  
  _io_context = &io_context;
  _mpi_size = mpi_size;
  _running = true;
  _should_stop = false;
  
  _worker_thread_handle = std::thread(&MPIWatcher::_worker_thread, this);
  spdlog::info("MPIWatcher started with {} MPI processes", mpi_size);
}

void MPIWatcher::stop() {
  if (!_running) {
    return;
  }
  
  _should_stop = true;
  _queue_cv.notify_all();
  
  if (_worker_thread_handle.joinable()) {
    _worker_thread_handle.join();
  }
  
  _running = false;
  spdlog::info("MPIWatcher stopped");
}

void MPIWatcher::enqueue_review_request(const json& exams_data,
                                        std::function<void(const ScoreHiveResponse&)> callback) {
  if (!_running) {
    ScoreHiveResponse error_response;
    error_response.code = ScoreHiveResponseCode::ERROR;
    error_response.data = "MPIWatcher not running";
    error_response.length = error_response.data.size();
    callback(error_response);
    return;
  }
  
  ReviewRequest request;
  request.exams_data = exams_data;
  request.callback = std::move(callback);
  request.request_id = _next_request_id++;
  
  {
    std::lock_guard<std::mutex> lock(_queue_mutex);
    _request_queue.push(std::move(request));
  }
  
  _queue_cv.notify_one();
  spdlog::debug("Review request {} enqueued", request.request_id);
}

void MPIWatcher::_worker_thread() {
  spdlog::info("MPIWatcher worker thread started");
  
  while (!_should_stop) {
    std::unique_lock<std::mutex> lock(_queue_mutex);
    
    _queue_cv.wait(lock, [this] { 
      return !_request_queue.empty() || _should_stop; 
    });
    
    if (_should_stop) {
      break;
    }
    
    if (!_request_queue.empty()) {
      ReviewRequest request = std::move(_request_queue.front());
      _request_queue.pop();
      lock.unlock();
      
      spdlog::debug("Processing review request {}", request.request_id);
      _process_review_request(request);
    }
  }
  
  spdlog::info("MPIWatcher worker thread stopped");
}

void MPIWatcher::_process_review_request(const ReviewRequest& request) {
  ScoreHiveResponse response;
  
  try {
    auto& coordinator = MPICoordinator::instance();
    coordinator.send_to_workers(request.exams_data, _mpi_size);
    auto results = coordinator.receive_results_from_workers(_mpi_size);
    
    auto msg = results.dump();
    response.code = ScoreHiveResponseCode::OK;
    response.length = msg.size();
    response.data = msg;
    
    spdlog::debug("Review request {} processed successfully", request.request_id);
  } catch (const std::exception& e) {
    std::string message = "Review Error: " + std::string(e.what());
    spdlog::error("Review request {} failed: {}", request.request_id, message);
    
    response.code = ScoreHiveResponseCode::ERROR;
    response.length = message.size();
    response.data = message;
  }
  
  // Post callback to io_context to ensure thread safety
  if (_io_context && _running) {
    boost::asio::post(*_io_context, [callback = request.callback, response]() {
      callback(response);
    });
  }
}