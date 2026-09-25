/**
 * Catálogo de errores de la app. Cada código tiene:
 *  - un mensaje para el usuario (se muestra en la UI)
 *  - una pista para el desarrollador (se muestra en consola: "💡 Cómo corregirlo")
 */
export const ErrorCode = {
  CAMERA_UNSUPPORTED: 'CAMERA_UNSUPPORTED',
  CAMERA_PERMISSION_DENIED: 'CAMERA_PERMISSION_DENIED',
  CAMERA_NOT_FOUND: 'CAMERA_NOT_FOUND',
  CAMERA_IN_USE: 'CAMERA_IN_USE',
  CAMERA_OVERCONSTRAINED: 'CAMERA_OVERCONSTRAINED',
  CAMERA_UNKNOWN: 'CAMERA_UNKNOWN',

  MODEL_FETCH_FAILED: 'MODEL_FETCH_FAILED',
  MODEL_INVALID: 'MODEL_INVALID',
  MODEL_NO_BACKEND: 'MODEL_NO_BACKEND',
  MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
  MODEL_NOT_LOADED: 'MODEL_NOT_LOADED',
  MODEL_OUTPUT_UNSUPPORTED: 'MODEL_OUTPUT_UNSUPPORTED',

  INFERENCE_FAILED: 'INFERENCE_FAILED',
  INFERENCE_REPEATED_FAILURES: 'INFERENCE_REPEATED_FAILURES',

  CANVAS_UNAVAILABLE: 'CANVAS_UNAVAILABLE',
  CHUNK_LOAD_FAILED: 'CHUNK_LOAD_FAILED',
  UNKNOWN: 'UNKNOWN',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export const USER_MESSAGES: Record<ErrorCode, string> = {
  CAMERA_UNSUPPORTED: 'Este navegador no permite acceder a la cámara.',
  CAMERA_PERMISSION_DENIED: 'Permiso de cámara denegado. Actívalo en la configuración del navegador.',
  CAMERA_NOT_FOUND: 'No se encontró ninguna cámara en este dispositivo.',
  CAMERA_IN_USE: 'La cámara está siendo usada por otra aplicación.',
  CAMERA_OVERCONSTRAINED: 'La cámara no soporta la configuración solicitada.',
  CAMERA_UNKNOWN: 'No se pudo abrir la cámara.',

  MODEL_FETCH_FAILED: 'No se pudo descargar el modelo de IA.',
  MODEL_INVALID: 'El archivo del modelo de IA no es válido.',
  MODEL_NO_BACKEND: 'No se pudo iniciar el modelo de IA en este dispositivo.',
  MODEL_LOAD_FAILED: 'No se pudo cargar el modelo de IA.',
  MODEL_NOT_LOADED: 'El modelo de IA aún no está listo.',
  MODEL_OUTPUT_UNSUPPORTED: 'El modelo de IA tiene un formato no compatible.',

  INFERENCE_FAILED: 'Falló el análisis de la imagen.',
  INFERENCE_REPEATED_FAILURES: 'La detección se detuvo por errores repetidos.',

  CANVAS_UNAVAILABLE: 'Tu navegador no soporta el dibujo en canvas.',
  CHUNK_LOAD_FAILED: 'Hay una versión nueva de la app. Recarga la página.',
  UNKNOWN: 'Ocurrió un error inesperado.',
}

export const DEVELOPER_HINTS: Record<ErrorCode, string> = {
  CAMERA_UNSUPPORTED:
    'getUserMedia requiere HTTPS o localhost. Si abres la app por IP (http://192.168…), usa un túnel HTTPS o @vitejs/plugin-basic-ssl.',
  CAMERA_PERMISSION_DENIED:
    'El usuario o una política bloqueó la cámara. Revisa el candado de la barra de direcciones y el header "Permissions-Policy: camera=(self)" en vercel.json.',
  CAMERA_NOT_FOUND: 'No hay dispositivos de video. Comprueba que la cámara esté conectada y habilitada en el sistema.',
  CAMERA_IN_USE: 'Otra app o pestaña tiene la cámara (Zoom, Teams, otra pestaña). Ciérrala y reintenta.',
  CAMERA_OVERCONSTRAINED:
    'Las restricciones de resolución/facingMode no se pueden cumplir. Revisa openCamera() en services/camera/camera.service.ts.',
  CAMERA_UNKNOWN: 'Error no clasificado de getUserMedia. Revisa "Causa original" en este log.',

  MODEL_FETCH_FAILED:
    'Comprueba que el archivo exista en public/models/ y que VITE_MODEL_URL sea correcta. Abre la URL del contexto en otra pestaña.',
  MODEL_INVALID:
    'Lo descargado no es un .onnx. Si es HTML, el archivo no existe en esa URL y el rewrite SPA devolvió index.html: revisa VITE_MODEL_URL en Vercel (Settings → Environment Variables; bórrala para usar /models/waste-detector.onnx) y redespliega. Si pesa ~130 bytes, es un puntero de Git LFS: sube el binario real.',
  MODEL_NO_BACKEND:
    'Ningún backend pudo crear la sesión (ver "attempts" en el contexto). Si falla WASM, verifica que /ort/*.mjs y /ort/*.wasm se sirvan (npm run copy:ort) y no devuelvan index.html.',
  MODEL_LOAD_FAILED: 'Error inesperado al inicializar el detector. Revisa "Causa original".',
  MODEL_NOT_LOADED: 'Se llamó a detect() antes de load(). Usa useDetector().load() antes de iniciar el bucle.',
  MODEL_OUTPUT_UNSUPPORTED:
    'La salida no es [1,N,6] (end2end) ni [1,4+nc,N] (raw). Exporta con Ultralytics "format=onnx" y revisa services/detector/postprocess.ts.',

  INFERENCE_FAILED:
    'Falló session.run(). Comprueba que inputSize en model.config.ts coincida con el imgsz de exportación. Si solo falla con WebGPU, prueba con WASM.',
  INFERENCE_REPEATED_FAILURES:
    'El bucle se detuvo tras varios fallos seguidos para no saturar la consola. El primer error registrado arriba es la causa real.',

  CANVAS_UNAVAILABLE: 'getContext("2d") devolvió null. Puede ser por límite de memoria o un navegador muy antiguo.',
  CHUNK_LOAD_FAILED:
    'El navegador tiene un index.html antiguo que pide chunks de un deploy anterior. Recarga; si persiste, revisa la caché de index.html.',
  UNKNOWN: 'Error no clasificado. Revisa el stack y "Causa original".',
}
