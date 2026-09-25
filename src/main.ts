import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { installDebugTools, printAudit, runEnvironmentAudit } from './core/diagnostics'
import { installGlobalErrorHandlers } from './core/errors'
import { router } from './router'
import './styles/main.css'

const app = createApp(App)

installGlobalErrorHandlers(app, router)
installDebugTools()

app.use(createPinia()).use(router).mount('#app')

void runEnvironmentAudit().then(printAudit)
