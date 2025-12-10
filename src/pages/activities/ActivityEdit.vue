<template>
  <div class="space-y-4 text-white">
    <div
      v-if="pageLoading"
      class="flex flex-col items-center justify-center py-16 text-white/70"
      role="status"
      aria-live="polite"
    >
      <span class="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      <p class="mt-3 text-sm tracking-wide uppercase">
        Loading activity…
      </p>
    </div>
    <div v-else>
      <div>
        <BreadCrumbs
          :items="crumbs"
          class="mt-1 text-white/70"
        />
      </div>

      <div class="w-full rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10">
        <!-- Tabs header -->
        <div class="mb-4 md:mb-6">
          <div
            role="tablist"
            class="relative flex items-center w-full"
          >
            <!-- animated indicator -->
            <div
              class="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out"
              :style="{ left: tabLeft + '%', width: tabWidth + '%' }"
            />
            <button
              v-for="t in tabs"
              :key="t"
              :aria-selected="currentTab === t"
              role="tab"
              class="flex-1 text-center px-3 py-2 text-sm flex items-center justify-center gap-2"
              :class="currentTab === t ? 'text-white border-b-2 border-white rounded-t-md bg-white/6' : 'text-white/70 hover:text-white/90'"
              @click="currentTab = t"
            >
              <!-- Icons per tab -->
              <!-- Info -->
              <svg
                v-if="t === 'Info'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 text-white/90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke-width="1.5"
                />
                <path
                  d="M12 11v6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M12 7h.01"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <!-- Photos -->
              <svg
                v-else-if="t === 'Photos'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 text-white/90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                  ry="2"
                  stroke-width="1.5"
                />
                <path
                  d="M8 11l3 3 2-2 4 4"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  cx="8.5"
                  cy="9.5"
                  r="1.5"
                  stroke-width="1.5"
                />
              </svg>
              <!-- Issues -->
              <svg
                v-else-if="t === 'Issues'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 text-white/90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M12 3l9 16H3l9-16z"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 9v4"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M12 17h.01"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <!-- Comments -->
              <svg
                v-else-if="t === 'Comments'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 text-white/90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.5-5A8 8 0 1 1 21 12z"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
              </svg>
              <!-- Attachments -->
              <svg
                v-else-if="t === 'Attachments'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 text-white/90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 0 1-2.83-2.83l7.07-7.07"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <!-- Equipment -->
              <svg
                v-else-if="t === 'Equipment' || t === 'Equipment Reviewed'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 text-white/90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z"
                  stroke-width="1.5"
                />
                <path
                  d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15.98 19 1.7 1.7 0 0 0 15 20.5V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.51 1.7 1.7 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.27 17.4l.06-.06A1.7 1.7 0 0 0 2.66 15 1.7 1.7 0 0 0 1.15 14H1a2 2 0 1 1 0-4h.09c.6-.12 1.09-.57 1.37-1.17l.03-.06A1.7 1.7 0 0 0 2.6 7 1.7 1.7 0 0 0 2.27 5.18l-.06-.06A2 2 0 1 1 5.04 2.29l.06.06c.5.33 1.13.45 1.73.33H7a1.7 1.7 0 0 0 1-1.51V1a2 2 0 1 1 4 0v.09c.12.6.57 1.09 1.17 1.37l.06.03A2 2 0 1 1 19.73 3.6l-.06.06c-.33.5-.45 1.13-.33 1.73V6c.46.1.9.34 1.2.64.3.3.54.74.64 1.2H21a2 2 0 1 1 0 4h-.09c-.6.12-1.09.57-1.37 1.17l-.03.06z"
                  stroke-width="1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>{{ t }}</span>
              <span
                v-if="countForTab(t) > 0"
                class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] leading-none text-white/80"
              >{{ countForTab(t) }}</span>
            </button>
          </div>
        </div>

        <!-- Tab content -->
        <div>
          <!-- Info Tab -->
          <div
            v-if="currentTab === 'Info'"
            class="grid md:grid-cols-2 gap-x-4 gap-y-1 items-start"
          >
            <div>
              <label class="block text-sm text-white/70">Name</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                placeholder="Activity name"
              >
            </div>

            <div class="md:row-span-4">
              <label class="block text-sm text-white/70">Description</label>
              <div class="rounded-md border border-white/20 bg-white/10">
                <QuillEditor
                  v-model:content="form.descriptionHtml"
                  theme="snow"
                  content-type="html"
                  class="rounded-md"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm text-white/70">Type</label>
              <div class="relative">
                <button
                  type="button"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-left flex items-center justify-between text-white/90"
                  @click="showTypeOptions"
                  @keydown.down.prevent="onTypeArrow(1)"
                  @keydown.up.prevent="onTypeArrow(-1)"
                  @keydown.enter.prevent="chooseHighlightedType"
                  @keydown.esc="hideTypeDropdown"
                  @blur="hideTypeDropdown"
                  @wheel.prevent="(e) => onTypeArrow(e.deltaY > 0 ? 1 : -1)"
                >
                  <span>{{ form.type }}</span>
                  <svg
                    class="w-4 h-4 text-white/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  v-if="showTypeDropdown"
                  class="absolute left-0 right-0 mt-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-white/20 z-20 max-h-64 overflow-auto"
                >
                  <div class="py-1">
                    <button
                      v-for="(type, i) in types"
                      :key="type"
                      type="button"
                      class="w-full px-3 py-2 text-left text-white/90"
                      :class="i === highlightedTypeIndex ? 'bg-white/20' : 'hover:bg-white/10'"
                      @mousedown.prevent="selectType(type)"
                    >
                      {{ type }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-1">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-sm text-white/70">Start Date</label>
                  <input
                    v-model="form.startDate"
                    type="date"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  >
                </div>
                <div>
                  <label class="block text-sm text-white/70">End Date</label>
                  <input
                    v-model="form.endDate"
                    type="date"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  >
                </div>
              </div>
            </div>

            <div class="mt-1">
              <label class="block text-sm text-white/70">Space</label>
              <div class="relative">
                <input
                  v-model="spaceQuery"
                  type="text"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  placeholder="Search spaces by tag, title or parent..."
                  @input="onSpaceInput"
                  @keydown.down.prevent="onSpaceArrow(1)"
                  @keydown.up.prevent="onSpaceArrow(-1)"
                  @keydown.enter.prevent="chooseHighlightedSpace"
                  @keydown.esc="hideSpaceSuggestions"
                  @focus="onSpaceFocus"
                  @blur="hideSpaceSuggestions"
                >
                <button
                  v-if="form.spaceId"
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  title="Clear selected space"
                  @click="clearSpace"
                >
                  ✕
                </button>

                <div
                  v-if="showSpaceSuggestions && filteredSpaceSuggestions.length"
                  class="absolute left-0 right-0 mt-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-white/20 z-20 max-h-64 overflow-auto"
                >
                  <div class="py-1">
                    <button
                      v-for="(s, i) in filteredSpaceSuggestions"
                      :key="s.id || s._id"
                      class="w-full px-3 py-2 text-left inline-flex items-center justify-between gap-3 text-white/90"
                      :class="i === highlightedSpaceIndex ? 'bg-white/20' : 'hover:bg-white/10'"
                      @mousedown.prevent="selectSpace(s)"
                    >
                      <span class="min-w-0 flex-1 truncate">
                        <span class="font-medium">{{ s.tag || '(no tag)' }}</span>
                        <span class="text-white/70 ml-2">{{ s.title }}</span>
                      </span>
                      <span class="text-xs text-white/60 truncate">{{ spaceParentChainLabel(s) }}</span>
                    </button>
                  </div>
                </div>
              </div>
              <input
                v-model="form.spaceId"
                type="hidden"
              >
            </div>

            <div class="md:col-span-2">
              <div class="flex items-center gap-3 mt-2 justify-end md:justify-start">
                <button
                  v-if="!isNew"
                  :disabled="downloading"
                  class="px-3 py-2 rounded-md bg-indigo-500/20 border-2 border-indigo-400/70 text-indigo-100 hover:bg-indigo-500/40 hover:border-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 inline-flex items-center gap-2 transition-colors duration-150"
                  :class="downloading ? 'opacity-60 cursor-not-allowed' : ''"
                  @click="downloadActivityPdf"
                >
                  <!-- PDF icon -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M6 2h7l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                      stroke-width="1.5"
                    />
                    <path
                      d="M13 2v6h6"
                      stroke-width="1.5"
                    />
                    <path
                      d="M7.5 16v-4h1.75a1.75 1.75 0 1 1 0 3.5H7.5z"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M13 12h2a2 2 0 0 1 0 4h-2v-4z"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M19 12h-2.5v4H19"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <span>Download PDF</span>
                </button>
                <button
                  v-if="!isNew"
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2"
                  title="Report settings"
                  @click.stop="openReportSettings"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  ><path
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.297.07 2.573-1.065z"
                    stroke-width="1.5"
                  /><path
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    stroke-width="1.5"
                  /></svg>
                  <span>Report Settings</span>
                </button>
                <button
                  :disabled="saving"
                  class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2"
                  :class="saving ? 'opacity-60 cursor-not-allowed' : ''"
                  @click="save()"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
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
                  <button
                    class="absolute bottom-1.5 right-1.5 z-10 h-7 w-7 grid place-items-center rounded-md bg-black/60 hover:bg-black/75 border border-white/20 text-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
                    title="Delete photo"
                    aria-label="Delete photo"
                    @click.stop="confirmRemove(idx)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        d="M3 6h18"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                      <path
                        d="M8 6l1-2h6l1 2"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                      <rect
                        x="6"
                        y="6"
                        width="12"
                        height="14"
                        rx="1.5"
                        stroke-width="1.5"
                      />
                      <path
                        d="M10 10v6M14 10v6"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                  <button
                    class="relative w-full h-full focus:outline-none focus:ring-2 focus:ring-white/40"
                    @click="openViewer(idx)"
                  >
                    <img
                      :src="p.data || p.url"
                      class="w-full h-full object-cover"
                    >
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Issues Tab -->
          <div
            v-else-if="currentTab === 'Issues'"
            class="space-y-3"
          >
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="text-white/80">
                Issues linked to this activity
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35 inline-flex items-center gap-2"
                  @click="openIssueModal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  ><path
                    d="M12 5v14"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  /><path
                    d="M5 12h14"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  /></svg>
                  <span>Add Issue</span>
                </button>
                <RouterLink
                  to="/issues"
                  class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2"
                >
                  Manage Issues
                </RouterLink>
              </div>
            </div>
            <IssuesTable :issues="issuesForActivity" />
          </div>

          <!-- Logs Tab -->
          <div
            v-else-if="currentTab === 'Logs'"
            class="space-y-3"
          >
            <div class="flex items-center justify-between">
              <div class="text-white/80">
                Activity logs
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  @click="loadLogs"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div
              v-if="logsLoading"
              class="text-white/70 flex items-center gap-2"
            >
              <Spinner class="w-5 h-5" />
              <span>Loading logs...</span>
            </div>
            <div v-else>
              <div
                v-if="logsList.length === 0"
                class="text-white/60"
              >
                No logs yet.
              </div>
              <ul
                v-else
                class="space-y-2"
              >
                <li
                  v-for="(l, idx) in logsList"
                  :key="idx"
                  class="rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="text-sm text-white/80">
                      <span class="font-semibold">{{ l.type }}</span>
                      <span class="text-white/60"> — {{ l.message }}</span>
                    </div>
                    <div class="text-xs text-white/60">
                      {{ formatDateTime(l.ts) }} • {{ l.by || 'System' }}
                    </div>
                  </div>
                  <div
                    v-if="l.details"
                    class="mt-2 text-xs text-white/60 truncate"
                  >
                    {{ JSON.stringify(l.details) }}
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Comments Tab -->
          <div
            v-else-if="currentTab === 'Comments'"
            class="space-y-4"
          >
            <Comments
              :model-value="form.comments"
              :on-add="onAddComment"
              :on-delete="onDeleteComment"
              @update:model-value="(v:any) => form.comments = v"
            />
          </div>

          <!-- Attachments Tab -->
          <div
            v-else-if="currentTab === 'Attachments'"
            class="space-y-4"
          >
            <div>
              <label class="block text-sm text-white/70">Upload files</label>
              <DocumentUploader
                button-label="Upload Files"
                :upload="uploadDocument"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/*"
                :multiple="true"
                :concurrency="3"
                @done="finalizeNewActivityIfNeeded"
              />
              <div class="mt-2 text-xs text-white/60">
                Accepted: PDF, Word, Excel, PowerPoint, CSV, TXT, and images (JPG/PNG). Max ~10MB per file.
              </div>
            </div>
            <!-- Manual link add (optional) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label class="block text-sm text-white/70">Filename</label>
                <input
                  v-model="newAttachment.filename"
                  type="text"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  placeholder="specs.pdf"
                >
              </div>
              <div>
                <label class="block text-sm text-white/70">URL</label>
                <input
                  v-model="newAttachment.url"
                  type="url"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  placeholder="https://..."
                >
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30"
                  @click="addAttachment"
                >
                  Add
                </button>
              </div>
            </div>
            <div>
              <label class="block text-sm text-white/70 mb-1">Attachments</label>
              <div
                v-if="!form.attachments.length"
                class="text-white/60"
              >
                No attachments added.
              </div>
              <ul class="space-y-2">
                <li
                  v-for="(a, i) in form.attachments"
                  :key="i"
                  class="p-2 rounded-md bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div class="flex items-start gap-3 min-w-0">
                    <!-- Type icon (click to open viewer) -->
                    <button
                      class="w-7 h-7 grid place-items-center rounded-md bg-white/10 border border-white/20 shrink-0 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                      title="Preview"
                      @click="openAttachment(i)"
                    >
                      <!-- PDF -->
                      <svg
                        v-if="attachmentKind(a) === 'pdf'"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4 text-red-300"
                      >
                        <path
                          d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                          stroke-width="1.5"
                        />
                        <path
                          d="M13 2v6h6"
                          stroke-width="1.5"
                        />
                      </svg>
                      <!-- Sheet -->
                      <svg
                        v-else-if="attachmentKind(a) === 'sheet'"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4 text-green-300"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="18"
                          height="16"
                          rx="2"
                          stroke-width="1.5"
                        />
                        <path
                          d="M3 9h18M8 4v16M14 4v16"
                          stroke-width="1.5"
                        />
                      </svg>
                      <!-- Word/Text -->
                      <svg
                        v-else-if="attachmentKind(a) === 'word' || attachmentKind(a) === 'txt'"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4"
                        :class="attachmentKind(a) === 'word' ? 'text-blue-300' : 'text-gray-300'"
                      >
                        <rect
                          x="4"
                          y="4"
                          width="16"
                          height="16"
                          rx="2"
                          stroke-width="1.5"
                        />
                        <path
                          d="M7 9h10M7 12h10M7 15h7"
                          stroke-width="1.5"
                        />
                      </svg>
                      <!-- PowerPoint -->
                      <svg
                        v-else-if="attachmentKind(a) === 'ppt'"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4 text-orange-300"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke-width="1.5"
                        />
                        <path
                          d="M12 12h6a6 6 0 0 0-6-6v6z"
                          stroke-width="1.5"
                        />
                      </svg>
                      <!-- Image -->
                      <svg
                        v-else-if="attachmentKind(a) === 'image'"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4 text-purple-300"
                      >
                        <rect
                          x="3"
                          y="5"
                          width="18"
                          height="14"
                          rx="2"
                          ry="2"
                          stroke-width="1.5"
                        />
                        <path
                          d="M8 13l3-3 5 6"
                          stroke-width="1.5"
                        />
                        <circle
                          cx="8"
                          cy="9"
                          r="1.5"
                          stroke-width="1.5"
                        />
                      </svg>
                      <!-- Zip -->
                      <svg
                        v-else-if="attachmentKind(a) === 'zip'"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4 text-yellow-300"
                      >
                        <rect
                          x="5"
                          y="3"
                          width="14"
                          height="18"
                          rx="2"
                          stroke-width="1.5"
                        />
                        <path
                          d="M12 4v3m0 2v3m0 2v3"
                          stroke-width="1.5"
                        />
                      </svg>
                      <!-- Link -->
                      <svg
                        v-else-if="attachmentKind(a) === 'link'"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4 text-indigo-300"
                      >
                        <path
                          d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"
                          stroke-width="1.5"
                        />
                        <path
                          d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1"
                          stroke-width="1.5"
                        />
                      </svg>
                      <!-- Default file -->
                      <svg
                        v-else
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4 text-white/80"
                      >
                        <path
                          d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                          stroke-width="1.5"
                        />
                        <path
                          d="M13 2v6h6"
                          stroke-width="1.5"
                        />
                      </svg>
                    </button>
                    <!-- Name + metadata -->
                    <div class="min-w-0">
                      <!-- File name (click to open viewer) -->
                      <button
                        class="truncate text-left text-sm hover:underline focus:outline-none"
                        @click="openAttachment(i)"
                      >
                        {{ a.filename || fileNameFromUrl(a.url) }}
                      </button>
                      <div
                        v-if="attachmentMeta(a)"
                        class="text-xs text-white/60 truncate"
                      >
                        {{ attachmentMeta(a) }}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="h-8 w-8 grid place-items-center rounded-md bg-indigo-500/20 border-2 border-indigo-400/80 text-indigo-200 hover:bg-indigo-500/50 hover:border-indigo-500/90 hover:text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-colors duration-150"
                      title="Download"
                      aria-label="Download"
                      @click="downloadAttachment(a)"
                    >
                      <!-- Download icon -->
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4"
                      >
                        <path
                          d="M12 3v10"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                        <path
                          d="M8 11l4 4 4-4"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M5 19h14"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>
                    <button
                      class="h-8 w-8 grid place-items-center rounded-md bg-red-500/20 border-2 border-red-400/80 text-red-200 hover:bg-red-500/50 hover:border-red-500/90 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/60 transition-colors duration-150"
                      title="Remove"
                      aria-label="Remove"
                      @click="removeAttachment(i)"
                    >
                      <!-- Trash icon (consistent with Photos delete) -->
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4"
                      >
                        <path
                          d="M3 6h18"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                        <path
                          d="M8 6l1-2h6l1 2"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                        <rect
                          x="6"
                          y="6"
                          width="12"
                          height="14"
                          rx="1.5"
                          stroke-width="1.5"
                        />
                        <path
                          d="M10 10v6M14 10v6"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Equipment Tab -->
          <div
            v-else-if="currentTab === 'Equipment'"
            class="space-y-3"
          >
            <!-- Quick chips showing currently selected systems/tags -->
            <div>
              <label class="block text-sm text-white/70">Search by tag/title/system to add</label>
              <div class="relative">
                <input
                  v-model="systemsText"
                  type="text"
                  class="w-full px-3 py-2 rounded-md bg-white/20 border border-white/30 placeholder-gray-400 backdrop-blur-sm"
                  placeholder="Type a tag, title, or system, then press Enter"
                  @keydown.enter.prevent="addByQuery"
                  @keydown.down.prevent="onArrowDown"
                  @keydown.up.prevent="onArrowUp"
                  @keydown.esc.prevent="onEsc"
                  @focus="openSuggestions"
                  @input="openSuggestions"
                  @blur="onInputBlur"
                >
                <!-- Suggestions dropdown -->
                <div
                  v-if="showSuggestions"
                  class="absolute left-0 right-0 mt-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-white/20 z-20 max-h-64 overflow-auto"
                >
                  <div class="py-1">
                    <button
                      v-for="(s, i) in suggestions"
                      :key="s.id"
                      class="w-full px-3 py-2 text-left inline-flex items-center justify-between gap-3 text-white/90"
                      :class="i === highlightedIndex ? 'bg-white/15' : 'hover:bg-white/10'"
                      @click="addSuggestion(s)"
                    >
                      <span class="min-w-0 flex-1 truncate">
                        <span class="font-medium">{{ s.tag }}</span>
                        <span class="text-white/70 ml-2">{{ s.title }}</span>
                      </span>
                      <span class="text-xs text-white/60 truncate max-w-[40%]">{{ equipmentBreadcrumbLabel(s) }}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="text-xs text-white/60 mt-1">
                Press Enter to add. The table below shows only the selected equipment.
              </div>
            </div>

            <!-- Selected equipment table (no extra filter) -->
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="text-white/80">
                Selected equipment
              </div>
              <div
                v-if="selectedEquip.length"
                class="flex items-center gap-3"
              >
                <div class="text-xs text-white/60">
                  Showing {{ (equipPage - 1) * equipPerPage + 1 }}–{{ Math.min(equipPage * equipPerPage, selectedEquip.length) }} of {{ selectedEquip.length }}
                </div>
                <div class="flex items-center gap-2">
                  <select
                    v-model.number="equipPerPage"
                    class="px-2 py-1 rounded bg-white/6 text-white/90 text-sm border border-white/10"
                  >
                    <option :value="5">
                      5
                    </option>
                    <option :value="10">
                      10
                    </option>
                    <option :value="25">
                      25
                    </option>
                    <option :value="50">
                      50
                    </option>
                    <option :value="100">
                      100
                    </option>
                  </select>
                  <button
                    :disabled="equipPage <= 1"
                    class="px-2 py-1 rounded-md bg-white/6 border border-white/10 text-white/80 disabled:opacity-50"
                    @click="equipPage = Math.max(1, equipPage - 1)"
                  >
                    Prev
                  </button>
                  <div class="text-xs text-white/80">
                    Page {{ equipPage }} / {{ equipTotalPages }}
                  </div>
                  <button
                    :disabled="equipPage >= equipTotalPages"
                    class="px-2 py-1 rounded-md bg-white/6 border border-white/10 text-white/80 disabled:opacity-50"
                    @click="equipPage = Math.min(equipTotalPages, equipPage + 1)"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="!selectedEquip.length && !equipmentLoading"
              class="text-white/60"
            >
              No equipment selected yet. Add tags above.
            </div>
            <div
              v-else
              class="overflow-x-auto rounded-md border border-white/10"
            >
              <table class="min-w-full text-sm">
                <thead class="bg-white/5 text-white/70">
                  <tr>
                    <th class="text-left px-3 py-2">
                      Tag
                    </th>
                    <th class="text-left px-3 py-2">
                      Title
                    </th>
                    <th class="text-left px-3 py-2">
                      Location
                    </th>
                    <th class="text-left px-3 py-2">
                      Status
                    </th>
                    <th class="text-right px-3 py-2">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="e in pagedEquip"
                    :key="e.id || e._id"
                    class="border-t border-white/10 hover:bg-white/5"
                  >
                    <td class="px-3 py-2 align-middle whitespace-nowrap">
                      {{ e.tag || '—' }}
                    </td>
                    <td class="px-3 py-2 align-middle truncate">
                      {{ e.title || '—' }}
                    </td>
                    <td class="px-3 py-2 align-middle truncate">
                      {{ equipmentLocationBreadcrumb(e) }}
                    </td>
                    <td class="px-3 py-2 align-middle whitespace-nowrap">
                      {{ e.status || 'Not Started' }}
                    </td>
                    <td class="px-3 py-2 align-middle text-right">
                      <div class="inline-flex items-center gap-2">
                        <button
                          class="h-8 w-8 inline-grid place-items-center rounded-md bg-red-500/15 border border-red-500/30 text-red-200 hover:bg-red-500/25"
                          title="Remove from Reviewed"
                          aria-label="Remove"
                          @click="removeReviewedTag(e)"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            class="w-4 h-4"
                          ><path
                            d="M5 12h14"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          /></svg>
                        </button>
                        <RouterLink
                          :to="{ name: 'equipment-edit', params: { id: e.id } }"
                          class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                          title="Open"
                          aria-label="Open"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            class="w-4 h-4"
                          ><path
                            d="M4 12h16"
                            stroke-width="1.5"
                            stroke-linecap="round"
                          /><path
                            d="M14 6l6 6-6 6"
                            stroke-width="1.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          /></svg>
                        </RouterLink>
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

    <Modal v-model="viewerOpen">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-medium">
            Photo {{ photos.length ? (viewerIndex + 1) : 0 }} / {{ photos.length }}
          </div>
          <div class="text-white/70 text-sm">
            Click outside or press Esc to close
          </div>
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
          >
          <!-- Photo meta -->
          <div class="p-3 border-t border-white/10 bg-black/30">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                <img
                  v-if="photos[viewerIndex]?.uploadedByAvatar"
                  :src="photos[viewerIndex]?.uploadedByAvatar"
                  class="w-full h-full object-cover"
                  alt="avatar"
                >
                <span
                  v-else
                  class="text-[10px]"
                >{{ initialsFromName(photos[viewerIndex]?.uploadedByName || '') }}</span>
              </div>
              <div class="text-xs text-white/80">
                <div class="font-medium text-white/90">
                  {{ photos[viewerIndex]?.uploadedByName || 'Unknown' }}
                </div>
                <div class="text-white/60">
                  Uploaded {{ formatDateTime(photos[viewerIndex]?.createdAt) }}
                </div>
              </div>
            </div>
            <!-- Caption editor -->
            <div class="mt-3 flex items-center gap-2">
              <input
                v-model="captionValue"
                type="text"
                placeholder="Add a caption..."
                class="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
              >
              <button
                :disabled="savingCaption"
                class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30"
                :class="savingCaption ? 'opacity-60 cursor-not-allowed' : ''"
                @click="saveCaption"
              >
                Save
              </button>
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-white/70"
        >
          No photos
        </div>
      </div>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
              @click="prevPhoto"
            >
              Prev
            </button>
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
              @click="nextPhoto"
            >
              Next
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button
              :disabled="zoom <= 1"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50"
              @click="zoomOut"
            >
              Zoom -
            </button>
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
              @click="zoomIn"
            >
              Zoom +
            </button>
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
              @click="rotateRight"
            >
              Rotate
            </button>
            <button
              class="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/40 hover:bg-red-500/30 text-red-200"
              @click="deleteCurrentPhoto"
            >
              Delete
            </button>
            <button
              class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30"
              @click="closeViewer"
            >
              Close
            </button>
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
            <div class="font-medium truncate">
              {{ selectedAttachment?.filename || fileNameFromUrl(selectedAttachment?.url) }}
            </div>
            <div
              v-if="selectedAttachment && attachmentMeta(selectedAttachment)"
              class="text-xs text-white/60 truncate"
            >
              {{ attachmentMeta(selectedAttachment) }}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm inline-flex items-center gap-1"
              :title="attachmentFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
              @click="attachmentFullscreen = !attachmentFullscreen"
            >
              <svg
                v-if="!attachmentFullscreen"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <!-- Previous fullscreen icon: outward corners -->
                <path
                  d="M4 9V4h5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M20 9V4h-5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M4 15v5h5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M20 15v5h-5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <!-- Arrows pointing inward -->
                <path
                  d="M4 4l5 5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M20 4l-5 5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M4 20l5-5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M20 20l-5-5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <span>{{ attachmentFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
            </button>
            <button
              v-if="selectedAttachmentUrl"
              class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
              @click="openInNewTab(selectedAttachmentUrl)"
            >
              Open in new tab
            </button>
            <button
              v-if="selectedAttachment"
              class="px-3 py-1.5 rounded-md bg-indigo-500/20 border-2 border-indigo-400/70 text-indigo-100 hover:bg-indigo-500/40 hover:border-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 text-sm transition-colors duration-150"
              @click="downloadAttachment(selectedAttachment)"
            >
              Download
            </button>
          </div>
        </div>
      </template>
      <div
        class="w-full overflow-auto"
        :style="{ maxHeight: viewerMaxH }"
      >
        <div
          v-if="selectedKind === 'image'"
          class="w-full h-full"
        >
          <img
            :src="selectedAttachmentUrl"
            class="max-w-full object-contain block mx-auto"
            :style="{ maxHeight: viewerInnerH }"
          >
        </div>
        <div
          v-else-if="selectedKind === 'pdf'"
          class="w-full"
        >
          <iframe
            :src="selectedAttachmentUrl"
            class="w-full rounded-md border border-white/10 bg-black/10"
            :style="{ height: viewerInnerH }"
          />
        </div>
        <div
          v-else
          class="p-4 text-white/80 space-y-3"
        >
          <div>Preview not available for this file type.</div>
          <div class="flex items-center gap-2">
            <button
              v-if="selectedAttachmentUrl"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
              @click="openInNewTab(selectedAttachmentUrl)"
            >
              Open in new tab
            </button>
            <button
              v-if="selectedAttachment"
              class="px-3 py-2 rounded-md bg-indigo-500/20 border-2 border-indigo-400/70 text-indigo-100 hover:bg-indigo-500/40 hover:border-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 transition-colors duration-150"
              @click="downloadAttachment(selectedAttachment)"
            >
              Download
            </button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end">
          <button
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30"
            @click="attachmentViewerOpen = false"
          >
            Close
          </button>
        </div>
      </template>
    </Modal>

    <!-- Create Issue Modal -->
    <Modal v-model="showIssueModal">
      <template #header>
        <div class="text-lg font-semibold">
          Add Issue for Activity
        </div>
      </template>
      <div class="space-y-3">
        <input
          v-model="activityIssueDraft.title"
          type="text"
          class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
          placeholder="Issue title"
        >
        <div>
          <label class="block text-sm text-white/70">Description</label>
          <textarea
            v-model="activityIssueDraft.description"
            rows="4"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
            placeholder="Describe the issue"
          />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm text-white/70">Type</label>
            <input
              v-model="activityIssueDraft.type"
              type="text"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
              placeholder="Activity"
            >
          </div>
          <div>
            <label class="block text-sm text-white/70">Priority</label>
            <select
              v-model="activityIssueDraft.priority"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-white/70">Assign To</label>
            <input
              v-model="activityIssueDraft.assignedTo"
              type="text"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
              placeholder="email or name"
            >
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
            @click="closeIssueModal"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35"
            @click="createActivityIssue"
          >
            Create
          </button>
        </div>
      </template>
    </Modal>

    <!-- Activity Report Settings Modal -->
    <Modal
      :model-value="showActivityReportDialog"
      @update:model-value="showActivityReportDialog = $event"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="text-lg">
            Activity Report Settings
          </div>
        </div>
      </template>
      <div class="space-y-4 text-sm">
        <div class="grid grid-cols-2 gap-3">
          <label class="inline-flex items-center gap-2">
            <input
              v-model="activityReport.include.info"
              type="checkbox"
              class="rounded"
            >
            <span>Info</span>
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              v-model="activityReport.include.description"
              type="checkbox"
              class="rounded"
            >
            <span>Description</span>
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              v-model="activityReport.include.photos"
              type="checkbox"
              class="rounded"
            >
            <span>Photos</span>
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              v-model="activityReport.include.issues"
              type="checkbox"
              class="rounded"
            >
            <span>Issues</span>
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              v-model="activityReport.include.attachments"
              type="checkbox"
              class="rounded"
            >
            <span>Attachments</span>
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              v-model="activityReport.include.equipmentReports"
              type="checkbox"
              class="rounded"
            >
            <span>Append Equipment Reports</span>
          </label>
        </div>
        <div class="grid grid-cols-2 gap-3 items-center">
          <label class="text-white/80">Photo limit</label>
          <input
            v-model.number="activityReport.photoLimit"
            type="number"
            min="0"
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 w-28"
          >
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-between w-full">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
            @click="resetActivityReportSettings"
          >
            Reset
          </button>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
              @click="showActivityReportDialog = false"
            >
              Cancel
            </button>
            <button
              class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35"
              @click="saveActivityReportSettings"
            >
              Save
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, computed, ref, watch } from 'vue'
import { jsPDF } from 'jspdf'
// Ensure html2canvas is available for jsPDF html() rendering
import html2canvas from 'html2canvas'
;(window as any).html2canvas = (window as any).html2canvas || html2canvas
import axios from 'axios'
import http from '../../utils/http'
import { useRoute, useRouter } from 'vue-router'
import { useActivitiesStore } from '../../stores/activities'
import { useProjectStore } from '../../stores/project'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import PhotoUploader from '../../components/PhotoUploader.vue'
import DocumentUploader from '../../components/DocumentUploader.vue'
import { useUiStore } from '../../stores/ui'
import Comments from '../../components/Comments.vue'
import { useAuthStore } from '../../stores/auth'
import { getAuthHeaders } from '../../utils/auth'
import { confirm as inlineConfirm } from '../../utils/confirm'
import IssuesTable from '../../components/IssuesTable.vue'
import { useIssuesStore } from '../../stores/issues'
import { useEquipmentStore } from '../../stores/equipment'
import { useSpacesStore } from '../../stores/spaces'
import Spinner from '../../components/Spinner.vue'

// Accept route params passed as attrs to avoid extraneous attribute warnings when rendering fragments
const props = defineProps<{ id?: string }>()
const route = useRoute()
const router = useRouter()
const store = useActivitiesStore()
const projectStore = useProjectStore()
const auth = useAuthStore()
const ui = useUiStore()
const issuesStore = useIssuesStore()
const equipmentStore = useEquipmentStore()
const spacesStore = useSpacesStore()

const id = computed(() => String(props.id || route.params.id || ''))
const isNew = computed(() => id.value === 'new')
const pageLoading = ref(true)
const saving = ref(false)
const downloading = ref(false)
// When creating a brand new activity via photo upload, hold the created id
const pendingCreatedId = ref<string | null>(null)

// -----------------------------
// Activity Report Settings
// -----------------------------
const ACTIVITY_REPORT_SESSION_KEY = 'activityReportSettings'
interface ActivityReportSettings {
  include: {
    info: boolean
    description: boolean
    photos: boolean
    issues: boolean
    attachments: boolean
    equipmentReports: boolean
  }
  photoLimit: number
}
const activityReport = ref<ActivityReportSettings>({
  include: { info: true, description: true, photos: true, issues: true, attachments: true, equipmentReports: true },
  photoLimit: 6,
})
const showActivityReportDialog = ref(false)
function openReportSettings() {
  showActivityReportDialog.value = true
}
function loadActivityReportSettingsFromSession() {
  try {
    const raw = sessionStorage.getItem(ACTIVITY_REPORT_SESSION_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      activityReport.value = {
        include: { ...activityReport.value.include, ...(parsed.include || {}) },
        photoLimit: Math.max(0, Number(parsed.photoLimit ?? activityReport.value.photoLimit)),
      }
    }
  } catch (e) { /* ignore sessionStorage read errors */ }
}
function saveActivityReportSettings() {
  try { sessionStorage.setItem(ACTIVITY_REPORT_SESSION_KEY, JSON.stringify(activityReport.value)) } catch (e) { /* ignore sessionStorage write errors */ }
  showActivityReportDialog.value = false
}
function resetActivityReportSettings() {
  activityReport.value = { include: { info: true, description: true, photos: true, issues: true, attachments: true, equipmentReports: true }, photoLimit: 6 }
}
watch(activityReport, () => { try { sessionStorage.setItem(ACTIVITY_REPORT_SESSION_KEY, JSON.stringify(activityReport.value)) } catch (e) { /* ignore sessionStorage write errors */ } }, { deep: true })

