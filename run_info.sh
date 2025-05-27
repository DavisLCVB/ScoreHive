#!/bin/bash

mode=debug
if [ "$1" = "release" ]; then
    mode=release
fi

echo "Info for $mode mode"
file=build/$mode/ScoreHive

if [ ! -f "$file" ]; then
    echo "File not found: $file"
    exit 1
fi

if [ -f "$file" ]; then
    echo "File: $file"
    echo "Size: $(du -h $file | awk '{print $1}')"
    echo "Permissions: $(stat -c '%a' $file)"
    echo "Owner: $(stat -c '%U' $file)"
    echo "Executable: $(file $file | awk '{print $2}')"
fi