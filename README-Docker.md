# ScoreHive - Docker Deployment Guide

Este documento explica cómo ejecutar el sistema completo ScoreHive usando Docker Compose.

## Arquitectura de Contenedores

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Adapter      │    │   MPI Master    │
│   (Next.js)     │───▶│  (HTTP-to-TCP)  │───▶│   (Cluster)     │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 8080    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │  MPI Workers    │
                                              │  (2 containers) │
                                              │  (2 slots c/u)  │
                                              └─────────────────┘
```

## Configuración Actual

### Cluster MPI
- **1 Master**: `mpi-master` (1 slot) - Puerto 8080
- **2 Workers**: `mpi-worker1`, `mpi-worker2` (2 slots cada uno)
- **Total**: 5 procesos MPI (1 master + 4 workers)

### Servicios
- **Frontend**: Puerto 3000 (Next.js)
- **Adapter**: Puerto 3001 (Express.js)
- **Cluster**: Puerto 8080 (HTTP Server del Master)

## Comandos de Ejecución

### 1. Construir e Iniciar el Sistema Completo

```bash
# En el directorio raíz de ScoreHive
docker-compose -f docker-compose.full.yml up --build
```

### 2. Ejecutar Solo el Cluster (configuración original)

```bash
cd cluster/
docker-compose up --build
```

### 3. Comandos Útiles

```bash
# Construir solo las imágenes
docker-compose -f docker-compose.full.yml build

# Ejecutar en segundo plano
docker-compose -f docker-compose.full.yml up -d

# Ver logs de un servicio específico
docker-compose -f docker-compose.full.yml logs frontend
docker-compose -f docker-compose.full.yml logs adapter
docker-compose -f docker-compose.full.yml logs mpi-master

# Parar todos los servicios
docker-compose -f docker-compose.full.yml down

# Parar y eliminar volúmenes
docker-compose -f docker-compose.full.yml down -v
```

## URLs de Acceso

Una vez iniciado el sistema:

- **Frontend**: http://localhost:3000
- **Adapter API**: http://localhost:3001
- **Cluster API**: http://localhost:8080
- **Health Check**: http://localhost:3001/health

## Flujo de Datos

1. **Usuario** → Frontend (http://localhost:3000)
2. **Frontend** → Adapter (http://adapter:3001/grade)
3. **Adapter** → Cluster (TCP a mpi-master:8080)
4. **Master** → Workers (MPI distribuido)
5. **Workers** → Master → Adapter → Frontend → Usuario

## Variables de Entorno

### Frontend
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `ADAPTER_URL=http://adapter:3001`

### Adapter
- `NODE_ENV=production`
- `DEBUG=1`
- `PORT=3001`

### Cluster
- `DEBUG=1`
- `MPI_PROCESSES=5`

## Troubleshooting

### Problemas Comunes

1. **Puerto ocupado**:
   ```bash
   # Cambiar puertos en docker-compose.full.yml
   ports:
     - "3001:3001"  # host:container
   ```

2. **Memoria insuficiente**:
   ```bash
   # Añadir límites de memoria en docker-compose.full.yml
   deploy:
     resources:
       limits:
         memory: 512M
   ```

3. **Logs de depuración**:
   ```bash
   # Ver logs en tiempo real
   docker-compose -f docker-compose.full.yml logs -f
   ```

## Desarrollo vs Producción

### Para Desarrollo
- Usar volúmenes para hot-reload
- Habilitar DEBUG=1
- Mantener logs detallados

### Para Producción
- Remover volúmenes de código fuente
- Usar imágenes optimizadas
- Configurar restart policies
- Añadir health checks

## Archivos de Configuración

- `docker-compose.full.yml`: Sistema completo
- `cluster/docker-compose.yaml`: Solo cluster (actualizado)
- `cluster/hostfile`: Configuración MPI (actualizado)
- `frontend/Dockerfile`: Imagen Next.js
- `adapter/Dockerfile`: Imagen Node.js
- `cluster/Dockerfile`: Imagen MPI (existente)