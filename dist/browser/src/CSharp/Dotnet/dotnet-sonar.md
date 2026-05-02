# Sonar

## Prerequisites

- Docker
- Java 22
- Dotnet sonar scanner
- SonarLint

## Set Up

### Run the docker image for sonar server

```sh
docker pull sonarqube:latest
docker run -d --name sonarqube -p 9000:9000 sonarqube:latest
```

> Create a profile or update the existing profile to activate all rules of c#

### Install dotnet sonar scanner

```sh
dotnet tool install --global dotnet-sonarscanner
```

## Build and push the project details to sonar

### Without coverage

```sh
dotnet sonarscanner begin 
   /k:"<PROJECT_NAME>" 
   /d:sonar.host.url="http://localhost:9000" 
   /d:sonar.login="<SONAR_TOKEN>"

dotnet build

dotnet sonarscanner end /d:sonar.login="<SONAR_TOKEN>"
```

### With coverage

```sh
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura

dotnet sonarscanner begin 
   /k:"<PROJECT_NAME>" 
   /d:sonar.host.url="http://localhost:9000" 
   /d:sonar.login="<SONAR_TOKEN>"
   /d:sonar.cs.cobertura.reportPaths="<path_to_coverage_report>"

dotnet msbuild

dotnet sonarscanner end /d:sonar.login="<SONAR_TOKEN>"
```

## BUILD

```sh
dotnet build

dotnet msbuild

"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" C:\Source\SonarReport\calculation-service\

"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
```
