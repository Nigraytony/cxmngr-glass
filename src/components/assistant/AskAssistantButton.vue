<template>
  <button
    type="button"
    :class="buttonClass"
    @click="onClick"
  >
    <span class="text-lg leading-none">✨</span>
    <span class="text-sm font-medium">Ask Assistant</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAssistantStore } from '../../stores/assistant'

const props = defineProps({
  variant: { type: String, default: 'floating' } // 'floating' | 'inline'
})

const route = useRoute()
const assistant = useAssistantStore()

const buttonClass = computed(() => {
  const base = 'rounded-full flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xl text-white/90'
  if (props.variant === 'inline') return `${base} px-3 h-9 shadow`
  return `${base} fixed bottom-6 right-6 z-40 px-4 h-12 shadow-xl`
})

function onClick() {
  assistant.openWithContext({
    routeName: route.name ? String(route.name) : null,
    routePath: route.path || null,
  })
}
</script>
