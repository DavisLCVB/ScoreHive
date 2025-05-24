cmake_minimum_required(VERSION 3.20)
project(ScoreHive)
message("Build type is: ${CMAKE_BUILD_TYPE}")

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_CXX_FLAGS_DEBUG "-Wall -Wextra -Wpedantic -Wshadow -Wcast-align -Wunused -Wcast-qual -Wold-style-cast -O0 -g -Werror")
set(CMAKE_CXX_FLAGS_RELEASE "-Wall -Wextra -Wpedantic -Wshadow -Wcast-align -Wunused -Wcast-qual -Wold-style-cast -O2 -Werror")

find_package(Boost CONFIG REQUIRED COMPONENTS system)

set(SCORE_HIVE_SOURCES
    source/main.cpp
    source/pool/pool.cpp
    source/server/server.cpp
)

add_executable(ScoreHive ${SCORE_HIVE_SOURCES})
target_include_directories(ScoreHive PRIVATE "${CMAKE_SOURCE_DIR}/source")
target_link_libraries(ScoreHive PRIVATE Boost::system)

if(IS_DIRECTORY "${CMAKE_SOURCE_DIR}/tests")
    message("Building tests")
    enable_testing()
    add_subdirectory(tests)
endif()