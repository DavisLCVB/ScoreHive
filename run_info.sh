#!/bin/bash

mode=debug
clean=false
target=worker

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
        worker|dispatcher)
            target=$1
            shift
        ;;
        -h|--help)
            echo "Uso: $0 [target] [opciones]"
            echo "Targets:"
            echo "  worker           Target worker (por defecto)"
            echo "  dispatcher       Target dispatcher"
            echo "Opciones:"
            echo "  -c, --clean      Mostrar info de clean build"
            echo "  -r, --release    Mostrar info de modo release"
            echo "  -d, --debug      Mostrar info de modo debug (por defecto)"
            echo "  -t, --target T   Target: worker|dispatcher"
            echo "  -h, --help       Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0 worker release"
            echo "  $0 dispatcher -r"
            echo "  $0 -t dispatcher --release"
            exit 0
        ;;
        *)
            echo "Opción desconocida: $1"
            echo "Usa -h o --help para ver las opciones disponibles"
            exit 1
        ;;
    esac
done

echo "=== Información para modo $mode, target $target ==="
file=build/$mode/$target/ScoreHive${target^}

if [ ! -f "$file" ]; then
    echo "❌ Archivo no encontrado: $file"
    echo "💡 Sugerencia: Ejecuta el script de build primero"
    exit 1
fi

echo "📁 Archivo: $file"
echo "📏 Tamaño: $(du -h "$file" | awk '{print $1}')"
echo "🔐 Permisos: $(stat -c '%a' "$file") ($(stat -c '%A' "$file"))"
echo "👤 Propietario: $(stat -c '%U:%G' "$file")"
echo "🏷️  Tipo: $(file "$file" | cut -d: -f2 | sed 's/^ *//')"

echo ""
echo "=== Información adicional ==="
echo "📅 Última modificación: $(stat -c '%y' "$file" | cut -d. -f1)"

size_bytes=$(stat -c '%s' "$file")
echo "📊 Tamaño exacto: $size_bytes bytes"

if [ -x "$file" ]; then
    echo "✅ Es ejecutable"
else
    echo "❌ NO es ejecutable"
fi

cmake_cache="$build_dir/CMakeCache.txt"
if [ -f "$cmake_cache" ]; then
    echo ""
    echo "=== Configuración CMake ==="
    echo "🔧 Build Type: $(grep CMAKE_BUILD_TYPE:STRING "$cmake_cache" | cut -d= -f2)"
    echo "🖥️  Compilador C: $(grep CMAKE_C_COMPILER:FILEPATH "$cmake_cache" | cut -d= -f2 | xargs basename)"
    echo "🖥️  Compilador C++: $(grep CMAKE_CXX_COMPILER:FILEPATH "$cmake_cache" | cut -d= -f2 | xargs basename)"
fi