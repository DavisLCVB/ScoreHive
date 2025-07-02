# ScoreHive Kubernetes Deployment

Este directorio contiene los manifiestos de Kubernetes para desplegar ScoreHive en Google Kubernetes Engine (GKE) usando MPI Operator.

## Arquitectura

- **MPI Operator**: Gestiona trabajos MPI en Kubernetes
- **MPIJob**: Define un trabajo MPI con 1 master + 2 workers (5 procesos MPI total)
- **LoadBalancer**: Expone el servicio HTTP del master en puerto 80
- **SSH Keys**: Comunicación segura entre nodos MPI

## Pre-requisitos

1. **Google Cloud SDK**: `gcloud` instalado y autenticado
2. **kubectl**: Cliente de Kubernetes configurado  
3. **Docker**: Para construcción de imágenes (opcional, el script usa Cloud Build)
4. **Proyecto GCP**: Con APIs de Container y Cloud Build habilitadas

## Despliegue Rápido

```bash
# 1. Configurar proyecto GCP
export PROJECT_ID="tu-proyecto-gcp"

# 2. Ejecutar script de despliegue
cd k8s
./deploy.sh
```

## Despliegue Manual

### 1. Crear cluster GKE

```bash
gcloud container clusters create scorehive-gke \
    --zone=us-central1-a \
    --num-nodes=3 \
    --machine-type=e2-standard-4 \
    --enable-network-policy
```

### 2. Instalar MPI Operator

```bash
kubectl apply -f mpi-operator.yaml
```

### 3. Generar claves SSH

```bash
ssh-keygen -t rsa -b 4096 -f mpi_key -N ""
# Actualizar secrets.yaml con las claves generadas
```

### 4. Desplegar aplicación

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f mpijob.yaml
kubectl apply -f service.yaml
```

## Archivos

- `namespace.yaml`: Namespace `scorehive` 
- `mpi-operator.yaml`: Instalación del MPI Operator de Kubeflow
- `mpijob.yaml`: Definición del trabajo MPI (1 launcher + 1 master + 2 workers)
- `service.yaml`: LoadBalancer para exponer el master HTTP (puerto 80)
- `secrets.yaml`: Template para claves SSH de MPI
- `gke-cluster.yaml`: Configuración declarativa del cluster (Config Connector)
- `deploy.sh`: Script automatizado de despliegue

## Configuración

### Recursos por Pod

- **Master**: 1 CPU, 1Gi RAM
- **Workers**: 2 CPU, 2Gi RAM cada uno
- **Launcher**: 0.5 CPU, 512Mi RAM

### Configuración MPI

- **Procesos totales**: 5 (1 master + 4 workers con 2 slots cada uno)
- **Comunicación**: SSH sin contraseña entre nodos
- **Runtime**: OpenMPI con soporte para contenedores

## Monitoreo

```bash
# Ver estado de pods
kubectl get pods -n scorehive

# Ver logs del master
kubectl logs -l mpi-job-name=scorehive-cluster,mpi-job-role=master -n scorehive

# Ver logs de workers  
kubectl logs -l mpi-job-name=scorehive-cluster,mpi-job-role=worker -n scorehive

# Port forward para pruebas locales
kubectl port-forward service/scorehive-internal 8080:8080 -n scorehive
```

## Acceso al Servicio

```bash
# Obtener IP externa del LoadBalancer
kubectl get service scorehive-service -n scorehive

# El servicio estará disponible en http://EXTERNAL-IP/
```

## Escalado

Para cambiar el número de workers:

```bash
# Editar mpijob.yaml
spec:
  mpiReplicaSpecs:
    Worker:
      replicas: 4  # Cambiar número de workers

# Reaplicar
kubectl apply -f mpijob.yaml
```

## Limpieza

```bash
# Eliminar aplicación
kubectl delete namespace scorehive

# Eliminar MPI Operator
kubectl delete namespace mpi-operator

# Eliminar cluster GKE
gcloud container clusters delete scorehive-gke --zone=us-central1-a
```

## Troubleshooting

### Pods en estado Pending
- Verificar recursos disponibles en el cluster
- Revisar taints y node selectors

### Errores de SSH en MPI
- Verificar que el secret `mpi-ssh-key` existe
- Comprobar permisos de archivos SSH (600)

### Timeout en comunicación MPI
- Revisar conectividad de red entre pods
- Verificar configuración de NetworkPolicy

### Problemas de imagen Docker
- Confirmar que la imagen existe en Container Registry
- Verificar permisos de pull de imagen