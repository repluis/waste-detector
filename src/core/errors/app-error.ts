import { DEVELOPER_HINTS, ErrorCode, USER_MESSAGES } from './error-codes'

export interface AppErrorOptions {
  code: ErrorCode
  /** Mensaje técnico (consola). */
  message: string
  /** Sobrescribe el mensaje por defecto del código para la UI. */
  userMessage?: string
  /** Datos para diagnosticar: URLs, dimensiones, backend… */
  context?: Record<string, unknown>
  cause?: unknown
}

/** Base de todas las excepciones de la app. */
export class AppError extends Error {
  override name = 'AppError'
  readonly code: ErrorCode
  readonly userMessage: string
  readonly hint: string
  readonly context: Record<string, unknown>
  readonly timestamp: string

  constructor(options: AppErrorOptions) {
    super(options.message, { cause: options.cause })
    this.code = options.code
    this.userMessage = options.userMessage ?? USER_MESSAGES[options.code]
    this.hint = DEVELOPER_HINTS[options.code]
    this.context = options.context ?? {}
    this.timestamp = new Date().toISOString()
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      hint: this.hint,
      context: this.context,
      timestamp: this.timestamp,
      cause: serializeError(this.cause),
      stack: this.stack,
    }
  }
}

export class CameraError extends AppError {
  override name = 'CameraError'
}

export class ModelError extends AppError {
  override name = 'ModelError'
}

export class InferenceError extends AppError {
  override name = 'InferenceError'
}

/** Normaliza cualquier cosa lanzada (Error, string, DOMException…) a AppError. */
export function toAppError(
  err: unknown,
  fallbackCode: ErrorCode = ErrorCode.UNKNOWN,
  context?: Record<string, unknown>,
): AppError {
  if (err instanceof AppError) return err
  const message = err instanceof Error ? err.message : String(err)
  const code = isChunkLoadError(message) ? ErrorCode.CHUNK_LOAD_FAILED : fallbackCode
  return new AppError({ code, message, context, cause: err })
}

export function serializeError(err: unknown): unknown {
  if (err instanceof AppError) return err.toJSON()
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack, cause: serializeError(err.cause) }
  }
  return err
}

function isChunkLoadError(message: string): boolean {
  return /dynamically imported module|Importing a module script failed|Loading chunk/i.test(message)
}
