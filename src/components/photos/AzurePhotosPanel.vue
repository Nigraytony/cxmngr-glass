<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="min-w-0">
        <div class="text-white/80 font-medium">
          Photos
        </div>
        <div class="text-white/60 text-xs truncate">
          Stored in project documents: Photos / {{ entityType }} / {{ safeEntityId || '—' }} • Max {{ maxCount }} • Max {{ Math.round(maxBytes / 1024) }}KB each
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative inline-block group shrink-0">
          <button
            type="button"
            aria-label="Refresh"
            :disabled="!canUse || loading"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
            @click="refresh"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                d="M20 12a8 8 0 1 1-2.34-5.66"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M20 4v6h-6"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            role="tooltip"
            class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
          >
            Refresh
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="!canUse"
      class="text-white/60 text-sm"
    >
      Save this record first to upload photos.
    </div>

    <div v-else>
      <PhotoUploader
        button-label="Upload Photos"
        accept="image/*"
        :multiple="true"
        :max-count="maxCount"
        :existing-count="photos.length"
        :compress-target-bytes="maxBytes"
        :concurrency="concurrency"
        :disabled="disabled || photos.length >= maxCount"
        :upload="uploadOne"
        @file-done="scheduleRefresh"
        @done="refresh"
      />
    </div>

    <div
      v-if="canUse"
      class="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-2 min-w-0 overflow-x-auto"
    >
      <div
        v-if="loading"
        class="p-3 text-white/70 text-sm"
      >
        Loading…
      </div>
      <div
        v-else-if="photos.length === 0"
        class="p-3 text-white/70 text-sm"
      >
        No photos uploaded yet.
      </div>
      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
      >
        <div
          v-for="(p, idx) in photos"
          :key="p.id"
          class="relative group aspect-square rounded-md overflow-hidden border border-white/10 bg-black/20"
        >
          <button
            type="button"
            class="absolute top-1 right-1 z-10 h-7 w-7 grid place-items-center rounded-md bg-black/60 hover:bg-black/75 border border-white/20 text-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete photo"
            aria-label="Delete photo"
            :disabled="disabled"
            @click.stop="deletePhoto(p)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4"
            >
              <path
                d="M3 6h18"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M8 6l1-2h6l1 2"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <rect
                x="6"
                y="6"
                width="12"
                height="14"
                rx="1.5"
                stroke-width="1.5"
              />
              <path
                d="M10 10v6M14 10v6"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>

          <button
            type="button"
            class="relative w-full h-full focus:outline-none focus:ring-2 focus:ring-white/40"
            @click="openViewer(idx)"
          >
            <img
              :src="thumbUrlFor(p.id)"
              :alt="p.originalName"
              class="w-full h-full object-cover"
              loading="lazy"
            >
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        </div>
      </div>
    </div>

    <Modal
      v-model="viewerOpen"
      panel-class="max-w-5xl"
    >
      <template #header>
        <div class="flex items-center justify-between gap-3 w-full">
          <div class="min-w-0">
            <div class="text-white font-semibold truncate">
              {{ currentPhoto?.originalName || 'Photo' }}
            </div>
            <div class="text-white/60 text-xs">
              {{ (viewerIndex + 1) }} / {{ photos.length }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-white"
              @click="viewerOpen = false"
            >
              Close
            </button>
            <button
              v-if="currentPhoto"
              type="button"
              class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white"
              @click="downloadPhoto(currentPhoto)"
            >
              Download
            </button>
          </div>
        </div>
      </template>
      <div class="min-h-[50vh] flex items-center justify-center">
        <div
          v-if="viewerLoading"
          class="p-6 text-white/70"
        >
          Loading…
        </div>
        <img
          v-else-if="viewerUrl"
          :src="viewerUrl"
          class="max-w-full max-h-[70vh] mx-auto rounded border border-white/10"
        >
        <div
          v-else
          class="p-6 text-white/70"
        >
          Photo unavailable.
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-between gap-2 w-full">
          <button
            type="button"
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-white disabled:opacity-50"
            :disabled="photos.length <= 1"
            @click="prevPhoto"
          >
            Prev
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-white disabled:opacity-50"
            :disabled="photos.length <= 1"
            @click="nextPhoto"
          >
            Next
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import axios from 'axios'
import { useDocumentsStore, type DocFile } from '../../stores/documents'
import PhotoUploader from '../PhotoUploader.vue'
import Modal from '../Modal.vue'
import { useUiStore } from '../../stores/ui'
import { confirm } from '../../utils/confirm'

const props = defineProps<{
  projectId: string
  entityType: string
  entityId: string
  disabled?: boolean
  maxCount?: number
  maxBytes?: number
  concurrency?: number
}>()

const emit = defineEmits<{
  (e: 'update:count', v: number): void
}>()

const ui = useUiStore()
const documents = useDocumentsStore()

const maxCount = computed(() => Math.max(1, Math.floor(props.maxCount ?? 16)))
const maxBytes = computed(() => Math.max(1, Math.floor(props.maxBytes ?? 256 * 1024)))
const concurrency = computed(() => Math.max(1, Math.floor(props.concurrency ?? 3)))

const safeProjectId = computed(() => String(props.projectId || '').trim())
const safeEntityId = computed(() => String(props.entityId || '').trim())
const canUse = computed(() => Boolean(safeProjectId.value && safeEntityId.value && safeEntityId.value !== 'new'))

const folderId = ref<string>('')
const loading = ref(false)

const thumbUrls = ref<Record<string, string>>({})
function thumbUrlFor(fileId: string) {
  return thumbUrls.value[fileId] || ''
}

const photos = computed<DocFile[]>(() => {
  const list = Array.isArray(documents.files) ? documents.files : []
  return list
    .filter((f: any) => f && f.status !== 'deleted')
    .filter((f: any) => String(f.contentType || '').toLowerCase().startsWith('image/'))
    .slice()
    .sort((a: any, b: any) => {
      const at = String(a?.createdAt || '')
      const bt = String(b?.createdAt || '')
      return at.localeCompare(bt)
    })
})

watch(photos, (v) => emit('update:count', Array.isArray(v) ? v.length : 0), { immediate: true })

// Use a dedicated client for Azure Blob PUTs so we don't accidentally send app auth headers to Azure.
const blobHttp = axios.create()
try {
  // @ts-expect-error axios typing does not include index signature for defaults
  delete blobHttp.defaults.headers.common?.Authorization
} catch { /* ignore */ }

function findChildFolderId(parentId: string | null, name: string) {
  const all = documents.flatFolders || []
  const targetParent = parentId ? String(parentId) : null
  const hit = all.find((f: any) => {
    if (!f) return false
    const fParent = f.parentId ? String(f.parentId) : null
    return fParent === targetParent && String(f.name || '').trim() === String(name || '').trim()
  })
  return hit ? String(hit.id) : ''
}

async function ensureFolder() {
  if (!canUse.value) return ''
  const pid = safeProjectId.value

  await documents.fetchFoldersTree(pid)
  await nextTick()

  let parentId: string | null = null
  const segments = ['Photos', String(props.entityType || '').trim() || 'Items', safeEntityId.value]
  for (const seg of segments) {
    let id = findChildFolderId(parentId, seg)
    if (!id) {
      try {
        const created = await documents.createFolder(pid, { parentId, name: seg })
        id = String(created?.id || '')
      } catch (e: any) {
        if (e?.response?.status === 409) {
          await documents.fetchFoldersTree(pid)
          await nextTick()
          id = findChildFolderId(parentId, seg)
        } else {
          throw e
        }
      }
    }
    parentId = id || null
  }
  folderId.value = parentId || ''
  return folderId.value
}

async function refresh() {
  if (!canUse.value) return
  loading.value = true
  try {
    const pid = safeProjectId.value
    const fid = folderId.value || (await ensureFolder())
    if (!fid) return
    await documents.fetchFiles(pid, fid)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load photos')
  } finally {
    loading.value = false
  }
}

let refreshTimer: any = null
function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refresh()
    refreshTimer = null
  }, 250)
}

