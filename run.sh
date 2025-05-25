#!/bin/bash

arg1=$1

if [ "$arg1" == "test" ]; then
    all_args=("$@")
    echo "Running tests"
    ctest --test-dir build/debug --output-on-failure "${all_args[@]:1}"
elif [ "$arg1" == "build" ]; then
    clean=false
    if [ "$2" == "clean" ]; then
        clean=true
    fi
    echo "Building"
    if [ "$clean" == true ]; then
        rm -rf build/debug
        cmake -B build/debug -DCMAKE_BUILD_TYPE=Debug
    fi
    cmake --build build/debug -j 10
elif [ "$arg1" == "bin" ]; then
    echo "Running binary"
    role=$2
    cmake --build build/debug -j 10 && ./build/debug/ScoreHive "$role"
else
    echo "Invalid argument"
    exit 1
fi