<template>
  <header class="sticky top-0 z-30 border-b border-slate-200/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/70">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
      <!-- Logo: mark + word (black mark, word beside) -->
      <div class="flex items-center gap-3">
        <picture>
          <source
            srcset="/brand/logo-2.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo-2.png"
            alt="Cxma logo"
            class="h-8 w-8 object-contain dark:invert"
          >
        </picture>
        <span class="text-lg font-semibold tracking-wide text-slate-900 dark:text-slate-100">Cxma</span>
      </div>

      <!-- Nav -->
      <nav class="hidden items-center gap-7 text-sm text-slate-600 dark:text-slate-300 md:flex">
        <RouterLink
          :to="{ path: '/', hash: '#features' }"
          class="hover:text-slate-900 dark:hover:text-white"
        >
          Features
        </RouterLink>
        <RouterLink
          :to="{ path: '/', hash: '#workflows' }"
          class="hover:text-slate-900 dark:hover:text-white"
        >
          Workflows
        </RouterLink>
        <RouterLink
          :to="{ path: '/', hash: '#roles' }"
          class="hover:text-slate-900 dark:hover:text-white"
        >
          Roles
        </RouterLink>
        <RouterLink
          :to="{ path: '/', hash: '#pricing' }"
          class="hover:text-slate-900 dark:hover:text-white"
        >
          Pricing
        </RouterLink>
      </nav>

      <!-- Actions -->
      <div class="hidden items-center gap-4 md:flex">
        <RouterLink
          :to="{ name: 'login', query: { redirect: '/app' } }"
          class="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
        >
          Log in
        </RouterLink>
        <RouterLink
          :to="{ name: 'register' }"
          class="rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.45)] transition hover:from-sky-600 hover:to-sky-700"
        >
          Get started
        </RouterLink>
      </div>

      <!-- Mobile menu button (placeholder) -->
      <button class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/70 p-2 text-slate-700 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 md:hidden">
        <span class="sr-only">Open menu</span>
        <svg
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line
            x1="3"
            y1="6"
            x2="21"
            y2="6"
          />
          <line
            x1="3"
            y1="12"
            x2="21"
            y2="12"
          />
          <line
            x1="3"
            y1="18"
            x2="21"
            y2="18"
          />
        </svg>
      </button>

      <!-- Mobile actions -->
      <div class="flex items-center gap-3 md:hidden">
        <RouterLink
          :to="{ name: 'login', query: { redirect: '/app' } }"
          class="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
        >
          Log in
        </RouterLink>
        <RouterLink
          :to="{ name: 'register' }"
          class="rounded-lg bg-gradient-to-tr from-sky-500 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(56,189,248,0.45)]"
        >
          Get started
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