const types = [ 
  'Assessment',
  'BOD Review',
  'Construction Checklist',
  'Cx Meeting', 
  'Design Review', 
  'Functional Test',
  'Installation Review',
  'OPR Review', 
  'Owners Manual Review',
  'Schedule Integration', 
  'Seasonal Test',
  'Site Visit Review', 
  'Startup Review', 
  'Submittal Review', 
  'Training Review', 
  'Test and Balance Review',
  'Other'
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
  // selected space id (if chosen via the space picker)
  spaceId: null as string | null,
  systems: [] as string[],
  comments: [] as any[],
  attachments: [] as any[],
  issues: [] as string[],
})


const systemsText = ref('')

// Space fuzzy-picker state
const spaceQuery = ref(form.location || '')
const showSpaceSuggestions = ref(false)
const highlightedSpaceIndex = ref(-1)

function spacesById(): Record<string, any> {
  const raw = (spacesStore as any).byId
  if (!raw) return {}
  if (typeof raw === 'object' && 'value' in raw) {
    const v = (raw as any).value
    return v && typeof v === 'object' ? v as Record<string, any> : {}
  }
  return typeof raw === 'object' ? raw as Record<string, any> : {}
}

function getSpaceById(id: any): any | null {
  const key = typeof id === 'string' ? id.trim() : id != null ? String(id) : ''
  if (!key || key === 'undefined' || key === 'null') return null
  const map = spacesById()
  if (map && map[key]) return map[key]
  return (spacesStore.items || []).find((s: any) => String(s.id || s._id) === key) || null
}

