<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Dashboard' }]" />
    <h2
      class="text-2xl mb-4"
    >
      Admin Console
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <router-link
        :to="{ name: 'admin-users' }"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 text-white/80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle
              cx="9"
              cy="7"
              r="4"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M22 21v-2a4 4 0 0 0-3-3.87"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M16 3.13a4 4 0 0 1 0 7.75"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Users</span>
        </div>
      </router-link>
      <router-link
        :to="{ name: 'admin-projects' }"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 text-white/80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
          <span>Projects</span>
        </div>
      </router-link>
      <router-link
        :to="{ name: 'admin-templates' }"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 text-white/80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <rect
              x="3"
              y="4"
              width="18"
              height="16"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M7 8h10M7 12h6M7 16h8"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Equipment Templates</span>
        </div>
      </router-link>
      <router-link
        :to="{ name: 'admin-task-templates' }"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 text-white/80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M9 11l3 3L22 4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
              stroke="currentColor"
              stroke-width="1.5"
            />
          </svg>
          <span>Task Templates</span>
        </div>
      </router-link>
      <router-link
        :to="{ name: 'admin-webhooks' }"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 text-white/80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M12 3v6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M12 21v-6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M3 12h6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M21 12h-6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              stroke-width="1.5"
            />
          </svg>
          <span>Webhook Events</span>
        </div>
      </router-link>
      <router-link
        :to="{ name: 'admin-billing' }"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 text-white/80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <rect
              x="3"
              y="7"
              width="18"
              height="12"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M3 10h18"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <path
              d="M7 15h4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Billing (Coupons & Credits)</span>
        </div>
      </router-link>
      <router-link
        :to="{ name: 'admin-assistant-articles' }"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 text-white/80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5V5.5A2.5 2.5 0 0 1 6.5 3Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <path
              d="M8 7h8M8 11h8M8 15h6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Assistant Articles</span>
        </div>
      </router-link>
      <!-- Send Test Email -->
      <div class="p-4 rounded bg-white/5 border border-white/10 text-white space-y-2">
        <div class="flex items-center justify-between gap-3">
          <div class="font-medium">
            Send Test Email
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-2 py-1.5 rounded-md text-sm border"
              :class="kind === 'invite' ? 'bg-white/15 border-white/30 text-white' : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'"
              type="button"
              aria-label="Invite email"
              @click="kind = 'invite'"
            >
              Invite
            </button>
            <button
              class="px-2 py-1.5 rounded-md text-sm border"
              :class="kind === 'reset' ? 'bg-white/15 border-white/30 text-white' : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10'"
              type="button"
              aria-label="Reset email"
              @click="kind = 'reset'"
            >
              Reset
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
          <input
            v-model="testEmail"
            type="email"
            placeholder="you@example.com"
            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
          >
          <button
            :disabled="sending"
            class="px-3 py-2 rounded bg-indigo-500/20 border border-indigo-400/60 hover:bg-indigo-500/35"
            @click="sendTest"
          >
            <span class="inline-flex items-center gap-2">
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M22 2l-7 20-4-9-9-4 20-7z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>{{ sending ? 'Sending…' : 'Send' }}</span>
            </span>
          </button>
        </div>
        <div
          v-if="resultMsg"
          class="text-sm text-white/70"
        >
          {{ resultMsg }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import BreadCrumbs from '../../components/BreadCrumbs.vue'
  import { ref } from 'vue'
  import http from '../../utils/http'
  import { useUiStore } from '../../stores/ui'
  const ui = useUiStore()
  const testEmail = ref('')
  const kind = ref('invite')
  const sending = ref(false)
  const resultMsg = ref('')
  async function sendTest() {
    resultMsg.value = ''
    const to = (testEmail.value || '').trim()
    if (!to) { ui.showError('Enter a recipient email'); return }
    try {
      sending.value = true
      const { data } = await http.post('/api/admin/send-test-email', { to, kind: kind.value })
      ui.showSuccess('Test email sent')
      resultMsg.value = data && data.ok ? 'Sent successfully' : 'Sent'
    } catch (e) {
      ui.showError(e?.response?.data?.error || e?.message || 'Failed to send')
    } finally {
      sending.value = false
    }
  }
</script>

<style scoped>
</style>
