# Doble PP Company Admin

Aplicación administrativa privada para la operación interna de Doble PP Company.

## Estado actual

Esta versión quedó simplificada para publicación y uso interno entre dos personas autorizadas.

- estructura base con React + Vite + TypeScript
- layout administrativo responsive
- navegación desktop/mobile
- pantalla de acceso visual
- vistas base para dashboard, empleados, productos, inventario, ventas, finanzas, pagos, reportes, usuarios y configuración
- acceso local simple sin depender de una capa de seguridad compleja

> La autenticación funciona con credenciales internas y modo fallback para despliegue rápido en Netlify.

## Stack actual

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- TanStack Query
- Lucide React
- Acceso local con credenciales internas

## Variables de entorno

Usa [\.env.local](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/.env.local>) para tus valores reales y [\.env.example](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/.env.example>) como plantilla.

```bash
VITE_APP_ADMIN_EMAIL=admin@doblepp.com
VITE_APP_ADMIN_PASSWORD=DoblePP2025!
```

## Cómo probar acceso interno

1. Ejecuta [start-dev.cmd](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/start-dev.cmd>).
2. Entra a [http://localhost:4173/login](http://localhost:4173/login).
3. Usa estas credenciales por defecto:
   - correo: `admin@doblepp.com`
   - contraseña: `DoblePP2025!`

La aplicación:

- mantiene la sesión activa en el navegador
- protege las rutas privadas
- redirige automáticamente al dashboard
- permite cerrar sesión

Si quieres cambiar las credenciales, ajusta estas variables de entorno:

```bash
VITE_APP_ADMIN_EMAIL=admin@doblepp.com
VITE_APP_ADMIN_PASSWORD=DoblePP2025!
```

## Despliegue en Netlify

1. Sube este repositorio a GitHub.
2. Crea un sitio nuevo en Netlify desde el repo.
3. Usa estas opciones:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Agrega estas variables de entorno en Netlify:
   - `VITE_APP_ADMIN_EMAIL=admin@doblepp.com`
   - `VITE_APP_ADMIN_PASSWORD=DoblePP2025!`
5. Despliega.

El archivo [netlify.toml](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/netlify.toml>) ya incluye el redirect SPA para que React Router funcione al recargar rutas internas.

## Formas simples de probarlo en Windows

### Opción 1: doble clic

Usa estos archivos desde la raíz del proyecto:

- [start-dev.cmd](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/start-dev.cmd>) para modo desarrollo
- [start-preview.cmd](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/start-preview.cmd>) para vista tipo producción

Ambos:

- entran automáticamente a la carpeta correcta
- usan `npm.cmd` para evitar el error de PowerShell con `npm.ps1`
- levantan la app en `http://localhost:4173/login`

### Opción 2: desde terminal CMD

Si quieres usar terminal manualmente, usa **Command Prompt / CMD**, no PowerShell, y ejecuta:

```bat
npm.cmd install
npm.cmd run dev:host
```

O bien:

```bat
.\start-dev.cmd
```

## Comandos

```bash
npm install
npm run dev
npm run build
```

## Estructura principal

```text
src/
  app/
    providers/
    router/
  components/
    layout/
    ui/
  lib/
    utils/
  pages/
```

## Siguientes fases

- Fase 4: dashboard conectado a datos
- Fase 5+: módulos operativos con base de datos, permisos y auditoría
