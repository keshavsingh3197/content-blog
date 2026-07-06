# .NET CLI

The `dotnet` CLI is the cross-platform command-line tool for creating, building, running, testing and publishing .NET apps. All commands below target **.NET 10 SDK** or later.

## Check your install

```sh
dotnet --version        # SDK version
dotnet --info           # SDKs, runtimes and environment
dotnet --list-sdks
dotnet --list-runtimes
```

## Create projects and solutions

```sh
# Create a solution in the current folder
dotnet new sln

# Create projects from templates
dotnet new console -n MyApp
dotnet new webapi  -n MyApi        # Minimal API by default
dotnet new mvc     -n MyWeb
dotnet new blazor  -n MyBlazor
dotnet new classlib -n MyLib
dotnet new xunit   -n MyLib.Tests

# List all available templates
dotnet new list

# Add projects to the solution and reference between them
dotnet sln add MyApp/MyApp.csproj
dotnet add MyApp/MyApp.csproj reference MyLib/MyLib.csproj
```

## Build, run and test

```sh
dotnet restore              # restore NuGet packages (usually implicit)
dotnet build                # build (Debug by default)
dotnet build -c Release
dotnet run                  # build + run the project
dotnet run --project MyApp
dotnet watch run            # hot reload on file changes
dotnet test                 # run tests (supports Microsoft.Testing.Platform in .NET 10)
```

## File-based apps (new in .NET 10)

Run a single C# file directly — no project file required. Great for scripts and quick experiments.

```sh
dotnet run app.cs
```

You can add packages and SDK references inline with directives, then later convert to a full project:

```sh
dotnet project convert app.cs
```

## Packages

```sh
dotnet add package Newtonsoft.Json
dotnet add package Serilog --version 4.2.0
dotnet remove package Serilog
dotnet list package                 # installed packages
dotnet list package --outdated      # available updates
dotnet list package --vulnerable    # known vulnerabilities
```

## Publish

```sh
# Framework-dependent build
dotnet publish -c Release

# Self-contained, single file for a specific platform
dotnet publish -c Release -r linux-x64 --self-contained \
  -p:PublishSingleFile=true

# Native AOT (fast startup, small footprint, no JIT)
dotnet publish -c Release -r linux-x64 -p:PublishAot=true

# Build an OCI container image (console apps can do this natively in .NET 10)
dotnet publish -c Release -t:PublishContainer
```

## Tools

```sh
dotnet tool install -g dotnet-ef          # global tool
dotnet tool install dotnet-ef             # local tool (uses a tool manifest)
dotnet tool restore
dotnet tool exec <package>                # run a tool once without installing (.NET 10)
dnx <tool>                                # shorthand tool runner script (.NET 10)
```

## Entity Framework Core

```sh
dotnet ef migrations add InitialCreate
dotnet ef database update
dotnet ef migrations remove
dotnet ef dbcontext scaffold "<connection-string>" Microsoft.EntityFrameworkCore.SqlServer
```
