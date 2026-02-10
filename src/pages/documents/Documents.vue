<template>
  <section class="flex flex-col gap-6 h-[calc(100vh-12rem)] min-h-0">
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/app' },
          { text: 'Documents', to: '/app/documents' }
        ]"
        title="Documents"
      >
        <template #middle>
          <SearchPill
            v-model="q"
            placeholder="Search folders & files"
          />
        </template>
      </BreadCrumbs>
    </div>

    <!-- unified toolbar -->
    <div
      v-if="projectId"
      class="rounded-2xl p-3 bg-white/6 backdrop-blur-xl border border-white/10 min-w-0 relative z-30"
    >
      <div class="flex flex-wrap items-center justify-between gap-3 gap-y-2 min-w-0">
        <div class="flex flex-wrap items-center gap-2 gap-y-2 min-w-0">
          <div class="relative inline-block group shrink-0">
            <button
              type="button"
              aria-label="New folder"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10"
              @click="openCreateFolder(null)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  d="M3 7a2 2 0 0 1 2-2h5l2 2h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 11v6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M9 14h6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              New folder
            </div>
          </div>

          <div class="min-w-[220px] text-white/60 text-xs truncate">
            <span v-if="selectedFolder">Folder: {{ selectedFolder.path || selectedFolder.name }}</span>
            <span v-else>Select a folder to upload files</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 gap-y-2">
          <div class="relative inline-block group shrink-0">
            <button
              type="button"
              aria-label="Refresh"
              :disabled="documents.loadingTree"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
              @click="refreshAll"
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
            v-if="selectedFolder && projectId"
            :upload="uploadOne"
            button-label="Upload"
            :multiple="true"
            :disabled="!selectedFolder || documents.loadingFiles"
            :enable-retry="true"
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.heic,.heif"
            @file-done="scheduleRefreshFiles"
            @done="refreshFiles"
            @error="onUploadError"
          >
            <template #button="{ open, disabled }">
              <div class="relative inline-block group shrink-0">
                <button
                  type="button"
                  aria-label="Upload"
                  :disabled="disabled"
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
          <div
            v-else
            class="relative inline-block group shrink-0"
          >
            <button
              type="button"
              aria-label="Upload"
              disabled
              class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent text-white/60 border border-white/10 disabled:opacity-40"
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
              Select a folder to upload
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="!projectId"
      class="rounded-xl bg-white/8 border border-white/10 p-4 text-white/80 flex-1"
    >
      Select a project to manage documents.
    </div>

    <div
      v-else
      class="grid grid-cols-12 gap-4 flex-1 min-h-0"
    >
      <!-- Left: folders -->
      <div class="col-span-12 lg:col-span-4">
        <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 px-3 py-4 h-full flex flex-col min-h-0">
          <div class="text-white font-semibold">
            Folders
          </div>

          <div class="mt-3 flex-1 min-h-0 overflow-auto pr-1">
            <div
              v-if="documents.loadingTree"
              class="text-white/70 text-sm"
            >
              Loading folders…
            </div>
            <div
              v-else-if="folderChildren.length === 0"
              class="text-white/70 text-sm"
            >
              <span v-if="qTrimmed">No matching folders.</span>
              <span v-else>No folders yet. Create one to upload files.</span>
            </div>
            <ul
              v-else
              class="space-y-1"
            >
              <FolderNodeRow
                v-for="n in folderChildren"
                :key="String(n.id)"
                :node="n"
                :depth="0"
                :selected-id="documents.selectedFolderId"
                :expanded="expanded"
                @toggle="toggleExpanded"
                @select="selectFolder"
                @create="openCreateFolder"
                @rename="openRenameFolder"
                @move="openMoveFolder"
                @delete="deleteFolder"
              />
            </ul>
          </div>
        </div>
      </div>

      <!-- Right: files -->
      <div class="col-span-12 lg:col-span-8">
        <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-white font-semibold">
                Files
              </div>
              <div class="text-white/60 text-xs truncate">
                <span v-if="selectedFolder">{{ selectedFolder.path || selectedFolder.name }}</span>
                <span v-else>Select a folder to view files</span>
              </div>
            </div>
          </div>

          <div class="mt-4 flex-1 min-h-0">
            <div
              v-if="!selectedFolder"
              class="text-white/70 text-sm"
            >
              Choose a folder on the left to upload and manage files.
            </div>
            <div
              v-else
              class="overflow-auto h-full"
            >
              <table class="min-w-full text-sm text-white/90">
                <thead class="bg-white/5 text-white/70">
                  <tr>
                    <th class="text-left font-medium px-3 py-2">
                      Name
                    </th>
                    <th class="text-right font-medium px-3 py-2 w-28">
                      Size
                    </th>
                    <th class="text-right font-medium px-3 py-2 w-32">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-if="documents.loadingFiles"
                    class="border-t border-white/10"
                  >
                    <td
                      colspan="3"
                      class="px-3 py-3 text-white/70"
                    >
                      Loading files…
                    </td>
                  </tr>
                  <tr
                    v-else-if="filteredFiles.length === 0"
                    class="border-t border-white/10"
                  >
                    <td
                      colspan="3"
                      class="px-3 py-3 text-white/70"
                    >
                      <span v-if="qTrimmed">No matching files.</span>
                      <span v-else>No files in this folder.</span>
                    </td>
                  </tr>
                  <tr
                    v-for="f in filteredFiles"
                    :key="f.id"
                    class="border-t border-white/10 hover:bg-white/5"
                  >
                    <td class="px-3 py-2">
                      <div
                        class="flex items-center gap-2 min-w-0"
                        :title="`${prettyType(f.contentType)} • Updated: ${formatDate(f.updatedAt)}`"
                      >
                        <span
                          class="text-white/70"
                          :title="f.contentType"
                        >
                          <span
                            v-if="fileIconKey(f.contentType) === 'pdf'"
                            class="inline-flex"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              class="w-5 h-5"
                              aria-hidden="true"
                            >
                              <path
                                d="M7 3h7l3 3v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
                                fill="#DC2626"
                              />
                              <path
                                d="M14 3v3a1 1 0 0 0 1 1h3"
                                fill="#FCA5A5"
                              />
                              <path
                                d="M8.2 16.1c1.8-2.7 3.7-2.7 5.5 0 1.1 1.6 2.1 1.9 3.8.7"
                                stroke="#fff"
                                stroke-width="1.7"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                opacity="0.9"
                                fill="none"
                              />
                              <text
                                x="12"
                                y="14"
                                text-anchor="middle"
                                font-size="7.5"
                                font-weight="700"
                                fill="#fff"
                                font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
                              >
                                PDF
                              </text>
                            </svg>
                          </span>
                          <span
                            v-else-if="fileIconKey(f.contentType) === 'img'"
                            class="inline-flex text-sky-200"
                            aria-hidden="true"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              class="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.7"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <rect
                                x="4"
                                y="6"
                                width="16"
                                height="14"
                                rx="2"
                              />
                              <path d="M8 14l2-2 4 4" />
                              <path d="M14 14l1.5-1.5L20 17" />
                              <circle
                                cx="9"
                                cy="10"
                                r="1"
                              />
                            </svg>
                          </span>
                          <span v-else>{{ fileIconEmoji(f.contentType) }}</span>
                        </span>
                        <button
                          type="button"
                          class="truncate max-w-[26rem] text-left hover:underline"
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
                          @click="openRenameFile(f)"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                          title="Move"
                          aria-label="Move"
                          @click="openMoveFile(f)"
                        >
                          ⇄
                        </button>
                        <button
                          type="button"
                          class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
                          title="Delete"
                          aria-label="Delete"
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
          </div>
        </div>
      </div>
    </div>

    <!-- Folder modal -->
    <Modal
      v-model="folderModalOpen"
      panel-class="max-w-lg"
    >
      <template #header>
        <div class="text-lg font-semibold">
          {{ folderModalMode === 'create' ? 'New Folder' : folderModalMode === 'rename' ? 'Rename Folder' : 'Move Folder' }}
        </div>
      </template>

      <div class="space-y-3">
        <div
          v-if="folderModalMode !== 'move'"
          class="space-y-1"
        >
          <label class="text-white/70 text-sm">Name</label>
          <input
            v-model="folderModalName"
            type="text"
            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40"
            placeholder="Folder name"
          >
          <div class="text-xs text-white/50">
            No slashes or reserved characters.
          </div>
        </div>

        <div
          v-if="folderModalMode === 'move'"
          class="space-y-1"
        >
          <label class="text-white/70 text-sm">Move to</label>
          <select
            v-model="folderModalParentId"
            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
          >
            <option value="">
              /
            </option>
            <option
              v-for="opt in folderMoveOptions"
              :key="opt.id"
              :value="opt.id"
            >
              {{ opt.path || opt.name }}
            </option>
          </select>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            @click="folderModalOpen = false"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white disabled:opacity-50"
            :disabled="folderModalSaving || (!folderModalName.trim() && folderModalMode !== 'move')"
            @click="saveFolderModal"
          >
            Save
          </button>
        </div>
      </template>
    </Modal>

    <!-- File modal -->
    <Modal
      v-model="fileModalOpen"
      panel-class="max-w-lg"
    >
      <template #header>
        <div class="text-lg font-semibold">
          {{ fileModalMode === 'rename' ? 'Rename File' : 'Move File' }}
        </div>
      </template>

      <div class="space-y-3">
        <div
          v-if="fileModalMode === 'rename'"
          class="space-y-1"
        >
          <label class="text-white/70 text-sm">Name</label>
          <input
            v-model="fileModalName"
            type="text"
            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40"
          >
        </div>
        <div
          v-else
          class="space-y-1"
        >
          <label class="text-white/70 text-sm">Move to</label>
          <select
            v-model="fileModalFolderId"
            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
          >
            <option
              v-for="opt in documents.flatFolders"
              :key="opt.id"
              :value="opt.id"
            >
              {{ opt.path || opt.name }}
            </option>
          </select>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            @click="fileModalOpen = false"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white disabled:opacity-50"
            :disabled="fileModalSaving || (fileModalMode === 'rename' && !fileModalName.trim())"
            @click="saveFileModal"
          >
            Save
          </button>
        </div>
      </template>
    </Modal>

    <!-- Preview modal -->
    <Modal
      v-model="previewOpen"
      panel-class="max-w-6xl"
    >
      <template #header>
        <div class="min-w-0">
          <div class="text-lg font-semibold truncate">
            {{ previewFile?.originalName || 'Preview' }}
          </div>
          <div class="text-xs text-white/60 truncate">
            {{ previewFile ? `${prettyType(previewFile.contentType)} • ${formatBytes(previewFile.sizeBytes)} • Updated: ${formatDate(previewFile.updatedAt)}` : '' }}
          </div>
        </div>
      </template>

      <div class="h-[75vh] min-h-0 flex flex-col">
        <div
          v-if="previewLoading"
          class="text-white/70 text-sm"
        >
          Loading preview…
        </div>

        <div
          v-else-if="!previewUrl || !previewFile"
          class="text-white/70 text-sm"
        >
          Preview unavailable.
        </div>

        <div
          v-else
          class="flex-1 min-h-0 overflow-hidden rounded-lg border border-white/10 bg-black/20"
        >
          <iframe
            v-if="isPreviewPdf(previewContentType || previewFile.contentType)"
            :src="previewUrl"
            class="w-full h-full"
            title="PDF preview"
          />
          <div
            v-else-if="isPreviewImage(previewContentType || previewFile.contentType)"
            class="w-full h-full overflow-auto p-3"
          >
            <img
              :src="previewUrl"
              alt="Preview"
              class="max-w-full max-h-[70vh] object-contain mx-auto"
            >
          </div>
          <div
            v-else
            class="p-4 text-white/70 text-sm"
          >
            This file type can’t be previewed in the browser. Use Download to open it.
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-2">
          <div class="text-xs text-white/50">
            Links expire after a short time.
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
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
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import axios from 'axios'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import SearchPill from '../../components/SearchPill.vue'
import Modal from '../../components/Modal.vue'
import DocumentUploader from '../../components/DocumentUploader.vue'
import FolderNodeRow from '../../components/documents/FolderNodeRow.vue'
import { useUiStore } from '../../stores/ui'
import { useProjectStore } from '../../stores/project'
import { useDocumentsStore, type DocFile, type DocFolderNode } from '../../stores/documents'
import { confirm } from '../../utils/confirm'

