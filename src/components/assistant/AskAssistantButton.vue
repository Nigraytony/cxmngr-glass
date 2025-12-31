<template>
  <button
    type="button"
    class="fixed bottom-6 right-6 z-40 rounded-full px-4 h-12 flex items-center gap-2
           bg-white/10 hover:bg-white/15 border border-white/15 shadow-xl backdrop-blur-xl
           text-white/90"
    @click="onClick"
  >
    <span class="text-lg leading-none">✨</span>
    <span class="text-sm font-medium">Ask Assistant</span>
  </button>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useAssistantStore } from '../../stores/assistant'

const route = useRoute()
const assistant = useAssistantStore()

function onClick() {
  assistant.openWithContext({
    routeName: route.name ? String(route.name) : null,
    routePath: route.path || null,
  })
}
</script>

