#include <gtest/gtest.h>
#include <algorithm>
#include <pool/pool.hpp>
#include <random>

// Test basic functionality.
TEST(ThreadPoolTest, BasicFunctionality) {
  const u32 num_threads = 4;
  ThreadPool pool(num_threads);

  auto future = pool.add_task([](int a, int b) { return a + b; }, 2, 3);
  EXPECT_EQ(future.get(), 5);
}

// Test with void return type.
TEST(ThreadPoolTest, VoidReturnType) {
  ThreadPool pool(2);

  bool task_executed = false;
  auto future = pool.add_task([&task_executed]() { task_executed = true; });

  future.wait();
  EXPECT_TRUE(task_executed);
}

// Test multiple tasks
TEST(ThreadPoolTest, MultipleTasks) {
  ThreadPool pool(4);

  std::vector<Future<int>> futures;
  const int num_tasks = 100;

  for (int i = 0; i < num_tasks; ++i) {
    futures.push_back(pool.add_task([](int x) { return x * x; }, i));
  }

  for (int i = 0; i < num_tasks; ++i) {
    EXPECT_EQ(futures[i].get(), i * i);
  }
}

// Test exception handling
TEST(ThreadPoolTest, ExceptionHandling) {
  ThreadPool pool(2);

  auto future = pool.add_task([]() -> int {
    throw std::runtime_error("Test exception");
    return 42;
  });

  EXPECT_THROW(future.get(), std::runtime_error);
}

// Test heavy workload
TEST(ThreadPoolTest, HeavyWorkload) {
  const u32 num_threads = std::thread::hardware_concurrency();
  ThreadPool pool(num_threads);

  auto cpu_intensive = [](int milliseconds) {
    auto start = std::chrono::high_resolution_clock::now();
    while (std::chrono::high_resolution_clock::now() - start <
           std::chrono::milliseconds(milliseconds)) {
      // Busy wait
      volatile int x = 0;
      for (int i = 0; i < 1000000; ++i) {
        x += i;
      }
    }
    return milliseconds;
  };

  const int num_tasks = num_threads * 2;
  std::vector<Future<int>> futures;

  for (int i = 0; i < num_tasks; ++i) {
    futures.push_back(pool.add_task(cpu_intensive, 100));
  }

  for (auto& future : futures) {
    EXPECT_EQ(future.get(), 100);
  }
}

// Test concurrent task addition
TEST(ThreadPoolTest, ConcurrentTaskAddition) {
  ThreadPool pool(4);

  std::vector<std::thread> threads;
  std::vector<Future<int>> futures(100);
  std::mutex futures_mutex;

  // Launch 10 threads that each add 10 tasks
  for (int t = 0; t < 10; ++t) {
    threads.emplace_back([t, &pool, &futures, &futures_mutex]() {
      for (int i = 0; i < 10; ++i) {
        int value = t * 10 + i;
        auto future = pool.add_task(
            [](int x) {
              std::this_thread::sleep_for(std::chrono::milliseconds(10));
              return x;
            },
            value);

        std::lock_guard<std::mutex> lock(futures_mutex);
        futures[value] = std::move(future);
      }
    });
  }

  for (auto& t : threads) {
    t.join();
  }

  for (int i = 0; i < 100; ++i) {
    EXPECT_EQ(futures[i].get(), i);
  }
}

// Test with different argument types
TEST(ThreadPoolTest, DifferentArgumentTypes) {
  ThreadPool pool(2);

  auto string_future =
      pool.add_task([](const std::string& s) { return s + " World"; }, "Hello");
  EXPECT_EQ(string_future.get(), "Hello World");

  auto vector_future = pool.add_task(
      [](std::vector<int> v) {
        int sum = 0;
        for (int x : v) {
          sum += x;
        }
        return sum;
      },
      std::vector<int>{1, 2, 3, 4, 5});
  EXPECT_EQ(vector_future.get(), 15);

  auto mixed_future = pool.add_task(
      [](int a, double b, std::string c) {
        return c + " " + std::to_string(a + static_cast<int>(b));
      },
      10, 5.5, "Result:");
  EXPECT_EQ(mixed_future.get(), "Result: 15");
}

// Test thread count
TEST(ThreadPoolTest, ThreadCount) {
  const u32 num_threads = 8;
  ThreadPool pool(num_threads);

  std::atomic<int> counter = 0;
  std::mutex mtx;
  std::condition_variable cv;
  bool start = false;

  std::vector<Future<int>> futures;

  // Create tasks that will all run concurrently
  for (u32 i = 0; i < num_threads; ++i) {
    futures.push_back(pool.add_task([&counter, &mtx, &cv, &start]() {
      {
        std::unique_lock<std::mutex> lock(mtx);
        cv.wait(lock, [&start] { return start; });
      }

      return counter.fetch_add(1);
    }));
  }

  auto last_future = pool.add_task([&counter]() { return counter.load(); });

  {
    std::lock_guard<std::mutex> lock(mtx);
    start = true;
  }
  cv.notify_all();

  std::vector<int> results;
  for (auto& future : futures) {
    results.push_back(future.get());
  }

  std::sort(results.begin(), results.end());

  for (u32 i = 0; i < num_threads; ++i) {
    EXPECT_EQ(results[i], i);
  }

  EXPECT_EQ(last_future.get(), num_threads);
}

// Stress test with random task durations
TEST(ThreadPoolTest, StressTest) {
  ThreadPool pool(std::thread::hardware_concurrency());

  std::random_device rd;
  std::mt19937 gen(rd());
  std::uniform_int_distribution<> distrib(10, 100);

  const int num_tasks = 1000;
  std::vector<Future<int>> futures;
  std::vector<int> expected_results;

  for (int i = 0; i < num_tasks; ++i) {
    int sleep_time = distrib(gen);
    expected_results.push_back(sleep_time);

    futures.push_back(pool.add_task(
        [](int sleep_time_param) {
          std::this_thread::sleep_for(
              std::chrono::milliseconds(sleep_time_param));
          return sleep_time_param;
        },
        sleep_time));
  }

  for (int i = 0; i < num_tasks; ++i) {
    EXPECT_EQ(futures[i].get(), expected_results[i]);
  }
}

// Test task dependency chain
TEST(ThreadPoolTest, TaskDependencyChain) {
  ThreadPool pool(4);

  auto future1 = pool.add_task([]() { return 10; });

  auto future2 = pool.add_task([&future1]() {
    int value = future1.get();
    return value * 2;
  });

  auto future3 = pool.add_task([&future2]() {
    int value = future2.get();
    return value + 5;
  });

  EXPECT_EQ(future3.get(), 25);  // (10 * 2) + 5 = 25
}

// Main function to run all tests
int main(int argc, char** argv) {
  ::testing::InitGoogleTest(&argc, argv);
  return RUN_ALL_TESTS();
}