type FolderModalMode = 'create' | 'rename' | 'move'
type FileModalMode = 'rename' | 'move'

const ui = useUiStore()
const projectStore = useProjectStore()
const documents = useDocumentsStore()

const projectId = computed(() => projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
const q = ref('')
const qTrimmed = computed(() => q.value.trim().toLowerCase())

// Use a dedicated client for Azure Blob PUTs so we don't accidentally send app auth headers to Azure.
const blobHttp = axios.create()
try {
  // @ts-expect-error axios typing does not include index signature for defaults
  delete blobHttp.defaults.headers.common?.Authorization
} catch { /* ignore */ }

const expanded = reactive<Record<string, boolean>>({})
const expandedSnapshot = ref<Record<string, boolean> | null>(null)

const folderChildren = computed(() => {
  const root = documents.foldersRoot
  const kids = (root && Array.isArray(root.children)) ? root.children : []
  const needle = qTrimmed.value
  const base = kids.filter((n: any) => n && n.id)
  if (!needle) return base

  function matches(node: any) {
    const name = String(node?.name || '').toLowerCase()
    const path = String(node?.path || '').toLowerCase()
    return name.includes(needle) || path.includes(needle)
  }

  function filterTree(nodes: any[]): any[] {
    const out: any[] = []
    for (const n of nodes) {
      if (!n || !n.id) continue
      const rawKids = Array.isArray(n.children) ? n.children : []
      const kidsFiltered = filterTree(rawKids)
      if (matches(n) || kidsFiltered.length) {
        out.push({ ...n, children: kidsFiltered })
      }
    }
    return out
  }

  return filterTree(base)
})

const selectedFolder = computed(() => {
  const id = documents.selectedFolderId
  if (!id) return null
  return documents.flatFolders.find((f) => f.id === id) || null
})

const filteredFiles = computed(() => {
  const list = Array.isArray(documents.files) ? documents.files : []
  const needle = qTrimmed.value
  if (!needle) return list
  return list.filter((f: any) => String(f?.originalName || '').toLowerCase().includes(needle))
})

function toggleExpanded(id: string) {
  expanded[id] = !expanded[id]
}

function selectFolder(id: string) {
  documents.selectedFolderId = id
}

async function refreshAll() {
  if (!projectId.value) return
  try {
    await documents.fetchFoldersTree(projectId.value)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load folders')
    return
  }
  await nextTick()
  if (documents.selectedFolderId) {
    await documents.fetchFiles(projectId.value, documents.selectedFolderId)
  } else if (documents.flatFolders.length > 0) {
    documents.selectedFolderId = documents.flatFolders[0].id
  }
}

async function refreshFiles() {
  if (!projectId.value) return
  if (!documents.selectedFolderId) return
  await documents.fetchFiles(projectId.value, documents.selectedFolderId)
}

let refreshTimer: any = null
function scheduleRefreshFiles() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refreshFiles()
    refreshTimer = null
  }, 250)
}

