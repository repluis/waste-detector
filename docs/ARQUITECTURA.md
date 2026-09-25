# Waste Vision: arquitectura y plan

Clasificación de residuos **en tiempo real y 100 % en el navegador**. El video nunca sale del dispositivo: no hay backend para la detección.

## Stack

| Capa | Tecnología |
|---|---|
| UI | Vue 3 + TypeScript + Vite |
| Estado | Pinia |
| Navegación | Vue Router (vistas con lazy loading) |
| Cámara | `navigator.mediaDevices.getUserMedia()` |
| Modelo | YOLO exportado a ONNX |
| Inferencia | ONNX Runtime Web: **WebGPU** si está disponible, **WASM** (CPU, multi-hilo) como alternativa |
| Visualización | `<video>` + `<canvas>` superpuesto |
| Iconos | lucide-vue-next |

## Flujo de datos

```
getUserMedia ─► <video> ─► Preprocessor (letterbox 640×640, NCHW float32)
                                 │
                                 ▼
                    ONNX Runtime Web (WebGPU / WASM)
                                 │
                                 ▼
                decodeYoloOutput (end2end o raw + NMS)
                                 │   RawDetection[]  (genérico: label + box + score)
                                 ▼
                 toWasteDetections  ──► descarta todo lo que NO es residuo
                                 │   WasteDetection[]
                                 ▼
                     Pinia store (detections, fps, ms)
                         │                    │
                         ▼                    ▼
                 DetectionCanvas         WasteResult
                 (cajas + etiquetas)     (categoría principal + contenedor)
```

El bucle (`useDetectionLoop`) usa `requestAnimationFrame` y **no encola frames**: si una inferencia tarda, los frames intermedios se saltan en vez de acumular retraso.

## Estructura de carpetas

```
waste-vision/
├── docs/                          ← esta documentación
├── public/
│   └── models/
│       └── waste-detector.onnx    ← modelo que se carga en el navegador
├── src/
│   ├── main.ts                    ← arranque: Pinia + Router
│   ├── App.vue                    ← layout (header + <RouterView>)
│   ├── env.d.ts                   ← tipos de variables VITE_*
│   │
│   ├── config/                    ← TODO lo configurable, sin lógica
│   │   ├── model.config.ts        ← URL del modelo, tamaño de entrada, umbrales, clases
│   │   ├── waste-categories.ts    ← categorías, colores, contenedor y mapeo etiqueta→residuo
│   │   └── labels/coco.ts         ← clases del modelo COCO provisional
│   │
│   ├── types/
│   │   └── detection.ts           ← contratos: Detector, RawDetection, WasteDetection…
│   │
│   ├── services/                  ← lógica pura en TS, sin Vue (testeable, portable a Worker)
│   │   ├── camera/camera.service.ts
│   │   ├── detector/
│   │   │   ├── index.ts           ← createDetector(): punto único para cambiar la implementación
│   │   │   ├── onnx-detector.ts   ← sesión ONNX, elección de backend, detect()
│   │   │   ├── preprocess.ts      ← letterbox + normalización
│   │   │   ├── postprocess.ts     ← decodificación de la salida YOLO
│   │   │   └── nms.ts             ← Non-Maximum Suppression
│   │   └── waste/waste-classifier.ts ← RawDetection → WasteDetection (filtro "solo residuos")
│   │
│   ├── composables/               ← puente entre services y componentes (reactividad + ciclo de vida)
│   │   ├── useCamera.ts
│   │   ├── useDetector.ts         ← singleton: el modelo se carga una sola vez
│   │   └── useDetectionLoop.ts
│   │
│   ├── stores/
│   │   └── detection.store.ts     ← estado global: modelo, backend, detecciones, FPS
│   │
│   ├── components/                ← presentacionales, reciben props
│   │   ├── camera/CameraView.vue
│   │   └── detection/
│   │       ├── DetectionCanvas.vue
│   │       ├── DetectorStatus.vue
│   │       └── WasteResult.vue
│   │
│   ├── views/                     ← una por ruta (ver RUTAS.md)
│   ├── router/index.ts
│   ├── utils/draw.ts              ← dibujo de cajas en canvas
│   └── styles/main.css            ← tokens de diseño y clases base
├── vite.config.ts                 ← alias @, headers COOP/COEP, exclusión de onnxruntime-web
└── vercel.json                    ← despliegue: build, fallback SPA, headers, caché
```

