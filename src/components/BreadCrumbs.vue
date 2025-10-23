<template>
  <div class="flex items-center justify-between gap-4">
    <!-- Page title on the left -->
    <div>
      <h1 class="text-2xl font-semibold text-white">{{ pageTitle }}</h1>
    </div>

    <!-- Breadcrumbs and actions on the right -->
    <div class="flex items-center gap-4">
      <nav class="text-sm text-white/80" aria-label="Breadcrumb">
        <ol class="flex items-center gap-2">
          <li v-for="(item, idx) in items" :key="idx" class="flex items-center gap-2">
            <template v-if="item.to && idx < items.length - 1">
              <RouterLink :to="item.to" class="text-white/80 hover:underline">{{ item.text }}</RouterLink>
              <span class="text-white/40">/</span>
            </template>
            <template v-else>
              <span class="text-white/60">{{ item.text }}</span>
            </template>
          </li>
        </ol>
      </nav>

      <div>
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
  title: { type: String, default: '' }
})

import { computed } from 'vue'

const pageTitle = computed(() => {
  if (props.title) return props.title
  if (props.items && props.items.length) return props.items[props.items.length - 1].text
  return ''
})
</script>
