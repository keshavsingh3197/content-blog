# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Blog.Admin.Api.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

# Render terminates TLS and injects $PORT (default 10000); the app binds to it.
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_gcServer=0
EXPOSE 10000

# Non-root for a smaller attack surface.
USER $APP_UID

ENTRYPOINT ["dotnet", "Blog.Admin.Api.dll"]
