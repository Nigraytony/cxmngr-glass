<template>
  <div class="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="text-white/80 font-medium">
        Report photo captions
        <span class="text-white/50 text-sm font-normal ml-2">print under each figure on the issue report</span>
      </div>
      <button
        type="button"
        :disabled="saving"
        class="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/30 text-sm disabled:opacity-50"
        @click="$emit('save')"
      >
        {{ saving ? 'Saving…' : 'Save captions' }}
      </button>
    </div>

    <div
      v-if="loading"
      class="text-white/50 text-sm"
    >
      Loading photos…
    </div>
    <div
      v-else-if="!files.length"
      class="text-white/50 text-sm"
    >
      No photos uploaded yet.
    </div>
    <div
      v-for="f in files"
      :key="f.id"
      class="grid grid-cols-12 gap-3 items-center rounded-lg bg-white/5 border border-white/10 p-2"
    >
      <div class="col-span-12 md:col-span-2">
        <img
          v-if="f.thumbUrl"
          :src="f.thumbUrl"
          :alt="f.name"
          class="w-full h-16 object-cover rounded-md border border-white/10"
        >
        <div class="text-white/40 text-[10px] mt-1 truncate">
          {{ f.name }}
        </div>
      </div>
      <input
        :value="(photoMeta[f.id] || {}).caption || ''"
        type="text"
        placeholder="Caption (one line)"
        class="col-span-12 md:col-span-8 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
        @input="setMeta(f.id, 'caption', ($event.target as HTMLInputElement).value)"
      >
      <label class="col-span-12 md:col-span-2 flex items-center gap-1.5 text-white/70 text-xs">
        <input
          type="checkbox"
          :checked="(photoMeta[f.id] || {}).includeInReport !== false"
          class="rounded bg-white/10 border-white/20"
          @change="setMeta(f.id, 'includeInReport', ($event.target as HTMLInputElement).checked)"
        >
        Include in report
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
// Issue report redesign Step 3: captions + include flags for Azure-stored
// issue photos (Photos/Issue/<id>), keyed by doc-file id on issue.photoMeta.
// Mutates the parent's reactive photoMeta; the Save button emits 'save'.
import { onMounted, ref } from 'vue'
import http from '../../utils/http'

const props = defineProps<{
  projectId: string
  issueId: string
  photoMeta: Record<string, any>
  saving?: boolean
}>()
defineEmits<{ (e: 'save'): void }>()

const files = ref<Array<{ id: string; name: string; thumbUrl: string }>>([])
const loading = ref(false)

function setMeta(fileId: string, key: string, value: any) {
  // eslint-disable-next-line vue/no-mutating-props -- parent form object by design
  props.photoMeta[fileId] = { ...(props.photoMeta[fileId] || {}), [key]: value }
}

async function loadFiles() {
  if (!props.projectId || !props.issueId || props.issueId === 'new') return
  loading.value = true
  try {
    const tree = (await http.get(`/api/projects/${props.projectId}/docs/folders/tree`)).data
    const flat: Array<{ id: string; name: string; parentId: string | null }> = []
    const walk = (node: any) => {
      for (const ch of (Array.isArray(node?.children) ? node.children : [])) {
        if (ch && ch.id) flat.push({ id: String(ch.id), name: String(ch.name || ''), parentId: ch.parentId ? String(ch.parentId) : null })
        walk(ch)
      }
    }
    walk(tree?.root)
    let parentId: string | null = null
    for (const seg of ['Photos', 'Issue', props.issueId]) {
      const f = flat.find((x) => (x.parentId || null) === (parentId || null) && x.name.trim() === seg)
      if (!f) { files.value = []; return }
      parentId = f.id
    }
    const filesRes = (await http.get(`/api/projects/${props.projectId}/docs/files`, { params: { folderId: parentId } })).data
    const imgs = (Array.isArray(filesRes?.files) ? filesRes.files : [])
      .filter((f: any) => f && f.status !== 'deleted' && String(f.contentType || '').toLowerCase().startsWith('image/'))
    const out: Array<{ id: string; name: string; thumbUrl: string }> = []
    for (const f of imgs) {
      let thumbUrl = ''
      try {
        thumbUrl = String(((await http.get(`/api/projects/${props.projectId}/docs/files/${f.id}/download-url`)).data || {}).downloadUrl || '')
      } catch (e) { /* no thumb */ }
      out.push({ id: String(f.id), name: String(f.name || ''), thumbUrl })
    }
    files.value = out
  } catch (e) {
    files.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadFiles)
</script>
