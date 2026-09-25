# Rutas

Definidas en [`src/router/index.ts`](../src/router/index.ts). Modo historial (`createWebHistory`): URLs limpias sin `#`.

| Ruta | Nombre | Vista | Carga | Descripción |
|---|---|---|---|---|
| `/` | `home` | `views/HomeView.vue` | inmediata | Presentación, categorías y botón **Abrir cámara** |
| `/scanner` | `scanner` | `views/ScannerView.vue` | lazy (arrastra onnxruntime-web) | Cámara + detección de residuos en tiempo real |
| `/:pathMatch(.*)*` | `not-found` | `views/NotFoundView.vue` | lazy | 404 |

Cada ruta define `meta.title`, que se usa para el título de la pestaña (`<título> · Waste Vision`).

## Navegar desde código

Usa siempre el **nombre** de la ruta, nunca el path, para poder cambiar URLs sin romper enlaces:

```vue
<RouterLink :to="{ name: 'scanner' }">Abrir cámara</RouterLink>
```

```ts
router.push({ name: 'scanner' })
```

## Añadir una ruta

1. Crear la vista en `src/views/MiVista.vue`.
2. Registrarla en `routes` con lazy loading:
   ```ts
   {
     path: '/historial',
     name: 'history',
     component: () => import('@/views/HistoryView.vue'),
     meta: { title: 'Historial' },
   },
   ```
3. Añadirla antes de la ruta `not-found` (debe ser siempre la última).
4. Documentarla en esta tabla.

## Rutas previstas (roadmap)

| Ruta | Nombre | Fase | Descripción |
|---|---|---|---|
| `/guia` | `guide` | 3 | Qué va en cada contenedor |
| `/guia/:categoria` | `guide-category` | 3 | Detalle de una categoría (`plastic`, `glass`…) |
| `/historial` | `history` | 4 | Residuos escaneados (requiere backend) |
| `/estadisticas` | `stats` | 4 | Métricas de uso |
| `/login` | `login` | 4 | Autenticación |

## Despliegue (Vercel)

Con historial HTML5, el servidor debe devolver `index.html` para cualquier ruta de la app. En [`vercel.json`](../vercel.json) esto ya está resuelto:

- **Rewrite SPA**: todo lo que no sea `/assets/*`, `/models/*` o `/favicon.svg` → `/index.html`. Así, recargar en `/scanner` no da 404.
- **Headers** en todas las rutas:
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  Permissions-Policy: camera=(self)
  ```

Al añadir una ruta nueva **no** hay que tocar `vercel.json`. Solo habría que hacerlo si se añade otra carpeta estática en `public/` (añádela a la exclusión del rewrite).

La cámara solo funciona en **HTTPS** (Vercel lo da por defecto) o en `localhost`.
