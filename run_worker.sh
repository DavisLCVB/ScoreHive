#!/bin/bash

# Script para ejecutar el worker

mode=debug
port=8080
build_first=true
extra_env=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--release)
            mode=release
            shift
        ;;
        -d|--debug)
            mode=debug
            shift
        ;;
        -p|--port)
            if [[ -n $2 && $2 =~ ^[0-9]+$ ]]; then
                port=$2
                shift 2
            else
                echo "Error: -p requiere un número de puerto válido"
                exit 1
            fi
        ;;
        --no-build)
            build_first=false
            shift
        ;;
        -e|--env)
            if [[ -n $2 ]]; then
                extra_env="$extra_env $2"
                shift 2
            else
                echo "Error: -e requiere una variable de entorno (formato: VAR=valor)"
                exit 1
            fi
        ;;
        -h|--help)
            echo "Uso: $0 [opciones]"
            echo "Opciones:"
            echo "  -r, --release    Ejecutar en modo release"
            echo "  -d, --debug      Ejecutar en modo debug (por defecto)"
            echo "  -p, --port N     Puerto a usar (por defecto: 8080)"
            echo "  --no-build       No compilar antes de ejecutar"
            echo "  -e, --env VAR=val Variables de entorno adicionales"
            echo "  -h, --help       Mostrar esta ayuda"
            echo ""
            exit 0
        ;;
        release|debug)
            mode=$1
            shift
        ;;
        *)
            echo "Opción desconocida: $1"
            echo "Usa -h o --help para ver las opciones disponibles"
            exit 1
        ;;
    esac
done

echo "🚀 Ejecutando worker en modo $mode"
echo "🌐 Puerto: $port"

build_dir="build/$mode"
executable="$build_dir/worker/ScoreHiveWorker"

# Compilar si es necesario
if [ "$build_first" = true ]; then
    echo "🔨 Compilando..."
    if ! cmake --build "$build_dir" --target ScoreHiveWorker --parallel 12; then
        echo "❌ Error en la compilación"
        exit 1
    fi
    echo "✅ Compilación exitosa"
fi

if [ ! -f "$executable" ]; then
    echo "❌ Ejecutable no encontrado: $executable"
    echo "💡 Sugerencia: Ejecuta sin --no-build para compilar primero"
    exit 1
fi

if [ ! -x "$executable" ]; then
    echo "❌ El archivo no tiene permisos de ejecución: $executable"
    exit 1
fi

env_vars="ROLE=worker PORT=$port"

if [ "$mode" = "debug" ]; then
    env_vars="$env_vars DEBUG=1"
fi

if [ -n "$extra_env" ]; then
    env_vars="$env_vars$extra_env"
fi

echo "🔧 Variables de entorno: $env_vars"
echo "▶️  Iniciando worker..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

trap 'echo ""; echo "🛑 Worker detenido"; exit 0' INT TERM

eval "env $env_vars \"$executable\""
exit_code=$?

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $exit_code -eq 0 ]; then
    echo "✅ Worker terminó correctamente"
else
    echo "❌ Worker terminó con error (código: $exit_code)"
fi

exit $exit_code