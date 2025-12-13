<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
    <div class="mx-auto max-w-5xl px-4 py-12 md:px-6">
      <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
      <p class="mt-3 text-slate-600 dark:text-slate-300">Simple, project-based plans. Choose what fits your team.</p>

      <div class="mt-8 grid gap-6 sm:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 class="text-xl font-semibold">Standard</h2>
          <p class="mt-1 text-slate-600 dark:text-slate-300">$49 / project</p>
          <ul class="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>Issues & Equipment</li>
            <li>Basic templates</li>
            <li>Spaces</li>
          </ul>
          <RouterLink :to="{ name: 'register' }" class="mt-6 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Get started</RouterLink>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 class="text-xl font-semibold">Pro</h2>
          <p class="mt-1 text-slate-600 dark:text-slate-300">$79 / project</p>
          <ul class="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>Everything in Standard</li>
            <li>Advanced templates</li>
            <li>Tasks</li>
          </ul>
          <RouterLink :to="{ name: 'register' }" class="mt-6 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Get started</RouterLink>
        </div>
      </div>

      <p class="mt-8 text-xs text-slate-500 dark:text-slate-400">15-day free period starts when a project is created.</p>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
