export type FacingMode = 'user' | 'environment'

export interface CameraOptions {
  facingMode?: FacingMode
  width?: number
  height?: number
}

export class CameraError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'CameraError'
  }
}

export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export async function openCamera(options: CameraOptions = {}): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new CameraError('Este navegador no permite acceder a la cámara (se requiere HTTPS o localhost).')
  }

  const { facingMode = 'environment', width = 1280, height = 720 } = options

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: width },
        height: { ideal: height },
      },
    })
  } catch (err) {
    throw new CameraError(describeMediaError(err), err)
  }
}

export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

function describeMediaError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        return 'Permiso de cámara denegado. Actívalo en la configuración del navegador.'
      case 'NotFoundError':
        return 'No se encontró ninguna cámara en este dispositivo.'
      case 'NotReadableError':
        return 'La cámara está siendo usada por otra aplicación.'
    }
  }
  return 'No se pudo abrir la cámara.'
}
