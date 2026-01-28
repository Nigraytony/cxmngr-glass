<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="min-w-0">
        <div class="text-white/80 font-medium">
          Files (Azure)
        </div>
        <div class="text-white/60 text-xs truncate">
          Stored in project documents: Attachments / {{ entityType }} / {{ safeEntityId || '—' }}
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

        <DocumentUploader
          :upload="uploadOne"
          button-label="Upload Files"
          :accept="accept"
          :multiple="true"
          :concurrency="3"
          :disabled="!canUse || disabled"
          :enable-retry="true"
          @file-done="scheduleRefresh"
          @done="refresh"
        >
          <template #button="{ open, disabled: uploadDisabled }">
            <div class="relative inline-block group shrink-0">
              <button
                type="button"
                aria-label="Upload"
                :disabled="uploadDisabled"
                class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
                @click="open()"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-5 h-5"
                >
                  <path
                    d="M12 16V4"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M8 8l4-4 4 4"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M4 20h16"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
              <div
                role="tooltip"
                class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
              >
                Upload
              </div>
            </div>
          </template>
        </DocumentUploader>
      </div>
    </div>

    <div
      v-if="!canUse"
      class="text-white/60 text-sm"
    >
      Save this record first to upload files.
    </div>

    <div
      v-else
      class="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-2 min-w-0 overflow-x-auto"
    >
      <div
        v-if="loading"
        class="p-3 text-white/70 text-sm"
      >
        Loading…
      </div>
      <div
        v-else-if="files.length === 0"
        class="p-3 text-white/70 text-sm"
      >
        No files uploaded yet.
      </div>
      <table
        v-else
        class="min-w-full text-sm text-white/90"
      >
        <thead class="bg-white/5 text-white/70">
          <tr>
            <th class="text-left font-medium px-3 py-2">
              Name
            </th>
            <th class="text-right font-medium px-3 py-2 w-28">
              Size
            </th>
            <th class="text-right font-medium px-3 py-2 w-40">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="f in files"
            :key="f.id"
            class="border-t border-white/10 hover:bg-white/5"
          >
            <td class="px-3 py-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-white/70">
                  {{ fileIconEmoji(f.contentType) }}
                </span>
                <button
                  type="button"
                  class="truncate text-left hover:underline"
                  title="Preview"
                  @click="openPreview(f)"
                >
                  {{ f.originalName }}
                </button>
              </div>
            </td>
            <td class="px-3 py-2 text-right text-white/70">
              {{ formatBytes(f.sizeBytes) }}
            </td>
            <td class="px-3 py-2">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                  title="Download"
                  aria-label="Download"
                  @click="downloadFile(f)"
                >
                  ⬇
                </button>
                <button
                  type="button"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                  title="Rename"
                  aria-label="Rename"
                  :disabled="disabled"
                  :class="disabled ? 'opacity-40 cursor-not-allowed' : ''"
                  @click="openRename(f)"
                >
                  ✎
                </button>
                <button
                  type="button"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
                  title="Delete"
                  aria-label="Delete"
                  :disabled="disabled"
                  :class="disabled ? 'opacity-40 cursor-not-allowed' : ''"
                  @click="deleteFile(f)"
                >
                  ✕
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal
      v-model="renameOpen"
      panel-class="max-w-md"
    >
      <template #header>
        <div class="text-white font-semibold">
          Rename file
        </div>
      </template>
      <div class="space-y-2">
        <label class="block text-sm text-white/70">Filename</label>
        <input
          v-model="renameValue"
          type="text"
          class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40"
          placeholder="example.pdf"
        >
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded bg-white/6 text-white"
            @click="renameOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded bg-white/20 border border-white/30 hover:bg-white/30 text-white disabled:opacity-50"
            :disabled="!renameValue.trim() || renaming"
            @click="saveRename"
          >
            {{ renaming ? 'Saving…' : 'Save' }}
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      v-model="previewOpen"
      panel-class="max-w-5xl"
    >
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="text-white font-semibold truncate">
              {{ previewFile?.originalName || 'Preview' }}
            </div>
            <div class="text-white/60 text-xs truncate">
              {{ previewContentType }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/20 text-white"
              @click="previewOpen = false"
            >
              Close
            </button>
            <button
              v-if="previewFile"
              type="button"
              class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white"
              @click="downloadFile(previewFile)"
            >
              Download
            </button>
          </div>
        </div>
      </template>
      <div class="min-h-[50vh]">
        <div
          v-if="previewLoading"
          class="p-6 text-white/70"
        >
          Loading preview…
        </div>
        <div v-else>
          <iframe
            v-if="isPreviewPdf(previewContentType)"
            :src="previewUrl"
            class="w-full h-[70vh] rounded border border-white/10"
          />
          <img
            v-else-if="isPreviewImage(previewContentType)"
            :src="previewUrl"
            class="max-w-full max-h-[70vh] mx-auto rounded border border-white/10"
          >
          <div
            v-else
            class="p-6 text-white/70"
          >
            Preview not available for this file type.
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import axios from 'axios'
import { useDocumentsStore, type DocFile } from '../../stores/documents'
import DocumentUploader from '../DocumentUploader.vue'
import Modal from '../Modal.vue'
import { useUiStore } from '../../stores/ui'
import { confirm } from '../../utils/confirm'

const props = defineProps<{
  projectId: string
  entityType: string
  entityId: string
  disabled?: boolean
  accept?: string
}>()

const emit = defineEmits<{
  (e: 'update:count', v: number): void
}>()

const ui = useUiStore()
const documents = useDocumentsStore()

const accept = computed(() => props.accept || '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/*,application/zip')

const safeProjectId = computed(() => String(props.projectId || '').trim())
const safeEntityId = computed(() => String(props.entityId || '').trim())
const canUse = computed(() => Boolean(safeProjectId.value && safeEntityId.value && safeEntityId.value !== 'new'))

const folderId = ref<string>('')
const loading = ref(false)

const files = computed(() => {
  const list = Array.isArray(documents.files) ? documents.files : []
  return list.filter((f: any) => f && f.status !== 'deleted')
})

watch(files, (v) => emit('update:count', Array.isArray(v) ? v.length : 0), { immediate: true })

// Use a dedicated client for Azure Blob PUTs so we don't accidentally send app auth headers to Azure.
const blobHttp = axios.create()
try {
  // @ts-expect-error axios typing does not include index signature for defaults
  delete blobHttp.defaults.headers.common?.Authorization
} catch { /* ignore */ }

function findChildFolderId(parentId: string | null, name: string) {
  const pid = safeProjectId.value
  if (!pid) return ''
  const targetParent = parentId ? String(parentId) : null
  const all = documents.flatFolders || []
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

  // Ensure we have a fresh folder list.
  await documents.fetchFoldersTree(pid)
  await nextTick()

  let parentId: string | null = null
  const segments = ['Attachments', String(props.entityType || '').trim() || 'Items', safeEntityId.value]
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
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load files')
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
  if (canUse.value) refresh()
  else emit('update:count', 0)
}, { immediate: true })