watch(projectId, async (pid) => {
  documents.selectedFolderId = null
  documents.files = []
  if (!pid) return
  try {
    await documents.fetchFoldersTree(pid)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load folders')
    return
  }
  if (documents.flatFolders.length > 0) documents.selectedFolderId = documents.flatFolders[0].id
}, { immediate: true })

watch(() => documents.selectedFolderId, async (fid) => {
  if (!projectId.value || !fid) { documents.files = []; return }
  await documents.fetchFiles(projectId.value, fid)
})

watch(qTrimmed, (now, prev) => {
  const entering = !prev && !!now
  const leaving = !!prev && !now
  if (entering) {
    expandedSnapshot.value = { ...expanded }
    const root = documents.foldersRoot
    const kids = (root && Array.isArray(root.children)) ? root.children : []
    const stack: any[] = [...kids]
    while (stack.length) {
      const n = stack.pop()
      if (!n || !n.id) continue
      expanded[String(n.id)] = true
      const c = Array.isArray(n.children) ? n.children : []
      for (const k of c) stack.push(k)
    }
  } else if (leaving && expandedSnapshot.value) {
    for (const k of Object.keys(expanded)) delete expanded[k]
    Object.assign(expanded, expandedSnapshot.value)
    expandedSnapshot.value = null
  }
})

