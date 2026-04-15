<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
    <div class="text-center max-w-md">
      <div class="text-4xl mb-4">✓</div>
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Back from billing portal</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        Your billing changes have been saved. Redirecting you to your projects…
      </p>
      <button
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        @click="goToProjects"
      >
        Go to Projects
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function goToProjects() {
  router.push({ name: 'projects' })
}

onMounted(() => {
  setTimeout(() => goToProjects(), 2500)
})
</script>