function inferContentType(filename: string, fallback: string) {
  const name = String(filename || '').toLowerCase()
  if (fallback) return fallback
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (name.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (name.endsWith('.doc')) return 'application/msword'
  if (name.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (name.endsWith('.ppt')) return 'application/vnd.ms-powerpoint'
  if (name.endsWith('.csv')) return 'text/csv'
  if (name.endsWith('.txt')) return 'text/plain'
  if (name.endsWith('.zip')) return 'application/zip'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.heic')) return 'image/heic'
  if (name.endsWith('.heif')) return 'image/heif'
  return 'application/octet-stream'
}

async function uploadOne(file: File, onProgress: (pct: number) => void) {
  if (!canUse.value) throw new Error('Record must be saved before uploading')
  const pid = safeProjectId.value
  const fid = folderId.value || (await ensureFolder())
  if (!fid) throw new Error('Folder not ready')

  const contentType = inferContentType(file.name, file.type || '')
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

async function downloadFile(file: DocFile) {
  try {
    const pid = safeProjectId.value
    const { downloadUrl } = await documents.getDownloadUrl(pid, file.id)
    window.open(downloadUrl, '_blank', 'noopener')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to download file')
  }
}

const renameOpen = ref(false)
const renaming = ref(false)
const renameFile = ref<DocFile | null>(null)
const renameValue = ref('')

function openRename(file: DocFile) {
  renameFile.value = file
  renameValue.value = String(file.originalName || '')
  renameOpen.value = true
}

async function saveRename() {
  if (!renameFile.value) return
  if (props.disabled) return
  const name = String(renameValue.value || '').trim()
  if (!name) return
  renaming.value = true
  try {
    const pid = safeProjectId.value
    await documents.updateFile(pid, renameFile.value.id, { filename: name })
    ui.showSuccess('File renamed')
    renameOpen.value = false
    await refresh()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to rename file')
  } finally {
    renaming.value = false
  }
}

async function deleteFile(file: DocFile) {
  if (props.disabled) return
  const ok = await confirm({ title: 'Delete file?', message: `Delete "${file.originalName}"?`, confirmText: 'Delete', variant: 'danger' })
  if (!ok) return
  try {
    const pid = safeProjectId.value
    await documents.deleteFile(pid, file.id)
    ui.showSuccess('File deleted')
    await refresh()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete file')
  }
}

function fileIconEmoji(ct: string) {
  const v = String(ct || '').toLowerCase()
  if (v.includes('pdf')) return '📄'
  if (v.includes('word') || v.includes('msword')) return '📝'
  if (v.includes('excel') || v.includes('spreadsheetml') || v.includes('csv')) return '📊'
  if (v.includes('powerpoint') || v.includes('presentationml')) return '📽️'
  if (v.startsWith('image/')) return '🖼️'
  if (v.includes('zip')) return '🗜️'
  if (v.includes('text/plain')) return '📄'
  return '📎'
}

function formatBytes(bytes: number) {
  const b = Number(bytes || 0)
  if (!Number.isFinite(b) || b <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = b
  let u = 0
  while (n >= 1024 && u < units.length - 1) { n /= 1024; u++ }
  return `${n.toFixed(u === 0 ? 0 : 1)} ${units[u]}`
}

function isPreviewPdf(contentType: string) {
  return String(contentType || '').toLowerCase().includes('pdf')
}
function isPreviewImage(contentType: string) {
  return String(contentType || '').toLowerCase().startsWith('image/')
}

const previewOpen = ref(false)
const previewLoading = ref(false)
const previewFile = ref<DocFile | null>(null)
const previewUrl = ref<string>('')
const previewContentType = ref<string>('')

watch(previewOpen, (open) => {
  if (!open) {
    previewFile.value = null
    previewUrl.value = ''
    previewContentType.value = ''
    previewLoading.value = false
  }
})

async function openPreview(file: DocFile) {
  if (!safeProjectId.value) return
  previewFile.value = file
  previewOpen.value = true
  previewLoading.value = true
  previewUrl.value = ''
  previewContentType.value = ''
  try {
    const { previewUrl: url, contentType } = await documents.getPreviewUrl(safeProjectId.value, file.id)
    previewUrl.value = url
    previewContentType.value = contentType || file.contentType || 'application/pdf'
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (e?.response?.status === 415 && code === 'PREVIEW_UNSUPPORTED') {
      previewOpen.value = false
      await downloadFile(file)
      return
    }
    const data = e?.response?.data
    const msg = data?.error || e?.message || 'Failed to load preview'
    const hint = data?.hint ? String(data.hint) : ''
    ui.showError(hint ? `${msg} — ${hint}` : msg)
    previewOpen.value = false
  } finally {
    previewLoading.value = false
  }
}
</script>
