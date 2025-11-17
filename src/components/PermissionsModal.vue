<template>
  <Modal
    :model-value="visible"
    panel-class="max-w-[780px]"
    @update:model-value="onModalUpdate"
  >
    <template #header>
      <div class="font-medium text-white">
        Edit permissions for {{ memberDisplay }}
      </div>
    </template>

    <div class="mb-3 text-sm text-white/80">
      <label class="block mb-1">Apply template</label>
      <div class="flex gap-2">
        <select
          v-model="selectedTemplateId"
          class="p-2 rounded bg-white/5 border border-white/10 flex-1 text-white"
        >
          <option value="">
            -- select template --
          </option>
          <option
            v-for="rt in roleTemplates"
            :key="rt._id || rt.id"
            :value="rt._id || rt.id"
          >
            {{ rt.name }}
          </option>
        </select>
        <button
          class="px-3 py-1 rounded bg-white/6"
          :disabled="!selectedTemplateId"
          @click="applyTemplate"
        >
          Apply
        </button>
      </div>
    </div>

    <div class="mb-3 text-sm text-white/80">
      <div class="grid grid-cols-2 gap-3 max-h-[340px] overflow-auto">
        <div
          v-for="(ops, resource) in matrix"
          :key="resource"
          class="p-3 rounded bg-white/5"
        >
          <div class="font-medium mb-2 text-white">
            {{ resource }}
          </div>
          <div class="grid grid-cols-4 gap-2 text-sm">
            <label
              v-for="op in ops"
              :key="op"
              class="inline-flex items-center gap-2"
            >
              <input
                v-model="selectedPermsArray"
                type="checkbox"
                :value="`${resource}.${op}`"
              >
              <span class="capitalize text-white/80">{{ op }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="text-right w-full">
        <button
          class="px-3 py-1 rounded bg-white/6 mr-2"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          class="px-3 py-1 rounded bg-emerald-500 text-white"
          @click="save"
        >
          Save
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Modal from './Modal.vue'
import { ref, computed, watch } from 'vue'
import http from '../utils/http'
import { getAuthHeaders } from '../utils/auth'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()

const props = defineProps({
  visible: { type: Boolean, default: false },
  member: { type: Object, required: true },
  projectId: { type: String, required: true },
  roleTemplates: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'saved'])

// Define matrix of resources -> operations. Keep in sync with backend permissions.
const matrix = {
  issues: ['create', 'read', 'update', 'delete'],
  activities: ['create', 'read', 'update', 'delete'],
  equipment: ['create', 'read', 'update', 'delete'],
  templates: ['create', 'read', 'update', 'delete'],
  spaces: ['create', 'read', 'update', 'delete'],
  projects: ['create', 'read', 'update', 'delete']
}

const selectedTemplateId = ref('')
const selectedPerms = ref(new Set())

const memberDisplay = computed(() => {
  if (!props.member) return ''
  return props.member.email || `${props.member.firstName || ''} ${props.member.lastName || ''}`
})

function normalizePermValue(p) {
  try {
    if (!p && p !== 0) return ''
    // If permission stored as object, try common fields
    if (typeof p === 'object') {
      if (p.permission) return String(p.permission).trim().toLowerCase()
      if (p.permissions) return String(p.permissions).trim().toLowerCase()
      return JSON.stringify(p)
    }
    return String(p).trim().toLowerCase()
  } catch (e) { return String(p || '').trim().toLowerCase() }
}

// initialize selectedPerms when modal becomes visible or member changes
watch([
  () => props.visible,
  () => props.member
], ([visible, member]) => {
  if (!visible || !member) return
  const raw = Array.isArray(member.permissions) ? member.permissions : []
  const arr = raw.map(normalizePermValue).filter(Boolean)
  selectedPerms.value = new Set(arr)
  // If the member has a role that matches a template name, pre-select that template id
  if (member && member.role && Array.isArray(props.roleTemplates)) {
    const match = props.roleTemplates.find(r => String(r.name).toLowerCase() === String(member.role).toLowerCase())
    selectedTemplateId.value = match ? (match._id || match.id) : ''
  } else {
    selectedTemplateId.value = ''
  }
}, { immediate: true })

const selectedPermsArray = computed({
  get() { return Array.from(selectedPerms.value) },
  set(v) { selectedPerms.value = new Set(Array.isArray(v) ? v : []) }
})

async function applyTemplate() {
  try {
    if (!selectedTemplateId.value) return
    const tpl = (props.roleTemplates || []).find(r => (r._id || r.id) === selectedTemplateId.value)
    if (!tpl) return
    const perms = Array.isArray(tpl.permissions) ? tpl.permissions.map(normalizePermValue) : []
    selectedPerms.value = new Set(perms.filter(Boolean))
  } catch (err) {
    console.error('applyTemplate error', err)
  }
}

async function save() {
  try {
    const pid = props.projectId
    const memberId = props.member._id || props.member.email
    const perms = Array.from(selectedPerms.value).map(normalizePermValue)
    const body = { permissions: perms }
    // If a template was selected, also send the template's name as the member role
    try {
      if (selectedTemplateId.value) {
        const tpl = (props.roleTemplates || []).find(r => (r._id || r.id) === selectedTemplateId.value)
        if (tpl && tpl.name) body.role = tpl.name
      }
    } catch (e) {
      // ignore
    }
    const resp = await http.put(`/api/projects/${pid}/team/${memberId}/permissions`, body, { headers: getAuthHeaders() })
    ui.showSuccess('Permissions saved')
    // If backend returned the updated member, emit it so parent can update immediately
    const updatedMember = resp && resp.data && resp.data.member ? resp.data.member : null
    emit('saved', updatedMember)
    emit('close')
  } catch (err) {
    console.error('save permissions error', err)
    const msg = err?.response?.data?.error || err?.message || 'Failed to save permissions'
    ui.showError(msg)
  }
}

function onModalUpdate(val) {
  // when Modal requests to close, forward the close event to the parent
  if (!val) emit('close')
}
</script>
