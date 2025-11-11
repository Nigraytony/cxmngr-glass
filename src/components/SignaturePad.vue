<template>
  <div class="space-y-2">
    <div class="border border-white/10 rounded-md overflow-hidden bg-white/5">
      <canvas ref="canvas" class="w-full h-40 touch-none" @pointerdown="start" @pointermove="move" @pointerup="end" @pointercancel="end"></canvas>
    </div>
    <div class="flex items-center gap-2">
      <button class="px-3 py-1 rounded-md bg-white/10" @click="clear">Clear</button>
      <button class="px-3 py-1 rounded-md bg-white/20" @click="save">Save</button>
      <div v-if="dataUrl" class="ml-auto text-xs text-white/60">Saved</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
const props = defineProps({ value: String })
const emit = defineEmits(['update:value', 'saved'])

const canvas = ref(null)
let ctx = null
let drawing = false
let last = { x: 0, y: 0 }
const dataUrl = ref(props.value || '')

function resize() {
  const c = canvas.value
  if (!c) return
  // HiDPI support
  const dpr = window.devicePixelRatio || 1
  const rect = c.getBoundingClientRect()
  c.width = rect.width * dpr
  c.height = rect.height * dpr
  c.style.width = rect.width + 'px'
  c.style.height = rect.height + 'px'
  ctx = c.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#fff'
    redraw()
  }
}

function start(e) {
  e.preventDefault()
  drawing = true
  const r = canvas.value.getBoundingClientRect()
  last.x = e.clientX - r.left
  last.y = e.clientY - r.top
}
function move(e) {
  if (!drawing) return
  const r = canvas.value.getBoundingClientRect()
  const x = e.clientX - r.left
  const y = e.clientY - r.top
  ctx.beginPath()
  ctx.moveTo(last.x, last.y)
  ctx.lineTo(x, y)
  ctx.stroke()
  last.x = x
  last.y = y
}
function end() {
  drawing = false
}

function clear() {
  if (!ctx || !canvas.value) return
  const c = canvas.value
  ctx.clearRect(0, 0, c.width, c.height)
  dataUrl.value = ''
  emit('update:value', '')
}

function save() {
  if (!canvas.value) return
  // export a PNG data URL trimmed to content could be complex; export full canvas
  const url = canvas.value.toDataURL('image/png')
  dataUrl.value = url
  emit('update:value', url)
  emit('saved', url)
}

function redraw() {
  // if there is an existing dataUrl, draw it onto canvas
  if (!dataUrl.value || !ctx) return
  const img = new Image()
  img.onload = () => {
    const r = canvas.value.getBoundingClientRect()
    ctx.clearRect(0, 0, r.width, r.height)
    ctx.drawImage(img, 0, 0, r.width, r.height)
  }
  img.src = dataUrl.value
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
})

watch(() => props.value, (v) => {
  dataUrl.value = v || ''
  requestAnimationFrame(() => redraw())
})
</script>

<style scoped>
canvas { touch-action: none; }
</style>
