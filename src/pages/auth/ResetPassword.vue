<template>
  <div class="app-bg grid place-items-center min-h-screen p-6">
    <div
      class="w-full max-w-md relative rounded-2xl p-6
                bg-white/10 backdrop-blur-xl border border-white/20 ring-1 ring-white/10
                shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
    >
      <span class="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent opacity-40 mix-blend-overlay" />
      <div class="relative z-10 mb-4 flex items-center justify-center">
        <picture>
          <source srcset="/brand/logo.svg" type="image/svg+xml">
          <img src="/brand/logo.png" alt="App logo" class="h-[4.5rem] w-auto object-contain invert" />
        </picture>
      </div>

      <h1 class="text-2xl font-semibold text-white drop-shadow">Reset password</h1>
      <p class="text-white/80">Choose a new password for your account.</p>

      <form class="mt-6 space-y-4 relative z-10" @submit.prevent="submit">
        <div>
          <label class="block text-white/90 text-sm mb-1">New password</label>
          <input v-model="newPassword" type="password" required minlength="8" class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30 px-3 py-2" />
        </div>
        <div>
          <label class="block text-white/90 text-sm mb-1">Confirm password</label>
          <input v-model="confirmPassword" type="password" required minlength="8" class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30 px-3 py-2" />
        </div>
        <div class="flex items-center justify-between">
          <button class="w-full py-2 rounded-lg bg-white/30 hover:bg-white/40 text-white border border-white/40 font-medium" :disabled="loading">Reset password</button>
        </div>
      </form>

      <p v-if="message" class="mt-4 text-sm text-green-400">{{ message }}</p>
      <p v-if="error" class="mt-4 text-sm text-rose-400">{{ error }}</p>

      <p class="mt-4 text-white/80 text-sm">
        Back to <RouterLink class="underline" :to="{ name: 'login' }">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getApiBase } from '../../utils/api'

const route = useRoute()
const router = useRouter()
const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)

onMounted(() => {
  token.value = String(route.query.token || '')
})

async function submit() {
  error.value = ''
  message.value = ''
  if (!token.value) return error.value = 'Missing reset token'
  if (newPassword.value !== confirmPassword.value) return error.value = 'Passwords do not match'
  loading.value = true
  try {
    const res = await fetch(`${getApiBase()}/api/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value, newPassword: newPassword.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data?.error || data?.message || 'Failed to reset password'
    } else {
      message.value = data?.message || 'Password reset successfully. You can now log in.'
      setTimeout(() => router.push({ name: 'login' }), 1500)
    }
  } catch (e) {
    error.value = 'Network error'
  } finally { loading.value = false }
}
</script>

<style scoped>
.btn-primary{background:#2563eb;color:#fff;padding:.5rem 1rem;border-radius:.375rem}
</style>
