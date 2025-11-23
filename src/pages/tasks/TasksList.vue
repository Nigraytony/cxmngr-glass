<template>
  <div class="space-y-4">
    <BreadCrumbs :items="[{ text: 'Dashboard', to: '/' }, { text: 'Tasks', to: '/tasks' }]" />

    <div class="flex items-center gap-3">
      <div class="relative inline-block group">
        <button
          class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
          @click="editingId = 'new'; showEditModal = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
          </svg>
        </button>
        <div
          role="tooltip"
          class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
        >
          New task
        </div>
      </div>
      <div class="ml-2">
        <div class="inline-flex items-center gap-2">
          <div class="relative inline-block group">
            <button
              :class="['px-3 py-1 rounded', viewMode === 'list' ? 'bg-white/10' : 'bg-transparent']"
              @click="viewMode = 'list'"
            >
              List
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              List view
            </div>
          </div>

          <div class="relative inline-block group">
            <button
              :class="['px-3 py-1 rounded border border-white/20', viewMode === 'gantt' ? 'bg-white/10' : 'bg-transparent']"
              @click="viewMode = 'gantt'"
            >
              Gantt
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Gantt view
            </div>
          </div>
        </div>
      </div>
      <div>
        <input
          v-model="q"
          type="text"
          placeholder="Search by name"
          class="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 w-64"
        >
      </div>
      <button
        class="px-3 py-2 rounded bg-white/10 text-white border border-white/20"
        @click="fetch()"
      >
        Refresh
      </button>
      <div class="ml-2">
        <div class="relative inline-block group inline-block rounded-md border border-white/10 px-3 py-2">
          <input
            ref="fileInput"
            type="file"
            accept=".xml"
            class="text-sm text-white bg-transparent"
            @change="onFileSelected"
          >
          
          <div
            role="tooltip"
            class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
          >
            Choose file to import
          </div>
        </div>
      </div>
      <div class="ml-2 flex items-end gap-2">
        <div class="relative inline-block group">
          <button
            class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10"
            aria-label="Collapse all"
            @click="collapseAll"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M7 14l5-5 5 5"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            role="tooltip"
            class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
          >
            Collapse all
          </div>
        </div>

        <div class="relative inline-block group">
          <button
            class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10"
            aria-label="Expand all"
            @click="expandAll"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M7 10l5 5 5-5"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            role="tooltip"
            class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
          >
            Expand all
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="!projectId"
      class="p-6 text-white/80"
    >
      Select a project to view its tasks.
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <div
        v-if="loading"
        class="text-white/70"
      >
        Loading...
      </div>
      <div v-else>
        <div
          v-if="tasks.length === 0"
          class="text-white/70"
        >
          No tasks found for this project.
        </div>
        <template v-else>
          <TaskGantt
            v-if="viewMode === 'gantt'"
            :tasks="tasks"
          />
          <div
            v-else
            class="overflow-x-auto rounded-md border border-white/10"
          >
            <table class="min-w-full text-sm compact-rows">
              <thead class="bg-white/5 text-white/70">
                <tr>
                  <th class="w-8 px-2" />
                  <th class="w-24 px-3 py-2 text-left">
                    WBS
                  </th>
                  <th class="text-left px-3 py-2">
                    Name
                  </th>
                  <th class="text-left px-3 py-2">
                    Duration
                  </th>
                  <th class="text-left px-3 py-2">
                    Start
                  </th>
                  <th class="text-left px-3 py-2">
                    Finish
                  </th>
                  <th class="text-left px-3 py-2">
                    Cost
                  </th>
                  <th class="text-right px-3 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <transition-group
                name="drop"
                tag="tbody"
              >
                <template
                  v-for="(t, idx) in filtered"
                  :key="t._id"
                >
                  <tr
                    v-if="dragOverIndex === idx && dragOverPos === 'above'"
                    :key="`placeholder-above-${idx}`"
                    class="h-6"
                  >
                    <td
                      :colspan="8"
                      class="h-6 bg-emerald-400/10 border-t-2 border-emerald-400/60"
                    />
                  </tr>

                  <tr
                    :class="[
                      'border-t border-white/10 hover:bg-white/5',
                      dragOverIndex === idx && dragOverPos === 'on' ? 'bg-white/10 ring-1 ring-emerald-400/60' : ''
                    ]"
                    draggable="true"
                    @dragstart="(e) => onDragStart(t, e)"
                    @dragover.prevent="(e) => onDragOver(e, idx)"
                    @dragleave.prevent="onDragLeave"
                    @drop.prevent="(e) => onDrop(e, idx)"
                  >
                    <td class="px-2 py-2 align-top">
                      <span
                        class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 text-white/70 cursor-grab active:cursor-grabbing select-none drag-handle"
                        title="Drag to reorder"
                        aria-label="Drag to reorder"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          class="w-4 h-4 opacity-80"
                        ><path d="M9 6.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM9 12a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 9 12Zm8 0a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 17 12ZM9 17.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" /></svg>
                      </span>
                    </td>
                    <td class="px-3 py-2 align-top">
                      <div class="text-sm font-medium">
                        {{ t.wbs || '—' }}
                      </div>
                    </td>
                    <td class="px-3 py-2 align-top relative">
                      <div :style="{ paddingLeft: `calc(${wbsDepth(t.wbs) * 1.25}rem + ${wbsDepth(t.wbs) * 3}ch)`, paddingBottom: '0.6rem' }">
                        <div class="flex items-center gap-2">
                          <button
                            v-if="hasChildren(t)"
                            :aria-expanded="!isCollapsed(t)"
                            class="relative text-white/70 hover:text-white p-1"
                            @click.stop="toggleCollapse(t)"
                          >
                            <span
                              v-if="isCollapsed(t) && descendantCount(t) > 0"
                              class="inline-flex items-center justify-center mr-1 px-1.5 py-0.5 text-xs rounded-full border border-white/10 text-white bg-transparent"
                            >{{ descendantCount(t) }}</span>
                            <svg
                              :class="['w-4 h-4 transition-transform inline-block', isCollapsed(t) ? '' : 'rotate-90']"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            ><path
                              fill-rule="evenodd"
                              d="M6.3 4.3a1 1 0 011.4 0l6 6a1 1 0 010 1.4l-6 6a1 1 0 11-1.4-1.4L11.586 11 6.3 5.7a1 1 0 010-1.4z"
                              clip-rule="evenodd"
                            /></svg>
                          </button>
                          <div class="font-semibold">
                            {{ t.name }}
                          </div>
                        </div>
                        <div class="text-xs text-white/70">
                          {{ t.description || '' }}
                        </div>
                      </div>
                      <!-- thin progress bar positioned at the bottom of the name cell -->
                      <div class="absolute left-3 right-3 bottom-0 h-3 flex items-center">
                        <div class="relative w-full">
                          <div class="h-[3px] bg-white/10 rounded overflow-hidden">
                            <div
                              :style="{ width: pct(t) + '%' }"
                              class="h-full bg-emerald-400/80"
                            />
                          </div>
                          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span class="text-[9px] leading-none text-white/80">{{ pct(t) + '%' }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-2 align-top">
                      <div>{{ t.duration != null ? t.duration : '' }}</div>
                    </td>
                    <td class="px-3 py-2 align-top">
                      {{ fmt(t.start) }}
                    </td>
                    <td class="px-3 py-2 align-top">
                      {{ fmt(t.end) }}
                    </td>
                    <td class="px-3 py-2 align-top">
                      {{ typeof t.cost === 'number' ? ('$' + Number(t.cost).toFixed(2)) : (t.cost || '') }}
                    </td>
                    <td class="px-3 py-2 text-right">
                      <div class="inline-flex items-center justify-end">
                        <label class="inline-flex items-center gap-2 mr-2 text-sm text-white/80">
                          <input
                            type="checkbox"
                            :checked="isComplete(t)"
                            class="w-4 h-4"
                            @change="(e) => toggleComplete(t, e.target.checked)"
                          >
                        </label>

                        <button
                          class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 mr-2"
                          title="Edit"
                          @click="editingId = t._id; showEditModal = true"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            class="w-4 h-4"
                          ><path
                            d="M12 20h9"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          /><path
                            d="M16.5 3.5l4 4-10 10H6.5v-4.5l10-10z"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          /></svg>
                        </button>

                        <button
                          class="h-8 w-8 inline-grid place-items-center rounded-md bg-red-500/20 border border-red-400/60 text-red-200 hover:bg-red-500/35"
                          title="Delete"
                          @click="confirmDelete(t)"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            class="w-4 h-4"
                          ><path
                            d="M3 6h18"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          /><path
                            d="M8 6l1-2h6l1 2"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          /><rect
                            x="6"
                            y="6"
                            width="12"
                            height="14"
                            rx="1.5"
                            stroke-width="1.5"
                          /><path
                            d="M10 10v6M14 10v6"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr
                    v-if="dragOverIndex === idx && dragOverPos === 'below'"
                    :key="`placeholder-below-${idx}`"
                    class="h-6"
                  >
                    <td
                      :colspan="8"
                      class="h-6 bg-emerald-400/10 border-t-2 border-emerald-400/60"
                    />
                  </tr>
                </template>
                <tr
                  v-if="dragOverIndex === filtered.length - 1 && dragOverPos === 'below'"
                  :key="'placeholder-end'"
                  class="h-6"
                >
                  <td
                    :colspan="8"
                    class="h-6 bg-emerald-400/10 border-t-2 border-emerald-400/60"
                  />
                </tr>
              </transition-group>
            </table>
          </div>
        </template>
      </div>
    </div>

    <Modal
      v-model="showDeleteModal"
      panel-class="max-w-md"
    >
      <template #header>
        <div class="text-lg font-semibold text-white">
          Confirm deletion
        </div>
      </template>
      <div class="text-white/90">
        Are you sure you want to delete task "<strong>{{ deletingName }}</strong>"?
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-2 rounded bg-white/6 text-white"
            @click="cancelDelete"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded bg-red-600 text-white"
            @click="doDelete"
          >
            Delete
          </button>
        </div>
      </template>
    </Modal>
    <Modal
      v-model="showEditModal"
      panel-class="max-w-2xl"
    >
      <template #header>
        <div class="text-lg font-semibold text-white">
          {{ editingId && editingId !== 'new' ? 'Edit Task' : 'New Task' }}
        </div>
      </template>
      <TaskEditForm
        :id="editingId"
        :project-id="projectStore.currentProjectId"
        @saved="onEditSaved"
        @cancel="onEditCancel"
      />
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { defineAsyncComponent } from 'vue'
import { useProjectStore } from '../../stores/project'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import TaskEditForm from '../../components/TaskEditForm.vue'
import { http } from '../../utils/http'
const TaskGantt = defineAsyncComponent(() => import('../../components/TaskGantt.vue'))

const projectStore = useProjectStore()
const projectId = projectStore.currentProjectId
const tasks = ref([])
const q = ref('')
const loading = ref(false)
const showDeleteModal = ref(false)
const deletingId = ref(null)
const deletingName = ref('')
const viewMode = ref('list')
const showEditModal = ref(false)
const editingId = ref(null)

function onEditSaved(_res) {
  // close modal and refresh list
  showEditModal.value = false
  fetch()
}

function onEditCancel() {
  showEditModal.value = false
}

function isComplete(t) {
  const effective = pct(t)
  return (t && (effective === 100 || (t.status && String(t.status).toLowerCase() === 'completed')))
}

async function toggleComplete(t, checked) {
  if (!t || !t._id) return

  // Determine descendants by WBS prefix; if present, propagate toggle to all descendants
  const cp = t.wbs ? canonicalDescendantPrefix(String(t.wbs)) : ''
  const toUpdate = []
  if (cp) {
    // include the task itself and all descendants
    const descendants = (tasks.value || []).filter(x => x && x.wbs && String(x.wbs).startsWith(cp))
    toUpdate.push(t)
    for (const d of descendants) toUpdate.push(d)
  } else {
    toUpdate.push(t)
  }

  // Save old values for rollback
  const oldMap = new Map()
  for (const item of toUpdate) {
    oldMap.set(item._id || (item.wbs || ''), { status: item.status, percentComplete: item.percentComplete })
    item.percentComplete = checked ? 100 : 0
    item.status = checked ? 'Completed' : 'Not Started'
  }

  // Send PATCH requests in parallel
  try {
    const patches = toUpdate.map(item => {
      if (!item || !item._id) return Promise.resolve()
      return http.patch(`/api/tasks/${item._id}`, { status: item.status, percentComplete: item.percentComplete }).catch(err => ({ __err: err, id: item._id }))
    })
    const res = await Promise.all(patches)
    // detect failures
    const failed = res.filter(r => r && r.__err)
    if (failed.length > 0) {
      // rollback failed items
      for (const f of failed) {
        const id = f.id
        const item = tasks.value.find(x => x._id === id)
        if (item) {
          const old = oldMap.get(id) || {}
          item.status = old.status
          item.percentComplete = old.percentComplete
        }
      }
      try { alert('Failed to update some tasks') } catch (e) { console.error(e) }
    }
  } catch (err) {
    // revert all on unexpected error
    for (const item of toUpdate) {
      const key = item._id || (item.wbs || '')
      const old = oldMap.get(key) || {}
      item.status = old.status
      item.percentComplete = old.percentComplete
    }
    try { alert('Failed to update task status') } catch (e) { console.error(e) }
  }
}

function fmt(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString() } catch (e) { return String(d) } }

