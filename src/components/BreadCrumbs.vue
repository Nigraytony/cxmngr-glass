<template>
  <div class="flex items-center justify-between gap-4 flex-wrap min-w-0">
    <!-- Page title on the left -->
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold text-white truncate">
        {{ pageTitle }}
      </h1>
    </div>

    <!-- Breadcrumbs and actions on the right -->
    <div class="flex items-center gap-4 flex-wrap min-w-0">
      <nav
        class="text-sm text-white/80 min-w-0"
        aria-label="Breadcrumb"
      >
        <ol class="flex items-center gap-2 flex-wrap min-w-0">
          <li
            v-for="(item, idx) in items"
            :key="idx"
            class="flex items-center gap-2"
          >
            <template v-if="item.to && idx < items.length - 1">
              <RouterLink
                :to="normalizeTo(item.to)"
                class="text-white/80 hover:underline"
              >
                {{ item.text }}
              </RouterLink>
              <span class="text-white/40">/</span>
            </template>
            <template v-else>
              <span class="text-white/60 truncate">{{ item.text }}</span>
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
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  title: { type: String, default: '' }
})

function normalizeTo(to) {
  if (!to) return '/'
  if (typeof to === 'string') {
    const s = String(to).trim()
    if (!s) return '/'
    // Prefer app-prefixed routes for all breadcrumbs.
    if (s === '/') return '/app'
    if (s.startsWith('/app')) return s
    if (s.startsWith('/')) return `/app${s}`
    return `/app/${s.replace(/^\/+/, '')}`
  }
  // Support vue-router location objects.
  if (to && typeof to === 'object' && typeof to.path === 'string') {
    const p = String(to.path).trim()
    if (!p) return to
    if (p === '/') return { ...to, path: '/app' }
    if (p.startsWith('/app')) return to
    if (p.startsWith('/')) return { ...to, path: `/app${p}` }
  }
  return to
}

const pageTitle = computed(() => {
  if (props.title) return props.title
  if (props.items && props.items.length) return props.items[props.items.length - 1].text
  return ''
})
</script>
