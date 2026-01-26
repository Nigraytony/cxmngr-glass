<template>
  <div class="space-y-4">
    <!-- New comment input -->
    <div>
      <label class="block text-sm text-white/70 mb-1">Add a comment</label>
      <div class="flex items-start gap-3">
        <!-- current user avatar preview -->
        <div class="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
          <img
            v-if="avatarSrc"
            :src="avatarSrc"
            class="w-full h-full object-cover"
            alt="avatar"
          >
          <span
            v-else
            class="text-xs"
          >{{ initials }}</span>
        </div>
        <textarea
          v-model="text"
          rows="3"
          class="flex-1 rounded-md p-2 bg-white/10 border border-white/20 placeholder-gray-400"
          :placeholder="placeholder"
        />
        <button
          :disabled="adding || !text.trim()"
          class="h-10 px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 disabled:opacity-60 disabled:cursor-not-allowed"
          @click="add"
        >
          {{ adding ? 'Adding…' : submitText }}
        </button>
      </div>
    </div>

    <!-- Comments list -->
    <div>
      <label class="block text-sm text-white/70 mb-1">Existing comments</label>
      <div
        v-if="!list.length"
        class="text-white/60"
      >
        No comments yet.
      </div>
      <ul
        v-else
        class="space-y-3"
      >
        <li
          v-for="(c, i) in list"
          :key="c._tempId || c._id || c.id || i"
          class="p-3 rounded-md bg-white/5 border border-white/10"
        >
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <img
                v-if="c.avatar"
                :src="c.avatar"
                class="w-full h-full object-cover"
                alt="avatar"
              >
              <span
                v-else
                class="text-xs"
              >{{ initialsFromName(c.name) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-medium text-white truncate">
                  {{ displayName(c) }}
                </div>
                <div class="text-xs text-white/60 whitespace-nowrap">
                  {{ formatDateTime(c.createdAt) }}
                </div>
              </div>
              <div class="text-sm text-white/90 mt-1 whitespace-pre-line break-words">
                <template v-if="editingIndex === i">
                  <textarea
                    v-model="editText"
                    rows="3"
                    class="w-full rounded-md p-2 bg-white/10 border border-white/20 placeholder-gray-400"
                  />
                  <div class="mt-2 flex items-center gap-2">
                    <button
                      class="px-2 py-1 text-xs rounded-md bg-white/5 border border-white/15 hover:bg-white/10"
                      @click="cancelEdit"
                    >
                      Cancel
                    </button>
                    <button
                      :disabled="savingEdit || !editText.trim()"
                      class="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed"
                      @click="saveEdit(i, c)"
                    >
                      {{ savingEdit ? 'Saving…' : 'Save' }}
                    </button>
                  </div>
                </template>
                <template v-else>
                  {{ c.text }}
                </template>
              </div>

              <div class="mt-2 flex items-center gap-2">
                <button
                  v-if="allowEdit && canEditComment(c) && editingIndex !== i"
                  class="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  @click="startEdit(i, c)"
                >
                  Edit
                </button>
                <button
                  v-if="allowDelete && canDelete(c)"
                  :disabled="deletingIndex === i"
                  class="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed"
                  @click="remove(i, c)"
                >
                  {{ deletingIndex === i ? 'Removing…' : 'Remove' }}
                </button>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Write a comment…' },
  submitText: { type: String, default: 'Add' },
  allowEdit: { type: Boolean, default: true },
  allowDelete: { type: Boolean, default: true },
  // Optional async hooks for persistence; if not provided, component only emits changes
  onAdd: { type: Function, default: null }, // (text) => Promise<Comment | void>
  onEdit: { type: Function, default: null }, // (comment, index, nextText) => Promise<Comment | void>
  onDelete: { type: Function, default: null }, // (comment, index) => Promise<void>
  canEdit: { type: Function, default: null },
  canDelete: { type: Function, default: (/* comment */) => true },
})

const emit = defineEmits(['update:modelValue', 'added', 'edited', 'deleted'])

const list = ref([ ...props.modelValue ])
watch(() => props.modelValue, (nv) => {
  list.value = [ ...(nv || []) ]
  if (editingIndex.value >= list.value.length) cancelEdit()
})

