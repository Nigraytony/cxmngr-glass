<template>
  <div class="space-y-4 text-white">
    <div>
      <BreadCrumbs
        :items="crumbs"
        class="mt-1 text-white/70"
      />
    </div>

    <template v-if="!loaded && !notFound">
      <div
        class="w-full rounded-2xl p-6 bg-white/6 backdrop-blur-xl border border-white/10 text-white/80 flex items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <Spinner />
        <div>
          <p class="text-sm uppercase tracking-wide">Loading issue…</p>
          <p class="text-xs text-white/60">Fetching issue details</p>
        </div>
      </div>
    </template>

    <template v-else>
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
            <!-- Icons per tab (match ActivityEdit.vue) -->
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
          class="grid md:grid-cols-2 gap-x-4 gap-y-2 items-start"
        >
          <!-- Left column stacked fields -->
          <div>
            <!-- Row: Number + Type -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-white/70">Number</label>
                <input
                  v-model.number="form.number"
                  type="number"
                  min="0"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                  placeholder="e.g. 101"
                >
              </div>
              <div>
                <label class="block text-sm text-white/70">Type</label>
                <select
                  v-model="form.type"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 disabled:opacity-60"
                >
                  <option
                    v-for="opt in issueTypeOptions"
                    :key="String(opt.value)"
                    :value="opt.value"
                  >
                    {{ opt.text }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Title below number/type -->
            <div class="mt-2">
              <label class="block text-sm text-white/70">Title</label>
              <input
                v-model="form.title"
                type="text"
                :disabled="isClosed"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                placeholder="Issue title"
              >
            </div>

            <!-- Priority / Status row -->
            <div class="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label class="block text-sm text-white/70">Priority</label>
                <select
                  v-model="form.priority"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 disabled:opacity-60"
                >
                  <option
                    v-for="opt in priorityOptions"
                    :key="String(opt.value)"
                    :value="opt.value"
                  >
                    {{ opt.text }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-white/70">Status</label>
                <select
                  v-model="form.status"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 disabled:opacity-60"
                >
                  <option
                    v-for="opt in statusOptions"
                    :key="String(opt.value)"
                    :value="opt.value"
                  >
                    {{ opt.text }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Closed By / Closed Date row (visible when closed) -->
            <div
              v-if="isClosed"
              class="grid grid-cols-2 gap-3 mt-2"
            >
              <div>
                <label class="block text-sm text-white/70">Closed By</label>
                <input
                  v-model="form.closedBy"
                  type="text"
                  disabled
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                >
              </div>
              <div>
                <label class="block text-sm text-white/70">Closed Date</label>
                <input
                  v-model="form.closedDate"
                  type="date"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                >
              </div>
            </div>

            <!-- Found By / Date Found row -->
            <div class="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label class="block text-sm text-white/70">Found By</label>
                <input
                  v-model="form.foundBy"
                  type="text"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                  placeholder="Name or team"
                >
              </div>
              <div>
                <label class="block text-sm text-white/70">Date Found</label>
                <input
                  v-model="form.dateFound"
                  type="date"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 disabled:opacity-60"
                >
              </div>
            </div>

            <!-- Location / System row -->
            <div class="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label class="block text-sm text-white/70">Location</label>
                <input
                  v-model="form.location"
                  type="text"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                  placeholder="e.g. Lobby, Level 2"
                >
              </div>
              <div>
                <label class="block text-sm text-white/70">System</label>
                <input
                  v-model="form.system"
                  type="text"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                  placeholder="e.g. HVAC, Lighting"
                >
              </div>
            </div>

            <!-- Assigned To / Due Date row -->
            <div class="grid grid-cols-2 gap-3 mt-2">
              <div>
                <div class="flex items-center justify-between">
                  <label class="block text-sm text-white/70">Assigned To</label>
                  <button
                    v-if="assignToMeLabel"
                    type="button"
                    class="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="isClosed"
                    @click="assignToMe"
                  >
                    Assign to me
                  </button>
                </div>
                <input
                  v-model="form.assignedTo"
                  type="text"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                  placeholder="Name / email"
                  :list="assignedListId"
                >
                <datalist :id="assignedListId">
                  <option
                    v-for="m in assignedToSuggestions"
                    :key="m"
                    :value="m"
                  >
                    {{ m }}
                  </option>
                </datalist>
              </div>
              <div>
                <label class="block text-sm text-white/70">Due Date</label>
                <input
                  v-model="form.dueDate"
                  type="date"
                  :disabled="isClosed"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 disabled:opacity-60"
                >
              </div>
            </div>

            <!-- Recommendation and Resolution below assigned/due, left column -->
          </div>

          <!-- Right column: Description -->
          <div class="md:row-span-4">
            <label class="block text-sm text-white/70">Description</label>
            <div class="rounded-md border border-white/20 bg-white/10">
              <QuillEditor
                :key="isClosed ? 'ro' : 'rw'"
                v-model:content="form.description"
                theme="snow"
                content-type="html"
                :read-only="isClosed"
                class="rounded-md min-h-[24rem]"
              />
            </div>
          </div>

          <!-- Recommendation and Resolution side by side below Description -->
          <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div>
              <label class="block text-sm text-white/70">Recommendation</label>
              <textarea
                v-model="form.recommendation"
                rows="3"
                :disabled="isClosed"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                placeholder="Recommendation"
              />
            </div>
            <div>
              <label class="block text-sm text-white/70">Resolution</label>
              <textarea
                v-model="form.resolution"
                rows="3"
                :disabled="isClosed"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                placeholder="Resolution"
              />
            </div>
          </div>

          <div class="md:col-span-2">
            <div class="flex items-center gap-3 mt-2 justify-end md:justify-start">
              <!-- Prev/Next navigation -->
              <button
                :disabled="!prevIssueId"
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous issue"
                @click="goPrevIssue"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Prev</span>
              </button>
              <button
                :disabled="!nextIssueId"
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next issue"
                @click="goNextIssue"
              >
                <span>Next</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <!-- Closed ON/OFF switch -->
              <div class="inline-flex items-center gap-2 ml-2 mr-1">
                <span class="text-sm select-none">Closed</span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="isClosedToggle"
                  class="relative inline-flex h-7 w-12 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="isClosedToggle ? 'bg-emerald-500/70 border-emerald-400/80' : 'bg-white/10 border-white/30'"
                  :disabled="saving"
                  aria-label="Toggle Closed"
                  @click="isClosedToggle = !isClosedToggle"
                  @keydown.space.prevent="isClosedToggle = !isClosedToggle"
                  @keydown.enter.prevent="isClosedToggle = !isClosedToggle"
                >
                  <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                    :class="isClosedToggle ? 'translate-x-6' : 'translate-x-1'"
                  />
                </button>
                <span
                  class="text-xs select-none"
                  :class="isClosedToggle ? 'text-emerald-200' : 'text-white/60'"
                >{{ isClosedToggle ? 'YES' : 'NO' }}</span>
              </div>
              <button
                :disabled="saving || isClosed"
                class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                :class="saving || isClosed ? 'opacity-60 cursor-not-allowed' : ''"
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
              <button
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2"
                title="Download PDF report"
                @click="downloadIssuePdf"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M12 3v11"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M8 11l4 4 4-4"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <rect
                    x="4"
                    y="18"
                    width="16"
                    height="2"
                    rx="1"
                    stroke-width="1.5"
                  />
                </svg>
                <span>Download PDF</span>
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
              :existing-count="(photos || []).length"
              button-label="Upload Photos"
              :upload="uploadPhoto"
              :concurrency="3"
              :disabled="isClosed"
            />
            <div class="mt-2 flex flex-wrap gap-2">
              <div
                v-for="(p,idx) in (photos || [])"
                :key="idx"
                class="relative group w-20 h-20 rounded-md overflow-hidden border border-white/20"
              >
                <div class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  class="absolute bottom-1.5 right-1.5 z-10 h-7 w-7 grid place-items-center rounded-md bg-black/60 hover:bg-black/75 border border-white/20 text-white/90 focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete photo"
                  aria-label="Delete photo"
                  :disabled="isClosed"
                  @click.stop="!isClosed && confirmRemove(idx)"
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
                    :src="p?.data || p"
                    class="w-full h-full object-cover"
                  >
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Comments Tab -->
        <div
          v-else-if="currentTab === 'Comments'"
          class="space-y-4"
        >
          <div
            :class="isClosed ? 'opacity-60 pointer-events-none' : ''"
            aria-disabled="true"
          >
            <Comments
              :model-value="form.comments"
              :on-add="isClosed ? undefined : onAddComment"
              :on-delete="isClosed ? undefined : onDeleteComment"
              @update:model-value="(v:any) => { if (!isClosed) form.comments = v }"
            />
          </div>
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
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/*,application/zip"
              :multiple="true"
              :concurrency="3"
              :disabled="isClosed"
            />
            <div class="mt-2 text-xs text-white/60">
              Accepted: PDF, Word, Excel, PowerPoint, CSV, TXT, images, and ZIP. Max ~10MB per file.
            </div>
          </div>
          <!-- Manual link add (optional) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label class="block text-sm text-white/70">Filename</label>
              <input
                v-model="newAttachment.filename"
                type="text"
                :disabled="isClosed"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                placeholder="specs.pdf"
              >
            </div>
            <div>
              <label class="block text-sm text-white/70">URL</label>
              <input
                v-model="newAttachment.url"
                type="url"
                :disabled="isClosed"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                placeholder="https://..."
              >
            </div>
            <div class="flex items-center gap-2">
              <button
                :disabled="isClosed"
                class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <div class="min-w-0">
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
                    :disabled="isClosed"
                    class="h-8 w-8 grid place-items-center rounded-md bg-red-500/20 border-2 border-red-400/80 text-red-200 hover:bg-red-500/50 hover:border-red-500/90 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-400/60 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove"
                    aria-label="Remove"
                    @click="removeAttachment(i)"
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
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Photo Viewer Modal -->
    <Modal v-model="viewerOpen">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="font-medium">
            Photo {{ (photos && photos.length) ? (viewerIndex + 1) : 0 }} / {{ (photos && photos.length) || 0 }}
          </div>
          <div class="text-white/70 text-sm">
            Press Esc or click outside to close
          </div>
        </div>
      </template>
      <div class="flex items-center justify-center">
        <div
          v-if="photos && photos.length"
          class="max-h-[70vh] max-w-full overflow-auto rounded-md border border-white/10 bg-black/20"
        >
          <img
            :src="(photos[viewerIndex]?.data || photos[viewerIndex])"
            class="block select-none"
            :style="{ transform: `rotate(${rotation}deg) scale(${zoom})`, transformOrigin: 'center center' }"
          >
        </div>
        <div
          v-else
          class="text-white/70"
        >
          No photos
        </div>
      </div>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-3 w-full">
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
              :disabled="isClosed"
              class="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/40 hover:bg-red-500/30 text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="removePhotoAt(viewerIndex)"
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
    <!-- Logs Tab -->
    <div
      v-if="currentTab === 'Logs'"
      class="space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="text-white/80">
          Issue logs
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
        class="text-white/70"
      >
        Loading logs...
      </div>
      <div v-else>
        <div
          v-if="!logsList.length"
          class="text-white/60"
        >
          No logs for this issue.
        </div>
        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="(l, idx) in logsList"
            :key="(l.ts || '') + String(idx)"
            class="p-2 rounded bg-white/5 border border-white/10"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm text-white/80">
                <span class="font-medium">{{ l.type }}</span>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import PhotoUploader from '../../components/PhotoUploader.vue'
import DocumentUploader from '../../components/DocumentUploader.vue'
import Comments from '../../components/Comments.vue'
import Modal from '../../components/Modal.vue'
import Spinner from '../../components/Spinner.vue'
import { confirm as inlineConfirm } from '../../utils/confirm'
import { getAuthHeaders } from '../../utils/auth'
import lists from '../../lists.js'
import { useIssuesStore } from '../../stores/issues'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { jsPDF } from 'jspdf'

const route = useRoute()
const router = useRouter()
const issues = useIssuesStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const auth = useAuthStore()

const id = computed(() => String(route.params.id))
const isNew = computed(() => id.value === 'new')
const saving = ref(false)
const loaded = ref(false)
const notFound = ref(false)

// Options sourced from src/lists.js
const issueTypeOptions = computed(() => (lists?.issueTypes || []))
const priorityOptions = computed(() => (lists?.issuePriorities || []))
const statusOptions = computed(() => (lists?.issueStatuses || []))

// Normalize legacy type strings to the new list values
function normalizeIssueType(v: any) {
  const val = (v ?? '').toString()
  if (!val) return null
  const opts: any[] = issueTypeOptions.value || []
  // Direct match on value
  const byValue = opts.find((o: any) => String(o.value) === String(val))
  if (byValue) return byValue.value
  // Match by display text (case-insensitive)
  const byText = opts.find((o: any) => String(o.text || '').toLowerCase() === val.toLowerCase())
  if (byText) return byText.value
  // Legacy mapping
  const legacyMap: Record<string, string> = {
    'Design': 'design',
    'Installation': 'installation',
    'Documentation': 'documentation',
    'Commissioning': 'fpt',
    'Warranty': 'documentation',
    'Other': 'documentation',
  }
  const mapped = legacyMap[val]
  return mapped ?? null
}

// Normalize priority to lists.issuePriorities values
function normalizePriority(v: any) {
  const val = (v ?? '').toString()
  if (!val) return null
  const opts: any[] = priorityOptions.value || []
  const byValue = opts.find((o: any) => String(o.value) === String(val))
  if (byValue) return byValue.value
  const byText = opts.find((o: any) => String(o.text || '').toLowerCase() === val.toLowerCase())
  if (byText) return byText.value
  const legacy: Record<string, string> = {
    'Low': 'low',
    'Medium': 'medium',
    'High': 'high',
    'Critical': 'critical',
    'Comment': 'comment',
  }
  const mapped = legacy[val] || legacy[val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()] || val.toLowerCase()
  // ensure mapped exists in options
  return opts.some(o => o.value === mapped) ? mapped : null
}

// Normalize status to lists.issueStatuses values
function normalizeStatus(v: any) {
  const val = (v ?? '').toString()
  if (!val) return null
  const opts: any[] = statusOptions.value || []
  const byValue = opts.find((o: any) => String(o.value) === String(val))
  if (byValue) return byValue.value
  const byText = opts.find((o: any) => String(o.text || '').toLowerCase() === val.toLowerCase())
  if (byText) return byText.value
  const legacy: Record<string, string> = {
    'Open': 'open',
    'In Progress': 'pending',
    'Progress': 'pending',
    'Pending': 'pending',
    'Started': 'pending',
    'Closed': 'closed',
    'Resolved': 'resolved',
    'Canceled': 'canceled',
    'Cancelled': 'canceled',
  }
  const mapped = legacy[val] || legacy[val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()] || val.toLowerCase()
  return opts.some(o => o.value === mapped) ? mapped : null
}

const form = reactive<any>({
  title: '',
  description: '',
  type: null as any,
  priority: 'medium',
  status: 'open',
  number: null as any,
  foundBy: '',
  dateFound: '',
  dueDate: '',
  assignedTo: '',
  location: '',
  system: '',
  recommendation: '',
  resolution: '',
  closedBy: '',
  closedDate: '',
  projectId: '',
  comments: [] as any[],
  attachments: [] as any[],
  photos: [] as any[],
})

const crumbs = computed(() => {
  const tail = isNew.value
    ? 'New Issue'
    : (form.number != null && form.number !== '')
      ? `Issue # ${form.number}`
      : 'Issue'
  return [
    { text: 'Dashboard', to: '/' },
    { text: 'Issues', to: '/issues' },
    { text: tail, to: '#' }
  ]
})

// Keep browser tab title in sync with the breadcrumb tail
const prevDocTitle = ref(document?.title || '')
const pageTitle = computed(() => (isNew.value
  ? 'New Issue'
  : (form.number != null && form.number !== '') ? `Issue # ${form.number}` : 'Issue'))
watch(pageTitle, (t) => { try { document.title = t } catch (e) { /* ignore document title errors */ } }, { immediate: true })
onBeforeUnmount(() => { try { document.title = prevDocTitle.value } catch (e) { /* ignore document title errors */ } })

