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
          <source
            srcset="/brand/logo.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo.png"
            alt="App logo"
            class="h-[4.5rem] w-auto object-contain invert"
          >
        </picture>
      </div>

      <h1 class="text-2xl font-semibold text-white drop-shadow">
        Forgot password
      </h1>
      <p class="text-white/80">
        Enter your account email and we'll send a reset link.
      </p>

      <form
        class="mt-6 space-y-4 relative z-10"
        @submit.prevent="submit"
      >
        <div>
          <label class="block text-white/90 text-sm mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30 px-3 py-2"
            placeholder="you@example.com"
          >
        </div>

        <div class="flex items-center justify-between">
          <button
            class="w-full py-2 rounded-lg bg-white/30 hover:bg-white/40 text-white border border-white/40 font-medium"
            :disabled="loading"
          >
            Send reset link
          </button>
        </div>
      </form>

      <p
        v-if="message"
        class="mt-4 text-sm text-green-400"
      >
        {{ message }}
      </p>
      <p
        v-if="error"
        class="mt-4 text-sm text-rose-400"
      >
        {{ error }}
      </p>

      <p class="mt-4 text-white/80 text-sm">
        Remembered? <RouterLink
          class="underline"
          :to="{ name: 'login' }"
        >
          Sign in
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getApiBase } from '../../utils/api'

const email = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    const res = await fetch(`${getApiBase()}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data?.error || data?.message || 'Failed to request reset'
    } else {
      message.value = data?.message || 'If that account exists, a reset email has been sent.'
      email.value = ''
    }
  } catch (e) {
    error.value = 'Network error'
  } finally { loading.value = false }
}
</script>

<style scoped>
.btn-primary{background:#2563eb;color:#fff;padding:.5rem 1rem;border-radius:.375rem}
</style>
