set(SCORE_HIVE_DISPATCHER_SOURCES
  dispatcher.cpp
  pool/pool.cpp
  server/server.cpp
  system/environment.cpp
  client/client.cpp
)

add_executable(ScoreHiveDispatcher ${SCORE_HIVE_DISPATCHER_SOURCES})
target_include_directories(ScoreHiveDispatcher PRIVATE "${CMAKE_SOURCE_DIR}/dispatcher")
target_include_directories(ScoreHiveDispatcher PRIVATE ${nlohmann_json_INCLUDE_DIRS})

target_link_libraries(ScoreHiveDispatcher PRIVATE ${Boost_LIBRARIES})
target_link_libraries(ScoreHiveDispatcher PRIVATE spdlog::spdlog)
target_link_libraries(ScoreHiveDispatcher PRIVATE nlohmann_json::nlohmann_json)