// Utilities for PDF generation
function htmlToText(html: any): string {
  if (!html) return ''
  try {
    const tmp = document.createElement('div')
    tmp.innerHTML = String(html)
    const t = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim()
    return t
  } catch (e) {
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

type ImageFormat = 'PNG' | 'JPEG' | 'WEBP'

function mimeToFormat(mime?: string | null): ImageFormat | undefined {
  if (!mime) return undefined
  const m = mime.toLowerCase()
  if (m.includes('png')) return 'PNG'
  if (m.includes('jpeg') || m.includes('jpg')) return 'JPEG'
  if (m.includes('webp')) return 'WEBP'
  return undefined
}

async function loadImage(src?: string): Promise<{ dataUrl?: string, format?: ImageFormat }> {
  try {
    if (!src) return {}
    // If already a data URL, parse mime for format and return as-is
    if (src.startsWith('data:')) {
      const mime = src.slice(5, src.indexOf(';')) // data:image/png;base64,...
      let fmt = mimeToFormat(mime)
      // Convert WEBP or SVG to JPEG for wider compatibility in jsPDF
      if (fmt === 'WEBP' || (mime && mime.toLowerCase().includes('svg'))) {
        const conv = await convertDataUrlToJpeg(src)
        if (conv) return { dataUrl: conv, format: 'JPEG' }
      }
      return { dataUrl: src, format: fmt }
    }
    // Try to fetch and convert to data URL
    const res = await fetch(src)
    if (!res.ok) return {}
    const blob = await res.blob()
    const dataUrl: string = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    })
    let fmt = mimeToFormat(blob.type)
    // If SVG, convert to JPEG via canvas; also convert WEBP
    if ((blob.type && blob.type.toLowerCase().includes('svg')) || fmt === 'WEBP') {
      const conv = await convertDataUrlToJpeg(dataUrl)
      if (conv) return { dataUrl: conv, format: 'JPEG' }
    }
    return { dataUrl, format: fmt }
  } catch (e) {
    return {}
  }
}

