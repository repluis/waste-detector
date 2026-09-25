# Errores, logs y depuración

## Ver qué está pasando

Abre la consola del navegador (**F12 → Console**). Todos los logs de la app empiezan por `[WV][ámbito]`:

| Ámbito | Qué registra |
|---|---|
| `audit` | Auditoría del entorno al arrancar (HTTPS, cámara, WebGPU, hilos, COOP/COEP) |
| `camera` | Solicitud, apertura (dispositivo, resolución, FPS) y cierre de la cámara |
| `detector` | Descarga del modelo, backend usado, tiempos, formato de salida, avisos de configuración |
| `loop` | Inicio/parada del bucle y rendimiento cada 5 s (nivel `debug`) |
| `global` | Errores no capturados: componentes, navegación, promesas |

Cada error se muestra como un grupo con:
- **el error y su stack**
- **💡 Cómo corregirlo**: pista concreta para ese código
- **Contexto**: URL, dimensiones, backend, intentos…
- **Causa original**: el error nativo del navegador o de onnxruntime

La UI muestra el mensaje para el usuario y el **código** (p. ej. `MODEL_INVALID`) para poder buscarlo aquí.

## Comandos de consola (también en producción)

```js
wasteVision.help()                // lista de comandos
wasteVision.audit()               // vuelve a auditar el entorno
wasteVision.logs()                // historial (últimas 300 entradas)
wasteVision.logs('error')         // solo errores
wasteVision.dump()                // informe JSON completo → portapapeles (para reportar bugs)
wasteVision.setLogLevel('debug')  // más detalle; se guarda en localStorage
```

## Niveles de log

`debug` < `info` < `warn` < `error` < `silent`

Orden de prioridad:
1. `wasteVision.setLogLevel()`: se guarda en `localStorage` (clave `wv:log-level`), útil en Vercel.
2. `VITE_LOG_LEVEL` en `.env.local` o en las variables de Vercel.
3. Por defecto: `debug` en desarrollo e `info` en producción.

El historial guarda **todos** los niveles aunque no se muestren, así `dump()` siempre tiene el detalle completo.

## Catálogo de códigos

Definidos en [`src/core/errors/error-codes.ts`](../src/core/errors/error-codes.ts).

| Código | Clase | Causa típica | Cómo corregirlo |
|---|---|---|---|
| `CAMERA_UNSUPPORTED` | CameraError | Página por HTTP (no localhost) | Usa HTTPS, un túnel o `@vitejs/plugin-basic-ssl` |
| `CAMERA_PERMISSION_DENIED` | CameraError | Permiso rechazado o bloqueado por política | Candado de la barra de direcciones; header `Permissions-Policy` |
| `CAMERA_NOT_FOUND` | CameraError | No hay cámara | Conéctala o habilítala en el sistema |
| `CAMERA_IN_USE` | CameraError | Otra app usa la cámara | Cierra Zoom/Teams/otras pestañas |
| `CAMERA_OVERCONSTRAINED` | CameraError | Resolución/facingMode imposibles | Ajusta `openCamera()` |
| `MODEL_FETCH_FAILED` | ModelError | 404, error de red | Comprueba `public/models/` y `VITE_MODEL_URL` |
| `MODEL_INVALID` | ModelError | Se recibió HTML o un puntero de Git LFS | Revisa el rewrite de `vercel.json` y sube el binario real |
| `MODEL_NO_BACKEND` | ModelError | Ni WebGPU ni WASM crearon la sesión | Mira `attempts` en el contexto; verifica que `/ort/*` se sirva |
| `MODEL_OUTPUT_UNSUPPORTED` | ModelError | Salida distinta de `[1,N,6]` o `[1,4+nc,N]` | Reexporta con Ultralytics `format=onnx` |
| `MODEL_NOT_LOADED` | ModelError | `detect()` antes de `load()` | Llama a `useDetector().load()` primero |
| `INFERENCE_FAILED` | InferenceError | Falló `session.run()` | `inputSize` distinto del `imgsz` de exportación; prueba WASM |
| `INFERENCE_REPEATED_FAILURES` | InferenceError | 5 fallos seguidos → bucle detenido | La causa real es el primer error registrado |
| `CANVAS_UNAVAILABLE` | AppError | Sin contexto 2D | Navegador antiguo o sin memoria |
| `CHUNK_LOAD_FAILED` | AppError | index.html antiguo tras un deploy | Recarga la página |
| `UNKNOWN` | AppError | No clasificado | Revisa stack y causa original |

## Avisos (no bloquean)

Aparecen como `warn` en `[WV][detector]`:
- **"El modelo espera W×H pero inputSize es N"**: corrige `inputSize` en `config/model.config.ts`.
- **"El modelo tiene X clases pero hay Y labels"**: corrige `labels` (típico al cambiar a tu modelo propio).
- **"Backend WEBGPU falló, probando el siguiente"**: es normal en navegadores sin WebGPU; se usa WASM.

## Añadir un error nuevo

1. Añade el código a `ErrorCode` y sus textos a `USER_MESSAGES` y `DEVELOPER_HINTS` (TypeScript obliga a completar los tres).
2. Lánzalo desde el **service** con contexto útil:
   ```ts
   throw new ModelError({
     code: ErrorCode.MI_CODIGO,
     message: 'Descripción técnica',
     context: { url, status },
     cause: err,
   })
   ```
3. Regístralo **una sola vez** en el composable que lo captura (`log.error(...)`). Regla: *los services lanzan, los composables registran*.
4. Añádelo a la tabla de arriba.
