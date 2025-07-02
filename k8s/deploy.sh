#!/bin/bash

# ScoreHive GKE Deployment Script
set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-gcp-project-id"}
CLUSTER_NAME="scorehive-gke"
ZONE="us-central1-a"
REGION="us-central1"

echo "🚀 Deploying ScoreHive to GKE"
echo "Project: $PROJECT_ID"
echo "Cluster: $CLUSTER_NAME"
echo "Zone: $ZONE"

# Check if gcloud is configured
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Please authenticate with gcloud first: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📋 Enabling required GCP APIs..."
gcloud services enable container.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Create GKE cluster
echo "🏗️  Creating GKE cluster..."
gcloud container clusters create $CLUSTER_NAME \
    --zone=$ZONE \
    --num-nodes=3 \
    --machine-type=e2-standard-4 \
    --disk-size=50GB \
    --enable-network-policy \
    --enable-ip-alias \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=5 \
    --enable-autorepair \
    --enable-autoupgrade

# Get cluster credentials
echo "🔑 Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Build and push Docker image
echo "🐳 Building and pushing Docker image..."
cd ../cluster
gcloud builds submit --tag gcr.io/$PROJECT_ID/scorehive-mpi:latest .
cd ../k8s

# Install MPI Operator
echo "⚙️  Installing MPI Operator..."
kubectl apply -f mpi-operator.yaml

# Wait for MPI Operator to be ready
echo "⏳ Waiting for MPI Operator to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/mpi-operator -n mpi-operator

# Generate SSH keys for MPI
echo "🔐 Generating SSH keys for MPI..."
ssh-keygen -t rsa -b 4096 -f ./mpi_key -N "" -q
cat mpi_key.pub >> authorized_keys

# Update secrets with generated keys
SSH_PRIVATE_KEY=$(cat mpi_key | base64 -w 0)
SSH_PUBLIC_KEY=$(cat mpi_key.pub | base64 -w 0)
SSH_AUTHORIZED_KEYS=$(cat authorized_keys | base64 -w 0)
SSH_CONFIG=$(echo -e "Host *\n    StrictHostKeyChecking no\n    UserKnownHostsFile /dev/null\n    LogLevel ERROR" | base64 -w 0)

# Create secrets YAML with actual keys
cat > secrets-generated.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: mpi-ssh-key
  namespace: scorehive
type: Opaque
data:
  id_rsa: $SSH_PRIVATE_KEY
  id_rsa.pub: $SSH_PUBLIC_KEY
  authorized_keys: $SSH_AUTHORIZED_KEYS
  config: $SSH_CONFIG
EOF

# Update MPIJob YAML with correct project ID
sed "s/PROJECT_ID/$PROJECT_ID/g" mpijob.yaml > mpijob-generated.yaml

# Deploy namespace and secrets
echo "📦 Creating namespace and secrets..."
kubectl apply -f namespace.yaml
kubectl apply -f secrets-generated.yaml

# Deploy ScoreHive cluster
echo "🎯 Deploying ScoreHive MPI cluster..."
kubectl apply -f mpijob-generated.yaml
kubectl apply -f service.yaml

# Wait for deployment
echo "⏳ Waiting for ScoreHive cluster to be ready..."
kubectl wait --for=condition=Ready --timeout=600s pods -l mpi-job-name=scorehive-cluster -n scorehive

# Get service endpoint
echo "🌐 Getting service endpoint..."
kubectl get service scorehive-service -n scorehive

echo "✅ Deployment complete!"
echo ""
echo "📋 Useful commands:"
echo "  View pods: kubectl get pods -n scorehive"
echo "  View logs: kubectl logs -l mpi-job-name=scorehive-cluster -n scorehive"
echo "  Get service IP: kubectl get service scorehive-service -n scorehive"
echo "  Port forward: kubectl port-forward service/scorehive-internal 8080:8080 -n scorehive"

# Cleanup generated files
rm -f mpi_key mpi_key.pub authorized_keys secrets-generated.yaml mpijob-generated.yaml

echo ""
echo "🧹 Cleanup complete. Generated files removed."