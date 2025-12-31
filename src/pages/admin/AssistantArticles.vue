<template>
  <div class="p-4">
    <BreadCrumbs :items="[{ text: 'Admin', to: '/app/admin' }, { text: 'Assistant Articles' }]" />

    <div class="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div class="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-3">
        <div class="flex items-center gap-2">
          <button
            class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
            title="New article"
            aria-label="New article"
            @click="newArticle"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
            </svg>
          </button>

          <input
            v-model="q"
            placeholder="Search articles"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full placeholder:text-gray-400"
            @keyup.enter="load"
          >
        </div>

        <div class="mt-2 flex items-center gap-2">
          <select
            v-model="category"
            class="p-2 rounded bg-white/5 border border-white/10 text-white w-full"
            @change="() => { page = 1; load() }"
          >
            <option value="">
              All categories
            </option>
            <option
              v-for="c in categories"
              :key="c"
              :value="c"
            >
              {{ c }}
            </option>
          </select>

          <button
            class="px-3 py-2 rounded bg-indigo-600 text-white shrink-0"
            :disabled="loading"
            @click="load"
          >
            Search
          </button>
        </div>

        <div
          v-if="error"
          class="mt-3 text-red-300 text-sm"
        >
          {{ error }}
        </div>

        <div class="mt-3 space-y-2">
          <button
            v-for="a in items"
            :key="a.slug"
            class="w-full text-left rounded-lg border border-white/10 bg-black/20 p-3 hover:bg-black/30"
            :class="selectedSlug === a.slug ? 'ring-1 ring-emerald-400/40' : ''"
            @click="select(a.slug)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm text-white/90">
                  {{ a.title }}
                </div>
                <div class="mt-1 text-xs text-white/50">
                  {{ a.category }}<span v-if="a.author"> • {{ a.author }}</span>
                  <span
                    class="ml-2"
                    :class="a.isPublished ? 'text-emerald-300' : 'text-white/40'"
                  >{{ a.isPublished ? 'Published' : 'Draft' }}</span>
                </div>
                <div
                  v-if="a.summary"
                  class="mt-2 text-xs text-white/70 line-clamp-2"
                >
                  {{ a.summary }}
                </div>
              </div>
              <div class="shrink-0 text-xs text-white/40">
                {{ fmtDate(a.updatedAt) }}
              </div>
            </div>
          </button>
        </div>

        <div class="mt-4 flex items-center justify-between text-xs text-white/70">
          <div>
            {{ total }} total
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-60"
              :disabled="loading || page <= 1"
              @click="() => { page -= 1; load() }"
            >
              Prev
            </button>
            <span>Page {{ page }}</span>
            <button
              class="px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-60"
              :disabled="loading || page * perPage >= total"
              @click="() => { page += 1; load() }"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div class="lg:col-span-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-white/90">
              {{ form.slug ? 'Edit Article' : 'New Article' }}
            </div>
            <div
              v-if="form.slug"
              class="mt-1 text-xs text-white/50"
            >
              Slug: <span class="text-white/70">{{ form.slug }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-2 rounded bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 disabled:opacity-60"
              :disabled="saving || !canSave"
              @click="save"
            >
              Save
            </button>
            <button
              v-if="form.slug"
              class="h-10 w-10 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-red-500/10 text-white/90 disabled:opacity-60"
              title="Delete"
              aria-label="Delete"
              :disabled="saving"
              @click="del"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
                aria-hidden
              >
                <path
                  d="M3 6h18"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M8 6V4h8v2"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M19 6l-1 14H6L5 6"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
                <path
                  d="M10 11v6M14 11v6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div
          v-if="formError"
          class="mt-3 text-sm text-red-300"
        >
          {{ formError }}
        </div>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-white/60">Title</label>
            <input
              v-model="form.title"
              type="text"
              class="mt-1 w-full p-2 rounded bg-white/5 border border-white/10 text-white"
            >
          </div>
          <div>
            <label class="text-xs text-white/60">Category</label>
            <select
              v-model="form.category"
              class="mt-1 w-full p-2 rounded bg-white/5 border border-white/10 text-white"
            >
              <option value="">
                Select…
              </option>
              <option
                v-for="c in categories"
                :key="c"
                :value="c"
              >
                {{ c }}
              </option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="text-xs text-white/60">Author</label>
            <input
              v-model="form.author"
              type="text"
              list="assistant-authors"
              class="mt-1 w-full p-2 rounded bg-white/5 border border-white/10 text-white"
              placeholder="CXMA"
            >
            <datalist id="assistant-authors">
              <option
                v-for="a in trustedAuthors"
                :key="a"
                :value="a"
              />
            </datalist>
            <div class="mt-1 text-[11px] text-white/40">
              Use trusted/approved author names (ex: internal SMEs, partner firms, or “CXMA”).
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="text-xs text-white/60">Summary</label>
            <textarea
              v-model="form.summary"
              class="mt-1 w-full p-2 rounded bg-white/5 border border-white/10 text-white"
              rows="3"
            />
          </div>
          <div class="md:col-span-2">
            <label class="text-xs text-white/60">Tags (comma-separated)</label>
            <input
              v-model="form.tags"
              type="text"
              class="mt-1 w-full p-2 rounded bg-white/5 border border-white/10 text-white"
              placeholder="leed, cx, startup"
            >
          </div>
          <div class="md:col-span-2 flex items-center gap-2">
            <input
              id="published"
              v-model="form.isPublished"
              type="checkbox"
              class="form-checkbox h-5 w-5 rounded bg-white/10 border-white/30 text-emerald-400"
            >
            <label
              for="published"
              class="text-sm text-white/80"
            >
              Published
            </label>
          </div>
          <div class="md:col-span-2">
            <label class="text-xs text-white/60">Body</label>
            <textarea
              v-model="form.body"
              class="mt-1 w-full p-2 rounded bg-white/5 border border-white/10 text-white font-mono text-sm"
              rows="18"
            />
            <div class="mt-1 text-[11px] text-white/40">
              Stored as plain text. Keep copyrighted standards text out of CXMA unless you have explicit rights to store and redistribute it.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import http from '../../utils/http'

const categories = [
  'New Building Cx',
  'Existing Building Cx',
  'LEED Cx',
  'Facility Assessments',
  'The CXMA Platform',
]

const trustedAuthors = [
  'CXMA',
  'CXMA Team',
  'Commissioning Authority',
  'BCxA',
  'ASHRAE',
  'USGBC',
]

const loading = ref(false)
const error = ref('')

const items = ref([])
const total = ref(0)
const page = ref(1)
const perPage = ref(25)
const q = ref('')
const category = ref('')

const selectedSlug = ref('')
const saving = ref(false)
const formError = ref('')
const form = reactive({
  slug: '',
  title: '',
  category: '',
  author: '',
  summary: '',
  body: '',
  tags: '',
  isPublished: true,
})

function fmtDate(iso) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString()
  } catch {
    return ''
  }
}

