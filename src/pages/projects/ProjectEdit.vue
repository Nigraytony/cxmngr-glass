<template>
  <section class="space-y-6 relative">
    <!-- global Toast is mounted in App.vue; toasts will be triggered via the ui store -->

    <div>
      <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }, { text: 'Projects', to: '/projects' }, { text: 'Edit Project', to: '#' }]" />
    </div>

    <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10">
      <div class="mt-4">
        <!-- Top tabs (evenly spaced) -->
        <div class="flex w-full mb-4 border-b border-white/10 pb-3">
          <button
            :class="tabClass('info')"
            class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
            @click="activeTab = 'info'"
          >
            <span class="i">ℹ️</span>
            <span>Info</span>
          </button>

          <button
            :class="tabClass('team')"
            class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
            @click="activeTab = 'team'"
          >
            <span class="i">👥</span>
            <span>Team</span>
          </button>

          <button
            :class="tabClass('logo')"
            class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
            @click="activeTab = 'logo'"
          >
            <span class="i">🖼️</span>
            <span>Logo</span>
          </button>

          <button
            :class="tabClass('subscription')"
            class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
            @click="activeTab = 'subscription'"
          >
            <span class="i">💳</span>
            <span>Subscription</span>
          </button>

          <button
            :class="tabClass('settings')"
            class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
            @click="activeTab = 'settings'"
          >
            <span class="i">⚙️</span>
            <span>Settings</span>
          </button>

          <button
            :class="tabClass('logs')"
            class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center"
            @click="activeTab = 'logs'"
          >
            <span class="i">📝</span>
            <span>Logs</span>
          </button>
        </div>

        <div>
          <div
            v-if="!project"
            class="p-4 text-white/70"
          >
            Loading project...
          </div>
          <div v-else>
            <div v-show="activeTab === 'info'">
              <ProjectForm
                v-model="project"
                :errors="formErrors"
              />
            </div>

            <div v-show="activeTab === 'team'">
              <h3 class="text-md font-medium mb-2">
                Team
              </h3>
              <p class="text-sm text-white/70 mb-4">
                Manage team membership and roles for this project.
              </p>
              <div class="space-y-2">
                <div
                  v-for="member in (project.team || [])"
                  :key="member._id || member.email"
                  class="p-3 rounded bg-white/5"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-medium">
                        {{ member.firstName }} {{ member.lastName }}
                      </div>
                      <div class="text-xs text-white/70">
                        {{ member.email }} • {{ member.role }}
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <!-- Status badge (invited, rejected, active, etc.) -->
                      <div
                        v-if="member.status || member.inviteStatus"
                        :class="['text-xs px-2 py-1 rounded', statusBadgeClass(member.status || member.inviteStatus)]"
                      >
                        {{ (member.status || member.inviteStatus) ? (member.status || member.inviteStatus) : 'status' }}
                      </div>
                      <div class="flex gap-2">
                        <button
                          class="px-3 py-1 rounded bg-red-500/20 text-red-400"
                          @click="removeMember(member)"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pt-2">
                  <h4 class="font-medium mb-2">
                    Add member
                  </h4>
                  <div class="grid grid-cols-1 gap-2">
                    <!-- Row 1: First / Last -->
                    <div class="grid grid-cols-2 gap-2">
                      <input
                        v-model="newMember.firstName"
                        placeholder="First"
                        class="rounded p-2 bg-white/5 w-full"
                      >
                      <input
                        v-model="newMember.lastName"
                        placeholder="Last"
                        class="rounded p-2 bg-white/5 w-full"
                      >
                    </div>

                    <!-- Row 2: Email / Company / Role -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        v-model="newMember.email"
                        placeholder="Email"
                        class="rounded p-2 bg-white/5 w-full"
                      >
                      <input
                        v-model="newMember.company"
                        placeholder="Company"
                        class="rounded p-2 bg-white/5 w-full"
                      >
                      <select
                        v-model="newMember.role"
                        class="rounded p-2 bg-white/5 w-full"
                      >
                        <option value="admin">
                          admin
                        </option>
                        <option value="CxA">
                          CxA
                        </option>
                        <option value="GC">
                          GC
                        </option>
                        <option value="CM">
                          CM
                        </option>
                        <option value="Architect">
                          Architect
                        </option>
                        <option value="Designer">
                          Designer
                        </option>
                        <option value="Mechanical Contractor">
                          Mechanical Contractor
                        </option>
                        <option value="Electrical Contractor">
                          Electrical Contractor
                        </option>
                        <option value="Plumbing Contractor">
                          Plumbing Contractor
                        </option>
                        <option value="Controls Contractor">
                          Controls Contractor
                        </option>
                        <option value="Life Safety Contractor">
                          Life Safety Contractor
                        </option>
                        <option value="Other Contractor">
                          Other Contractor
                        </option>
                        <option value="Client">
                          Client
                        </option>
                        <option value="User">
                          User
                        </option>
                      </select>
                    </div>

                    <div class="text-right">
                      <button
                        class="px-3 py-1 rounded bg-white/6"
                        @click="addMember"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'logo'">
              <h3 class="text-md font-medium mb-2">
                Logos
              </h3>
              <p class="text-sm text-white/70 mb-4">
                Manage both Client and Commissioning Agent logos. These are stored like user avatars (as URLs or data URIs).
              </p>

              <!-- Client Logo -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="rounded-lg p-4 bg-white/5 border border-white/10">
                  <div class="font-medium mb-2">
                    Client logo
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="w-28 h-28 rounded bg-white/6 flex items-center justify-center overflow-hidden border border-white/10">
                      <img
                        v-if="project.logo"
                        :src="project.logo"
                        alt="client logo"
                        class="object-contain w-full h-full"
                      >
                      <div
                        v-else
                        class="text-white/60 text-xs"
                      >
                        No logo
                      </div>
                    </div>
                    <div>
                      <input
                        ref="clientFileInput"
                        type="file"
                        accept="image/*"
                        @change="onClientLogoSelected"
                      >
                      <div class="mt-2 flex gap-2">
                        <button
                          class="px-3 py-1 rounded bg-red-500/20 text-red-400"
                          @click="removeClientLogo"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Commissioning Agent Logo -->
                <div class="rounded-lg p-4 bg-white/5 border border-white/10">
                  <div class="font-medium mb-2">
                    Commissioning Agent logo
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="w-28 h-28 rounded bg-white/6 flex items-center justify-center overflow-hidden border border-white/10">
                      <img
                        v-if="(project.commissioning_agent && project.commissioning_agent.logo)"
                        :src="project.commissioning_agent.logo"
                        alt="cxa logo"
                        class="object-contain w-full h-full"
                      >
                      <div
                        v-else
                        class="text-white/60 text-xs"
                      >
                        No logo
                      </div>
                    </div>
                    <div>
                      <input
                        ref="cxaFileInput"
                        type="file"
                        accept="image/*"
                        @change="onCxaLogoSelected"
                      >
                      <div class="mt-2 flex gap-2">
                        <button
                          class="px-3 py-1 rounded bg-red-500/20 text-red-400"
                          @click="removeCxaLogo"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'subscription'">
              <h3 class="text-md font-medium mb-2">
                Subscription
              </h3>
              <div class="space-y-6">
                <h2 class="text-xl font-semibold">
                  Project Billing
                </h2>

                <div class="p-4 rounded-lg border">
                  <p><strong>Status:</strong> {{ status }}</p>
                  <p class="mt-2">
                    <strong>Plan:</strong> {{ planLabel }}
                  </p>
                  <p v-if="project.stripeCurrentPeriodEnd">
                    <strong>Current period end:</strong>
                    {{ new Date(project.stripeCurrentPeriodEnd).toLocaleString() }}
                  </p>
                  <p v-if="status === 'trialing' && trialEndDate">
                    <strong>Trial ends:</strong> {{ new Date(trialEndDate).toLocaleString() }}
                  </p>
                  <p v-if="status === 'trialing'">
                    <strong>Trial days left:</strong> {{ trialDaysLeft }}
                  </p>
                  <p
                    v-if="status === 'trialing'"
                    class="text-xs text-white/70 mt-1"
                  >
                    Trial end is fixed from when the project was created and does not change when switching plans.
                  </p>
                </div>

                <div class="p-4 rounded-lg border">
                  <label class="block text-sm font-medium mb-2">Choose a plan</label>
                  <div class="relative inline-block w-full">
                    <select
                      v-model="selectedPrice"
                      class="w-full appearance-none rounded-lg p-2 bg-white/5 border border-white/10 text-white backdrop-blur-md focus:ring-0 focus:border-white/20"
                    >
                      <option
                        v-for="p in prices"
                        :key="p.id"
                        :value="p.id"
                      >
                        {{ p.label }}
                      </option>
                    </select>
                    <!-- custom arrow -->
                    <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/70">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M6 8l4 4 4-4"
                          stroke="currentColor"
                          stroke-width="1.75"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                  </div>

                  <div class="mt-2">
                    <span
                      v-if="project && project.stripePriceId && project.stripePriceId === selectedPrice"
                      class="inline-block px-2 py-1 text-xs bg-white/10 rounded-full"
                    >Current plan</span>
                  </div>

                  <!-- Selected plan details -->
                  <div
                    v-if="selectedPlanDetails"
                    class="mt-4 p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div class="flex items-center justify-between">
                      <div class="font-medium text-white">
                        {{ selectedPlanDetails.name }}
                      </div>
                      <div class="text-white/80">
                        {{ selectedPlanDetails.price }}
                      </div>
                    </div>
                    <p
                      v-if="selectedPlanDetails.summary"
                      class="text-sm text-white/70 mt-1"
                    >
                      {{ selectedPlanDetails.summary }}
                    </p>
                    <ul
                      v-if="selectedPlanDetails.features && selectedPlanDetails.features.length"
                      class="mt-2 list-disc list-inside text-white/80 text-sm space-y-1"
                    >
                      <li
                        v-for="(f, i) in selectedPlanDetails.features"
                        :key="i"
                      >
                        {{ f }}
                      </li>
                    </ul>
                  </div>

                  <div class="mt-4 flex gap-3">
                    <button
                      :disabled="loading"
                      class="px-4 py-2 rounded bg-blue-600 text-white"
                      @click="startCheckout"
                    >
                      {{ loading ? '...' : 'Subscribe / Update' }}
                    </button>

                    

                    <button
                      :disabled="loading"
                      class="px-4 py-2 rounded border"
                      @click="openBillingPortal"
                    >
                      Manage billing
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'settings'">
              <h3 class="text-md font-medium mb-2">
                Settings
              </h3>
              <p class="text-sm text-white/70 mb-4">
                Project-specific settings and flags.
              </p>
              <div class="rounded p-3 bg-white/5">
                <label class="flex items-center gap-2"><input
                  v-model="project.settingsEnabled"
                  type="checkbox"
                > Enable special behavior</label>
                <div class="mt-4">
                  <label class="block text-white/80 mb-1">Tags (comma separated)</label>
                  <input
                    v-model="tagsText"
                    class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"
                  >
                </div>
                <div class="mt-4">
                  <label class="block text-white/80 mb-1">Search mode</label>
                  <div class="relative inline-block w-full max-w-sm">
                    <select
                      v-model="project.searchMode"
                      class="w-full appearance-none rounded-lg p-2 bg-white/5 border border-white/10 text-white backdrop-blur-md focus:ring-0 focus:border-white/20"
                    >
                      <option value="substring">
                        Substring
                      </option>
                      <option value="exact">
                        Exact
                      </option>
                      <option value="fuzzy">
                        Fuzzy
                      </option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/70">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M6 8l4 4 4-4"
                          stroke="currentColor"
                          stroke-width="1.75"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <p class="text-xs text-white/60 mt-1">
                    This setting controls how search filters work across list pages (Issues, Projects, Spaces, Activities).
                  </p>
                </div>
                <div class="mt-4">
                  <label class="block text-white/80 mb-1">Issues per page</label>
                  <div class="relative inline-block w-full max-w-sm">
                    <select
                      v-model.number="issuesPageSizeLocal"
                      class="w-full appearance-none rounded-lg p-2 bg-white/5 border border-white/10 text-white backdrop-blur-md focus:ring-0 focus:border-white/20"
                      @change="persistIssuesPageSize()"
                    >
                      <option :value="5">
                        5
                      </option>
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
                    <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/70">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                      >
                        <path
                          d="M6 8l4 4 4-4"
                          stroke="currentColor"
                          stroke-width="1.75"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <p class="text-xs text-white/60 mt-1">
                    Applies to the Issues list for this project. Saved locally.
                  </p>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'logs'">
              <h3 class="text-md font-medium mb-2">
                Project Logs
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 items-stretch">
                <input
                  v-model="logsSearch"
                  placeholder="Search logs…"
                  class="px-3 py-2 rounded bg-white/5 border border-white/10 w-full md:col-span-2"
                >
                <div class="relative">
                  <select
                    v-model="selectedType"
                    class="w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-white/90"
                  >
                    <option value="">
                      All types
                    </option>
                    <option
                      v-for="t in allTypes"
                      :key="t"
                      :value="t"
                    >
                      {{ t }}
                    </option>
                  </select>
                </div>
                <input
                  v-model="startDateText"
                  type="datetime-local"
                  class="px-3 py-2 rounded bg-white/5 border border-white/10 w-full"
                >
                <input
                  v-model="endDateText"
                  type="datetime-local"
                  class="px-3 py-2 rounded bg-white/5 border border-white/10 w-full"
                >
              </div>
              <div class="flex items-center gap-2 mb-3">
                <button
                  class="px-3 py-2 rounded bg-white/10 border border-white/20"
                  @click="loadLogs"
                >
                  Refresh
                </button>
                <button
                  class="px-3 py-2 rounded bg-white/10 border border-white/20"
                  @click="loadMore"
                >
                  Load more ({{ logsLimit + 200 }})
                </button>
                <button
                  class="ml-auto px-3 py-2 rounded bg-white/10 border border-white/20"
                  @click="exportCsv"
                >
                  Export CSV
                </button>
              </div>
              <div
                v-if="!logs.length"
                class="text-white/60"
              >
                No logs yet.
              </div>
              <ul
                v-else
                class="space-y-1"
              >
                <li
                  v-for="(e, i) in filteredLogs"
                  :key="i"
                  class="p-2 rounded bg-white/5 border border-white/10"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-xs text-white/70">
                      {{ fmt(e.ts) }}
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="text-[11px] px-1.5 py-0.5 rounded bg-white/10 border border-white/20">
                        {{ e.type }}
                      </div>
                      <div
                        v-if="e.by"
                        class="text-xs text-white/70"
                      >
                        by {{ e.by }}
                      </div>
                    </div>
                  </div>
                  <div class="mt-1 text-sm truncate">
                    <span
                      v-if="e.scope && e.scope.equipmentTag"
                      class="text-white/80"
                    >{{ e.scope.equipmentTag }}</span>
                    <span
                      v-else-if="e.scope && e.scope.equipmentId"
                      class="text-white/70"
                    >Eq#{{ e.scope.equipmentId }}</span>
                    <span
                      v-if="e.section && (e.section.number || e.section.title)"
                      class="text-white/60"
                    > • Sec {{ e.section.number }} {{ e.section.title ? '– ' + e.section.title : '' }}</span>
                    <span
                      v-if="e.question && (e.question.number || e.question.text)"
                      class="text-white/60"
                    > • Q{{ e.question.number }} {{ e.question.text ? '– ' + e.question.text : '' }}</span>
                    <span
                      v-if="!e.by"
                      class="text-white/60"
                    >&nbsp;</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-6 text-right">
            <button
              :disabled="saving"
              class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2"
              :class="saving ? 'opacity-60 cursor-not-allowed' : ''"
              @click="save"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <path
                  d="M5 13l4 4L19 7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ProjectForm from '../../components/ProjectForm.vue'
import { useUiStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { useProjectStore } from '../../stores/project'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import http from '../../utils/http'
import { apiUrl } from '../../utils/api'
import { getAuthHeaders } from '../../utils/auth'
import { confirm as inlineConfirm } from '../../utils/confirm'

const projectStore = useProjectStore()
const route = useRoute()
const router = useRouter()

const projectId = route.params.id || route.query.id || null
const project = ref(null)
const activeTab = ref('info')
const logs = ref([])
const logsSearch = ref('')
const selectedType = ref('')
const startDateText = ref('')
const endDateText = ref('')
const logsLimit = ref(200)
const formErrors = ref({})
const ui = useUiStore()
const auth = useAuthStore()
const clientFileInput = ref(null)
const cxaFileInput = ref(null)
const newMember = ref({ email: '', firstName: '', lastName: '', company: '', role: 'User' })
const invites = ref([])
// use auth store token; fall back to localStorage if necessary

const tagsText = computed({
  get() { return (project.value && Array.isArray(project.value.tags)) ? project.value.tags.join(', ') : '' },
  set(v) { if (project.value) project.value.tags = v.split(',').map(s => s.trim()).filter(Boolean) }
})

// Issues per-page (local, per-project) preference UI
const issuesPageSizeLocal = ref(10)
const issuesPageSizeStorageKey = computed(() => {
  const id = (project.value && (project.value._id || project.value.id)) || projectId || 'global'
  return `issuesPageSize:${id}`
})
function loadIssuesPageSizeLocal() {
  try {
    const raw = localStorage.getItem(issuesPageSizeStorageKey.value)
    if (!raw) return
    const n = parseInt(raw, 10)
    if ([5, 10, 25, 50, 100].includes(n)) issuesPageSizeLocal.value = n
  } catch (e) { /* ignore localStorage read errors */ }
}
function persistIssuesPageSize() {
  try { localStorage.setItem(issuesPageSizeStorageKey.value, String(issuesPageSizeLocal.value)) } catch (e) { /* ignore localStorage write errors */ }
}
watch(issuesPageSizeStorageKey, () => loadIssuesPageSizeLocal(), { immediate: true })

function tabClass(t) {
  return activeTab.value === t ? 'bg-white/10 text-white font-medium' : 'bg-white/5 text-white/80'
}

// local showToast removed; use `ui.showSuccess` / `ui.showError` instead

onMounted(async () => {
  if (projectId) {
    try {
      const p = await projectStore.fetchProject(projectId)
      project.value = { ...p }
      if (!project.value.searchMode) project.value.searchMode = 'substring'
    } catch (e) {
      ui.showError('Failed to load project')
      router.push('/projects')
    }
  } else {
    // If no projectId provided, prefer the currentProject from the store (user default)
    if (projectStore.currentProject) {
      // Pinia unwraps refs on the store; access directly
      project.value = { ...projectStore.currentProject }
      if (!project.value.searchMode) project.value.searchMode = 'substring'
    }
    // Watch for the store to populate (async fetch) and set project when ready
    watch(projectStore.currentProject, (nv) => {
      if (!projectId && nv) { project.value = { ...nv }; if (!project.value.searchMode) project.value.searchMode = 'substring' }
    }, { immediate: true })
    // fallback: if after a short tick we still don't have a project, try reading selectedProjectId from localStorage and fetch directly
    await nextTick()
    if (!project.value && typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedProjectId')
      if (stored) {
        try {
          const p2 = await projectStore.fetchProject(stored)
          project.value = { ...p2 }
          if (!project.value.searchMode) project.value.searchMode = 'substring'
        } catch (e) {
          // silent
        }
      }
    }
  }
  // If returning from Stripe checkout, refresh project to pick up webhook updates
  if (route.query && route.query.checkout === 'success') {
    await refreshProject();
    ui.showSuccess('Subscription updated')
  } else if (route.query && route.query.checkout === 'cancel') {
    ui.showError('Checkout cancelled')
  }
  // load invites for the project
  await loadInvites()
})

async function loadInvites() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    if (!pid) return;
  const { data } = await http.get(`/api/projects/${pid}/invites`, { headers: getAuthHeaders() })
    invites.value = data || []
  } catch (err) {
    console.error('loadInvites error', err)
  }
}

