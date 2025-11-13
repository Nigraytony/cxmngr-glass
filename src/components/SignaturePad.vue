<template>
  <div
    class="space-y-2"
  >
    <div
      class="border border-white/10 rounded-md overflow-hidden bg-white/5"
    >
      <canvas
        ref="canvas"
        class="w-full h-40 touch-none"
      />
    </div>
    <div
      v-if="props.showFields !== false"
      class="flex items-center gap-2"
    >
      <input
        v-model="localRole"
        placeholder="Role"
        class="w-32 px-2 py-1 rounded bg-white/10 border border-white/20 text-white/90 placeholder-gray-400"
      >
      <input
        v-model="localTitle"
        placeholder="Title"
        class="flex-1 px-2 py-1 rounded bg-white/10 border border-white/20 text-white/90 placeholder-gray-400"
      >
      <input
        v-model="localPerson"
        placeholder="Name"
        class="flex-1 px-2 py-1 rounded bg-white/10 border border-white/20 text-white/90 placeholder-gray-400"
      >
    </div>
    <div class="flex items-center gap-2">
      <button
        class="px-3 py-1 rounded-md bg-white/10"
        @click="clear"
      >
        Clear
      </button>
      <button
        class="px-3 py-1 rounded-md bg-white/20"
        @click="save"
      >
        Save
      </button>
      <button
        v-if="props.removable"
        class="px-3 py-1 rounded-md bg-red-500/20 text-red-200"
        @click="removeAndEmit"
      >
        Remove
      </button>
      <div
        v-if="dataUrl"
        class="ml-auto text-xs text-white/60"
      >
        Saved
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

let SignaturePad: any = null
try {
  // require at runtime so tests / installs that haven't run don't fail
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SignaturePad = require('signature_pad').default || require('signature_pad')
} catch (e) {
  SignaturePad = null
}

type Props = { value?: string; modelValue?: string; title?: string; person?: string; role?: string; removable?: boolean; showFields?: boolean }
const props = defineProps<Props>()
const emit = defineEmits(['update:value', 'update:modelValue', 'saved', 'update:title', 'update:person', 'update:role', 'remove'])

const canvas = ref<HTMLCanvasElement | null>(null)
let sigPad: any = null
const dataUrl = ref(props.modelValue ?? props.value ?? '')
const localTitle = ref(props.title || '')
const localPerson = ref(props.person || '')
const localRole = ref(props.role || '')

watch(() => props.title, (v) => { localTitle.value = v || '' })
watch(() => props.person, (v) => { localPerson.value = v || '' })
watch(() => props.role, (v) => { localRole.value = v || '' })

watch(localTitle, (v) => { emit('update:title', v) })
watch(localPerson, (v) => { emit('update:person', v) })
watch(localRole, (v) => { emit('update:role', v) })

function resizeCanvas() {
  const c = canvas.value
  if (!c) return
  const dpr = window.devicePixelRatio || 1
  const rect = c.getBoundingClientRect()
  c.width = Math.round(rect.width * dpr)
  c.height = Math.round(rect.height * dpr)
  c.style.width = rect.width + 'px'
  c.style.height = rect.height + 'px'
  const ctx = c.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
}

const pointerHandlers = {
  drawing: false,
  lastX: 0,
  lastY: 0,
  start: (e: PointerEvent) => {
    const c = canvas.value
    if (!c) return
    pointerHandlers.drawing = true
    const r = c.getBoundingClientRect()
    pointerHandlers.lastX = e.clientX - r.left
    pointerHandlers.lastY = e.clientY - r.top
  },
  move: (e: PointerEvent) => {
    const c = canvas.value
    if (!c || !pointerHandlers.drawing) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const r = c.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    ctx.beginPath()
    ctx.moveTo(pointerHandlers.lastX, pointerHandlers.lastY)
    ctx.lineTo(x, y)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    pointerHandlers.lastX = x
    pointerHandlers.lastY = y
  },
  end: () => { pointerHandlers.drawing = false },
}

function initSignaturePad() {
  const c = canvas.value
  if (!c) return
  resizeCanvas()
  if (SignaturePad) {
    sigPad = new SignaturePad(c, {
      backgroundColor: 'rgba(0,0,0,0)',
      penColor: '#ffffff',
      minWidth: 0.5,
      maxWidth: 2.5,
    })
    if (dataUrl.value) {
      try { sigPad.fromDataURL(dataUrl.value) } catch (e) { /* ignore */ }
    }
  } else {
    // attach pointer handlers for fallback
    c.addEventListener('pointerdown', pointerHandlers.start as any)
    c.addEventListener('pointermove', pointerHandlers.move as any)
    c.addEventListener('pointerup', pointerHandlers.end as any)
    c.addEventListener('pointercancel', pointerHandlers.end as any)
  }
}

function clear() {
  if (sigPad) { sigPad.clear(); emit('update:value', '') ; emit('update:modelValue', '') ; dataUrl.value = '' ; return }
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, c.width, c.height)
  dataUrl.value = ''
  emit('update:value', '')
}

function save() {
  const c = canvas.value
  if (!c) return
  let url = ''
  if (sigPad) {
    if (sigPad.isEmpty && sigPad.isEmpty()) { emit('update:value',''); return }
    url = sigPad.toDataURL('image/png')
  } else {
    url = c.toDataURL('image/png')
  }
  dataUrl.value = url
  emit('update:value', url)
  emit('update:modelValue', url)
  emit('saved', url)
}

function removeAndEmit() {
  clear()
  emit('remove')
}

onMounted(() => {
  initSignaturePad()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas)
  const c = canvas.value
  if (c && !SignaturePad) {
    c.removeEventListener('pointerdown', pointerHandlers.start as any)
    c.removeEventListener('pointermove', pointerHandlers.move as any)
    c.removeEventListener('pointerup', pointerHandlers.end as any)
    c.removeEventListener('pointercancel', pointerHandlers.end as any)
  }
  if (sigPad && sigPad.off) sigPad.off()
})

watch(() => props.modelValue ?? props.value, (v) => {
  dataUrl.value = v || ''
  if (!canvas.value) return
  if (sigPad && dataUrl.value) {
    try { sigPad.fromDataURL(dataUrl.value) } catch (e) { /* ignore */ }
  } else if (!sigPad && dataUrl.value) {
    const img = new Image()
    img.onload = () => {
      const c = canvas.value as HTMLCanvasElement
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0,0,c.width,c.height)
      const rect = c.getBoundingClientRect()
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
    }
    img.src = dataUrl.value
  }
})
</script>

<style scoped>
canvas { touch-action: none; }
</style>

