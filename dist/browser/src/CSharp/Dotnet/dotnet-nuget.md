# Nuget

## Issue

- dotnet command not working while installing using this dotnet cli.

## Solution

- This issue ocurred mainly due to private nuget package.

> Two solution for this

1. Add the nuget file at the project level
2. Add the PAT at the source level.

## 1. Add auth token globally for nuget.config error issue in dotnet command

```xml
 <!-- locate the file `%appdata%\NuGet\NuGet.config` and add the blow change -->
  <packageSourceCredentials>
    <OMKR.Packages.V1>
      <add key="Username" value="any_non_empty_username" />
      <add key="ClearTextPassword" value="your_personal_access_token" />
    </OMKR.Packages.V1>
  </packageSourceCredentials>

```

- file look like below

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="keshavsingh4522 github" value="https://nuget.pkg.github.com/keshavsingh4522/index.json" />
    <add key="OMK.Packages.V1" value="https://pkgs.dev.azure.com/keshavsingh4522/_packaging/OMK.Packages.V1/nuget/v3/index.json" />
    <add key="Microsoft Visual Studio Offline Packages" value="C:\Program Files (x86)\Microsoft SDKs\NuGetPackages\" />
    <add key="OMKR.Packages.V1" value="https://pkgs.dev.azure.com/pvtomkrltd-backend/_packaging/OMKR.Packages.V1/nuget/v3/index.json" />
  </packageSources>
  <disabledPackageSources>
    <add key="keshavsingh4522 github" value="true" />
    <add key="OMK.Packages.V1" value="true" />
  </disabledPackageSources>
  <packageRestore>
    <add key="enabled" value="True" />
    <add key="automatic" value="True" />
  </packageRestore>
  <bindingRedirects>
    <add key="skip" value="False" />
  </bindingRedirects>
  <packageManagement>
    <add key="format" value="0" />
    <add key="disabled" value="False" />
  </packageManagement>
  <packageSourceCredentials>
    <OMKR.Packages.V1>
      <add key="Username" value="any_username" />
      <add key="ClearTextPassword" value="PAT(personal access token)" />
    </OMKR.Packages.V1>
    <OMK.Packages.V1>
        <add key="Username" value="keshavsingh4522" />
        <add key="ClearTextPassword" value="PAT(personal access token)" />
    </OMK.Packages.V1>
  </packageSourceCredentials>
</configuration>
```

## 2. Add nuget file at the project level to overcome the issue

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
 <packageSources>
  <clear />
  <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
  <add key="OMK.Packages.V1" value="https://pkgs.dev.azure.com/keshavsingh4522/_packaging/OMK.Packages.V1/nuget/v3/index.json" />
 </packageSources>
 <packageSourceCredentials>
  <OMK.Packages.V1>
   <add key="Username" value="keshavsingh4522" />
   <add key="ClearTextPassword" value="PAT_TOKEN" />
  </OMK.Packages.V1>
 </packageSourceCredentials>
</configuration>
```
