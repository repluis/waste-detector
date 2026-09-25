import { createLogger, getLogHistory, getLogLevel, setLogLevel, type LogLevel } from '@/core/logger'
import { getLastAudit, printAudit, runEnvironmentAudit } from './environment-audit'

export interface DebugTools {
  help(): void
  audit(): Promise<void>
  logs(level?: LogLevel): void
  dump(): Promise<object>
  setLogLevel(level: LogLevel): void
}

declare global {
  interface Window {
    wasteVision?: DebugTools
  }
}

const log = createLogger('debug')

/** Expone `wasteVision` en la consola del navegador (también en producción). */
export function installDebugTools(): void {
  window.wasteVision = {
    help() {
      console.table({
        'wasteVision.audit()': 'Revisa HTTPS, cámara, WebGPU, hilos, COOP/COEP',
        'wasteVision.logs()': 'Tabla con el historial de logs (acepta "error", "warn"…)',
        'wasteVision.dump()': 'Informe JSON completo (se copia al portapapeles) para reportar un bug',
        'wasteVision.setLogLevel("debug")': 'Cambia el nivel y lo recuerda (debug | info | warn | error | silent)',
      })
    },

    async audit() {
      printAudit(await runEnvironmentAudit())
    },

    logs(level) {
      const entries = level ? getLogHistory().filter((e) => e.level === level) : getLogHistory()
      console.table(entries.map(({ time, level, scope, message }) => ({ time, level, scope, message })))
    },

    async dump() {
      const report = {
        generatedAt: new Date().toISOString(),
        url: location.href,
        userAgent: navigator.userAgent,
        logLevel: getLogLevel(),
        audit: getLastAudit() ?? (await runEnvironmentAudit()),
        logs: getLogHistory(),
      }
      const json = JSON.stringify(report, null, 2)
      try {
        await navigator.clipboard.writeText(json)
        log.info('Informe copiado al portapapeles')
      } catch {
        log.info('No se pudo copiar al portapapeles; copia el objeto de abajo')
      }
      console.log(report)
      return report
    },

    setLogLevel(level) {
      setLogLevel(level)
      log.info(`Nivel de log: ${level} (se guarda en localStorage)`)
    },
  }

  log.info('Depuración: escribe wasteVision.help() en la consola')
}
