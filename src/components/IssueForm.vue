<template>
  <div class="space-y-3">
    <label class="block text-white/80">Type</label>
    <input v-model="local.issue.type" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
    <p v-if="errors.type" class="text-sm text-red-400 mt-1">{{ errors.type }}</p>

    <label class="block text-white/80">Description</label>
    <textarea v-model="local.issue.description" rows="5" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white"></textarea>
    <p v-if="errors.description" class="text-sm text-red-400 mt-1">{{ errors.description }}</p>

    <label class="block text-white/80">Priority</label>
    <select v-model="local.issue.priority" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white">
      <option v-for="opt in ['Critical','High','Medium','Low']" :key="opt">{{ opt }}</option>
    </select>
    <p v-if="errors.priority" class="text-sm text-red-400 mt-1">{{ errors.priority }}</p>

    <label class="block text-white/80">Responsible person</label>
    <input v-model="local.issue.responsible_person" class="w-full rounded-lg p-2 bg-white/5 border border-white/10 text-white" />
    <p v-if="errors.responsible_person" class="text-sm text-red-400 mt-1">{{ errors.responsible_person }}</p>
  </div>
</template>

<script setup>
import { reactive, toRefs, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  errors: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

// Local copy to allow editing without mutating parent until saved
const local = reactive({ issue: { ...props.modelValue } })

watch(() => props.modelValue, (v) => {
  local.issue = { ...v }
})

watch(() => local.issue, (v) => {
  emit('update:modelValue', { ...v })
}, { deep: true })
</script>
