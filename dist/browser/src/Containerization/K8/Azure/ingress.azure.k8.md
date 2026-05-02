# Ingress

## Create a static public IP for ingress controller

```sh
# Get the resource group name of the AKS cluster 
az aks show --resource-group omkr-demo-23-03-2024 --name aks-demo-23-03-2024-cluster --query nodeResourceGroup -o tsv

# TEMPLATE - Create a public IP address with the static allocation
az network public-ip create --resource-group <REPLACE-OUTPUT-RG-FROM-PREVIOUS-COMMAND> --name myAKSPublicIPForIngress --sku Standard --allocation-method static --query publicIp.ipAddress -o tsv

# REPLACE - Create Public IP: Replace Resource Group value
az network public-ip create --resource-group MC_omkr-demo-23-03-2024_aks-demo-23-03-2024-cluster_eastus --name myAKSPublicIPForIngress --sku Standard --allocation-method static --query publicIp.ipAddress -o tsv
```

---

> [168.62.182.241](http://168.62.182.241/)

## Install the ingress controller

```sh
# Install the helm

# Add the official stable repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

#  Customizing the Chart Before Installing. 
helm show values ingress-nginx/ingress-nginx

# Create a namespace for your ingress resources
kubectl create namespace ingress-basic

helm install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-basic \
    --set controller.replicaCount=2 \
    --set controller.nodeSelector."kubernetes\.io/os"=linux \
    --set defaultBackend.nodeSelector."kubernetes\.io/os"=linux \
    --set controller.service.externalTrafficPolicy=Local \
    --set controller.service.loadBalancerIP="168.62.182.241"

# Access Public IP
http://<Public-IP-created-for-Ingress>

# Output should be
404 Not Found from Nginx

# Verify Load Balancer on Azure Mgmt Console
Primarily refer Settings -> Frontend IP Configuration 
```

## Ingress with LetsEncrypt

> [https://github.com/stacksimplify/azure-aks-kubernetes-masterclass/blob/master/14-Ingress-SSL-with-LetsEncrypt/README.md](https://github.com/stacksimplify/azure-aks-kubernetes-masterclass/blob/master/14-Ingress-SSL-with-LetsEncrypt/README.mdV)