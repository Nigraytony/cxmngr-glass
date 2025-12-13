<template>
  <footer class="border-t border-slate-200/70 bg-white/80 text-xs text-slate-500 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
    <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-6">
      <div class="flex items-center gap-2">
        <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900">
          <span class="text-[0.7rem] font-semibold">Cx</span>
        </div>
        <span>Cxma</span>
      </div>
      <div class="flex flex-wrap gap-4 md:gap-6">
        <a href="#product" class="hover:text-slate-700 dark:hover:text-slate-200">Product</a>
        <a href="#features" class="hover:text-slate-700 dark:hover:text-slate-200">Workflows</a>
        <a href="#roles" class="hover:text-slate-700 dark:hover:text-slate-200">Roles</a>
        <a href="#pricing" class="hover:text-slate-700 dark:hover:text-slate-200">Pricing</a>
      </div>
      <p class="text-[0.7rem]">© {{ year }} Cxma. All rights reserved.</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
