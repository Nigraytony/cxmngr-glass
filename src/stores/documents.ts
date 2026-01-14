import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import axios from 'axios'
import { getApiBase } from '../utils/api'
import { getAuthHeaders } from '../utils/auth'

export type DocFolderNode = {
  id: string | null
  name: string
  path?: string
  parentId?: string | null
  children?: DocFolderNode[]
}

export type DocFile = {
  id: string
  originalName: string
  contentType: string
  sizeBytes: number
  status: 'pending' | 'ready' | 'deleted'
  createdAt: string
  updatedAt: string
}

const API_BASE = `${getApiBase()}/api/projects`

function asString(v: any) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

export const useDocumentsStore = defineStore('documents', () => {
  const foldersRoot = ref<DocFolderNode | null>(null)
  const selectedFolderId = ref<string | null>(null)
  const files = ref<DocFile[]>([])
  const loadingTree = ref(false)
  const loadingFiles = ref(false)

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
      const { data } = await axios.get(`${API_BASE}/${projectId}/docs/folders/tree`, { headers: getAuthHeaders() })
      foldersRoot.value = data?.root || null
    } finally {
      loadingTree.value = false
    }
  }

  async function createFolder(projectId: string, payload: { parentId: string | null; name: string }) {
    const { data } = await axios.post(
      `${API_BASE}/${projectId}/docs/folders`,
      payload,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    )
    return data?.folder
  }

  async function updateFolder(projectId: string, folderId: string, payload: { parentId?: string | null; name?: string }) {
    const { data } = await axios.patch(
      `${API_BASE}/${projectId}/docs/folders/${folderId}`,
      payload,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    )
    return data?.folder
  }

  async function deleteFolder(projectId: string, folderId: string, opts?: { recursive?: boolean }) {
    const { data } = await axios.delete(`${API_BASE}/${projectId}/docs/folders/${folderId}`, {
      headers: getAuthHeaders(),
      params: opts && opts.recursive ? { recursive: true } : undefined,
    })
    return data
  }

  async function fetchFiles(projectId: string, folderId: string) {
    if (!projectId || !folderId) { files.value = []; return }
    loadingFiles.value = true
    try {
      const { data } = await axios.get(`${API_BASE}/${projectId}/docs/files`, {
        params: { folderId },
        headers: getAuthHeaders(),
      })
      files.value = Array.isArray(data?.files) ? data.files : []
    } finally {
      loadingFiles.value = false
    }
  }

  async function requestUpload(projectId: string, payload: { folderId: string; filename: string; contentType: string; sizeBytes: number }) {
    const { data } = await axios.post(
      `${API_BASE}/${projectId}/docs/files/request-upload`,
      payload,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    )
    return data as { fileId: string; uploadUrl: string; expiresAt: string }
  }

  async function completeUpload(projectId: string, fileId: string) {
    const { data } = await axios.post(`${API_BASE}/${projectId}/docs/files/${fileId}/complete`, {}, { headers: getAuthHeaders() })
    return data
  }

  async function getDownloadUrl(projectId: string, fileId: string) {
    const { data } = await axios.get(`${API_BASE}/${projectId}/docs/files/${fileId}/download-url`, { headers: getAuthHeaders() })
    return data as { downloadUrl: string; expiresAt: string }
  }

  async function updateFile(projectId: string, fileId: string, payload: { filename?: string; folderId?: string }) {
    const { data } = await axios.patch(
      `${API_BASE}/${projectId}/docs/files/${fileId}`,
      payload,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    )
    return data?.file
  }

  async function deleteFile(projectId: string, fileId: string) {
    const { data } = await axios.delete(`${API_BASE}/${projectId}/docs/files/${fileId}`, { headers: getAuthHeaders() })
    return data
  }

  return {
    foldersRoot,
    selectedFolderId,
    files,
    loadingTree,
    loadingFiles,
    flatFolders,
    fetchFoldersTree,
    createFolder,
    updateFolder,
    deleteFolder,
    fetchFiles,
    requestUpload,
    completeUpload,
    getDownloadUrl,
    updateFile,
    deleteFile,
  }
})