onMounted(() => { /* no-op */ })

function prettyType(ct: string) {
  const v = (ct || '').toLowerCase()
  if (v.includes('pdf')) return 'PDF'
  if (v.includes('spreadsheetml')) return 'XLSX'
  if (v.includes('wordprocessingml')) return 'DOCX'
  if (v.startsWith('image/')) return v.replace('image/', '').toUpperCase()
  return ct || 'Unknown'
}

function fileIconKey(ct: string) {
  const v = (ct || '').toLowerCase()
  if (v.includes('pdf')) return 'pdf'
  if (v.includes('spreadsheetml')) return 'xlsx'
  if (v.includes('wordprocessingml')) return 'docx'
  if (v.startsWith('image/')) return 'img'
  return 'file'
}

function fileIconEmoji(ct: string) {
  const key = fileIconKey(ct)
  if (key === 'xlsx') return '📊'
  if (key === 'docx') return '📝'
  return '📄'
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

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString()
  } catch {
    return iso
  }
}

function inferContentType(filename: string) {
  const name = String(filename || '').toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (name.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.heic')) return 'image/heic'
  if (name.endsWith('.heif')) return 'image/heif'
  return ''
}

function onUploadError(payload: { file: File; error: any }) {
  const e = payload?.error
  const data = e?.response?.data
  const base = data?.error || e?.message || 'Upload failed'
  const code = data?.code ? ` (${data.code})` : ''
  const hint = data?.hint ? `\n${data.hint}` : ''
  ui.showError(`${base}${code}${hint}`)
}

async function uploadOne(file: File, onProgress: (pct: number) => void) {
  if (!projectId.value || !documents.selectedFolderId) throw new Error('Project and folder are required')
  const contentType = file.type || inferContentType(file.name)
  if (!contentType) throw new Error('Unable to determine file type for upload')
  const req = await documents.requestUpload(projectId.value, {
    folderId: documents.selectedFolderId,
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

  await documents.completeUpload(projectId.value, req.fileId)
  return req
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
  if (!projectId.value) return
  previewFile.value = file
  previewOpen.value = true
  previewLoading.value = true
  previewUrl.value = ''
  previewContentType.value = ''
  try {
    const { previewUrl: url, contentType } = await documents.getPreviewUrl(projectId.value, file.id)
    previewUrl.value = url
    previewContentType.value = contentType || 'application/pdf'
  } catch (e: any) {
    const data = e?.response?.data
    const msg = data?.error || e?.message || 'Failed to load preview'
    const hint = data?.hint ? String(data.hint) : ''
    ui.showError(hint ? `${msg} — ${hint}` : msg)
    previewOpen.value = false
  } finally {
    previewLoading.value = false
  }
}

// Folder modals
const folderModalOpen = ref(false)
const folderModalMode = ref<FolderModalMode>('create')
const folderModalSaving = ref(false)
const folderModalName = ref('')
const folderModalParentId = ref<string>('')
const folderModalFolderId = ref<string>('')
const folderMoveOptions = computed(() => {
  const currentId = folderModalFolderId.value
  const current = currentId ? documents.flatFolders.find((f) => f.id === currentId) : null
  const currentPath = current?.path || ''
  return documents.flatFolders.filter((f) => {
    if (!currentId) return true
    if (f.id === currentId) return false
    if (!currentPath) return true
    return !(f.path === currentPath || f.path?.startsWith(`${currentPath}/`))
  })
})

function openCreateFolder(parentId: string | null) {
  folderModalMode.value = 'create'
  folderModalFolderId.value = ''
  folderModalName.value = ''
  folderModalParentId.value = parentId || ''
  folderModalOpen.value = true
}

function openRenameFolder(node: DocFolderNode) {
  folderModalMode.value = 'rename'
  folderModalFolderId.value = String(node.id || '')
  folderModalName.value = String(node.name || '')
  folderModalParentId.value = ''
  folderModalOpen.value = true
}

function openMoveFolder(node: DocFolderNode) {
  folderModalMode.value = 'move'
  folderModalFolderId.value = String(node.id || '')
  folderModalName.value = ''
  folderModalParentId.value = node.parentId ? String(node.parentId) : ''
  folderModalOpen.value = true
}

async function saveFolderModal() {
  if (!projectId.value) return
  folderModalSaving.value = true
  try {
    if (folderModalMode.value === 'create') {
      await documents.createFolder(projectId.value, { parentId: folderModalParentId.value || null, name: folderModalName.value })
      ui.showSuccess('Folder created')
    } else if (folderModalMode.value === 'rename') {
      await documents.updateFolder(projectId.value, folderModalFolderId.value, { name: folderModalName.value })
      ui.showSuccess('Folder renamed')
    } else {
      await documents.updateFolder(projectId.value, folderModalFolderId.value, { parentId: folderModalParentId.value || null })
      ui.showSuccess('Folder moved')
    }
    folderModalOpen.value = false
    await refreshAll()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Folder update failed')
  } finally {
    folderModalSaving.value = false
  }
}

async function deleteFolder(node: DocFolderNode) {
  if (!projectId.value || !node.id) return
  const ok = await confirm({ title: 'Delete folder?', message: `Delete "${node.name}"?`, confirmText: 'Delete', variant: 'danger' })
  if (!ok) return
  try {
    await documents.deleteFolder(projectId.value, String(node.id))
    if (documents.selectedFolderId === String(node.id)) documents.selectedFolderId = null
    ui.showSuccess('Folder deleted')
    await refreshAll()
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (e?.response?.status === 409 && code === 'FOLDER_NOT_EMPTY') {
      const ok2 = await confirm({
        title: 'Folder not empty',
        message: `“${node.name}” contains subfolders and/or files. Delete everything inside it?`,
        confirmText: 'Delete recursively',
        variant: 'danger',
      })
      if (!ok2) return
      try {
        await documents.deleteFolder(projectId.value, String(node.id), { recursive: true })
        if (documents.selectedFolderId === String(node.id)) documents.selectedFolderId = null
        ui.showSuccess('Folder deleted')
        await refreshAll()
        return
      } catch (e2: any) {
        ui.showError(e2?.response?.data?.error || e2?.message || 'Failed to delete folder')
        return
      }
    }
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete folder')
  }
}

// File modals
const fileModalOpen = ref(false)
const fileModalMode = ref<FileModalMode>('rename')
const fileModalSaving = ref(false)
const fileModalName = ref('')
const fileModalFolderId = ref('')
const fileModalFileId = ref('')

function openRenameFile(file: DocFile) {
  fileModalMode.value = 'rename'
  fileModalFileId.value = file.id
  fileModalName.value = file.originalName
  fileModalFolderId.value = ''
  fileModalOpen.value = true
}

function openMoveFile(file: DocFile) {
  fileModalMode.value = 'move'
  fileModalFileId.value = file.id
  fileModalFolderId.value = documents.selectedFolderId || ''
  fileModalName.value = ''
  fileModalOpen.value = true
}

async function saveFileModal() {
  if (!projectId.value) return
  fileModalSaving.value = true
  try {
    if (fileModalMode.value === 'rename') {
      await documents.updateFile(projectId.value, fileModalFileId.value, { filename: fileModalName.value })
      ui.showSuccess('File renamed')
    } else {
      await documents.updateFile(projectId.value, fileModalFileId.value, { folderId: fileModalFolderId.value })
      ui.showSuccess('File moved')
    }
    fileModalOpen.value = false
    await refreshFiles()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'File update failed')
  } finally {
    fileModalSaving.value = false
  }
}

async function deleteFile(file: DocFile) {
  if (!projectId.value) return
  const ok = await confirm({ title: 'Delete file?', message: `Delete "${file.originalName}"?`, confirmText: 'Delete', variant: 'danger' })
  if (!ok) return
  try {
    await documents.deleteFile(projectId.value, file.id)
    ui.showSuccess('File deleted')
    await refreshFiles()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete file')
  }
}

async function downloadFile(file: DocFile) {
  if (!projectId.value) return
  try {
    const { downloadUrl } = await documents.getDownloadUrl(projectId.value, file.id)
    window.open(downloadUrl, '_blank', 'noopener')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to download file')
  }
}
</script>
