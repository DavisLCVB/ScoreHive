#!/bin/bash

# Script to run the server

debug_mode=true
mode=$1
if [ "$mode" = "release" ]; then
    debug_mode=false
fi

if [ "$debug_mode" = true ]; then
    echo "Running in debug mode"
else
    echo "Running in release mode"
fi

if [ "$debug_mode" = true ]; then
    cmake --build build/debug --target ScoreHive &&\
    env ROLE=worker PORT=8080 DEBUG=1 ./build/debug/ScoreHive 
else
    cmake --build build/release --target ScoreHive &&\
    env ROLE=worker PORT=8080 ./build/release/ScoreHive 
fi