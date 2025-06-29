FROM archlinux/archlinux:latest

# Instalar dependencias del sistema y librerías
RUN pacman -Syu --noconfirm     base-devel     cmake     git     wget     pkgconf     gcc     openmpi     boost     libpqxx     openssh     net-tools     iputils     vim     && pacman -Scc --noconfirm

# Instalar spdlog
RUN cd /tmp && \
    git clone https://github.com/gabime/spdlog.git && \
    cd spdlog && \
    mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=23 -DCMAKE_CXX_COMPILER=g++ && \
    make -j$(nproc) && \
    make install && \
    cd / && rm -rf /tmp/spdlog

# Instalar nlohmann_json
RUN cd /tmp &&     git clone https://github.com/nlohmann/json.git &&     cd json &&     mkdir build && cd build &&     cmake .. -DCMAKE_BUILD_TYPE=Release -DJSON_BuildTests=OFF -DCMAKE_CXX_STANDARD=23 -DCMAKE_CXX_COMPILER=g++ &&     make -j$(nproc) &&     make install &&     cd / && rm -rf /tmp/json


# Configurar SSH para comunicación MPI interna
RUN mkdir /var/run/sshd
RUN echo 'root:mpipassword' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# Generar llaves SSH para comunicación interna MPI
RUN ssh-keygen -t rsa -f /root/.ssh/id_rsa -N ''
RUN cp /root/.ssh/id_rsa.pub /root/.ssh/authorized_keys
RUN chmod 600 /root/.ssh/authorized_keys


# Configurar SSH para MPI (sin verificación de host)
RUN echo "Host *" >> /root/.ssh/config && \
    echo "    StrictHostKeyChecking no" >> /root/.ssh/config && \
    echo "    UserKnownHostsFile=/dev/null" >> /root/.ssh/config

# Crear directorio de aplicación
WORKDIR /app

# Copiar código fuente
COPY . /app/

# Compilar aplicación (Debug por defecto) - Usar C++20 (compatible con Boost 1.74)
RUN mkdir -p build/debug &&     cd build/debug &&     cmake ../.. -DCMAKE_BUILD_TYPE=Debug                 -DCMAKE_CXX_COMPILER=g++                 -DCMAKE_C_COMPILER=gcc                 -DCMAKE_CXX_STANDARD=23                 -DCMAKE_CXX_STANDARD_REQUIRED=ON                 -DCMAKE_CXX_FLAGS="-std=c++23" &&     make -j$(nproc)

# Compilar versión Release también - Usar C++20 (compatible con Boost 1.74)
RUN mkdir -p build/release &&     cd build/release &&     cmake ../.. -DCMAKE_BUILD_TYPE=Release                 -DCMAKE_CXX_COMPILER=g++                 -DCMAKE_C_COMPILER=gcc                 -DCMAKE_CXX_STANDARD=23                 -DCMAKE_CXX_STANDARD_REQUIRED=ON                 -DCMAKE_CXX_FLAGS="-std=c++23" &&     make -j$(nproc)

# Configurar variables de entorno para MPI
ENV OMPI_ALLOW_RUN_AS_ROOT=1
ENV OMPI_ALLOW_RUN_AS_ROOT_CONFIRM=1

# Crear script de inicio
RUN echo '#!/bin/bash\n\
/usr/sbin/sshd\n\
if [ "$(hostname)" = "mpi-master" ]; then\n\
    sleep 10\n\
    if [ "$DEBUG" = "1" ]; then\n\
        env DEBUG=1 mpirun  --allow-run-as-root --hostfile /app/hostfile  -n 4 /app/build/debug/ScoreHiveCluster\n\
    else\n\
        mpirun  --allow-run-as-root --hostfile /app/hostfile -n 4 /app/build/release/ScoreHiveCluster\n\
    fi\n\
else\n\
    tail -f /dev/null\n\
fi' > /app/start.sh && chmod +x /app/start.sh

# Exponer puerto del servidor
EXPOSE 8080

# Ejecutar script de inicio
CMD ["/app/start.sh"]