#pragma once
#ifndef ALIASES_HPP
#define ALIASES_HPP

#include <boost/asio.hpp>
#include <condition_variable>
#include <cstdint>
#include <exception>
#include <future>
#include <mutex>
#include <queue>
#include <sstream>
#include <string>
#include <thread>
#include <tuple>
#include <vector>

// For unused parameters or variables.
// Avoids compiler warnings-errors (-Wunused-parameter -Werror).
#define UNUSED [[maybe_unused]]

using String = std::string;
using StringStream = std::stringstream;

template <typename T>
using Vector = std::vector<T>;
template <typename... T>
using Tuple = std::tuple<T...>;

template <typename K, typename V>
using Map = std::unordered_map<K, V>;

using JThread = std::jthread;
template <typename T>
using Queue = std::queue<T>;
using Mutex = std::mutex;
using ConVar = std::condition_variable;
template <typename T>
using Atomic = std::atomic<T>;
template <typename T>
using LockGuard = std::lock_guard<T>;
template <typename T>
using UniqueLock = std::unique_lock<T>;
template <typename T>
using Future = std::future<T>;
template <typename T>
using SharedPtr = std::shared_ptr<T>;
template <typename T>
using UniquePtr = std::unique_ptr<T>;

using OnceFlag = std::once_flag;

using Exception = std::exception;

using i8 = int8_t;
using i16 = int16_t;
using i32 = int32_t;
using i64 = int64_t;

using u8 = uint8_t;
using u16 = uint16_t;
using u32 = uint32_t;
using u64 = uint64_t;

using f32 = float;
using f64 = double;

// Boost.Asio
using IOContext = boost::asio::io_context;
using TCP = boost::asio::ip::tcp;
using Socket = boost::asio::ip::tcp::socket;
using Acceptor = boost::asio::ip::tcp::acceptor;
using Endpoint = boost::asio::ip::tcp::endpoint;
using ErrorCode = boost::system::error_code;
using SignalSet = boost::asio::signal_set;
using Streambuf = boost::asio::streambuf;
using SteadyTimer = boost::asio::steady_timer;
using IOContextWorkGuard =
    boost::asio::executor_work_guard<IOContext::executor_type>;
namespace error = boost::asio::error;
namespace asio = boost::asio;

#endif  // ALIASES_HPP