function normalizeIdValue(value: any): string {
  if (value && typeof value === 'object' && 'value' in value) {
    value = (value as any).value
  }
  const str = typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : ''
  if (!str || str === 'undefined' || str === 'null' || str === '[object Object]') return ''
  return str
}

function resolvedProjectId(): string {
  return normalizeIdValue(form.projectId) || normalizeIdValue(projectStore.currentProjectId) || normalizeIdValue(localStorage.getItem('selectedProjectId'))
}

async function ensureSpaceDataLoaded() {
  if (Array.isArray(spacesStore.items) && spacesStore.items.length) return
  const loadingFlag = (typeof spacesStore.loading === 'object' && spacesStore.loading && 'value' in spacesStore.loading)
    ? (spacesStore.loading as any).value
    : spacesStore.loading
  if (loadingFlag) return
  const pid = resolvedProjectId()
  if (!pid) return
  try {
    await spacesStore.fetchByProject(pid)
  } catch (e) {
    // best effort; UI already shows empty state on failure
  }
}

// Type dropdown state
const showTypeDropdown = ref(false)
const highlightedTypeIndex = ref(-1)

function simpleFuzzyMatch(text: string, pattern: string) {
  // subsequence match (characters in order)
  if (!pattern) return true
  let pi = 0
  for (let i = 0; i < text.length && pi < pattern.length; i++) {
    if (text[i] === pattern[pi]) pi++
  }
  return pi === pattern.length
}

const allSpaces = computed(() => (spacesStore.items || []).map(s => s))

const filteredSpaceSuggestions = computed(() => {
  const q = (spaceQuery.value || '').trim().toLowerCase()
  if (!q) return allSpaces.value.slice(0, 50)
  const out: any[] = []
  for (const s of allSpaces.value) {
    const tag = String(s.tag || '').toLowerCase()
    const title = String(s.title || '').toLowerCase()
    // parent chain label
    const chain = String(spaceParentChainLabel(s)).toLowerCase()
    if (tag.includes(q) || title.includes(q) || chain.includes(q) || simpleFuzzyMatch(tag + ' ' + title + ' ' + chain, q)) {
      out.push(s)
    }
    if (out.length >= 200) break
  }
  return out
})

