<template>
  <div
    class="relative rounded-2xl p-6 max-w-sm
              bg-white/10 dark:bg-white/10
              backdrop-blur-xl
              border border-white/20 dark:border-white/15
              shadow-[0_10px_40px_rgba(0,0,0,0.25)]
              ring-1 ring-white/10 overflow-hidden"
  >
    <span
      class="pointer-events-none absolute inset-0 rounded-2xl
                 bg-gradient-to-br from-white/25 to-transparent
                 opacity-40 mix-blend-overlay"
    />

    <h2 class="text-xl font-semibold text-white drop-shadow">
      Liquid Glass
    </h2>
    <p class="mt-2 text-white/80">
      Frosted translucency with backdrop blur + soft highlights.
    </p>
    <button
      class="mt-4 px-4 py-2 rounded-lg
                   bg-white/30 hover:bg-white/40
                   text-white font-medium
                   border border-white/30"
    >
      Action
    </button>
  </div>
</template>

<script setup>
</script>