async function convertDataUrlToJpeg(dataUrl: string, quality = 0.92): Promise<string | null> {
  try {
    // Create an image and draw to canvas, then export as JPEG
    const img = new Image()
    // Safe CORS for data URLs
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
  } catch (e) {
    return null
  }
}

function formatDate(dt?: string): string {
  try { return dt ? new Date(dt).toLocaleDateString() : '' } catch (e) { return '' }
}

function splitText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as unknown as string[]
}

async function downloadIssuePdf() {
  // Open a blank window immediately to preserve user-gesture context and avoid popup/download blocking
  const dlWin = window.open('', '_blank')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const bottomLimit = pageHeight - 26
  const pageDate = new Date().toLocaleDateString()
  let pageNo = 1
  let y = margin

  // Load logos (client left, CxA right)
  // Resolve project for header logos: prefer currentProject; if missing or id mismatch, fetch by form.projectId
  let project: any = (projectStore.currentProject && (projectStore.currentProject as any).value) || null
  const targetPid = form.projectId || (typeof window !== 'undefined' ? localStorage.getItem('selectedProjectId') : null)
  if (!project || (targetPid && (String(project._id || project.id) !== String(targetPid)))) {
    try {
      if (targetPid) project = await projectStore.fetchProject(String(targetPid))
  } catch (e) { /* ignore, fallback to {} */ }
  }
  project = project || {}
  const clientImg = await loadImage(project?.logo)
  const cxaImg = await loadImage(project?.commissioning_agent?.logo)

  // Load app footer logo once (PNG preferred, fall back to SVG)
  let footerLogo = await loadImage('/brand/logo.png')
  if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.svg')

  // Footer drawer for the current page
  const drawFooter = () => {
    const footerY = pageHeight - 10
    doc.setDrawColor(180, 180, 180)
    doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)
    // Left: logo + title
    try {
      if (footerLogo.dataUrl) {
        const lh = 5.5
        const lw = 12
        doc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', margin, footerY - lh, lw, lh)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
        const issueNumText = (form.number != null && form.number !== undefined) ? String(form.number) : String(id.value)
        const footerTitle = `Issue ${issueNumText} Report`
        doc.text(footerTitle, margin + lw + 2, footerY - 2)
      } else {
        // Fallback placeholder
        doc.setFillColor(220, 220, 220)
        doc.rect(margin, footerY - 5.5, 8, 5, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
        const issueNumText = (form.number != null && form.number !== undefined) ? String(form.number) : String(id.value)
        const footerTitle = `Issue ${issueNumText} Report`
        doc.text(footerTitle, margin + 10, footerY - 2)
      }
    } catch (e) {
      doc.setFillColor(220, 220, 220)
      doc.rect(margin, footerY - 5.5, 8, 5, 'F')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
      const issueNumText = (form.number != null && form.number !== undefined) ? String(form.number) : String(id.value)
      const footerTitle = `Issue ${issueNumText} Report`
      doc.text(footerTitle, margin + 10, footerY - 2)
    }
    // Middle: page number
    doc.setFont('helvetica', 'normal')
    doc.text(String(pageNo), pageWidth / 2, footerY - 2, { align: 'center' })
    // Right: date
    doc.text(pageDate, pageWidth - margin, footerY - 2, { align: 'right' })
  }

  // Header
  const logoH = 12
  if (clientImg.dataUrl) {
    doc.addImage(clientImg.dataUrl, clientImg.format || 'PNG', margin, y, logoH * 2.5, logoH)
  }
  if (cxaImg.dataUrl) {
    const w = logoH * 2.5
    doc.addImage(cxaImg.dataUrl, cxaImg.format || 'PNG', pageWidth - margin - w, y, w, logoH)
  }
  // Header (H1)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  const headerIssueNum = (form.number != null && form.number !== undefined) ? String(form.number) : String(id.value)
  doc.text(`Issue ${headerIssueNum} Report`, pageWidth / 2, y + 8, { align: 'center' })
  y += 22

  // Title: Issue # number — title (H2)
  const numberText = form.number != null ? `Issue # ${form.number}` : 'Issue'
  const titleText = form.title ? ` — ${form.title}` : ''
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const titleLines = splitText(doc, numberText + titleText, pageWidth - margin * 2)
  doc.text(titleLines, margin, y)
  y += Math.max(10, titleLines.length * 7) + 2

  // Key fields grid (2 columns)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const info: Array<[string, string]> = [
    ['Type', String(form.type || '')],
    ['Priority', String(form.priority || '')],
    ['Status', String(form.status || '')],
    ['Found By', String(form.foundBy || '')],
    ['Date Found', formatDate(form.dateFound)],
    ['Assigned To', String(form.assignedTo || '')],
    ['Due Date', formatDate(form.dueDate)],
    ['Location', String(form.location || '')],
    ['System', String(form.system || '')],
    ['Closed By', String(form.closedBy || '')],
    ['Closed Date', formatDate(form.closedDate)],
  ]
  const colW = (pageWidth - margin * 2) / 2
  const labelColor = 100
  let i = 0
  for (const [label, value] of info) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = margin + col * colW
    const yy = y + row * 7
    doc.setTextColor(labelColor)
    doc.text(label + ':', x, yy)
    doc.setTextColor(0)
    const vLines = splitText(doc, value, colW - 24)
    doc.text(vLines, x + 24, yy)
    // adjust y for wrapped values
    const consumed = (vLines.length - 1) * 5
    if (consumed > 0) {
      // push next row down if needed
      for (let j = i + 1; j < info.length; j += 2) {
        // noop; we'll just increase y after loop
      }
    }
    i++
  }
  const rows = Math.ceil(info.length / 2)
  y += rows * 7 + 2

  // Text sections
  const section = (heading: string, content?: string) => {
    const text = htmlToText(content || '').trim()
    if (!text) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(heading, margin, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const maxW = pageWidth - margin * 2
    let lines = splitText(doc, text, maxW)
    // Try to stay within one page: cap total height
    const maxContentHeight = pageHeight - margin - 34 - y // leave footer space
    const maxLines = Math.max(0, Math.floor(maxContentHeight / 5))
    if (lines.length * 5 > maxContentHeight) {
      lines = lines.slice(0, maxLines)
      if (lines.length) lines[lines.length - 1] += '…'
    }
    doc.text(lines, margin, y)
    y += Math.min(maxContentHeight, lines.length * 5) + 4
  }
  section('Description', form.description)
  section('Recommendation', form.recommendation)
  section('Resolution', form.resolution)

  // Optional sections: comments, photos, attachments
  // Comments (show all; allow pagination)
  try {
    const commentsArr: any[] = Array.isArray(form.comments) ? form.comments : []
    if (commentsArr.length) {
      const drawCommentsHeader = (continued = false) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
        doc.text(continued ? 'Comments (continued)' : 'Comments', margin, y)
        y += 6
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      }
      // Ensure room for header
      if (y + 6 > bottomLimit) {
        drawFooter(); doc.addPage(); pageNo++; y = margin
      }
      drawCommentsHeader(false)
      for (let c = 0; c < commentsArr.length; c++) {
        const cm = commentsArr[c]
        const namePart = cm?.name ? String(cm.name) : ''
        const datePart = cm?.createdAt ? formatDate(String(cm.createdAt)) : ''
        const prefix = namePart ? `${namePart}${datePart ? ` (${datePart})` : ''}: ` : ''
        const line = `${prefix}${htmlToText(cm?.text || '')}`
        const lines = splitText(doc, line, pageWidth - margin * 2)
        const needed = Math.min(12, lines.length * 4) + 2
        if (y + needed > bottomLimit) {
          drawFooter(); doc.addPage(); pageNo++; y = margin
          drawCommentsHeader(true)
        }
        doc.text(lines, margin, y)
        y += needed
      }
    }
  } catch (e) { /* ignore PDF layout errors */ }

  // Photos (up to 6)
  try {
    const phs: any[] = Array.isArray(form.photos) ? form.photos : []
    const imgs = [] as Array<{ dataUrl: string, format?: ImageFormat }>
    for (let p = 0; p < Math.min(6, phs.length); p++) {
      const src = typeof phs[p] === 'string' ? phs[p] : (phs[p]?.data || phs[p]?.url || phs[p]?.src)
      const img = await loadImage(src)
      if (img.dataUrl) imgs.push({ dataUrl: img.dataUrl, format: img.format })
    }
    if (imgs.length) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Photos', margin, y); y += 4
      const thumbW = (pageWidth - margin * 2 - 8) / 3 // 3 per row, 4mm gaps
      const thumbH = thumbW * 0.75
      for (let idx = 0; idx < imgs.length; idx++) {
        const col = idx % 3
        const row = Math.floor(idx / 3)
        const x = margin + col * (thumbW + 4)
        const yy = y + row * (thumbH + 4)
        if (yy + thumbH > pageHeight - 26) break
        const it = imgs[idx]
        doc.addImage(it.dataUrl, it.format || 'JPEG', x, yy, thumbW, thumbH)
      }
      y += Math.min(2, Math.ceil(imgs.length / 3)) * (thumbH + 4) + 2
    }
  } catch (e) { /* ignore photo generation errors */ }

  // Attachments (list up to 5)
  try {
    const atts: any[] = Array.isArray(form.attachments) ? form.attachments : []
    if (atts.length) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('Attachments', margin, y); y += 6
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
      const maxA = 5
      for (let a = 0; a < Math.min(maxA, atts.length); a++) {
        const att = atts[a]
        const name = (typeof att === 'string') ? att.split('/').pop() : (att?.name || att?.filename || att?.url || 'Attachment')
        const lines = splitText(doc, String(name), pageWidth - margin * 2)
        doc.text(lines, margin + 2, y)
        y += Math.min(10, lines.length * 4) + 1
      }
    }
  } catch (e) { /* ignore attachment rendering errors */ }

  // Footer for the final page
  drawFooter()

  const fname = `issue-${form.number || id.value}.pdf`
  try {
    if (dlWin) {
      // Stream to blob and navigate the pre-opened window to the object URL
      const blob = doc.output('blob') as Blob
      const url = URL.createObjectURL(blob)
      // Some browsers ignore setting document.title before navigation; harmless either way
  try { dlWin.document.title = fname } catch (e) { /* ignore cross-window access errors */ }
      dlWin.location.href = url
      // Revoke after some time to allow download/navigation
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } else {
      // Fallback: direct save (may be blocked if not in a user gesture)
      doc.save(fname)
    }
  } catch (e) {
    // Last-resort fallback
    doc.save(fname)
  }
}

