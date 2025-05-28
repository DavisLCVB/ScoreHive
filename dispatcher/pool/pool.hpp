#pragma once
#ifndef POOL_HPP
#define POOL_HPP

#include <aliases.hpp>
#include <concepts>
#include <functional>
#include <type_traits>

// Type for the task to execute.
template <typename F, typename... Args>
concept TaskType = std::is_invocable_v<F, Args...>;

class ThreadPool {
 public:
  // Type for the functions to call in the workers.
  using WorkersTask = std::function<void()>;

  // Type for the result of the task to execute.
  template <typename F, typename... Args>
  using TaskResultType = typename std::invoke_result<F, Args...>::type;

  explicit ThreadPool(u32 num_threads);
  ~ThreadPool();

  // Add a task to the queue.
  // First, we create a packaged task with the function and arguments.
  // Then, we get the future from the packaged task.
  // Then, we lock the queue mutex and add the task to the queue.
  // Finally, we notify one of the workers.
  template <typename F, typename... Args>
    requires TaskType<F, Args...>
  auto add_task(F&& func, Args&&... args)
      -> Future<TaskResultType<F, Args...>> {
    using ResultType = TaskResultType<F, Args...>;
    auto task = std::make_shared<std::packaged_task<ResultType()>>(
        std::bind(std::forward<F>(func), std::forward<Args>(args)...));
    auto future = task->get_future();
    {
      UniqueLock<Mutex> lock(_queue_mutex);
      if (!_running) {
        throw std::runtime_error("ThreadPool is not running");
      }
      _tasks.emplace([task]() { (*task)(); });
    }
    _tasks_cv.notify_one();
    return future;
  }

 private:
  Vector<JThread> _workers;
  Queue<WorkersTask> _tasks;
  Mutex _queue_mutex;
  ConVar _tasks_cv;
  bool _running;
};

#endif  // POOL_HPP