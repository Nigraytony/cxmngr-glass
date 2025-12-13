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
            srcset="/brand/logo-2.svg"
            type="image/svg+xml"
          >
          <img
            src="/brand/logo-2.png"
            alt="App logo"
            class="h-[2.5rem] w-auto object-contain invert"
          >
        </picture>
        <span class="text-white text-3xl font-semibold tracking-wide">Cxma</span>
      </div>
      <h1 class="text-2xl font-semibold text-white drop-shadow">
        Sign in
      </h1>

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
            class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30"
            placeholder="you@example.com"
          >
        </div>
        <div>
          <label class="block text-white/90 text-sm mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30"
            placeholder="••••••••"
          >
        </div>
        <button
          :disabled="loading"
          class="w-full py-2 rounded-lg bg-white/30 hover:bg-white/40 text-white border border-white/40 font-medium"
        >
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-4 text-white/80 text-sm">
        New here?
        <RouterLink
          class="underline"
          :to="{ name: 'register' }"
        >
          Create account
        </RouterLink>
        ·
        <RouterLink
          class="underline"
          :to="{ name: 'forgot-password' }"
        >
          Forgot password?
        </RouterLink>
        ·
        <RouterLink
          class="underline"
          :to="{ name: 'home' }"
        >
          Home
        </RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const email = ref('')
const password = ref('')
const loading = ref(false)
const authStore = useAuthStore()
const router = useRouter()

const submit = async () => {
  if (!email.value || !password.value) return
  loading.value = true
  try {
    const ok = await authStore.login(email.value, password.value)
    if (ok) router.push('/app')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
</style>
