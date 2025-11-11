<template>
  <teleport to="body">
    <div
      v-if="modelValue"
      :class="['fixed inset-0 grid place-items-center', zIndexClass]"
      :style="zIndexStyle"
    >
      <div
        class="absolute inset-0 bg-black/50"
        @click="close"
      />

      <transition
        enter="transition transform ease-out duration-350"
        enter-from="opacity-0 translate-y-6 scale-90"
        enter-to="opacity-100 translate-y-0 scale-100"
        leave="transition transform ease-in duration-300"
        leave-from="opacity-100 translate-y-0 scale-100"
        leave-to="opacity-0 translate-y-6 scale-90"
      >
        <div
          v-if="modelValue"
          class="relative rounded-2xl p-6 w-full bg-white/8 backdrop-blur-xl border border-white/10 ring-1 ring-white/8 shadow-2xl z-10 pointer-events-auto"
          :class="panelClass || 'max-w-2xl'"
        >
          <header
            v-if="$slots.header"
            class="mb-4 text-white"
          >
            <slot name="header" />
          </header>

          <main :class="['mb-4', mainClass]">
            <slot />
          </main>

          <footer
            v-if="$slots.footer"
            class="mt-4"
          >
            <slot name="footer" />
          </footer>

          <button
            class="absolute top-3 right-3 text-white/70"
            @click="close"
          >
            ✕
          </button>
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script setup>
import { watch, onMounted, onBeforeUnmount, computed } from 'vue'
const props = defineProps({ modelValue: { type: Boolean, default: false }, zIndexClass: { type: String, default: 'z-50' }, zIndex: { type: Number, default: null }, panelClass: { type: String, default: '' }, mainClass: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

function onKey(e) {
  if (e.key === 'Escape') close()
}

watch(() => props.modelValue, (val) => {
  if (val) document.body.style.overflow = 'hidden'
  else document.body.style.overflow = ''
})

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const zIndexStyle = computed(() => props.zIndex != null ? ({ zIndex: props.zIndex }) : null)
</script>
