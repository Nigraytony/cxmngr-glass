<template>
  <section class="flex flex-col gap-6 h-[calc(100vh-10rem)] min-h-0">
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/app' },
          { text: 'OPR Workshop', to: '/app/opr' }
        ]"
        title="OPR Workshop"
      />
    </div>

    <div
      v-if="!projectId"
      class="rounded-xl bg-white/8 border border-white/10 p-4 text-white/80 flex-1"
    >
      Select a project to run an OPR workshop.
    </div>

    <div
      v-else
      class="grid grid-cols-12 gap-4 flex-1 min-h-0"
    >
      <!-- Left: session / controls -->
      <div class="col-span-12 lg:col-span-5">
        <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
          <div class="flex items-center justify-between gap-3">
            <div class="text-white font-semibold">
              Live Session
            </div>
            <button
              type="button"
              class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm disabled:opacity-50"
              :disabled="opr.loading"
              @click="refresh"
            >
              Refresh
            </button>
          </div>

          <div class="mt-3 space-y-3 overflow-auto pr-1 min-h-0 flex-1">
            <div
              v-if="!addonEnabled"
              class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
            >
              <div class="font-semibold text-white">
                OPR Workshop is a paid add-on
              </div>
              <div class="text-sm text-white/70 mt-1">
                One-time purchase: $24.99 per project.
              </div>
              <div class="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-emerald-500/80 hover:bg-emerald-500 text-white text-sm"
                  @click="purchaseAddon"
                >
                  Purchase
                </button>
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
                  @click="refreshProject"
                >
                  I already purchased
                </button>
              </div>
            </div>

            <div
              v-else-if="!active"
              class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
            >
              <div class="font-semibold text-white">
                No active question
              </div>
              <div class="text-sm text-white/70 mt-1">
                Create and open a new question to start the session.
              </div>

              <div class="mt-4 grid gap-3">
                <label class="block">
                  <div class="text-white/80 text-sm mb-1">Category</div>
                  <select
                    v-model="draft.categoryId"
                    class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="" disabled>
                      Select category…
                    </option>
                    <option
                      v-for="c in opr.categories"
                      :key="c.id"
                      :value="c.id"
                    >
                      {{ c.name }}
                    </option>
                  </select>
                </label>

                <label class="block">
                  <div class="text-white/80 text-sm mb-1">Question prompt</div>
                  <textarea
                    v-model="draft.prompt"
                    rows="4"
                    class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Enter the question for the session…"
                  />
                </label>

                <label class="block">
                  <div class="text-white/80 text-sm mb-1">Answer window (minutes)</div>
                  <input
                    v-model.number="draft.durationMinutes"
                    type="number"
                    min="1"
                    max="240"
                    class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                </label>

                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!canStart"
                  @click="startQuestion"
                >
                  Create & Open Question
                </button>
              </div>
            </div>

            <div
              v-else
              class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-white font-semibold">
                    {{ statusLabel(active.status) }}
                  </div>
                  <div class="text-white/70 text-sm mt-1">
                    {{ active.prompt }}
                  </div>
                </div>
                <div class="shrink-0">
                  <span class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-white/10 border border-white/15 text-white/80">
                    {{ countdownLabel }}
                  </span>
                </div>
              </div>

              <div
                v-if="active.status === 'open'"
                class="mt-4 grid gap-2"
              >
                <label class="block">
                  <div class="text-white/80 text-sm mb-1">Your answer</div>
                  <textarea
                    v-model="answerText"
                    rows="3"
                    class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Type an answer… (you can submit up to 10)"
                  />
                </label>
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs text-white/60">
                    Tip: refresh after closing to reveal answers for everyone.
                  </div>
                  <button
                    type="button"
                    class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!answerText.trim() || submittingAnswer"
                    @click="submitAnswer"
                  >
                    Submit Answer
                  </button>
                </div>
              </div>

              <div
                v-else-if="active.status === 'closed'"
                class="mt-4"
              >
                <div class="text-sm text-white/70">
                  Answers are now visible to all participants.
                </div>
              </div>

              <div
                v-else-if="active.status === 'voting'"
                class="mt-4 space-y-3"
              >
                <div class="text-sm text-white/70">
                  Select your favorite 5 answers and rank them (1 = most favored).
                </div>

                <div class="grid gap-2">
                  <div
                    v-for="r in [1,2,3,4,5]"
                    :key="r"
                    class="grid grid-cols-12 gap-2 items-center"
                  >
                    <div class="col-span-2 text-white/80 text-sm">
                      {{ r }}
                    </div>
                    <div class="col-span-10">
                      <select
                        v-model="voteByRank[r]"
                        class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                      >
                        <option value="">
                          Select answer…
                        </option>
                        <option
                          v-for="a in opr.answers"
                          :key="a.id"
                          :value="a.id"
                          :disabled="isAnswerChosenElsewhere(a.id, r)"
                        >
                          {{ truncate(a.text, 100) }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!canSubmitVote || submittingVote"
                    @click="submitVote"
                  >
                    Submit Vote
                  </button>
                </div>
              </div>

              <div
                v-else-if="active.status === 'finalized'"
                class="mt-4"
              >
                <div class="text-sm text-white/70">
                  Voting is finalized. Top responses have been saved as OPR items.
                </div>
              </div>

              <div
                v-if="isAdmin && active"
                class="mt-4 flex flex-wrap items-center gap-2"
              >
                <button
                  v-if="active.status === 'open'"
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
                  @click="adminCloseQuestion"
                >
                  Close Answers
                </button>
                <button
                  v-if="active.status === 'closed'"
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
                  @click="adminOpenVoting"
                >
                  Open Voting
                </button>
                <button
                  v-if="active.status === 'voting'"
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
                  @click="adminCloseVoting"
                >
                  Close Voting & Finalize
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: answers/results -->
      <div class="col-span-12 lg:col-span-7">
        <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
          <div class="flex items-center justify-between gap-3">
            <div class="text-white font-semibold">
              Responses
            </div>
            <button
              v-if="active"
              type="button"
              class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
              @click="refreshAnswersAndResults"
            >
              Refresh
            </button>
          </div>

          <div class="mt-3 flex-1 min-h-0 overflow-auto pr-1">
            <div
              v-if="!active"
              class="text-white/70 text-sm"
            >
              Start a question to collect answers and vote on outcomes.
            </div>

            <template v-else>
              <div
                v-if="active.status === 'finalized' && opr.results.length"
                class="space-y-2"
              >
                <div
                  v-for="r in opr.results"
                  :key="r.answerId"
                  class="rounded-lg bg-white/5 border border-white/10 p-3"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-white font-semibold">
                      #{{ r.rank }}
                    </div>
                    <div class="text-white/70 text-sm">
                      {{ r.score }} pts
                    </div>
                  </div>
                  <div class="text-white/80 text-sm mt-1 whitespace-pre-wrap">
                    {{ r.text }}
                  </div>
                </div>
              </div>

              <div
                v-else
                class="space-y-2"
              >
                <div
                  v-for="a in opr.answers"
                  :key="a.id"
                  class="rounded-lg bg-white/5 border border-white/10 p-3"
                >
                  <div class="text-white/80 text-sm whitespace-pre-wrap">
                    {{ a.text }}
                  </div>
                </div>
                <div
                  v-if="opr.answers.length === 0"
                  class="text-white/70 text-sm"
                >
                  No answers yet.
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { useAuthStore } from '../../stores/auth'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'
import { useOprStore } from '../../stores/opr'

const auth = useAuthStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const opr = useOprStore()

const projectId = computed(() => projectStore.currentProjectId)
const project = computed(() => projectStore.currentProject as any)
const addonEnabled = computed(() => Boolean(project.value?.addons?.oprWorkshop?.enabled))

const isAdmin = computed(() => {
  const role = String(auth.user?.role || '').toLowerCase()
  if (role === 'globaladmin' || role === 'superadmin') return true
  const team = Array.isArray(project.value?.team) ? project.value.team : []
  const uid = String(auth.user?._id || '')
  const email = String(auth.user?.email || '').toLowerCase()
  return team.some((m: any) => {
    const rid = String(m?._id || m?.id || '')
    const memail = String(m?.email || '').toLowerCase()
    const r = String(m?.role || '').toLowerCase()
    const match = (uid && rid && uid === rid) || (email && memail && email === memail)
    return match && (r === 'admin' || r === 'globaladmin')
  })
})

const active = computed(() => opr.active)

const draft = reactive({
  categoryId: '',
  prompt: '',
  durationMinutes: 10,
})

const canStart = computed(() => addonEnabled.value && draft.categoryId && draft.prompt.trim().length > 5)

const answerText = ref('')
const submittingAnswer = ref(false)
const submittingVote = ref(false)

const voteByRank = reactive<Record<number, string>>({ 1: '', 2: '', 3: '', 4: '', 5: '' })

const canSubmitVote = computed(() => {
  const vals = [1, 2, 3, 4, 5].map((r) => voteByRank[r]).filter(Boolean)
  if (vals.length !== 5) return false
  return new Set(vals).size === 5
})

function isAnswerChosenElsewhere(answerId: string, currentRank: number) {
  for (const r of [1, 2, 3, 4, 5]) {
    if (r === currentRank) continue
    if (voteByRank[r] === answerId) return true
  }
  return false
}

function truncate(text: string, n: number) {
  const s = String(text || '')
  if (s.length <= n) return s
  return `${s.slice(0, n - 1)}…`
}

function statusLabel(status: string) {
  switch (status) {
    case 'open': return 'Open (Answering)'
    case 'closed': return 'Closed (Review)'
    case 'voting': return 'Voting'
    case 'finalized': return 'Finalized'
    default: return 'Draft'
  }
}

const clockTick = ref(0)

const countdownLabel = computed(() => {
  // Depend on a local tick so countdown updates without polling.
  void clockTick.value
  const q = active.value
  if (!q) return ''
  const endIso = q.status === 'open' ? q.closesAt : (q.status === 'voting' ? q.votingClosesAt : null)
  if (!endIso) return '—'
  const end = new Date(String(endIso)).getTime()
  const now = Date.now()
  const ms = Math.max(0, end - now)
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}:${String(secs).padStart(2, '0')}`
})

async function refresh() {
  if (!projectId.value) return
  try {
    await opr.refreshSession(projectId.value)
    await onActiveChanged()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to refresh OPR session'
    ui.showError(msg, { duration: 5000 })
  }
}

async function refreshProject() {
  if (!projectId.value) return
  try {
    if (!addonEnabled.value) {
      try {
        await opr.reconcileOprPurchase(projectId.value)
      } catch (e: any) {
        const code = e?.response?.data?.code
        const msg = e?.response?.data?.error || e?.message
        if (code === 'OPR_ADDON_NOT_FOUND') {
          ui.showError('No OPR add-on purchase found for this project yet.', { duration: 5000 })
        } else if (msg) {
          ui.showError(msg, { duration: 5000 })
        }
      }
    }
    await projectStore.fetchProject(projectId.value)
    await refresh()
  } catch (e: any) {
    ui.showError('Failed to refresh project', { duration: 4000 })
  }
}

async function startQuestion() {
  if (!projectId.value) return
  try {
    const created = await opr.createQuestion(projectId.value, { categoryId: draft.categoryId, prompt: draft.prompt })
    await opr.openQuestion(projectId.value, created.id, draft.durationMinutes)
    draft.prompt = ''
    answerText.value = ''
    for (const r of [1, 2, 3, 4, 5]) voteByRank[r] = ''
    await refresh()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to start question'
    ui.showError(msg, { duration: 6000 })
  }
}

async function submitAnswer() {
  if (!projectId.value || !active.value) return
  try {
    submittingAnswer.value = true
    await opr.submitAnswer(projectId.value, active.value.id, answerText.value)
    answerText.value = ''
    await opr.fetchAnswers(projectId.value, active.value.id)
    ui.showSuccess('Answer submitted', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to submit answer'
    ui.showError(msg, { duration: 6000 })
  } finally {
    submittingAnswer.value = false
  }
}

async function refreshAnswersAndResults() {
  if (!projectId.value || !active.value) return
  try {
    await opr.fetchAnswers(projectId.value, active.value.id)
    if (active.value.status === 'finalized') await opr.fetchResults(projectId.value, active.value.id)
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to refresh responses'
    ui.showError(msg, { duration: 5000 })
  }
}

async function submitVote() {
  if (!projectId.value || !active.value) return
  try {
    submittingVote.value = true
    const rankings = [1, 2, 3, 4, 5].map((r) => ({ rank: r, answerId: voteByRank[r] }))
    await opr.submitVote(projectId.value, active.value.id, rankings)
    ui.showSuccess('Vote submitted', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to submit vote'
    ui.showError(msg, { duration: 6000 })
  } finally {
    submittingVote.value = false
  }
}

async function adminCloseQuestion() {
  if (!projectId.value || !active.value) return
  try {
    await opr.closeQuestion(projectId.value, active.value.id)
    await refresh()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to close question'
    ui.showError(msg, { duration: 6000 })
  }
}

async function adminOpenVoting() {
  if (!projectId.value || !active.value) return
  try {
    await opr.openVoting(projectId.value, active.value.id, 10)
    await refresh()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to open voting'
    ui.showError(msg, { duration: 6000 })
  }
}

async function adminCloseVoting() {
  if (!projectId.value || !active.value) return
  try {
    await opr.closeVoting(projectId.value, active.value.id)
    await refresh()
    await refreshAnswersAndResults()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to close voting'
    ui.showError(msg, { duration: 6000 })
  }
}

async function purchaseAddon() {
  if (!projectId.value) return
  try {
    const { url } = await opr.startOprCheckout(projectId.value)
    if (url) window.location.href = url
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to start checkout'
    ui.showError(msg, { duration: 6000 })
  }
}

let heartbeatTimer: any = null
let pollTimer: any = null
let tickTimer: any = null

async function onActiveChanged() {
  if (!projectId.value) return
  if (!active.value) return
  try {
    await opr.join(projectId.value, active.value.id)
    await opr.fetchAnswers(projectId.value, active.value.id)
    if (active.value.status === 'finalized') await opr.fetchResults(projectId.value, active.value.id)
  } catch (_) {
    // ignore initial join failures; backend will enforce voting eligibility later
  }
}

function clearTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  if (pollTimer) clearInterval(pollTimer)
  if (tickTimer) clearInterval(tickTimer)
  heartbeatTimer = null
  pollTimer = null
  tickTimer = null
}

watch(projectId, async (pid) => {
  clearTimers()
  opr.answers = []
  opr.results = []
  if (!pid) return
  await refresh()

  heartbeatTimer = setInterval(async () => {
    try {
      const q = active.value
      if (!q || !projectId.value) return
      await opr.heartbeat(projectId.value, q.id)
    } catch (_) {
      // ignore
    }
  }, 20_000)

  pollTimer = setInterval(async () => {
    try {
      if (!projectId.value) return
      await opr.fetchActive(projectId.value)
      if (active.value) await opr.fetchAnswers(projectId.value, active.value.id)
    } catch (_) {
      // ignore
    }
  }, 5_000)

  tickTimer = setInterval(() => {
    clockTick.value += 1
  }, 1_000)
}, { immediate: true })

watch(() => active.value?.id, async () => {
  await onActiveChanged()
})

onMounted(async () => {
  await refresh()
})

onBeforeUnmount(() => {
  clearTimers()
})
</script>
