<template>
  <Modal v-model="open" :z-index="zIndex">
    <template #header>
      <div class="flex items-center justify-between text-white">
        <div class="font-medium text-base">{{ title || 'Confirm' }}</div>
      </div>
    </template>

    <div class="text-white/90 text-sm">
      <p class="whitespace-pre-line">{{ message }}</p>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button type="button" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white" @click="onCancel">
          {{ cancelText || 'Cancel' }}
        </button>
        <button type="button" class="px-3 py-2 rounded-md text-white" :class="confirmClasses" @click="onConfirm">
          {{ confirmText || 'Confirm' }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Modal from './Modal.vue'

const props = defineProps({
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  variant: { type: String, default: 'default' },
  zIndex: { type: Number, default: 10000 },
  modelValue: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'resolve'])

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const confirmClasses = computed(() => {
  const v = props.variant
  if (v === 'danger' || v === 'error') {
    return 'bg-red-500/20 border border-red-400/40 hover:bg-red-500/30'
  }
  if (v === 'success') {
    return 'bg-emerald-500/20 border border-emerald-400/40 hover:bg-emerald-500/30'
  }
  return 'bg-white/20 border border-white/30 hover:bg-white/30'
})

function onCancel() {
  emit('resolve', false)
}
function onConfirm() {
  emit('resolve', true)
}
</script>