onMounted(async () => {
  await projectStore.fetchProjects?.()?.catch(() => {})
  const pid = chooseProjectId()
  if (pid) form.projectId = pid
  // Ensure we have a list of issues for navigation
  try { await issues.fetchIssues(pid) } catch (e) { /* ignore issues fetch race */ }
  if (!isNew.value) {
    try {
      const i = await issues.fetchIssue(id.value)
  Object.assign(form, {
        title: i?.title || i?.type || '',
        description: i?.description || '',
        type: normalizeIssueType(i?.type),
        priority: normalizePriority(i?.priority || i?.severity) || 'medium',
        status: normalizeStatus(i?.status) || 'open',
        number: typeof i?.number === 'number' ? i.number : (i?.number ? Number(i.number) : null),
        foundBy: i?.foundBy || '',
        dateFound: i?.dateFound || '',
        dueDate: i?.dueDate || '',
        assignedTo: i?.assignedTo || i?.responsible_person || '',
        location: i?.location || '',
        system: i?.system || '',
        recommendation: i?.recommendation || '',
        resolution: i?.resolution || '',
        closedBy: i?.closedBy || '',
        closedDate: i?.closedDate || '',
        projectId: i?.projectId ? String(i.projectId) : form.projectId,
        comments: Array.isArray(i?.comments) ? normalizeComments(i?.comments) : [],
        // Prefer attachments from backend; fall back to legacy documents field if present
        attachments: Array.isArray((i as any)?.attachments) ? (i as any).attachments : (i as any)?.documents || [],
        photos: Array.isArray((i as any)?.photos) ? (i as any).photos : [],
      })
      loaded.value = true
    } catch (e: any) {
      // If the issue doesn't exist, redirect to list to avoid broken editor state
      if (e?.response?.status === 404) {
        notFound.value = true
        ui.showError('Issue not found')
        router.replace({ name: 'issues' })
      } else {
        ui.showError(e?.message || 'Failed to load issue')
      }
    }
  }
})

