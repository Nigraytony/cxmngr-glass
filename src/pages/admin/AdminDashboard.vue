<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/admin' }, { text: 'Dashboard' }]" />
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
      <router-link
        to="/admin/webhooks"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Webhook Events
      </router-link>
      <router-link
        to="/admin/billing"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Billing (Coupons & Credits)
      </router-link>
    </div>
  </div>
</template>

<script setup>
import BreadCrumbs from '../../components/BreadCrumbs.vue'
</script>

<style scoped>
</style>
