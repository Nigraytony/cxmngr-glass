<template>
  <div class="p-4 space-y-4 text-white">
    <div>
      <BreadCrumbs :items="crumbs" class="mt-1 text-white/70" />
    </div>

    <div class="w-full rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10">
      <!-- Tabs header -->
      <div class="mb-4 md:mb-6">
        <div role="tablist" class="relative flex items-center w-full">
          <!-- animated indicator -->
          <div class="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out" :style="{ left: tabLeft + '%', width: tabWidth + '%' }" />
          <button
            v-for="t in tabs"
            :key="t"
            @click="currentTab = t"
            :aria-selected="currentTab === t"
            role="tab"
            class="flex-1 text-center px-3 py-2 text-sm flex items-center justify-center gap-2"
            :class="currentTab === t ? 'text-white border-b-2 border-white rounded-t-md bg-white/6' : 'text-white/70 hover:text-white/90'"
          >
            <!-- Icons per tab -->
            <!-- Info -->
            <svg v-if="t === 'Info'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="9" stroke-width="1.5"/>
              <path d="M12 11v6" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M12 7h.01" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <!-- Photos -->
            <svg v-else-if="t === 'Photos'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke-width="1.5"/>
              <path d="M8 11l3 3 2-2 4 4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="8.5" cy="9.5" r="1.5" stroke-width="1.5"/>
            </svg>
            <!-- Issues -->
            <svg v-else-if="t === 'Issues'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3l9 16H3l9-16z" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M12 9v4" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M12 17h.01" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <!-- Comments -->
            <svg v-else-if="t === 'Comments'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.5-5A8 8 0 1 1 21 12z" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <!-- Attachments -->
            <svg v-else-if="t === 'Attachments'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 0 1-2.83-2.83l7.07-7.07" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <!-- Equipment Reviewed -->
            <svg v-else-if="t === 'Equipment Reviewed'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" stroke-width="1.5"/>
              <path d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15.98 19 1.7 1.7 0 0 0 15 20.5V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.51 1.7 1.7 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.27 17.4l.06-.06A1.7 1.7 0 0 0 2.66 15 1.7 1.7 0 0 0 1.15 14H1a2 2 0 1 1 0-4h.09c.6-.12 1.09-.57 1.37-1.17l.03-.06A1.7 1.7 0 0 0 2.6 7 1.7 1.7 0 0 0 2.27 5.18l-.06-.06A2 2 0 1 1 5.04 2.29l.06.06c.5.33 1.13.45 1.73.33H7a1.7 1.7 0 0 0 1-1.51V1a2 2 0 1 1 4 0v.09c.12.6.57 1.09 1.17 1.37l.06.03A2 2 0 1 1 19.73 3.6l-.06.06c-.33.5-.45 1.13-.33 1.73V6c.46.1.9.34 1.2.64.3.3.54.74.64 1.2H21a2 2 0 1 1 0 4h-.09c-.6.12-1.09.57-1.37 1.17l-.03.06z" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ t }}</span>
            <span v-if="countForTab(t) > 0" class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] leading-none text-white/80">{{ countForTab(t) }}</span>
          </button>
        </div>
      </div>

      <!-- Tab content -->
      <div>
        <!-- Info Tab -->
  <div v-if="currentTab === 'Info'" class="grid md:grid-cols-2 gap-x-4 gap-y-2 items-start">
          <div>
            <label class="block text-sm text-white/70">Name</label>
            <input v-model="form.name" type="text" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" placeholder="Activity name" />
          </div>

          <div class="md:row-span-4">
            <label class="block text-sm text-white/70">Description</label>
            <div class="rounded-md border border-white/20 bg-white/10">
              <QuillEditor v-model:content="form.descriptionHtml" theme="snow" contentType="html" class="rounded-md min-h-[24rem]" />
            </div>
          </div>

          <div>
            <label class="block text-sm text-white/70">Type</label>
            <select v-model="form.type" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20">
              <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-white/70">Start Date</label>
                <input v-model="form.startDate" type="date" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" />
              </div>
              <div>
                <label class="block text-sm text-white/70">End Date</label>
                <input v-model="form.endDate" type="date" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm text-white/70">Location</label>
            <input v-model="form.location" type="text" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" placeholder="Site / building / area" />
          </div>

          <div class="md:col-span-2">
            <div class="flex items-center gap-3 mt-2 justify-end md:justify-start">
              <button v-if="!isNew" @click="download()" :disabled="downloading" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2" :class="downloading ? 'opacity-60 cursor-not-allowed' : ''">
                <!-- PDF icon -->
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
                  <path d="M6 2h7l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke-width="1.5"/>
                  <path d="M13 2v6h6" stroke-width="1.5"/>
                  <path d="M7.5 16v-4h1.75a1.75 1.75 0 1 1 0 3.5H7.5z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13 12h2a2 2 0 0 1 0 4h-2v-4z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M19 12h-2.5v4H19" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Download PDF</span>
              </button>
              <button @click="save()" :disabled="saving" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2" :class="saving ? 'opacity-60 cursor-not-allowed' : ''">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
                  <path d="M5 13l4 4L19 7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Photos Tab -->
        <div v-else-if="currentTab === 'Photos'">
          <div>
            <label class="block text-sm text-white/70">Photos</label>
            <PhotoUploader
              :max-count="16"
              :existing-count="(current?.photos || []).length"
              button-label="Upload Photos"
              :upload="uploadPhoto"
              :concurrency="4"
              @done="finalizeNewActivityIfNeeded"
            />
            <div class="mt-2 flex flex-wrap gap-2">
              <div
                v-for="(p,idx) in (current?.photos || [])"
                :key="idx"
                class="relative group w-20 h-20 rounded-md overflow-hidden border border-white/20"
              >
                <!-- gradient overlay at bottom for contrast -->
                <div class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <button class="absolute bottom-1.5 right-1.5 z-10 h-7 w-7 grid place-items-center rounded-md bg-black/60 hover:bg-black/75 border border-white/20 text-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
                        title="Delete photo"
                        aria-label="Delete photo"
                        @click.stop="confirmRemove(idx)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
                    <path d="M3 6h18" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M8 6l1-2h6l1 2" stroke-width="1.5" stroke-linecap="round"/>
                    <rect x="6" y="6" width="12" height="14" rx="1.5" stroke-width="1.5"/>
                    <path d="M10 10v6M14 10v6" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
                <button class="relative w-full h-full focus:outline-none focus:ring-2 focus:ring-white/40" @click="openViewer(idx)">
                  <img :src="p.data" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Issues Tab -->
        <div v-else-if="currentTab === 'Issues'" class="space-y-3">
          <p class="text-white/80">Linked issues for this activity.</p>
          <ul class="list-disc list-inside text-white/80">
            <li v-if="!issuesForDisplay.length" class="text-white/60">No issues linked.</li>
            <li v-for="(iid, k) in issuesForDisplay" :key="k" class="truncate">{{ typeof iid === 'object' ? (iid.title || iid._id || iid.id) : iid }}</li>
          </ul>
          <div class="pt-2">
            <router-link to="/issues" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-block">Manage Issues</router-link>
          </div>
        </div>

        <!-- Comments Tab -->
        <div v-else-if="currentTab === 'Comments'" class="space-y-4">
          <div>
            <label class="block text-sm text-white/70 mb-1">Add a comment</label>
            <div class="flex items-start gap-3">
              <!-- current user avatar preview -->
              <div class="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                <img v-if="auth.user?.avatar || auth.user?.contact?.avatar" :src="auth.user?.avatar || auth.user?.contact?.avatar" class="w-full h-full object-cover" alt="avatar" />
                <span v-else class="text-xs">{{ initialsFromName((auth.user?.firstName || '') + ' ' + (auth.user?.lastName || '')) }}</span>
              </div>
              <textarea v-model="newComment" rows="3" class="flex-1 rounded-md p-2 bg-white/10 border border-white/20 placeholder-gray-400" placeholder="Write a comment..."></textarea>
              <button @click="addComment" class="h-10 px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30">Add</button>
            </div>
            <p class="text-xs text-white/60 mt-1">Comments are saved when you click Save in the Info tab.</p>
          </div>
          <div>
            <label class="block text-sm text-white/70 mb-1">Existing comments</label>
            <ul class="space-y-3">
              <li v-for="(c, i) in form.comments" :key="i" class="p-3 rounded-md bg-white/5 border border-white/10">
                <div class="flex items-start gap-3">
                  <div class="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                    <img v-if="c.avatar" :src="c.avatar" class="w-full h-full object-cover" alt="avatar" />
                    <span v-else class="text-xs">{{ initialsFromName(c.name) }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-medium text-white truncate">{{ displayName(c) }}</div>
                      <div class="text-xs text-white/60 whitespace-nowrap">{{ formatDateTime(c.createdAt) }}</div>
                    </div>
                    <div class="text-sm text-white/90 mt-1 whitespace-pre-line break-words">{{ c.text }}</div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Attachments Tab -->
        <div v-else-if="currentTab === 'Attachments'" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label class="block text-sm text-white/70">Filename</label>
              <input v-model="newAttachment.filename" type="text" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" placeholder="specs.pdf" />
            </div>
            <div>
              <label class="block text-sm text-white/70">URL</label>
              <input v-model="newAttachment.url" type="url" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" placeholder="https://..." />
            </div>
            <div class="flex items-center gap-2">
              <button @click="addAttachment" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30">Add</button>
            </div>
          </div>
          <div>
            <label class="block text-sm text-white/70 mb-1">Attachments</label>
            <div v-if="!form.attachments.length" class="text-white/60">No attachments added.</div>
            <ul class="space-y-2">
              <li v-for="(a, i) in form.attachments" :key="i" class="p-2 rounded-md bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div class="truncate">
                  <div class="text-sm">{{ a.filename || a.url }}</div>
                  <div class="text-xs text-white/60 truncate">{{ a.url }}</div>
                </div>
                <button @click="removeAttachment(i)" class="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Remove</button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Equipment Reviewed Tab -->
        <div v-else-if="currentTab === 'Equipment Reviewed'" class="space-y-2">
          <label class="block text-sm text-white/70">Systems (comma separated)</label>
          <input v-model="systemsText" type="text" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" placeholder="AHU-1, VAV-2, BAS" />
          <div class="text-xs text-white/60">These will be saved as individual system names on Save.</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <span v-for="(s, idx) in form.systems" :key="idx" class="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-xs">{{ s }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Photo Viewer Modal -->
  <Modal v-model="viewerOpen">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="font-medium">Photo {{ photos.length ? (viewerIndex + 1) : 0 }} / {{ photos.length }}</div>
        <div class="text-white/70 text-sm">Click outside or press Esc to close</div>
      </div>
    </template>
    <div class="flex items-center justify-center">
      <div
        v-if="photos.length"
        class="max-h-[70vh] max-w-full overflow-auto rounded-md border border-white/10 bg-black/20"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <img
          :src="photos[viewerIndex]?.data"
          class="block select-none"
          :style="{
            transform: `rotate(${rotation}deg) scale(${zoom})`,
            transformOrigin: 'center center'
          }"
          @dblclick.prevent="toggleZoom"
        />
        <!-- Photo meta -->
        <div class="p-3 border-t border-white/10 bg-black/30">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
              <img v-if="photos[viewerIndex]?.uploadedByAvatar" :src="photos[viewerIndex]?.uploadedByAvatar" class="w-full h-full object-cover" alt="avatar" />
              <span v-else class="text-[10px]">{{ initialsFromName(photos[viewerIndex]?.uploadedByName || '') }}</span>
            </div>
            <div class="text-xs text-white/80">
              <div class="font-medium text-white/90">{{ photos[viewerIndex]?.uploadedByName || 'Unknown' }}</div>
              <div class="text-white/60">Uploaded {{ formatDateTime(photos[viewerIndex]?.createdAt) }}</div>
            </div>
          </div>
          <!-- Caption editor -->
          <div class="mt-3 flex items-center gap-2">
            <input v-model="captionValue" type="text" placeholder="Add a caption..." class="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400" />
            <button @click="saveCaption" :disabled="savingCaption" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30" :class="savingCaption ? 'opacity-60 cursor-not-allowed' : ''">Save</button>
          </div>
        </div>
      </div>
      <div v-else class="text-white/70">No photos</div>
    </div>
    <template #footer>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button @click="prevPhoto" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Prev</button>
          <button @click="nextPhoto" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Next</button>
        </div>
        <div class="flex items-center gap-2">
          <button @click="zoomOut" :disabled="zoom <= 1" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50">Zoom -</button>
          <button @click="zoomIn" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Zoom +</button>
          <button @click="rotateRight" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Rotate</button>
          <button @click="deleteCurrentPhoto" class="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/40 hover:bg-red-500/30 text-red-200">Delete</button>
          <button @click="closeViewer" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30">Close</button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { onMounted, reactive, computed, ref, watch } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { useActivitiesStore } from '../../stores/activities'
import { useProjectStore } from '../../stores/project'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import PhotoUploader from '../../components/PhotoUploader.vue'
import { useUiStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { getAuthHeaders } from '../../utils/auth'
import { confirm as inlineConfirm } from '../../utils/confirm'

const route = useRoute()
const router = useRouter()
const store = useActivitiesStore()
const projectStore = useProjectStore()
const auth = useAuthStore()
const ui = useUiStore()

const id = computed(() => String(route.params.id))
const isNew = computed(() => id.value === 'new')
const saving = ref(false)
const downloading = ref(false)
// When creating a brand new activity via photo upload, hold the created id
const pendingCreatedId = ref<string | null>(null)

const types = [
  'Design Review', 'Submittal Review', 'Site Visit Review', 'Cx Meeting', 'Startup Review',
  'O&M Manual Review', 'Training Review', 'Schedule Integration', 'Test and Balance Review'
]

const current = computed(() => store.current)

const form = reactive({
  name: '',
  descriptionHtml: '',
  type: 'Site Visit Review',
  startDate: '',
  endDate: '',
  projectId: '',
  location: '',
  systems: [] as string[],
  comments: [] as any[],
  attachments: [] as any[],
})


const systemsText = ref('')
watch(systemsText, (v) => { form.systems = (v || '').split(',').map(s => s.trim()).filter(Boolean) })

const crumbs = computed(() => [
  { text: 'Dashboard', to: '/' },
  { text: 'Activities', to: '/activities' },
  { text: isNew.value ? 'New Activity' : (form.name || 'Edit Activity'), to: '#' }
])

onMounted(async () => {
  await projectStore.fetchProjects?.()?.catch(() => {})
  const pid = projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
  if (pid) form.projectId = String(pid)
  const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth()+1).padStart(2,'0'); const dd = String(today.getDate()).padStart(2,'0')
  form.startDate = `${yyyy}-${mm}-${dd}`; form.endDate = `${yyyy}-${mm}-${dd}`
  if (!isNew.value) {
    const a = await store.fetchActivity(id.value)
    Object.assign(form, {
      name: a?.name || '',
      descriptionHtml: a?.descriptionHtml || '',
      type: a?.type || 'Site Visit Review',
      startDate: a?.startDate ? a.startDate.substring(0,10) : form.startDate,
      endDate: a?.endDate ? a.endDate.substring(0,10) : form.endDate,
      projectId: a?.projectId || form.projectId,
      location: a?.location || '',
      systems: a?.systems || [],
      comments: a?.comments || [],
      attachments: a?.attachments || [],
    })
    systemsText.value = (form.systems || []).join(', ')
  }
})

async function save() {
  if (saving.value) return
  if (!form.name) {
    ui.showError('Name is required')
    return
  }
  if (!form.projectId) {
    ui.showError('Select a project')
    return
  }
  const payload = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() }
  try {
    saving.value = true
    if (isNew.value) {
      const created = await store.createActivity(payload)
      router.replace({ name: 'activity-edit', params: { id: created.id || created._id } })
    } else {
      await store.updateActivity(id.value, payload)
    }
    ui.showSuccess('Activity saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save activity')
  } finally {
    saving.value = false
  }
}