// When the route id changes but the component stays mounted, refetch the issue
watch(id, async (nv, ov) => {
  if (String(nv) === String(ov)) return
  loaded.value = false
  notFound.value = false
  if (String(nv) === 'new') {
    // reset to defaults for new issue
    Object.assign(form, {
      title: '', description: '', type: null, priority: 'medium', status: 'open',
      number: null, foundBy: '', dateFound: '', dueDate: '', assignedTo: '', location: '', system: '', recommendation: '', resolution: '',
      closedBy: '', closedDate: '',
      projectId: chooseProjectId(), comments: [], attachments: [], photos: []
    })
    return
  }
  try {
    const i = await issues.fetchIssue(String(nv))
    Object.assign(form, {
      title: i?.title || i?.type || '',
      description: i?.description || '',
      type: normalizeIssueType(i?.type),
      priority: normalizePriority(i?.priority || i?.severity) || 'medium',
      status: normalizeStatus(i?.status) || 'open',
      number: typeof i?.number === 'number' ? i.number : (i?.number ? Number(i.number) : null),
      foundBy: i?.foundBy || '',
      dateFound: i?.dateFound || '',
      dueDate: i?.dueDate || '',
      assignedTo: i?.assignedTo || i?.responsible_person || '',
      location: i?.location || '',
      system: i?.system || '',
      recommendation: i?.recommendation || '',
      resolution: i?.resolution || '',
      closedBy: i?.closedBy || '',
      closedDate: i?.closedDate || '',
      projectId: i?.projectId ? String(i.projectId) : form.projectId,
      comments: Array.isArray(i?.comments) ? normalizeComments(i?.comments) : [],
      attachments: Array.isArray((i as any)?.attachments) ? (i as any).attachments : (i as any)?.documents || [],
      photos: Array.isArray((i as any)?.photos) ? (i as any).photos : [],
    })
    loaded.value = true
  } catch (e: any) {
    if (e?.response?.status === 404) {
      notFound.value = true
      ui.showError('Issue not found')
      router.replace({ name: 'issues' })
    } else {
      ui.showError(e?.message || 'Failed to load issue')
    }
  }
})

