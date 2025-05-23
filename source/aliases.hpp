#pragma once
#ifndef ALIASES_HPP
#define ALIASES_HPP

#include <condition_variable>
#include <cstdint>
#include <future>
#include <mutex>
#include <queue>
#include <string>
#include <thread>
#include <vector>

// For unused parameters or variables.
// Avoids compiler warnings-errors (-Wunused-parameter -Werror).
#define unused [[maybe_unused]]

using String = std::string;

template <typename T>
using Vector = std::vector<T>;
using JThread = std::jthread;
template <typename T>
using Queue = std::queue<T>;
using Mutex = std::mutex;
using ConVar = std::condition_variable;
template <typename T>
using LockGuard = std::lock_guard<T>;
template <typename T>
using UniqueLock = std::unique_lock<T>;
template <typename T>
using Future = std::future<T>;

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

#endif  // ALIASES_HPP