### Reglas de capas

1. **`config/`** no importa nada salvo tipos. Cambiar el modelo o las categorías **solo** toca aquí.
2. **`services/`** no importa Vue. Así se puede mover a un Web Worker o testear sin navegador.
3. **`composables/`** son la única capa que conecta services ↔ estado reactivo.
4. **`components/`** no llaman a services directamente; reciben props y emiten eventos.
5. **`views/`** orquestan composables y componentes.

## Decisiones clave

- **Detector detrás de una interfaz (`Detector`)**: la UI no sabe si la inferencia corre en el hilo principal, en un Worker o con otro runtime.
- **Modelo genérico → dominio**: el detector devuelve etiquetas crudas; `waste-classifier` las traduce a residuos y **descarta todo lo demás** (personas, muebles, dispositivos en uso…). Solo se dibujan residuos.
- **Dos formatos de salida YOLO soportados**, detectados automáticamente por la forma del tensor:
  - `[1, N, 6]`: end2end (YOLOv10, YOLO26), con NMS integrado.
  - `[1, 4+nc, N]`: raw (YOLOv8, YOLO11), NMS en JS.
- **COOP/COEP** en `vite.config.ts`: habilitan `SharedArrayBuffer` → WASM multi-hilo. En producción el hosting **debe** enviar esos mismos headers.
- **Lazy loading**: onnxruntime-web (~27 MB de WASM) solo se descarga al entrar en `/scanner`.

## Estado actual (v0.1)

- [x] Proyecto Vue 3 + TS + Vite con alias `@`
- [x] Pinia, Vue Router, onnxruntime-web y lucide instalados
- [x] Cámara con cambio frontal/trasera y manejo de errores de permisos
- [x] Inferencia WebGPU con fallback a WASM
- [x] Detección en tiempo real con cajas en canvas y resultado principal
- [x] Filtro "solo residuos"
- [x] Configuración de despliegue en Vercel (`vercel.json`)
- [x] **Modelo provisional**: YOLOv10n preentrenado en COCO. Reconoce botellas, vasos, cubiertos, libros y comida, y los mapea a plástico, vidrio, metal, papel y orgánico.

> ⚠️ El modelo COCO es solo para validar el pipeline. **No** distingue materiales (una botella siempre será "plástico", aunque sea de vidrio). La precisión real llega en la Fase 1.

## Plan (roadmap)

### Fase 1: modelo propio de residuos ⭐ (lo más importante)
1. Dataset: TACO, TrashNet, "Garbage Classification" (Kaggle/Roboflow) + fotos propias.
2. Unificar clases: `plastic, paper, cardboard, glass, metal, organic, electronic`.
3. Entrenar con Ultralytics (YOLO11n o YOLO26n):
   ```bash
   pip install ultralytics
   yolo detect train data=waste.yaml model=yolo11n.pt imgsz=640 epochs=100
   yolo export model=runs/detect/train/weights/best.pt format=onnx imgsz=640 opset=17 simplify=True
   ```
4. Copiar `best.onnx` a `public/models/waste-detector.onnx`.
5. En `src/config/model.config.ts` cambiar `labels` por las clases del modelo, en el **mismo orden** que en `waste.yaml`. Si coinciden con los ids de `WASTE_CATEGORIES`, no hace falta mapeo.

### Fase 2: rendimiento
- Mover la inferencia a un **Web Worker** (nuevo `WorkerDetector` que implemente `Detector`; solo cambia `createDetector()`).
- Modelo cuantizado (INT8/FP16) para móviles.
- Cachear el modelo con Service Worker (PWA offline).

### Fase 3: experiencia
- Estabilización temporal (suavizar cajas y evitar parpadeo entre frames).
- Captura de foto y confirmación manual del resultado.
- Guía por categoría (qué va en cada contenedor) y soporte multi-idioma.

### Fase 4: backend (opcional)
- Laravel/Go + PostgreSQL: usuarios, historial, estadísticas.
- Envío de imágenes mal clasificadas para reentrenar el modelo (active learning).

### Calidad (transversal)
- Vitest para `services/` (postprocess, nms, waste-classifier).
- ESLint + Prettier.
- CI con build y tests.
