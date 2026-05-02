# Power Platform CLI

- [Install](https://learn.microsoft.com/en-us/power-platform/developer/howto/install-cli-msi)
- [More about this](https://learn.microsoft.com/en-us/power-platform/developer/cli/introduction?tabs=windows)

```sh
# List down the versions and which onee are you using
pac use

# Switch to version
pac use <version-number>

# Authenticate to Dataverse
pac auth create --url https://yourenv.crm.dynamics.com --name myDataverse

pac auth create --url https://orgce0815ba.crm8.dynamics.com --name myDataverse

pac auth create --environment "PowerPage-01"
pac auth list


## Export the Table Schema
pac solution export --name YourSolutionName --path ./ExportedSolution --managed false


# Get website id
pac paportal list


## Download the code
pac pages download --path "Path" --websiteId  <website-id>
pac pages download --path "E:\Azure\Power Platform\LOCALDEV" --websiteId  a07b4b99-39a1-4f59-9883-13d247186ff4 -mv Enhanced

# Generate deployment profile
pac paportal download --path "E:\Azure\Power Platform\DeploymentProfile" --webSiteId f81d454b-276d-4b14-a3eb-5904cae0f75a --modelVersion Enhanced --environment "https://org5fed0db9.crm8.dynamics.com/"


pac paportal deployprofile create --path "E:\Azure\Power Platform\DeploymentProfile2" 81d454b-276d-4b14-a3eb-5904cae0f75a --modelVersion Enhanced --environment "https://org5fed0db9.crm8.dynamics.com/"
```

## BBuild deploy using Azure Devops

- [Create connection](https://learn.microsoft.com/en-us/power-platform/alm/devops-build-tools)

```sh
pac admin create-service-principal  --environment <environment id>
fd6963d6-a450-ed45-ba6d-1b8fedaea5dd

# When successful, four columns are displayed:
echo '1. Power Platform TenantId
2. Application ID
3. Client Secret (in clear text)
4. Expiration'

```
