# Build context is the repo's server/ directory (Render "Root Directory" = server).
# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first (layer-cached) using just the project file.
COPY Blog.Admin.Api/Blog.Admin.Api.csproj Blog.Admin.Api/
RUN dotnet restore Blog.Admin.Api/Blog.Admin.Api.csproj

# Then copy the rest and publish.
COPY Blog.Admin.Api/ Blog.Admin.Api/
RUN dotnet publish Blog.Admin.Api/Blog.Admin.Api.csproj -c Release -o /app /p:UseAppHost=false

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

# Media dir must be writable by the non-root app user.
RUN mkdir -p /app/App_Data && chown -R $APP_UID /app/App_Data

# Render terminates TLS and injects $PORT (default 10000); the app binds to it.
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 10000

# Run as the image's non-root user for a smaller attack surface.
USER $APP_UID

ENTRYPOINT ["dotnet", "Blog.Admin.Api.dll"]
