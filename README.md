# ♻️ Waste Vision

Detección y clasificación de residuos en tiempo real **en el navegador**, con Vue 3, TypeScript, YOLO y ONNX Runtime Web (WebGPU/WASM). Sin backend: el video nunca sale del dispositivo.

## Empezar

```bash
npm install
npm run dev        # http://localhost:5173
```

Abre la app, entra en **Escáner** → **Iniciar detección** y concede permiso de cámara.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Type-check + build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` localmente |

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): stack, flujo de datos, carpetas, decisiones y roadmap
- [docs/RUTAS.md](docs/RUTAS.md): rutas de la app y cómo añadir nuevas
- [docs/ERRORES.md](docs/ERRORES.md): códigos de error, logs y comandos de depuración (`wasteVision.help()` en la consola)

## Modelo

`public/models/waste-detector.onnx` es por ahora un **YOLOv10n de COCO** (provisional): detecta botellas, vasos, cubiertos, libros y comida, y solo muestra residuos. Para usar tu propio modelo entrenado, consulta la *Fase 1* en [ARQUITECTURA.md](docs/ARQUITECTURA.md#fase-1-modelo-propio-de-residuos--lo-más-importante).

## Desplegar en Vercel

Toda la configuración está en [`vercel.json`](vercel.json): build de Vite, fallback SPA para las rutas, headers COOP/COEP (WASM multi-hilo), permiso de cámara y caché para `/assets` y `/models`.

**Opción A: desde GitHub (recomendado)**
1. Sube el repo a GitHub.
2. En [vercel.com/new](https://vercel.com/new) importa el repositorio. Vercel lee `vercel.json`, no hay que tocar nada.
3. Cada push a `main` despliega a producción y cada PR genera una URL de preview.

**Opción B: desde la terminal**
```bash
npm i -g vercel
vercel login
npm run deploy:preview   # URL de prueba
npm run deploy           # producción
```

Variables de entorno opcionales (Project → Settings → Environment Variables): `VITE_MODEL_URL` y `VITE_SCORE_THRESHOLD` (ver `.env.example`). Vercel sirve por HTTPS, así que la cámara funciona en el móvil sin configurar nada más.

> Si el modelo propio supera ~100 MB, no lo subas a git: aloja el `.onnx` en Vercel Blob, S3 o Hugging Face (con CORS y `Cross-Origin-Resource-Policy: cross-origin`) y apunta `VITE_MODEL_URL` a esa URL.

## Probar en el móvil

`getUserMedia` exige HTTPS fuera de `localhost`. Para probar desde el móvil en tu red, usa un túnel (p. ej. `cloudflared`, `ngrok`) o añade `@vitejs/plugin-basic-ssl` y ejecuta `npx vite --host`.
