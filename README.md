# Doble PP Company Admin

Aplicación administrativa privada para la operación interna de Doble PP Company.

## Estado actual

Esta versión quedó simplificada para publicación inmediata y uso interno privado.

- estructura base con React + Vite + TypeScript
- layout administrativo responsive
- navegación desktop/mobile
- pantalla de acceso visual
- vistas base para dashboard, empleados, productos, inventario, ventas, finanzas, pagos, reportes, usuarios y configuración
- acceso privado simple con variables de entorno

> La autenticación funciona con credenciales internas definidas en variables de entorno, sin depender de Supabase para publicar hoy.

## Stack actual

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Lucide React
- Acceso local con credenciales internas

## Variables de entorno

Usa [\.env.local](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/.env.local>) para tus valores reales y [\.env.example](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/.env.example>) como plantilla.

```bash
VITE_APP_ADMIN_EMAIL=admin@doblepp.com
VITE_APP_ADMIN_PASSWORD=DoblePP2025!
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

## Sincronización entre dispositivos (varios administradores)

Para que productos, empleados, ventas y accesos se vean en todos los dispositivos, la app debe usar un estado compartido en Supabase.

1. Crea esta tabla en Supabase SQL Editor:

```sql
create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null
);
```

2. Inserta una fila inicial:

```sql
insert into public.app_state (id, payload)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
```

3. Asegura permisos de lectura/escritura para el uso actual de frontend (si usas anon key en cliente, define políticas compatibles con tu seguridad interna).

Sin este paso, la app funciona por navegador (localStorage) y los cambios no se comparten entre dispositivos.

### Operaciones de venta e inventario sin sobreventa

Antes de desplegar el cliente actualizado, ejecuta el SQL de [20261009000000_atomic_inventory_operations.sql](./supabase/migrations/20261009000000_atomic_inventory_operations.sql) desde Supabase SQL Editor. La migración conserva los datos existentes y crea funciones transaccionales que serializan las ventas, surtidos, retiros y movimientos de bodega sobre el estado compartido. El servidor vuelve a validar el stock disponible y rechaza una operación que ya no tenga existencias.

Aplica la migración primero y confirma que termine correctamente; después publica el cliente. El cliente nuevo depende de estas funciones y mostrará un error explícito si todavía no existen. Mantén una copia de respaldo del estado `app_state` antes de ejecutarla.

Esta mejora protege los movimientos de inventario soportados por la aplicación contra carreras concurrentes. No convierte el inicio de sesión local en autenticación de servidor ni cambia las políticas de acceso anónimo ya configuradas en Supabase.

## Registrar ventas con descuentos manuales

En **Ventas**, cada renglón representa un producto, una cantidad y el precio unitario realmente cobrado. El precio se propone desde el catálogo (o la variedad elegida), pero el vendedor puede modificarlo para registrar un descuento.

Para vender cinco unidades del mismo producto, una a precio normal de `$300` y cuatro con descuento a `$250`, agrega dos renglones:

- 1 unidad con precio unitario `$300`
- 4 unidades con precio unitario `$250`

La página muestra el total de `$1,300` antes de guardar. Valida el stock total de cinco unidades, guarda los renglones bajo una sola operación, y usa los importes y precios cobrados para ventas, ganancia, inventario y corte. El único método de pago es efectivo.

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
4. En Netlify usa Node 22 y permite instalar devDependencies (el [netlify.toml](<C:/Users/maest/OneDrive/Escritorio/Doble PP Admin/netlify.toml>) ya lo fuerza).
5. Configura las variables de entorno en Netlify:
   - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` para leer las cuentas compartidas y los datos de la compañía.
   - `VITE_APP_ADMIN_EMAIL` y `VITE_APP_ADMIN_PASSWORD` para habilitar el acceso del administrador principal.
   - `VITE_APP_ADMIN_NAME` (opcional) para definir el nombre mostrado para ese administrador.
6. Guarda los cambios y vuelve a desplegar. Vite incorpora estas variables durante la compilación, así que no basta con guardarlas después de un deploy existente.

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
