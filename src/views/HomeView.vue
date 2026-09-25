<script setup lang="ts">
import { Camera, Recycle } from 'lucide-vue-next'
import { WASTE_CATEGORIES } from '@/config/waste-categories'
</script>

<template>
  <section class="home">
    <Recycle :size="56" class="logo" />
    <h1>Waste Vision</h1>
    <p class="lead">
      Clasificación de residuos en tiempo real, directamente en tu navegador.
      El video nunca sale de tu dispositivo.
    </p>

    <RouterLink :to="{ name: 'scanner' }" class="btn btn-primary">
      <Camera :size="20" /> Abrir cámara
    </RouterLink>

    <ul class="categories">
      <li v-for="c in WASTE_CATEGORIES" :key="c.id" :style="{ '--c': c.color }">{{ c.name }}</li>
    </ul>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding: 3rem 0;
}

.logo {
  color: var(--primary);
}

h1 {
  margin: 0;
  font-size: 2.5rem;
}

.lead {
  max-width: 32rem;
  margin: 0;
  color: var(--text-muted);
}

.categories {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin: 1.5rem 0 0;
  padding: 0;
  list-style: none;
}

.categories li {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--c);
  border-radius: 999px;
  color: var(--c);
  font-size: 0.875rem;
}
</style>
