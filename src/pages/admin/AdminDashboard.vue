<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/admin' }, { text: 'Dashboard' }]" />
    <h2
      class="text-2xl mb-4"
    >
      Admin Console
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <router-link
        to="/admin/users"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Users
      </router-link>
      <router-link
        to="/admin/projects"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Projects
      </router-link>
      <router-link
        to="/admin/templates"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Templates
      </router-link>
      <router-link
        to="/admin/webhooks"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Webhook Events
      </router-link>
      <router-link
        to="/admin/billing"
        class="p-4 rounded bg-white/5 border border-white/10 text-white"
      >
        Billing (Coupons & Credits)
      </router-link>
        <!-- Send Test Email -->
        <div class="p-4 rounded bg-white/5 border border-white/10 text-white space-y-2">
          <div class="font-medium">Send Test Email</div>
          <div class="flex items-center gap-2">
            <input v-model="testEmail" type="email" placeholder="you@example.com" class="flex-1 px-3 py-2 rounded bg-white/10 border border-white/20" />
            <select v-model="kind" class="px-2 py-2 rounded bg-white/10 border border-white/20">
              <option value="invite">Invite</option>
              <option value="reset">Reset</option>
            </select>
            <button :disabled="sending" class="px-3 py-2 rounded bg-indigo-500/20 border border-indigo-400/60 hover:bg-indigo-500/35" @click="sendTest">
              {{ sending ? 'Sending…' : 'Send' }}
            </button>
          </div>
          <div v-if="resultMsg" class="text-sm text-white/70">{{ resultMsg }}</div>
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
