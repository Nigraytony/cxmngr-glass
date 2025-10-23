<template>
  <div class="app-bg grid place-items-center min-h-screen p-6">
    <div class="w-full max-w-md relative rounded-2xl p-6
                bg-white/10 backdrop-blur-xl border border-white/20 ring-1 ring-white/10
                shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
      <span class="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent opacity-40 mix-blend-overlay"></span>
      <h1 class="text-2xl font-semibold text-white drop-shadow">Welcome back</h1>
      <p class="text-white/80">Sign in to your account</p>

      <form @submit.prevent="submit" class="mt-6 space-y-4 relative z-10">
        <div>
          <label class="block text-white/90 text-sm mb-1">Email</label>
          <input v-model="email" type="email" required class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30" placeholder="you@example.com" />
        </div>
        <div>
          <label class="block text-white/90 text-sm mb-1">Password</label>
          <input v-model="password" type="password" required class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30" placeholder="Enter your password" />
        </div>
        <button class="w-full py-2 rounded-lg bg-white/30 hover:bg-white/40 text-white border border-white/40 font-medium">Sign in</button>
      </form>

      <p class="mt-4 text-white/80 text-sm">
        No account?
        <RouterLink class="underline" :to="{ name: 'register' }">Create one</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const authStore = useAuthStore()
const router = useRouter()

const submit = async () => {
  error.value = ''
  if (!email.value) {
    error.value = 'Email is required.'
    return
  }
  if (!password.value) {
    error.value = 'Password is required.'
    return
  }
  const ok = await authStore.login(email.value, password.value)
  if (ok) {
    router.push('/')
  } else {
    error.value = authStore.error || 'Invalid email or password.'
  }
}
</script>
