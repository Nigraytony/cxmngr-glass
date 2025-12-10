<template>
  <section class="space-y-6">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/admin' }, { text: 'Billing' }]" />
    <div class="grid gap-4 md:grid-cols-2">
      <div class="p-4 rounded-2xl bg-white/6 border border-white/10">
        <h2 class="text-lg font-medium mb-2">
          Create promotion code / coupon
        </h2>
        <div class="text-sm text-white/70 mb-3">
          Create a coupon and promotion code for discounts. <span class="text-red-300">*</span> required. At least one of percent or amount is required.
        </div>

        <!-- Confirm modal -->
        <div
          v-if="confirmOpen"
          class="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
        >
          <div class="w-full max-w-md rounded-xl bg-white/10 border border-white/20 p-4 space-y-3 text-white shadow-xl">
            <div class="text-lg font-semibold">
              {{ confirmTitle }}
            </div>
            <div class="text-sm text-white/80">
              {{ confirmMessage }}
            </div>
            <div class="flex justify-end gap-3">
              <button
                class="px-3 py-2 rounded bg-white/10 border border-white/20"
                @click="confirmNo"
              >
                Cancel
              </button>
              <button
                class="px-3 py-2 rounded bg-blue-600 text-white"
                @click="confirmYes"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model="form.code"
              placeholder="Code* (e.g., SAVE20)"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
            <input
              v-model="form.name"
              placeholder="Name (optional)"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model.number="form.percent_off"
              type="number"
              placeholder="Percent off (e.g., 20)"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
            <input
              v-model.number="form.amount_off"
              type="number"
              placeholder="Amount off cents (e.g., 500 = $5)"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
          </div>
          <div class="grid grid-cols-2 gap-2">
            <select
              v-model="form.currency"
              class="rounded p-2 bg-white/5 border border-white/10"
            >
              <option value="usd">
                USD
              </option>
            </select>
            <select
              v-model="form.duration"
              class="rounded p-2 bg-white/5 border border-white/10"
            >
              <option value="once">
                Once
              </option>
              <option value="repeating">
                Repeating
              </option>
              <option value="forever">
                Forever
              </option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model.number="form.duration_in_months"
              type="number"
              placeholder="Duration months (if repeating)"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
            <input
              v-model.number="form.max_redemptions"
              type="number"
              placeholder="Max redemptions"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model="form.expires_at"
              type="date"
              class="rounded p-2 bg-white/5 border border-white/10"
            >
            <input
              v-model="form.priceId"
              placeholder="Restrict to priceId (optional)"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
          </div>
          <div>
            <input
              v-model="form.productsCsv"
              placeholder="Restrict to product IDs (comma-separated)"
              class="w-full rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
          </div>
          <div class="text-right">
            <button
              class="px-4 py-2 rounded bg-blue-600 text-white"
              :disabled="creating"
              @click="createCode"
            >
              {{ creating ? 'Creating…' : 'Create code' }}
            </button>
          </div>
          <div
            v-if="error"
            class="text-sm text-red-300"
          >
            {{ error }}
          </div>
        </div>
      </div>

      <div class="p-4 rounded-2xl bg-white/6 border border-white/10">
        <h2 class="text-lg font-medium mb-2">
          Issue credit
        </h2>
        <div class="text-sm text-white/70 mb-3">
          Add a one-time balance credit to a Stripe customer by user email (preferred) or customer ID.
        </div>
        <div class="space-y-3">
          <div class="space-y-2">
            <input
              v-model="credit.email"
              placeholder="User email (preferred)"
              class="rounded p-2 bg-white/5 border border-white/10 w-full placeholder:text-gray-400"
              @input="onEmailInput"
            >
            <div
              v-if="emailSuggestions.length"
              class="bg-white/5 border border-white/10 rounded"
            >
              <div
                v-for="u in emailSuggestions"
                :key="u._id"
                class="px-3 py-2 text-sm text-white/80 hover:bg-white/10 cursor-pointer"
                @click="selectEmail(u)"
              >
                {{ u.email }} <span
                  v-if="u.name"
                  class="text-white/60"
                >({{ u.name }})</span>
              </div>
            </div>
          </div>
          <div class="pt-1">
            <input
              v-model="credit.customerId"
              placeholder="Stripe customer ID (optional)"
              class="rounded p-2 bg-white/5 border border-white/10 w-full placeholder:text-gray-400"
            >
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model.number="credit.amount"
              type="number"
              placeholder="Amount (dollars)"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
            <input
              v-model="credit.currency"
              placeholder="Currency"
              class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
            >
          </div>
          <input
            v-model="credit.description"
            placeholder="Description"
            class="rounded p-2 bg-white/5 border border-white/10 placeholder:text-gray-400"
          >
          <div class="text-right">
            <button
              class="px-4 py-2 rounded bg-emerald-600 text-white"
              :disabled="issuingCredit"
              @click="issueCredit"
            >
              {{ issuingCredit ? 'Issuing…' : 'Issue credit' }}
            </button>
          </div>
          <div
            v-if="creditError"
            class="text-sm text-red-300"
          >
            {{ creditError }}
          </div>
        </div>
      </div>
    </div>

    <div class="p-4 rounded-2xl bg-white/6 border border-white/10">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div class="space-y-0.5">
          <h2 class="text-lg font-medium">
            Promotion codes
          </h2>
          <p class="text-sm text-white/70">
            Filter by status, search, and manage state.
          </p>
        </div>
        <div class="flex items-center gap-2 text-sm text-white/70">
          <select
            v-model="filterStatus"
            class="rounded bg-white/10 border border-white/20 px-2 py-1 text-sm"
            @change="loadCodes"
          >
            <option value="all">
              All
            </option>
            <option value="active">
              Active
            </option>
            <option value="inactive">
              Inactive
            </option>
          </select>
          <input
            v-model="filterQuery"
            placeholder="Search code/name"
            class="rounded bg-white/10 border border-white/20 px-2 py-1 text-sm placeholder:text-gray-400"
            @input="applyFilters"
          >
          <button
            class="w-9 h-9 grid place-items-center rounded bg-white/8 border border-white/15"
            :disabled="loadingCodes"
            title="Refresh codes"
            @click="loadCodes"
          >
            <svg
              v-if="!loadingCodes"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M21 12a9 9 0 1 1-9-9"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M21 3v6h-6"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg
              v-else
              class="w-4 h-4 animate-spin text-white/80"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="2"
                stroke-opacity="0.25"
              />
              <path
                d="M22 12a10 10 0 0 1-10 10"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <div>
            Total: {{ filteredCodes.length }}
          </div>
        </div>
      </div>
      <div
        v-if="loadingCodes"
        class="text-white/70"
      >
        Loading…
      </div>
      <div
        v-else-if="!filteredCodes.length"
        class="text-white/60"
      >
        No promotion codes found.
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="min-w-full text-sm">
          <thead class="text-left text-white/70">
            <tr>
              <th class="px-3 py-2">
                Code
              </th>
              <th class="px-3 py-2">
                Coupon
              </th>
              <th class="px-3 py-2">
                Status
              </th>
              <th class="px-3 py-2">
                Redemptions
              </th>
              <th class="px-3 py-2">
                Expires
              </th>
              <th class="px-3 py-2 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pc in filteredCodes"
              :key="pc.id"
              class="border-t border-white/10"
            >
              <td class="px-3 py-2 text-white">
                {{ pc.code }}
              </td>
              <td class="px-3 py-2 text-white/80">
                <div>{{ pc.coupon?.name || pc.coupon?.id }}</div>
                <div class="text-xs text-white/60">
                  <span v-if="pc.coupon?.percent_off">-{{ pc.coupon.percent_off }}%</span>
                  <span v-if="pc.coupon?.amount_off">-${{ (pc.coupon.amount_off / 100).toFixed(2) }}</span>
                </div>
              </td>
              <td class="px-3 py-2 text-white/80">
                <span :class="pc.active ? 'text-emerald-300' : 'text-white/60'">
                  {{ pc.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-3 py-2 text-white/80">
                {{ pc.times_redeemed || 0 }}<span v-if="pc.max_redemptions"> / {{ pc.max_redemptions }}</span>
              </td>
              <td class="px-3 py-2 text-white/80">
                {{ pc.expires_at ? new Date(pc.expires_at).toLocaleDateString() : '—' }}
              </td>
              <td class="px-3 py-2 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    class="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs"
                    :disabled="updatingPromo === pc.id"
                    @click="togglePromoActive(pc)"
                  >
                    {{ pc.active ? 'Disable' : 'Enable' }}
                  </button>
                  <button
                    class="px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-100 text-xs"
                    :disabled="updatingPromo === pc.id"
                    @click="expirePromo(pc)"
                  >
                    Expire
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="p-4 rounded-2xl bg-white/6 border border-white/10 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-0.5">
          <h2 class="text-lg font-medium">
            Webhook events
          </h2>
          <p class="text-sm text-white/70">
            Inspect, filter, and replay Stripe webhook deliveries.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-sm text-white/80">
          <label class="flex items-center gap-1">
            Status
            <select
              v-model="eventsStatus"
              class="rounded bg-white/10 border border-white/20 px-2 py-1 text-sm"
              @change="eventsPage=1; loadEvents()"
            >
              <option value="">All</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
          </label>
          <input
            v-model="eventsProjectId"
            placeholder="Project ID (optional)"
            class="rounded bg-white/10 border border-white/20 px-2 py-1 text-sm placeholder:text-gray-400"
            @change="eventsPage=1; loadEvents()"
          >
          <label class="flex items-center gap-1">
            From
            <input
              v-model="eventsFrom"
              type="date"
              class="rounded bg-white/10 border border-white/20 px-2 py-1 text-sm"
              @change="eventsPage=1; loadEvents()"
            >
          </label>
          <label class="flex items-center gap-1">
            To
            <input
              v-model="eventsTo"
              type="date"
              class="rounded bg-white/10 border border-white/20 px-2 py-1 text-sm"
              @change="eventsPage=1; loadEvents()"
            >
          </label>
          <button
            class="px-3 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15"
            :disabled="eventsLoading"
            @click="loadEvents"
          >
            Refresh
          </button>
        </div>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <button
          class="px-2 py-1 rounded bg-white/8 border border-white/15"
          :disabled="eventsPage<=1 || eventsLoading"
          @click="prevEvents"
        >
          Prev
        </button>
        <div class="text-white/70">
          Page {{ eventsPage }} / {{ Math.max(1, Math.ceil(eventsTotal / eventsLimit)) }}
        </div>
        <button
          class="px-2 py-1 rounded bg-white/8 border border-white/15"
          :disabled="eventsPage >= Math.ceil(eventsTotal / eventsLimit) || eventsLoading"
          @click="nextEvents"
        >
          Next
        </button>
        <select
          v-model.number="eventsLimit"
          class="px-2 py-1 rounded bg-white/10 border border-white/20 text-sm"
          @change="eventsPage=1; loadEvents()"
        >
          <option :value="10">
            10
          </option>
          <option :value="25">
            25
          </option>
          <option :value="50">
            50
          </option>
          <option :value="100">
            100
          </option>
        </select>
      </div>
      <div
        v-if="eventsLoading"
        class="text-white/70"
      >
        Loading events…
      </div>
      <div
        v-else-if="!webhookEvents.length"
        class="text-white/60"
      >
        No events found.
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="min-w-full text-sm">
          <thead class="text-left text-white/70">
            <tr>
              <th class="px-3 py-2">
                Type
              </th>
              <th class="px-3 py-2">
                Status
              </th>
              <th class="px-3 py-2">
                Project
              </th>
              <th class="px-3 py-2">
                Received
              </th>
              <th class="px-3 py-2">
                Attempts
              </th>
              <th class="px-3 py-2">
                Event ID
              </th>
              <th class="px-3 py-2 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="ev in webhookEvents"
              :key="ev.eventId"
              class="border-t border-white/10"
            >
              <td class="px-3 py-2 text-white">
                {{ ev.type }}
              </td>
              <td class="px-3 py-2">
                <span :class="ev.status === 'failed' ? 'text-red-300' : ev.status === 'processed' ? 'text-emerald-300' : 'text-white/80'">
                  {{ ev.status }}
                </span>
              </td>
              <td class="px-3 py-2 text-white/80">
                {{ ev.projectId || '—' }}
              </td>
              <td class="px-3 py-2 text-white/80">
                {{ ev.receivedAt ? new Date(ev.receivedAt).toLocaleString() : '—' }}
              </td>
              <td class="px-3 py-2 text-white/80">
                {{ ev.attempts || 1 }}
              </td>
              <td class="px-3 py-2 text-white/70 truncate max-w-xs">
                {{ ev.eventId }}
              </td>
              <td class="px-3 py-2 text-right">
                <button
                  class="px-3 py-1 rounded bg-white/10 border border-white/20 text-xs"
                  :disabled="replaying === ev.eventId"
                  @click="replayEvent(ev.eventId)"
                >
                  {{ replaying === ev.eventId ? 'Replaying…' : 'Replay' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="eventsError"
        class="text-sm text-red-300"
      >
        {{ eventsError }}
      </div>

      <div class="pt-2 border-t border-white/10">
        <h3 class="text-base font-semibold mb-2">
          Backfill invoices/charges
        </h3>
        <div class="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <input
            v-model="backfillProjectId"
            placeholder="Project ID"
            class="rounded bg-white/10 border border-white/20 px-3 py-2 text-sm placeholder:text-gray-400"
          >
          <button
            class="px-4 py-2 rounded bg-blue-600 text-white text-sm"
            :disabled="backfilling || !backfillProjectId"
            @click="runBackfill"
          >
            {{ backfilling ? 'Backfilling…' : 'Backfill now' }}
          </button>
          <div
            v-if="backfillResult"
            class="text-sm text-white/80"
          >
            {{ backfillResult }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import http from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'
import { useUiStore } from '../../stores/ui'
import BreadCrumbs from '../../components/BreadCrumbs.vue'

const ui = useUiStore()

const codes = ref<any[]>([])
const loadingCodes = ref(false)
const creating = ref(false)
const error = ref<string | null>(null)
const issuingCredit = ref(false)
const creditError = ref<string | null>(null)
const filterStatus = ref('all')
const filterQuery = ref('')
const filteredCodes = ref<any[]>([])
const updatingPromo = ref<string | null>(null)
// Local confirm modal state
const confirmOpen = ref(false)
const confirmMessage = ref('')
const confirmTitle = ref('Confirm')
const confirmResolver = ref<null | ((val: boolean) => void)>(null)
const emailSuggestions = ref<any[]>([])
const emailLookupLoading = ref(false)
// Webhook events state
const webhookEvents = ref<any[]>([])
const eventsLoading = ref(false)
const eventsError = ref<string | null>(null)
const eventsStatus = ref('')
const eventsProjectId = ref('')
const eventsFrom = ref('')
const eventsTo = ref('')
const eventsLimit = ref(25)
const eventsPage = ref(1)
const eventsTotal = ref(0)
const replaying = ref<string | null>(null)
// Backfill state
const backfillProjectId = ref('')
const backfilling = ref(false)
const backfillResult = ref('')

const form = ref({
  code: '',
  name: '',
  amount_off: null as any,
  percent_off: null as any,
  currency: 'usd',
  duration: 'once',
  duration_in_months: null as any,
  max_redemptions: null as any,
  expires_at: '',
  priceId: '',
  productsCsv: ''
})

const credit = ref({
  email: '',
  customerId: '',
  amount: null as any,
  currency: 'usd',
  description: ''
})

async function loadCodes() {
  try {
    loadingCodes.value = true
    const { data } = await http.get('/api/admin/billing/promotion-codes', { headers: getAuthHeaders() })
    codes.value = Array.isArray(data?.items) ? data.items : []
    applyFilters()
  } catch (e: any) {
    error.value = e?.response?.data?.error || 'Failed to load codes'
  } finally {
    loadingCodes.value = false
  }
}

function applyFilters() {
  const q = filterQuery.value.trim().toLowerCase()
  filteredCodes.value = (codes.value || []).filter((pc: any) => {
    if (filterStatus.value === 'active' && !pc.active) return false
    if (filterStatus.value === 'inactive' && pc.active) return false
    if (q) {
      const code = String(pc.code || '').toLowerCase()
      const name = String(pc.coupon?.name || '').toLowerCase()
      if (!code.includes(q) && !name.includes(q)) return false
    }
    return true
  })
}

async function createCode() {
  try {
    creating.value = true
    error.value = null
    // Basic validation
    if (!form.value.code) {
      error.value = 'Code is required'
      return
    }
    if (!form.value.percent_off && !form.value.amount_off) {
      error.value = 'Provide percent_off or amount_off'
      return
    }
    if (form.value.duration === 'repeating' && !form.value.duration_in_months) {
      error.value = 'Duration in months is required for repeating coupons'
      return
    }

    const products = (form.value.productsCsv || '')
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)

    const payload: any = {
      code: form.value.code,
      name: form.value.name,
      amount_off: form.value.amount_off ? Number(form.value.amount_off) : undefined,
      percent_off: form.value.percent_off ? Number(form.value.percent_off) : undefined,
      currency: form.value.currency,
      duration: form.value.duration,
      duration_in_months: form.value.duration_in_months ? Number(form.value.duration_in_months) : undefined,
      max_redemptions: form.value.max_redemptions ? Number(form.value.max_redemptions) : undefined,
      expires_at: form.value.expires_at || undefined,
      applies_to: form.value.priceId ? { priceId: form.value.priceId } : (products.length ? { products } : undefined),
    }
    await http.post('/api/admin/billing/promotion-codes', payload, { headers: getAuthHeaders() })
    ui.showSuccess('Promotion code created')
    await loadCodes()
    form.value = { code: '', name: '', amount_off: null, percent_off: null, currency: 'usd', duration: 'once', duration_in_months: null, max_redemptions: null, expires_at: '', priceId: '', productsCsv: '' }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to create code'
    error.value = msg
    ui.showError(msg)
  } finally {
    creating.value = false
  }
}

async function issueCredit() {
  try {
    issuingCredit.value = true
    creditError.value = null
    if (!credit.value.email && !credit.value.customerId) {
      creditError.value = 'Provide user email or customer ID'
      return
    }
    const payload: any = {
      email: credit.value.email || undefined,
      customerId: credit.value.customerId || undefined,
      amount: credit.value.amount,
      currency: credit.value.currency,
      description: credit.value.description,
    }
    await http.post('/api/admin/billing/credits', payload, { headers: getAuthHeaders() })
    ui.showSuccess('Credit issued')
    credit.value = { email: '', customerId: '', amount: null, currency: 'usd', description: '' }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to issue credit'
    creditError.value = msg
    ui.showError(msg)
  } finally {
    issuingCredit.value = false
  }
}

async function togglePromoActive(pc: any) {
  try {
    if (!pc || !pc.id) return
    const ok = await askConfirm(
      pc.active ? 'Disable promotion' : 'Enable promotion',
      pc.active ? `Disable promotion code ${pc.code}?` : `Enable promotion code ${pc.code}?`
    )
    if (!ok) return
    updatingPromo.value = pc.id
    const nextActive = !pc.active
    await http.patch(`/api/admin/billing/promotion-codes/${pc.id}`, { active: nextActive }, { headers: getAuthHeaders() })
    await loadCodes()
    ui.showSuccess(nextActive ? 'Promotion enabled' : 'Promotion disabled')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to update promotion')
  } finally {
    updatingPromo.value = null
  }
}

async function expirePromo(pc: any, opts: { silent?: boolean } = {}) {
  try {
    if (!pc || !pc.id) return
    if (!opts.silent) {
      const ok = await askConfirm('Expire promotion', `Expire promotion code ${pc.code}? This cannot be undone.`)
      if (!ok) return
    }
    updatingPromo.value = pc.id
    const used = pc.times_redeemed || 0
    await http.patch(`/api/admin/billing/promotion-codes/${pc.id}`, { active: false, max_redemptions: used }, { headers: getAuthHeaders() })
    await loadCodes()
    if (!opts.silent) ui.showSuccess('Promotion expired')
  } catch (e: any) {
    if (!opts.silent) ui.showError(e?.response?.data?.error || e?.message || 'Failed to expire promotion')
  } finally {
    updatingPromo.value = null
  }
}

function askConfirm(title: string, message: string): Promise<boolean> {
  confirmTitle.value = title || 'Confirm'
  confirmMessage.value = message
  confirmOpen.value = true
  return new Promise((resolve) => {
    confirmResolver.value = (val: boolean) => {
      confirmOpen.value = false
      resolve(val)
      confirmResolver.value = null
    }
  })
}

function confirmYes() {
  if (confirmResolver.value) confirmResolver.value(true)
}
function confirmNo() {
  if (confirmResolver.value) confirmResolver.value(false)
}

async function onEmailInput() {
  try {
    emailSuggestions.value = []
    if (!credit.value.email || String(credit.value.email).trim().length < 3) return
    emailLookupLoading.value = true
    const q = String(credit.value.email).trim()
    const { data } = await http.get('/api/admin/users', { params: { q, limit: 5 }, headers: getAuthHeaders() })
    const users = Array.isArray(data?.users) ? data.users : []
    emailSuggestions.value = users.map((u: any) => ({
      _id: u._id,
      email: u.email,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ')
    }))
  } catch (e) {
    // ignore autocomplete errors
  } finally {
    emailLookupLoading.value = false
  }
}

function selectEmail(u: any) {
  credit.value.email = u.email
  emailSuggestions.value = []
}

async function loadEvents() {
  try {
    eventsLoading.value = true
    eventsError.value = null
    const params: any = { limit: eventsLimit.value, skip: (eventsPage.value - 1) * eventsLimit.value }
    if (eventsStatus.value) params.status = eventsStatus.value
    if (eventsProjectId.value) params.projectId = eventsProjectId.value
    if (eventsFrom.value) params.date_from = eventsFrom.value
    if (eventsTo.value) params.date_to = eventsTo.value
    const { data } = await http.get('/api/admin/webhook-events', { params, headers: getAuthHeaders() })
    const evs = Array.isArray(data?.events) ? data.events : []
    eventsTotal.value = Number(data?.total || evs.length || 0)
    webhookEvents.value = evs.map((ev: any) => ({
      ...ev,
      projectId: ev?.meta?.raw?.data?.object?.metadata?.projectId || ev?.meta?.raw?.data?.object?.metadata?.projectID || null
    }))
  } catch (e: any) {
    eventsError.value = e?.response?.data?.error || e?.message || 'Failed to load events'
  } finally {
    eventsLoading.value = false
  }
}

function prevEvents() {
  if (eventsPage.value <= 1) return
  eventsPage.value -= 1
  loadEvents()
}
function nextEvents() {
  if (eventsPage.value >= Math.ceil(eventsTotal.value / eventsLimit.value)) return
  eventsPage.value += 1
  loadEvents()
}

async function replayEvent(eventId: string) {
  if (!eventId) return
  try {
    replaying.value = eventId
    await http.post(`/api/admin/webhook-events/${eventId}/replay`, {}, { headers: getAuthHeaders() })
    ui.showSuccess('Replay triggered')
    await loadEvents()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Replay failed')
  } finally {
    replaying.value = null
  }
}

async function runBackfill() {
  if (!backfillProjectId.value) return
  try {
    backfilling.value = true
    backfillResult.value = ''
    const { data } = await http.post(`/api/admin/billing/backfill/${backfillProjectId.value}`, {}, { headers: getAuthHeaders() })
    backfillResult.value = `Invoices: ${data?.invoices || 0}, Charges: ${data?.charges || 0}`
    ui.showSuccess('Backfill completed')
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Backfill failed'
    backfillResult.value = msg
    ui.showError(msg)
  } finally {
    backfilling.value = false
  }
}

onMounted(() => {
  loadCodes()
  loadEvents()
})
</script>
