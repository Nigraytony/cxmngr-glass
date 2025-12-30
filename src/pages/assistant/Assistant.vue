<template>
  <section class="space-y-6">
    <BreadCrumbs
      :items="[
        { text: 'Dashboard', to: '/' },
        { text: 'Assistant', to: '/assistant' }
      ]"
      title="Assistant"
    />

    <div class="rounded-xl border border-white/10 bg-white/5 p-6 text-white/80">
      <p class="text-sm">
        Assistant page coming soon.
      </p>
    </div>
  </section>
</template>

<script setup>
import BreadCrumbs from '../../components/BreadCrumbs.vue'
</script>

