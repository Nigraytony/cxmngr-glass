<template>
  <div class="absolute left-0 right-0 z-50 pointer-events-none" :style="{ top: top, transform: transformStyle }">
    <div v-if="show" class="flex justify-center">
      <div :class="cardClasses" class="max-w-3xl w-full mx-6 rounded-lg p-3 shadow-lg backdrop-blur-md pointer-events-auto flex items-center justify-between gap-4">
        <div class="flex-1 text-sm" role="status" aria-live="polite">{{ message }}</div>
        <button @click="close" :aria-label="closeLabel" :class="closeClass">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  message: { type: String, default: '' },
  show: { type: Boolean, default: false },
  top: { type: String, default: '4rem' },
  variant: { type: String, default: 'white' }, // 'white'|'yellow'|'success'|'error'
  duration: { type: Number, default: 2500 },
})
const emit = defineEmits(['update:show', 'close'])

let timeoutId = null

watch(() => props.show, (v) => {
  if (v) {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      emit('update:show', false)
      emit('close')
    }, props.duration)
  } else {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
  }
})

onBeforeUnmount(() => { if (timeoutId) clearTimeout(timeoutId) })

function close() {
  emit('update:show', false)
  emit('close')
}

const cardClasses = computed(() => {
  switch (props.variant) {
    case 'yellow':
    case 'warning':
      return 'bg-yellow-300/18 text-yellow-900 border border-yellow-200/30'
    case 'success':
      // green success toast
      return 'bg-green-700/70 text-white border border-green-600/60'
    case 'error':
      // red error toast
      return 'bg-red-700/70 text-white border border-red-600/60'
    case 'info':
      // blue info toast
      return 'bg-blue-700/70 text-white border border-blue-600/60'
    default:
      // default white frosted
      return 'bg-white/20 text-white border border-white/20 backdrop-blur-md'
  }
})

const closeClass = computed(() => {
  if (props.variant === 'yellow' || props.variant === 'warning') return 'text-yellow-900/80 hover:text-yellow-900 ml-3'
  return 'text-white/80 hover:text-white ml-3'
})
const closeLabel = computed(() => 'Close toast')

const transformStyle = computed(() => {
  // If top is centered (e.g. '50vh' or '50%'), translateY(-50%) to visually center the toast
  if (typeof props.top === 'string' && (props.top.includes('50vh') || props.top.includes('50%'))) {
    return 'translateY(-50%)'
  }
  return ''
})
</script>