function wbsDepth(w) {
  if (!w) return 0
  const parts = String(w).split('.').filter(p => p !== '')
  return Math.max(0, parts.length - 1)
}

const filtered = computed(() => {
  const s = (q.value || '').toLowerCase()
  let list = tasks.value || []
  if (s) {
    list = list.filter(t => (t.name || '').toLowerCase().includes(s) || (t.description || '').toLowerCase().includes(s))
  }
  // sort by WBS ascending (string compare). Null/empty WBS go last.
  const sorted = list.slice().sort((a, b) => {
    const A = (a && a.wbs) ? String(a.wbs) : ''
    const B = (b && b.wbs) ? String(b.wbs) : ''
    if (A === B) return (String(a.name || '')).localeCompare(String(b.name || ''))
    if (!A) return 1
    if (!B) return -1
    return A.localeCompare(B, undefined, { numeric: true })
  })

  // apply collapsed filtering: remove any task that is a descendant of a collapsed parent (collapsed stored by _id)
  const taskById = Object.fromEntries((tasks.value || []).map(x => [String(x._id), x]))
  const visible = sorted.filter(t => {
    if (!t || !t.wbs) return true
    for (const pId of collapsed.value) {
      if (!pId) continue
      const parent = taskById[String(pId)]
      if (!parent || !parent.wbs) continue
      const cp = canonicalDescendantPrefix(String(parent.wbs))
      if (cp && String(t.wbs).startsWith(cp)) return false
    }
    return true
  })

  return visible
})

