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
          <button @click="activeTab = 'info'" :class="tabClass('info')" class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center">
            <span class="i">ℹ️</span>
            <span>Info</span>
          </button>

          <button @click="activeTab = 'team'" :class="tabClass('team')" class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center">
            <span class="i">👥</span>
            <span>Team</span>
          </button>

          <button @click="activeTab = 'logo'" :class="tabClass('logo')" class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center">
            <span class="i">🖼️</span>
            <span>Logo</span>
          </button>

          <button @click="activeTab = 'subscription'" :class="tabClass('subscription')" class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center">
            <span class="i">💳</span>
            <span>Subscription</span>
          </button>

          <button @click="activeTab = 'settings'" :class="tabClass('settings')" class="flex-1 px-3 py-2 rounded inline-flex items-center justify-center gap-2 text-center">
            <span class="i">⚙️</span>
            <span>Settings</span>
          </button>
        </div>

        <div>
          <div v-if="!project" class="p-4 text-white/70">Loading project...</div>
          <div v-else>
            <div v-show="activeTab === 'info'">
              <ProjectForm v-model="project" :errors="formErrors" />
            </div>

            <div v-show="activeTab === 'team'">
              <h3 class="text-md font-medium mb-2">Team</h3>
              <p class="text-sm text-white/70 mb-4">Manage team membership and roles for this project.</p>
              <div class="space-y-2">
                <div v-for="member in (project.team || [])" :key="member._id || member.email" class="p-3 rounded bg-white/5">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-medium">{{ member.firstName }} {{ member.lastName }}</div>
                      <div class="text-xs text-white/70">{{ member.email }} • {{ member.role }}</div>
                    </div>
                    <div class="flex gap-2">
                      <button @click="removeMember(member)" class="px-3 py-1 rounded bg-red-500/20 text-red-400">Remove</button>
                    </div>
                  </div>
                </div>

                <div class="pt-2">
                  <h4 class="font-medium mb-2">Add member</h4>
                  <div class="grid grid-cols-1 gap-2">
                    <!-- Row 1: First / Last -->
                    <div class="grid grid-cols-2 gap-2">
                      <input v-model="newMember.firstName" placeholder="First" class="rounded p-2 bg-white/5 w-full" />
                      <input v-model="newMember.lastName" placeholder="Last" class="rounded p-2 bg-white/5 w-full" />
                    </div>

                    <!-- Row 2: Email / Company / Role -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input v-model="newMember.email" placeholder="Email" class="rounded p-2 bg-white/5 w-full" />
                      <input v-model="newMember.company" placeholder="Company" class="rounded p-2 bg-white/5 w-full" />
                      <select v-model="newMember.role" class="rounded p-2 bg-white/5 w-full">
                        <option value="admin">admin</option>
                        <option value="CxA">CxA</option>
                        <option value="GC">GC</option>
                        <option value="CM">CM</option>
                        <option value="Architect">Architect</option>
                        <option value="Designer">Designer</option>
                        <option value="Mechanical Contractor">Mechanical Contractor</option>
                        <option value="Electrical Contractor">Electrical Contractor</option>
                        <option value="Plumbing Contractor">Plumbing Contractor</option>
                        <option value="Controls Contractor">Controls Contractor</option>
                        <option value="Life Safety Contractor">Life Safety Contractor</option>
                        <option value="Other Contractor">Other Contractor</option>
                        <option value="Client">Client</option>
                        <option value="User">User</option>
                      </select>
                    </div>

                    <div class="text-right">
                      <button @click="addMember" class="px-3 py-1 rounded bg-white/6">Add</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'logo'">
              <h3 class="text-md font-medium mb-2">Logo</h3>
              <p class="text-sm text-white/70 mb-4">Upload or change the project's logo.</p>

              <div class="flex items-center gap-4">
                <div class="w-28 h-28 rounded bg-white/6 flex items-center justify-center overflow-hidden">
                  <img v-if="project.logo" :src="project.logo" alt="project logo" class="object-cover w-full h-full" />
                  <div v-else class="text-white/60">No logo</div>
                </div>

                <div>
                  <input type="file" ref="fileInput" @change="onLogoSelected" accept="image/*" />
                  <div class="mt-2 flex gap-2">
                    <button @click="uploadLogo" class="px-3 py-1 rounded bg-white/6">Upload</button>
                    <button @click="removeLogo" class="px-3 py-1 rounded bg-red-500/20 text-red-400">Remove</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'subscription'">
              <h3 class="text-md font-medium mb-2">Subscription</h3>
              <div class="space-y-6">
                <h2 class="text-xl font-semibold">Project Billing</h2>

                <div class="p-4 rounded-lg border">
                <p><strong>Status:</strong> {{ status }}</p>
                <p class="mt-2"><strong>Plan:</strong> {{ planLabel }}</p>
                <p v-if="project.stripeCurrentPeriodEnd">
                  <strong>Current period end:</strong>
                  {{ new Date(project.stripeCurrentPeriodEnd).toLocaleString() }}
                </p>
                <p v-if="status === 'trialing'">
                    <strong>Trial days left:</strong> {{ trialDaysLeft }}
                </p>
                </div>

                <div class="p-4 rounded-lg border">
                <label class="block text-sm font-medium mb-2">Choose a plan</label>
                <div class="relative inline-block w-full">
                  <select v-model="selectedPrice" class="w-full appearance-none rounded-lg p-2 bg-white/5 border border-white/10 text-white backdrop-blur-md focus:ring-0 focus:border-white/20">
                    <option v-for="p in prices" :key="p.id" :value="p.id">{{ p.label }}</option>
                  </select>
                  <!-- custom arrow -->
                  <div class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/70">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </div>
                </div>

                <div class="mt-2">
                  <span v-if="project && project.stripePriceId && project.stripePriceId === selectedPrice" class="inline-block px-2 py-1 text-xs bg-white/10 rounded-full">Current plan</span>
                </div>

                <div class="mt-4 flex gap-3">
                    <button @click="startCheckout" :disabled="loading" class="px-4 py-2 rounded bg-blue-600 text-white">
                    {{ loading ? '...' : 'Subscribe / Update' }}
                    </button>

                    

                    <button @click="openBillingPortal" :disabled="loading" class="px-4 py-2 rounded border">
                    Manage billing
                    </button>
                </div>
                </div>
            </div>
            </div>

            <div v-show="activeTab === 'settings'">
              <h3 class="text-md font-medium mb-2">Settings</h3>
              <p class="text-sm text-white/70 mb-4">Project-specific settings and flags.</p>
              <div class="rounded p-3 bg-white/5">
                <label class="flex items-center gap-2"><input type="checkbox" v-model="project.settingsEnabled" /> Enable special behavior</label>
                <div class="mt-4">
                  <label class="block text-white/80 mb-1">Tags (comma separated)</label>
                  <input v-model="tagsText" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 text-right">
            <button @click="save" class="px-4 py-2 rounded bg-white/6 hover:bg-white/10">Save</button>
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
import { getAuthHeaders } from '../../utils/auth'