async function resendInvite(inviteId) {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    if (!pid) return ui.showError('No project selected')
  await http.post(`/api/projects/${pid}/resend-invite`, { inviteId }, { headers: getAuthHeaders() })
    ui.showSuccess('Invitation resent')
    // reload invites to update timestamps
    await loadInvites()
  } catch (err) {
    console.error('resendInvite error', err)
    ui.showError(err?.response?.data?.error || 'Failed to resend invite')
  }
}

function fmt(d) { try { return d ? new Date(d).toLocaleString() : '' } catch { return String(d || '') } }
const allTypes = computed(() => {
  const set = new Set()
  for (const e of (logs.value || [])) { if (e && e.type) set.add(String(e.type)) }
  return Array.from(set).sort()
})
const startDate = computed(() => {
  if (!startDateText.value) return null
  try { return new Date(startDateText.value) } catch { return null }
})
const endDate = computed(() => {
  if (!endDateText.value) return null
  try { return new Date(endDateText.value) } catch { return null }
})
const filteredLogs = computed(() => {
  const q = (logsSearch.value || '').toLowerCase()
  const type = (selectedType.value || '').toLowerCase()
  const sdt = startDate.value ? startDate.value.getTime() : null
  const edt = endDate.value ? endDate.value.getTime() : null
  return (logs.value || []).filter((e) => {
    // type filter
    if (type && String(e.type || '').toLowerCase() !== type) return false
    // date range filter (inclusive)
    if (sdt) { const et = e && e.ts ? new Date(e.ts).getTime() : 0; if (et && et < sdt) return false }
    if (edt) { const et = e && e.ts ? new Date(e.ts).getTime() : 0; if (et && et > edt) return false }
    // search filter
    if (!q) return true
    return JSON.stringify(e).toLowerCase().includes(q)
  })
})
async function loadLogs() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return
  const opts = { limit: logsLimit.value }
    if (selectedType.value) opts.type = selectedType.value
    const list = await projectStore.fetchProjectLogs(String(pid), opts)
    logs.value = Array.isArray(list) ? list : []
  } catch (err) {
    // noop
  }
}

