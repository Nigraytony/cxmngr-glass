<template>
  <div v-if="show" class="mt-2 rounded-xl bg-white/5 border border-white/10 p-3">
    <div class="flex items-center justify-between gap-2">
      <div class="text-xs text-white/70">OPR verification</div>
      <button
        type="button"
        class="text-xs px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white/80"
        :disabled="loading || disabled"
        @click="refresh"
      >
        Refresh
      </button>
    </div>

    <div v-if="loading" class="text-white/70 text-sm mt-2">Loading…</div>
    <div v-else-if="meta.length === 0" class="text-white/60 text-xs mt-2">No OPR items linked.</div>

    <div v-else class="mt-2 space-y-2">
      <div
        v-for="it in meta"
        :key="it.id"
        class="rounded-lg border border-white/10 bg-black/10 p-2"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 shrink-0">
                #{{ it.rank }}
              </span>
              <span class="text-white/85 text-sm truncate">{{ it.text }}</span>
            </div>
            <div v-if="(draftNotes[it.id] || '').trim()" class="text-white/60 text-xs mt-1 whitespace-pre-wrap">
              {{ draftNotes[it.id] }}
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <select
              v-model="draftStatus[it.id]"
              class="text-xs rounded-md bg-black/20 border border-white/15 text-white px-2 py-1"
              :disabled="disabled"
              @change="persist(it.id)"
            >
              <option value="unverified">Unverified</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="na">N/A</option>
            </select>
          </div>
        </div>

        <div class="mt-2">
          <textarea
            v-model="draftNotes[it.id]"
            rows="1"
            class="w-full px-2 py-1 rounded-md bg-black/20 border border-white/15 text-white/90 text-xs resize-y"
            placeholder="Notes/evidence…"
            :disabled="disabled"
            @change="persist(it.id)"
          />
        </div>
      </div>

      <div v-if="error" class="text-rose-200 text-xs">{{ error }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'
import { useOprLinkEvaluationsStore, type OprLinkEvaluationStatus } from '../stores/oprLinkEvaluations'

type OprItemMeta = {
  id: string
  rank: number
  text: string
  status: 'active' | 'archived'
}

const props = defineProps<{
  projectId: string
  oprItemIds: string[]
  contextType: string
  contextId: string
  contextLabel?: string
  targetType: string
  targetId?: string
  targetKey?: string
  targetLabel?: string
  disabled?: boolean
}>()

const store = useOprLinkEvaluationsStore()

const disabled = computed(() => Boolean(props.disabled))
const show = computed(() => Boolean(props.projectId && props.contextType && props.contextId && props.targetType))

const loading = ref(false)
const error = ref('')

const meta = ref<OprItemMeta[]>([])
const evalByItem = ref<Record<string, { status: OprLinkEvaluationStatus; notes: string }>>({})

const draftStatus = ref<Record<string, OprLinkEvaluationStatus>>({})
const draftNotes = ref<Record<string, string>>({})

function normalizeIds(ids: any) {
  const arr = Array.isArray(ids) ? ids : []
  const out: string[] = []
  const set = new Set<string>()
  for (const raw of arr) {
    const id = String(raw || '').trim()
    if (!id || id === 'undefined' || id === 'null') continue
    if (set.has(id)) continue
    set.add(id)
    out.push(id)
  }
  return out
}

async function fetchMeta(ids: string[]) {
  if (!props.projectId || ids.length === 0) { meta.value = []; return }
  const { data } = await axios.get(`${getApiBase()}/api/projects/${props.projectId}/opr/link/items`, {
    headers: getAuthHeaders(),
    params: { ids: ids.join(','), includeArchived: 1 },
  })
  const list = Array.isArray(data) ? data : []
  meta.value = list.map((i: any): OprItemMeta => ({
    id: String(i.id),
    rank: Number(i.rank || 0),
    text: String(i.text || ''),
    status: i.status === 'archived' ? 'archived' : 'active',
  })).sort((a: any, b: any) => (a.rank - b.rank) || String(a.id).localeCompare(String(b.id)))
}

async function fetchEvaluations(ids: string[]) {
  if (!props.projectId || ids.length === 0) { evalByItem.value = {}; return }
  const params: Record<string, any> = {
    oprItemIds: ids.join(','),
    contextType: props.contextType,
    contextId: props.contextId,
    targetType: props.targetType,
  }
  if (props.targetId) params.targetId = props.targetId
  if (props.targetKey) params.targetKey = props.targetKey

  const rows = await store.fetchEvaluations(props.projectId, params)
  const map: Record<string, { status: OprLinkEvaluationStatus; notes: string }> = {}
  for (const r of rows) {
    map[r.oprItemId] = { status: r.status, notes: r.notes || '' }
  }
  evalByItem.value = map

  const ds: Record<string, OprLinkEvaluationStatus> = {}
  const dn: Record<string, string> = {}
  for (const id of ids) {
    ds[id] = map[id]?.status || 'unverified'
    dn[id] = map[id]?.notes || ''
  }
  draftStatus.value = ds
  draftNotes.value = dn
}

async function refresh() {
  if (!show.value) return
  const ids = normalizeIds(props.oprItemIds)
  loading.value = true
  error.value = ''
  try {
    await fetchMeta(ids)
    await fetchEvaluations(ids)
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load verification'
  } finally {
    loading.value = false
  }
}

async function persist(oprItemId: string) {
  if (disabled.value) return
  if (!props.projectId) return
  const status = draftStatus.value[oprItemId] || 'unverified'
  const notes = String(draftNotes.value[oprItemId] || '')

  const payload: any = {
    oprItemId,
    contextType: props.contextType,
    contextId: props.contextId,
    contextLabel: props.contextLabel || '',
    targetType: props.targetType,
    targetLabel: props.targetLabel || '',
    status,
    notes,
  }
  if (props.targetId) payload.targetId = props.targetId
  if (props.targetKey) payload.targetKey = props.targetKey

  try {
    await store.upsertEvaluation(props.projectId, payload)
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to save verification'
  }
}

watch(
  () => [props.projectId, props.contextType, props.contextId, props.targetType, props.targetId, props.targetKey, JSON.stringify(normalizeIds(props.oprItemIds))],
  () => {
    refresh()
  }
)

onMounted(() => refresh())
</script>
