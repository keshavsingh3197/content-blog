# CLUSTER

```sh
# Create Cluster
az aks create -n aks-demo-22-03-2024-cluster -g omkr-demo-22-03-2024 --generate-ssh-keys --attach-acr omkrdemoregistry22032024.azurecr.io

# update cluster
az aks update -n aks-demo-22-03-2024-cluster -g omkr-demo-22-03-2024 --attach-acr omkrdemoregistry22032024
```
