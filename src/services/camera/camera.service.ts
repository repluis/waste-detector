import { CameraError, ErrorCode } from '@/core/errors'
import { createLogger } from '@/core/logger'

export type FacingMode = 'user' | 'environment'

export interface CameraOptions {
  facingMode?: FacingMode
  width?: number
  height?: number
}

const log = createLogger('camera')

export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export async function openCamera(options: CameraOptions = {}): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new CameraError({
      code: ErrorCode.CAMERA_UNSUPPORTED,
      message: 'navigator.mediaDevices.getUserMedia no está disponible',
      context: { isSecureContext, origin: location.origin },
    })
  }

  const { facingMode = 'environment', width = 1280, height = 720 } = options
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: width },
      height: { ideal: height },
    },
  }

  log.debug('Solicitando cámara', constraints.video)
  const done = log.time('Apertura de cámara')

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints)
  } catch (err) {
    throw new CameraError({
      code: mapMediaErrorCode(err),
      message: `getUserMedia falló: ${err instanceof Error ? `${err.name} — ${err.message}` : String(err)}`,
      context: { constraints: constraints.video },
      cause: err,
    })
  }

  done()
  const track = stream.getVideoTracks()[0]
  const settings = track?.getSettings()
  log.info('Cámara abierta', {
    dispositivo: track?.label || '(sin nombre)',
    resolución: settings ? `${settings.width}×${settings.height}` : '?',
    fps: settings?.frameRate,
    facingMode: settings?.facingMode ?? 'n/d',
  })
  return stream
}

export function closeCamera(stream: MediaStream | null): void {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
  log.debug('Cámara cerrada')
}

function mapMediaErrorCode(err: unknown) {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return ErrorCode.CAMERA_PERMISSION_DENIED
      case 'NotFoundError':
        return ErrorCode.CAMERA_NOT_FOUND
      case 'NotReadableError':
        return ErrorCode.CAMERA_IN_USE
      case 'OverconstrainedError':
        return ErrorCode.CAMERA_OVERCONSTRAINED
    }
  }
  return ErrorCode.CAMERA_UNKNOWN
}
