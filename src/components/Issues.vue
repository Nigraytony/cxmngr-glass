<template>
  <div class="rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/20 ring-1 ring-white/10">
    <h3 class="text-lg font-semibold">Project Issues</h3>
    <p class="text-white/80 mt-2">Recent issues for this project.</p>

    <ul class="mt-4 space-y-3">
      <li v-for="issue in issues" :key="issue.id">
        <button
          @click="$emit('open', issue)"
          class="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-start gap-3">
          <div class="flex-shrink-0 w-2.5 h-2.5 rounded-full"
               :class="{
                 'bg-red-400': issue.severity === 'high',
                 'bg-yellow-400': issue.severity === 'medium',
                 'bg-green-400': issue.severity === 'low'
               }"></div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-white font-medium">{{ issue.title }}</span>
              <span class="text-xs text-white/60">#{{ issue.id }}</span>
            </div>
            <p class="text-white/70 text-sm mt-1 truncate">{{ issue.description }}</p>
          </div>
        </button>
      </li>
      <li v-if="!issues || issues.length === 0" class="text-white/60">No issues found.</li>
    </ul>
  </div>
</template>

<script setup>
defineProps({
  issues: {
    type: Array,
    default: () => [],
  },
})
</script>
