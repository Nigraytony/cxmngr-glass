import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import http from '../utils/http'

export type DocFolderNode = {
  id: string | null
  name: string
  path?: string
  parentId?: string | null
  children?: DocFolderNode[]
}

export type DocFile = {
  id: string
  folderId?: string
  folderPath?: string
  originalName: string
  contentType: string
  sizeBytes: number
  status: 'pending' | 'ready' | 'deleted'
  createdAt: string
  updatedAt: string
}

const API_BASE = `/api/projects`

function asString(v: any) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

export const useDocumentsStore = defineStore('documents', () => {
  const foldersRoot = ref<DocFolderNode | null>(null)
  const selectedFolderId = ref<string | null>(null)
  const files = ref<DocFile[]>([])
  const searchResults = ref<DocFile[]>([])
  const searchQuery = ref('')
  const loadingTree = ref(false)
  const loadingFiles = ref(false)
  const loadingSearch = ref(false)

  const flatFolders = computed(() => {
    const out: Array<{ id: string; name: string; path: string; parentId: string | null }> = []
    function walk(node?: DocFolderNode) {
      if (!node) return
      const kids = Array.isArray(node.children) ? node.children : []
      for (const c of kids) {
        if (c && c.id) {
          out.push({
            id: String(c.id),
            name: asString(c.name),
            path: asString(c.path),
            parentId: c.parentId ? String(c.parentId) : null,
          })
        }
        walk(c)
      }
    }
    walk(foldersRoot.value || undefined)
    return out
  })

  async function fetchFoldersTree(projectId: string) {
    if (!projectId) { foldersRoot.value = null; return }
    loadingTree.value = true
    try {
      const { data } = await http.get(`${API_BASE}/${projectId}/docs/folders/tree`)
      foldersRoot.value = data?.root || null
    } finally {
      loadingTree.value = false
    }
  }

  async function createFolder(projectId: string, payload: { parentId: string | null; name: string }) {
    const { data } = await http.post(
      `${API_BASE}/${projectId}/docs/folders`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    )
    return data?.folder
  }

  async function updateFolder(projectId: string, folderId: string, payload: { parentId?: string | null; name?: string }) {
    const { data } = await http.patch(
      `${API_BASE}/${projectId}/docs/folders/${folderId}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    )
    return data?.folder
  }

  async function deleteFolder(projectId: string, folderId: string, opts?: { recursive?: boolean }) {
    const { data } = await http.delete(`${API_BASE}/${projectId}/docs/folders/${folderId}`, {
      params: opts && opts.recursive ? { recursive: true } : undefined,
    })
    return data
  }

  async function fetchFiles(projectId: string, folderId: string) {
    if (!projectId || !folderId) { files.value = []; return }
    loadingFiles.value = true
    try {
      const { data } = await http.get(`${API_BASE}/${projectId}/docs/files`, {
        params: { folderId },
      })
      files.value = Array.isArray(data?.files) ? data.files : []
    } finally {
      loadingFiles.value = false
    }
  }

  function clearSearch() {
    searchQuery.value = ''
    searchResults.value = []
    loadingSearch.value = false
  }

  async function searchFiles(projectId: string, q: string) {
    const query = asString(q).trim()
    if (!projectId || !query) {
      clearSearch()
      return
    }

    searchQuery.value = query
    loadingSearch.value = true
    try {
      const { data } = await http.get(`${API_BASE}/${projectId}/docs/files`, {
        params: { q: query },
      })
      if (searchQuery.value !== query) return
      searchResults.value = Array.isArray(data?.files) ? data.files : []
    } finally {
      if (searchQuery.value === query) loadingSearch.value = false
    }
  }

  async function requestUpload(projectId: string, payload: { folderId: string; filename: string; contentType: string; sizeBytes: number }) {
    const { data } = await http.post(
      `${API_BASE}/${projectId}/docs/files/request-upload`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    )
    return data as { fileId: string; uploadUrl: string; expiresAt: string; originalName?: string; renamedFrom?: string }
  }

  async function completeUpload(projectId: string, fileId: string) {
    const { data } = await http.post(`${API_BASE}/${projectId}/docs/files/${fileId}/complete`, {})
    return data
  }

  async function getDownloadUrl(projectId: string, fileId: string) {
    const { data } = await http.get(`${API_BASE}/${projectId}/docs/files/${fileId}/download-url`)
    return data as { downloadUrl: string; expiresAt: string }
  }

  async function getPreviewUrl(projectId: string, fileId: string) {
    const { data } = await http.get(`${API_BASE}/${projectId}/docs/files/${fileId}/preview-url`)
    return data as { previewUrl: string; contentType: string; source: 'original' | 'converted'; expiresAt: string }
  }

  async function updateFile(projectId: string, fileId: string, payload: { filename?: string; folderId?: string }) {
    const { data } = await http.patch(
      `${API_BASE}/${projectId}/docs/files/${fileId}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    )
    return data?.file
  }

  async function deleteFile(projectId: string, fileId: string) {
    const { data } = await http.delete(`${API_BASE}/${projectId}/docs/files/${fileId}`)
    return data
  }

  return {
    foldersRoot,
    selectedFolderId,
    files,
    searchResults,
    searchQuery,
    loadingTree,
    loadingFiles,
    loadingSearch,
    flatFolders,
    fetchFoldersTree,
    createFolder,
    updateFolder,
    deleteFolder,
    fetchFiles,
    searchFiles,
    clearSearch,
    requestUpload,
    completeUpload,
    getDownloadUrl,
    getPreviewUrl,
    updateFile,
    deleteFile,
  }
})
