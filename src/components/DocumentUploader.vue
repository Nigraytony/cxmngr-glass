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
        <slot
          v-if="$slots.button"
          name="button"
          :open="openPicker"
          :disabled="uploadingNow || disabled"
          :uploading="uploadingNow"
        />
        <label
          v-else
          :for="inputId"
          class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 cursor-pointer select-none"
          :class="(uploadingNow || disabled) ? 'opacity-60 cursor-not-allowed' : ''"
        >
          {{ buttonLabel }}
        </label>
        <input
          :id="inputId"
          ref="fileInputRef"
          type="file"
          :accept="accept"
          :multiple="multiple"
          class="sr-only"
          :disabled="uploadingNow || disabled"
          @change="onFiles"
        >
      </div>
      <div
        v-if="notice"
        class="text-xs text-white/60"
      >
        {{ notice }}
      </div>
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
          <div class="flex items-center gap-2 min-w-0">
            <button
              v-if="enableRetry && u.status === 'error'"
              type="button"
              class="px-2 py-0.5 rounded bg-white/10 border border-white/10 hover:bg-white/15 text-white/80"
              @click="retryUpload(u)"
            >
              Retry
            </button>
            <span class="text-white/60 truncate">{{ u.status }}<span v-if="u.message"> — {{ u.message }}</span></span>
          </div>
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

interface UploadFn {
  (file: File, onProgress: (pct: number) => void): Promise<any>
}
const props = defineProps<{
  upload: UploadFn
  buttonLabel?: string
  accept?: string
  multiple?: boolean
  disabled?: boolean
  concurrency?: number
  enableRetry?: boolean
  compressImages?: boolean
  compressTargetBytes?: number
}>()

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'file-done', payload: { file: File; result: any }): void
  (e: 'error', payload: { file: File; error: any }): void
}>()

const buttonLabel = computed(() => props.buttonLabel ?? 'Upload Files')
const accept = computed(() => props.accept ?? '.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.heic,.heif')
const multiple = computed(() => props.multiple ?? true)
const disabled = computed(() => props.disabled ?? false)
const concurrency = computed(() => Math.max(1, Math.floor(props.concurrency ?? 2)))
const enableRetry = computed(() => props.enableRetry ?? false)
const compressImages = computed(() => props.compressImages ?? false)
const compressTargetBytes = computed(() => Math.max(1, Math.floor(props.compressTargetBytes ?? 256 * 1024)))

// Upload state
 type UploadStatus = 'pending' | 'compressing' | 'uploading' | 'done' | 'error'
 interface UploadItem { id: string; name: string; size: number; progress: number; status: UploadStatus; message?: string; file?: File }
const uploads = ref<UploadItem[]>([])
const uploadingNow = ref(false)
const dragActive = ref(false)
const notice = ref('')
let removalTimers = new Map<string, ReturnType<typeof setTimeout>>()
const fileInputRef = ref<HTMLInputElement | null>(null)

function scheduleRemoval(item: UploadItem, delayMs: number) {
  const existing = removalTimers.get(item.id)
  if (existing) { clearTimeout(existing); removalTimers.delete(item.id) }
  const tid = setTimeout(() => {
    uploads.value = uploads.value.filter(u => u.id !== item.id)
    removalTimers.delete(item.id)
  }, Math.max(0, Number(delayMs) || 0))
  removalTimers.set(item.id, tid)
}

