set(SCORE_HIVE_WORKER_SOURCES
  worker.cpp
  pool/pool.cpp
  server/server.cpp
  system/environment.cpp
)

add_executable(ScoreHiveWorker ${SCORE_HIVE_WORKER_SOURCES})
target_include_directories(ScoreHiveWorker PRIVATE "${CMAKE_SOURCE_DIR}/worker")
target_include_directories(ScoreHiveWorker PRIVATE ${nlohmann_json_INCLUDE_DIRS})

target_link_libraries(ScoreHiveWorker PRIVATE ${Boost_LIBRARIES})
target_link_libraries(ScoreHiveWorker PRIVATE spdlog::spdlog)
target_link_libraries(ScoreHiveWorker PRIVATE nlohmann_json::nlohmann_json)