const canSave = computed(() => {
  return String(form.title || '').trim().length > 0 && String(form.category || '').trim().length > 0
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await http.get('/api/admin/assistant-articles', {
      params: {
        page: page.value,
        perPage: perPage.value,
        ...(q.value ? { search: q.value } : {}),
        ...(category.value ? { category: category.value } : {}),
      },
    })
    items.value = Array.isArray(data?.items) ? data.items : []
    total.value = Number(data?.total || 0)
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to load articles'
  } finally {
    loading.value = false
  }
}

async function select(slug) {
  const s = String(slug || '').trim()
  if (!s) return
  selectedSlug.value = s
  formError.value = ''
  try {
    const { data } = await http.get(`/api/admin/assistant-articles/${encodeURIComponent(s)}`)
    form.slug = data?.slug || s
    form.title = data?.title || ''
    form.category = data?.category || ''
    form.author = data?.author || ''
    form.summary = data?.summary || ''
    form.body = data?.body || ''
    form.tags = Array.isArray(data?.tags) ? data.tags.join(', ') : ''
    form.isPublished = data?.isPublished !== false
  } catch (e) {
    formError.value = e?.response?.data?.error || e?.message || 'Failed to load article'
  }
}

function newArticle() {
  selectedSlug.value = ''
  formError.value = ''
  form.slug = ''
  form.title = ''
  form.category = categories[0]
  form.author = 'CXMA'
  form.summary = ''
  form.body = ''
  form.tags = ''
  form.isPublished = true
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      title: form.title,
      category: form.category,
      author: form.author,
      summary: form.summary,
      body: form.body,
      tags: form.tags,
      isPublished: form.isPublished,
    }
    if (!form.slug) {
      const { data } = await http.post('/api/admin/assistant-articles', payload)
      const slug = data?.slug
      if (slug) {
        await load()
        await select(slug)
      } else {
        await load()
      }
    } else {
      const { data } = await http.patch(`/api/admin/assistant-articles/${encodeURIComponent(form.slug)}`, payload)
      const slug = data?.slug || form.slug
      await load()
      await select(slug)
    }
  } catch (e) {
    formError.value = e?.response?.data?.error || e?.message || 'Failed to save article'
  } finally {
    saving.value = false
  }
}

async function del() {
  if (!form.slug) return
  const ok = window.confirm(`Delete article "${form.title || form.slug}"? This cannot be undone.`)
  if (!ok) return
  saving.value = true
  formError.value = ''
  try {
    await http.delete(`/api/admin/assistant-articles/${encodeURIComponent(form.slug)}`)
    await load()
    newArticle()
  } catch (e) {
    formError.value = e?.response?.data?.error || e?.message || 'Failed to delete article'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  newArticle()
  load().catch(() => {})
})
</script>
