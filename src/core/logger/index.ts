import { AppError, serializeError } from '@/core/errors/app-error'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'
type ActiveLevel = Exclude<LogLevel, 'silent'>

export interface LogEntry {
  time: string
  level: ActiveLevel
  scope: string
  message: string
  data?: unknown
}

export interface Logger {
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, error?: unknown, data?: unknown): void
  /** Inicia un cronómetro; al llamar a la función devuelta registra y retorna los ms. */
  time(label: string): () => number
}

const WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 }
const STORAGE_KEY = 'wv:log-level'
const HISTORY_SIZE = 300

const STYLE = {
  app: 'color:#22c55e;font-weight:700',
  scope: 'color:#a78bfa',
  debug: 'color:#8b98a8',
  info: 'color:#60a5fa',
  warn: 'color:#f59e0b',
  error: 'color:#ef4444;font-weight:700',
} as const

const history: LogEntry[] = []
let currentLevel: LogLevel = resolveInitialLevel()

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && value in WEIGHT
}

/** Prioridad: localStorage (override en producción) → VITE_LOG_LEVEL → debug en dev / info en prod. */
function resolveInitialLevel(): LogLevel {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLogLevel(stored)) return stored
  } catch {
    // localStorage bloqueado (modo privado, iframe…): se usa el valor por defecto
  }
  const fromEnv = import.meta.env.VITE_LOG_LEVEL
  if (isLogLevel(fromEnv)) return fromEnv
  return import.meta.env.DEV ? 'debug' : 'info'
}

export function getLogLevel(): LogLevel {
  return currentLevel
}

export function setLogLevel(level: LogLevel, persist = true): void {
  currentLevel = level
  if (!persist) return
  try {
    localStorage.setItem(STORAGE_KEY, level)
  } catch {
    // sin persistencia: solo afecta a esta sesión
  }
}

export function isLevelEnabled(level: ActiveLevel): boolean {
  return WEIGHT[level] >= WEIGHT[currentLevel]
}

/** Historial en memoria (se registra aunque el nivel esté filtrado, para wasteVision.dump()). */
export function getLogHistory(): readonly LogEntry[] {
  return history
}

function record(level: ActiveLevel, scope: string, message: string, data?: unknown) {
  history.push({ time: new Date().toISOString(), level, scope, message, data: serializeError(data) })
  if (history.length > HISTORY_SIZE) history.shift()
}

function prefix(scope: string, message: string, level: ActiveLevel): unknown[] {
  return [`%c[WV]%c[${scope}]%c ${message}`, STYLE.app, STYLE.scope, STYLE[level]]
}

export function createLogger(scope: string): Logger {
  function emit(level: Exclude<ActiveLevel, 'error'>, message: string, data?: unknown) {
    record(level, scope, message, data)
    if (!isLevelEnabled(level)) return
    const args = prefix(scope, message, level)
    if (data !== undefined) args.push(data)
    console[level](...args)
  }

  return {
    debug: (message, data) => emit('debug', message, data),
    info: (message, data) => emit('info', message, data),
    warn: (message, data) => emit('warn', message, data),

    error(message, error, data) {
      const appError = error instanceof AppError ? error : undefined
      record('error', scope, message, error ?? data)
      if (!isLevelEnabled('error')) return

      const title = `✖ ${message}${appError ? ` [${appError.code}]` : ''}`
      console.group(...prefix(scope, title, 'error'))
      if (appError) {
        console.error(appError)
        console.info('%c💡 Cómo corregirlo:%c ' + appError.hint, 'font-weight:700', '')
        if (Object.keys(appError.context).length) console.info('Contexto:', appError.context)
        if (appError.cause) console.info('Causa original:', appError.cause)
      } else if (error !== undefined) {
        console.error(error)
      }
      if (data !== undefined) console.info('Datos:', data)
      console.groupEnd()
    },

    time(label) {
      const start = performance.now()
      return () => {
        const ms = performance.now() - start
        emit('debug', `⏱ ${label}: ${ms.toFixed(1)} ms`)
        return ms
      }
    },
  }
}
