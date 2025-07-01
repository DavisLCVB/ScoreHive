# ScoreHive - Configuración desde Cero

Este documento contiene todos los comandos necesarios para configurar y ejecutar ScoreHive en una máquina nueva desde cero.

## Requisitos Previos

### Sistema Operativo
- Linux (Ubuntu 20.04+, Arch Linux, etc.)
- macOS (con Docker Desktop)
- Windows (con WSL2 + Docker Desktop)

### Software Requerido
```bash
# Docker y Docker Compose
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
# O en Arch Linux:
sudo pacman -S docker docker-compose

# Git
sudo apt install -y git
# O en Arch Linux:
sudo pacman -S git

# Verificar instalación
docker --version
docker compose version
git --version
```

### Permisos Docker (Linux)
```bash
# Añadir usuario al grupo docker
sudo usermod -aG docker $USER

# Reiniciar sesión o ejecutar:
newgrp docker

# Iniciar servicio Docker
sudo systemctl enable docker
sudo systemctl start docker
```

## Paso 1: Clonar el Repositorio

```bash
# Clonar proyecto (ajustar URL según tu repositorio)
git clone <URL_DEL_REPOSITORIO> ScoreHive
cd ScoreHive

# Verificar estructura
ls -la
# Debe mostrar: adapter/, cluster/, frontend/, docker-compose.full.yml
```

## Paso 2: Construcción de Imágenes Docker

### Opción A: Construcción Automática (Recomendada)
```bash
# Construir y ejecutar todo el sistema de una vez
docker compose -f docker-compose.full.yml up --build

# O en background:
docker compose -f docker-compose.full.yml up --build -d
```

### Opción B: Construcción Manual (Paso a Paso)

#### 1. Construir Cluster MPI (Base)
```bash
cd cluster/
docker build -t scorehive-mpi:latest .
cd ..
```

#### 2. Construir Adapter HTTP-to-TCP
```bash
cd adapter/
docker build -t scorehive-adapter:latest .
cd ..
```

#### 3. Construir Frontend Next.js
```bash
cd frontend/
docker build -t scorehive-frontend:latest .
cd ..
```

#### 4. Verificar Imágenes Construidas
```bash
docker images | grep scorehive
# Debe mostrar:
# scorehive-frontend    latest    ...    ~274MB
# scorehive-adapter     latest    ...    ~293MB  
# scorehive-mpi         latest    ...    ~1.26GB
```

## Paso 3: Ejecución del Sistema

### Sistema Completo (Recomendado)
```bash
# Ejecutar todos los componentes
docker compose -f docker-compose.full.yml up

# O en background:
docker compose -f docker-compose.full.yml up -d

# Ver logs en tiempo real:
docker compose -f docker-compose.full.yml logs -f
```

### Solo Cluster MPI
```bash
cd cluster/
docker compose up

# O en background:
docker compose up -d
```

### Comandos de Gestión
```bash
# Parar todos los servicios
docker compose -f docker-compose.full.yml down

# Parar y eliminar volúmenes
docker compose -f docker-compose.full.yml down -v

# Reconstruir sin cache
docker compose -f docker-compose.full.yml build --no-cache

# Ver estado de contenedores
docker compose -f docker-compose.full.yml ps

# Logs de un servicio específico
docker compose -f docker-compose.full.yml logs frontend
docker compose -f docker-compose.full.yml logs adapter
docker compose -f docker-compose.full.yml logs mpi-master
```

## Paso 4: Verificación y Acceso

### URLs de Acceso
Una vez iniciado el sistema, verificar:

```bash
# Frontend Next.js
curl http://localhost:3000
# O abrir en navegador: http://localhost:3000

# Adapter API Health Check
curl http://localhost:3001/health

# Cluster MPI API
curl http://localhost:8080/
```

### Puertos Utilizados
- **3000**: Frontend (Next.js Web App)
- **3001**: Adapter (HTTP-to-TCP Bridge)  
- **8080**: Cluster MPI Master (HTTP Server)

## Configuración Avanzada

### Variables de Entorno

#### Frontend (.env.local)
```bash
# Crear archivo de configuración
cat > frontend/.env.local << EOF
NEXT_PUBLIC_ADAPTER_URL=http://localhost:3001
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
EOF
```

#### Adapter (.env)
```bash
# Crear archivo de configuración
cat > adapter/.env << EOF
PORT=3001
NODE_ENV=production
DEBUG=1
CLUSTER_HOST=mpi-master
CLUSTER_PORT=8080
EOF
```

