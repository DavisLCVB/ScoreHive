find_package(GTest REQUIRED)
include(GoogleTest)

add_executable(tests tests.cpp ../source/pool/pool.cpp)
target_link_libraries(tests PRIVATE GTest::gtest GTest::gtest_main pthread)
target_include_directories(tests PRIVATE "${CMAKE_SOURCE_DIR}/source")
gtest_discover_tests(tests)