async function save() {
  if (saving.value) return
  if (!form.title) { ui.showError('Title is required'); return }
  // Ensure we have a valid projectId (not '', 'null', or 'undefined')
  if (!isValidProjectId(form.projectId)) {
    const pid = chooseProjectId()
    if (pid) {
      form.projectId = pid
    } else {
      ui.showError('Select a project')
      return
    }
  }
  // If closing, ensure closedDate/closedBy are populated
  if (String(form.status || '').toLowerCase() === 'closed') {
    if (!form.closedDate) form.closedDate = isoDate(new Date())
    if (!form.closedBy) {
      const u = auth.user
      form.closedBy = `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || (u?.email || '')
    }
  }
  const payload: any = {
    title: form.title || form.type,
    description: form.description,
    type: form.type,
    severity: toApiPriority(form.priority) || undefined,
    assignedTo: form.assignedTo,
    status: toApiStatus(form.status) || undefined,
    number: typeof form.number === 'number' ? form.number : (form.number ? Number(form.number) : undefined),
    dateFound: form.dateFound || undefined,
    foundBy: form.foundBy || undefined,
    dueDate: form.dueDate || undefined,
    location: form.location || undefined,
    system: form.system || undefined,
    closedBy: form.closedBy || undefined,
    closedDate: form.closedDate || undefined,
    recommendation: form.recommendation || undefined,
    resolution: form.resolution || undefined,
    comments: form.comments,
    documents: form.attachments,
    photos: form.photos,
    // Ensure backend sees projectId for subscription guard
    projectId: isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId(),
  }
  try {
    saving.value = true
    if (isNew.value) {
      // Ensure correct projectId for creation
      const pid = chooseProjectId()
      if (!isValidProjectId(pid)) { ui.showError('Select a project'); saving.value = false; return }
      const created = await issues.createIssue({ ...payload, projectId: pid })
      router.replace({ name: 'issue-edit', params: { id: created.id || created._id } })
    } else {
      // Guard against attempting to update a non-existent issue
      if (!loaded.value || notFound.value) {
        ui.showError('Issue not found')
        router.replace({ name: 'issues' })
        return
      }
  // For updates, include projectId so middleware can validate subscription
  await issues.updateIssue(id.value, payload)
    }
    ui.showSuccess('Issue saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save issue')
  } finally {
    saving.value = false
  }
}

// Helper to create the issue immediately when needed (e.g., when adding a comment)
async function saveAndGetId(): Promise<string> {
  if (!isNew.value) return id.value
  if (!isValidProjectId(form.projectId)) {
    const pid = chooseProjectId()
    if (pid) form.projectId = pid
    else { ui.showError('Select a project'); throw new Error('projectId required') }
  }
  if (!form.title && !form.type) { ui.showError('Title is required'); throw new Error('title required') }
  const payload: any = {
    projectId: chooseProjectId(),
    title: form.title || form.type,
    description: form.description || '',
    type: form.type,
    severity: toApiPriority(form.priority) || undefined,
    assignedTo: form.assignedTo,
    status: toApiStatus(form.status) || undefined,
    number: typeof form.number === 'number' ? form.number : (form.number ? Number(form.number) : undefined),
    dateFound: form.dateFound || undefined,
    foundBy: form.foundBy || undefined,
    dueDate: form.dueDate || undefined,
    location: form.location || undefined,
    system: form.system || undefined,
    recommendation: form.recommendation || undefined,
    resolution: form.resolution || undefined,
    comments: form.comments || [],
    documents: form.attachments || [],
    photos: form.photos || [],
  }
  const created = await issues.createIssue(payload)
  const nid = String(created.id || (created as any)._id)
  router.replace({ name: 'issue-edit', params: { id: nid } })
  return nid
}

// Tabs logic
const tabs = ['Info', 'Photos', 'Comments', 'Attachments', 'Logs']
const currentTab = ref('Info')
const activeIndex = computed(() => {
  const i = tabs.indexOf(currentTab.value)
  return i >= 0 ? i : 0
})
const tabLeft = computed(() => (activeIndex.value * 100) / tabs.length)
const tabWidth = computed(() => 100 / tabs.length)

// Logs tab
const logsList = ref<any[]>([])
const logsLoading = ref(false)
async function loadLogs() {
  const iid = String(route.params.id)
  if (!iid || iid === 'new') return
  logsLoading.value = true
  try {
    const { useLogsStore } = await import('../../stores/logs')
    const logs = useLogsStore()
    const list = await logs.fetchLogs('issues', iid)
    logsList.value = Array.isArray(list) ? list : []
  } catch (e) {
    logsList.value = []
  } finally {
    logsLoading.value = false
  }
}

watch(currentTab, (v) => {
  if (v === 'Logs') loadLogs()
})

// Ensure the issues list is available for navigation
const issuesList = computed(() => Array.isArray(issues.issues) ? issues.issues : [])
const sortedIssues = computed(() => {
  const arr = [...issuesList.value]
  // Prefer numeric issue number ascending if available; otherwise newest updatedAt/createdAt first
  arr.sort((a: any, b: any) => {
    const na = Number(a?.number || 0)
    const nb = Number(b?.number || 0)
    if (na && nb && na !== nb) return na - nb
    const da = new Date(a?.updatedAt || a?.createdAt || 0).getTime()
    const db = new Date(b?.updatedAt || b?.createdAt || 0).getTime()
    return db - da
  })
  return arr
})
const currentIndex = computed(() => sortedIssues.value.findIndex((it: any) => String(it?.id || it?._id) === id.value))
const prevIssueId = computed(() => {
  if (isNew.value) return ''
  const idx = currentIndex.value
  if (idx > 0) return String(sortedIssues.value[idx - 1]?.id || sortedIssues.value[idx - 1]?._id || '')
  return ''
})
const nextIssueId = computed(() => {
  if (isNew.value) return ''
  const idx = currentIndex.value
  if (idx >= 0 && idx < sortedIssues.value.length - 1) return String(sortedIssues.value[idx + 1]?.id || sortedIssues.value[idx + 1]?._id || '')
  return ''
})
function goPrevIssue() { if (prevIssueId.value) router.replace({ name: 'issue-edit', params: { id: prevIssueId.value } }) }
function goNextIssue() { if (nextIssueId.value) router.replace({ name: 'issue-edit', params: { id: nextIssueId.value } }) }

// Comments helpers (reuse auth)
async function onAddComment(text: string) {
  const t = (text || '').trim()
  if (!t) return
  // Ensure issue exists if creating from 'new'
  const iid = isNew.value ? await saveAndGetId() : id.value
  const name = `${auth.user?.firstName || ''} ${auth.user?.lastName || ''}`.trim() || (auth.user?.email || 'Anonymous')
  const avatar = (auth.user as any)?.avatar || (auth.user as any)?.contact?.avatar || ''
  const next = [ ...(form.comments || []), { userId: (auth.user as any)?._id || (auth.user as any)?.id, name, avatar, text: t, createdAt: new Date().toISOString() } ]
  try {
    const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
    await issues.updateIssue(String(iid), { projectId: pid, comments: commentsForSave(next) })
    form.comments = next
    ui.showSuccess('Comment added')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to add comment')
    throw e
  }
}

async function onDeleteComment(comment: any, index?: number) {
  // Ensure issue exists
  const iid = isNew.value ? await saveAndGetId() : id.value
  const next = [ ...(form.comments || []) ]
  let idx = typeof index === 'number' ? index : next.findIndex((c: any) => c === comment || (c.createdAt === comment?.createdAt && c.text === comment?.text))
  if (idx < 0) idx = next.length - 1
  if (idx < 0) return
  next.splice(idx, 1)
  try {
    const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
    await issues.updateIssue(String(iid), { projectId: pid, comments: commentsForSave(next) })
    form.comments = next
    ui.showSuccess('Comment removed')
  } catch (e:any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove comment')
    throw e
  }
}

// Minimal helpers
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

// Attachment kind and metadata helpers
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
function formatBytes(bytes?: any): string {
  const n = Number(bytes)
  if (!isFinite(n) || n <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(n) / Math.log(1024))
  const val = n / Math.pow(1024, i)
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
function attachmentSize(a: any): string { return formatBytes(a?.size ?? a?.fileSize ?? a?.contentLength) }
function attachmentUploadedAt(a: any): string {
  const d = a?.uploadedAt || a?.createdAt || a?.date || a?.timestamp
  try { return d ? new Date(d).toLocaleString() : '' } catch (e) { return '' }
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
async function removeAttachment(i: number) {
  const iid = isNew.value ? id.value : id.value
  if (iid && iid !== 'new') {
    try {
      const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
      await axios.delete(`${getApiBase()}/api/issues/${iid}/attachments/${i}?projectId=${encodeURIComponent(pid)}`, { headers: { ...getAuthHeaders() } })
      const updated = await issues.fetchIssue(String(iid)).catch(() => null)
      if (updated) form.attachments = Array.isArray((updated as any).attachments) ? (updated as any).attachments : (updated as any).documents || []
      ui.showSuccess('Attachment removed')
      return
    } catch (e: any) {
      ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove attachment')
    }
  }
  form.attachments.splice(i, 1)
}

// Upload photos
import axios from 'axios'
import { getApiBase } from '../../utils/api'
async function uploadPhoto(file: File, onProgress: (pct: number) => void) {
  // Ensure we have an issue id to target
  const iid = isNew.value ? await saveAndGetId() : id.value
  const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
  const url = `${getApiBase()}/api/issues/${iid}/photos`
  const fd = new FormData()
  // include projectId in case middleware reads body (we also set server-side)
  fd.append('projectId', pid)
  fd.append('photos', file, file.name)
  const res = await axios.post(url, fd, {
    headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders() },
    onUploadProgress: (ev) => {
      if (!ev.total) return
      const pct = Math.round((ev.loaded * 100) / ev.total)
      onProgress(pct)
    },
  })
  const updated = res.data
  form.photos = Array.isArray(updated?.photos) ? updated.photos : form.photos
  return updated
}
async function uploadDocument(file: File, onProgress: (pct: number) => void) {
  // Ensure issue exists
  const iid = isNew.value ? await saveAndGetId() : id.value
  const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
  const fd = new FormData()
  fd.append('projectId', pid)
  fd.append('attachments', file)
  const res = await axios.post(`${getApiBase()}/api/issues/${iid}/attachments`, fd, {
    headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders() },
    onUploadProgress: (e: any) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)) },
  })
  const updated = await issues.fetchIssue(String(iid)).catch(() => null)
  if (updated) form.attachments = Array.isArray((updated as any).attachments) ? (updated as any).attachments : (updated as any).documents || []
  return res.data
}

// Counts per tab for badges
function countForTab(t: string): number {
  if (t === 'Photos') return (photos?.value || []).length
  if (t === 'Comments') return (form.comments || []).length
  if (t === 'Attachments') return (form.attachments || []).length
  return 0
}

// Normalize comments from backend to the shape expected by Comments component
function normalizeComments(arr: any[]): any[] {
  return (arr || []).map((c: any) => {
    if (c && typeof c === 'object') {
      if (typeof c.text === 'string') return c
      if (typeof c.comment === 'string') return { ...c, text: c.comment }
      if (typeof c.content === 'string') return { ...c, text: c.content }
    }
    // fallback if stored as plain string
    return { text: String(c || '') }
  })
}

// Prepare a minimal, safe comments payload for API (avoid large base64 avatars)
function safeAvatarForSave(a?: string): string {
  if (!a) return ''
  const s = String(a)
  // Filter out data URLs and overly long strings to keep payload small
  if (s.startsWith('data:')) return ''
  if (s.length > 1024) return ''
  try {
    const u = new URL(s)
    if (u.protocol === 'http:' || u.protocol === 'https:') return s
    return ''
  } catch (e) {
    return ''
  }
}
function commentsForSave(arr: any[]): any[] {
  return (arr || []).map((c: any) => ({
    userId: c?.userId || c?.user?.id || c?.user?._id || undefined,
    name: c?.name || '',
    text: c?.text || c?.comment || c?.content || '',
    createdAt: c?.createdAt || new Date().toISOString(),
    avatar: safeAvatarForSave(c?.avatar),
  }))
}

// Map UI values to legacy API values (case/labels) for compatibility
function toApiPriority(v: any): string | undefined {
  const m: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical', comment: 'Comment' }
  const k = String(v || '').toLowerCase()
  return m[k] || undefined
}
function toApiStatus(v: any): string | undefined {
  const m: Record<string, string> = {
    open: 'Open',
    pending: 'In Progress',
    closed: 'Closed',
    resolved: 'Resolved',
    canceled: 'Canceled',
    cancelled: 'Canceled',
  }
  const k = String(v || '').toLowerCase()
  return m[k] || undefined
}

// Helpers to ensure a valid project id is used when saving/creating
function isValidProjectId(pid: any): boolean {
  const s = String(pid || '')
  return Boolean(s && s !== 'null' && s !== 'undefined')
}
function chooseProjectId(): string {
  // Build a lookup from loaded projects
  const list: any[] = Array.isArray((projectStore as any).projects) ? (projectStore as any).projects : []
  const byId = (id: string) => list.find((p: any) => String(p?.id || p?._id) === String(id))

  // 1) Prefer localStorage selectedProjectId (as requested)
  const fromLocal = localStorage.getItem('selectedProjectId') || ''
  const sLocal = String(fromLocal || '')
  if (isValidProjectId(sLocal) && (!list.length || byId(sLocal))) return sLocal

  // 2) If editing existing issue, prefer its projectId
  if (isValidProjectId(form.projectId) && (!list.length || byId(String(form.projectId)))) return String(form.projectId)

  // 3) Fall back to store's currentProjectId if valid and present
  const fromStore = (projectStore.currentProjectId as any) || ''
  const sStore = String(fromStore || '')
  if (isValidProjectId(sStore) && (!list.length || byId(sStore))) return sStore

  // 4) Last resort: first available project in list
  if (list.length) {
    const first = String(list[0]?.id || (list[0] as any)?._id || '')
    if (isValidProjectId(first)) return first
  }
  return ''
}

// Keep form.projectId in sync if user changes selection elsewhere and form lacks a valid id
watch(() => projectStore.currentProjectId, (nv) => {
  if (!isValidProjectId(form.projectId)) {
    const s = String(nv || '')
    if (isValidProjectId(s)) form.projectId = s
  }
})

// Photos viewer state and helpers
const photos = computed<any[]>(() => Array.isArray(form.photos) ? form.photos : [])
const viewerOpen = ref(false)
const viewerIndex = ref(0)
const zoom = ref(1)
const rotation = ref(0)

function openViewer(i: number) { viewerIndex.value = i; viewerOpen.value = true }
function closeViewer() { viewerOpen.value = false; zoom.value = 1; rotation.value = 0 }
function nextPhoto() { if (!photos.value.length) return; viewerIndex.value = (viewerIndex.value + 1) % photos.value.length }
function prevPhoto() { if (!photos.value.length) return; viewerIndex.value = (viewerIndex.value - 1 + photos.value.length) % photos.value.length }
function zoomIn() { zoom.value = Math.min(3, zoom.value + 0.25) }
function zoomOut() { zoom.value = Math.max(1, zoom.value - 0.25) }
function rotateRight() { rotation.value = (rotation.value + 90) % 360 }
async function removePhotoAt(idx: number) {
  try {
    const iid = isNew.value ? await saveAndGetId() : id.value
    const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
    const delUrl = `${getApiBase()}/api/issues/${String(iid)}/photos/${idx}?projectId=${encodeURIComponent(pid)}`
    await axios.delete(delUrl, { headers: { ...getAuthHeaders() } })
    const arr = Array.isArray(form.photos) ? [...form.photos] : []
    arr.splice(idx, 1)
    form.photos = arr
    ui.showSuccess('Photo removed')
    if (viewerOpen.value) {
      const len = photos.value.length
      if (len === 0) { viewerOpen.value = false } else if (viewerIndex.value >= len) { viewerIndex.value = Math.max(0, len - 1) }
    }
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

function onKey(e: KeyboardEvent) {
  if (!viewerOpen.value) return
  if (e.key === 'ArrowRight') { e.preventDefault(); nextPhoto() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prevPhoto() }
}
onMounted(() => window.addEventListener('keydown', onKey))
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

function openAttachment(i: number) { selectedAttachmentIndex.value = i; attachmentViewerOpen.value = true }
function openInNewTab(u: string) { try { window.open(u, '_blank', 'noopener') } catch (e) { /* ignore window.open failures */ } }
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
watch(attachmentViewerOpen, (v) => { if (!v) attachmentFullscreen.value = false })

// Assigned To suggestions and helpers
const assignedListId = 'assignedToList'
const assignedToSuggestions = computed<string[]>(() => {
  const team = (projectStore.currentProject as any)?.team || []
  const list: string[] = []
  for (const m of team) {
    const name = `${m.firstName || ''} ${m.lastName || ''}`.trim()
    const company = m.company || ''
    if (name && company) list.push(`${name} (${company})`)
    else if (name) list.push(name)
    else if (company) list.push(company)
  }
  // unique
  return Array.from(new Set(list))
})
const assignToMeLabel = computed(() => {
  const team = (projectStore.currentProject as any)?.team || []
  const myEmail = auth.user?.email || ''
  const meInTeam = myEmail ? team.find((m: any) => (m?.email || '').toLowerCase() === myEmail.toLowerCase()) : null
  const name = `${auth.user?.firstName || meInTeam?.firstName || ''} ${auth.user?.lastName || meInTeam?.lastName || ''}`.trim()
  const company = meInTeam?.company || (auth.user as any)?.company || ''
  if (name && company) return `${name} (${company})`
  return name || company || ''
})
function assignToMe() {
  if (assignToMeLabel.value) form.assignedTo = assignToMeLabel.value
}

// Simple ISO date helper (YYYY-MM-DD)
function isoDate(d: any) {
  try {
    const dt = d instanceof Date ? d : new Date(d)
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch (e) { return '' }
}

// Closed/canceled toggle and disabled state
const isClosed = computed(() => {
  const s = String(form.status || '').toLowerCase()
  return s === 'closed' || s === 'canceled' || s === 'cancelled'
})
async function persistClosedStatus(next: boolean, prev: boolean) {
  try {
    // For new issues, ensure we can save/create; if not, revert
    if (isNew.value) {
      if (!form.title && !form.type) {
        ui.showError('Title is required to save')
        form.status = prev ? 'closed' : 'open'
        return
      }
      await saveAndGetId()
      ui.showSuccess(next ? 'Closed' : 'Reopened')
      return
    }
    if (!loaded.value || notFound.value) {
      ui.showError('Issue not found')
      form.status = prev ? 'closed' : 'open'
      return
    }
    const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
    // Build payload including closed metadata
    const user = auth.user
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || ''
    const payload: any = { projectId: pid, status: (toApiStatus(form.status) as any) || undefined }
    if (next) {
      if (!form.closedDate) form.closedDate = isoDate(new Date())
      if (!form.closedBy) form.closedBy = name
      payload.closedDate = form.closedDate
      payload.closedBy = form.closedBy
    } else {
      form.closedDate = ''
      form.closedBy = ''
      payload.closedDate = null
      payload.closedBy = null
    }
    await issues.updateIssue(id.value, payload)
    ui.showSuccess(next ? 'Closed' : 'Reopened')
  } catch (e: any) {
    // Revert on failure
    form.status = prev ? 'closed' : 'open'
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to update status')
  }
}
const isClosedToggle = computed({
  get: () => isClosed.value,
  set: (v: boolean) => {
    const prev = isClosed.value
    form.status = v ? 'closed' : 'open'
    // Fire and forget persist; UI shows saving state and toasts
    persistClosedStatus(v, prev)
  }
})
</script>

<style scoped>
/* Glassy theme for Quill to match other inputs (copied from ActivityEdit.vue) */
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
