<template>
  <div class="app-bg grid place-items-center min-h-screen p-6">
    <div class="w-full max-w-md relative rounded-2xl p-6
                bg-white/10 backdrop-blur-xl border border-white/20 ring-1 ring-white/10
                shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
      <span class="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent opacity-40 mix-blend-overlay"></span>
      <div class="relative z-10 mb-4 flex items-center justify-center">
        <picture>
          <source srcset="/brand/logo.svg" type="image/svg+xml" />
          <img src="/brand/logo.png" alt="App logo" class="h-[4.5rem] w-auto object-contain invert" />
        </picture>
      </div>
      <h1 class="text-2xl font-semibold text-white drop-shadow">Create account</h1>

      <form @submit.prevent="submit" class="mt-6 space-y-4 relative z-10">
        <div>
          <label class="block text-white/90 text-sm mb-1">First Name</label>
          <input v-model="firstName" type="text" required class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30" placeholder="Jane" />
        </div>
        <div>
          <label class="block text-white/90 text-sm mb-1">Last Name</label>
          <input v-model="lastName" type="text" required class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30" placeholder="Doe" />
        </div>
        <div>
          <label class="block text-white/90 text-sm mb-1">Email</label>
          <input v-model="email" type="email" required class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30" placeholder="you@example.com" />
        </div>
        <div>
          <label class="block text-white/90 text-sm mb-1">Company</label>
          <input v-model="company" type="text" required class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30" placeholder="Your Company" />
        </div>
        <div>
          <label class="block text-white/90 text-sm mb-1">Password</label>
          <input v-model="password" type="password" required class="w-full rounded-lg bg-white/20 text-white placeholder-white/70 border-white/30" placeholder="••••••••" />
        </div>
        <button class="w-full py-2 rounded-lg bg-white/30 hover:bg-white/40 text-white border border-white/40 font-medium">Create account</button>
      </form>

      <p class="mt-4 text-white/80 text-sm">
        Already have an account?
        <RouterLink class="underline" :to="{ name: 'login' }">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import axios from 'axios'
import http from '../../utils/http'
import { useRoute } from 'vue-router'

const firstName = ref('')
const lastName = ref('')
const company = ref('')
const email = ref('')
const password = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const error = ref('')

const submit = async () => {
  error.value = ''
  if (!firstName.value || !lastName.value || !email.value || !password.value || !company.value) {
    error.value = 'All fields are required.'
    return
  }
  const payload = {
    firstName: firstName.value,
    lastName: lastName.value,
    company: company.value,
    email: email.value,
    password: password.value,
    role: 'user',
    projects: [],
  }
  const result = await authStore.register(payload)
  if (result.success) {
    // Optionally auto-login after registration
    await authStore.login(email.value, password.value)
    // If an invite token was provided, accept the invite
    const inviteToken = route.query.invite
    if (inviteToken) {
      try {
  await http.post('/api/projects/accept-invite', { token: inviteToken }, { headers: { Authorization: `Bearer ${authStore.token}` } })
      } catch (e) {
        // ignore invite acceptance errors; user can accept later
      }
    }
    router.push('/')
  } else {
    error.value = result.error || 'Signup failed.'
  }
}
</script>