const fileInput = ref(null)
const importing = ref(false)
const draggingId = ref(null)
const dragOverIndex = ref(-1)
const dragOverPos = ref('') // 'above' | 'on' | 'below'
const collapsed = ref([]) // array of task _id strings that are collapsed

function storageKey() {
  return `tasks_collapsed_${projectStore.currentProjectId || 'global'}`
}

function loadCollapsed() {
  try {
    const key = storageKey()
    const raw = localStorage.getItem(key)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) collapsed.value = arr
    }
  } catch (e) {
    console.error('loadCollapsed error', e)
    collapsed.value = []
  }
}

function saveCollapsed() {
  try {
    const key = storageKey()
    localStorage.setItem(key, JSON.stringify(collapsed.value || []))
  } catch (e) { console.error('saveCollapsed error', e) }
}

function collapseAll() {
  // collect all tasks that have children
  const parents = new Set()
  for (const t of tasks.value || []) {
    if (hasChildren(t) && t._id) parents.add(String(t._id))
  }
  collapsed.value = Array.from(parents)
}

function expandAll() {
  collapsed.value = []
}

// persist collapsed state when it changes
watch(collapsed, () => saveCollapsed())
// when project changes, reload persisted collapsed state
watch(() => projectStore.currentProjectId, () => { loadCollapsed() })
// when tasks change we may want to reload persisted collapsed ids to keep consistency
watch(tasks, () => { /* noop placeholder - keep collapsed ids by id, no action needed */ })

