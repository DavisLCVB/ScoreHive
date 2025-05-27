#!/bin/bash

# Script to run the server

debug_mode=false
mode=$1
if [ "$mode" = "debug" ]; then
    debug_mode=true
fi

if [ "$debug_mode" = true ]; then
    cmake --build build/debug --target ScoreHive &&\
    env ROLE=worker PORT=8080 DEBUG=1 ./build/debug/ScoreHive 
else
    cmake --build build/release --target ScoreHive &&\
    env ROLE=worker PORT=8080 ./build/release/ScoreHive 
fi