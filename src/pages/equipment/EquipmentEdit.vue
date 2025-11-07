<template>
  <section class="space-y-4 text-white">
    <div>
      <BreadCrumbs :items="crumbs" />
    </div>

    <div class="w-full rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10">
      <!-- Tabs header -->
      <div class="mb-4 md:mb-6">
        <div role="tablist" class="relative flex items-center w-full">
          <div class="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out" :style="{ left: tabLeft + '%', width: tabWidth + '%' }" />
          <button v-for="t in tabs" :key="t" @click="currentTab = t" :aria-selected="currentTab === t" role="tab" class="flex-1 text-center px-3 py-2 text-sm flex items-center justify-center gap-2" :class="currentTab === t ? 'text-white border-b-2 border-white rounded-t-md bg-white/6' : 'text-white/70 hover:text-white/90'">
            <svg v-if="t === 'Info'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="1.5"/><path d="M12 11v6" stroke-width="1.5" stroke-linecap="round"/><path d="M12 7h.01" stroke-width="2" stroke-linecap="round"/></svg>
            <svg v-else-if="t === 'Photos'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke-width="1.5"/><path d="M8 11l3 3 2-2 4 4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="9.5" r="1.5" stroke-width="1.5"/></svg>
            <svg v-else-if="t === 'Attachments'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 0 1-2.83-2.83l7.07-7.07" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <svg v-else-if="t === 'Checklists'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-width="1.5"/></svg>
            <svg v-else-if="t === 'FPT'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 6v6l4 2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke-width="1.5"/></svg>
            <svg v-else-if="t === 'Issues'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l9 16H3l9-16z" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 9v4" stroke-width="1.5" stroke-linecap="round"/><path d="M12 17h.01" stroke-width="2" stroke-linecap="round"/></svg>
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
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-white/70">Tag</label>
                <input v-model="form.tag" type="text" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20" />
              </div>
              <div>
                <label class="block text-sm text-white/70">Type</label>
                <div class="relative">
                  <select v-model="form.type" class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none">
                    <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.text }}</option>
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"><path d="M6 9l6 6 6-6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Title</label>
              <input v-model="form.title" type="text" required class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20" />
            </div>
            <div class="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-white/70">System</label>
                <div class="relative">
                  <select v-model="form.system" class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none">
                    <option v-for="opt in systemSelectOptions" :key="opt.value" :value="opt.value">{{ opt.text }}</option>
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"><path d="M6 9l6 6 6-6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
              <div>
                <label class="block text-sm text-white/70">Status</label>
                <div class="relative">
                  <select v-model="form.status" class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none">
                    <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"><path d="M6 9l6 6 6-6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Space</label>
              <div class="relative">
                <select v-model="form.spaceId" class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none">
                  <option :value="''">None</option>
                  <option v-for="p in parentOptions" :key="p.id" :value="p.id">{{ p.title }} ({{ p.type }})</option>
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"><path d="M6 9l6 6 6-6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Description</label>
              <textarea v-model="form.description" rows="4" class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"></textarea>
            </div>
            <div class="mt-4 flex items-center gap-2">
              <button @click="save" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M5 13l4 4L19 7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span>Save</span>
              </button>
              <button @click="onDelete" class="px-3 py-2 rounded-md bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 inline-flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M3 6h18" stroke-width="1.5" stroke-linecap="round"/><path d="M8 6l1-2h6l1 2" stroke-width="1.5" stroke-linecap="round"/><rect x="6" y="6" width="12" height="14" rx="1.5" stroke-width="1.5"/><path d="M10 10v6M14 10v6" stroke-width="1.5" stroke-linecap="round"/></svg><span>Delete</span></button>
            </div>
          </div>
          <div>
            <div class="text-white/70 text-sm mb-2">Attributes</div>
            <!-- Existing attributes list -->
            <div v-if="!currentAttributes.length" class="text-white/60 mb-2">No attributes yet.</div>
            <ul v-else class="space-y-1.5 mb-3">
              <li v-for="(a, i) in currentAttributes" :key="i" class="p-1 rounded bg-white/5 border border-white/10 flex items-center gap-1.5">
                <template v-if="editingIndex === i">
                  <input v-model="editKey" @keyup.enter="saveEdit(i)" placeholder="Key" class="px-2 py-1 rounded bg-white/10 border border-white/20 flex-1 placeholder-gray-400 min-w-0" />
                  <input v-model="editValue" @keyup.enter="saveEdit(i)" placeholder="Value" class="px-2 py-1 rounded bg-white/10 border border-white/20 flex-1 placeholder-gray-400 min-w-0" />
                  <button @click="saveEdit(i)" class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15" title="Save" aria-label="Save">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M5 13l4 4L19 7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                  <button @click="cancelEdit" class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15" title="Cancel" aria-label="Cancel">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M6 6l12 12M18 6L6 18" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </template>
                <template v-else>
                  <div class="truncate flex-1">
                    <span class="text-white/80">{{ a.key }}</span>
                    <span class="text-white/50">: </span>
                    <span class="text-white/90">{{ a.value }}</span>
                  </div>
                  <button @click="startEdit(i)" class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15" title="Edit" aria-label="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M12 20h9" stroke-width="1.5" stroke-linecap="round"/><path d="M16.5 3.5l4 4-10 10H6.5v-4.5l10-10z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                  <button @click="removeAttr(i)" class="h-7 w-7 grid place-items-center rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30" title="Delete" aria-label="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M3 6h18" stroke-width="1.5" stroke-linecap="round"/><path d="M8 6l1-2h6l1 2" stroke-width="1.5" stroke-linecap="round"/><rect x="6" y="6" width="12" height="14" rx="1.5" stroke-width="1.5"/><path d="M10 10v6M14 10v6" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </template>
              </li>
            </ul>

            <!-- Add new attribute row -->
            <div class="flex items-center gap-2">
              <input v-model="newAttrKey" @keyup.enter="addAttr" placeholder="Key" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 flex-1 min-w-0" />
              <input v-model="newAttrValue" @keyup.enter="addAttr" placeholder="Value" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 flex-1 min-w-0" />
              <button @click="addAttr" class="h-10 w-10 grid place-items-center rounded-full bg-white/20 border border-white/30 hover:bg-white/30 shrink-0" title="Add" aria-label="Add">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-5 h-5"><path d="M12 5v14M5 12h14" stroke-width="1.8" stroke-linecap="round"/></svg>
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
              :existing-count="photos.length"
              button-label="Upload Photos"
              :upload="uploadPhoto"
              :concurrency="4"
            />
            <div class="mt-2 flex flex-wrap gap-2">
              <div
                v-for="(p,idx) in photos"
                :key="idx"
                class="relative group w-20 h-20 rounded-md overflow-hidden border border-white/20"
              >
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

        <!-- Attachments Tab -->
        <div v-else-if="currentTab === 'Attachments'" class="space-y-4">
          <div>
            <label class="block text-sm text-white/70">Upload files</label>
            <DocumentUploader
              button-label="Upload Files"
              :upload="uploadDocument"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/*,application/zip"
              :multiple="true"
              :concurrency="3"
            />
            <div class="mt-2 text-xs text-white/60">Accepted: PDF, Word, Excel, PowerPoint, CSV, TXT, images, and ZIP. Max ~10MB per file.</div>
          </div>
          <!-- Manual link add (optional) -->
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
            <div v-if="!((form as any).attachments && (form as any).attachments.length)" class="text-white/60">No attachments added.</div>
            <ul v-else class="space-y-2">
              <li v-for="(a, i) in (form as any).attachments" :key="i" class="p-2 rounded-md bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div class="flex items-start gap-3 min-w-0">
                  <!-- Type icon (click to open viewer) -->
                  <button class="w-7 h-7 grid place-items-center rounded-md bg-white/10 border border-white/20 shrink-0 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30" @click="openAttachment(i)" title="Preview">
                    <!-- PDF -->
                    <svg v-if="attachmentKind(a) === 'pdf'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 text-red-300">
                      <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke-width="1.5"/>
                      <path d="M13 2v6h6" stroke-width="1.5"/>
                    </svg>
                    <!-- Sheet -->
                    <svg v-else-if="attachmentKind(a) === 'sheet'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 text-green-300">
                      <rect x="3" y="4" width="18" height="16" rx="2" stroke-width="1.5"/>
                      <path d="M3 9h18M8 4v16M14 4v16" stroke-width="1.5"/>
                    </svg>
                    <!-- Word/Text -->
                    <svg v-else-if="attachmentKind(a) === 'word' || attachmentKind(a) === 'txt'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4" :class="attachmentKind(a) === 'word' ? 'text-blue-300' : 'text-gray-300'">
                      <rect x="4" y="4" width="16" height="16" rx="2" stroke-width="1.5"/>
                      <path d="M7 9h10M7 12h10M7 15h7" stroke-width="1.5"/>
                    </svg>
                    <!-- PowerPoint -->
                    <svg v-else-if="attachmentKind(a) === 'ppt'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 text-orange-300">
                      <circle cx="12" cy="12" r="9" stroke-width="1.5"/>
                      <path d="M12 12h6a6 6 0 0 0-6-6v6z" stroke-width="1.5"/>
                    </svg>
                    <!-- Image -->
                    <svg v-else-if="attachmentKind(a) === 'image'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 text-purple-300">
                      <rect x="3" y="5" width="18" height="14" rx="2" ry="2" stroke-width="1.5"/>
                      <path d="M8 13l3-3 5 6" stroke-width="1.5"/>
                      <circle cx="8" cy="9" r="1.5" stroke-width="1.5"/>
                    </svg>
                    <!-- Zip -->
                    <svg v-else-if="attachmentKind(a) === 'zip'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 text-yellow-300">
                      <rect x="5" y="3" width="14" height="18" rx="2" stroke-width="1.5"/>
                      <path d="M12 4v3m0 2v3m0 2v3" stroke-width="1.5"/>
                    </svg>
                    <!-- Link -->
                    <svg v-else-if="attachmentKind(a) === 'link'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 text-indigo-300">
                      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" stroke-width="1.5"/>
                      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" stroke-width="1.5"/>
                    </svg>
                    <!-- Generic file -->
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4 text-white/70">
                      <rect x="4" y="3" width="16" height="18" rx="2" stroke-width="1.5"/>
                      <path d="M8 7h8M8 11h8M8 15h6" stroke-width="1.5"/>
                    </svg>
                  </button>
                  <div class="min-w-0">
                    <div class="truncate text-sm">{{ a.filename || fileNameFromUrl(a.url) }}</div>
                    <div class="text-xs text-white/60 truncate">{{ a.url }}</div>
                    <div v-if="attachmentMeta(a)" class="text-xs text-white/50 mt-0.5">{{ attachmentMeta(a) }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="openAttachment(i)" class="h-8 px-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm">Preview</button>
                  <button @click="removeAttachment(i)" class="h-8 w-8 grid place-items-center rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30" title="Remove" aria-label="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M3 6h18" stroke-width="1.5" stroke-linecap="round"/><path d="M8 6l1-2h6l1 2" stroke-width="1.5" stroke-linecap="round"/><rect x="6" y="6" width="12" height="14" rx="1.5" stroke-width="1.5"/><path d="M10 10v6M14 10v6" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Components Tab -->
        <div v-else-if="currentTab === 'Components'" class="space-y-3">
          <ComponentsPanel
            v-model="components"
            :statuses="statuses"
            :project-id="String(form.projectId || projectStore.currentProjectId || '')"
            :asset-id="String(form.id || (form as any)._id || id)"
            :asset-tag="String(form.tag || '')"
            :asset-system="String(form.system || '')"
            @change="onComponentsChange"
          />
        </div>
        
        <!-- Checklists Tab -->
        <div v-else-if="currentTab === 'Checklists'" class="space-y-3">
          <ChecklistPanel
            v-model="checklists"
            :project-id="String(form.projectId || projectStore.currentProjectId || '')"
            :equipment-id="String(form.id || (form as any)._id || id)"
            :equipment-tag="String(form.tag || '')"
            @change="onChecklistsChange"
          />
        </div>

        <!-- FPT Tab -->
        <div v-else-if="currentTab === 'FPT'" class="space-y-3">
          <FunctionalTestsPanel
            v-model="functionalTests"
            :project-id="String(form.projectId || projectStore.currentProjectId || '')"
            :equipment-id="String(form.id || (form as any)._id || id)"
            :equipment-tag="String(form.tag || '')"
            @change="onFunctionalTestsChange"
            @save="onFunctionalTestsSave"
          />
        </div>
        <!-- Issues Tab -->
        <div v-else-if="currentTab === 'Issues'" class="space-y-4">
          <!-- Equipment-related issues -->
          <div>
            <h4 class="text-sm font-medium text-white/90 mb-2">Equipment-related</h4>
            <IssuesTable :issues="issuesForEquipment" />
          </div>

          

          <div class="pt-2">
            <RouterLink to="/issues" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-block">Manage Issues</RouterLink>
          </div>
        </div>
      </div>

  <!-- Bottom navigation: Report actions + Previous/Next across equipment -->
  <div class="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 sticky bottom-0 z-20 bg-white/6 backdrop-blur-xl">
        <div class="flex items-center gap-2">
          <button v-if="prevEquipmentId" @click="goPrev" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M15 6l-6 6 6 6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Previous</span>
          </button>
        </div>
        <div class="flex-1 text-center text-xs text-white/60">
          <span v-if="positionText">{{ positionText }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button @click="showReportDialog = true" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2" title="Report settings">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.297.07 2.573-1.065z" stroke-width="1.5"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-width="1.5"/></svg>
            <span>Report Settings</span>
          </button>
          <button @click="downloadEquipmentPdf" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2" title="Download PDF report">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M12 3v11" stroke-width="1.5" stroke-linecap="round"/><path d="M8 11l4 4 4-4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="18" width="16" height="2" rx="1" stroke-width="1.5"/></svg>
            <span>Download PDF</span>
          </button>
          <button v-if="nextEquipmentId" @click="goNext" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2">
            <span>Next</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4"><path d="M9 6l6 6-6 6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Report Settings Modal -->
    <Modal v-model="showReportDialog">
      <template #header>
        <div class="flex items-center justify-between w-full"><div class="text-lg">Equipment Report Settings</div></div>
      </template>
      <div class="space-y-4 text-white/90">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="report.include.info" class="accent-emerald-400"/> <span>Info</span></label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="report.include.attributes" class="accent-emerald-400"/> <span>Attributes</span></label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="report.include.components" class="accent-emerald-400"/> <span>Components</span></label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="report.include.photos" class="accent-emerald-400"/> <span>Photos</span></label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="report.include.attachments" class="accent-emerald-400"/> <span>Attachments</span></label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="report.include.checklists" class="accent-emerald-400"/> <span>Checklists</span></label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="report.include.fpt" class="accent-emerald-400"/> <span>Functional Tests</span></label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="report.include.issues" class="accent-emerald-400"/> <span>Issues</span></label>
        </div>
        <div class="flex items-center gap-3">
          <label class="text-white/70 text-sm">Max photos</label>
          <input type="number" min="0" max="12" v-model.number="report.photoLimit" class="w-24 px-2 py-1 rounded-md bg-white/10 border border-white/20" />
          <span class="text-xs text-white/60">Only the first {{ report.photoLimit }} will be included</span>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-between w-full">
          <button @click="resetReportSettings" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Reset</button>
          <div class="flex items-center gap-2">
            <button @click="showReportDialog = false" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Close</button>
            <button @click="saveReportSettings" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30">Save</button>
          </div>
        </div>
      </template>
    </Modal>

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
          :style="{ transform: `rotate(${rotation}deg) scale(${zoom})`, transformOrigin: 'center center' }"
          @dblclick.prevent="toggleZoom"
        />
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

    <!-- Attachment Viewer Modal -->
    <Modal
      v-model="attachmentViewerOpen"
      :panel-class="attachmentFullscreen ? 'max-w-none w-screen h-[92vh]' : 'max-w-5xl w-[90vw]'"
      :main-class="attachmentFullscreen ? 'overflow-hidden h-full' : 'overflow-hidden'"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex flex-col max-w-[65vw]">
            <div class="font-medium truncate">{{ selectedAttachment?.filename || fileNameFromUrl(selectedAttachment?.url) }}</div>
            <div v-if="selectedAttachment && attachmentMeta(selectedAttachment)" class="text-xs text-white/60 truncate">{{ attachmentMeta(selectedAttachment) }}</div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="attachmentFullscreen = !attachmentFullscreen" class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm inline-flex items-center gap-1" :title="attachmentFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'">
              <svg v-if="!attachmentFullscreen" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
                <path d="M4 9V4h5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M20 9V4h-5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4 15v5h5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M20 15v5h-5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
                <path d="M4 4l5 5" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20 4l-5 5" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M4 20l5-5" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M20 20l-5-5" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>{{ attachmentFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
            </button>
            <button v-if="selectedAttachmentUrl" @click="openInNewTab(selectedAttachmentUrl)" class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm">Open in new tab</button>
            <button v-if="selectedAttachment" @click="downloadAttachment(selectedAttachment)" class="px-3 py-1.5 rounded-md bg-indigo-500/20 border-2 border-indigo-400/70 text-indigo-100 hover:bg-indigo-500/40 hover:border-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 text-sm transition-colors duration-150">Download</button>
          </div>
        </div>
      </template>
      <div class="w-full overflow-auto" :style="{ maxHeight: viewerMaxH }">
        <div v-if="selectedKind === 'image'" class="w-full h-full">
          <img :src="selectedAttachmentUrl" class="max-w-full object-contain block mx-auto" :style="{ maxHeight: viewerInnerH }" />
        </div>
        <div v-else-if="selectedKind === 'pdf'" class="w-full">
          <iframe :src="selectedAttachmentUrl" class="w-full rounded-md border border-white/10 bg-black/10" :style="{ height: viewerInnerH }"></iframe>
        </div>
        <div v-else class="p-4 text-white/80 space-y-3">
          <div>Preview not available for this file type.</div>
          <div class="flex items-center gap-2">
            <button v-if="selectedAttachmentUrl" @click="openInNewTab(selectedAttachmentUrl)" class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15">Open in new tab</button>
            <button v-if="selectedAttachment" @click="downloadAttachment(selectedAttachment)" class="px-3 py-2 rounded-md bg-indigo-500/20 border-2 border-indigo-400/70 text-indigo-100 hover:bg-indigo-500/40 hover:border-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-colors duration-150">Download</button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end">
          <button @click="attachmentViewerOpen = false" class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30">Close</button>
        </div>
      </template>
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import PhotoUploader from '../../components/PhotoUploader.vue'
import ChecklistPanel from '../../components/ChecklistPanel.vue'
import FunctionalTestsPanel from '../../components/FunctionalTestsPanel.vue'
import DocumentUploader from '../../components/DocumentUploader.vue'
import ComponentsPanel from '../../components/ComponentsPanel.vue'
import IssuesTable from '../../components/IssuesTable.vue'
import axios from 'axios'
import { useProjectStore } from '../../stores/project'
import { useSpacesStore } from '../../stores/spaces'
import { useEquipmentStore, type Equipment } from '../../stores/equipment'
import { useUiStore } from '../../stores/ui'
import { useIssuesStore } from '../../stores/issues'
import lists from '../../lists.js'
import http from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'
import { confirm as inlineConfirm } from '../../utils/confirm'
import { jsPDF } from 'jspdf'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))

const projectStore = useProjectStore()
const spacesStore = useSpacesStore()
const equipmentStore = useEquipmentStore()
const ui = useUiStore()

const statuses = ['Not Started', 'Ordered','Shipped','In Storage','Installed','Tested','Operational','Not Working','Has Issues','Decommissioned']

const form = ref<Equipment>({ tag: '', title: '', type: '', system: '', status: 'Not Started', description: '', projectId: '', attachments: [], images: [], attributes: [] as any })
const loading = ref(true)

const crumbs = computed(() => [
  { text: 'Dashboard', to: '/' },
  { text: 'Equipment', to: '/equipment' },
  { text: eqTitle.value || 'Edit', to: `/equipment/${id.value}` }
])

const eqTitle = computed(() => (form.value?.tag || form.value?.title || ''))
const parentOptions = computed(() => spacesStore.items)

// tabs state
const tabs = ['Info', 'Components', 'Photos', 'Attachments', 'Checklists', 'FPT', 'Issues']
const currentTab = ref('Info')
const tabIndex = computed(() => Math.max(0, tabs.indexOf(currentTab.value)))
const tabWidth = computed(() => 100 / tabs.length)
const tabLeft = computed(() => tabIndex.value * tabWidth.value)

// Respect optional route query ?tab=... to preselect a tab (e.g., after duplication)
function setTabFromQuery() {
  const q = String((route.query as any)?.tab || '')
  if (q && tabs.includes(q)) currentTab.value = q as any
}
// Initialize and react to query changes
onMounted(() => setTabFromQuery())
watch(() => route.query, () => setTabFromQuery())

const systemSelectOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.systemOptions || []
  return arr
    .filter((opt: any) => opt && (opt.value !== undefined))
    .map((opt: any) => ({ value: opt.value === null ? '' : String(opt.value), text: String(opt.text ?? opt.value) }))
})

const typeOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.equipmentTypes || []
  return arr.filter((opt: any) => opt && opt.value).map((opt: any) => ({ value: String(opt.value), text: String(opt.text ?? opt.value) }))
})

// Ordered equipment for navigation (same project), sorted by tag then title
const projectIdForNav = computed(() => String(form.value.projectId || projectStore.currentProjectId || ''))
function norm(s: any) { return String(s || '').toLowerCase() }
const orderedEquipment = computed(() => {
  const pid = projectIdForNav.value
  const list = (equipmentStore.items || []).filter((e: any) => String(e.projectId || '') === pid)
  return list.slice().sort((a: any, b: any) => {
    const at = norm(a.tag); const bt = norm(b.tag)
    if (at && bt && at !== bt) return at < bt ? -1 : 1
    const atitle = norm(a.title); const btitle = norm(b.title)
    if (atitle !== btitle) return atitle < btitle ? -1 : 1
    const aid = String(a.id || a._id || '')
    const bid = String(b.id || b._id || '')
    return aid < bid ? -1 : (aid > bid ? 1 : 0)
  })
})
const currentIndex = computed(() => {
  const curId = String(id.value || '')
  return orderedEquipment.value.findIndex((e: any) => String(e.id || e._id || '') === curId)
})
const prevEquipmentId = computed<string | null>(() => {
  const idx = currentIndex.value
  if (idx > 0) {
    const e = orderedEquipment.value[idx - 1]
    return String(e.id || e._id || '')
  }
  return null
})
const nextEquipmentId = computed<string | null>(() => {
  const idx = currentIndex.value
  if (idx !== -1 && idx < orderedEquipment.value.length - 1) {
    const e = orderedEquipment.value[idx + 1]
    return String(e.id || e._id || '')
  }
  return null
})
const positionText = computed(() => {
  const total = orderedEquipment.value.length
  const idx = currentIndex.value
  if (total && idx >= 0) return `${idx + 1} of ${total}`
  return ''
})
function goPrev() {
  if (!prevEquipmentId.value) return
  router.push({ name: 'equipment-edit', params: { id: prevEquipmentId.value } })
}
function goNext() {
  if (!nextEquipmentId.value) return
  router.push({ name: 'equipment-edit', params: { id: nextEquipmentId.value } })
}

// Photos (upload + viewer) — mirrored from ActivityEdit.vue
const photos = computed<any[]>(() => {
  const arr: any = (form.value as any).photos
  return Array.isArray(arr) ? arr : []
})
async function uploadPhoto(file: File, onProgress: (pct: number) => void) {
  const eid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!eid) throw new Error('Missing equipment id')
  const fd = new FormData()
  fd.append('photos', file)
  const res = await http.post(`/api/equipment/${eid}/photos`, fd, {
    headers: { ...getAuthHeaders() },
    onUploadProgress: (e: any) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)) }
  })
  const fresh = await equipmentStore.fetchOne(eid)
  if (fresh) form.value = { ...fresh }
  return res.data
}
async function removePhotoAt(idx: number) {
  try {
    const eid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!eid) return
    await http.delete(`/api/equipment/${eid}/photos/${idx}`, { headers: { ...getAuthHeaders() } })
    const fresh = await equipmentStore.fetchOne(eid)
    if (fresh) form.value = { ...fresh }
    ui.showSuccess('Photo removed')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove photo')
  }
}
async function confirmRemove(idx: number) {
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({ title: 'Delete photo', message: 'Delete this photo? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!confirmed) return
  await removePhotoAt(idx)
}
// Photo viewer modal
const viewerOpen = ref(false)
const viewerIndex = ref(0)
const zoom = ref(1)
const rotation = ref(0)
const captionValue = ref('')
const savingCaption = ref(false)
function openViewer(i: number) { viewerIndex.value = i; viewerOpen.value = true }
function closeViewer() { viewerOpen.value = false; zoom.value = 1; rotation.value = 0 }
function nextPhoto() { if (photos.value.length) viewerIndex.value = (viewerIndex.value + 1) % photos.value.length }
function prevPhoto() { if (photos.value.length) viewerIndex.value = (viewerIndex.value - 1 + photos.value.length) % photos.value.length }
function zoomIn() { zoom.value = Math.min(zoom.value + 0.25, 4) }
function zoomOut() { zoom.value = Math.max(1, zoom.value - 0.25) }
function toggleZoom() { zoom.value = zoom.value > 1 ? 1 : 2 }
function rotateRight() { rotation.value = (rotation.value + 90) % 360 }
let touchStartX = 0
let touchStartTime = 0
function onTouchStart(e: TouchEvent) { const t = e.changedTouches[0]; touchStartX = t.clientX; touchStartTime = Date.now() }
function onTouchEnd(e: TouchEvent) { const t = e.changedTouches[0]; const dx = t.clientX - touchStartX; const dt = Date.now() - touchStartTime; if (Math.abs(dx) > 50 && dt < 600) { if (dx < 0) nextPhoto(); else prevPhoto() } }
watch([viewerIndex, photos, viewerOpen], () => { if (!viewerOpen.value || !photos.value.length) { captionValue.value = ''; return } const p: any = photos.value[viewerIndex.value] || {}; captionValue.value = p.caption || '' })
async function saveCaption() {
  if (!photos.value.length) return
  const eid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!eid) return
  try {
    savingCaption.value = true
    const caption = captionValue.value || ''
    await http.patch(`/api/equipment/${eid}/photos/${viewerIndex.value}`, { caption }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
    const fresh = await equipmentStore.fetchOne(eid)
    if (fresh) form.value = { ...fresh }
    ui.showSuccess('Caption saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save caption')
  } finally {
    savingCaption.value = false
  }
}
function onKey(e: KeyboardEvent) { if (!viewerOpen.value) return; if (e.key === 'ArrowRight') { e.preventDefault(); nextPhoto() } else if (e.key === 'ArrowLeft') { e.preventDefault(); prevPhoto() } }
onMounted(() => window.addEventListener('keydown', onKey))
import { onBeforeUnmount } from 'vue'
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// Viewer helpers
function formatDateTime(d?: any) { if (!d) return ''; try { return new Date(d).toLocaleString() } catch { return String(d) } }
function initialsFromName(n?: string) {
  if (!n) return '?'
  const parts = n.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ''
  const last = (parts.length > 1 ? parts[parts.length - 1][0] : '') || ''
  return (first + last).toUpperCase() || '?'
}
async function deleteCurrentPhoto() {
  if (!photos.value.length) return
  const idx = viewerIndex.value
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({ title: 'Delete photo', message: 'Delete this photo? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!confirmed) return
  await removePhotoAt(idx)
}

// Attachments helpers (manual add/remove + upload/viewer)
const newAttachment = ref<{ filename: string; url: string; type?: string }>({ filename: '', url: '' })
function fileNameFromUrl(u?: string) {
  try { if (!u) return ''; const url = new URL(u); return decodeURIComponent(url.pathname.split('/').pop() || '') } catch { return String(u || '').split('/').pop() || '' }
}
function addAttachment() {
  const fn = (newAttachment.value.filename || '').trim() || fileNameFromUrl(newAttachment.value.url)
  const url = String(newAttachment.value.url || '').trim()
  if (!url) return
  const arr = Array.isArray((form.value as any).attachments) ? (form.value as any).attachments.slice() : []
  arr.push({ filename: fn, url, type: newAttachment.value.type || 'link' })
  ;(form.value as any).attachments = arr
  newAttachment.value = { filename: '', url: '' }
}
async function uploadDocument(file: File, onProgress: (pct: number) => void) {
  const eid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!eid) throw new Error('Missing equipment id')
  const fd = new FormData()
  fd.append('attachments', file)
  const res = await http.post(`/api/equipment/${eid}/attachments`, fd, {
    headers: { ...getAuthHeaders() },
    onUploadProgress: (e: any) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)) }
  })
  const fresh = await equipmentStore.fetchOne(eid)
  if (fresh) form.value = { ...fresh }
  return res.data
}
async function removeAttachment(i: number) {
  const eid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (eid) {
    try {
      await http.delete(`/api/equipment/${eid}/attachments/${i}`, { headers: { ...getAuthHeaders() } })
      const fresh = await equipmentStore.fetchOne(eid)
      if (fresh) form.value = { ...fresh }
      ui.showSuccess('Attachment removed')
      return
    } catch (e: any) {
      ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove attachment')
    }
  }
  // Fallback local removal if not yet persisted
  const arr = Array.isArray((form.value as any).attachments) ? (form.value as any).attachments.slice() : []
  arr.splice(i, 1)
  ;(form.value as any).attachments = arr
}

// Determine attachment kind (for icons and viewer)
function attachmentKind(a: any): 'pdf' | 'sheet' | 'word' | 'ppt' | 'image' | 'zip' | 'txt' | 'link' | 'file' {
  const type = (a?.type || '').toLowerCase()
  const name = String(a?.filename || a?.url || '').toLowerCase()
  const ext = name.split('?')[0].split('#')[0].split('.').pop() || ''
  const is = (m: string) => type === m
  if (type.startsWith('image/')) return 'image'
  if (is('application/pdf') || ext === 'pdf') return 'pdf'
  if (
    is('application/vnd.ms-excel') ||
    is('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
    is('text/csv') ||
    ext === 'xls' || ext === 'xlsx' || ext === 'csv'
  ) return 'sheet'
  if (
    is('application/msword') ||
    is('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
    ext === 'doc' || ext === 'docx'
  ) return 'word'
  if (
    is('application/vnd.ms-powerpoint') ||
    is('application/vnd.openxmlformats-officedocument.presentationml.presentation') ||
    ext === 'ppt' || ext === 'pptx'
  ) return 'ppt'
  if (is('application/zip') || ext === 'zip') return 'zip'
  if (is('text/plain') || ext === 'txt') return 'txt'
  if (type === 'link') return 'link'
  return 'file'
}

// Attachment metadata helpers
function formatBytes(bytes?: any): string {
  const n = Number(bytes)
  if (!isFinite(n) || n <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  const val = n / Math.pow(1024, i)
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
function attachmentSize(a: any): string { return formatBytes(a?.size ?? a?.fileSize ?? a?.contentLength) }
function attachmentUploadedAt(a: any): string { const d = a?.uploadedAt || a?.createdAt || a?.date || a?.timestamp; return d ? formatDateTime(d) : '' }
function attachmentUploadedBy(a: any): string {
  const by = a?.uploadedByName || a?.uploaderName || a?.userName || a?.ownerName || a?.uploadedBy?.name || a?.uploader?.name || a?.user?.name
  if (by && String(by).trim()) return String(by)
  const email = a?.uploadedBy?.email || a?.uploader?.email || a?.user?.email
  if (email) return String(email)
  return ''
}
function attachmentMeta(a: any): string {
  const parts = [attachmentSize(a), attachmentUploadedAt(a), attachmentUploadedBy(a) ? `by ${attachmentUploadedBy(a)}` : '']
  return parts.filter(Boolean).join(' • ')
}

// Attachment viewer state
const attachmentViewerOpen = ref(false)
const attachmentFullscreen = ref(false)
const selectedAttachmentIndex = ref<number>(-1)
const selectedAttachment = computed<any>(() => {
  const i = selectedAttachmentIndex.value
  if (i < 0) return null
  const arr: any[] = Array.isArray((form.value as any).attachments) ? (form.value as any).attachments : []
  return arr[i] || null
})
const selectedAttachmentUrl = computed<string>(() => {
  const a: any = selectedAttachment.value
  if (!a || !a.url) return ''
  try { return new URL(a.url, window.location.origin).toString() } catch { return a.url }
})
const selectedKind = computed(() => selectedAttachment.value ? attachmentKind(selectedAttachment.value) : 'file')
const viewerMaxH = computed(() => attachmentFullscreen.value ? '82vh' : '70vh')
const viewerInnerH = computed(() => attachmentFullscreen.value ? '80vh' : '68vh')

function openAttachment(i: number) { selectedAttachmentIndex.value = i; attachmentViewerOpen.value = true }
function openInNewTab(u: string) { try { window.open(u, '_blank', 'noopener') } catch {} }
async function downloadAttachment(a: any) {
  try {
    const url = (() => { try { return new URL(a?.url || '', window.location.origin).toString() } catch { return a?.url || '' } })()
    if (!url) return
    const response = await axios.get(url, { responseType: 'blob' })
    const blob = new Blob([response.data])
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = a?.filename || fileNameFromUrl(url) || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
  } catch (e: any) {
    ui.showError(e?.message || 'Failed to download file')
  }
}
watch(attachmentViewerOpen, (v) => { if (!v) attachmentFullscreen.value = false })

// Attributes UI state and helpers
const newAttrKey = ref('')
const newAttrValue = ref('')
const editingIndex = ref<number | null>(null)
const editKey = ref('')
const editValue = ref('')

// Toast batching for attribute operations to reduce noise
let attrToastTimer: any = null
let attrOpCount = 0
function scheduleAttrToast(kind: 'added' | 'updated' | 'removed') {
  attrOpCount++
  if (attrToastTimer) clearTimeout(attrToastTimer)
  attrToastTimer = setTimeout(() => {
    const msg = attrOpCount > 1
      ? 'Attributes updated'
      : kind === 'added'
        ? 'Attribute added'
        : kind === 'removed'
          ? 'Attribute removed'
          : 'Attribute updated'
    ui.showSuccess(msg, { duration: 1800 })
    attrOpCount = 0
    attrToastTimer = null
  }, 600)
}

const currentAttributes = computed<Array<{ key: string; value: string }>>(() => {
  const arr = Array.isArray((form.value as any).attributes) ? (form.value as any).attributes : []
  return arr.filter((r: any) => (String(r?.key || '').trim() || String(r?.value || '').trim()))
})

async function addAttr() {
  const k = String(newAttrKey.value || '').trim()
  const v = String(newAttrValue.value || '').trim()
  // Key is required; value is optional
  if (!k) return
  const arr = Array.isArray((form.value as any).attributes) ? (form.value as any).attributes.slice() : []
  arr.push({ key: k, value: v })
  ;(form.value as any).attributes = arr
  newAttrKey.value = ''
  newAttrValue.value = ''
  // persist immediately
  const ok = await persistAttributes()
  if (ok) scheduleAttrToast('added')
}
async function removeAttr(i: number) {
  const arr = Array.isArray((form.value as any).attributes) ? (form.value as any).attributes.slice() : []
  arr.splice(i, 1)
  ;(form.value as any).attributes = arr
  // reset editing if needed
  if (editingIndex.value === i) cancelEdit()
  // persist immediately
  const ok = await persistAttributes()
  if (ok) scheduleAttrToast('removed')
}
function startEdit(i: number) {
  const item = currentAttributes.value[i]
  editingIndex.value = i
  editKey.value = item?.key || ''
  editValue.value = item?.value || ''
}
async function saveEdit(i: number) {
  const k = String(editKey.value || '').trim()
  const v = String(editValue.value || '').trim()
  // Key is required; value is optional
  if (!k) return
  const arr = Array.isArray((form.value as any).attributes) ? (form.value as any).attributes.slice() : []
  arr[i] = { key: k, value: v }
  ;(form.value as any).attributes = arr
  cancelEdit()
  // persist immediately
  const ok = await persistAttributes()
  if (ok) scheduleAttrToast('updated')
}
async function persistAttributes(): Promise<boolean> {
  try {
    const eid = (form.value.id || (form.value as any)._id || id.value) as string
    if (!eid) return false
    const attrs = Array.isArray((form.value as any).attributes)
      ? (form.value as any).attributes.filter((r: any) => (String(r?.key || '').trim() || String(r?.value || '').trim()))
      : []
    await equipmentStore.updateFields(eid, { attributes: attrs } as any)
    return true
  } catch (err) {
    console.error('Failed to persist attributes', err)
    const msg = (err as any)?.response?.data?.error || (err as any)?.response?.data?.message || (err as any)?.message || 'Failed to save attributes'
    ui.showError(msg)
    return false
  }
}
function cancelEdit() { editingIndex.value = null; editKey.value = ''; editValue.value = '' }

// Components tab state and helpers
type CompAttrPair = { key: string; value: string }
type ComponentDraft = {
  id?: string
  tag?: string
  type: string
  title?: string
  attributes?: Record<string, any>
  status?: string
  notes?: string
  issues?: string[]
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

const componentsList = computed<any[]>({
  get() {
    const arr: any = (form.value as any).components
    return Array.isArray(arr) ? arr : []
  },
  set(v: any[]) {
    ;(form.value as any).components = Array.isArray(v) ? v : []
  }
})

// Alias for ComponentsPanel v-model
const components = computed<any[]>({
  get() { return componentsList.value },
  set(v: any[]) { componentsList.value = Array.isArray(v) ? v : [] }
})

function attrSummary(attrs: any): string {
  if (!attrs) return ''
  let pairs: CompAttrPair[] = []
  if (Array.isArray(attrs)) {
    pairs = (attrs as any[]).map((r: any) => ({ key: String(r?.key ?? r?.title ?? ''), value: String(r?.value ?? '') }))
  } else if (typeof attrs === 'object') {
    pairs = Object.entries(attrs).map(([k, v]) => ({ key: String(k), value: String(v ?? '') }))
  }
  const shown = pairs.filter(p => p.key && (p.value || p.value === '')).slice(0, 3)
  return shown.map(p => `${p.key}: ${p.value}`).join(' • ')
}

const editingComponentIndex = ref<number | null>(null)
const compDraft = ref<ComponentDraft>({ type: '', title: '', attributes: {}, status: '', notes: '' })
const compAttrList = ref<CompAttrPair[]>([])
const compAttrEditingIndex = ref<number | null>(null)
const compAttrKey = ref('')
const compAttrValue = ref('')

const compDraftIssueLinks = computed<any[]>(() => {
  const ids: string[] = Array.isArray(compDraft.value.issues) ? compDraft.value.issues.filter(Boolean) as string[] : []
  return ids.map(id => issuesById.value[String(id)]).filter(Boolean)
})

// Component Issue modal state
const showCompIssueModal = ref(false)
const compIssueDraft = ref<any>({
  status: 'open',
  priority: 'medium',
  title: '',
  type: '',
  description: '',
  location: '',
  system: ''
})
function openCompIssueModal() {
  const eqTag = String((form.value as any)?.tag || '')
  const eqSystem = String((form.value as any)?.system || '')
  compIssueDraft.value = {
    status: 'open',
    priority: 'medium',
    title: `${(compDraft.value.title || compDraft.value.type || 'Component')} issue`,
    type: '',
    description: (compDraft.value.notes || '').trim() || `Issue for component ${(compDraft.value.title || compDraft.value.type || '').trim() || 'component'}`,
    location: eqTag || '',
    system: eqSystem || ''
  }
  showCompIssueModal.value = true
}
async function createCompIssue() {
  try {
    const pid = String(form.value.projectId || projectStore.currentProjectId || '')
    const eid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!pid || !eid) { ui.showError('Missing project or equipment id'); return }
    // Ensure required fields
    const title = (compIssueDraft.value.title || '').trim() || `${(compDraft.value.title || compDraft.value.type || 'Component')} issue`
    const description = (compIssueDraft.value.description || '').trim() || `Issue for ${String(form.value.tag || form.value.title || 'equipment')} – ${(compDraft.value.title || compDraft.value.type || 'component')}`
    const payload = { ...compIssueDraft.value, title, description, projectId: pid, assetId: eid }
    const created = await issuesStore.createIssue(payload as any)
    const newId = String(created.id || created._id)
    if (newId) {
      if (!compDraft.value.issues) compDraft.value.issues = []
      if (!compDraft.value.issues.includes(newId)) compDraft.value.issues.push(newId)
      // update list if editing an existing component
      const idx = editingComponentIndex.value
      if (idx != null && idx >= 0 && idx < componentsList.value.length) {
        const list = componentsList.value.slice()
        const existing = { ...(list[idx] || {}) }
        const curIds: string[] = Array.isArray(existing.issues) ? existing.issues.slice() : []
        if (!curIds.includes(newId)) curIds.push(newId)
        existing.issues = curIds
        list.splice(idx, 1, existing)
        componentsList.value = list
        await persistComponents()
      }
    }
    ui.showSuccess('Issue created')
    showCompIssueModal.value = false
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to create issue'
    ui.showError(msg)
  }
}

  // Component Editor modal state
  const showCompModal = ref(false)

function pairsFromObject(obj?: Record<string, any>): CompAttrPair[] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([k, v]) => ({ key: String(k), value: String(v ?? '') }))
}
function objectFromPairs(pairs: CompAttrPair[]): Record<string, any> {
  const out: Record<string, any> = {}
  for (const p of pairs) {
    const k = String(p.key || '').trim()
    if (!k) continue
    out[k] = p.value
  }
  return out
}

function startNewComponent() {
  editingComponentIndex.value = componentsList.value.length
  compDraft.value = { type: '', title: '', tag: '', attributes: {}, status: '', notes: '' }
  compAttrList.value = []
  compAttrEditingIndex.value = null
  compAttrKey.value = ''
  compAttrValue.value = ''
  showCompModal.value = true
}
function editComponent(i: number) {
  const c: any = componentsList.value[i]
  editingComponentIndex.value = i
  const attrsPairs = Array.isArray(c?.attributes)
    ? (c.attributes as any[]).map((r: any) => ({ key: String(r?.key ?? r?.title ?? ''), value: String(r?.value ?? '') }))
    : pairsFromObject(c?.attributes)
  compAttrList.value = attrsPairs
  compDraft.value = {
    id: c?.id,
    tag: c?.tag || '',
    type: String(c?.type || ''),
    title: c?.title || '',
    attributes: objectFromPairs(attrsPairs),
    status: c?.status || '',
    notes: c?.notes || '',
    issues: Array.isArray(c?.issues) ? c.issues : undefined,
    createdAt: c?.createdAt,
    updatedAt: c?.updatedAt,
    createdBy: c?.createdBy,
    updatedBy: c?.updatedBy
  }
  compAttrEditingIndex.value = null
  compAttrKey.value = ''
  compAttrValue.value = ''
  showCompModal.value = true
}
async function removeComponent(i: number) {
  const list = componentsList.value.slice()
  list.splice(i, 1)
  componentsList.value = list
  await persistComponents()
}

function addCompAttr() {
  const k = String(compAttrKey.value || '').trim()
  if (!k) return
  compAttrList.value = [...compAttrList.value, { key: k, value: String(compAttrValue.value || '') }]
  compAttrKey.value = ''
  compAttrValue.value = ''
}
function editCompAttr(i: number) {
  const it = compAttrList.value[i]
  compAttrEditingIndex.value = i
  compAttrKey.value = it?.key || ''
  compAttrValue.value = it?.value || ''
}
function removeCompAttr(i: number) {
  const arr = compAttrList.value.slice()
  arr.splice(i, 1)
  compAttrList.value = arr
  if (compAttrEditingIndex.value === i) cancelCompAttr()
}
function saveCompAttr(i: number) {
  const k = String(compAttrKey.value || '').trim()
  if (!k) return
  const arr = compAttrList.value.slice()
  arr[i] = { key: k, value: String(compAttrValue.value || '') }
  compAttrList.value = arr
  cancelCompAttr()
}
function cancelCompAttr() {
  compAttrEditingIndex.value = null
  compAttrKey.value = ''
  compAttrValue.value = ''
}

async function saveComponent() {
  const idx = editingComponentIndex.value
  if (idx === null) return
  const type = String(compDraft.value.type || '').trim()
  if (!type) { ui.showError('Component type is required'); return }
  const componentToSave: any = {
    id: compDraft.value.id,
    tag: compDraft.value.tag || '',
    type,
    title: compDraft.value.title || '',
    attributes: objectFromPairs(compAttrList.value),
    status: compDraft.value.status || '',
    notes: compDraft.value.notes || '',
    issues: Array.isArray(compDraft.value.issues) ? compDraft.value.issues : undefined
  }
  const list = componentsList.value.slice()
  if (idx >= 0 && idx < list.length) list.splice(idx, 1, componentToSave)
  else list.push(componentToSave)
  componentsList.value = list
  const ok = await persistComponents()
  if (ok) {
    ui.showSuccess('Component saved')
    cancelEditComponent()
    // refresh from server to ensure canonical state
    const eid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (eid) {
      const fresh = await equipmentStore.fetchOne(eid)
      if (fresh) form.value = { ...fresh }
    }
  }
}
function cancelEditComponent() {
  editingComponentIndex.value = null
  compDraft.value = { type: '', title: '', tag: '', attributes: {}, status: '', notes: '' }
  compAttrList.value = []
  cancelCompAttr()
  showCompModal.value = false
}

async function persistComponents(): Promise<boolean> {
  try {
    const eid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!eid) return false
    const payloadList = (componentsList.value || []).map((c: any) => {
      // Ensure attributes are stored as object
      const attrs = Array.isArray(c?.attributes) ? objectFromPairs(c.attributes as any) : (c?.attributes || {})
      const out: any = {
        id: c?.id,
        tag: c?.tag || '',
        type: c?.type,
        title: c?.title,
        attributes: attrs,
        status: c?.status || '',
        notes: c?.notes || '',
        issues: Array.isArray(c?.issues) ? c.issues : undefined
      }
      return out
    })
    await equipmentStore.updateFields(eid, { components: payloadList } as any)
    return true
  } catch (err: any) {
    console.error('Failed to persist components', err)
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to save components')
    return false
  }
}

// Persist components when ComponentsPanel emits a change (debounced)
let componentsSaveTimer: any = null
function onComponentsChange(list: any[]) {
  if (componentsSaveTimer) clearTimeout(componentsSaveTimer)
  componentsSaveTimer = setTimeout(async () => {
    componentsList.value = Array.isArray(list) ? list : []
    const ok = await persistComponents()
    if (ok) {
      ui.showSuccess('Components saved')
      // refresh canonical state
      const eid = String(form.value.id || (form.value as any)._id || id.value || '')
      if (eid) {
        const fresh = await equipmentStore.fetchOne(eid)
        if (fresh) form.value = { ...fresh }
      }
    }
    componentsSaveTimer = null
  }, 700)
}

// Drag-and-drop reordering for components
const draggingComponent = ref<any | null>(null)
function onCompDragStart(c: any, e: DragEvent) {
  draggingComponent.value = c
  if (e && e.dataTransfer) {
    try { e.dataTransfer.setData('text/plain', 'component') } catch {}
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onCompDragOver(_i: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}
async function onCompDrop(targetIndex: number, e: DragEvent) {
  e.preventDefault()
  const src = draggingComponent.value
  draggingComponent.value = null
  if (!src) return
  const list = componentsList.value.slice()
  const fromIdx = list.indexOf(src)
  if (fromIdx === -1 || fromIdx === targetIndex) return
  const [moved] = list.splice(fromIdx, 1)
  list.splice(targetIndex, 0, moved)
  componentsList.value = list
  const ok = await persistComponents()
  if (ok) ui.showSuccess('Component order updated', { duration: 1400 })
}

async function addComponentIssue() {
  try {
    const pid = String(form.value.projectId || projectStore.currentProjectId || '')
    const eid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!pid || !eid) {
      ui.showError('Missing project or equipment id')
      return
    }
    const title = `${form.value.tag || form.value.title || 'Equipment'} – ${(compDraft.value.title || compDraft.value.type || 'Component')} issue`
    const payload = {
      projectId: pid,
      title,
      description: '',
      status: 'Open',
      assetId: eid,
      system: form.value.system || undefined,
      location: form.value.tag || undefined
    }
    const iss = await issuesStore.createIssue(payload as any)
    const newId = String(iss.id || iss._id)
    if (!compDraft.value.issues) compDraft.value.issues = []
    if (newId && !compDraft.value.issues.includes(newId)) compDraft.value.issues.push(newId)
    // If editing an existing component entry, update list and persist immediately
    const idx = editingComponentIndex.value
    if (idx != null && idx >= 0 && idx < componentsList.value.length) {
      const list = componentsList.value.slice()
      const existing = { ...(list[idx] || {}) }
      const curIds: string[] = Array.isArray(existing.issues) ? existing.issues.slice() : []
      if (newId && !curIds.includes(newId)) curIds.push(newId)
      existing.issues = curIds
      list.splice(idx, 1, existing)
      componentsList.value = list
      await persistComponents()
    }
    ui.showSuccess('Issue created and linked')
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to create issue'
    ui.showError(msg)
  }
}

// Issues tab
const issuesStore = useIssuesStore()
const issuesForEquipment = computed(() => {
  const eid = String(id.value || '')
  const tag = String((form.value as any)?.tag || '')
  return (issuesStore.issues || []).filter((it: any) => String(it.assetId || '') === eid || (tag && String(it.location || '') === tag))
})

// Issues map by id (used for component modal linked issues)
const issuesById = computed(() => {
  const map: Record<string, any> = {}
  for (const it of (issuesStore.issues || [])) {
    const key = String((it as any).id || (it as any)._id || '')
    if (key) map[key] = it
  }
  return map
})
function countForTab(t: string) {
  if (t === 'Photos') return (Array.isArray((form.value as any).photos) ? (form.value as any).photos.length : 0)
  if (t === 'Attachments') return Array.isArray((form.value as any).attachments) ? (form.value as any).attachments.length : 0
  if (t === 'Components') return Array.isArray((form.value as any).components) ? (form.value as any).components.length : 0
  if (t === 'Checklists') return checklists.value.length
  if (t === 'FPT') return functionalTests.value.length
  if (t === 'Issues') return issuesForEquipment.value.length
  return 0
}

// Checklists and FPT lists
const checklists = computed<any[]>({
  get() {
    const cl: any = (form.value as any).checklists
    if (Array.isArray(cl)) return cl
    if (cl && typeof cl === 'object') return Object.values(cl)
    return []
  },
  set(v: any[]) {
    ;(form.value as any).checklists = Array.isArray(v) ? v : []
  }
})
const functionalTests = computed<any[]>({
  get() {
    const ft: any = (form.value as any).functionalTests
    if (Array.isArray(ft)) return ft
    if (ft && typeof ft === 'object') return Object.values(ft)
    return []
  },
  set(v: any[]) {
    ;(form.value as any).functionalTests = Array.isArray(v) ? v : []
  }
})
// Persist functional tests when they change (debounced)
let fptSaveTimer: any = null
async function persistFunctionalTests(tests: any[]) {
  try {
    const eid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!eid) return
    await equipmentStore.updateFields(eid, { functionalTests: tests } as any)
    const fresh = await equipmentStore.fetchOne(eid)
    if (fresh) form.value = { ...fresh }
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save functional tests')
  }
}
function onFunctionalTestsChange(tests: any[]) {
  if (fptSaveTimer) clearTimeout(fptSaveTimer)
  fptSaveTimer = setTimeout(async () => {
    await persistFunctionalTests(tests)
    ui.showSuccess('Functional tests saved')
    fptSaveTimer = null
  }, 700)
}

// Immediate save handler for explicit Save button in FunctionalTestsPanel
function onFunctionalTestsSave(tests: any[]) {
  if (fptSaveTimer) clearTimeout(fptSaveTimer)
  // Persist immediately and show success
  persistFunctionalTests(tests).then(() => {
    ui.showSuccess('Functional tests saved')
  })
}

// Persist checklists when they change (debounced)
let checklistSaveTimer: any = null
async function persistChecklists(sections: any[]) {
  try {
    const eid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!eid) return
    await equipmentStore.updateFields(eid, { checklists: sections } as any)
    const fresh = await equipmentStore.fetchOne(eid)
    if (fresh) form.value = { ...fresh }
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save checklist')
  }
}
function onChecklistsChange(sections: any[]) {
  if (checklistSaveTimer) clearTimeout(checklistSaveTimer)
  checklistSaveTimer = setTimeout(async () => {
    await persistChecklists(sections)
    ui.showSuccess('Checklist saved')
    checklistSaveTimer = null
  }, 700)
}

async function load() {
  loading.value = true
  try {
    if (!id.value) return
    const eq = await equipmentStore.fetchOne(id.value)
    if (eq) {
      form.value = { ...eq }
      // ensure project id present for later saves
      if (!form.value.projectId) form.value.projectId = (eq as any).projectId || projectStore.currentProjectId || ''
      const pid = form.value.projectId || projectStore.currentProjectId || ''
      if (pid) {
        await spacesStore.fetchByProject(String(pid))
        // ensure equipment list is loaded for navigation
        if (!equipmentStore.items.length) await equipmentStore.fetchByProject(String(pid))
      }
      // Map backend metadata.attributes -> form.attributes for UI if top-level attributes missing
      const topAttrs = (form.value as any).attributes
      const metaAttrs = (form.value as any)?.metadata?.attributes
      if ((!Array.isArray(topAttrs) || !topAttrs.length) && metaAttrs) {
        let arr: Array<{ key: string; value: string }>
        if (Array.isArray(metaAttrs)) arr = metaAttrs
        else if (typeof metaAttrs === 'object') arr = Object.entries(metaAttrs).map(([k, v]) => ({ key: String(k), value: String(v ?? '') }))
        else arr = []
        ;(form.value as any).attributes = arr
      }
    }
    // Ensure issues are loaded (to show linked ones)
    try { await issuesStore.fetchIssues(String(form.value.projectId || projectStore.currentProjectId || '')) } catch {}
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!form.value.id) form.value.id = (form.value as any)._id || id.value
  if (!form.value.id) return
  try {
        await equipmentStore.update(form.value as Equipment & { id: string })
    ui.showSuccess('Equipment saved')
  } catch (e) {
    console.error(e)
    ui.showError('Failed to save equipment')
  }
}

async function onDelete() {
  if (!id.value) return
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({
    title: 'Delete equipment',
    message: 'Delete this equipment item? This cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!confirmed) return
  await equipmentStore.remove(id.value)
  ui.showSuccess('Equipment deleted')
  goBack()
}

function goBack() { router.push({ name: 'equipment' }) }

onMounted(load)
watch(() => route.params.id, load)

// Report settings state (persisted for the session)
const REPORT_SESSION_KEY = 'equipmentReportSettings'
const showReportDialog = ref(false)
const report = ref<{ include: Record<string, boolean>; photoLimit: number }>({
  include: {
    info: true,
    attributes: true,
    components: true,
    photos: true,
    attachments: true,
    checklists: true,
    fpt: true,
    issues: true,
  },
  photoLimit: 6,
})
function loadReportSettingsFromSession() {
  try {
    const raw = sessionStorage.getItem(REPORT_SESSION_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      report.value = {
        include: { ...report.value.include, ...(parsed.include || {}) },
        photoLimit: Math.max(0, Number(parsed.photoLimit ?? report.value.photoLimit)),
      }
    }
  } catch {}
}
function saveReportSettings() {
  try { sessionStorage.setItem(REPORT_SESSION_KEY, JSON.stringify(report.value)) } catch {}
  showReportDialog.value = false
}
function resetReportSettings() {
  report.value = {
    include: { info: true, attributes: true, components: true, photos: true, attachments: true, checklists: true, fpt: true, issues: true },
    photoLimit: 6,
  }
}
onMounted(loadReportSettingsFromSession)
watch(report, () => { try { sessionStorage.setItem(REPORT_SESSION_KEY, JSON.stringify(report.value)) } catch {} }, { deep: true })

// -----------------------------
// PDF report helpers (mirrors Issue report style)
// -----------------------------
type ImageFormat = 'PNG' | 'JPEG' | 'WEBP'
function mimeToFormat(mime?: string | null): ImageFormat | undefined {
  if (!mime) return undefined
  const m = mime.toLowerCase()
  if (m.includes('png')) return 'PNG'
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPEG'
  if (m.includes('webp')) return 'WEBP'
  return undefined
}
async function convertDataUrlToJpeg(dataUrl: string, quality = 0.92): Promise<string | null> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('image load failed'))
      img.src = dataUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/jpeg', quality)
  } catch {
    return null
  }
}
async function loadImage(src?: string): Promise<{ dataUrl?: string, format?: ImageFormat }> {
  try {
    if (!src) return {}
    if (src.startsWith('data:')) {
      const mime = src.slice(5, src.indexOf(';'))
      let fmt = mimeToFormat(mime)
      if (fmt === 'WEBP' || (mime && mime.toLowerCase().includes('svg'))) {
        const conv = await convertDataUrlToJpeg(src)
        if (conv) return { dataUrl: conv, format: 'JPEG' }
      }
      return { dataUrl: src, format: fmt }
    }
    const res = await fetch(src)
    if (!res.ok) return {}
    const blob = await res.blob()
    const dataUrl: string = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    })
    let fmt = mimeToFormat(blob.type)
    if ((blob.type && blob.type.toLowerCase().includes('svg')) || fmt === 'WEBP') {
      const conv = await convertDataUrlToJpeg(dataUrl)
      if (conv) return { dataUrl: conv, format: 'JPEG' }
    }
    return { dataUrl, format: fmt }
  } catch { return {} }
}
function htmlToText(html: any): string {
  if (!html) return ''
  try {
    const tmp = document.createElement('div')
    tmp.innerHTML = String(html)
    const t = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
    return t
  } catch {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}
function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as unknown as string[]
}
function spaceNameForReport(spaceId?: string | null): string {
  const pid = spaceId ? String(spaceId) : ''
  const byId: any = (spacesStore as any).byId || {}
  return pid && byId[pid] ? String(byId[pid].title || '') : ''
}

// Report-specific helpers for FPT rendering in PDF
function isPassColumnName(name?: string) {
  const n = (name || '').toString().trim().toLowerCase()
  return n === 'pass' || n === 'result' || n === 'status'
}
type PassState = 'none' | 'pass' | 'fail'
function passCellState(v: any): PassState {
  const x = v
  if (x === true || x === 'true' || String(x).toLowerCase() === 'pass' || String(x) === '1' || String(x).toLowerCase() === 'yes') return 'pass'
  if (x === false || x === 'false' || String(x).toLowerCase() === 'fail' || String(x) === '0' || String(x).toLowerCase() === 'no') return 'fail'
  return 'none'
}
function passLabel(state: PassState) { return state === 'pass' ? 'PASS' : state === 'fail' ? 'FAIL' : '—' }

async function downloadEquipmentPdf() {
  const dlWin = window.open('', '_blank')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const bottomLimit = pageHeight - 26
  const pageDate = new Date().toLocaleDateString()
  let pageNo = 1
  let y = margin

  // Resolve project for logos
  let project: any = (projectStore.currentProject && (projectStore.currentProject as any).value) || null
  const targetPid = (form.value as any).projectId || (typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null)
  if (!project || (targetPid && (String(project._id || project.id) !== String(targetPid)))) {
    try { if (targetPid) project = await projectStore.fetchProject(String(targetPid)) } catch {}
  }
  project = project || {}
  const clientImg = await loadImage(project?.logo)
  const cxaImg = await loadImage(project?.commissioning_agent?.logo)
  let footerLogo = await loadImage('/brand/logo.png')
  if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.svg')

  const drawFooter = () => {
    // Preserve current font and size
    const prevFont = (doc as any).getFont ? (doc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
    const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 9
    const footerY = pageHeight - 10
    doc.setDrawColor(180, 180, 180)
    doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)
    try {
      if (footerLogo.dataUrl) {
        const lh = 5.5
        const lw = 12
        doc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', margin, footerY - lh, lw, lh)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
        const tail = String((form.value as any).tag || (form.value as any).title || 'Equipment')
        doc.text(`${tail} Report`, margin + lw + 2, footerY - 2)
      } else {
        doc.setFillColor(220, 220, 220)
        doc.rect(margin, footerY - 5.5, 8, 5, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
        const tail = String((form.value as any).tag || (form.value as any).title || 'Equipment')
        doc.text(`${tail} Report`, margin + 10, footerY - 2)
      }
    } catch {
      doc.setFillColor(220, 220, 220)
      doc.rect(margin, footerY - 5.5, 8, 5, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      const tail = String((form.value as any).tag || (form.value as any).title || 'Equipment')
      doc.text(`${tail} Report`, margin + 10, footerY - 2)
    }
    doc.setFont('helvetica', 'normal')
    doc.text(String(pageNo), pageWidth / 2, footerY - 2, { align: 'center' })
    doc.text(pageDate, pageWidth - margin, footerY - 2, { align: 'right' })
    // Restore previous font and size
    doc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal')
    doc.setFontSize(prevSize)
  }

  // Header + page break handling
  const logoH = 12
  const drawHeader = () => {
    // Preserve current font and size
    const prevFont = (doc as any).getFont ? (doc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
    const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 9
    // Draw header band
    if (clientImg.dataUrl) doc.addImage(clientImg.dataUrl, clientImg.format || 'PNG', margin, margin, logoH * 2.5, logoH)
    if (cxaImg.dataUrl) { const w = logoH * 2.5; doc.addImage(cxaImg.dataUrl, cxaImg.format || 'PNG', pageWidth - margin - w, margin, w, logoH) }
    doc.setFontSize(20); doc.setFont('helvetica', 'bold')
    const headerTitle = String((form.value as any).tag || (form.value as any).title || 'Equipment')
    doc.text(`${headerTitle} Report`, pageWidth / 2, margin + 8, { align: 'center' })
    y = margin + 22
    // Restore previous font and size
    doc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal')
    doc.setFontSize(prevSize)
  }

  const ensureSpace = (amount: number): boolean => {
    if (y + amount > bottomLimit) {
      drawFooter(); doc.addPage(); pageNo++; y = margin; drawHeader(); return true
    }
    return false
  }

  // Small vertical spacer between sections (like an extra <br />)
  const sectionGap = (gap: number = 6) => {
    ensureSpace(gap)
    y += gap
  }

  // Draw initial header
  drawHeader()

  // Info
  if (report.value.include.info) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Info', margin, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
    const info: Array<[string, string]> = [
      ['Tag', String((form.value as any).tag || '')],
      ['Title', String((form.value as any).title || '')],
      ['Type', String((form.value as any).type || '')],
      ['System', String((form.value as any).system || '')],
      ['Status', String((form.value as any).status || '')],
      ['Space', spaceNameForReport(String((form.value as any).spaceId || ''))],
    ]
    const colW = (pageWidth - margin * 2) / 2
    let i = 0
    for (const [label, value] of info) {
      const col = i % 2; const row = Math.floor(i / 2); const x = margin + col * colW; const yy = y + row * 7
      ensureSpace(10)
      doc.setTextColor(100); doc.text(label + ':', x, yy); doc.setTextColor(0)
      const vLines = splitText(doc, value, colW - 24)
      doc.text(vLines, x + 24, yy)
      i++
    }
    const rows = Math.ceil(info.length / 2); y += rows * 7 + 2
    if ((form.value as any).description) {
      ensureSpace(14)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Description', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      const lines = splitText(doc, htmlToText(String((form.value as any).description || '')), pageWidth - margin * 2)
      for (const l of lines) { ensureSpace(6); doc.text(l, margin, y); y += 5 }
    }
  }

  // Attributes
  if (report.value.include.attributes) {
    const attrs: Array<{ key: string; value: string }> = Array.isArray((form.value as any).attributes) ? (form.value as any).attributes.filter((r: any) => (String(r?.key || '').trim() || String(r?.value || '').trim())) : []
    if (attrs.length) {
      sectionGap();
      ensureSpace(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Attributes', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      for (const a of attrs) {
        const line = `${a.key}: ${a.value}`
        const lines = splitText(doc, line, pageWidth - margin * 2)
        for (const l of lines) { ensureSpace(6); doc.text(l, margin + 2, y); y += 5 }
      }
    }
  }

  // Components (detailed)
  if (report.value.include.components) {
    const list: any[] = Array.isArray((form.value as any).components) ? (form.value as any).components : []
    if (list.length) {
      sectionGap();
      ensureSpace(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Components', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      const toPairs = (obj: any) => {
        if (!obj) return []
        if (Array.isArray(obj)) return obj.map((r: any) => ({ k: String(r?.key ?? r?.title ?? ''), v: String(r?.value ?? '') })).filter((p: any) => p.k)
        if (typeof obj === 'object') return Object.entries(obj).map(([k, v]) => ({ k: String(k), v: String(v ?? '') }))
        return []
      }
      for (const c of list) {
        // Header line: Tag — Title/Type (bold)
        const header = `${c.tag ? c.tag + ' — ' : ''}${c.title || c.type || 'Component'}`
        const hLines = splitText(doc, header, pageWidth - margin * 2)
        doc.setFont('helvetica', 'bold')
        for (const l of hLines) { ensureSpace(6); doc.text(l, margin + 2, y); y += 4 }
        doc.setFont('helvetica', 'normal')
        // Inline meta
        const metaBits: string[] = []
        if (c.type) metaBits.push(`Type: ${c.type}`)
        if (c.status) metaBits.push(`Status: ${c.status}`)
        const meta = metaBits.join('  •  ')
        if (meta) { const mLines = splitText(doc, meta, pageWidth - margin * 2 - 4); for (const l of mLines) { ensureSpace(5); doc.text(l, margin + 4, y); y += 4 } }
        // Attributes as key: value pairs
        const attrs = toPairs(c?.attributes)
        for (const p of attrs) {
          const txt = `${p.k}: ${p.v}`
          const aLines = splitText(doc, txt, pageWidth - margin * 2 - 6)
          for (const l of aLines) { ensureSpace(5); doc.text(l, margin + 6, y); y += 4 }
        }
        // Notes
        if (c.notes) {
          const nLines = splitText(doc, `Notes: ${c.notes}`, pageWidth - margin * 2 - 6)
          for (const l of nLines) { ensureSpace(5); doc.text(l, margin + 6, y); y += 4 }
        }
        y += 2
      }
    }
  }

  // Photos (first N)
  if (report.value.include.photos) {
    const phs: any[] = Array.isArray((form.value as any).photos) ? (form.value as any).photos : []
    const imgs: Array<{ dataUrl: string, format?: ImageFormat }> = []
    for (let p = 0; p < Math.min(report.value.photoLimit, phs.length); p++) {
      const src = phs[p]?.data || phs[p]?.url || phs[p]
      const img = await loadImage(src)
      if (img.dataUrl) imgs.push({ dataUrl: img.dataUrl, format: img.format })
    }
    if (imgs.length) {
      sectionGap();
      ensureSpace(10); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Photos', margin, y); y += 4
      const thumbW = (pageWidth - margin * 2 - 8) / 3
      const thumbH = thumbW * 0.75
      for (let idx = 0; idx < imgs.length; idx++) {
        const col = idx % 3; const row = Math.floor(idx / 3); const x = margin + col * (thumbW + 4); const yy = y + row * (thumbH + 4)
        if (yy + thumbH > bottomLimit) { drawFooter(); doc.addPage(); pageNo++; y = margin; idx -= (idx % 3); continue }
        const it = imgs[idx]
        doc.addImage(it.dataUrl, it.format || 'JPEG', x, yy, thumbW, thumbH)
      }
      y += Math.ceil(imgs.length / 3) * (thumbH + 4) + 2
    }
  }

  // (Attachments section moved to end of report)

  // Checklists (detailed as tables with grid)
  if (report.value.include.checklists) {
    const sections: any[] = Array.isArray((form.value as any).checklists) ? (form.value as any).checklists : []
    if (sections.length) {
      sectionGap();
      ensureSpace(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Checklists', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      for (const s of sections) {
        const title = String(s?.title || 'Section')
        ensureSpace(6); doc.setFont('helvetica', 'bold'); doc.text(title, margin + 1, y); y += 5; doc.setFont('helvetica', 'normal')
        // In UI/state, checklist rows are stored as `questions`; support legacy `items` too
        const items: any[] = Array.isArray(s?.questions) ? s.questions : (Array.isArray(s?.items) ? s.items : [])
        if (!items.length) continue
        // Table layout
        const totalW = pageWidth - margin * 2 - 2
        const doneW = 12
        const notesW = Math.max(28, Math.min(60, totalW * 0.33))
        const textW = totalW - doneW - notesW
        const tableX = margin + 1
        const drawChecklistHeader = () => {
          ensureSpace(8)
          doc.setFont('helvetica', 'bold')
          const headerH = 6
          // Header background (slight green shading) and box
          doc.setFillColor(235, 245, 238)
          doc.rect(tableX, y, totalW, headerH, 'F')
          doc.rect(tableX, y, totalW, headerH)
          // Column dividers
          doc.line(tableX + doneW, y, tableX + doneW, y + headerH)
          doc.line(tableX + doneW + textW, y, tableX + doneW + textW, y + headerH)
          // Header text
          doc.text('Done', tableX + 1.5, y + 4)
          doc.text('Question', tableX + doneW + 1.5, y + 4)
          doc.text('Notes', tableX + doneW + textW + 1.5, y + 4)
          y += headerH
          doc.setFont('helvetica', 'normal')
        }
        drawChecklistHeader()
        for (const it of items) {
          // Determine Done cell from either boolean `done` or string `answer` (yes/no/na)
          let doneTxt = '[ ]'
          if (typeof it?.done !== 'undefined') {
            doneTxt = it?.done ? '[x]' : '[ ]'
          } else if (typeof it?.answer !== 'undefined' && it?.answer !== null) {
            const ans = String(it.answer).toLowerCase()
            doneTxt = ans === 'yes' ? '[x]' : (ans === 'na' ? 'N/A' : '[ ]')
          }
          const questionText = String(it?.question_text ?? it?.text ?? '')
          const qLines = splitText(doc, questionText, textW - 3)
          const nLines = splitText(doc, String(it?.notes || ''), notesW - 3)
          const hLines = Math.max(1, qLines.length, nLines.length)
          const rowH = Math.max(6, hLines * 4 + 2)
          if (ensureSpace(rowH + 2)) {
            drawChecklistHeader()
          }
          // Row box
          doc.rect(tableX, y, totalW, rowH)
          // Column dividers
          doc.line(tableX + doneW, y, tableX + doneW, y + rowH)
          doc.line(tableX + doneW + textW, y, tableX + doneW + textW, y + rowH)
          // Done
          doc.text(doneTxt, tableX + 1.5, y + 4)
          // Question
          for (let k = 0; k < qLines.length; k++) {
            doc.text(qLines[k], tableX + doneW + 1.5, y + 4 + k * 4)
          }
          // Notes
          for (let k = 0; k < nLines.length; k++) {
            doc.text(nLines[k], tableX + doneW + textW + 1.5, y + 4 + k * 4)
          }
          y += rowH
        }
  // Extra spacing after the checklist table to avoid bleeding into next content
  sectionGap(6)
      }
    }
  }

  // Functional Tests (detailed)
  if (report.value.include.fpt) {
    const tests: any[] = Array.isArray((form.value as any).functionalTests) ? (form.value as any).functionalTests : []
    if (tests.length) {
      sectionGap();
      ensureSpace(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Functional Tests', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      for (const t of tests) {
        // Header line: number and name (match checklist section title styling)
        const number = (t?.number != null && t?.number !== undefined) ? `#${t.number} ` : ''
        const title = `${number}${String(t?.name || t?.title || 'Test')}`
        const lines = splitText(doc, title, pageWidth - margin * 2)
        doc.setFont('helvetica', 'bold')
        for (const l of lines) { ensureSpace(6); doc.text(l, margin + 1, y); y += 5 }
        doc.setFont('helvetica', 'normal')
        // Status
        if (t?.pass === true || t?.pass === false) {
          const st = t.pass === true ? 'PASS' : 'FAIL'
          ensureSpace(5); doc.text(`Status: ${st}`, margin + 2, y); y += 4
        }
        // Description
        if (t?.description) {
          const dLines = splitText(doc, `Description: ${String(t.description)}`, pageWidth - margin * 2 - 4)
          for (const l of dLines) { ensureSpace(5); doc.text(l, margin + 4, y); y += 4 }
        }
        // Notes
        if (t?.notes) {
          const nLines = splitText(doc, `Notes: ${String(t.notes)}`, pageWidth - margin * 2 - 4)
          for (const l of nLines) { ensureSpace(5); doc.text(l, margin + 4, y); y += 4 }
        }
        // Rows: support sheet or table
        const hasSheetRows = Array.isArray(t?.rows) && t.rows.length && (t.kind === 'sheet')
        const tbl = t?.table && Array.isArray(t.table.columns) ? t.table : null
        let tableRendered = false
        if (hasSheetRows) {
          // Draw grid table: Step | Expected | Actual
          const totalW = pageWidth - margin * 2 - 2
          const cols = [
            { key: 'step', name: 'Step' },
            { key: 'expected', name: 'Expected' },
            { key: 'actual', name: 'Actual' },
          ] as Array<{ key: string; name: string }>
          const colW = totalW / cols.length
          const tableX = margin + 1
          const drawSheetHeader = () => {
            ensureSpace(8)
            doc.setFont('helvetica', 'bold')
            const headerH = 6
            // Header background (slight blue shading) and box
            doc.setFillColor(235, 241, 250)
            doc.rect(tableX, y, totalW, headerH, 'F')
            doc.rect(tableX, y, totalW, headerH)
            // Vertical lines
            for (let i = 1; i < cols.length; i++) {
              const vx = tableX + i * colW
              doc.line(vx, y, vx, y + headerH)
            }
            // Header text
            cols.forEach((c, idx) => {
              const x = tableX + idx * colW + 1.5
              doc.text(String(c.name || ''), x, y + 4)
            })
            y += headerH
            doc.setFont('helvetica', 'normal')
          }
          drawSheetHeader()
          for (const r of t.rows) {
            const s = splitText(doc, String(r?.step ?? ''), colW - 3)
            const e = splitText(doc, String(r?.expected ?? ''), colW - 3)
            const a = splitText(doc, String(r?.actual ?? ''), colW - 3)
            const hLines = Math.max(s.length, e.length, a.length)
            const rowH = Math.max(6, hLines * 4 + 2)
            if (ensureSpace(rowH + 2)) {
              drawSheetHeader()
            }
            // Row box and vertical lines
            doc.rect(tableX, y, totalW, rowH)
            for (let i = 1; i < cols.length; i++) {
              const vx = tableX + i * colW
              doc.line(vx, y, vx, y + rowH)
            }
            // Cell text
            const cells = [s, e, a]
            cells.forEach((lines, idx) => {
              const x = tableX + idx * colW + 1.5
              for (let k = 0; k < lines.length; k++) {
                doc.text(lines[k], x, y + 4 + k * 4)
              }
            })
            y += rowH
          }
          // Extra spacing after the FPT sheet table
          sectionGap(6)
          tableRendered = true
        } else if (tbl && Array.isArray(tbl.rows)) {
          // Render table columns/rows with grid
          const cols = tbl.columns as Array<{ key: string; name: string }>
          const rows = tbl.rows as Array<Record<string, any>>
          if (cols.length) {
            const totalW = pageWidth - margin * 2 - 2
            const baseW = totalW / cols.length
            const tableX = margin + 1
            const drawTableHeader = () => {
              ensureSpace(8)
              doc.setFont('helvetica', 'bold')
              const headerH = 6
              // Header background (slight blue shading) and box
              doc.setFillColor(235, 241, 250)
              doc.rect(tableX, y, totalW, headerH, 'F')
              doc.rect(tableX, y, totalW, headerH)
              // Vertical lines
              for (let i = 1; i < cols.length; i++) {
                const vx = tableX + i * baseW
                doc.line(vx, y, vx, y + headerH)
              }
              // Header text
              cols.forEach((c, idx) => {
                const x = tableX + idx * baseW + 1.5
                const name = String(c.name || '')
                doc.text(name, x, y + 4)
              })
              y += headerH
              doc.setFont('helvetica', 'normal')
            }
            drawTableHeader()
            for (const r of rows) {
              // Prepare text per cell
              const prepared: string[][] = cols.map((c) => {
                const raw = isPassColumnName(c.name) ? passLabel(passCellState(r[c.key])) : String(r[c.key] ?? '')
                return splitText(doc, raw, baseW - 3)
              })
              const hLines = prepared.reduce((m, lines) => Math.max(m, lines.length), 0)
              const rowH = Math.max(6, hLines * 4 + 2)
              if (ensureSpace(rowH + 2)) {
                drawTableHeader()
              }
              // Row box and vertical lines
              doc.rect(tableX, y, totalW, rowH)
              for (let i = 1; i < cols.length; i++) {
                const vx = tableX + i * baseW
                doc.line(vx, y, vx, y + rowH)
              }
              // Text per cell
              cols.forEach((c, idx) => {
                const x = tableX + idx * baseW + 1.5
                const lines = prepared[idx]
                for (let k = 0; k < lines.length; k++) {
                  doc.text(lines[k], x, y + 4 + k * 4)
                }
              })
              y += rowH
            }
            // Extra spacing after the FPT custom table
            sectionGap(6)
            tableRendered = true
          }
        }
        // If no table was rendered (e.g., no rows), keep a small spacing
        if (!tableRendered) y += 2
      }
    }
  }

  // Issues (table similar to Issues tab)
  if (report.value.include.issues) {
    const iss: any[] = Array.isArray(issuesForEquipment.value) ? issuesForEquipment.value : []
    if (iss.length) {
      sectionGap();
      ensureSpace(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Issues', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      // Table layout based on Issues tab: Number | Type | Title | Description | Status
      const totalW = pageWidth - margin * 2 - 2
      const numW = 16
      const typeW = 26
      const titleW = 42
      const statusW = 24
      const descW = totalW - numW - typeW - titleW - statusW
      const tableX = margin + 1
      const drawIssuesHeader = () => {
        ensureSpace(8)
        doc.setFont('helvetica', 'bold')
        const headerH = 6
  // Header background (slight red shading) and box
  doc.setFillColor(250, 236, 236)
        doc.rect(tableX, y, totalW, headerH, 'F')
        doc.rect(tableX, y, totalW, headerH)
        // Vertical lines
        const colXs = [
          tableX,
          tableX + numW,
          tableX + numW + typeW,
          tableX + numW + typeW + titleW,
          tableX + numW + typeW + titleW + descW,
        ]
        for (let i = 1; i < colXs.length; i++) {
          const vx = colXs[i]
          doc.line(vx, y, vx, y + headerH)
        }
        // Header text
        doc.text('Number', tableX + 1.5, y + 4)
        doc.text('Type', tableX + numW + 1.5, y + 4)
        doc.text('Title', tableX + numW + typeW + 1.5, y + 4)
        doc.text('Description', tableX + numW + typeW + titleW + 1.5, y + 4)
        doc.text('Status', tableX + numW + typeW + titleW + descW + 1.5, y + 4)
        y += headerH
        doc.setFont('helvetica', 'normal')
      }
      drawIssuesHeader()
      for (const it of iss) {
        const numTxt = (it.number != null && it.number !== undefined) ? `#${it.number}` : '—'
        const typeTxt = String(it.type || '—')
        const titleTxt = String(it.title || '—')
        const descTxt = String(it.description || '—')
        const statusTxt = String(it.status || 'Open')
        const numLines = splitText(doc, numTxt, numW - 3)
        const typeLines = splitText(doc, typeTxt, typeW - 3)
        const titleLines = splitText(doc, titleTxt, titleW - 3)
        const descLines = splitText(doc, descTxt, descW - 3)
        const statusLines = splitText(doc, statusTxt, statusW - 3)
        const hLines = Math.max(1, numLines.length, typeLines.length, titleLines.length, descLines.length, statusLines.length)
        const rowH = Math.max(6, hLines * 4 + 2)
        if (ensureSpace(rowH + 2)) {
          drawIssuesHeader()
        }
        // Row box and vertical lines
        doc.rect(tableX, y, totalW, rowH)
        const colXs = [
          tableX,
          tableX + numW,
          tableX + numW + typeW,
          tableX + numW + typeW + titleW,
          tableX + numW + typeW + titleW + descW,
        ]
        for (let i = 1; i < colXs.length; i++) {
          const vx = colXs[i]
          doc.line(vx, y, vx, y + rowH)
        }
        // Text per cell
        let cx = tableX + 1.5
        const colLines = [numLines, typeLines, titleLines, descLines, statusLines]
        const colWidths = [numW, typeW, titleW, descW, statusW]
        for (let col = 0; col < colLines.length; col++) {
          const lines = colLines[col]
          for (let k = 0; k < lines.length; k++) {
            doc.text(lines[k], cx, y + 4 + k * 4)
          }
          cx += colWidths[col]
        }
        y += rowH
      }
      // Add spacing after issues table
      sectionGap(6)
    }
  }

  // Attachments (list and appended content at the end)
  if (report.value.include.attachments) {
    const atts: any[] = Array.isArray((form.value as any).attachments) ? (form.value as any).attachments : []
    if (atts.length) {
      sectionGap();
      ensureSpace(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Attachments', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      for (let a = 0; a < Math.min(8, atts.length); a++) {
        const name = String(atts[a]?.filename || atts[a]?.url || 'Attachment')
        const lines = splitText(doc, name, pageWidth - margin * 2)
        for (const l of lines) { ensureSpace(6); doc.text(l, margin + 2, y); y += 4 }
      }

      // Append image attachments as full pages
      const isImage = (a: any) => {
        const type = String(a?.type || '').toLowerCase()
        const name = String(a?.filename || a?.url || '').toLowerCase()
        const ext = name.split('?')[0].split('#')[0].split('.').pop() || ''
        return type.startsWith('image/') || ['png','jpg','jpeg','webp'].includes(ext)
      }
      async function getImageDims(dataUrl: string): Promise<{ w: number; h: number }> {
        return new Promise((resolve) => {
          const img = new Image()
          img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height })
          img.onerror = () => resolve({ w: 0, h: 0 })
          img.src = dataUrl
        })
      }
      for (const a of atts) {
        if (!isImage(a)) continue
        const src = a?.url || a?.data
        const img = await loadImage(src)
        if (!img.dataUrl) continue
        // New page for the image attachment
        drawFooter(); doc.addPage(); pageNo++; y = margin; drawHeader()
        const label = `Attachment: ${String(a?.filename || a?.url || '')}`
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
        ensureSpace(8); doc.text(label, margin, y); y += 4
        doc.setFont('helvetica', 'normal')
        const dims = await getImageDims(img.dataUrl)
        const maxW = pageWidth - margin * 2
        const maxH = bottomLimit - y
        let drawW = maxW, drawH = maxH
        if (dims.w > 0 && dims.h > 0) {
          const scale = Math.min(maxW / dims.w, maxH / dims.h)
          drawW = Math.max(1, Math.floor(dims.w * scale))
          drawH = Math.max(1, Math.floor(dims.h * scale))
        }
        const imgX = margin + (maxW - drawW) / 2
        const imgY = y + (maxH - drawH) / 2
        try { doc.addImage(img.dataUrl, img.format || 'JPEG', imgX, imgY, drawW, drawH) } catch {}
        // Finish this page with footer
        drawFooter()
      }
    }
  }

  // Final footer and download
  drawFooter()
  const fname = `${String((form.value as any).tag || (form.value as any).title || 'equipment')}.pdf`
  try {
    // If there are PDF attachments and attachments are included, attempt to append them using pdf-lib
    const atts: any[] = report.value.include.attachments ? (Array.isArray((form.value as any).attachments) ? (form.value as any).attachments : []) : []
    const pdfAtts = atts.filter((a: any) => {
      const type = String(a?.type || '').toLowerCase()
      const name = String(a?.filename || a?.url || '').toLowerCase()
      const ext = name.split('?')[0].split('#')[0].split('.').pop() || ''
      return type.includes('pdf') || ext === 'pdf'
    })
    if (pdfAtts.length) {
      try {
        const { PDFDocument } = await import('pdf-lib')
        const reportBytes = doc.output('arraybuffer') as ArrayBuffer
        const merged = await PDFDocument.load(reportBytes)
        for (const a of pdfAtts) {
          const url = String(a?.url || '')
          if (!url) continue
          try {
            const res = await fetch(url)
            if (!res.ok) continue
            const buf = await res.arrayBuffer()
            const attPdf = await PDFDocument.load(buf)
            const pages = await merged.copyPages(attPdf, attPdf.getPageIndices())
            pages.forEach((p: any) => merged.addPage(p))
          } catch {}
        }
        const mergedBytes = await merged.save()
        const blob = new Blob([mergedBytes], { type: 'application/pdf' })
        if (dlWin) {
          const url = URL.createObjectURL(blob)
          try { dlWin.document.title = fname } catch {}
          dlWin.location.href = url
          setTimeout(() => URL.revokeObjectURL(url), 60_000)
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = fname; a.click()
          setTimeout(() => URL.revokeObjectURL(url), 60_000)
        }
        return
      } catch {
        // fall through to default download if merging fails
      }
    }
    // Default download path (no pdf merging)
    if (dlWin) {
      const blob = doc.output('blob') as Blob
      const url = URL.createObjectURL(blob)
      try { dlWin.document.title = fname } catch {}
      dlWin.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      doc.save(fname)
    }
  } catch { doc.save(fname) }
}
</script>