### Cambiar Configuración MPI

#### Modificar Número de Workers
```bash
# Editar cluster/hostfile
nano cluster/hostfile

# Contenido ejemplo para 3 workers con 2 slots c/u:
# mpi-master slots=1
# mpi-worker1 slots=2  
# mpi-worker2 slots=2
# mpi-worker3 slots=2

# Editar cluster/docker-compose.yaml para añadir mpi-worker3
# Reconstruir:
cd cluster/
docker compose build
```

## Troubleshooting

### Problemas Comunes

#### 1. Puerto Ocupado
```bash
# Verificar qué proceso usa el puerto
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :8080

# Cambiar puerto en docker-compose.full.yml:
# ports:
#   - "3001:3001"  # cambiar por "3002:3001"
```

#### 2. Falta de Memoria
```bash
# Verificar uso de memoria
docker stats

# Añadir límites en docker-compose.full.yml:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

#### 3. Error de Permisos
```bash
# Verificar permisos Docker
docker run hello-world

# Si falla, verificar grupo docker:
groups $USER
sudo usermod -aG docker $USER
newgrp docker
```

#### 4. Build Failure Frontend
```bash
# Si falla el build del frontend, limpiar cache:
cd frontend/
rm -rf .next/ node_modules/
cd ..

# Reconstruir:
docker compose -f docker-compose.full.yml build frontend --no-cache
```

### Logs de Depuración
```bash
# Ver logs detallados de todos los servicios
docker compose -f docker-compose.full.yml logs -f

# Logs específicos con timestamps
docker compose -f docker-compose.full.yml logs -f -t frontend

# Entrar a un contenedor para depuración
docker compose -f docker-compose.full.yml exec frontend sh
docker compose -f docker-compose.full.yml exec adapter sh
docker compose -f docker-compose.full.yml exec mpi-master bash
```

### Limpieza del Sistema
```bash
# Parar y eliminar todo
docker compose -f docker-compose.full.yml down -v

# Limpiar imágenes huérfanas
docker system prune -f

# Eliminar todas las imágenes de ScoreHive
docker rmi $(docker images | grep scorehive | awk '{print $3}')

# Limpiar todo Docker (¡CUIDADO!)
docker system prune -a -f
```

## Desarrollo Local

### Modo Desarrollo (Sin Docker)

#### Frontend
```bash
cd frontend/
npm install
npm run dev
# Acceder: http://localhost:3000
```

#### Adapter  
```bash
cd adapter/
npm install
npm start
# Ejecuta en: http://localhost:3001
```

#### Cluster
```bash
cd cluster/
./run_build.sh -d
./run_cluster.sh -d
# HTTP Server en: http://localhost:8080
```

## Comandos de Respaldo

### Crear Script de Inicio Rápido
```bash
# Crear script automatizado
cat > start-scorehive.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Iniciando ScoreHive..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

# Construir y ejecutar
echo "🔨 Construyendo imágenes..."
docker compose -f docker-compose.full.yml build

echo "▶️ Iniciando servicios..."
docker compose -f docker-compose.full.yml up -d

echo "⏳ Esperando servicios..."
sleep 10

echo "✅ ScoreHive iniciado:"
echo "   Frontend: http://localhost:3000"
echo "   Adapter:  http://localhost:3001"
echo "   Cluster:  http://localhost:8080"

echo "📊 Estado de contenedores:"
docker compose -f docker-compose.full.yml ps
EOF

chmod +x start-scorehive.sh

# Ejecutar:
./start-scorehive.sh
```

### Script de Parada
```bash
cat > stop-scorehive.sh << 'EOF'
#!/bin/bash
echo "🛑 Parando ScoreHive..."
docker compose -f docker-compose.full.yml down
echo "✅ ScoreHive detenido"
EOF

chmod +x stop-scorehive.sh
```

## Resumen de Comandos Esenciales

```bash
# Setup inicial
git clone <repo> ScoreHive && cd ScoreHive

# Construcción y ejecución
docker compose -f docker-compose.full.yml up --build

# Verificación
curl http://localhost:3000  # Frontend
curl http://localhost:3001/health  # Adapter  
curl http://localhost:8080  # Cluster

# Gestión
docker compose -f docker-compose.full.yml ps     # Estado
docker compose -f docker-compose.full.yml logs   # Logs
docker compose -f docker-compose.full.yml down   # Parar
```

---

**¡ScoreHive listo para funcionar!** 🎯

Para soporte adicional, revisa los logs con:
`docker compose -f docker-compose.full.yml logs -f`