const auth = useAuthStore()
const text = ref('')
const adding = ref(false)
const deletingIndex = ref(-1)
const editingIndex = ref(-1)
const editText = ref('')
const savingEdit = ref(false)

const avatarSrc = computed(() => (auth.user?.avatar || auth.user?.contact?.avatar || ''))
const initials = computed(() => {
  const f = auth.user?.firstName || ''
  const l = auth.user?.lastName || ''
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase()
  if (f) return f.slice(0,2).toUpperCase()
  return (auth.user?.email || '?').slice(0,2).toUpperCase()
})

function formatDateTime(d) { if (!d) return ''; try { return new Date(d).toLocaleString() } catch (e) { return String(d) } }
function displayName(c) { return (c && (c.name || '')) || 'Anonymous' }
function initialsFromName(n) {
  if (!n) return '?'
  const parts = String(n).trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const last = (parts.length > 1 ? parts[parts.length - 1][0] : '') || ''
  return (first + last).toUpperCase() || '?'
}

function normalizeId(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  try { return String(v).trim() } catch (e) { return '' }
}

function commentUserId(c) {
  if (!c || typeof c !== 'object') return ''
  return normalizeId(c.userId || c.user?._id || c.user?.id)
}

const currentUserId = computed(() => normalizeId(auth.user?._id || auth.user?.id))

function canEditComment(c) {
  try {
    if (props.canEdit) return Boolean(props.canEdit(c))
  } catch (e) { /* ignore */ }
  const uid = commentUserId(c)
  return Boolean(uid && currentUserId.value && uid === currentUserId.value)
}

function startEdit(i, c) {
  if (!canEditComment(c)) return
  editingIndex.value = i
  editText.value = String(c?.text || '')
}

function cancelEdit() {
  editingIndex.value = -1
  editText.value = ''
  savingEdit.value = false
}

async function saveEdit(i, c) {
  const nextText = String(editText.value || '').trim()
  if (!nextText) return
  if (!c || typeof c !== 'object') return

  const idx = typeof i === 'number' ? i : -1
  if (idx < 0 || idx >= list.value.length) return

  const before = list.value[idx]
  const beforeText = String(before?.text || '')
  if (beforeText.trim() === nextText) {
    cancelEdit()
    return
  }

  // optimistic local update
  const next = [ ...list.value ]
  next[idx] = { ...before, text: nextText }
  list.value = next

  try {
    savingEdit.value = true
    if (props.onEdit) {
      const saved = await props.onEdit(c, idx, nextText)
      emit('edited', saved || next[idx])
    } else {
      emit('update:modelValue', next)
      emit('edited', next[idx])
    }
    cancelEdit()
  } catch (e) {
    // rollback on failure
    list.value = [ ...next ]
    list.value[idx] = before
    savingEdit.value = false
    throw e
  }
}

async function add() {
  const t = (text.value || '').trim()
  if (!t) return
  const c = {
    userId: auth.user?._id || auth.user?.id || '',
    name: `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim() || (auth.user?.email || 'Anonymous'),
    avatar: auth.user?.avatar || auth.user?.contact?.avatar || '',
    text: t,
    createdAt: new Date().toISOString(),
    _tempId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  }
  try {
    adding.value = true
    if (props.onAdd) {
      const saved = await props.onAdd(t)
      // parent handler will update modelValue; we only clear input
      emit('added', saved || c)
    } else {
      list.value = [ ...list.value, c ]
      emit('update:modelValue', list.value)
      emit('added', c)
    }
    text.value = ''
  } finally {
    adding.value = false
  }
}

async function remove(i, c) {
  try {
    if (editingIndex.value === i) cancelEdit()
    deletingIndex.value = i
    if (props.onDelete) {
      await props.onDelete(c, i)
      emit('deleted', c)
    } else {
      const next = [ ...list.value ]
      next.splice(i, 1)
      list.value = next
      emit('update:modelValue', next)
      emit('deleted', c)
    }
  } finally {
    deletingIndex.value = -1
  }
}
</script>