watch([safeProjectId, safeEntityId], () => {
  folderId.value = ''
  thumbUrls.value = {}
  if (canUse.value) refresh()
  else emit('update:count', 0)
}, { immediate: true })

function inferContentType(file: File) {
  const ct = String(file?.type || '').trim().toLowerCase()
  if (ct) return ct
  const name = String(file?.name || '').toLowerCase()
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.heic')) return 'image/heic'
  if (name.endsWith('.heif')) return 'image/heif'
  return 'application/octet-stream'
}

async function uploadOne(file: File, onProgress: (pct: number) => void) {
  if (!canUse.value) throw new Error('Record must be saved before uploading')
  if (file.size > maxBytes.value) throw new Error(`Photo must be <= ${Math.round(maxBytes.value / 1024)}KB after compression`)
  if (photos.value.length >= maxCount.value) throw new Error(`Maximum of ${maxCount.value} photos reached`)

  const pid = safeProjectId.value
  const fid = folderId.value || (await ensureFolder())
  if (!fid) throw new Error('Folder not ready')

  const contentType = inferContentType(file)
  const req = await documents.requestUpload(pid, {
    folderId: fid,
    filename: file.name,
    contentType,
    sizeBytes: file.size,
  })

  await blobHttp.put(req.uploadUrl, file, {
    withCredentials: false,
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': contentType,
    },
    onUploadProgress: (evt) => {
      const total = evt.total || file.size || 0
      if (!total) return
      const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / total) * 100)))
      onProgress(pct)
    },
  })

  await documents.completeUpload(pid, req.fileId)
  return req
}

