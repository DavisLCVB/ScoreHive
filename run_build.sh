#!/bin/bash

mode=debug
clean=false
jobs=10

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
        -j|--jobs)
            if [[ -n $2 && $2 =~ ^[0-9]+$ ]]; then
                jobs=$2
                shift 2
            else
                echo "Error: -j requiere un número válido"
                exit 1
            fi
        ;;
        -j*)
            # Maneja -j8 (sin espacio)
            jobs=${1#-j}
            if [[ ! $jobs =~ ^[0-9]+$ ]]; then
                echo "Error: -j requiere un número válido"
                exit 1
            fi
            shift
        ;;
        -h|--help)
            echo "Uso: $0 [opciones]"
            echo "Opciones:"
            echo "  -c, --clean     Limpiar build antes de compilar"
            echo "  -r, --release   Usar modo release (por defecto: debug)"
            echo "  -j, --jobs N    Número de jobs paralelos (por defecto: 10)"
            echo "  -h, --help      Mostrar esta ayuda"
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
echo "  Jobs=$jobs"

if [ "$clean" = "true" ]; then
    rm -rf build/$mode
    cmake -B build/$mode -DCMAKE_BUILD_TYPE=$mode
fi

# build/$mode not exists
if [ ! -d "build/$mode" ]; then
    cmake -B build/$mode -DCMAKE_BUILD_TYPE=$mode
fi

cmake --build build/$mode --parallel $jobs