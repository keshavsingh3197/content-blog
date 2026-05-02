# Azure AKS

## Introduction

## Cluster

### Connect with AKS cluster on local

```sh
# 1.  login
az login  ## will display the user details on successful login

# 2. Add cluster to your local machine config
## i. Template
az aks get-credentials --resource-group <Resource-Group-Name> --name <Cluster-Name>

## ii. Replace Resource Group & Cluster Name
az aks get-credentials --resource-group DEMO_RSYSTEM_TESTING --name aks-demo-01

# 3. Fetch the details of cluster
## i. Check the current cluster / which is your default cluster, for that visit k8.md
## ii. List Kubernetes Worker Nodes
kubectl get nodes 
kubectl get nodes -o wide

# 4. Explore that
## i. List Namespaces
kubectl get namespaces
kubectl get ns

## ii. List Pods from all namespaces
kubectl get pods --all-namespaces

## iii. List all k8s objects from Cluster Control plane
kubectl get all --all-namespaces
```
