# Fauna en Ruta

Aplicación para consultar y reportar avistamientos de fauna silvestre en las rutas de Uruguay.

## Funcionalidades

- Registro, inicio y cierre de sesión.
- Panel con avistamientos activos, filtro por ruta y especie, y detalle de cada reporte.
- Registro manual con especie y opción excluyente entre GPS actual o ruta/km, más opción de anonimato.
- Búsqueda de taxones en iNaturalist; los taxones usados en reportes se guardan en MongoDB junto con sus metadatos y foto de referencia.
- Catálogo de especies y rutas cargado desde MongoDB.
- Mapa para visualizar la ubicación de los reportes.
- Inicio de trayecto con GPS y alertas de fauna por proximidad mientras el trayecto permanece activo.

La detección automática de fauna y la planificación de rutas no están conectadas a servicios en esta versión. Para iniciar alertas se ingresa el nombre del destino y se comparte el GPS actual mientras el trayecto permanece activo; no se requieren coordenadas del destino.

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

La búsqueda y validación de especies usa la API pública de iNaturalist y no requiere una clave. Al confirmar un reporte, se vuelve a consultar el taxón y se guarda localmente su identificador, nombre científico, nombre común, foto de referencia, atribución y licencia cuando están disponibles. Solo se muestran fotos con una licencia Creative Commons identificable. Para un taxón nuevo, el reportante aporta una clasificación inicial de riesgo; las especies ya clasificadas conservan su nivel. iNaturalist no proporciona esa clasificación.

Los nombres comunes se consultan en español. Para actualizar los nombres de especies de iNaturalist que ya estaban guardadas antes de este cambio, ejecuta `npm run localizar:especies` con `MONGODB_URI` configurada. Si iNaturalist no tiene un nombre común en español, se mostrará el nombre científico.

Al reportar, se elige una sola modalidad de ubicación. El modo GPS usa la ubicación del dispositivo con permiso explícito y no guarda ruta/km. El modo ruta/km ofrece las rutas nacionales y progresivas calibradas del conjunto oficial del MTOP; el servidor resuelve el pin sobre el trazado oficial y no acepta coordenadas del navegador para ese modo. Si el geoservicio no está disponible, el registro GPS sigue habilitado y la aplicación informa que ruta/km no se puede usar. No se muestran latitud/longitud en el formulario ni en el detalle.

Los trazados y puntos de calibración provienen del servicio WFS del MTOP: [Rutas y puntos de calibración para segmentación dinámica de rutas nacionales](https://geoservicios.mtop.gub.uy/geoserver/rutas_SD/ows), publicado como datos abiertos de Uruguay. La aplicación almacena los códigos y nombres de rutas en MongoDB y actualiza esa lista desde la fuente; las progresivas disponibles se refrescan con caché diaria. El punto se coloca solo para km con calibración disponible y geometría compatible, sin extrapolar entre mojones.

Las imágenes de iNaturalist son ilustrativas del taxón: no se importan observaciones de terceros ni se presentan esas imágenes como evidencia del reporte del usuario. La foto propia del avistamiento es un dato separado.

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

El seed carga especies, rutas, un usuario demo y cinco avistamientos de ejemplo. Sus ubicaciones se obtienen de los puntos calibrados del MTOP, por lo que requiere conexión al servicio de rutas:

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