function spaceParentChainLabel(s: any) {
  try {
    const parts: string[] = []
    let cur: any = s
    // walk up parents to build Parent > Child chain (limit depth to avoid cycles)
    let depth = 0
    while (cur && depth < 10) {
      const title = String(cur.title || cur.tag || '')
      if (title) parts.unshift(title)
      const pid = cur.parentSpace || cur.parent || null
      if (!pid) break
      cur = getSpaceById(pid)
      depth++
    }
    return parts.join(' > ')
  } catch (e) { return '' }
}

function equipmentBreadcrumbLabel(equipment: any) {
  try {
    if (!equipment?.spaceId) return equipment?.tag || ''

    const space = getSpaceById(equipment.spaceId)
    if (!space) return equipment?.tag || ''

    const spaceChain = spaceParentChainLabel(space)
    const equipmentTag = String(equipment?.tag || '')

    return spaceChain ? `${spaceChain} > ${equipmentTag}` : equipmentTag
  } catch (e) { 
    return equipment?.tag || ''
  }
}

function equipmentLocationBreadcrumb(equipment: any) {
  try {
    if (!equipment?.spaceId) return '—'

    const space = getSpaceById(equipment.spaceId)
    if (!space) return '—'

    return spaceParentChainLabel(space) || space.title || space.tag || '—'
  } catch (e) { 
    return '—'
  }
}

function onSpaceInput() {
  highlightedSpaceIndex.value = -1
  showSpaceSuggestions.value = true
  ensureSpaceDataLoaded().catch(() => {})
}

function onSpaceFocus() {
  showSpaceSuggestions.value = true
  ensureSpaceDataLoaded().catch(() => {})
}

function onSpaceArrow(dir: number) {
  const len = filteredSpaceSuggestions.value.length
  if (!len) return
  let idx = highlightedSpaceIndex.value
  if (idx === -1) idx = dir > 0 ? -1 : 0
  idx = (idx + dir + len) % len
  highlightedSpaceIndex.value = idx
}

function chooseHighlightedSpace() {
  const idx = highlightedSpaceIndex.value
  const list = filteredSpaceSuggestions.value
  if (idx >= 0 && idx < list.length) selectSpace(list[idx])
  else if (list.length === 1) selectSpace(list[0])
}

function hideSpaceSuggestions() {
  showSpaceSuggestions.value = false
  highlightedSpaceIndex.value = -1
}

function selectSpace(s: any) {
  try {
    const id = String(s.id || s._id || '')
    form.spaceId = id
    // Use the Parent > ... > Child breadcrumb chain for the input display
    const canonical = getSpaceById(id) || s
    const chain = spaceParentChainLabel(canonical) || (canonical?.title || canonical?.tag || '')
    form.location = chain
    spaceQuery.value = chain
  } catch (e) { /* ignore */ }
  hideSpaceSuggestions()
}

function clearSpace() {
  form.spaceId = null
  form.location = ''
  spaceQuery.value = ''
  hideSpaceSuggestions()
}

// Type dropdown functions
function showTypeOptions() {
  showTypeDropdown.value = true
  highlightedTypeIndex.value = -1
}

function hideTypeDropdown() {
  showTypeDropdown.value = false
  highlightedTypeIndex.value = -1
}

function onTypeArrow(dir: number) {
  const len = types.length
  if (!len) return
  
  if (!showTypeDropdown.value) {
    // If dropdown is closed, directly change the type
    const currentIndex = types.indexOf(form.type)
    const newIndex = (currentIndex + dir + len) % len
    form.type = types[newIndex]
  } else {
    // If dropdown is open, navigate through options
    let idx = highlightedTypeIndex.value
    if (idx === -1) idx = dir > 0 ? -1 : 0
    idx = (idx + dir + len) % len
    highlightedTypeIndex.value = idx
  }
}

function selectType(type: string) {
  form.type = type
  hideTypeDropdown()
}

function chooseHighlightedType() {
  const idx = highlightedTypeIndex.value
  if (idx >= 0 && idx < types.length) {
    selectType(types[idx])
  }
}

const crumbs = computed(() => [
  { text: 'Dashboard', to: '/' },
  { text: 'Activities', to: '/activities' },
  { text: isNew.value ? 'New Activity' : (form.name || 'Edit Activity'), to: '#' }
])

onMounted(async () => {
  pageLoading.value = true
  try {
    loadActivityReportSettingsFromSession()
    const pid = projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''
    if (pid) form.projectId = String(pid)
    const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth()+1).padStart(2,'0'); const dd = String(today.getDate()+0).padStart(2,'0')
    form.startDate = `${yyyy}-${mm}-${dd}`; form.endDate = `${yyyy}-${mm}-${dd}`
    if (!isNew.value) {
      const activityData = await store.fetchActivity(id.value, { light: true, includePhotos: false })
      Object.assign(form, {
        name: activityData?.name || '',
        descriptionHtml: activityData?.descriptionHtml || '',
        type: activityData?.type || 'Site Visit Review',
        startDate: activityData?.startDate ? activityData.startDate.substring(0,10) : form.startDate,
        endDate: activityData?.endDate ? activityData.endDate.substring(0,10) : form.endDate,
        projectId: activityData?.projectId || form.projectId,
        location: activityData?.location || '',
        spaceId: (activityData as any)?.spaceId || null,
        systems: activityData?.systems || [],
      })
      try {
        if (form.spaceId) {
          const sid = String((form.spaceId as any) || '')
          form.spaceId = sid
          const sp = getSpaceById(sid)
          const chain = sp ? (spaceParentChainLabel(sp) || (sp.title || sp.tag || '')) : (form.location || '')
          form.location = chain || form.location || ''
          spaceQuery.value = chain || String(form.location || '')
        } else {
          spaceQuery.value = String(form.location || '')
        }
      } catch (e) { /* ignore */ }
      systemsText.value = ''
    }
  } finally {
    pageLoading.value = false
  }
})

const currentTab = ref('Info')
const photosLoaded = ref(false)
const issuesLoaded = ref(false)
const commentsLoaded = ref(false)
const attachmentsLoaded = ref(false)
const equipmentLoaded = ref(false)
const logsLoaded = ref(false)
const fullEquipmentCache = new Map<string, any>()

// Ensure all heavy data is loaded before generating reports (photos, attachments, issues, equipment)
async function ensureReportData() {
  const pid = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
  try {
    const full = await store.fetchActivity(id.value, { includePhotos: true })
    if (full) {
      Object.assign(form, full)
      photosLoaded.value = true
      attachmentsLoaded.value = true
      commentsLoaded.value = true
    }
  } catch (e) { /* best effort */ }
  try {
    if (pid) {
      await issuesStore.fetchIssues(pid)
      issuesLoaded.value = true
    }
  } catch (e) { /* ignore */ }
  try {
    if (pid) {
      await Promise.all([ equipmentStore.fetchByProject(pid), spacesStore.fetchByProject(pid) ])
      equipmentLoaded.value = true
    }
  } catch (e) { /* ignore */ }
}

watch(() => currentTab.value, async (tab) => {
  if (isNew.value) return
  const pid = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
  if (tab === 'Photos' && !photosLoaded.value) {
    try {
      // Fetch full activity with photos to ensure data URLs are available for thumbnails/viewer
      await store.fetchActivity(id.value, { includePhotos: true })
      await store.fetchActivityPhotos(id.value)
      photosLoaded.value = true
    } catch (e) { /* ignore */ }
  }
  if (tab === 'Issues' && !issuesLoaded.value && pid) {
    try { await issuesStore.fetchIssues(pid); issuesLoaded.value = true } catch (e) { /* ignore */ }
  }
  if (tab === 'Comments' && !commentsLoaded.value) {
    try { const a = await store.fetchActivity(id.value, { includePhotos: false }); form.comments = a?.comments || []; commentsLoaded.value = true } catch (e) { /* ignore */ }
  }
  if (tab === 'Attachments' && !attachmentsLoaded.value) {
    try { const a = await store.fetchActivity(id.value, { includePhotos: false }); form.attachments = a?.attachments || []; attachmentsLoaded.value = true } catch (e) { /* ignore */ }
  }
  if (tab === 'Equipment' && !equipmentLoaded.value && pid) {
    try { await Promise.all([ equipmentStore.fetchByProject(pid), spacesStore.fetchByProject(pid) ]); equipmentLoaded.value = true } catch (e) { /* ignore */ }
  }
  if (tab === 'Logs' && !logsLoaded.value) {
    try { await loadLogs(); logsLoaded.value = true } catch (e) { /* ignore */ }
  }
})

// Fetch a fully-hydrated equipment record (including photos/attachments/checklists/issues) for reports
async function fetchFullEquipmentForReport(equipId: string) {
  if (!equipId) return null
  if (fullEquipmentCache.has(equipId)) return fullEquipmentCache.get(equipId)
  try {
    const { data } = await http.get(`/api/equipment/${equipId}?includePhotos=true`, { headers: { ...getAuthHeaders() } })
    const normalized = { ...data, id: data?._id || equipId }
    fullEquipmentCache.set(equipId, normalized)
    return normalized
  } catch (e) {
    return null
  }
}

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
  // Ensure projectId is always present (fallback to current project if needed)
  payload.projectId = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
  // Clean up spaceId - must be null or valid ObjectId string, not empty string
  if (!payload.spaceId || payload.spaceId === '') {
    payload.spaceId = null
  }
  try {
    saving.value = true
    console.log('[activity-save] Starting save process, payload:', payload)
    if (isNew.value) {
      console.log('[activity-save] Creating new activity')
      const created = await store.createActivity(payload)
      router.replace({ name: 'activity-edit', params: { id: created.id || created._id } })
    } else {
      console.log('[activity-save] Updating existing activity')
      await store.updateActivity(id.value, payload)
    }
    ui.showSuccess('Activity saved')
  } catch (e: any) {
    console.error('[activity-save] Error occurred:', e)
    console.error('[activity-save] Error response:', e?.response)
    console.error('[activity-save] Error status:', e?.response?.status)
    console.error('[activity-save] Error data:', e?.response?.data)
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save activity')
  } finally {
    saving.value = false
  }
}

// Wrapper used by equipment-change debouncer
async function saveEquipment() {
  return save()
}