function canonicalDescendantPrefix(parentWbs) {
  if (!parentWbs) return ''
  const segs = parseWbs(parentWbs)
  const last = segs[segs.length - 1] || 0
  if (last === 0) {
    const base = segs.slice(0, -1).join('.')
    return base ? (base + '.') : ''
  }
  return parentWbs + '.'
}

function isCollapsed(t) {
  if (!t || !t._id) return false
  return collapsed.value.includes(String(t._id))
}

function toggleCollapse(t) {
  if (!t || !t._id) return
  const key = String(t._id)
  if (collapsed.value.includes(key)) {
    collapsed.value = collapsed.value.filter(x => x !== key)
  } else {
    collapsed.value = [...collapsed.value, key]
  }
}

function hasChildren(t) {
  if (!t || !t.wbs) return false
  const cp = canonicalDescendantPrefix(String(t.wbs))
  if (!cp) return false
  return (tasks.value || []).some(x => {
    if (!x.wbs) return false
    if (String(x.wbs) === String(t.wbs)) return false
    return String(x.wbs).startsWith(cp)
  })
}

function getImmediateChildren(parent) {
  if (!parent || !parent.wbs) return []
  const parentWbs = String(parent.wbs)
  const segs = parseWbs(parentWbs)
  const last = segs[segs.length - 1] || 0

  let childBasePrefix = ''
  let childBaseLevel = 0
  if (last === 0) {
    childBasePrefix = segs.slice(0, -1).join('.')
    childBaseLevel = segs.length - 1
  } else {
    childBasePrefix = parentWbs
    childBaseLevel = segs.length
  }

  return (tasks.value || []).filter(x => {
    if (!x || !x.wbs) return false
    const k = String(x.wbs)
    if (k === parentWbs) return false
    const s = parseWbs(k)
    if (s.length !== childBaseLevel + 1) return false
    if (childBasePrefix) return k.startsWith(childBasePrefix + '.')
    return true
  })
}

