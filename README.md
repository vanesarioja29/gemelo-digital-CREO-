# GD-CREO+ (Gemelo Digital de Flujo Hospitalario)

Este proyecto contiene la base del Gemelo Digital de Flujo Hospitalario de la Clínica Renal y Oncológica CREO+ (UPCH). Consiste en un ecosistema simulado de sensores IoT (Nodos ESP32 + Tarjetas BLE) para calcular aforo y tiempos de atención de pacientes ambulatorios.

## Estructura del Proyecto

- `infra/`: Configuraciones de Docker Compose para la infraestructura local (SQL Server y Eclipse Mosquitto).
- `backend/GdCreoPlus.Api`: API REST en .NET 8 (ASP.NET Core) con Entity Framework Core. Se suscribe a los tópicos MQTT para recibir datos telemétricos.
- `simulator/GdCreoPlus.NodeSimulator`: Aplicación de consola en .NET 8 que simula múltiples nodos ESP32 publicando mensajes de presencia de tarjetas por MQTT.
- `frontend/`: Aplicación web en React, Vite y TypeScript con Tailwind CSS, mostrando el dashboard de ocupación y tiempos.
- `docs/`: Carpeta destinada para documentación (Acta, Gestión de Alcance, Cronograma, etc.).

## Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para SQL Server y Mosquitto).
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).
- [Node.js](https://nodejs.org/) (versión 18+).

---

## Cómo Levantar el Entorno Local

Sigue estos pasos en orden, abriendo una nueva ventana/pestaña de terminal para cada servicio persistente.

### 1. Levantar la Infraestructura Base (Base de datos y Broker MQTT)

Abre una terminal en la raíz del proyecto y ejecuta:

```bash
cd infra
docker-compose up -d
```

Esto iniciará **SQL Server** en el puerto `1433` y **Mosquitto** (sin autenticación requerida en la red local) en los puertos `1883` y `9001`.

### 2. Ejecutar el Backend (API & Subscriptor MQTT)

La base de datos se crea automáticamente (`EnsureCreated`) con datos semilla al iniciar el backend.

En una nueva terminal:

```bash
cd backend/GdCreoPlus.Api
dotnet run
```

La API estará disponible (usualmente en `http://localhost:5000` o `http://localhost:5011` dependiendo de tu `launchSettings.json`).

> **Nota para EF Core:** Cuando necesites crear migraciones reales, instala las herramientas (`dotnet tool install --global dotnet-ef`) y ejecuta: `dotnet ef migrations add InitialCreate`. Para este prototipo local, el código actualmente usa `EnsureCreated` en `Program.cs` para tu comodidad.

### 3. Ejecutar el Simulador de Nodos IoT

El simulador generará pacientes (tarjetas UUID) aleatorios publicando su ubicación en el broker MQTT, imitando el funcionamiento de los ESP32 físicos reales.

En una nueva terminal:

```bash
cd simulator/GdCreoPlus.NodeSimulator
dotnet run
```

Verás en la consola los mensajes de "Nueva Tarjeta" y "Publicado...". El backend capturará estos mensajes.

### 4. Ejecutar el Frontend Web

Para ver el Dashboard de control:

En una nueva terminal:

```bash
cd frontend
npm install
npm run dev
```

Esto iniciará el servidor de desarrollo de Vite. Abre la URL que aparece en la consola (normalmente `http://localhost:5173`) en tu navegador web. Si el backend aún no está conectado en el puerto correcto, el frontend mostrará datos falsos (mock) temporalmente para que puedas ver el diseño.

---

## Consideraciones Actuales (Fuera de Alcance)

- **Autenticación/Autorización:** No hay sistema de login implementado en esta fase inicial.
- **Multisede real:** El modelo de base de datos admite múltiples Sedes y Pisos, pero se usa semilla para una sola sede ("CREO+ San Isidro", "Piso 1") temporalmente.
