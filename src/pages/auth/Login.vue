<template>
  <section class="app-bg min-h-screen py-12 px-6">
    <div class="max-w-7xl mx-auto relative">
      <!-- Small login form positioned top-right on large screens, centered on small screens -->
      <div class="flex justify-center lg:justify-end">
        <div
          class="w-full max-w-md lg:max-w-sm z-50"
          :class="['lg:fixed lg:top-6 lg:right-6']"
        >
          <!-- Floating card with collapsible body -->
          <div :class="['relative rounded-2xl bg-white/8 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-300', collapsed ? 'max-h-14' : 'max-h-[720px]']">
            <span class="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent opacity-30 mix-blend-overlay" />

            <!-- Header: always visible (thin strip when collapsed) -->
            <div class="relative z-20 flex items-center px-3 py-2">
              <div class="flex items-center gap-3">
                <picture class="flex items-center">
                  <source
                    srcset="/brand/logo-2.svg"
                    type="image/svg+xml"
                  >
                  <img
                    src="/brand/logo-2.png"
                    alt="Cx Manager"
                    class="h-8 w-auto object-contain invert"
                  >
                </picture>
              </div>
              <div class="flex-1 text-center text-white font-semibold">
                Sign In
              </div>
              <div class="flex items-center">
                <button
                  :aria-expanded="!collapsed"
                  class="p-2 text-white/90 hover:text-white"
                  @click.prevent="toggleCollapse"
                >
                  <svg
                    v-if="!collapsed"
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  ><path
                    d="M6 9l6-6 6 6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  ><path
                    d="M18 15l-6 6-6-6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                </button>
              </div>
            </div>

            <!-- Body: collapsible content -->
            <div
              class="card-body px-4 pb-4 transition-all duration-300"
              :class="collapsed ? 'opacity-0 pointer-events-none h-0 py-0' : 'opacity-100 pt-3'"
            >
              <div class="relative z-10">
                <form
                  class="mt-3 space-y-3"
                  @submit.prevent="submit"
                >
                  <div>
                    <input
                      v-model="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      class="w-full rounded-lg bg-white/15 text-white placeholder-white/70 border border-white/30 px-3 py-2 text-sm"
                    >
                  </div>
                  <div>
                    <input
                      v-model="password"
                      type="password"
                      required
                      placeholder="Password"
                      class="w-full rounded-lg bg-white/15 text-white placeholder-white/70 border border-white/30 px-3 py-2 text-sm"
                    >
                  </div>
                  <div class="flex items-center justify-between text-xs text-white/80">
                    <label class="inline-flex items-center gap-2">
                      <input
                        v-model="remember"
                        type="checkbox"
                        class="form-checkbox h-4 w-4"
                      >
                      Remember
                    </label>
                    <div class="flex items-center gap-3">
                      <RouterLink
                        :to="{ name: 'register' }"
                        class="underline"
                      >
                        Register
                      </RouterLink>
                      <RouterLink
                        :to="{ name: 'forgot-password' }"
                        class="underline"
                      >
                        Forgot?
                      </RouterLink>
                    </div>
                  </div>
                  <div>
                    <button
                      :disabled="loading"
                      class="w-full py-2 rounded-md bg-green-700/70 hover:bg-green-700/80 text-white border border-green-600/60 text-sm backdrop-blur-sm"
                    >
                      {{ loading ? 'Signing in…' : 'Sign in' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Full-width information area -->
      <main class="mt-8">
        <div class="sticky top-6 z-30 bg-clip-padding">
          <div class="inline-flex items-center gap-4">
            <div>
              <h1 class="text-4xl sm:text-5xl font-extrabold text-white drop-shadow">
                Cx Manager
              </h1>
              <p class="text-white/80 text-sm">
                Liquid-glass simplicity for commissioning, issues, and assets.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-6 space-y-6">
          <div class="relative rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            <span class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-40 mix-blend-overlay" />
            <h3 class="text-xl font-semibold text-white">
              What it does
            </h3>
            <p class="mt-2 text-white/80">
              Track issues, manage templates, and organize equipment and spaces — all in one place with project-level access and clean workflows.
            </p>

            <div class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                <h4 class="text-white/90 font-medium">
                  Who it's for
                </h4>
                <p class="text-white/70 text-sm mt-1">
                  Facilities teams, contractors, commissioning agents, and building owners.
                </p>
              </div>
              <div class="p-3 rounded-xl bg-white/5 border border-white/10">
                <h4 class="text-white/90 font-medium">
                  Why it helps
                </h4>
                <p class="text-white/70 text-sm mt-1">
                  Reduce rework, centralize data, and handover with confidence.
                </p>
              </div>
            </div>

            <h4 class="mt-5 text-white/90 font-semibold">
              Features
            </h4>
            <ul class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/85 text-sm">
              <li class="flex items-start gap-2">
                <span class="text-emerald-300">●</span>
                Issue tracking & assignments
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-300">●</span>
                Templates & checklists
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-300">●</span>
                Equipment & spaces inventory
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-300">●</span>
                Role-based access per project
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-300">●</span>
                CSV/PDF exports
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-300">●</span>
                Stripe-powered subscriptions
              </li>
            </ul>
          </div>

          <!-- Commissioning Process (uses Sign in button color) -->
          <div class="relative rounded-2xl p-6 bg-green-700/70 backdrop-blur-sm border border-green-600/60 ring-1 ring-green-600/30 shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
            <span class="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-800/30 to-transparent opacity-40 mix-blend-overlay" />
            <div class="flex flex-col md:flex-row items-start gap-6">
              <div class="flex-1 text-white">
                <h3 class="text-xl font-semibold">
                  Commissioning Process
                </h3>
                <p class="mt-2 text-white/90 text-sm">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur non nulla sit amet nisl tempus convallis quis ac lectus.
                </p>

                <p class="mt-3 text-white/85 text-sm">
                  Nulla porttitor accumsan tincidunt. Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui. Cras ultricies ligula sed magna dictum porta.
                </p>

                <ul class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/85 text-sm">
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Step-by-step commissioning workflows
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Role-based approvals and sign-off
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Automated checklists and results
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Handover-ready reports
                  </li>
                </ul>
              </div>

              <div class="w-full md:w-1/3">
                <div class="rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)] float-right md:float-none md:ml-4">
                  <img
                    src="/photos/tasks-1.png"
                    alt="Commissioning preview"
                    class="w-full h-48 md:h-40 object-cover"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Assets section -->
          <div class="relative rounded-2xl p-6 bg-white/8 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            <span class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-40 mix-blend-overlay" />
            <div class="flex flex-col md:flex-row items-center gap-6">
              <div class="w-full md:w-1/3">
                <div class="rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                  <img
                    src="/photos/equipment-1.png"
                    alt="Assets preview"
                    class="w-full h-48 md:h-40 object-cover"
                  >
                </div>
              </div>
              <div class="flex-1 text-white">
                <h3 class="text-xl font-semibold">
                  Assets
                </h3>
                <p class="mt-2 text-white/90 text-sm">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante.
                </p>

                <ul class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/85 text-sm">
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Photo & document library
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Attachments linked to issues
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Versioned asset previews
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Fast search and filters
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Issues section (frosty red) -->
          <div class="relative rounded-2xl p-6 bg-red-700/70 backdrop-blur-sm border border-red-600/60 ring-1 ring-red-600/30 shadow-[0_30px_80px_rgba(0,0,0,0.6)] overflow-hidden">
            <span class="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-800/30 to-transparent opacity-40 mix-blend-overlay" />
            <div class="flex flex-col md:flex-row items-center gap-6">
              <div class="flex-1 text-white">
                <h3 class="text-xl font-semibold">
                  Issues
                </h3>
                <p class="mt-2 text-white/90 text-sm">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>
              <div class="w-full md:w-1/3">
                <div class="rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                  <img
                    src="/photos/issues-1.png"
                    alt="Issues preview"
                    class="w-full h-48 md:h-40 object-cover"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Spaces section -->
          <div class="relative rounded-2xl p-6 bg-white/8 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
            <span class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-40 mix-blend-overlay" />
            <div class="flex flex-col md:flex-row items-center gap-6">
              <div class="w-full md:w-1/3">
                <div class="rounded-lg overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                  <img
                    src="/photos/spaces-1.png"
                    alt="Spaces preview"
                    class="w-full h-48 md:h-40 object-cover"
                  >
                </div>
              </div>
              <div class="flex-1 text-white">
                <h3 class="text-xl font-semibold">
                  Spaces
                </h3>
                <p class="mt-2 text-white/90 text-sm">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent commodo cursus magna, vel scelerisque nisl consectetur et.
                </p>

                <ul class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-white/85 text-sm">
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Floor plans & locations
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Area-based reporting
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Assign assets to spaces
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-emerald-300">●</span>
                    Quick filters and tags
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div class="rounded-2xl p-6 bg-white/10 backdrop-blur-xl border border-white/10 ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <h3 class="text-lg font-semibold text-white">
              Pricing
            </h3>
            <p class="text-white/80 text-sm">
              Simple, transparent subscriptions per project. Cancel anytime.
            </p>

            <div class="mt-4 grid gap-3 sm:grid-cols-3">
              <div class="p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                <div class="text-white/90 font-bold">
                  Starter
                </div>
                <div class="text-white/90 text-2xl font-extrabold mt-1">
                  $10
                </div>
                <div class="text-white/70 text-xs">
                  per project / month
                </div>
                <ul class="mt-3 text-white/75 text-sm space-y-1">
                  <li>Up to 3 projects</li>
                  <li>Basic issue tracking</li>
                </ul>
              </div>
              <div class="p-4 rounded-xl bg-emerald-600/10 border border-emerald-600/30 ring-1 ring-emerald-600/20">
                <div class="text-white font-bold">
                  Pro
                </div>
                <div class="text-white text-3xl font-extrabold mt-1">
                  $29
                </div>
                <div class="text-white/80 text-xs">
                  per project / month
                </div>
                <ul class="mt-3 text-white/85 text-sm space-y-1">
                  <li>Unlimited projects</li>
                  <li>Templates, equipment, spaces</li>
                  <li>Priority support</li>
                </ul>
              </div>
              <div class="p-4 rounded-xl bg-white/10 border border-white/10">
                <div class="text-white/90 font-bold">
                  Enterprise
                </div>
                <div class="text-white/90 text-xl font-extrabold mt-1">
                  Custom
                </div>
                <div class="text-white/70 text-xs">
                  Contact sales
                </div>
                <ul class="mt-3 text-white/80 text-sm space-y-1">
                  <li>Custom integrations</li>
                  <li>SSO & SLA</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <RouterLink
              :to="{ name: 'register' }"
              class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white"
            >
              Start free trial
            </RouterLink>
            <a
              href="#"
              class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Learn more
            </a>
          </div>
        </div>
      </main>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

// Collapse state for the floating card
const collapsed = ref(false)
function toggleCollapse() { collapsed.value = !collapsed.value }

// form state
const email = ref('')
const password = ref('')
const remember = ref(false)
const error = ref('')
const loading = ref(false)

const authStore = useAuthStore()
const router = useRouter()

const submit = async () => {
  error.value = ''
  if (!email.value) { error.value = 'Email is required.'; return }
  if (!password.value) { error.value = 'Password is required.'; return }
  loading.value = true
  try {
    const ok = await authStore.login(email.value, password.value)
    if (ok) {
      if (remember.value) {
        try { localStorage.setItem('rememberMe', '1') } catch (e) { /* ignore */ }
      }
      router.push('/')
    } else {
      error.value = authStore.error || 'Invalid email or password.'
    }
  } catch (e) {
    error.value = (e && e.message) ? e.message : 'Sign in failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.card-body { transition: opacity 240ms ease, height 240ms ease, padding 240ms ease }
.max-h-\[720px\] { max-height: 720px }
.max-h-14 { max-height: 56px }
</style>