async function uploadPhoto(file: File, onProgress: (pct: number) => void) {
  if (!current.value && !isNew.value) await store.fetchActivity(id.value)
  let targetId = id.value
  if (isNew.value) {
    if (!pendingCreatedId.value) {
      // Create the activity without navigating yet to avoid unmount during batch
  const payload = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() }
  payload.projectId = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
      const created = await store.createActivity(payload)
      pendingCreatedId.value = String(created.id || created._id)
    }
    targetId = String(pendingCreatedId.value)
  }
  const fd = new FormData()
  fd.append('photos', file)
  const res = await http.post(`/api/activities/${targetId}/photos`, fd, {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function download() {
  if (!id.value || isNew.value || downloading.value) return
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  try {
    downloading.value = true
    await store.downloadReport(id.value)
  } finally {
    downloading.value = false
  }
}

// -----------------------------
// PDF generation helpers (adapted from Equipment report)
// -----------------------------
type ImageFormat = 'PNG' | 'JPEG' | 'WEBP'
type LoadedImage = { dataUrl?: string, format?: ImageFormat, width?: number, height?: number }

// Lazy-load Source Sans Pro for PDFs
let sourceSansLoaded = false
async function ensureSourceSans(doc: any) {
  if (sourceSansLoaded) return
  try {
    const loadFont = async (url: string) => {
      const res = await fetch(url)
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      return btoa(binary)
    }
    const regularB64 = await loadFont('/fonts/SourceSansPro_5/ttf/source-sans-pro-latin-400-normal.ttf')
    doc.addFileToVFS('SourceSansPro-Regular.ttf', regularB64)
    doc.addFont('SourceSansPro-Regular.ttf', 'SourceSansPro', 'normal')
    doc.addFont('SourceSansPro-Regular.ttf', 'SourceSansPro', 'bold')
    sourceSansLoaded = true
  } catch (e) {
    sourceSansLoaded = false
  }
}
function setBodyFont(doc: any, weight: 'normal' | 'bold' = 'normal') {
  try { doc.setFont('SourceSansPro', weight) } catch (e) { doc.setFont('helvetica', weight) }
}
function setZeroCharSpace(doc: any) {
  try {
    const fn = (doc as any).setCharSpace
    if (typeof fn === 'function') fn.call(doc, 0)
  } catch (e) { /* ignore */ }
}

function mimeToFormat(mime?: string | null): ImageFormat | undefined {
  if (!mime) return undefined
  const m = mime.toLowerCase()
  if (m.includes('png')) return 'PNG'
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPEG'
  if (m.includes('webp')) return 'WEBP'
  return undefined
}
function getDims(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth || img.width || 0, h: img.naturalHeight || img.height || 0 })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = dataUrl
  })
}
async function convertDataUrlToJpeg(dataUrl: string, quality = 0.92): Promise<string | null> {
  try {
    const img = new Image(); img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error('img load fail')); img.src = dataUrl })
    const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height
    const ctx = canvas.getContext('2d'); if (!ctx) return null; ctx.drawImage(img, 0, 0)
    return canvas.toDataURL('image/jpeg', quality)
  } catch (e) { return null }
}
async function loadImage(src?: string): Promise<LoadedImage> {
  try {
    if (!src) return {}
    let width: number | undefined
    let height: number | undefined
    if (src.startsWith('data:')) {
      const mime = src.slice(5, src.indexOf(';'))
      let fmt = mimeToFormat(mime)
      if (fmt === 'WEBP' || (mime && mime.toLowerCase().includes('svg'))) {
        const conv = await convertDataUrlToJpeg(src)
        if (conv) {
          const dims = await getDims(conv)
          width = dims.w || undefined; height = dims.h || undefined
          return { dataUrl: conv, format: 'JPEG', width, height }
        }
      }
      const dims = await getDims(src)
      width = dims.w || undefined; height = dims.h || undefined
      return { dataUrl: src, format: fmt, width, height }
    }
    const res = await fetch(src)
    if (!res.ok) return {}
    const blob = await res.blob()
    const dataUrl: string = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.readAsDataURL(blob) })
    let fmt: ImageFormat | undefined
    if (blob.type) fmt = mimeToFormat(blob.type)
    if (!fmt || fmt === 'WEBP' || blob.type.toLowerCase().includes('svg')) {
      const conv = await convertDataUrlToJpeg(dataUrl)
      if (conv) {
        const dims = await getDims(conv)
        width = dims.w || undefined; height = dims.h || undefined
        return { dataUrl: conv, format: 'JPEG', width, height }
      }
    }
    const dims = await getDims(dataUrl)
    width = dims.w || undefined; height = dims.h || undefined
    return { dataUrl: dataUrl, format: fmt || 'PNG', width, height }
  } catch (e) { return {} }
}
function scaleToHeight(img: LoadedImage, targetH: number, fallbackW: number) {
  const h = img?.height || targetH
  const w = img?.width || fallbackW || targetH
  if (!h || !w) return { w: fallbackW || targetH, h: targetH }
  const sc = targetH / h
  return { w: w * sc, h: targetH }
}
function htmlToLines(html: string): string[] {
  // Basic HTML -> lines preserving paragraphs and list items
  const cleaned = html.replace(/\r/gi, '')
    .replace(/<\/?(script|style)[^>]*>/gi, '')
    .replace(/<li[^>]*>/gi, '\n• ') // bullets
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/(p|div|ul|ol|li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  return cleaned.split(/\n+/).map(l => l.trim()).filter(l => l)
}

async function downloadActivityPdf() {
  await ensureReportData()
  if (!id.value || isNew.value || downloading.value) return
  downloading.value = true
  loadActivityReportSettingsFromSession()
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    await ensureSourceSans(doc)
    setZeroCharSpace(doc)
    setBodyFont(doc, 'normal')
    const margin = 12
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const bottomLimit = pageHeight - 26
    const pageDate = new Date().toLocaleDateString()
    let pageNo = 1
    let y = margin
    // Resolve project logos (reuse current project store)
    let project: any = projectStore.currentProject || {}
    const clientImg = await loadImage((project as any)?.logo)
    const cxaImg = await loadImage((project as any)?.commissioning_agent?.logo)
    let footerLogo = await loadImage('/brand/logo.png'); if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.svg')
    const drawFooter = () => {
      const prevFont = (doc as any).getFont ? (doc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
      const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 9
      const footerY = pageHeight - 10
      doc.setDrawColor(180,180,180); doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)
      try {
        if (footerLogo.dataUrl) { const lh = 5.5; const lw = 12; doc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', margin, footerY - lh, lw, lh); setBodyFont(doc, 'bold'); doc.setFontSize(8); doc.text(`${form.name || 'Activity'} Report`, margin + lw + 2, footerY - 2) }
        else { doc.setFillColor(220,220,220); doc.rect(margin, footerY - 5.5, 8,5,'F'); setBodyFont(doc, 'bold'); doc.setFontSize(8); doc.text(`${form.name || 'Activity'} Report`, margin + 10, footerY - 2) }
      } catch (e) { /* ignore */ }
      setBodyFont(doc, 'normal'); doc.text(String(pageNo), pageWidth/2, footerY - 2, { align: 'center' }); doc.text(pageDate, pageWidth - margin, footerY - 2, { align: 'right' })
      doc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal'); doc.setFontSize(prevSize)
    }
    const drawHeader = () => {
      const prevFont = (doc as any).getFont ? (doc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
      const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 9
      const logoH = 12
      let logoBlockH = 0
      if (clientImg.dataUrl) {
        const dim = scaleToHeight(clientImg, logoH, logoH * 3)
        doc.addImage(clientImg.dataUrl, clientImg.format || 'PNG', margin, margin, dim.w, dim.h)
        logoBlockH = Math.max(logoBlockH, dim.h)
      }
      if (cxaImg.dataUrl) {
        const dim = scaleToHeight(cxaImg, logoH, logoH * 3)
        doc.addImage(cxaImg.dataUrl, cxaImg.format || 'PNG', pageWidth - margin - dim.w, margin, dim.w, dim.h)
        logoBlockH = Math.max(logoBlockH, dim.h)
      }
      doc.setFontSize(20); setBodyFont(doc, 'bold'); doc.text(`${form.name || 'Activity'} Report`, pageWidth/2, margin + (logoBlockH || logoH) + 6, { align: 'center' })
      y = margin + (logoBlockH || logoH) + 20
      doc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal'); doc.setFontSize(prevSize)
    }
    const ensureSpace = (amount: number): boolean => { if (y + amount > bottomLimit) { drawFooter(); doc.addPage(); pageNo++; y = margin; drawHeader(); return true } return false }
    const sectionGap = (gap = 6) => { ensureSpace(gap); y += gap }
    drawHeader()
    // Info
    if (activityReport.value.include.info) {
      setBodyFont(doc, 'bold'); doc.setFontSize(12); doc.text('Info', margin, y); y += 6; setBodyFont(doc, 'normal'); doc.setFontSize(10)
      const info: Array<[string,string]> = [ ['Type', form.type], ['Start', form.startDate], ['End', form.endDate], ['Location', form.location], ['Project', String(form.projectId || '')] ]
      const colW = (pageWidth - margin*2)/2; let i = 0
      for (const [label,value] of info) { const col = i % 2; const row = Math.floor(i/2); const x = margin + col*colW; const yy = y + row*7; ensureSpace(10); doc.setTextColor(100); doc.text(label + ':', x, yy); doc.setTextColor(0); const lines = doc.splitTextToSize(String(value||'—'), colW - 24) as string[]; doc.text(lines, x + 24, yy); i++ }
      const rows = Math.ceil(info.length/2); y += rows*7 + 2
    }
    // Description (rich HTML rendering)
    if (activityReport.value.include.description && form.descriptionHtml) {
      ensureSpace(14); setBodyFont(doc, 'bold'); doc.setFontSize(12); doc.text('Description', margin, y); y += 6
      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      // Use px width for consistency with html2canvas
      const widthPx = Math.round((pageWidth - margin*2) / 0.264583) // mm -> px
      container.style.width = widthPx + 'px'
      container.style.color = '#000'
      container.style.background = '#fff'
      container.innerHTML = form.descriptionHtml
        .replace(/<h1/gi,'<h1 style="font-size:20px; margin:4px 0; font-weight:700;"')
        .replace(/<h2/gi,'<h2 style="font-size:16px; margin:4px 0; font-weight:700;"')
        .replace(/<h3/gi,'<h3 style="font-size:14px; margin:3px 0; font-weight:700;"')
        .replace(/<p/gi,'<p style="font-size:10px; margin:2px 0; line-height:1.35;"')
        .replace(/<ul/gi,'<ul style="margin:4px 0; padding-left:18px; list-style-type:disc; list-style-position:outside;"')
        .replace(/<ol/gi,'<ol style="margin:4px 0; padding-left:18px; list-style-type:decimal; list-style-position:outside;"')
        .replace(/<li/gi,'<li style="font-size:10px; margin:1px 0;"')
      document.body.appendChild(container)
      const pxPerMm = 3.7795275591
      const mmPerPx = 1 / pxPerMm
      const targetWidthMm = pageWidth - margin*2
      const targetWidthPx = Math.round(targetWidthMm * pxPerMm)
      try {
        // Render with html2canvas and paginate manually for reliable output
        const canvas = await (window as any).html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
        const scale = targetWidthPx / canvas.width
        let offsetPx = 0
        while (offsetPx < canvas.height - 1) {
          const availableMm = bottomLimit - y
          const availableTargetPx = Math.max(10, Math.floor(availableMm * pxPerMm))
          const segmentSrcPx = Math.min(Math.floor(availableTargetPx / scale), canvas.height - offsetPx)
          // Create a segment canvas to crop
          const seg = document.createElement('canvas'); seg.width = canvas.width; seg.height = segmentSrcPx
          const segCtx = seg.getContext('2d')!
          segCtx.fillStyle = '#ffffff'; segCtx.fillRect(0,0,seg.width,seg.height)
          segCtx.drawImage(canvas, 0, offsetPx, canvas.width, segmentSrcPx, 0, 0, seg.width, seg.height)
          const segUrl = seg.toDataURL('image/png')
          const segmentTargetHeightPx = Math.round(segmentSrcPx * scale)
          const segmentTargetHeightMm = segmentTargetHeightPx * mmPerPx
      try { doc.addImage(segUrl, 'PNG', margin, y, targetWidthMm, segmentTargetHeightMm) } catch (e) { /* ignore */ }
          y += segmentTargetHeightMm
          offsetPx += segmentSrcPx
          if (offsetPx < canvas.height - 1) { drawFooter(); doc.addPage(); pageNo++; y = margin; drawHeader() }
        }
        y += 2
  } catch (e) {
        // Fallback to text if html render fails
        const lines = htmlToLines(form.descriptionHtml)
        for (const l of lines) { const wrapped = doc.splitTextToSize(l, pageWidth - margin*2) as string[]; for (const w of wrapped) { ensureSpace(6); doc.text(w, margin, y); y += 5 } }
      } finally {
        document.body.removeChild(container)
      }
    }
    // Photos
    if (activityReport.value.include.photos) {
      const phs: any[] = Array.isArray(current.value?.photos) ? current.value!.photos! : []
      const imgs: Array<{dataUrl:string,format?:ImageFormat}> = []
      for (let p=0; p< Math.min(activityReport.value.photoLimit, phs.length); p++) {
        const src = phs[p]?.data || phs[p]?.url || phs[p]
        const imgRaw = await loadImage(src)
        if (imgRaw.dataUrl) imgs.push({ dataUrl: imgRaw.dataUrl, format: imgRaw.format })
      }
      if (imgs.length) { sectionGap(); ensureSpace(10); setBodyFont(doc, 'bold'); doc.setFontSize(12); doc.text('Photos', margin, y); y += 4; const thumbW = (pageWidth - margin*2 - 8)/3; const thumbH = thumbW*0.75; for (let idx=0; idx<imgs.length; idx++) { const col = idx%3; const row = Math.floor(idx/3); const x = margin + col*(thumbW+4); const yy = y + row*(thumbH+4); if (yy + thumbH > bottomLimit) { drawFooter(); doc.addPage(); pageNo++; y = margin; idx -= (idx%3); continue } doc.addImage(imgs[idx].dataUrl, imgs[idx].format || 'JPEG', x, yy, thumbW, thumbH) } y += Math.ceil(imgs.length/3)*(thumbH+4) + 2 }
    }
    // We intentionally delay issues & attachments so equipment reports can appear before them.
    // Close out the main activity doc (without attachments yet).
    drawFooter()
    let baseBytes = doc.output('arraybuffer') as ArrayBuffer
    // Build issues doc separately (table) if needed.
    let issuesBytes: ArrayBuffer | null = null
    if (activityReport.value.include.issues) {
      // Aggregate issues from the activity and from each selected equipment (deduped by id)
      const aggregated: any[] = []
      const seen = new Set<string>()
      const makeKey = (obj: any) => {
        const id = String((obj && (obj.id || obj._id)) || '')
        if (id) return id
        const num = (obj && (obj.number != null)) ? String(obj.number) : ''
        const title = (obj && obj.title) ? String(obj.title).slice(0,40) : ''
        const type = (obj && obj.type) ? String(obj.type) : ''
        return [num,type,title].filter(Boolean).join('|') || Math.random().toString(36).slice(2)
      }
      const pushIssue = (obj: any, source: string) => {
        if (!obj) return
        const key = makeKey(obj)
        if (seen.has(key)) return
        seen.add(key)
        // Clone to avoid mutating store objects and annotate source for rendering
        const annotated = { ...(obj || {}), __source: source }
        aggregated.push(annotated)
      }
      // Activity issues
      for (const it of (issuesForActivity.value || [])) pushIssue(it, 'Activity')
      // Equipment issues (ensure full equipment fetched if list version lacks issues)
      try {
        for (const eq of (selectedEquip.value || [])) {
          let eqObj: any = eq
          const hasInlineIssues = Array.isArray(eqObj?.issues) && eqObj.issues.length > 0
          if (!hasInlineIssues && (eqObj?.id || eqObj?._id)) {
            try { const full = await equipmentStore.fetchOne(String(eqObj.id || eqObj._id)); if (full) eqObj = full } catch (e) { /* ignore */ }
          }
          const srcLabel = String(eqObj?.tag || eqObj?.title || 'Equipment')
          const refs: any[] = Array.isArray(eqObj?.issues) ? eqObj.issues : []
          for (const ref of refs) {
            const id = String((ref && (ref.id || ref._id)) || ref || '')
            const obj = id ? issuesById.value[id] : (typeof ref === 'object' ? ref : null)
            if (obj) pushIssue(obj, srcLabel)
          }
          // Fallback: include issues linked by assetId to this equipment
          const eqId = String((eqObj?.id || eqObj?._id) || '')
          if (eqId) {
            for (const it of (issuesStore.issues || [])) {
              const linked = String((it as any)?.assetId || '')
              if (linked === eqId) pushIssue(it, srcLabel)
            }
          }
        }
      } catch (e) { /* ignore */ }
      const issues = aggregated
      if (issues.length) {
        const iDoc = new jsPDF({ unit: 'mm', format: 'a4' })
        await ensureSourceSans(iDoc)
        setZeroCharSpace(iDoc)
        setBodyFont(iDoc, 'normal')
        const iPW = iDoc.internal.pageSize.getWidth(); const iPH = iDoc.internal.pageSize.getHeight(); const iBottom = iPH - 26; let iy = margin; let iPageNo = 1
        // Reuse logos from outer scope if available for consistent branding
        const drawIFooter = () => {
          const prevFont = (iDoc as any).getFont ? (iDoc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
          const prevSize = (iDoc as any).getFontSize ? (iDoc as any).getFontSize() : 9
          const fY = iPH - 10
          iDoc.setDrawColor(180,180,180); iDoc.line(margin, fY - 6, iPW - margin, fY - 6)
          try {
            if (footerLogo?.dataUrl) { const lh = 5.5; const lw = 12; iDoc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', margin, fY - lh, lw, lh); setBodyFont(iDoc, 'bold'); iDoc.setFontSize(8); iDoc.text(`${form.name || 'Activity'} Issues`, margin + lw + 2, fY - 2) }
            else { iDoc.setFillColor(220,220,220); iDoc.rect(margin, fY - 5.5, 8,5,'F'); setBodyFont(iDoc, 'bold'); iDoc.setFontSize(8); iDoc.text(`${form.name || 'Activity'} Issues`, margin + 10, fY - 2) }
          } catch (e) { /* ignore */ }
          setBodyFont(iDoc, 'normal'); iDoc.text(String(iPageNo), iPW/2, fY - 2, { align: 'center' });
          try { if (typeof pageDate === 'string') iDoc.text(pageDate, iPW - margin, fY - 2, { align: 'right' }) } catch (e) { /* ignore */ }
          iDoc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal'); iDoc.setFontSize(prevSize)
        }
        const drawIHeader = () => {
          const logoH = 12
          try { if (clientImg?.dataUrl) { const dim = scaleToHeight(clientImg, logoH, logoH*2.5); iDoc.addImage(clientImg.dataUrl, clientImg.format || 'PNG', margin, margin, dim.w, dim.h) } } catch (e) { /* ignore */ }
          try { if (cxaImg?.dataUrl) { const dim = scaleToHeight(cxaImg, logoH, logoH*2.5); iDoc.addImage(cxaImg.dataUrl, cxaImg.format || 'PNG', iPW - margin - dim.w, margin, dim.w, dim.h) } } catch (e) { /* ignore */ }
          iDoc.setFontSize(20); setBodyFont(iDoc, 'bold'); iDoc.text('Issues', iPW/2, margin + 8, { align: 'center' })
          // Reset to body font after header
          iy = margin + 22
          setBodyFont(iDoc, 'normal'); iDoc.setFontSize(9)
        }
        const ensureISpace = (h:number) => { if (iy + h > iBottom) { drawIFooter(); iDoc.addPage(); iPageNo++; drawIHeader(); return true } return false }
        drawIHeader()
    const totalW = iPW - margin*2 - 2; const numW = 14; const typeW = 22; const sourceW = 26; const statusW = 22; const titleW = Math.max(32, Math.min(60, totalW*0.20)); const descW = totalW - numW - typeW - sourceW - statusW - titleW
    const tableX = margin + 1
  const drawIssuesHeader = () => { ensureISpace(8); setBodyFont(iDoc, 'bold'); const headerH = 6; iDoc.setFillColor(250,236,236); iDoc.rect(tableX, iy, totalW, headerH, 'F'); iDoc.rect(tableX, iy, totalW, headerH); iDoc.line(tableX+numW, iy, tableX+numW, iy+headerH); iDoc.line(tableX+numW+typeW, iy, tableX+numW+typeW, iy+headerH); iDoc.line(tableX+numW+typeW+sourceW, iy, tableX+numW+typeW+sourceW, iy+headerH); iDoc.line(tableX+numW+typeW+sourceW+titleW, iy, tableX+numW+typeW+sourceW+titleW, iy+headerH); iDoc.line(tableX+numW+typeW+sourceW+titleW+descW, iy, tableX+numW+typeW+sourceW+titleW+descW, iy+headerH); iDoc.text('#', tableX+1.5, iy+4); iDoc.text('Type', tableX+numW+1.5, iy+4); iDoc.text('Source', tableX+numW+typeW+1.5, iy+4); iDoc.text('Title', tableX+numW+typeW+sourceW+1.5, iy+4); iDoc.text('Description', tableX+numW+typeW+sourceW+titleW+1.5, iy+4); iDoc.text('Status', tableX+numW+typeW+sourceW+titleW+descW+1.5, iy+4); iy += headerH; setBodyFont(iDoc, 'normal'); iDoc.setFontSize(9) }
        drawIssuesHeader()
    for (const it of issues) {
      const numTxt = '#' + (it.number ?? '—')
      const typeTxt = String(it.type||'—')
      const sourceTxt = String((it as any).__source || (it as any).assetTag || (it as any).asset || '—')
      const titleLines = iDoc.splitTextToSize(String(it.title||'—'), titleW - 3) as string[]
      const descLines = iDoc.splitTextToSize(String(it.description||'—'), descW - 3) as string[]
      const statusTxt = String(it.status || 'Open')
      const hLines = Math.max(1, titleLines.length, descLines.length)
      const rowH = Math.max(6, hLines*4 + 2)
      if (ensureISpace(rowH + 2)) drawIssuesHeader()
      iDoc.rect(tableX, iy, totalW, rowH)
      iDoc.line(tableX+numW, iy, tableX+numW, iy+rowH)
      iDoc.line(tableX+numW+typeW, iy, tableX+numW+typeW, iy+rowH)
      iDoc.line(tableX+numW+typeW+sourceW, iy, tableX+numW+typeW+sourceW, iy+rowH)
      iDoc.line(tableX+numW+typeW+sourceW+titleW, iy, tableX+numW+typeW+sourceW+titleW, iy+rowH)
      iDoc.line(tableX+numW+typeW+sourceW+titleW+descW, iy, tableX+numW+typeW+sourceW+titleW+descW, iy+rowH)
      iDoc.text(numTxt, tableX+1.5, iy+4)
      iDoc.text(typeTxt.slice(0,16), tableX+numW+1.5, iy+4)
      iDoc.text(sourceTxt.slice(0,18), tableX+numW+typeW+1.5, iy+4)
      let tlY = iy+4
      for (const l of titleLines) { iDoc.text(l, tableX+numW+typeW+sourceW+1.5, tlY); tlY += 4 }
      let dlY = iy+4
      for (const l of descLines) { iDoc.text(l, tableX+numW+typeW+sourceW+titleW+1.5, dlY); dlY += 4 }
      iDoc.text(statusTxt.slice(0,18), tableX+numW+typeW+sourceW+titleW+descW+1.5, iy+4)
      iy += rowH
    }
        drawIFooter()
        issuesBytes = iDoc.output('arraybuffer') as ArrayBuffer
      }
    }
    // Merge issues immediately after main doc so they appear right after Photos section
    if (issuesBytes) {
      try {
        const { PDFDocument } = await import('pdf-lib')
        const merged = await PDFDocument.load(baseBytes)
        const issuesPdf = await PDFDocument.load(issuesBytes)
        const issuesPages = await merged.copyPages(issuesPdf, issuesPdf.getPageIndices())
        issuesPages.forEach((p:any) => merged.addPage(p))
        baseBytes = await merged.save()
        // Prevent double-merge later
        issuesBytes = null
      } catch (e) { /* keep baseBytes as-is */ }
    }
    // Build attachments doc separately (list + image pages) if needed.
    let attachmentsBytes: ArrayBuffer | null = null
    if (activityReport.value.include.attachments) {
      const atts: any[] = Array.isArray(form.attachments) ? form.attachments : []
      if (atts.length) {
        const attDoc = new jsPDF({ unit: 'mm', format: 'a4' })
        await ensureSourceSans(attDoc)
        setZeroCharSpace(attDoc)
        setBodyFont(attDoc, 'normal')
        const aPW = attDoc.internal.pageSize.getWidth(); const aPH = attDoc.internal.pageSize.getHeight(); const aBottom = aPH - 26; let ay = margin; let aPageNo = 1
        const drawAttFooter = () => { const footerY = aPH - 10; attDoc.setDrawColor(180,180,180); attDoc.line(margin, footerY - 6, aPW - margin, footerY - 6); setBodyFont(attDoc, 'normal'); attDoc.setFontSize(8); attDoc.text(String(aPageNo), aPW/2, footerY - 2, { align: 'center' }) }
        const drawAttHeader = () => { setBodyFont(attDoc, 'bold'); attDoc.setFontSize(16); attDoc.text('Attachments', aPW/2, margin + 6, { align: 'center' }); ay = margin + 16; setBodyFont(attDoc, 'normal'); attDoc.setFontSize(9) }
        const ensureAttSpace = (h:number) => { if (ay + h > aBottom) { drawAttFooter(); attDoc.addPage(); aPageNo++; drawAttHeader(); return true } return false }
        drawAttHeader()
        // Listing first
        for (let a=0; a< Math.min(8, atts.length); a++) { const name = String(atts[a]?.filename || atts[a]?.url || 'Attachment'); const lines = attDoc.splitTextToSize(name, aPW - margin*2) as string[]; for (const l of lines) { ensureAttSpace(6); attDoc.text(l, margin + 2, ay); ay += 4 } }
        // Image full pages
        const isImage = (a:any) => { const type = String(a?.type||'').toLowerCase(); const name = String(a?.filename||a?.url||'').toLowerCase(); const ext = name.split('?')[0].split('#')[0].split('.').pop()||''; return type.startsWith('image/') || ['png','jpg','jpeg','webp'].includes(ext) }
  const getDims = async (dataUrl:string): Promise<{w:number;h:number}> => { return new Promise(res => { const img = new Image(); img.onload=()=>res({ w: img.naturalWidth||img.width, h: img.naturalHeight||img.height }); img.onerror=()=>res({w:0,h:0}); img.src = dataUrl }) }
        for (const a of atts) { if (!isImage(a)) continue; const src = a?.url || a?.data; const img = await loadImage(src); if (!img.dataUrl) continue; drawAttFooter(); attDoc.addPage(); aPageNo++; drawAttHeader(); setBodyFont(attDoc, 'bold'); attDoc.setFontSize(10); const label = `Attachment: ${String(a?.filename || a?.url || '')}`; ensureAttSpace(8); attDoc.text(label, margin, ay); ay += 6; setBodyFont(attDoc, 'normal'); const dims = await getDims(img.dataUrl); const maxW = aPW - margin*2; const maxH = aBottom - ay; let drawW = maxW, drawH = maxH; if (dims.w>0 && dims.h>0) { const sc = Math.min(maxW/dims.w, maxH/dims.h); drawW = dims.w*sc; drawH = dims.h*sc } const imgX = margin + (maxW - drawW)/2; const imgY = ay + (maxH - drawH)/2; try { attDoc.addImage(img.dataUrl, img.format || 'JPEG', imgX, imgY, drawW, drawH) } catch (e) {   drawAttFooter() }
        drawAttFooter()
        attachmentsBytes = attDoc.output('arraybuffer') as ArrayBuffer
      }
    }
    // Merge equipment detailed reports and then issues, attachments & PDF attachments
    if (activityReport.value.include.equipmentReports && selectedEquip.value.length) {
      try {
        const { PDFDocument } = await import('pdf-lib')
        // Build a PDF map of issues and spaces for richer equipment reports
        const issuesMap: Record<string, any> = {}
        for (const it of (issuesStore.issues || [])) {
          const key = String((it as any).id || (it as any)._id || '')
          if (key) issuesMap[key] = it
        }
        const spacesMap: Record<string, any> = {}
        for (const sp of (spacesStore.items || [])) {
          const key = String((sp as any).id || (sp as any)._id || '')
          if (key) spacesMap[key] = sp
        }
        // Try to resolve project (already loaded earlier for logos)
        const projectObj: any = projectStore.currentProject || {}
        // Generate full equipment PDFs and merge
        const merged = await PDFDocument.load(baseBytes)
        // Lazy-load generator only if needed (performance improvement)
        const { generateEquipmentPdf } = await import('../../utils/equipmentReport')
        for (const eq of selectedEquip.value) {
          try {
            const eqId = String((eq as any)?.id || (eq as any)?._id || '')
            const fullEq = eqId ? (await fetchFullEquipmentForReport(eqId)) || eq : eq
            // Attempt to reuse each equipment's own saved report settings if present on object
            const eqSettings = (fullEq && (fullEq as any).reportSettings) ? (fullEq as any).reportSettings : null
            const baseInclude = eqSettings && typeof eqSettings === 'object' && eqSettings.include ? eqSettings.include : { info: true, attributes: true, components: true, photos: true, attachments: true, checklists: true, fpt: true, issues: true }
            // Ensure issues are included in each equipment report (user requirement)
            const includeSettings = { ...baseInclude, issues: true }
            // Use equipment's own photoLimit if available, else fall back to activity photoLimit or 6
            const photoLimit = (eqSettings && typeof eqSettings.photoLimit === 'number') ? eqSettings.photoLimit : activityReport.value.photoLimit
            const eqBytes = await generateEquipmentPdf(fullEq, projectObj, issuesMap, spacesMap, { include: includeSettings, photoLimit })
            const eqPdf = await PDFDocument.load(eqBytes)
            const pages = await merged.copyPages(eqPdf, eqPdf.getPageIndices())
            pages.forEach((p: any) => merged.addPage(p))
           } catch (e) { /* ignore */ }
        }
        // Insert attachments pages (non-PDF) after equipment reports & issues
        if (attachmentsBytes) {
          try {
            const attPdf = await PDFDocument.load(attachmentsBytes)
            const attPages = await merged.copyPages(attPdf, attPdf.getPageIndices())
            attPages.forEach((p:any) => merged.addPage(p))
          } catch (e) { /* ignore */ }
        }
        // Append PDF attachments last
        if (activityReport.value.include.attachments) {
          const atts: any[] = Array.isArray(form.attachments) ? form.attachments : []
          const pdfAtts = atts.filter((a: any) => { const type = String(a?.type||'').toLowerCase(); const name = String(a?.filename||a?.url||'').toLowerCase(); const ext = name.split('?')[0].split('#')[0].split('.').pop()||''; return type.includes('pdf') || ext==='pdf' })
          for (const a of pdfAtts) { const url = String(a?.url || ''); if (!url) continue; try { const res = await fetch(url); if (!res.ok) continue; const buf = await res.arrayBuffer(); const attPdf = await PDFDocument.load(buf); const pages = await merged.copyPages(attPdf, attPdf.getPageIndices()); pages.forEach((p:any)=> merged.addPage(p)) } catch (e) { /* ignore */ } }
        }
        baseBytes = await merged.save()
  } catch (e) { /* fallback keep baseBytes */ }
    }
    // If no equipment reports requested, still append attachments
    if (!(activityReport.value.include.equipmentReports && selectedEquip.value.length) && (attachmentsBytes)) {
      try {
        const { PDFDocument } = await import('pdf-lib')
        const merged = await PDFDocument.load(baseBytes)
        if (attachmentsBytes) {
          const attPdf = await PDFDocument.load(attachmentsBytes)
          const attPages = await merged.copyPages(attPdf, attPdf.getPageIndices())
          attPages.forEach((p:any) => merged.addPage(p))
        }
        // Append PDF attachments
        if (activityReport.value.include.attachments) {
          const atts: any[] = Array.isArray(form.attachments) ? form.attachments : []
          const pdfAtts = atts.filter((a: any) => { const type = String(a?.type||'').toLowerCase(); const name = String(a?.filename||a?.url||'').toLowerCase(); const ext = name.split('?')[0].split('#')[0].split('.').pop()||''; return type.includes('pdf') || ext==='pdf' })
          for (const a of pdfAtts) { const url = String(a?.url || ''); if (!url) continue; try { const res = await fetch(url); if (!res.ok) continue; const buf = await res.arrayBuffer(); const attPdf2 = await PDFDocument.load(buf); const pages = await merged.copyPages(attPdf2, attPdf2.getPageIndices()); pages.forEach((p:any)=> merged.addPage(p)) } catch (e) { /* ignore */ } }
        }
        baseBytes = await merged.save()
  } catch (e) { /* ignore */ }
    }
    // Download merged
    const blob = new Blob([baseBytes], { type: 'application/pdf' })
    const fname = `activity-${id.value}.pdf`
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = fname; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 60000)
    }
  } catch (e:any) {
    ui.showError(e?.message || 'Failed to generate report')
  } finally {
    downloading.value = false
  }
}

// Tabs logic
const tabs = ['Info', 'Photos', 'Issues', 'Comments', 'Attachments', 'Equipment', 'Logs']
const activeIndex = computed(() => {
  const i = tabs.indexOf(currentTab.value)
  return i >= 0 ? i : 0
})
const tabLeft = computed(() => (activeIndex.value * 100) / tabs.length)
const tabWidth = computed(() => 100 / tabs.length)

// Comments helpers
async function onAddComment(text: string) {
  const t = (text || '').trim()
  if (!t) return
  // Ensure activity exists if creating from 'new'
  const aid = isNew.value ? await saveAndGetId() : id.value
  const name = `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim() || (auth.user?.email || 'Anonymous')
  const avatar = auth.user?.avatar || auth.user?.contact?.avatar || ''
  const next = [ ...(form.comments || []), { userId: auth.user?._id || auth.user?.id, name, avatar, text: t, createdAt: new Date().toISOString() } ]
  try {
    await store.updateActivity(String(aid), { comments: next })
    form.comments = next
    ui.showSuccess('Comment added')
  } catch (e:any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to add comment')
    throw e
  }
}

// Logs tab
const logsList = ref<any[]>([])
const logsLoading = ref(false)
async function loadLogs(force = false) {
  if (logsLoading.value && !force) return
  const aid = isNew.value ? (pendingCreatedId.value || '') : id.value
  if (!aid) {
    logsLoaded.value = true
    logsLoading.value = false
    logsList.value = []
    return
  }
  logsLoading.value = true
  try {
    const { useLogsStore } = await import('../../stores/logs')
    const logs = useLogsStore()
    const list = await logs.fetchLogs('activities', String(aid))
    logsList.value = Array.isArray(list) ? list : []
  } catch (e) {
    logsList.value = []
  } finally {
    logsLoaded.value = true
    logsLoading.value = false
  }
}

async function onDeleteComment(comment: any, index?: number) {
  // Ensure activity exists
  const aid = isNew.value ? await saveAndGetId() : id.value
  const next = [ ...(form.comments || []) ]
  let idx = typeof index === 'number' ? index : next.findIndex((c: any) => c === comment || (c.createdAt === comment?.createdAt && c.text === comment?.text))
  if (idx < 0) idx = next.length - 1
  if (idx < 0) return
  next.splice(idx, 1)
  try {
    await store.updateActivity(String(aid), { comments: next })
    form.comments = next
    ui.showSuccess('Comment removed')
  } catch (e:any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove comment')
    throw e
  }
}

function formatDateTime(d?: any) {
  if (!d) return ''
  try { return new Date(d).toLocaleString() } catch (e) { return String(d) }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// Determine attachment kind for icon rendering
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

function fileNameFromUrl(url?: string): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    const base = u.pathname.split('/').filter(Boolean).pop() || url
    return decodeURIComponent(base)
  } catch (e) {
    const base = url.split('?')[0].split('#')[0]
    return decodeURIComponent(base.split('/').pop() || url)
  }
}

// Attachment metadata formatting helpers
function formatBytes(bytes?: any): string {
  const n = Number(bytes)
  if (!isFinite(n) || n <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  const val = n / Math.pow(1024, i)
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
function attachmentSize(a: any): string {
  return formatBytes(a?.size ?? a?.fileSize ?? a?.contentLength)
}
function attachmentUploadedAt(a: any): string {
  const d = a?.uploadedAt || a?.createdAt || a?.date || a?.timestamp
  return d ? formatDateTime(d) : ''
}
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

// Attachments helpers
const newAttachment = reactive({ filename: '', url: '', type: '' })
function addAttachment() {
  if (!newAttachment.url) return
  form.attachments.push({ filename: newAttachment.filename || newAttachment.url, url: newAttachment.url, type: newAttachment.type || 'link' })
  newAttachment.filename = ''
  newAttachment.url = ''
  newAttachment.type = ''
}
async function uploadDocument(file: File, onProgress: (pct: number) => void) {
  // Ensure activity exists
  const aid = isNew.value ? await saveAndGetId() : id.value
  const fd = new FormData()
  fd.append('attachments', file)
  const res = await http.post(`/api/activities/${aid}/attachments`, fd, {
    headers: { ...getAuthHeaders() },
    onUploadProgress: (e: any) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)) },
  })
  const a = await store.fetchActivity(String(aid))
  if (a) form.attachments = a.attachments || []
  return res.data
}
async function removeAttachment(i: number) {
  const aid = isNew.value ? (pendingCreatedId.value || id.value) : id.value
  if (aid && aid !== 'new') {
    try {
      await http.delete(`/api/activities/${aid}/attachments/${i}`, { headers: { ...getAuthHeaders() } })
      const a = await store.fetchActivity(String(aid))
      if (a) form.attachments = a.attachments || []
      ui.showSuccess('Attachment removed')
      return
    } catch (e: any) {
      ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove attachment')
    }
  }
  // Fallback local removal if not yet persisted
  form.attachments.splice(i, 1)
}

// Issues for this activity: resolve ids/objects against the issues store
const issuesById = computed<Record<string, any>>(() => {
  const m: Record<string, any> = {}
  for (const it of (issuesStore.issues || [])) {
    const key = String((it as any).id || (it as any)._id || '')
    if (key) m[key] = it
  }
  return m
})
const issuesForActivity = computed(() => {
  const arr = (current.value && (current.value as any).issues) ? ((current.value as any).issues as any[]) : []
  const out: any[] = []
  for (const ref of (Array.isArray(arr) ? arr : [])) {
    const id = String((ref && (ref.id || ref._id)) || ref || '')
    if (!id) continue
    const obj = issuesById.value[id]
    if (obj) out.push(obj)
  }
  return out
})

// Activity Issue creation modal state
const showIssueModal = ref(false)
const activityIssueDraft = reactive<{ title: string; description: string; type: string; priority: 'Low'|'Medium'|'High'; assignedTo: string }>(
  { title: '', description: '', type: 'Activity', priority: 'Medium', assignedTo: '' }
)
function openIssueModal() {
  const name = (form.name || '').trim()
  activityIssueDraft.title = name ? `${name} issue` : 'Activity issue'
  const descParts: string[] = []
  if (name) descParts.push(`Activity: ${name}`)
  if (form.location) descParts.push(`Location: ${form.location}`)
  if (form.startDate || form.endDate) descParts.push(`Dates: ${form.startDate || '—'} to ${form.endDate || '—'}`)
  activityIssueDraft.description = descParts.join('\n') || 'Issue for this activity'
  activityIssueDraft.type = 'Activity'
  showIssueModal.value = true
}
function closeIssueModal() { showIssueModal.value = false }
async function createActivityIssue() {
  try {
    const pid = String(form.projectId || projectStore.currentProjectId || '')
    if (!pid) { ui.showError('Missing project id'); return }
    // Ensure activity exists first if new
    const aid = isNew.value ? await saveAndGetId() : id.value
    const title = (activityIssueDraft.title || '').trim() || 'Activity Issue'
    const description = (activityIssueDraft.description || '').trim() || 'Created from activity'
    const payload: any = {
      projectId: pid,
      title,
      description,
      type: activityIssueDraft.type || 'Activity',
      severity: activityIssueDraft.priority || 'Medium',
      status: 'Open',
      activityId: aid,
      location: form.location || undefined,
      system: (Array.isArray(form.systems) && form.systems[0]) ? form.systems[0] : undefined,
      assignedTo: activityIssueDraft.assignedTo || undefined,
    }
    const created = await issuesStore.createIssue(payload)
    const newId = String((created as any).id || (created as any)._id || '')
    if (newId) {
      if (!Array.isArray(form.issues)) form.issues = []
      if (!form.issues.includes(newId)) form.issues.push(newId)
      await store.updateActivity(String(aid), { issues: form.issues })
    }
    ui.showSuccess('Issue created')
    showIssueModal.value = false
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to create issue')
  }
}

// Counts per tab for badges
function countForTab(t: string): number {
  if (t === 'Photos') return (current.value?.photos || []).length
  if (t === 'Issues') return issuesForActivity.value.length
  if (t === 'Comments') return (form.comments || []).length
  if (t === 'Attachments') return (form.attachments || []).length
  if (t === 'Equipment' || t === 'Equipment Reviewed') return (form.systems || []).length
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
  await http.patch(`/api/activities/${String(aid)}/photos/${viewerIndex.value}`, { caption }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
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

// Attachment viewer state and helpers
const attachmentViewerOpen = ref(false)
const attachmentFullscreen = ref(false)
const selectedAttachmentIndex = ref<number>(-1)
const selectedAttachment = computed<any>(() => {
  const i = selectedAttachmentIndex.value
  if (i < 0) return null
  return form.attachments[i] || null
})
const selectedAttachmentUrl = computed<string>(() => {
  const a: any = selectedAttachment.value
  if (!a || !a.url) return ''
  try { return new URL(a.url, window.location.origin).toString() } catch (e) { return a.url }
})
const selectedKind = computed(() => selectedAttachment.value ? attachmentKind(selectedAttachment.value) : 'file')
const viewerMaxH = computed(() => attachmentFullscreen.value ? '82vh' : '70vh')
const viewerInnerH = computed(() => attachmentFullscreen.value ? '80vh' : '68vh')

function openAttachment(i: number) {
  selectedAttachmentIndex.value = i
  attachmentViewerOpen.value = true
}
function openInNewTab(u: string) {
  try { window.open(u, '_blank', 'noopener') } catch (e) { /* ignore */ }
}
async function downloadAttachment(a: any) {
  try {
  const url = (() => { try { return new URL(a?.url || '', window.location.origin).toString() } catch (e) { return a?.url || '' } })()
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

// Reset fullscreen on close
watch(attachmentViewerOpen, (v) => { if (!v) attachmentFullscreen.value = false })

// Equipment Reviewed helpers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const equipSearch = ref('')
const equipmentInProject = computed<any[]>(() => Array.isArray(equipmentStore.items) ? equipmentStore.items : [])
const equipmentLoading = computed<boolean>(() => !!equipmentStore.loading)
function spaceName(spaceId?: string | null) {
  const pid = spaceId ? String(spaceId) : ''
  if (!pid) return ''
  const sp: any = getSpaceById(pid)
  return sp ? (sp.title || sp.tag || '') : ''
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _filteredEquip = computed<any[]>(() => selectedEquip.value)
function addReviewedTag(e: any) {
  const tag = String(e?.tag || '').trim()
  if (!tag) return
  const id = String(e?.id || e?._id || '').trim()
  const token = id || tag
  const exists = (form.systems || []).some(s => String(s).trim() === token)
  if (!exists) {
    form.systems = [...(form.systems || []), token]
    normalizeSelectedEquipmentTokens()
    queueSaveEquipmentChange()
  }
}

// Normalize saved selections: convert any tag or tag::id tokens into equipment ids
function normalizeSelectedEquipmentTokens() {
  const sels = (form.systems || []).map(s => String(s || '').trim()).filter(Boolean)
  if (!sels.length) return
  const byId: Record<string, any> = {}
  const byTag: Record<string, any[]> = {}
  for (const eq of equipmentInProject.value) {
    const id = String(eq?.id || eq?._id || '').trim()
    const t = String(eq?.tag || '').trim().toLowerCase()
    if (id) byId[id] = eq
    if (t) {
      if (!byTag[t]) byTag[t] = []
      byTag[t].push(eq)
    }
  }
  const ids: string[] = []
  const seenIds = new Set<string>()
  for (const token of sels) {
    if (!token) continue
    // token variants: id, tag::id, tag
    if (byId[token]) {
      if (!seenIds.has(token)) { ids.push(token); seenIds.add(token) }
      continue
    }
    if (token.includes('::')) {
      const id = token.split('::').slice(1).join('::')
      if (id && byId[id] && !seenIds.has(id)) { ids.push(id); seenIds.add(id) }
      continue
    }
    const tag = token.toLowerCase()
    const eqs = byTag[tag] || []
    if (eqs.length) {
      const id = String(eqs[0]?.id || eqs[0]?._id || '').trim()
      if (id && !seenIds.has(id)) { ids.push(id); seenIds.add(id) }
    }
  }
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const t of ids) {
    if (seen.has(t)) continue
    seen.add(t)
    deduped.push(t)
  }
  const current = (form.systems || []).map(s => String(s).trim())
  const sameLength = current.length === deduped.length
  const same = sameLength && current.every((v, i) => v === deduped[i])
  if (!same) {
    form.systems = deduped
  }
  form.systems = ids
}
const selectedEquip = computed<any[]>(() => {
  const sels = (form.systems || []).map(s => String(s || '').trim()).filter(Boolean)
  if (!sels.length) return []
  const ids = new Set<string>(sels)
  return equipmentInProject.value.filter((e: any) => ids.has(String(e?.id || e?._id || '')))
})

// Equipment pagination state
const equipPage = ref(1)
const equipPerPage = ref(10)
const equipTotalPages = computed(() => Math.max(1, Math.ceil(selectedEquip.value.length / equipPerPage.value)))
watch([selectedEquip, equipPerPage], () => {
  if (equipPage.value > equipTotalPages.value) equipPage.value = equipTotalPages.value
}, { immediate: true })
// Normalize saved selections once on mount
onMounted(() => {
  normalizeSelectedEquipmentTokens()
})
watch(() => equipmentInProject.value, () => {
  normalizeSelectedEquipmentTokens()
})
const pagedEquip = computed(() => {
  const start = (equipPage.value - 1) * equipPerPage.value
  return selectedEquip.value.slice(start, start + equipPerPage.value)
})

  // Debounce equipment changes save
  let queueSaveEquipment: any = null
  function queueSaveEquipmentChange() {
    if (queueSaveEquipment) clearTimeout(queueSaveEquipment)
    queueSaveEquipment = setTimeout(async () => {
      await saveEquipment()
    }, 300)
  }

function removeReviewedTag(e: any) {
  const tag = String(e?.tag || '').trim()
  if (!tag) return
  const id = String(e?.id || e?._id || '')
  const token = id || tag
  form.systems = (form.systems || []).filter(s => String(s).trim() !== token && String(s).trim().toLowerCase() !== tag.toLowerCase())
  normalizeSelectedEquipmentTokens()
  systemsText.value = ''
  queueSaveEquipmentChange()
}

// Add by searching from the input (press Enter)
function addByQueryCore() {
  const q = String(systemsText.value || '').trim()
  if (!q) return
  const lc = q.toLowerCase()
  const list = equipmentInProject.value
  // Try exact tag match first
  const exact = list.find((e: any) => String(e?.tag || '').trim().toLowerCase() === lc)
  let pick: any = exact || null
  if (!pick) {
    // Gather candidates across fields
    const cands = list.filter((e: any) => {
      const tag = String(e?.tag || '').toLowerCase()
      const title = String(e?.title || '').toLowerCase()
      const type = String(e?.type || '').toLowerCase()
      const sys = String(e?.system || '').toLowerCase()
      const loc = String(spaceName(e?.spaceId) || '').toLowerCase()
      return tag.includes(lc) || title.includes(lc) || type.includes(lc) || sys.includes(lc) || loc.includes(lc)
    })
    if (cands.length === 1) pick = cands[0]
    else if (cands.length === 0) { ui.showError(`No equipment found for "${q}"`) }
    else { ui.showError(`Multiple matches for "${q}". Please refine.`) }
  }
  if (pick) {
    const tag = String(pick.tag || '').trim()
    if (tag) {
      const token = String(pick.id || pick._id || tag)
      if (!(form.systems || []).some(s => String(s).trim() === token)) {
        form.systems = [...(form.systems || []), token]
        normalizeSelectedEquipmentTokens()
      }
    }
    systemsText.value = ''
  }
}

// Suggestions for the search input
function rankCandidate(e: any, q: string): number {
  const lc = q.toLowerCase()
  const tag = String(e?.tag || '').toLowerCase()
  const title = String(e?.title || '').toLowerCase()
  const type = String(e?.type || '').toLowerCase()
  const sys = String(e?.system || '').toLowerCase()
  const loc = String(spaceName(e?.spaceId) || '').toLowerCase()
  let score = 0
  if (tag === lc) score += 100
  if (tag.startsWith(lc)) score += 50
  if (title.startsWith(lc)) score += 25
  if (tag.includes(lc)) score += 15
  if (title.includes(lc)) score += 10
  if (sys.includes(lc)) score += 6
  if (type.includes(lc)) score += 4
  if (loc.includes(lc)) score += 2
  return score
}
const suggestions = computed<any[]>(() => {
  const q = String(systemsText.value || '').trim().toLowerCase()
  if (!q) return []
  // Build exclusion set: if a plain tag (no id token) is present, exclude that tag entirely.
  // If only id-specific tokens exist for a tag, allow selecting other instances with the same tag.
  const selectedRaw = (form.systems || []).map(s => String(s).trim()).filter(Boolean)
  const selectedTags = new Set<string>()
  const selectedIds = new Set<string>()
  for (const r of selectedRaw) {
    if (r.includes('::')) {
      const parts = r.split('::')
      const t = parts[0] || ''
      const id = parts.slice(1).join('::') || ''
      if (t) selectedTags.add(t.toLowerCase())
      if (id) selectedIds.add(id)
    } else {
      selectedTags.add(r.toLowerCase())
    }
  }
  const list = equipmentInProject.value
    .filter((e: any) => {
      const tag = String(e?.tag || '').trim().toLowerCase()
      const eid = String(e?.id || e?._id || '')
      // If a plain tag was selected (no id tokens), exclude all items with that tag.
      if (selectedTags.has(tag) && !(selectedIds.has(eid))) return false
      // If this exact equipment was already selected via id token, exclude it.
      if (selectedIds.has(eid)) return false
      const title = String(e?.title || '').toLowerCase()
      const type = String(e?.type || '').toLowerCase()
      const sys = String(e?.system || '').toLowerCase()
      const loc = String(spaceName(e?.spaceId) || '').toLowerCase()
      return tag.includes(q) || title.includes(q) || type.includes(q) || sys.includes(q) || loc.includes(q)
    })
    .sort((a: any, b: any) => rankCandidate(b, q) - rankCandidate(a, q))
  return list.slice(0, 8)
})
const suggestionsOpen = ref(false)
const showSuggestions = computed<boolean>(() => suggestionsOpen.value && !!systemsText.value && suggestions.value.length > 0)
function addSuggestion(e: any) {
  addReviewedTag(e)
  systemsText.value = ''
  closeSuggestions()
}

// Keyboard navigation for suggestions
const highlightedIndex = ref(-1)
watch(suggestions, (list) => {
  highlightedIndex.value = list.length ? 0 : -1
})
function onArrowDown() {
  const n = suggestions.value.length
  if (!n) return
  highlightedIndex.value = (highlightedIndex.value + 1 + n) % n
}
function onArrowUp() {
  const n = suggestions.value.length
  if (!n) return
  highlightedIndex.value = (highlightedIndex.value - 1 + n) % n
}
function onEsc() {
  highlightedIndex.value = -1
  systemsText.value = ''
  closeSuggestions()
}
function openSuggestions() { suggestionsOpen.value = true }
function closeSuggestions() { suggestionsOpen.value = false }
function onInputBlur() { setTimeout(() => closeSuggestions(), 100) }

// If Enter pressed and an item is highlighted, choose it
function addByQuery() {
  if (highlightedIndex.value >= 0 && suggestions.value[highlightedIndex.value]) {
    addSuggestion(suggestions.value[highlightedIndex.value])
    closeSuggestions()
    return
  }
  addByQueryCore()
  closeSuggestions()
}

// Keep equipment/spaces in sync if projectId changes while editing
watch(() => form.projectId, async (pid) => {
  if (pid) {
  try { await Promise.all([ equipmentStore.fetchByProject(String(pid)), spacesStore.fetchByProject(String(pid)) ]) } catch (e) { /* ignore */ }
  }
  })
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
  /* Constrain editor height so page doesn't grow endlessly */
  min-height: 16rem;   /* comfortable initial space */
  max-height: 50vh;    /* cap to viewport */
}
:deep(.ql-editor) {
  color: #fff;
  /* Make the editor area scroll inside the fixed container */
  max-height: 50vh;
  overflow-y: auto;
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