function computePercentRecursive(task, seen = new Set()) {
  if (!task) return 0
  const id = task._id || String(task.wbs || '')
  if (seen.has(id)) return 0
  seen.add(id)

  const children = getImmediateChildren(task)
  if (!children || children.length === 0) {
    const p = Number(task.percentComplete)
    return Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : 0
  }

  // simple average of immediate children's percents (each child equal weight)
  let sum = 0
  for (const c of children) {
    const childPercent = computePercentRecursive(c, seen)
    sum += childPercent
  }
  const avg = children.length > 0 ? (sum / children.length) : 0
  return Math.max(0, Math.min(100, Math.round(avg)))
}

function pct(t) {
  // prefer computed percent if task has children
  const children = getImmediateChildren(t)
  if (children && children.length > 0) return computePercentRecursive(t)
  const p = Number(t && t.percentComplete)
  return Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : 0
}

function descendantCount(t) {
  if (!t || !t.wbs) return 0
  const cp = canonicalDescendantPrefix(String(t.wbs))
  if (!cp) return 0
  let cnt = 0
  for (const x of (tasks.value || [])) {
    if (!x.wbs) continue
    if (String(x.wbs) === String(t.wbs)) continue
    if (String(x.wbs).startsWith(cp)) cnt++
  }
  return cnt
}

function onFileSelected(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  uploadFile(f).catch(() => {})
}