function loadMore() {
  logsLimit.value += 200
  loadLogs()
}

function exportCsv() {
  const headers = ['ts','by','type','equipmentTag','equipmentId','sectionNumber','sectionTitle','questionNumber','questionText']
  const rows = filteredLogs.value.map((e) => [
    e.ts || '',
    e.by || '',
    e.type || '',
    (e.scope && e.scope.equipmentTag) || '',
    (e.scope && e.scope.equipmentId) || '',
    (e.section && (e.section.number ?? '')) || '',
    (e.section && (e.section.title || '')) || '',
    (e.question && (e.question.number ?? '')) || '',
    (e.question && (e.question.text || '')) || '',
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => {
      const s = String(v ?? '')
      if (s.includes('"') || s.includes(',') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `project-logs-${new Date().toISOString().slice(0,19)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Lazy-load logs when tab is opened
watch(activeTab, (t) => { if (t === 'logs' && !logs.value.length) loadLogs() })
// Reload logs when type filter changes (server-side filter), reset limit
watch(selectedType, () => { logsLimit.value = 200; loadLogs() })

function removeMember(m) {
  project.value.team = (project.value.team || []).filter(tm => (tm._id || tm.email) !== (m._id || m.email))
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'invited' || s === 'pending') return 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
  if (s === 'rejected' || s === 'declined') return 'bg-gray-600/20 text-gray-200 border border-gray-600/30'
  if (s === 'active' || s === 'accepted' || s === 'member') return 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
  return 'bg-white/6 text-white/80 border border-white/10'
}

async function addMember() {
  if (!newMember.value.email) return ui.showError('Email required')
  // do not provide _id here; let the backend/mongoose generate a proper ObjectId for subdocs
  const member = { ...newMember.value }
  // Prefer calling the dedicated addUser API so the server can create an Invitation
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id))
    if (!pid) return ui.showError('No project selected')
    const payload = {
      projectId: pid,
      email: (newMember.value.email || '').trim(),
      firstName: newMember.value.firstName || '',
      lastName: newMember.value.lastName || '',
      company: newMember.value.company || '',
      role: newMember.value.role || 'User'
    }
    const { data } = await http.post('/api/projects/addUser', payload, { headers: getAuthHeaders() })
    // If backend added user directly or created an invite, refresh project and invites
    await refreshProject()
    await loadInvites()
    ui.showSuccess(data && data.message ? data.message : 'Member added')
  } catch (err) {
    console.error('addMember error', err)
    const serverData = err?.response?.data
    const msg = serverData ? (typeof serverData === 'string' ? serverData : (serverData.error || JSON.stringify(serverData))) : (err?.message || 'Failed to add member')
    ui.showError(msg)
  } finally {
    newMember.value = { email: '', firstName: '', lastName: '', company: '', role: 'User' }
  }
}

function ensureCommissioningAgent() {
  if (!project.value) return
  if (!project.value.commissioning_agent) project.value.commissioning_agent = {}
}

async function onClientLogoSelected(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  // quick client-side preview
  const reader = new FileReader()
  reader.onload = async (ev) => {
    project.value.logo = ev.target.result
    try {
      await projectStore.updateProject({ ...project.value })
      ui.showSuccess('Client logo saved')
    } catch (err) {
      ui.showError('Failed to save client logo')
    }
  }
  reader.readAsDataURL(f)
}

async function onCxaLogoSelected(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  ensureCommissioningAgent()
  const reader = new FileReader()
  reader.onload = async (ev) => {
    project.value.commissioning_agent.logo = ev.target.result
    try {
      await projectStore.updateProject({ ...project.value })
      ui.showSuccess('Commissioning Agent logo saved')
    } catch (err) {
      ui.showError('Failed to save CxA logo')
    }
  }
  reader.readAsDataURL(f)
}

async function removeClientLogo() {
  project.value.logo = ''
  try {
    await projectStore.updateProject({ ...project.value })
    ui.showSuccess('Client logo removed')
  } catch (err) {
    ui.showError('Failed to remove client logo')
  }
}

async function removeCxaLogo() {
  ensureCommissioningAgent()
  project.value.commissioning_agent.logo = ''
  try {
    await projectStore.updateProject({ ...project.value })
    ui.showSuccess('CxA logo removed')
  } catch (err) {
    ui.showError('Failed to remove CxA logo')
  }
}

const saving = ref(false)
async function save() {
  if (saving.value) return
  try {
    saving.value = true
    await projectStore.updateProject(project.value)
    ui.showSuccess('Saved')
  } catch (e) {
    ui.showError('Failed to save')
  } finally {
    saving.value = false
  }
}

// Your three monthly plan price IDs:
const prices = ref([]);
const selectedPrice = ref(null);
const loading = ref(false);

const status = computed(() => project.value?.stripeSubscriptionStatus || project.value?.status || 'trialing');
const planLabel = computed(() => {
  const id = project.value?.stripePriceId || selectedPrice.value;
  const p = (prices.value || []).find(x => x.id === id);
  return p ? p.label : (id || 'No plan');
});

// Plan details shown in the UI when a selection is made
const planDetailsById = ref({});

const selectedPlanDetails = computed(() => {
  const id = selectedPrice.value;
  if (!id) return null;
  const info = (planDetailsById.value && planDetailsById.value[id]) || null;
  if (info) return info;
  const p = (prices.value || []).find(x => x.id === id);
  if (!p) return null;
  // Fallback: derive name/price from label if not found in map
  const parts = String(p.label).split('–');
  return {
    name: parts[0]?.trim() || 'Selected Plan',
    price: parts[1]?.trim() || '',
    summary: '',
    features: []
  };
});

// Load plans from server and populate prices + details map
onMounted(async () => {
  try {
  const { data } = await http.get('/api/plans');
    const list = Array.isArray(data) ? data : [];
    prices.value = list.map(p => ({ id: p.priceId, label: p.label, key: p.key }));
    const details = {};
    for (const p of list) {
      // Derive name/price from label if not provided separately
      const parts = String(p.label || '').split('–');
      details[p.priceId] = {
        key: p.key,
        name: (p.name || parts[0] || 'Plan').toString().trim(),
        price: (p.price || (parts[1] || '')).toString().trim(),
        summary: p.summary || '',
        features: Array.isArray(p.features) ? p.features : [],
      };
    }
    planDetailsById.value = details;

    // Set default selection based on project or first plan
    if (project.value && (project.value.stripePriceId)) {
      selectedPrice.value = project.value.stripePriceId;
    } else if (prices.value.length) {
      selectedPrice.value = prices.value[0].id;
    }
  } catch (err) {
    // If fails, leave prices empty; UI will handle gracefully
    console.error('Failed to load plans', err);
  }
});

// Determine trial end date: prefer Stripe's current period end if trialing; else compute from trialStartedAt + 15 days
const trialEndDate = computed(() => {
  if (!project.value) return null
  // Prefer explicit fixed trialEnd stored on the project when available
  if (project.value.trialEnd) {
    try { return new Date(project.value.trialEnd).toISOString() } catch { /* ignore */ }
  }
  // If Stripe has a current period end and status is trialing, prefer that timestamp
  if ((project.value.stripeSubscriptionStatus === 'trialing') && project.value.stripeCurrentPeriodEnd) {
    try { return new Date(project.value.stripeCurrentPeriodEnd).toISOString() } catch { /* ignore */ }
  }
  // Otherwise, compute from project.trialStartedAt if present
  const started = project.value.trialStartedAt ? new Date(project.value.trialStartedAt) : null
  if (!started || isNaN(started.getTime())) return null
  const endMs = started.getTime() + (15 * 24 * 60 * 60 * 1000)
  return new Date(endMs).toISOString()
})

const trialDaysLeft = computed(() => {
  if (!trialEndDate.value) return 0
  const end = new Date(trialEndDate.value).getTime()
  const diff = Math.ceil((end - Date.now()) / (1000*60*60*24))
  return Math.max(diff, 0)
})

async function refreshProject() {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    if (!pid) return;
    const p = await projectStore.fetchProject(pid);
    project.value = { ...p };
  } catch (err) {
    console.error('refreshProject error', err);
  }
}

// when project loads, default the select to the project's saved stripePriceId
watch(project, (pv) => {
  if (!pv) return;
  selectedPrice.value = pv.stripePriceId || ((prices.value && prices.value[0] && prices.value[0].id) || null);
}, { immediate: true });

async function startCheckout() {
  loading.value = true;
  try {
  const authToken = auth.token || '';
    const pid = projectId || (project.value && (project.value._id || project.value.id));
  console.log('startCheckout -> sending', { projectId: pid, priceId: selectedPrice.value, url: apiUrl('/api/stripe/create-checkout-session') });
    if (!pid) {
      ui.showError('No project selected');
      loading.value = false;
      return;
    }
    
    const { data } = await http.post('/api/stripe/create-checkout-session', {
      projectId: pid,
      priceId: selectedPrice.value,
    }, { headers: getAuthHeaders() });
    if (data && data.url) {
      ui.showSuccess('Redirecting to checkout...')
      window.location.href = data.url;
    } else {
      ui.showError('Failed to start checkout');
    }
  } catch (err) {
    console.error('startCheckout error', err);
    ui.showError(err?.response?.data?.error || 'Failed to start checkout');
  } finally {
    loading.value = false;
  }
}

async function openBillingPortal() {
  loading.value = true;
  try {
  const authToken = auth.token || '';
  console.log('openBillingPortal -> sending to', apiUrl('/api/stripe/portal-session'));
    const { data } = await http.post('/api/stripe/portal-session', {}, { headers: getAuthHeaders() });
    if (data && data.url) {
      ui.showSuccess('Opening billing portal...')
      window.location.href = data.url;
    } else {
      ui.showError('Failed to open billing portal');
    }
  } catch (err) {
    console.error('openBillingPortal error', err);
    ui.showError(err?.response?.data?.error || 'Failed to open billing portal');
  } finally {
    loading.value = false;
  }
}
</script>
