<template>
  <div class="w-full">
    <div class="relative">
      <div class="rounded-full flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-xl text-white/90 h-9 px-3 shadow focus-within:ring-2 focus-within:ring-white/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          class="w-4 h-4 text-white/70 shrink-0"
          aria-hidden="true"
        >
          <path
            d="M21 21l-4.3-4.3"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path
            d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
            stroke-width="1.5"
          />
        </svg>

        <input
          ref="inputEl"
          :value="modelValue"
          type="text"
          :placeholder="placeholder"
          class="bg-transparent border-0 outline-none text-sm text-white placeholder-white/50 w-full min-w-0"
          @input="onInput"
          @keydown.enter="emit('enter')"
        >

        <button
          v-if="String(modelValue || '').trim()"
          type="button"
          class="w-7 h-7 grid place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white shrink-0"
          aria-label="Clear search"
          @click="onClear"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-4 h-4"
            aria-hidden="true"
          >
            <path
              d="M6 6l12 12M18 6l-12 12"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Search…' },
})

const emit = defineEmits(['update:modelValue', 'clear', 'enter'])
const inputEl = ref(null)

function onInput(e) {
  const val = e?.target?.value ?? ''
  emit('update:modelValue', val)
}

function onClear() {
  if (typeof inputEl.value?.focus === 'function') inputEl.value.focus()
  emit('clear')
  emit('update:modelValue', '')
}

defineExpose({
  focus: () => {
    try { inputEl.value?.focus() } catch (e) { /* ignore */ }
  },
})
</script>

