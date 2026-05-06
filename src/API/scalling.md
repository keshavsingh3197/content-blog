# Scalling

## 1. Vertical Scaling (Scale Up / Down)
- 👉 Increase power of a single machine

```
Add more:
CPU
RAM
Example:
Upgrade VM from B2s → D4s
Increase App Service plan size

✔ Easy to implement
❌ Limited (hardware cap)
❌ Downtime possible

Use when:

Small apps
Quick performance fix
```

## 2. Horizontal Scaling (Scale Out / In)
- 👉 Add/remove multiple instances
- Run multiple copies of your .NET app
- Azure distributes traffic using Load Balancer

> Example:

- 1 instance → 5 instances during high traffic

- ✔ Highly scalable
- ✔ No downtime
- ✔ Best for production systems

> Azure services:

- Azure App Service (auto-scale)
- Azure VM Scale Sets
- Azure Kubernetes Service (AKS)

## 3. Diagonal Scaling
- 👉 Combination of both

- First scale up (better machine)
- Then scale out (more instances)

- ✔ Flexible
- ✔ Balanced performance