async function uploadPhoto(file: File, onProgress: (pct: number) => void) {
  if (!current.value && !isNew.value) await store.fetchActivity(id.value)
  let targetId = id.value
  if (isNew.value) {
    if (!pendingCreatedId.value) {
      // Create the activity without navigating yet to avoid unmount during batch
      const payload = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() }
      const created = await store.createActivity(payload)
      pendingCreatedId.value = String(created.id || created._id)
    }
    targetId = String(pendingCreatedId.value)
  }
  const fd = new FormData()
  fd.append('photos', file)
  const res = await axios.post(`http://localhost:4242/api/activities/${targetId}/photos`, fd, {
    headers: { ...getAuthHeaders() },
    onUploadProgress: (e: any) => {
      if (e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  await store.fetchActivity(targetId)
  return res.data
}

function finalizeNewActivityIfNeeded() {
  if (pendingCreatedId.value && isNew.value) {
    const nid = pendingCreatedId.value
    pendingCreatedId.value = null
    // navigate to the new id once the batch is done
    router.replace({ name: 'activity-edit', params: { id: nid } })
  }
}

async function saveAndGetId(): Promise<string> {
  if (!isNew.value) return id.value
  const created = await store.createActivity({ ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() })
  router.replace({ name: 'activity-edit', params: { id: created.id || created._id } })
  return String(created.id || created._id)
}

async function download() {
  if (!id.value || isNew.value || downloading.value) return
  try {
    downloading.value = true
    await store.downloadReport(id.value)
  } finally {
    downloading.value = false
  }
}

// Tabs logic
const tabs = ['Info', 'Photos', 'Issues', 'Comments', 'Attachments', 'Equipment Reviewed']
const currentTab = ref('Info')
const activeIndex = computed(() => {
  const i = tabs.indexOf(currentTab.value)
  return i >= 0 ? i : 0
})
const tabLeft = computed(() => (activeIndex.value * 100) / tabs.length)
const tabWidth = computed(() => 100 / tabs.length)

// Comments helpers
const newComment = ref('')
function addComment() {
  const txt = (newComment.value || '').trim()
  if (!txt) return
  const name = `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim() || (auth.user?.email || 'Anonymous')
  const avatar = auth.user?.avatar || auth.user?.contact?.avatar || ''
  form.comments.push({ userId: auth.user?._id || auth.user?.id, name, avatar, text: txt, createdAt: new Date().toISOString() })
  newComment.value = ''
}

function formatDateTime(d?: any) {
  if (!d) return ''
  try { return new Date(d).toLocaleString() } catch { return String(d) }
}

function displayName(c: any) {
  return (c && (c.name || '')) || 'Anonymous'
}

function initialsFromName(n?: string) {
  if (!n) return '?'
  const parts = n.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const last = (parts.length > 1 ? parts[parts.length - 1][0] : '') || ''
  return (first + last).toUpperCase() || '?'
}

// Attachments helpers
const newAttachment = reactive({ filename: '', url: '', type: '' })
function addAttachment() {
  if (!newAttachment.url) return
  form.attachments.push({ filename: newAttachment.filename || newAttachment.url, url: newAttachment.url, type: newAttachment.type || 'link' })
  newAttachment.filename = ''
  newAttachment.url = ''
  newAttachment.type = ''
}
function removeAttachment(i: number) {
  form.attachments.splice(i, 1)
}

// Issues display helper to satisfy TS in template
const issuesForDisplay = computed(() => {
  const arr = (current.value && (current.value as any).issues) ? ((current.value as any).issues as any[]) : []
  return Array.isArray(arr) ? arr : []
})

// Counts per tab for badges
function countForTab(t: string): number {
  if (t === 'Photos') return (current.value?.photos || []).length
  if (t === 'Issues') return issuesForDisplay.value.length
  if (t === 'Comments') return (form.comments || []).length
  if (t === 'Attachments') return (form.attachments || []).length
  return 0
}

// Photo viewer modal
const viewerOpen = ref(false)
const viewerIndex = ref(0)
const photos = computed(() => (current.value?.photos || []))
// viewer transform state
const zoom = ref(1)
const rotation = ref(0)
const captionValue = ref('')
const savingCaption = ref(false)
function openViewer(i: number) {
  viewerIndex.value = i
  viewerOpen.value = true
}
function closeViewer() { viewerOpen.value = false; zoom.value = 1; rotation.value = 0 }
function nextPhoto() { if (photos.value.length) viewerIndex.value = (viewerIndex.value + 1) % photos.value.length }
function prevPhoto() { if (photos.value.length) viewerIndex.value = (viewerIndex.value - 1 + photos.value.length) % photos.value.length }

function zoomIn() { zoom.value = Math.min(zoom.value + 0.25, 4) }
function zoomOut() { zoom.value = Math.max(1, zoom.value - 0.25) }
function toggleZoom() { zoom.value = zoom.value > 1 ? 1 : 2 }
function rotateRight() { rotation.value = (rotation.value + 90) % 360 }

// swipe navigation (basic)
let touchStartX = 0
let touchStartTime = 0
function onTouchStart(e: TouchEvent) {
  const t = e.changedTouches[0]
  touchStartX = t.clientX
  touchStartTime = Date.now()
}
function onTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0]
  const dx = t.clientX - touchStartX
  const dt = Date.now() - touchStartTime
  if (Math.abs(dx) > 50 && dt < 600) {
    if (dx < 0) nextPhoto(); else prevPhoto()
  }
}

async function removePhotoAt(idx: number) {
  try {
    const aid = isNew.value ? (pendingCreatedId.value || id.value) : id.value
    if (!aid) return
    await store.removePhoto(String(aid), idx)
    await store.fetchActivity(String(aid))
    ui.showSuccess('Photo removed')
    // If deleting the current viewed photo, adjust index
    if (viewerOpen.value) {
      const len = photos.value.length
      if (len === 0) { viewerOpen.value = false } else if (viewerIndex.value >= len) { viewerIndex.value = Math.max(0, len - 1) }
    }
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove photo')
  }
}

async function deleteCurrentPhoto() {
  if (!photos.value.length) return
  const idx = viewerIndex.value
  // Yield a tick to avoid nested modal focus/stacking glitches
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({ title: 'Delete photo', message: 'Delete this photo? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!confirmed) return
  await removePhotoAt(idx)
}

async function confirmRemove(idx: number) {
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({ title: 'Delete photo', message: 'Delete this photo? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!confirmed) return
  await removePhotoAt(idx)
}

// Keep caption input in sync when navigating
watch([viewerIndex, photos, viewerOpen], () => {
  if (!viewerOpen.value || !photos.value.length) { captionValue.value = ''; return }
  const p: any = photos.value[viewerIndex.value] || {}
  captionValue.value = p.caption || ''
})

async function saveCaption() {
  if (!photos.value.length) return
  const aid = isNew.value ? (pendingCreatedId.value || id.value) : id.value
  if (!aid) return
  try {
    savingCaption.value = true
    const caption = captionValue.value || ''
    const s: any = store as any
    if (typeof s.updatePhotoCaption === 'function') {
      await s.updatePhotoCaption(String(aid), viewerIndex.value, caption)
    } else {
      // Fallback: call API directly if store method isn't present yet (HMR race)
      await axios.patch(`http://localhost:4242/api/activities/${String(aid)}/photos/${viewerIndex.value}`, { caption }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
    }
    await store.fetchActivity(String(aid))
    ui.showSuccess('Caption saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save caption')
  } finally {
    savingCaption.value = false
  }
}

// (Diagnostic testConfirm removed)

// Keyboard navigation for viewer
function onKey(e: KeyboardEvent) {
  if (!viewerOpen.value) return
  if (e.key === 'ArrowRight') { e.preventDefault(); nextPhoto() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prevPhoto() }
}
onMounted(() => window.addEventListener('keydown', onKey))
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
/* Glassy theme for Quill to match other inputs */
:deep(.ql-toolbar.ql-snow) {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}
:deep(.ql-container.ql-snow) {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  min-height: 22rem;
}
:deep(.ql-editor) {
  color: #fff;
}
:deep(.ql-editor.ql-blank::before) {
  /* Tailwind gray-400 for better readability on glass background */
  color: #9CA3AF;
}
/* Quill icons (strokes/fills) */
:deep(.ql-snow .ql-stroke) {
  stroke: rgba(255, 255, 255, 0.9);
}
:deep(.ql-snow .ql-fill),
:deep(.ql-snow .ql-stroke.ql-fill) {
  fill: rgba(255, 255, 255, 0.9);
}
:deep(.ql-picker),
:deep(.ql-picker-label),
:deep(.ql-picker-item) {
  color: rgba(255, 255, 255, 0.9);
}
/* Darken hover/active backgrounds so white icons/text remain visible */
:deep(.ql-snow .ql-toolbar button:hover),
:deep(.ql-snow .ql-toolbar button:focus),
:deep(.ql-snow .ql-toolbar button.ql-active),
:deep(.ql-snow .ql-picker-label:hover),
:deep(.ql-snow .ql-picker-label:focus),
:deep(.ql-snow .ql-picker-label.ql-active),
:deep(.ql-snow .ql-picker-item:hover),
:deep(.ql-snow .ql-picker-item.ql-selected) {
  background-color: rgba(0, 0, 0, 0.28);
  color: #fff;
}
/* Dark picker dropdown panel to avoid white-on-white */
:deep(.ql-snow .ql-picker-options) {
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}
/* Tooltip (links, etc.) */
:deep(.ql-tooltip) {
  background-color: rgba(0, 0, 0, 0.9);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Placeholder color for inputs and textareas to improve contrast */
:deep(input::placeholder),
:deep(textarea::placeholder) {
  /* Tailwind gray-400 */
  color: #9CA3AF;
  opacity: 1; /* ensure full opacity */
}
</style>
