# Usa imagen base con OpenMPI preinstalado para eficiencia
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Instalar solo lo esencial
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    gcc-12 \
    g++-12 \
    libopenmpi-dev \
    openmpi-bin \
    && rm -rf /var/lib/apt/lists/*

# Configurar compiladores
RUN update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-12 100 && \
    update-alternatives --install /usr/bin/g++ g++ /usr/bin/g++-12 100

# Copiar código
WORKDIR /app
COPY . .

# Compilar (modo Release)
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release \
             -DCMAKE_CXX_COMPILER=g++-12 \
             -DCMAKE_CXX_STANDARD=20 && \
    make -j$(nproc)

# Punto de entrada (sobrescrito por MPI Operator)
CMD ["/app/build/ScoreHiveCluster"]  # Reemplaza con tu binario