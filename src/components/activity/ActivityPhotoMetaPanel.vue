<template>
  <div class="mt-6 rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <div class="text-white/80 font-medium">
        Report photo details
        <span class="text-white/50 text-sm font-normal ml-2">captions, equipment tags, issue links, cover photo</span>
      </div>
      <button
        type="button"
        :disabled="saving"
        class="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/30 text-sm disabled:opacity-50"
        @click="$emit('save')"
      >
        {{ saving ? 'Saving…' : 'Save photo details' }}
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
      class="grid grid-cols-12 gap-3 items-start rounded-lg bg-white/5 border border-white/10 p-2"
    >
      <div class="col-span-12 md:col-span-2">
        <img
          v-if="f.thumbUrl"
          :src="f.thumbUrl"
          :alt="f.name"
          class="w-full h-20 object-cover rounded-md border border-white/10"
        >
        <div class="text-white/40 text-[10px] mt-1 truncate">
          {{ f.name }}
        </div>
      </div>
      <div class="col-span-12 md:col-span-6 space-y-2">
        <input
          :value="metaFor(f.id).caption"
          type="text"
          placeholder="Caption (one line, prints under the photo)"
          class="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
          @input="setMeta(f.id, 'caption', ($event.target as HTMLInputElement).value)"
        >
        <input
          :value="(metaFor(f.id).equipmentTags || []).join(', ')"
          type="text"
          placeholder="Equipment tags, comma separated (CH-1, CT-1)"
          class="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
          @input="setMeta(f.id, 'equipmentTags', String(($event.target as HTMLInputElement).value || '').split(',').map(v => v.trim()).filter(Boolean))"
        >
      </div>
      <div class="col-span-12 md:col-span-2">
        <select
          multiple
          :size="3"
          class="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1 text-white/80 text-xs [&>option]:bg-slate-800"
          title="Linked issues (ctrl/cmd-click for several)"
          @change="setMeta(f.id, 'issueIds', Array.from(($event.target as HTMLSelectElement).selectedOptions).map(o => o.value))"
        >
          <option
            v-for="iss in issues"
            :key="iss.id"
            :value="iss.id"
            :selected="(metaFor(f.id).issueIds || []).includes(iss.id)"
          >
            #{{ iss.number }} {{ iss.title }}
          </option>
        </select>
      </div>
      <div class="col-span-12 md:col-span-2 space-y-1.5 pt-0.5">
        <label class="flex items-center gap-1.5 text-white/70 text-xs">
          <input
            type="radio"
            name="activity-cover-photo"
            :checked="metaFor(f.id).isCover === true"
            class="bg-white/10 border-white/20"
            @change="setCover(f.id)"
          >
          Cover photo
        </label>
        <label class="flex items-center gap-1.5 text-white/70 text-xs">
          <input
            type="checkbox"
            :checked="metaFor(f.id).includeInReport !== false"
            class="rounded bg-white/10 border-white/20"
            @change="setMeta(f.id, 'includeInReport', ($event.target as HTMLInputElement).checked)"
          >
          Include in report
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- the parent passes its reactive
   form.photoMeta by design; its Save button persists the mutations. */
// Stage 3 of the Activity report redesign: edits activity.photoMeta — the
// caption/tags/issue-links/cover flag for Azure-stored activity photos,
// keyed by doc-file id. Mutates the parent's reactive photoMeta object;
// the Save button emits 'save' so the page persists the activity.
import { onMounted, ref } from 'vue'
import http from '../../utils/http'

const props = defineProps<{
  projectId: string
  activityId: string
  /** The parent's reactive form.photoMeta object (mutated in place). */
  photoMeta: Record<string, any>
  /** Issues available for linking: { id, number, title }. */
  issues: Array<{ id: string; number: string | number; title: string }>
  saving?: boolean
}>()
defineEmits<{ (e: 'save'): void }>()

const files = ref<Array<{ id: string; name: string; thumbUrl: string }>>([])
const loading = ref(false)

function metaFor(fileId: string): any {
  return props.photoMeta[fileId] || {}
}

function setMeta(fileId: string, key: string, value: any) {
  const cur = { ...(props.photoMeta[fileId] || {}) }
  cur[key] = value
  props.photoMeta[fileId] = cur
}

function setCover(fileId: string) {
  for (const k of Object.keys(props.photoMeta)) {
    if (props.photoMeta[k] && props.photoMeta[k].isCover) props.photoMeta[k] = { ...props.photoMeta[k], isCover: false }
  }
  setMeta(fileId, 'isCover', true)
}

async function loadFiles() {
  if (!props.projectId || !props.activityId || props.activityId === 'new') return
  loading.value = true
  try {
    const tree = (await http.get(`/api/projects/${props.projectId}/docs/folders/tree`)).data
    const flat: Array<{ id: string; name: string; parentId: string | null }> = []
    const walk = (node: any) => {
      for (const c of (Array.isArray(node?.children) ? node.children : [])) {
        if (c && c.id) flat.push({ id: String(c.id), name: String(c.name || ''), parentId: c.parentId ? String(c.parentId) : null })
        walk(c)
      }
    }
    walk(tree?.root)
    let parentId: string | null = null
    for (const seg of ['Photos', 'Activity', props.activityId]) {
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