function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}` }
const inputId = `doc-uploader-${Math.random().toString(36).slice(2, 8)}`

onBeforeUnmount(() => {
  for (const t of removalTimers.values()) clearTimeout(t)
  removalTimers.clear()
})

function addUpload(file: File): UploadItem {
  const item: UploadItem = { id: uid(), name: file.name, size: file.size, progress: 0, status: 'pending', file }
  uploads.value.unshift(item)
  return item
}
function updateUpload(item: UploadItem, patch: Partial<UploadItem>) {
  Object.assign(item, patch)
}

function onDragOver() {
  if (disabled.value || uploadingNow.value) return
  dragActive.value = true
}
function onDragLeave() {
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

async function onFiles(ev: Event) {
  const input = ev.target as HTMLInputElement
  if (!input.files || !input.files.length || uploadingNow.value || disabled.value) return
  await processFiles(Array.from(input.files))
  input.value = ''
}

function openPicker() {
  if (disabled.value || uploadingNow.value) return
  try { fileInputRef.value?.click() } catch { /* ignore */ }
}

function isAcceptableFile(f: File): boolean {
  // Basic accept filtering: if a list of extensions is provided, check extension
  const a = accept.value
  if (!a) return true
  const exts = a.split(',').map(s => s.trim()).filter(Boolean)
  if (!exts.length) return true
  const name = f.name.toLowerCase()
  return exts.some(ext => {
    if (ext === 'image/*') return f.type.startsWith('image/')
    if (ext.startsWith('.')) return name.endsWith(ext)
    return true
  })
}

async function processFiles(files: File[]) {
  const accepted = (multiple.value ? files : files.slice(0,1)).filter(isAcceptableFile)
  if (!accepted.length) return
  uploadingNow.value = true
  let index = 0
  const worker = async () => {
    while (index < accepted.length) {
      const i = index++
      const f = accepted[i]
      const item = addUpload(f)
      try {
        let uploadFile = f
        if (compressImages.value && isLikelyImageFile(f) && f.size > compressTargetBytes.value) {
          updateUpload(item, { status: 'compressing', message: 'Compressing…' })
          try {
            uploadFile = await compressImageIfNeeded(f, compressTargetBytes.value, (from, to) => {
              updateUpload(item, { message: `Compressed ${Math.round(from/1024)}KB → ${Math.round(to/1024)}KB` })
            })
            updateUpload(item, { name: uploadFile.name, size: uploadFile.size, file: uploadFile })
          } catch (_e: any) {
            // Best-effort: if we can't compress below the target (or browser can't decode), fall back to uploading original.
            updateUpload(item, { message: `Unable to compress below ${Math.round(compressTargetBytes.value / 1024)}KB — uploading original` })
            uploadFile = f
            updateUpload(item, { file: f })
          }
        }

        updateUpload(item, { status: 'uploading', progress: 0, message: item.message || '' })
        const result = await props.upload(uploadFile, (pct: number) => updateUpload(item, { progress: pct }))
        updateUpload(item, { status: 'done', progress: 100 })
        scheduleRemoval(item, 5000)
        emit('file-done', { file: uploadFile, result })
      } catch (e: any) {
        const data = e?.response?.data
        const serverMsg = data?.error || data?.message
        const code = data?.code ? ` (${data.code})` : ''
        const allowedExt = Array.isArray(data?.allowedExtensions) && data.allowedExtensions.length
          ? ` Allowed: ${data.allowedExtensions.map((x: string) => `.${x}`).join(', ')}`
          : ''
        updateUpload(item, { status: 'error', message: (serverMsg ? `${serverMsg}${code}${allowedExt}` : '') || e?.message || 'Upload failed' })
        // Auto-dismiss failed uploads after a few seconds to avoid stale error clutter.
        scheduleRemoval(item, 8000)
        emit('error', { file: (item.file || f), error: e })
      }
    }
  }
  const workers = Array.from({ length: Math.min(concurrency.value, accepted.length) }, () => worker())
  await Promise.all(workers)
  uploadingNow.value = false
  emit('done')
}

async function retryUpload(item: UploadItem) {
  if (!enableRetry.value) return
  if (!item || item.status !== 'error') return
  if (disabled.value || uploadingNow.value) return
  if (!item.file) return

  const existingTimer = removalTimers.get(item.id)
  if (existingTimer) { clearTimeout(existingTimer); removalTimers.delete(item.id) }

  try {
    uploadingNow.value = true
    updateUpload(item, { status: 'uploading', progress: 0, message: '' })
    const result = await props.upload(item.file, (pct: number) => updateUpload(item, { progress: pct }))
    updateUpload(item, { status: 'done', progress: 100 })
    scheduleRemoval(item, 5000)
    emit('file-done', { file: item.file, result })
  } catch (e: any) {
    const data = e?.response?.data
    const serverMsg = data?.error || data?.message
    const code = data?.code ? ` (${data.code})` : ''
    const allowedExt = Array.isArray(data?.allowedExtensions) && data.allowedExtensions.length
      ? ` Allowed: ${data.allowedExtensions.map((x: string) => `.${x}`).join(', ')}`
      : ''
    updateUpload(item, { status: 'error', message: (serverMsg ? `${serverMsg}${code}${allowedExt}` : '') || e?.message || 'Upload failed' })
    scheduleRemoval(item, 8000)
    emit('error', { file: item.file, error: e })
  } finally {
    uploadingNow.value = false
  }
}

function isLikelyImageFile(f: File): boolean {
  if (!f) return false
  if (f.type && f.type.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|heic|heif|bmp|tif|tiff|svg)$/i.test(f.name)
}

// Compression helpers (same approach as PhotoUploader)
async function compressImageIfNeeded(file: File, maxBytes = 256 * 1024, onCompressed?: (from: number, to: number) => void): Promise<File> {
  if (file.size <= maxBytes) return file
  const img = await loadImageFromFile(file)
  let quality = 0.9
  let scale = 1.0
  const MAX_DIM = 2000
  const [startW, startH] = fitWithin(img.width, img.height, MAX_DIM, MAX_DIM)
  let w = startW, h = startH

  for (let i = 0; i < 14; i++) {
    const blob = await drawToBlob(img, w, h, quality)
    if (blob.size <= maxBytes) {
      onCompressed?.(file.size, blob.size)
      return new File([blob], ensureJpegFilename(file.name), { type: 'image/jpeg' })
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
  if (lastBlob.size > maxBytes) {
    throw new Error(`Unable to compress photo below ${Math.round(maxBytes / 1024)}KB`)
  }
  return new File([lastBlob], ensureJpegFilename(file.name), { type: 'image/jpeg' })
}

function ensureJpegFilename(name: string) {
  const base = String(name || '').trim() || 'photo'
  const replaced = base.replace(/\.(png|webp|gif|jpg|jpeg|heic|heif|bmp|tif|tiff|svg)$/i, '.jpg')
  return replaced.toLowerCase().endsWith('.jpg') ? replaced : `${replaced}.jpg`
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