const projectStore = useProjectStore()
const route = useRoute()
const router = useRouter()

const projectId = route.params.id || route.query.id || null
const project = ref(null)
const activeTab = ref('info')
const formErrors = ref({})
const ui = useUiStore()
const auth = useAuthStore()
const fileInput = ref(null)
const newMember = ref({ email: '', firstName: '', lastName: '', company: '', role: 'User' })
const invites = ref([])
// use auth store token; fall back to localStorage if necessary

const tagsText = computed({
  get() { return (project.value && Array.isArray(project.value.tags)) ? project.value.tags.join(', ') : '' },
  set(v) { if (project.value) project.value.tags = v.split(',').map(s => s.trim()).filter(Boolean) }
})

function tabClass(t) {
  return activeTab.value === t ? 'bg-white/10 text-white font-medium' : 'bg-white/5 text-white/80'
}

// local showToast removed; use `ui.showSuccess` / `ui.showError` instead

onMounted(async () => {
  if (projectId) {
    try {
      const p = await projectStore.fetchProject(projectId)
      project.value = { ...p }
    } catch (e) {
      ui.showError('Failed to load project')
      router.push('/projects')
    }
  } else {
    // If no projectId provided, prefer the currentProject from the store (user default)
    if (projectStore.currentProject && projectStore.currentProject.value) {
      // `currentProject` is a ref; use its .value
      project.value = { ...projectStore.currentProject.value }
    }
    // Watch for the store to populate (async fetch) and set project when ready
    watch(projectStore.currentProject, (nv) => {
      if (!projectId && nv) project.value = { ...nv }
    }, { immediate: true })
    // fallback: if after a short tick we still don't have a project, try reading selectedProjectId from localStorage and fetch directly
    await nextTick()
    if (!project.value && typeof window !== 'undefined') {
      const stored = localStorage.getItem('selectedProjectId')
      if (stored) {
        try {
          const p2 = await projectStore.fetchProject(stored)
          project.value = { ...p2 }
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
    const { data } = await axios.get(`http://localhost:4242/api/projects/${pid}/invites`, { headers: getAuthHeaders() })
    invites.value = data || []
  } catch (err) {
    console.error('loadInvites error', err)
  }
}

async function resendInvite(inviteId) {
  try {
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    if (!pid) return ui.showError('No project selected')
    await axios.post(`http://localhost:4242/api/projects/${pid}/resend-invite`, { inviteId }, { headers: getAuthHeaders() })
    ui.showSuccess('Invitation resent')
    // reload invites to update timestamps
    await loadInvites()
  } catch (err) {
    console.error('resendInvite error', err)
    ui.showError(err?.response?.data?.error || 'Failed to resend invite')
  }
}

function removeMember(m) {
  project.value.team = (project.value.team || []).filter(tm => (tm._id || tm.email) !== (m._id || m.email))
}

async function addMember() {
  if (!newMember.value.email) return ui.showError('Email required')
  // do not provide _id here; let the backend/mongoose generate a proper ObjectId for subdocs
  const member = { ...newMember.value }

  // prepare an updated payload (do not mutate local project until server confirms)
  const updatedPayload = { ...project.value, team: [ ...(project.value.team || []), member ] }
  try {
    const res = await projectStore.updateProject(updatedPayload)
    // update local project.value from server response (map _id to id)
    project.value = { ...(res || {}), id: (res && res._id) || (project.value && project.value.id) }
    ui.showSuccess('Member added')
  } catch (err) {
    console.error('addMember error', err)
    // show server error message if available (stringify objects for clearer output)
    const serverData = err?.response?.data
    const msg = serverData ? (typeof serverData === 'string' ? serverData : JSON.stringify(serverData)) : (err?.message || 'Failed to add member')
    ui.showError(msg)
  }
  newMember.value = { email: '', firstName: '', lastName: '', company: '', role: 'User' }
}

function onLogoSelected(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  // quick client-side preview
  const reader = new FileReader()
  reader.onload = (ev) => {
    project.value.logo = ev.target.result
  }
  reader.readAsDataURL(f)
}

async function uploadLogo() {
  try {
    // If backend expects a URL, upload to storage first. Here we'll just call updateProject
    await projectStore.updateProject({ ...project.value })
  ui.showSuccess('Logo updated')
  } catch (e) {
  ui.showError('Failed to upload logo')
  }
}

function removeLogo() {
  project.value.logo = ''
}

async function save() {
  try {
    await projectStore.updateProject(project.value)
    ui.showSuccess('Saved')
  } catch (e) {
    ui.showError('Failed to save')
  }
}

// Your three monthly plan price IDs:
const prices = [
  { id: 'price_1MwoMXHUb4cunvDgueGxHOji',  label: 'Basic Plan – $29/mo' },
  { id: 'price_1MwoOMHUb4cunvDgtbBKXDrN',    label: 'Standard Plan – $49/mo' },
  { id: 'price_1MwoRJHUb4cunvDgehwhilRg',   label: 'Premium Plan – $79/mo' },
];

const selectedPrice = ref(null);
const loading = ref(false);

const status = computed(() => project.value?.stripeSubscriptionStatus || project.value?.status || 'trialing');
const planLabel = computed(() => {
  const id = project.value?.stripePriceId || selectedPrice.value;
  const p = prices.find(x => x.id === id);
  return p ? p.label : (id || 'No plan');
});

const trialDaysLeft = computed(() => {
  const end = Date.now() + 15*24*60*60*1000; // 15 days trial from now
  if (!end) return 0;
  const diff = Math.ceil((+end - Date.now()) / (1000*60*60*24));
  return Math.max(diff, 0);
});

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
  selectedPrice.value = pv.stripePriceId || (prices[0] && prices[0].id) || null;
}, { immediate: true });

async function startCheckout() {
  loading.value = true;
  try {
  const authToken = auth.token || '';
    const pid = projectId || (project.value && (project.value._id || project.value.id));
    console.log('startCheckout -> sending', { projectId: pid, priceId: selectedPrice.value, url: 'http://localhost:4242/api/stripe/create-checkout-session' });
    if (!pid) {
      ui.showError('No project selected');
      loading.value = false;
      return;
    }
    
    const { data } = await axios.post('http://localhost:4242/api/stripe/create-checkout-session', {
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
  console.log('openBillingPortal -> sending to', 'http://localhost:4242/api/stripe/portal-session');
    const { data } = await axios.post('http://localhost:4242/api/stripe/portal-session', {}, {
      headers: getAuthHeaders()
    });
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
