<template>
  <div class="p-4 space-y-4">
    <BreadCrumbs :items="crumbs" />

    <div
      v-if="id === 'new'"
      class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 text-white/80"
    >
      Creating users is handled in the Users list. Use the “New” button on the Users page.
    </div>

    <div v-else>
      <div
        v-if="!status.isGranted"
        class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 text-white space-y-3"
      >
        <div class="text-white/90 font-medium">
          Support access required
        </div>
        <div class="text-sm text-white/70">
          Request a PIN to be emailed to the user. Once the user provides you the PIN, enter it here to unlock their profile for support.
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
            :disabled="requesting"
            :class="requesting ? 'opacity-60 cursor-not-allowed' : ''"
            @click="requestPin"
          >
            {{ requesting ? 'Requesting…' : 'Request PIN' }}
          </button>
          <div
            v-if="status.pinExpiresAt"
            class="text-xs text-white/60"
          >
            PIN expires {{ formatRelative(status.pinExpiresAt) }}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            v-model="pin"
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="Enter 6-digit PIN"
            class="w-52 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 text-white"
          >
          <button
            class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 text-sm text-emerald-100"
            :disabled="verifying || !pin.trim()"
            :class="(verifying || !pin.trim()) ? 'opacity-60 cursor-not-allowed' : ''"
            @click="verifyPin"
          >
            {{ verifying ? 'Verifying…' : 'Verify PIN' }}
          </button>
        </div>
      </div>

      <Profile
        v-else
        :user-id="id"
        :crumbs="crumbs"
        title="User Profile"
        :hide-breadcrumbs="true"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import http from '../../utils/http'
import { useUiStore } from '../../stores/ui'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Profile from '../profile/Profile.vue'

const route = useRoute()
const ui = useUiStore()

const id = computed(() => String(route.params.id || ''))

const crumbs = computed(() => ([
  { text: 'Admin', to: '/app/admin' },
  { text: 'Users', to: '/app/admin/users' },
  { text: id.value === 'new' ? 'New' : 'User Profile' },
]))

const status = ref<{ isGranted: boolean; grantedUntil: string | null; pinExpiresAt: string | null }>({
  isGranted: false,
  grantedUntil: null,
  pinExpiresAt: null,
})

const requesting = ref(false)
const verifying = ref(false)
const pin = ref('')

function formatRelative(dateIso: string) {
  try {
    const d = new Date(dateIso)
    const diffMs = d.getTime() - Date.now()
    const minutes = Math.round(diffMs / 60000)
    if (minutes === 0) return 'now'
    if (minutes > 0) return `in ${minutes} min`
    return `${Math.abs(minutes)} min ago`
  } catch (e) {
    return String(dateIso || '')
  }
}

async function refreshStatus() {
  if (!id.value || id.value === 'new') return
  try {
    const { data } = await http.get(`/api/admin/users/${encodeURIComponent(id.value)}/support-access/status`)
    status.value = {
      isGranted: !!data?.isGranted,
      grantedUntil: data?.grantedUntil || null,
      pinExpiresAt: data?.pinExpiresAt || null,
    }
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load support access status')
  }
}

async function requestPin() {
  if (!id.value || id.value === 'new') return
  try {
    requesting.value = true
    await http.post(`/api/admin/users/${encodeURIComponent(id.value)}/support-access/request`)
    ui.showSuccess('PIN emailed to the user')
    await refreshStatus()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to request PIN')
  } finally {
    requesting.value = false
  }
}

async function verifyPin() {
  if (!id.value || id.value === 'new') return
  try {
    verifying.value = true
    await http.post(`/api/admin/users/${encodeURIComponent(id.value)}/support-access/verify`, { pin: pin.value })
    ui.showSuccess('Support access granted')
    pin.value = ''
    await refreshStatus()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to verify PIN')
  } finally {
    verifying.value = false
  }
}

onMounted(refreshStatus)
</script>