function onDragStart(t, e) {
  draggingId.value = t && t._id ? t._id : null
  try { e.dataTransfer.setData('text/plain', draggingId.value) } catch (err) { console.error(err) }
  e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(e, idx) {
  dragOverIndex.value = idx
  const row = e.currentTarget
  if (!row) { dragOverPos.value = 'on'; return }
  const rect = row.getBoundingClientRect()
  const y = e.clientY - rect.top
  const h = rect.height
  if (y < h * 0.33) dragOverPos.value = 'above'
  else if (y > h * 0.66) dragOverPos.value = 'below'
  else dragOverPos.value = 'on'
}

function onDragLeave() {
  dragOverIndex.value = -1
  dragOverPos.value = ''
}

async function onDrop(e, idx) {
  const draggedId = (e.dataTransfer && e.dataTransfer.getData && e.dataTransfer.getData('text/plain')) || draggingId.value
  if (!draggedId) return onDragLeave()
  const list = filtered.value
  const target = list[idx]
  if (!target) return onDragLeave()
  const dragged = tasks.value.find(x => x._id === draggedId)
  if (!dragged) return onDragLeave()

  // if dropped on same task, do nothing
  if (dragged._id === target._id) { onDragLeave(); return }

  // compute mapping of oldWbs -> newWbs for affected tasks
  const updates = computeWbsReorder(tasks.value, dragged, target, dragOverPos.value)

  if (!updates || Object.keys(updates).length === 0) { onDragLeave(); return }

  // apply locally
  for (const t of tasks.value) {
    if (updates[t.wbs]) {
      t.wbs = updates[t.wbs]
    }
  }

  // Simpler approach: send PATCH for every task whose _id is in updates map by matching start of old prefix
  const patchPromises = []
  // we need original list snapshot to know old wbs values
  const snapshot = await http.get('/api/tasks', { params: { projectId: projectStore.currentProjectId, limit: 1000 } }).then(r => r.data.tasks || []).catch(() => tasks.value)
  for (const s of snapshot) {
    const old = s.wbs || ''
    if (updates[old]) {
      const newW = updates[old]
      patchPromises.push(http.patch(`/api/tasks/${s._id}`, { wbs: newW }).catch(() => {}))
    }
  }

  try {
    await Promise.all(patchPromises)
  } catch (err) {
    console.error('onDrop patch error', err)
    // ignore for now; could re-fetch
  }

  onDragLeave()
}

function parseWbs(w) {
  if (!w) return []
  return String(w).split('.').map(s => { const n = parseInt(s, 10); return Number.isNaN(n) ? 0 : n })
}

function joinWbs(segments) {
  return segments.join('.')
}

function computeWbsReorder(allTasks, dragged, target, pos) {
  // Build map oldWbs -> newWbs
  const map = {}
  const byWbs = Object.fromEntries((allTasks || []).map(t => [String(t.wbs || ''), t]))

  const targetWbs = String(target.wbs || '')
  const draggedWbs = String(dragged.wbs || '')

  if (pos === 'on') {
    // Make dragged a child of target.
    // Special handling: if target ends with a trailing zero (e.g. "1.0") then
    // its children should be numbered like "1.1", "1.2" (replace the trailing 0),
    // not as deeper nodes like "1.0.1". Otherwise create deeper children under target.
    const targetSegs = parseWbs(targetWbs)
    const targetLast = targetSegs[targetSegs.length - 1] || 0

    // Determine base prefix where direct children are numbered
    // If target ends with 0, children live at the same depth as target (replace trailing 0)
    // Otherwise children are one level deeper under the full targetWbs
    let childBasePrefix = ''
    let childBaseLevel = 0
    if (targetLast === 0) {
      childBasePrefix = targetSegs.slice(0, -1).join('.')
      childBaseLevel = targetSegs.length - 1
    } else {
      childBasePrefix = targetWbs
      childBaseLevel = targetSegs.length
    }

    // find direct children under childBasePrefix (exactly one segment deeper than base)
    const children = Object.keys(byWbs).filter(k => {
      const segs = parseWbs(k)
      const prefixMatch = childBasePrefix ? k.startsWith(childBasePrefix + '.') : true
      if (!prefixMatch) return false
      return segs.length === (childBaseLevel + 1)
    })

    let max = 0
    for (const c of children) {
      const segs = parseWbs(c)
      const last = segs[segs.length - 1] || 0
      if (last > max) max = last
    }

    const newLast = max + 1
    const newW = childBasePrefix ? (childBasePrefix + '.' + newLast) : String(newLast)

    // update dragged and its descendants (move subtree) by replacing the dragged prefix
    for (const k of Object.keys(byWbs)) {
      if (k === draggedWbs || k.startsWith(draggedWbs + '.')) {
        map[k] = k.replace(draggedWbs, newW)
      }
    }
    return map
  }

  // For 'above' or 'below' we insert among siblings of target
  const targetSegs = parseWbs(targetWbs)
  const parentPrefix = targetSegs.slice(0, -1).join('.')
  const targetIndex = targetSegs[targetSegs.length - 1] || 0

  // Determine insertion index: if above -> insert at targetIndex, shifting target and later siblings up by 1
  // if below -> insert at targetIndex + 1, shifting later siblings starting at that index up by 1
  const insertAt = (pos === 'above') ? targetIndex : (targetIndex + 1)

  // collect siblings under same parent
  const siblings = Object.keys(byWbs).filter(k => {
    const segs = parseWbs(k)
    const p = segs.slice(0, -1).join('.')
    return p === parentPrefix
  }).map(k => ({ w: k, segs: parseWbs(k) }))
  // sort siblings by numeric segments
  siblings.sort((a, b) => a.w.localeCompare(b.w, undefined, { numeric: true }))

  // For each sibling with last segment >= insertAt, increment last segment by 1 (and adjust descendants)
  for (const s of siblings) {
    const last = s.segs[s.segs.length -1] || 0
    if (last >= insertAt) {
      const oldPrefix = s.w
      const newSegs = s.segs.slice()
      newSegs[newSegs.length -1] = last + 1
      const newW = joinWbs(newSegs)
      // update sibling and its descendants
      for (const k of Object.keys(byWbs)) {
        if (k === oldPrefix || k.startsWith(oldPrefix + '.')) {
          map[k] = k.replace(oldPrefix, newW)
        }
      }
    }
  }

  // Now assign dragged to the insert position under parentPrefix
  const newLast = insertAt
  // build string newW
  const newW = parentPrefix ? (parentPrefix + '.' + newLast) : String(newLast)
  for (const k of Object.keys(byWbs)) {
    if (k === draggedWbs || k.startsWith(draggedWbs + '.')) {
      map[k] = k.replace(draggedWbs, newW)
    }
  }

  return map
}

async function uploadFile(file) {
  if (!projectStore.currentProjectId) return alert('Select a project first')
  importing.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('projectId', projectStore.currentProjectId)
    const resp = await http.post('/api/tasks/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    // show brief feedback then refresh
    const count = resp.data && resp.data.imported ? resp.data.imported : 0
    try { alert(`Imported ${count} tasks`) } catch (e) { console.error(e) }
    await fetch()
  } catch (err) {
    try { alert('Import failed: ' + (err && err.response && err.response.data && err.response.data.error ? err.response.data.error : (err.message || err))) } catch (e) { console.error(e) }
  } finally { importing.value = false; if (fileInput.value) fileInput.value.value = '' }
}

async function fetch() {
  if (!projectStore.currentProjectId) return
  loading.value = true
  try {
    const resp = await http.get('/api/tasks', { params: { projectId: projectStore.currentProjectId, limit: 200 } })
    tasks.value = resp.data.tasks || []
  } catch (e) {
    tasks.value = []
  } finally { loading.value = false }
}

onMounted(() => { fetch(); loadCollapsed() })

function confirmDelete(t) { deletingId.value = t._id; deletingName.value = t.name || ''; showDeleteModal.value = true }
function cancelDelete() { deletingId.value = null; deletingName.value = ''; showDeleteModal.value = false }

async function doDelete() {
  if (!deletingId.value) return
  try {
    await http.delete(`/api/tasks/${deletingId.value}`)
    // remove locally
    tasks.value = tasks.value.filter(x => x._id !== deletingId.value)
  } catch (e) {
    // ignore for now
  } finally {
    cancelDelete()
  }
}
</script>

<style scoped>
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  height: 0 !important;
}
.drop-enter-active,
.drop-leave-active {
  transition: all 220ms ease;
}
.drop-enter-active {
  transition: all 220ms ease;
}
.drop-enter-to,
.drop-leave-from {
  opacity: 1;
  transform: translateY(0);
  height: 1.5rem !important;
}
.drop-move {
  transition: transform 200ms ease;
}

/* Compact rows: reduce vertical spacing by ~25% */
.compact-rows td,
.compact-rows th {
  padding-top: 0.375rem; /* 0.5rem * 0.75 */
  padding-bottom: 0.375rem;
}
.compact-rows .drag-handle {
  height: 1.3125rem !important; /* 1.75rem * 0.75 */
  width: 1.3125rem !important;
}
.compact-rows tr.h-6 {
  height: 1.125rem !important; /* 1.5rem * 0.75 */
}
.compact-rows .drop-enter-to,
.compact-rows .drop-leave-from {
  height: 1.125rem !important;
}
</style>
