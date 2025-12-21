<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Templates', to: '/app/admin/templates' }, { text: 'Task Templates', to: '/app/admin/templates/task-templates' }, { text: isNew ? 'New' : 'Edit' }]" />
    <h2 class="text-2xl mb-4 text-white">
      {{ isNew ? 'New Task Template' : 'Edit Task Template' }}
    </h2>

    <div
      v-if="error"
      class="text-red-400 mb-4"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="text-white/70"
    >
      Loading...
    </div>

    <div
      v-else
      class="space-y-4 max-w-3xl"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-white/80 mb-1">Name</label>
          <input
            v-model="form.name"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
            placeholder="Cx General"
          >
        </div>
        <div>
          <label class="block text-white/80 mb-1">Slug</label>
          <input
            v-model="form.slug"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
            placeholder="cx-general"
          >
          <p class="text-xs text-white/60 mt-1">
            Optional. If blank, it will be generated from the name.
          </p>
        </div>
        <div>
          <label class="block text-white/80 mb-1">Category</label>
          <input
            v-model="form.category"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
            placeholder="Cx"
          >
        </div>
        <div>
          <label class="block text-white/80 mb-1">Version</label>
          <input
            v-model="form.version"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
            placeholder="1.0.0"
          >
        </div>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="active"
          v-model="form.isActive"
          type="checkbox"
          class="w-4 h-4"
        >
        <label
          for="active"
          class="text-white/80"
        >
          Active (visible to Premium users)
        </label>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between gap-3">
          <label class="block text-white/80">MS Project XML</label>
          <input
            ref="xmlFile"
            type="file"
            accept=".xml"
            class="text-sm text-white/70"
            @change="onXmlFileSelected"
          >
        </div>
        <textarea
          v-model="form.xml"
          rows="14"
          class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400 font-mono text-xs"
          placeholder="Paste MS Project XML here"
        />
        <p class="text-xs text-white/60">
          This XML is stored as the template source and used to import tasks into a project.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
          :disabled="saving || !canSave"
          @click="save"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button
          v-if="!isNew"
          class="px-4 py-2 rounded bg-red-600/80 text-white disabled:opacity-50"
          :disabled="saving"
          @click="del"
        >
          Delete
        </button>
        <router-link
          :to="{ name: 'admin-task-templates' }"
          class="px-4 py-2 rounded bg-gray-700 text-white"
        >
          Back
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import http from '../../utils/http'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import { useUiStore } from '../../stores/ui'

const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const id = String(route.params.id || '')
const isNew = computed(() => id === 'new')

const loading = ref(false)
const saving = ref(false)
const error = ref('')
const xmlFile = ref(null)

const form = ref({
  name: '',
  slug: '',
  category: '',
  version: '1.0.0',
  isActive: true,
  xml: '',
})

const canSave = computed(() => {
  return String(form.value.name || '').trim().length > 0 && String(form.value.xml || '').trim().length > 0
})

async function load() {
  if (isNew.value) return
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get(`/api/admin/task-templates/${id}`)
    form.value = {
      name: data?.name || '',
      slug: data?.slug || '',
      category: data?.category || '',
      version: data?.version || '1.0.0',
      isActive: data?.isActive !== false,
      xml: data?.xml || '',
    }
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || String(e)
  } finally {
    loading.value = false
  }
}

async function onXmlFileSelected(e) {
  const file = e?.target?.files && e.target.files[0]
  if (!file) return
  try {
    const text = await file.text()
    form.value.xml = String(text || '')
    ui.showInfo('XML loaded')
  } catch (err) {
    ui.showError(err?.message || 'Failed to read XML')
  } finally {
    try {
      if (xmlFile.value) xmlFile.value.value = ''
    } catch (_) {
      /* ignore */
    }
  }
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  error.value = ''
  try {
    if (isNew.value) {
      await http.post('/api/admin/task-templates', form.value)
    } else {
      await http.patch(`/api/admin/task-templates/${id}`, form.value)
    }
    ui.showSuccess('Saved')
    router.push({ name: 'admin-task-templates' })
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || String(e)
  } finally {
    saving.value = false
  }
}

async function del() {
  if (isNew.value) return
  if (!confirm('Delete this task template?')) return
  saving.value = true
  try {
    await http.delete(`/api/admin/task-templates/${id}`)
    ui.showSuccess('Deleted')
    router.push({ name: 'admin-task-templates' })
  } catch (e) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
