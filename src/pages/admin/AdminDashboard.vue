<template>
  <div class="p-4">
    <h2
      class="text-2xl mb-4"
    >
      Admin Console
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <router-link
        to="/admin/users"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Users
      </router-link>
      <router-link
        to="/admin/projects"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Projects
      </router-link>
      <router-link
        to="/admin/templates"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Templates
      </router-link>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
</style>
