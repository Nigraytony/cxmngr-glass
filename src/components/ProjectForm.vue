<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-white/80 mb-1">Name</label>
        <input v-model="local.name" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
        <p v-if="errors.name" class="text-sm text-red-400 mt-1">{{ errors.name }}</p>
      </div>

      <div>
        <label class="block text-white/80 mb-1">Client</label>
        <input v-model="local.client" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
        <p v-if="errors.client" class="text-sm text-red-400 mt-1">{{ errors.client }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-white/80 mb-1">Project Number</label>
        <input v-model="local.number" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
      </div>

      <div>
        <label class="block text-white/80 mb-1">PO Number</label>
        <input v-model="local.po_number" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-white/80 mb-1">Type</label>
        <input v-model="local.project_type" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
      </div>

      <div>
        <label class="block text-white/80 mb-1">Location</label>
        <input v-model="local.location" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-white/80 mb-1">Start Date</label>
        <input v-model="local.startDate" type="date" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
      </div>
      <div>
        <label class="block text-white/80 mb-1">End Date</label>
        <input v-model="local.endDate" type="date" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
      </div>
    </div>

    <div>
      <label class="block text-white/80 mb-1">Description</label>
      <textarea v-model="local.description" rows="3" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"></textarea>
    </div>

  </div>
</template>

<script setup>
import { reactive, toRefs, watch, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

function toInputDate(val) {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function toISOStringDateFromInput(val) {
  if (!val) return ''
  // val expected as YYYY-MM-DD
  const d = new Date(val)
  if (isNaN(d.getTime())) return ''
  return d.toISOString()
}

const local = reactive({
  // preserve identifiers so emitted model retains project id
  _id: props.modelValue._id || props.modelValue.id || null,
  id: props.modelValue.id || props.modelValue._id || null,
  name: props.modelValue.name || '',
  number: props.modelValue.number || '',
  po_number: props.modelValue.po_number || '',
  project_type: props.modelValue.project_type || '',
  industry: props.modelValue.industry || '',
  client: props.modelValue.client || '',
  location: props.modelValue.location || '',
  building_type: props.modelValue.building_type || '',
  description: props.modelValue.description || '',
  status: props.modelValue.status || 'active',
  settings: props.modelValue.settings || [],
  photos: props.modelValue.photos || [],
  documents: props.modelValue.documents || [],
  team: props.modelValue.team || [],
  commissioning_agent: props.modelValue.commissioning_agent || {},
  logo: props.modelValue.logo || '',
  mata: props.modelValue.mata || [],
  tags: Array.isArray(props.modelValue.tags) ? props.modelValue.tags : (props.modelValue.tags ? props.modelValue.tags.split(',').map(s => s.trim()) : []),
  startDate: toInputDate(props.modelValue.startDate || props.modelValue.start_date),
  endDate: toInputDate(props.modelValue.endDate || props.modelValue.end_date),
})

const tagsText = computed({
  get() { return local.tags.join(', ') },
  set(v) { local.tags = v.split(',').map(s => s.trim()).filter(Boolean) }
})

// keep local in sync when parent passes a new modelValue (e.g., async fetch)
watch(() => props.modelValue, (nv) => {
  if (!nv) {
  Object.assign(local, {
      _id: null, id: null,
      name: '', number: '', po_number: '', project_type: '', industry: '', client: '', location: '', building_type: '', description: '', status: 'active', settings: [], photos: [], documents: [], team: [], commissioning_agent: {}, logo: '', mata: [], tags: [], startDate: '', endDate: ''
    })
    return
  }

  Object.assign(local, {
    _id: nv._id || nv.id || null,
    id: nv.id || nv._id || null,
    name: nv.name || '',
    number: nv.number || '',
    po_number: nv.po_number || '',
    project_type: nv.project_type || '',
    industry: nv.industry || '',
    client: nv.client || '',
    location: nv.location || '',
    building_type: nv.building_type || '',
    description: nv.description || '',
    status: nv.status || 'active',
    settings: nv.settings || [],
    photos: nv.photos || [],
    documents: nv.documents || [],
    team: nv.team || [],
    commissioning_agent: nv.commissioning_agent || {},
    logo: nv.logo || '',
    mata: nv.mata || [],
    tags: Array.isArray(nv.tags) ? nv.tags : (nv.tags ? nv.tags.split(',').map(s => s.trim()) : []),
    startDate: toInputDate(nv.startDate || nv.start_date),
    endDate: toInputDate(nv.endDate || nv.end_date)
  })
}, { immediate: true, deep: true })

watch(local, (v) => {
  // emit with ISO date strings for backend compatibility
  const out = { ...v }
  out.startDate = v.startDate ? toISOStringDateFromInput(v.startDate) : ''
  out.endDate = v.endDate ? toISOStringDateFromInput(v.endDate) : ''
  emit('update:modelValue', out)
}, { deep: true })

// expose errors for template
const errors = props.errors
</script>
