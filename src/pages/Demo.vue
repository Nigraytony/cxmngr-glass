<template>
  <div class="min-h-screen grid place-items-center bg-[#0b1220] text-white p-6">
    <div class="text-center space-y-4 max-w-md">
      <template v-if="!failed">
        <Spinner />
        <p class="text-white/80">
          Loading the Cxma live demo…
        </p>
        <p class="text-white/50 text-sm">
          You're entering a shared sample project. It's reset every night, so feel free to click around and change things.
        </p>
      </template>
      <template v-else>
        <p class="text-red-300">
          {{ errorMsg || 'The live demo is unavailable right now.' }}
        </p>
        <router-link
          to="/"
          class="inline-block underline text-white/80 hover:text-white"
        >
          Back to home
        </router-link>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Spinner from '../components/Spinner.vue'

const router = useRouter()
const auth = useAuthStore()
const failed = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const ok = await auth.demoLogin()
    if (ok) {
      router.replace('/app')
      return
    }
    failed.value = true
    errorMsg.value = auth.error || ''
  } catch (e) {
    failed.value = true
  }
})
</script>
