import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: 'Inicio' },
  },
  {
    path: '/scanner',
    name: 'scanner',
    // Lazy: onnxruntime-web solo se descarga al entrar al escáner.
    component: () => import('@/views/ScannerView.vue'),
    meta: { title: 'Escáner' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'No encontrado' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Waste Vision` : 'Waste Vision'
})

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}
