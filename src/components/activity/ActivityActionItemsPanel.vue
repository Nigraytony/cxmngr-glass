<template>
  <div class="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="text-white/80 font-medium">
        Action items
        <span class="text-white/50 text-sm font-normal ml-2">who owes what, by when (A-1…) — prints in the report</span>
      </div>
      <span
        v-if="items.length"
        class="text-white/50 text-sm"
      >{{ items.filter(i => i.status === 'Complete').length }}/{{ items.length }} complete</span>
    </div>

    <div
      v-if="loading"
      class="text-white/50 text-sm"
    >
      Loading…
    </div>
    <template v-else>
      <div
        v-for="it in items"
        :key="it._id"
        class="grid grid-cols-12 gap-2 items-start rounded-lg bg-white/5 border border-white/10 p-2"
      >
        <div class="col-span-2 md:col-span-1 font-mono text-emerald-300/90 text-sm pt-1.5">
          A-{{ it.sequence }}
        </div>
        <input
          v-model="it.description"
          type="text"
          class="col-span-10 md:col-span-4 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm"
          @change="saveItem(it)"
        >
        <input
          v-model="it.owner"
          type="text"
          placeholder="Owner"
          class="col-span-4 md:col-span-2 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
          @change="saveItem(it)"
        >
        <input
          v-model="it.due"
          type="text"
          placeholder="Due (date or condition)"
          class="col-span-4 md:col-span-2 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
          @change="saveItem(it)"
        >
        <select
          v-model="it.status"
          class="col-span-3 md:col-span-2 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm [&>option]:bg-slate-800"
          @change="saveItem(it)"
        >
          <option
            v-for="s in STATUSES"
            :key="s"
            :value="s"
          >
            {{ s }}
          </option>
        </select>
        <button
          type="button"
          class="col-span-1 text-rose-300/80 hover:text-rose-300 text-sm pt-1.5"
          title="Delete action item"
          @click="removeItem(it)"
        >
          ✕
        </button>
        <input
          v-model="it.refNote"
          type="text"
          placeholder="Ref (e.g. #15–17 or Obs.) — linked issues print automatically"
          class="col-span-12 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-white/70 text-xs placeholder-white/25"
          @change="saveItem(it)"
        >
      </div>

      <div class="flex items-center gap-2">
        <input
          v-model="draft"
          type="text"
          placeholder="New action item — what needs to happen?"
          class="flex-1 rounded-md bg-white/10 border border-white/15 px-3 py-2 text-white text-sm placeholder-white/30"
          @keyup.enter="addItem"
        >
        <button
          type="button"
          :disabled="!draft.trim() || busy"
          class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/30 text-sm disabled:opacity-50"
          @click="addItem"
        >
          Add
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Stage 3 of the Activity report redesign: inline CRUD for ActionItems (work
// owed: A-1… with owner/due/status). Lives on the Actions tab under the
// work-performed records. Persists immediately via /api/action-items.
import { onMounted, ref } from 'vue'
import { useActionItemsStore } from '../../stores/actionItems'
import { useUiStore } from '../../stores/ui'

const props = defineProps<{ projectId: string; activityId: string }>()

const STATUSES = ['Open', 'In Progress', 'Complete', 'Cancelled']
const store = useActionItemsStore()
const ui = useUiStore()
const items = ref<any[]>([])
const loading = ref(false)
const busy = ref(false)
const draft = ref('')

async function reload() {
  if (!props.activityId || props.activityId === 'new') return
  loading.value = true
  try {
    items.value = await store.list(props.activityId, props.projectId)
  } catch (e) {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function addItem() {
  const description = draft.value.trim()
  if (!description || busy.value) return
  busy.value = true
  try {
    const created = await store.create({ projectId: props.projectId, activityId: props.activityId, description })
    items.value.push(created)
    draft.value = ''
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to add action item')
  } finally {
    busy.value = false
  }
}

async function saveItem(it: any) {
  try {
    await store.update(String(it._id), {
      description: it.description,
      owner: it.owner,
      due: it.due,
      status: it.status,
      refNote: it.refNote,
    })
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save action item')
  }
}

async function removeItem(it: any) {
  if (!window.confirm(`Delete A-${it.sequence}?`)) return
  try {
    await store.remove(String(it._id))
    items.value = items.value.filter(x => x._id !== it._id)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete action item')
  }
}

onMounted(reload)
</script>
