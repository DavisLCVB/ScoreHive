#!/bin/bash

mode=debug
clean=false
target=worker
jobs=12

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--clean)
            clean=true
            shift
        ;;
        -r|--release)
            mode=release
            shift
        ;;
        -d|--debug)
            mode=debug
            shift
        ;;
        -t|--target)
            if [[ -n $2 && ($2 == "worker" || $2 == "dispatcher") ]]; then
                target=$2
                shift 2
            else
                echo "Error: -t requiere 'worker' o 'dispatcher'"
                exit 1
            fi
        ;;
        -h|--help)
            echo "Uso: $0 [opciones]"
            echo "Opciones:"
            echo "  -c, --clean      Limpiar build antes de compilar"
            echo "  -r, --release    Usar modo release"
            echo "  -d, --debug      Usar modo debug (por defecto)"
            echo "  -t, --target T   Target a compilar: worker|dispatcher (por defecto: worker)"
            echo "  -h, --help       Mostrar esta ayuda"
            exit 0
        ;;
        *)
            echo "Opción desconocida: $1"
            echo "Usa -h o --help para ver las opciones disponibles"
            exit 1
        ;;
    esac
done

echo "Config:"
echo "  Mode=$mode"
echo "  Clean=$clean"
echo "  Target=$target"
echo "  Jobs=$jobs"

if [ "$clean" = "true" ]; then
    rm -rf build/$mode
    cmake -B build/$mode -DCMAKE_BUILD_TYPE=$mode
fi

if [ ! -d "build/$mode" ]; then
    cmake -B build/$mode -DCMAKE_BUILD_TYPE=$mode
fi

cmake --build build/$mode/$target --target ScoreHive${target^} --parallel $jobs