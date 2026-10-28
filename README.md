# Fauna en Ruta

Aplicación para consultar y reportar avistamientos de fauna silvestre en las rutas de Uruguay.

## Funcionalidades

- Registro, inicio y cierre de sesión.
- Panel con avistamientos activos, filtro por ruta y especie, y detalle de cada reporte.
- Registro manual con especie, ruta y kilómetro opcionales, coordenadas GeoJSON y opción de anonimato.
- Catálogo de especies y rutas cargado desde MongoDB.
- Mapa esquemático para visualizar las ubicaciones aproximadas de los reportes.

La detección automática, la planificación de trayectos y las alertas durante la navegación no están conectadas a servicios en esta versión.

## Requisitos

- Node.js compatible con Next.js 16.
- MongoDB accesible desde la aplicación.
- npm o pnpm.

## Configuración local

Crea `.env.local` en la raíz del proyecto:

```env
MONGODB_URI=mongodb://...
JWT_SECRET=un-secreto-aleatorio-de-al-menos-32-bytes
```

En producción, configura además `TRUSTED_CLIENT_IP_HEADER` con el nombre del encabezado de IP que tu proxy confiable sobrescribe. No uses un encabezado que pueda ser elegido por el cliente.

Instala dependencias e inicia Next.js:

```bash
npm install
npm run dev
```

También se puede usar pnpm:

```bash
pnpm install
pnpm dev
```

La página de inicio está disponible en `http://localhost:3000`.

## Datos de demostración

El seed carga especies, rutas, un usuario demo y avistamientos:

```bash
npm run seed
```

Opcionalmente, define `SEED_USER_PASSWORD` para establecer la contraseña del usuario demo. El seed no se ejecuta con `NODE_ENV=production`.

## Validación

```bash
npm run lint
npm test
npm run build
```

Las pruebas end-to-end requieren `MONGODB_URI` y `JWT_SECRET` en `.env.test`:

```bash
npm run test:e2e
```
