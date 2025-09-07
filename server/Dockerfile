# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY server/*.csproj ./
RUN dotnet restore
COPY server/. ./
RUN dotnet publish -c Release -o /app/publish

FROM debian:bookworm-slim
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates ghostscript mupdf-tools && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish ./
EXPOSE 8080
ENTRYPOINT ["dotnet", "Server.dll"]

