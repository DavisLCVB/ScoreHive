#include "pool.hpp"

// Constructor.
// We create the workers and add them to the vector.
// Each worker will run the function in a loop until the thread pool is stopped.
ThreadPool::ThreadPool(u32 num_threads) : _running(true) {
  for (u32 i = 0; i < num_threads; i++) {
    _workers.emplace_back([this] {
      while (true) {
        WorkersTask task;
        {
          UniqueLock<Mutex> lock(_queue_mutex);
          _tasks_cv.wait(lock, [this] { return !_tasks.empty() || !_running; });
          if (!_running && _tasks.empty()) {
            return;
          }
          task = std::move(_tasks.front());
          _tasks.pop();
        }
        task();
      }
    });
  }
}

// Destructor.
// We set the running flag to false and notify all workers.
// Then, we join all workers.
ThreadPool::~ThreadPool() {
  {
    LockGuard<Mutex> lock(_queue_mutex);
    _running = false;
  }
  _tasks_cv.notify_all();
  for (auto& worker : _workers) {
    if (worker.joinable()) {
      worker.join();
    }
  }
}
