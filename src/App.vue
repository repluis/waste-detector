<script setup lang="ts">
import { Recycle } from 'lucide-vue-next'
</script>

<template>
  <header class="app-header">
    <div class="container header-inner">
      <RouterLink :to="{ name: 'home' }" class="brand">
        <Recycle :size="22" /> Waste Vision
      </RouterLink>
      <nav>
        <RouterLink :to="{ name: 'home' }">Inicio</RouterLink>
        <RouterLink :to="{ name: 'scanner' }">Escáner</RouterLink>
      </nav>
    </div>
  </header>

  <main class="container">
    <RouterView />
  </main>
</template>

<style scoped>
.app-header {
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 3.5rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: var(--primary);
}

nav {
  display: flex;
  gap: 1rem;
}

nav a {
  color: var(--text-muted);
}

nav a.router-link-exact-active {
  color: var(--text);
}
</style>
