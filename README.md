# AYS MFA Account Management

Este es el micro-frontend (MFE) de gestión de cuentas bancarias para el ecosistema AYS. Permite la visualización, creación, edición y filtrado avanzado de cuentas, integrando un sistema de roles y seguridad bancaria.

## 🚀 Despliegue en DigitalOcean

El proyecto se encuentra desplegado y operativo en la siguiente URL:
- **URL Principal (Login/Shell):** [https://ays-shl-account-manage-35jnj.ondigitalocean.app/login](https://ays-shl-account-manage-35jnj.ondigitalocean.app/login)

## 🏗️ Arquitectura

El proyecto sigue una arquitectura de **Micro-frontends**, donde este repositorio contiene la lógica específica de cuentas.

### Componentes Clave:
- **Angular 21**: Uso intensivo de **Signals** para una reactividad fina y eficiente.
- **MFE Bridge**: Comunicación bidireccional entre la Shell y el MFE mediante `postMessage` y un servicio de puente dedicado (`MfeBridgeService`).
- **RBAC (Role-Based Access Control)**: Gestión de permisos basada en roles (`ADMIN` y `USER`).
- **SCSS Modular**: Estilos premium con soporte para temas oscuros y diseños responsivos.

### Estructura del Proyecto:
- `src/app/accounts`: Módulo principal de cuentas.
  - `/pages`: Vistas de listado, detalle y formulario.
  - `/services`: Lógica de comunicación con APIs de cuentas, clientes y movimientos.
  - `/interfaces`: Definiciones de modelos de datos.
- `src/app/core`: Servicios compartidos, incluyendo el puente MFE.

## 🛠️ Requisitos Previos

- **Node.js**: v20+ (recomendado v22+)
- **npm**: v11+
- **Docker**: Para ejecución y despliegue en contenedores.

## 💻 Ejecución Local

### 1. Clonar e Instalar dependencias
```bash
npm install
```

### 2. Servir la aplicación
```bash
npm run start
```
La aplicación estará disponible en `http://localhost:4201` (o el puerto configurado). *Nota: Al ser un MFE, requiere que la Shell esté activa para la funcionalidad completa de sesión.*

### 3. Pruebas Unitarias
```bash
npm run test
```
El proyecto utiliza **Vitest** para una ejecución de pruebas ultrarrápida.

## 🐳 Docker y Contenedores

El proyecto está preparado para ejecutarse en entornos productivos mediante Docker.

### Construir Imagen
```bash
docker build -f deploy/Dockerfile -t ays-mfa-account:latest .
```

### Ejecutar con Docker Compose
```bash
docker compose up --build
```

## 📝 Consideraciones Importantes

1.  **Seguridad de Datos**: Los saldos se ocultan/muestran mediante una funcionalidad de privacidad (icono de ojo) que aplica máscaras visuales.
2.  **Validación de Negocio**: No se permite actualizar el saldo inicial de cuentas que ya registran movimientos bancarios.
3.  **Filtrado Admin**: Los usuarios con rol `ADMIN` tienen acceso a filtros avanzados por titular y estado de cuenta, además de poder ver todas las cuentas del sistema.
4.  **Integración de APIs**:
    - **Accounts API**: `https://ays-msa-dm-cuaa-cr-account-stagi-zdpms.ondigitalocean.app/account`
    - **Customers API**: `https://ays-msa-dm-cuaa-cr-account-stagi-zdpms.ondigitalocean.app/customers`
    - **Movements API**: `https://ays-msa-dm-cuaa-cr-account-stagi-zdpms.ondigitalocean.app/movements`

---
© 2026 AYS - Soluciones Financieras
