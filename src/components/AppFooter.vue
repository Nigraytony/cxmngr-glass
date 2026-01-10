<template>
  <footer class="border-t border-white/10 pt-4 text-xs text-white/50">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        © {{ year }} cxma
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <a
          class="hover:text-white/70"
          href="mailto:support@cxma.app"
        >Support</a>
        <span class="text-white/20">•</span>
        <span class="text-white/40">All rights reserved.</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>

