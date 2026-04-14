<template>
  <RouterView />
  <Modal
    v-model="auth.sessionWarningOpen"
    panel-class="max-w-md"
  >
    <template #header>
      <div class="text-lg font-semibold text-white">
        Session Expiring Soon
      </div>
    </template>

    <div class="space-y-3 text-white/90">
      <p>
        You are about to be signed out due to inactivity.
      </p>
      <p class="text-sm text-white/70">
        Select <span class="font-medium text-white">Stay signed in</span> to continue working.
      </p>
      <div class="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
        Logging out in {{ sessionWarningCountdown }}.
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-gray-300"
          @click="logoutNow"
        >
          Log out
        </button>
        <button
          :disabled="stayingSignedIn"
          class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-gray-300 disabled:opacity-60"
          @click="staySignedIn"
        >
          {{ stayingSignedIn ? 'Working…' : 'Stay signed in' }}
        </button>
      </div>
    </template>
  </Modal>
  <Toast
    :message="ui.toast.message"
    :show="ui.toast.show"
    :variant="ui.toast.variant"
    :duration="ui.toast.duration"
    :top="ui.toast.top"
    :action-label="ui.toast.actionLabel"
    :action-to="ui.toast.actionTo"
    @update:show="(v) => ui.toast.show = v"
    @close="(payload) => ui.hideToast(payload)"
  />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Modal from './components/Modal.vue'
import Toast from './components/Toast.vue'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'

const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()
const stayingSignedIn = ref(false)
const nowTs = ref(Date.now())
let countdownTimer = null

const sessionWarningCountdown = computed(() => {
  const deadline = Number(auth.sessionWarningDeadlineAt || 0)
  const remainingMs = Math.max(0, deadline - nowTs.value)
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
})

function startCountdown() {
  if (countdownTimer) return
  countdownTimer = setInterval(() => {
    nowTs.value = Date.now()
  }, 1000)
}

function stopCountdown() {
  if (!countdownTimer) return
  clearInterval(countdownTimer)
  countdownTimer = null
}

async function staySignedIn() {
  stayingSignedIn.value = true
  try {
    const ok = await auth.staySignedIn()
    if (!ok) {
      ui.showError('Session could not be extended. Please log in again.')
      await router.replace({ name: 'login' })
      return
    }
    ui.showInfo('Session extended', { duration: 2000 })
  } finally {
    stayingSignedIn.value = false
  }
}

async function logoutNow() {
  await auth.expireSession('inactive')
  await router.replace({ name: 'login' })
}

onMounted(() => {
  startCountdown()
})

onBeforeUnmount(() => {
  stopCountdown()
})
</script>
