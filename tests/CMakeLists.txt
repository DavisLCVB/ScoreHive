find_package(GTest REQUIRED)
include(GoogleTest)

add_executable(pool_test pool.test.cpp ../source/pool/pool.cpp)
target_link_libraries(pool_test PRIVATE GTest::gtest GTest::gtest_main pthread)
target_include_directories(pool_test PRIVATE "${CMAKE_SOURCE_DIR}/source")
gtest_discover_tests(pool_test)