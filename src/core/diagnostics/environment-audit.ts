import { getLogLevel, isLevelEnabled } from '@/core/logger'

export type AuditStatus = 'ok' | 'warn' | 'fail' | 'info'

export interface AuditCheck {
  check: string
  status: AuditStatus
  value: string
  hint?: string
}

// deviceMemory solo existe en Chromium y no está en lib.dom.
interface NavigatorWithExtras extends Navigator {
  deviceMemory?: number
}

const ICON: Record<AuditStatus, string> = { ok: '✅', warn: '⚠️', fail: '❌', info: 'ℹ️' }

let lastAudit: AuditCheck[] | null = null

export function getLastAudit(): AuditCheck[] | null {
  return lastAudit
}

/** Revisa todo lo que el navegador necesita para cámara + inferencia. */
export async function runEnvironmentAudit(): Promise<AuditCheck[]> {
  const nav = navigator as NavigatorWithExtras
  // mediaDevices no existe fuera de contextos seguros, aunque lib.dom lo tipa como siempre presente.
  const hasGetUserMedia = typeof nav.mediaDevices?.getUserMedia === 'function'
  const checks: AuditCheck[] = [
    {
      check: 'Contexto seguro (HTTPS)',
      status: isSecureContext ? 'ok' : 'fail',
      value: String(isSecureContext),
      hint: 'La cámara solo funciona en HTTPS o localhost.',
    },
    {
      check: 'API de cámara (getUserMedia)',
      status: hasGetUserMedia ? 'ok' : 'fail',
      value: hasGetUserMedia ? 'disponible' : 'no disponible',
      hint: 'Navegador sin soporte o contexto no seguro.',
    },
    {
      check: 'Aislamiento cross-origin',
      status: crossOriginIsolated ? 'ok' : 'warn',
      value: String(crossOriginIsolated),
      hint: 'Sin COOP/COEP el WASM corre en 1 hilo (más lento). Revisa los headers en vite.config.ts / vercel.json.',
    },
    {
      check: 'SharedArrayBuffer',
      status: typeof SharedArrayBuffer !== 'undefined' ? 'ok' : 'warn',
      value: typeof SharedArrayBuffer !== 'undefined' ? 'disponible' : 'no disponible',
      hint: 'Depende del aislamiento cross-origin.',
    },
    { check: 'Hilos de CPU', status: 'info', value: String(nav.hardwareConcurrency ?? '?') },
    { check: 'Memoria del dispositivo', status: 'info', value: nav.deviceMemory ? `${nav.deviceMemory} GB` : '?' },
    await auditWebGpu(nav),
    { check: 'Modo / nivel de log', status: 'info', value: `${import.meta.env.MODE} / ${getLogLevel()}` },
  ]

  lastAudit = checks
  return checks
}

async function auditWebGpu(nav: Navigator): Promise<AuditCheck> {
  const check = 'WebGPU'
  const hint = 'Sin WebGPU se usa WASM (CPU). Funciona, pero con menos FPS.'
  if (!('gpu' in nav) || !nav.gpu) return { check, status: 'warn', value: 'no soportado', hint }
  try {
    const adapter = await nav.gpu.requestAdapter()
    if (!adapter) return { check, status: 'warn', value: 'sin adaptador (GPU bloqueada o no compatible)', hint }
    const info = adapter.info
    const gpu = [info?.vendor, info?.architecture, info?.description].filter(Boolean).join(' ') || 'adaptador disponible'
    return { check, status: 'ok', value: gpu }
  } catch (err) {
    return { check, status: 'warn', value: `error: ${err instanceof Error ? err.message : String(err)}`, hint }
  }
}

export function printAudit(checks: AuditCheck[]): void {
  const problems = checks.filter((c) => c.status === 'fail' || c.status === 'warn')

  if (isLevelEnabled('info')) {
    console.groupCollapsed(
      `%c[WV]%c 🔍 Auditoría del entorno — ${problems.length ? `${problems.length} aviso(s)` : 'todo correcto'}`,
      'color:#22c55e;font-weight:700',
      problems.length ? 'color:#f59e0b' : 'color:#22c55e',
    )
    console.table(checks.map((c) => ({ estado: ICON[c.status], comprobación: c.check, valor: c.value })))
    console.groupEnd()
  }

  // Los problemas se muestran siempre que el nivel permita avisos, con su pista de corrección.
  if (isLevelEnabled('warn')) {
    for (const p of problems) {
      console.warn(`%c[WV]%c[audit]%c ${ICON[p.status]} ${p.check}: ${p.value}\n💡 ${p.hint ?? ''}`,
        'color:#22c55e;font-weight:700', 'color:#a78bfa', '')
    }
  }
}
