cmake_minimum_required(VERSION 3.20)
project(ScoreHive)
message("Build type is: ${CMAKE_BUILD_TYPE}")

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CMAKE_CXX_FLAGS_DEBUG "-Wall -Wextra -Wpedantic -Wshadow -Wcast-align -Wunused -Wcast-qual -Wold-style-cast -O0 -g -Werror")
set(CMAKE_CXX_FLAGS_RELEASE "-Wall -Wextra -Wpedantic -Wshadow -Wcast-align -Wunused -Wcast-qual -Wold-style-cast -O2 -Werror")

include(FetchContent)
find_package(Boost CONFIG QUIET COMPONENTS system)

if(NOT Boost_FOUND)
    message("Boost not found, downloading...")
    FetchContent_Declare(
        Boost
        GIT_REPOSITORY https://github.com/boostorg/boost.git
        GIT_TAG boost-1.85.0
        GIT_SHALLOW TRUE
    )
    set(BOOST_ENABLE_CMAKE ON)
    set(BOOST_INCLUDE_LIBRARIES system)
    FetchContent_MakeAvailable(Boost)
    set(Boost_LIBRARIES Boost::system)
else()
    set(Boost_LIBRARIES Boost::system)
    message("Found system Boost")
endif()

find_package(spdlog QUIET)

if(NOT spdlog_FOUND)
    message("spdlog not found, downloading...")
    FetchContent_Declare(
        spdlog
        GIT_REPOSITORY https://github.com/gabime/spdlog.git
        GIT_TAG v1.14.1
    )

    set(SPDLOG_FMT_EXTERNAL OFF CACHE BOOL "" FORCE)
    set(SPDLOG_FMT_EXTERNAL_HO OFF CACHE BOOL "" FORCE)
    set(SPDLOG_BUILD_SHARED OFF CACHE BOOL "" FORCE)

    FetchContent_MakeAvailable(spdlog)

    if(TARGET spdlog)
        target_compile_options(spdlog PRIVATE -w)
    endif()

    message("Downloaded and configured spdlog")
else()
    message("Found system spdlog")
endif()

find_package(nlohmann_json QUIET)

if(NOT nlohmann_json_FOUND)
    message("nlohmann_json not found, downloading...")
    FetchContent_Declare(
        nlohmann_json
        GIT_REPOSITORY https://github.com/nlohmann/json.git
        GIT_TAG v3.11.3
    )
    FetchContent_MakeAvailable(nlohmann_json)
    message("Downloaded and configured nlohmann_json")
else()
    message("Found system nlohmann_json")
endif()

set(SCORE_HIVE_SOURCES
    source/main.cpp
    source/pool/pool.cpp
    source/server/server.cpp
    source/actors/worker.cpp
    source/client/client.cpp
    source/system/environment.cpp
)

add_executable(ScoreHive ${SCORE_HIVE_SOURCES})
target_include_directories(ScoreHive PRIVATE "${CMAKE_SOURCE_DIR}/source")
target_include_directories(ScoreHive PRIVATE ${nlohmann_json_INCLUDE_DIRS})

target_link_libraries(ScoreHive PRIVATE ${Boost_LIBRARIES})
target_link_libraries(ScoreHive PRIVATE spdlog::spdlog)
target_link_libraries(ScoreHive PRIVATE nlohmann_json::nlohmann_json)

get_target_property(SPDLOG_INCLUDE_DIRS spdlog::spdlog INTERFACE_INCLUDE_DIRECTORIES)

if(SPDLOG_INCLUDE_DIRS)
    target_include_directories(ScoreHive SYSTEM PRIVATE ${SPDLOG_INCLUDE_DIRS})
endif()

if(IS_DIRECTORY "${CMAKE_SOURCE_DIR}/tests")
    message("Building tests")
    enable_testing()
    add_subdirectory(tests)
endif()