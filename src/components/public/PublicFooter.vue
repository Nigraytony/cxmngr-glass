<template>
  <footer class="border-t border-slate-200/70 bg-white/80 text-xs text-slate-500 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
    <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-6">
      <div class="flex items-center gap-3">
        <picture>
          <source
            srcset="/brand/logo-2.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo-2.png"
            alt="Cxma logo"
            class="h-6 w-6 object-contain"
          >
        <picture>
          <source srcset="/brand/logo-2.svg" type="image/svg+xml" />
          <img src="/brand/logo-2.png" alt="Cxma logo" class="h-6 w-6 object-contain" />
        </picture>
        <a
          href="#product"
          class="hover:text-slate-700 dark:hover:text-slate-200"
        >Product</a>
        <a
          href="#features"
          class="hover:text-slate-700 dark:hover:text-slate-200"
        >Workflows</a>
        <a
          href="#roles"
          class="hover:text-slate-700 dark:hover:text-slate-200"
        >Roles</a>
        <a
          href="#pricing"
          class="hover:text-slate-700 dark:hover:text-slate-200"
        >Pricing</a>
      </div>
      <p class="text-[0.7rem]">
        © {{ year }} Cxma. All rights reserved.
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>
