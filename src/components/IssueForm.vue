<template>
  <div class="space-y-4">
    <!-- Number and Status -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div>
        <label class="block text-white/80">Number</label>
        <input
          v-model.number="local.issue.number"
          type="number"
          disabled
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
        >
      </div>
      <div class="md:col-span-2 grid grid-cols-2 gap-3">
        <div>
          <label class="block text-white/80">Status</label>
          <select
            v-model="local.issue.status"
            :disabled="isReadOnly"
            class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
          >
            <option
              v-for="opt in statusOptions"
              :key="String(opt.value)"
              :value="opt.value"
            >
              {{ opt.text }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-white/80">Priority</label>
          <select
            v-model="local.issue.priority"
            :disabled="isReadOnly"
            class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
          >
            <option
              v-for="opt in priorityOptions"
              :key="String(opt.value)"
              :value="opt.value"
            >
              {{ opt.text }}
            </option>
          </select>
          <p
            v-if="errors.priority"
            class="text-sm text-red-400 mt-1"
          >
            {{ errors.priority }}
          </p>
        </div>
      </div>
    </div>

    <!-- Title and Type -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label class="block text-white/80">Title</label>
        <input
          v-model="local.issue.title"
          :disabled="isReadOnly"
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
        >
      </div>
      <div>
        <label class="block text-white/80">Type</label>
        <select
          v-model="local.issue.type"
          :disabled="isReadOnly"
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
        >
          <option
            v-for="opt in issueTypeOptions"
            :key="String(opt.value)"
            :value="opt.value"
          >
            {{ opt.text }}
          </option>
        </select>
        <p
          v-if="errors.type"
          class="text-sm text-red-400 mt-1"
        >
          {{ errors.type }}
        </p>
      </div>
    </div>

    <!-- Found By / Date Found -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label class="block text-white/80">Found By</label>
        <input
          v-model="local.issue.foundBy"
          :disabled="isReadOnly"
          :list="foundByListId"
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
          placeholder="First Last (Company)"
        >
        <datalist :id="foundByListId">
          <option
            v-for="m in teamSuggestions"
            :key="'fb-'+m"
            :value="m"
          >
            {{ m }}
          </option>
        </datalist>
      </div>
      <div>
        <label class="block text-white/80">Date Found</label>
        <input
          v-model="local.issue.dateFound"
          type="date"
          :disabled="isReadOnly"
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
        >
      </div>
    </div>

    <!-- Assigned To / Due Date -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label class="block text-white/80">Assigned To</label>
        <input
          v-model="local.issue.assignedTo"
          :disabled="isReadOnly"
          :list="assignedToListId"
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
          placeholder="First Last (Company)"
        >
        <datalist :id="assignedToListId">
          <option
            v-for="m in teamSuggestions"
            :key="'as-'+m"
            :value="m"
          >
            {{ m }}
          </option>
        </datalist>
        <p
          v-if="errors.assignedTo"
          class="text-sm text-red-400 mt-1"
        >
          {{ errors.assignedTo }}
        </p>
      </div>
      <div>
        <label class="block text-white/80">Due Date</label>
        <input
          v-model="local.issue.dueDate"
          type="date"
          :disabled="isReadOnly"
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
        >
      </div>
    </div>

    <!-- Location / System -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label class="block text-white/80">Location</label>
        <input
          v-model="local.issue.location"
          :disabled="isReadOnly"
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
        >
      </div>
      <div>
        <label class="block text-white/80">System</label>
        <select
          v-model="local.issue.system"
          :disabled="isReadOnly"
          class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
        >
          <option
            v-for="opt in systemOptions"
            :key="String(opt.value)"
            :value="opt.value"
          >
            {{ opt.text }}
          </option>
        </select>
      </div>
    </div>

    <!-- Description -->
    <div>
      <label class="block text-white/80">Description</label>
      <textarea
        v-model="local.issue.description"
        rows="5"
        :disabled="isReadOnly"
        class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white disabled:opacity-60"
      />
      <p
        v-if="errors.description"
        class="text-sm text-red-400 mt-1"
      >
        {{ errors.description }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, computed } from 'vue'
import lists from '../lists.js'
import { useProjectStore } from '../stores/project'

const props = defineProps({
  modelValue: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

// Local copy to allow editing without mutating parent until saved
const issueTypeOptions = computed(() => lists?.issueTypes || [])
const priorityOptions = computed(() => lists?.issuePriorities || [])
const statusOptions = computed(() => lists?.issueStatuses || [])
const systemOptions = computed(() => lists?.systemOptions || [])

const local = reactive({ issue: { status: 'open', priority: 'medium', ...props.modelValue } })
const isReadOnly = computed(() => {
  const s = String(local.issue?.status || '').toLowerCase()
  return s === 'closed' || s === 'canceled' || s === 'cancelled'
})

// Team-based suggestions for Found By and Assigned To
const projectStore = useProjectStore()
const teamSuggestions = computed(() => {
  const team = (projectStore.currentProject || {}).team || []
  const out = []
  for (const m of team) {
    const name = `${m?.firstName || ''} ${m?.lastName || ''}`.trim()
    const company = m?.company || ''
    if (name && company) out.push(`${name} (${company})`)
    else if (name) out.push(name)
    else if (company) out.push(company)
  }
  return Array.from(new Set(out))
})
const foundByListId = 'foundByList'
const assignedToListId = 'assignedToList'

watch(() => props.modelValue, (v) => {
  local.issue = { ...v }
})

watch(() => local.issue, (v) => {
  emit('update:modelValue', { ...v })
}, { deep: true })
</script>
