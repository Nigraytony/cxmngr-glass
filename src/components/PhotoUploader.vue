<template>
  <div>
    <div
      class="flex items-center justify-between gap-2 w-full rounded-md transition-colors"
      :class="dragActive ? 'bg-white/10 ring-2 ring-white/40' : ''"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div class="flex items-center gap-2">
        <label
          :for="inputId"
          class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 cursor-pointer select-none"
          :class="(uploadingNow || disabled) ? 'opacity-60 cursor-not-allowed' : ''"
        >{{ buttonLabel }}</label>
        <input
          :id="inputId"
          type="file"
          :accept="accept"
          :multiple="multiple"
          class="sr-only"
          :disabled="uploadingNow || disabled"
          @change="onFiles"
        >
      </div>
      <div
        v-if="remainingInfo"
        class="text-xs text-white/60"
      >
        {{ remainingInfo }}
      </div>
    </div>

    <div
      v-if="notice"
      class="mt-2 text-xs text-white/70"
    >
      {{ notice }}
    </div>

    <div
      v-if="uploads.length"
      class="mt-3 space-y-2"
    >
      <div
        v-for="u in uploads"
        :key="u.id"
        class="p-2 rounded-md bg-white/5 border border-white/10"
      >
        <div class="flex items-center justify-between text-xs mb-1 gap-3">
          <span class="truncate">{{ u.name }} ({{ Math.round(u.size/1024) }}KB)</span>
          <span class="text-white/60 truncate">{{ u.status }}<span v-if="u.message"> — {{ u.message }}</span></span>
        </div>
        <div class="w-full h-2 bg-white/10 rounded overflow-hidden">
          <div
            class="h-2 bg-white/60 rounded"
            :style="{ width: (u.progress || 0) + '%' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

// Props
interface UploadFn {
  (file: File, onProgress: (pct: number) => void): Promise<any>
}
const props = defineProps<{
  upload: UploadFn
  buttonLabel?: string
  accept?: string
  multiple?: boolean
  maxCount?: number
  existingCount?: number
  disabled?: boolean
  compressTargetBytes?: number
  concurrency?: number
}>()

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'file-done', payload: { file: File; result: any }): void
  (e: 'error', payload: { file: File; error: any }): void
}>()

const buttonLabel = computed(() => props.buttonLabel ?? 'Upload Photos')
const accept = computed(() => props.accept ?? 'image/*')
const multiple = computed(() => props.multiple ?? true)
const maxCount = computed(() => props.maxCount ?? 16)
const existingCount = computed(() => props.existingCount ?? 0)
const disabled = computed(() => props.disabled ?? false)
const compressTargetBytes = computed(() => props.compressTargetBytes ?? 240 * 1024)
const concurrency = computed(() => Math.max(1, Math.floor(props.concurrency ?? 1)))

const uploads = ref<UploadItem[]>([])
const uploadingNow = ref(false)
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | null = null
// Timers to auto-remove completed uploads after a short delay
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>()
const dragActive = ref(false)
function setNotice(msg: string) {
  notice.value = msg
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    notice.value = ''
    noticeTimer = null
  }, 5000)
}
onBeforeUnmount(() => {
  if (noticeTimer) clearTimeout(noticeTimer)
  // Clear any pending removal timers
  for (const t of removalTimers.values()) clearTimeout(t)
  removalTimers.clear()
})
const inputId = `photo-uploader-${Math.random().toString(36).slice(2, 8)}`

const remainingCount = computed(() => Math.max(0, maxCount.value - existingCount.value))
const remainingInfo = computed(() => remainingCount.value >= 0 ? `You can upload ${remainingCount.value} more photo${remainingCount.value === 1 ? '' : 's'}.` : '')