async function deletePhoto(file: DocFile) {
  if (props.disabled) return
  const ok = await confirm({ title: 'Delete photo?', message: `Delete "${file.originalName}"?`, confirmText: 'Delete', variant: 'danger' })
  if (!ok) return
  try {
    await documents.deleteFile(safeProjectId.value, file.id)
    ui.showSuccess('Photo deleted')
    await refresh()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete photo')
  }
}

async function downloadPhoto(file: DocFile) {
  try {
    const { downloadUrl } = await documents.getDownloadUrl(safeProjectId.value, file.id)
    window.open(downloadUrl, '_blank', 'noopener')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to download photo')
  }
}

async function hydrateThumbUrls(list: DocFile[]) {
  const pid = safeProjectId.value
  if (!pid) return
  const next: Record<string, string> = { ...thumbUrls.value }
  const ids = new Set(list.map((f) => String(f.id)))
  for (const k of Object.keys(next)) if (!ids.has(k)) delete next[k]
  thumbUrls.value = next

  for (const f of list) {
    const id = String(f.id)
    if (thumbUrls.value[id]) continue
    try {
      const { previewUrl } = await documents.getPreviewUrl(pid, id)
      thumbUrls.value = { ...thumbUrls.value, [id]: previewUrl }
    } catch (e: any) {
      // ignore; thumb will just be blank
    }
  }
}

watch(photos, (list) => {
  if (!canUse.value) return
  hydrateThumbUrls(list).catch(() => { /* ignore */ })
})

// Viewer state
const viewerOpen = ref(false)
const viewerIndex = ref(0)
const viewerLoading = ref(false)
const viewerUrl = ref('')
const currentPhoto = computed(() => photos.value[viewerIndex.value] || null)

watch(viewerOpen, (open) => {
  if (!open) {
    viewerLoading.value = false
    viewerUrl.value = ''
    viewerIndex.value = 0
  }
})

async function openViewer(idx: number) {
  if (!photos.value.length) return
  viewerIndex.value = Math.max(0, Math.min(idx, photos.value.length - 1))
  viewerOpen.value = true
  await loadViewerUrl()
}

async function loadViewerUrl() {
  const f = currentPhoto.value
  if (!f) return
  const pid = safeProjectId.value
  if (!pid) return
  viewerLoading.value = true
  viewerUrl.value = ''
  try {
    const { previewUrl } = await documents.getPreviewUrl(pid, f.id)
    viewerUrl.value = previewUrl
  } catch (e: any) {
    viewerUrl.value = thumbUrls.value[f.id] || ''
  } finally {
    viewerLoading.value = false
  }
}

async function nextPhoto() {
  if (photos.value.length <= 1) return
  viewerIndex.value = (viewerIndex.value + 1) % photos.value.length
  await loadViewerUrl()
}
async function prevPhoto() {
  if (photos.value.length <= 1) return
  viewerIndex.value = (viewerIndex.value - 1 + photos.value.length) % photos.value.length
  await loadViewerUrl()
}
</script>
