import type { App } from 'vue'
import type { Router } from 'vue-router'
import { createLogger } from '@/core/logger'
import { toAppError } from './app-error'
import { ErrorCode } from './error-codes'

const log = createLogger('global')

/** Captura todo lo que se escape: errores de componentes, de navegación y promesas sin manejar. */
export function installGlobalErrorHandlers(app: App, router: Router): void {
  app.config.errorHandler = (err, instance, info) => {
    log.error(`Error en componente (${info})`, toAppError(err), {
      component: instance?.$options.name ?? instance?.$options.__name ?? 'desconocido',
    })
  }

  router.onError((err, to) => {
    log.error(`Error al navegar a "${to.fullPath}"`, toAppError(err, ErrorCode.UNKNOWN, { route: to.fullPath }))
  })

  window.addEventListener('error', (event) => {
    log.error('Error no capturado', toAppError(event.error ?? event.message), {
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    log.error('Promesa rechazada sin manejar', toAppError(event.reason))
  })
}