// Types
 type UploadStatus = 'pending' | 'compressed' | 'uploading' | 'done' | 'error' | 'skipped'
 interface UploadItem { id: string; name: string; size: number; progress: number; status: UploadStatus; message?: string }

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}` }

function addUpload(file: File): UploadItem {
  const item: UploadItem = { id: uid(), name: file.name, size: file.size, progress: 0, status: 'pending' }
  uploads.value.unshift(item)
  return item
}
function updateUpload(item: UploadItem, patch: Partial<UploadItem>) {
  Object.assign(item, patch)
}

async function onFiles(ev: Event) {
  const input = ev.target as HTMLInputElement
  if (!input.files || !input.files.length || uploadingNow.value || disabled.value) return

  await processFiles(Array.from(input.files))
  input.value = ''
}

async function processFiles(files: File[]) {
  notice.value = ''
  const remaining = remainingCount.value
  if (remaining <= 0) {
    setNotice('Maximum number of photos already reached.')
    return
  }
  if (files.length > remaining) {
    setNotice(`Only ${remaining} file${remaining === 1 ? '' : 's'} will be uploaded; extra files are skipped.`)
  }
  const acceptedFiles = (multiple.value ? files : files.slice(0, 1))
    .filter((f: File) => isAcceptableFile(f))
  if (!acceptedFiles.length) return

  uploadingNow.value = true
  const toProcess = acceptedFiles.slice(0, remaining)
  let index = 0

  const worker = async () => {
    while (index < toProcess.length) {
      const i = index++
      const f = toProcess[i]
      const item = addUpload(f)
      try {
        const compressed = await compressImageIfNeeded(f, compressTargetBytes.value, (from, to) => {
          updateUpload(item, { status: 'compressed', message: `Compressed ${Math.round(from/1024)}KB → ${Math.round(to/1024)}KB` })
        })
        updateUpload(item, { status: 'uploading', progress: 0 })
        const result = await props.upload(compressed, (pct: number) => updateUpload(item, { progress: pct }))
        updateUpload(item, { status: 'done', progress: 100 })
        // Auto-remove the completed upload row after 5 seconds
        const tid = setTimeout(() => {
          uploads.value = uploads.value.filter(u => u.id !== item.id)
          removalTimers.delete(item.id)
        }, 5000)
        removalTimers.set(item.id, tid)
        emit('file-done', { file: compressed, result })
      } catch (e: any) {
        updateUpload(item, { status: 'error', message: e?.message || 'Upload failed' })
        emit('error', { file: f, error: e })
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency.value, toProcess.length) }, () => worker())
  await Promise.all(workers)
  uploadingNow.value = false
  emit('done')
}

function onDragOver(_e: DragEvent) {
  if (disabled.value || uploadingNow.value) return
  dragActive.value = true
}
function onDragLeave(_e: DragEvent) {
  dragActive.value = false
}
async function onDrop(e: DragEvent) {
  dragActive.value = false
  if (disabled.value || uploadingNow.value) return
  const dt = e.dataTransfer
  if (!dt) return
  let files: File[] = []
  if (dt.items && dt.items.length) {
    const items = Array.from(dt.items)
    for (const it of items) {
      if (it.kind === 'file') {
        const f = it.getAsFile()
        if (f) files.push(f)
      }
    }
  } else {
    files = Array.from(dt.files || [])
  }
  if (!files.length) return
  await processFiles(files)

}

function isAcceptableFile(f: File): boolean {
  // If accept prop is not set, allow all
  if (!accept.value) return true
  // Handle common case for images
  if (accept.value.includes('image/*')) {
    const typeOk = f.type ? f.type.startsWith('image/') : false
    const extOk = /\.(png|jpe?g|gif|webp|heic|heif|bmp|tif|tiff|svg)$/i.test(f.name)
    return typeOk || extOk
  }
  // Basic accept fallback: allow
  return true
}

// Compression helpers
async function compressImageIfNeeded(file: File, maxBytes = 240 * 1024, onCompressed?: (from: number, to: number) => void): Promise<File> {
  if (file.size <= maxBytes) return file
  const img = await loadImageFromFile(file)
  let quality = 0.9
  let scale = 1.0
  const MAX_DIM = 2000
  const [startW, startH] = fitWithin(img.width, img.height, MAX_DIM, MAX_DIM)
  let w = startW, h = startH

  for (let i = 0; i < 8; i++) {
    const blob = await drawToBlob(img, w, h, quality)
    if (blob.size <= maxBytes) {
      onCompressed?.(file.size, blob.size)
      return new File([blob], file.name.replace(/\.(png|webp|gif|jpg|jpeg)$/i, '.jpg'), { type: 'image/jpeg' })
    }
    if (quality > 0.5) {
      quality -= 0.1
    } else {
      scale *= 0.85
      w = Math.max(320, Math.round(startW * scale))
      h = Math.max(320, Math.round(startH * scale))
    }
  }
  const lastBlob = await drawToBlob(img, w, h, 0.4)
  onCompressed?.(file.size, lastBlob.size)
  return new File([lastBlob], file.name.replace(/\.(png|webp|gif|jpg|jpeg)$/i, '.jpg'), { type: 'image/jpeg' })
}

function fitWithin(w: number, h: number, maxW: number, maxH: number): [number, number] {
  const ratio = Math.min(maxW / w, maxH / h, 1)
  return [Math.round(w * ratio), Math.round(h * ratio)]
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function drawToBlob(img: HTMLImageElement, width: number, height: number, quality = 0.9): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob(b => resolve(b || new Blob()), 'image/jpeg', quality))
}
</script>
