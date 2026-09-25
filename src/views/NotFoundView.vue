<template>
  <section class="not-found">
    <h1>404</h1>
    <p>Esta página no existe.</p>
    <RouterLink :to="{ name: 'home' }" class="btn">Volver al inicio</RouterLink>
  </section>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 0;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 3rem;
}

p {
  margin: 0;
  color: var(--text-muted);
}
</style>
