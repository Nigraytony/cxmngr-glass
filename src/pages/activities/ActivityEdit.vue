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
          class="mt-1 mb-4 text-white/70"
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
              <div class="mt-3">
                <div class="flex items-center gap-3">
                  <div class="text-sm text-white/70 shrink-0">
                    Tags
                  </div>
                  <button
                    v-if="canSuggestActivityTags"
                    type="button"
                    class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="suggestingActivityTags"
                    @click="suggestActivityTags"
                  >
                    {{ suggestingActivityTags ? 'Suggesting…' : 'Suggest tags' }}
                  </button>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="t in form.labels"
                      :key="t"
                      class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/80"
                    >
                      <span>{{ t }}</span>
                      <button
                        type="button"
                        class="text-white/60 hover:text-white"
                        aria-label="Remove tag"
                        @click="removeLabel(t)"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <input
                    v-model="labelInput"
                    type="text"
                    placeholder="Add a tag and press Enter…"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                    @keydown.enter.prevent="addLabelFromInput"
                    @keydown.,.prevent="addLabelFromInput"
                  >
                  <button
                    type="button"
                    class="h-10 px-3 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
                    @click="addLabelFromInput"
                  >
                    Add
                  </button>
                </div>
                <div class="text-xs text-white/60 mt-1">
                  Tip: use commas or Enter to add multiple tags.
                </div>
                <div
                  v-if="suggestedActivityTagsFiltered.length"
                  class="mt-2 rounded-md border border-white/10 bg-black/20 p-3"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-xs text-white/60">
                      Suggested tags
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80"
                        @click="applyAllSuggestedActivityTags"
                      >
                        Add all
                      </button>
                      <button
                        type="button"
                        class="px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-white/70"
                        @click="dismissSuggestedActivityTags"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <button
                      v-for="s in suggestedActivityTagsFiltered"
                      :key="s.tag"
                      type="button"
                      class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/85 hover:bg-white/15"
                      :title="s.reason || ''"
                      @click="addLabel(String(s.tag || ''))"
                    >
                      <span>{{ s.tag }}</span>
                      <span
                        v-if="typeof s.confidence === 'number'"
                        class="text-white/60"
                      >{{ Math.round(s.confidence * 100) }}%</span>
                    </button>
                  </div>
                </div>
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

              <div class="mt-3">
                <label class="block text-sm text-white/70">Status</label>
                <select
                  v-model="form.status"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90"
                >
                  <option value="draft">
                    Draft
                  </option>
                  <option value="published">
                    Published
                  </option>
                  <option value="completed">
                    Completed
                  </option>
                </select>
              </div>

              <div
                v-if="linkedTasks.length > 0"
                class="md:col-span-1 mt-3"
              >
                <label class="block text-sm text-white/70">Linked Tasks</label>
                <div class="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/80">
                  <div
                    v-if="linkedTasksLoading"
                    class="text-white/60"
                  >
                    Loading…
                  </div>
                  <div
                    v-else
                    class="space-y-1"
                  >
                    <div
                      v-for="t in linkedTasks"
                      :key="t._id"
                      class="flex items-center justify-between gap-2"
                    >
                      <div class="min-w-0 truncate">
                        <span
                          v-if="t.wbs"
                          class="text-white/60"
                        >{{ t.wbs }} — </span>{{ t.name }}
                      </div>
                      <RouterLink
                        :to="{ name: 'task-edit', params: { id: t._id } }"
                        class="text-xs text-white/70 hover:text-white underline shrink-0"
                      >
                        Open
                      </RouterLink>
                    </div>
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
              <label class="block text-sm text-white/70">Location</label>
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
                  to="/app/issues"
                  class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2"
                >
                  Manage Issues
                </RouterLink>
              </div>
            </div>
            <!-- Link existing Issue -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div>
                <label class="block text-sm text-white/70">Link existing issue</label>
                <div class="relative">
                  <input
                    v-model="issueSearch"
                    type="text"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                    placeholder="Search issues by number, title, type..."
                    @focus="openIssueSuggestions"
                    @input="openIssueSuggestions"
                    @keydown.down.prevent="onIssueArrowDown"
                    @keydown.up.prevent="onIssueArrowUp"
                    @keydown.enter.prevent="addHighlightedIssue"
                    @keydown.esc.prevent="closeIssueSuggestions"
                    @blur="onIssueInputBlur"
                  >
                  <div
                    v-if="showIssueSuggestions"
                    class="absolute left-0 right-0 mt-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-white/20 z-20 max-h-64 overflow-auto"
                  >
                    <div
                      v-if="issueSuggestionsLoading"
                      class="px-3 py-2 text-xs text-white/60"
                    >
                      Searching…
                    </div>
                    <button
                      v-for="(iss, idx) in issueSuggestions"
                      :key="iss.id"
                      type="button"
                      class="w-full px-3 py-2 text-left inline-flex flex-col gap-0.5 text-sm"
                      :class="idx === issueHighlightedIndex ? 'bg-white/20' : 'hover:bg-white/10'"
                      @mousedown.prevent="linkExistingIssue(iss)"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-medium text-white truncate">
                          {{ iss.title || iss.type || ('Issue #' + (iss.number ?? '')) }}
                        </span>
                        <span class="text-xs text-white/60 whitespace-nowrap">
                          #{{ iss.number ?? '—' }}
                        </span>
                      </div>
                      <div class="text-xs text-white/60 truncate">
                        {{ iss.type || '—' }} • {{ iss.status || 'Open' }}
                      </div>
                    </button>
                    <div
                      v-if="!issueSuggestions.length"
                      class="px-3 py-2 text-xs text-white/60"
                    >
                      No matching issues
                    </div>
                    <div
                      class="sticky bottom-0 border-t border-white/10 bg-black/70 backdrop-blur px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="text-xs text-white/60 whitespace-nowrap">
                          <span v-if="issueSuggestTotal">
                            Total {{ issueSuggestTotal }}
                          </span>
                          <span v-else>—</span>
                        </div>
                        <div class="text-xs text-white/60 whitespace-nowrap">
                          <span v-if="issueSuggestTotal">
                            Showing {{ issueSuggestStart }}–{{ issueSuggestEnd }}
                          </span>
                        </div>
                        <div class="text-xs text-white/60 whitespace-nowrap">
                          <span v-if="issueSuggestTotal">
                            Page {{ issueSuggestPage }} / {{ issueSuggestTotalPages }}
                          </span>
                        </div>
                        <div class="flex items-center gap-2 whitespace-nowrap">
                          <label class="text-xs text-white/60">Per page</label>
                          <select
                            v-model.number="issueSuggestPerPage"
                            class="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs text-white/80"
                            @change="onIssueSuggestPerPageChange"
                          >
                            <option :value="10">
                              10
                            </option>
                            <option :value="12">
                              12
                            </option>
                            <option :value="25">
                              25
                            </option>
                            <option :value="50">
                              50
                            </option>
                          </select>
                        </div>
                      </div>
                      <div class="flex items-center gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          class="px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80 disabled:opacity-40"
                          :disabled="!issueSuggestHasPrev"
                          @mousedown.prevent="issueSuggestFirst"
                        >
                          First
                        </button>
                        <button
                          type="button"
                          class="px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80 disabled:opacity-40"
                          :disabled="!issueSuggestHasPrev"
                          @mousedown.prevent="issueSuggestPrev"
                        >
                          Prev
                        </button>
                        <button
                          type="button"
                          class="px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80 disabled:opacity-40"
                          :disabled="!issueSuggestHasNext"
                          @mousedown.prevent="issueSuggestNext"
                        >
                          Next
                        </button>
                        <button
                          type="button"
                          class="px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80 disabled:opacity-40"
                          :disabled="!issueSuggestHasNext"
                          @mousedown.prevent="issueSuggestLast"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <IssuesTable
              :issues="issuesForActivity"
              :show-unlink="true"
              @unlink="onUnlinkIssue"
            />
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
                  class="rounded-lg border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/7"
                  @click="toggleLogExpanded(idx)"
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
                    v-if="logExpandedIndex === idx && l.details"
                    class="mt-2 text-xs text-white/70"
                  >
                    <template v-if="l.details && l.details.changes && Object.keys(l.details.changes).length">
                      <div class="text-white/60 mb-2">
                        Changed fields: <span class="text-white/80">{{ (l.details.changedKeys || Object.keys(l.details.changes)).join(', ') }}</span>
                      </div>
                      <div class="space-y-2">
                        <div
                          v-for="(c, key) in l.details.changes"
                          :key="String(key)"
                          class="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-md border border-white/10 bg-black/10 p-2"
                        >
                          <div>
                            <div class="text-[10px] uppercase tracking-wide text-white/50 mb-1">
                              {{ String(key) }} (from)
                            </div>
                            <pre class="text-xs text-white/70 whitespace-pre-wrap break-words">{{ prettyJson(c?.from) }}</pre>
                          </div>
                          <div>
                            <div class="text-[10px] uppercase tracking-wide text-white/50 mb-1">
                              {{ String(key) }} (to)
                            </div>
                            <pre class="text-xs text-white/70 whitespace-pre-wrap break-words">{{ prettyJson(c?.to) }}</pre>
                          </div>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <pre class="text-xs text-white/70 whitespace-pre-wrap break-words">{{ prettyJson(l.details) }}</pre>
                    </template>
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
                    @dragover.prevent
                    @drop.prevent="(ev) => onEquipDrop(ev, e)"
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
                          class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 cursor-grab active:cursor-grabbing"
                          title="Reorder"
                          aria-label="Reorder"
                          draggable="true"
                          @dragstart="(ev) => onEquipDragStart(ev, e)"
                        >
                          <!-- Drag handle -->
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            class="w-4 h-4"
                          >
                            <path
                              d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"
                              stroke-width="3"
                              stroke-linecap="round"
                            />
                          </svg>
                        </button>
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

      <IssueForm v-model="activityIssueDraft" />

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
        <div class="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm"
            :class="reportSettingsTab === 'general' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5'"
            @click="reportSettingsTab = 'general'"
          >
            General Settings
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm"
            :class="reportSettingsTab === 'cover' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5'"
            @click="reportSettingsTab = 'cover'"
          >
            Cover Page
          </button>
        </div>

        <div
          v-if="reportSettingsTab === 'general'"
          class="space-y-4"
        >
          <div class="grid grid-cols-2 gap-3">
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.coverPage"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Cover Page</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.toc"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Table of Contents</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.info"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Info</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.description"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Description</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.photos"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Photos</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.issues"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Issues</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.attachments"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Attachments</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.equipmentList"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Equipment List</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="activityReport.include.equipmentReports"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Append Equipment Reports</span>
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

        <div
          v-else
          class="space-y-4"
        >
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="block text-white/80 mb-1">Cover title</label>
              <input
                v-model="activityReport.coverTitle"
                type="text"
                placeholder="Activity Report"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 placeholder-white/40"
              >
            </div>
            <div>
              <label class="block text-white/80 mb-1">Cover subtitle</label>
              <input
                v-model="activityReport.coverSubtitle"
                type="text"
                placeholder="Activity Name"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 placeholder-white/40"
              >
            </div>
            <div>
              <label class="block text-white/80 mb-1">By line (optional)</label>
              <input
                v-model="activityReport.coverByLine"
                type="text"
                placeholder="By: John Doe, PE (JDE Inc.)"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 placeholder-white/40"
              >
              <div class="text-xs text-white/60 mt-1">
                Printed below the Location field on the cover page.
              </div>
            </div>
            <div>
              <label class="block text-white/80 mb-1">Jumbotron photo (optional)</label>
              <div class="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  class="block w-full text-white/80 text-sm"
                  @change="onCoverJumbotronSelected"
                >
                <button
                  v-if="activityReport.coverJumbotronDataUrl"
                  type="button"
                  class="px-3 py-2 rounded-md bg-red-500/20 border border-red-500/30 text-red-100 hover:bg-red-500/30 text-sm"
                  @click="clearCoverJumbotron"
                >
                  Remove
                </button>
              </div>
              <div
                v-if="activityReport.coverJumbotronDataUrl"
                class="mt-3"
              >
                <img
                  :src="activityReport.coverJumbotronDataUrl"
                  class="max-h-40 w-full object-contain rounded-md border border-white/10 bg-black/10"
                >
              </div>
            </div>
          </div>
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
/* eslint-disable no-mixed-spaces-and-tabs */
  import { onMounted, reactive, computed, ref, watch } from 'vue'
  import { jsPDF } from 'jspdf'
  import { drawBrandedFooter, drawBrandedHeader } from '../../utils/pdfBranding'
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
import IssueForm from '../../components/IssueForm.vue'
import { useIssuesStore } from '../../stores/issues'
import { useEquipmentStore } from '../../stores/equipment'
  import { useSpacesStore } from '../../stores/spaces'
import Spinner from '../../components/Spinner.vue'
import { useAiStore } from '../../stores/ai'
import type { SuggestedTag } from '../../stores/ai'

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
const ai = useAiStore()

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
    coverPage: boolean
    toc: boolean
    info: boolean
    description: boolean
    photos: boolean
    issues: boolean
    attachments: boolean
    equipmentList: boolean
    equipmentReports: boolean
  }
  photoLimit: number
  coverTitle: string
  coverSubtitle: string
  coverByLine: string
  coverJumbotronDataUrl: string
}
const activityReport = ref<ActivityReportSettings>({
  include: { coverPage: false, toc: false, info: true, description: true, photos: true, issues: true, attachments: true, equipmentList: true, equipmentReports: true },
  photoLimit: 6,
  coverTitle: 'Activity Report',
  coverSubtitle: '',
  coverByLine: '',
  coverJumbotronDataUrl: '',
})
const showActivityReportDialog = ref(false)
const reportSettingsTab = ref<'general' | 'cover'>('general')
function openReportSettings() {
  reportSettingsTab.value = 'general'
  showActivityReportDialog.value = true
}
function loadActivityReportSettingsFromSession() {
  try {
    const raw = sessionStorage.getItem(ACTIVITY_REPORT_SESSION_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      activityReport.value = {
        include: { ...activityReport.value.include, ...(parsed.include || {}) },
        photoLimit: Math.max(0, Number(parsed.photoLimit ?? activityReport.value.photoLimit)),
        coverTitle: typeof parsed.coverTitle === 'string' ? parsed.coverTitle : activityReport.value.coverTitle,
        coverSubtitle: typeof parsed.coverSubtitle === 'string' ? parsed.coverSubtitle : activityReport.value.coverSubtitle,
        coverByLine: typeof parsed.coverByLine === 'string' ? parsed.coverByLine : activityReport.value.coverByLine,
        coverJumbotronDataUrl: typeof parsed.coverJumbotronDataUrl === 'string' ? parsed.coverJumbotronDataUrl : activityReport.value.coverJumbotronDataUrl,
      }
      return true
    }
  } catch (e) { /* ignore sessionStorage read errors */ }
  return false
}
function loadActivityReportSettingsFromActivitySettings() {
  try {
    const settings = (form as any).settings
    const persisted = settings && typeof settings === 'object' ? (settings as any).report : null
    if (!persisted || typeof persisted !== 'object') return false
    activityReport.value = {
      include: { ...activityReport.value.include, ...(persisted.include || {}) },
      photoLimit: Math.max(0, Number(persisted.photoLimit ?? activityReport.value.photoLimit)),
      coverTitle: typeof persisted.coverTitle === 'string' ? persisted.coverTitle : activityReport.value.coverTitle,
      coverSubtitle: typeof persisted.coverSubtitle === 'string' ? persisted.coverSubtitle : activityReport.value.coverSubtitle,
      coverByLine: typeof persisted.coverByLine === 'string' ? persisted.coverByLine : activityReport.value.coverByLine,
      coverJumbotronDataUrl: typeof persisted.coverJumbotronDataUrl === 'string' ? persisted.coverJumbotronDataUrl : activityReport.value.coverJumbotronDataUrl,
    }
    return true
  } catch (_) {
    return false
  }
}
async function saveActivityReportSettings() {
  try { sessionStorage.setItem(ACTIVITY_REPORT_SESSION_KEY, JSON.stringify(activityReport.value)) } catch (e) { /* ignore sessionStorage write errors */ }
  // Persist to the activity record (best-effort)
  try {
    const aid = isNew.value ? await saveAndGetId() : id.value
    if (aid && aid !== 'new') {
      const existing = ((form as any).settings && typeof (form as any).settings === 'object') ? (form as any).settings : {}
      const nextSettings = { ...existing, report: activityReport.value }
      ;(form as any).settings = nextSettings
      await store.updateActivity(String(aid), { settings: nextSettings } as any)
    }
  } catch (e: any) {
    // Don't block the UI; show a soft error so users know persistence failed.
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save report settings')
  }
  showActivityReportDialog.value = false
}
function resetActivityReportSettings() {
  activityReport.value = {
    include: { coverPage: false, toc: false, info: true, description: true, photos: true, issues: true, attachments: true, equipmentList: true, equipmentReports: true },
    photoLimit: 6,
    coverTitle: 'Activity Report',
    coverSubtitle: '',
    coverByLine: '',
    coverJumbotronDataUrl: '',
  }
}
watch(activityReport, () => { try { sessionStorage.setItem(ACTIVITY_REPORT_SESSION_KEY, JSON.stringify(activityReport.value)) } catch (e) { /* ignore sessionStorage write errors */ } }, { deep: true })

async function onCoverJumbotronSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
    activityReport.value.coverJumbotronDataUrl = dataUrl
  } catch (err: any) {
    ui.showError(err?.message || 'Failed to load image')
  } finally {
    try { input.value = '' } catch (_) { /* ignore */ }
  }
}
function clearCoverJumbotron() {
  activityReport.value.coverJumbotronDataUrl = ''
}

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
  status: 'draft' as 'draft' | 'published' | 'completed',
  startDate: '',
  endDate: '',
  projectId: '',
  location: '',
  // selected space id (if chosen via the space picker)
  spaceId: null as string | null,
  systems: [] as string[],
  labels: [] as string[],
  comments: [] as any[],
  attachments: [] as any[],
  issues: [] as string[],
  settings: {} as any,
})


const systemsText = ref('')
const labelInput = ref('')
const suggestingActivityTags = ref(false)
const suggestedActivityTags = ref<SuggestedTag[]>([])
const canSuggestActivityTags = computed(() => {
  const pid = resolvedProjectId()
  if (!pid) return false
  const p: any = projectStore.currentProject || {}
  if (p.ai && p.ai.enabled === false) return false
  const tier = String(p.subscriptionTier || '').toLowerCase()
  const hasFeature = p.subscriptionFeatures && (p.subscriptionFeatures.ai === true || p.subscriptionFeatures.AI === true)
  return tier === 'premium' || hasFeature
})

function normalizeLabels(labels: any): string[] {
  const arr = Array.isArray(labels) ? labels : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of arr) {
    const t = String(raw || '').trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

function addLabelFromInput() {
  const raw = String(labelInput.value || '')
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return
  form.labels = normalizeLabels([...(form.labels || []), ...parts])
  labelInput.value = ''
}

function addLabel(label: string) {
  const tag = String(label || '').trim()
  if (!tag) return
  form.labels = normalizeLabels([...(form.labels || []), tag])
}

function removeLabel(label: string) {
  const key = String(label || '').trim().toLowerCase()
  form.labels = (form.labels || []).filter((t) => String(t || '').trim().toLowerCase() !== key)
}

const suggestedActivityTagsFiltered = computed(() => {
  const existing = new Set((form.labels || []).map((t: string) => String(t || '').trim().toLowerCase()).filter(Boolean))
  const list = Array.isArray(suggestedActivityTags.value) ? suggestedActivityTags.value : []
  return list
    .filter((s: any) => s && s.tag && !existing.has(String(s.tag).trim().toLowerCase()))
    .slice(0, 12)
})

function dismissSuggestedActivityTags() {
  suggestedActivityTags.value = []
}

function applyAllSuggestedActivityTags() {
  for (const s of suggestedActivityTagsFiltered.value) addLabel(String((s as any).tag || ''))
  dismissSuggestedActivityTags()
}

async function suggestActivityTags() {
  const pid = resolvedProjectId()
  if (!pid) {
    ui.showError('No project selected')
    return
  }
  suggestingActivityTags.value = true
  try {
    const entity = {
      name: String(form.name || '').trim(),
      type: String(form.type || '').trim(),
      status: String(form.status || '').trim(),
      location: String(form.location || '').trim(),
      systems: Array.isArray(form.systems) ? form.systems : [],
      description: htmlToText(form.descriptionHtml || ''),
    }
    const allowed = Array.isArray(projectStore.currentProject?.tags) ? projectStore.currentProject?.tags : []
    const tags = await ai.suggestTags(pid, 'activity', entity, { existingTags: form.labels || [], allowedTags: allowed as any })
    suggestedActivityTags.value = Array.isArray(tags) ? tags : []
    if (!suggestedActivityTagsFiltered.value.length) ui.showInfo('No new tag suggestions')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to suggest tags')
  } finally {
    suggestingActivityTags.value = false
  }
}

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
    if (isNew.value) {
      try {
        const q: any = (route.query as any) || {}
        const name = String(q.name || q.title || '').trim()
        const type = String(q.type || '').trim()
        const location = String(q.location || '').trim()
        const spaceId = String(q.spaceId || '').trim()
        const status = String(q.status || '').trim().toLowerCase()
        const startDate = String(q.startDate || '').trim()
        const endDate = String(q.endDate || '').trim()

        if (name) form.name = name
        if (type && types.includes(type)) form.type = type
        if (location) form.location = location
        if (spaceId) form.spaceId = spaceId
        if (status === 'draft' || status === 'published' || status === 'completed') (form as any).status = status
        const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
        if (startDate && isDate(startDate)) form.startDate = startDate
        if (endDate && isDate(endDate)) form.endDate = endDate
      } catch (_) { /* ignore prefill errors */ }
    }
    if (!isNew.value) {
      let activityData: any = null
      // Prefer project-scoped list lookup to avoid 404 noise
      try {
        const pid = String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
        if (pid) {
          const list = await store.fetchActivities(pid)
          activityData = (list || []).find((a: any) => String(a?.id || a?._id) === String(id.value)) || null
        }
      } catch (_) { /* ignore */ }
      // Fallback to direct fetch by id only if not found via list
      if (!activityData) {
        try {
          // Use the full activity payload here so production backends that omit `descriptionHtml`
          // in `light=true` responses still populate the editor/Info tab correctly.
          activityData = await store.fetchActivity(id.value)
        } catch (e: any) {
          try { ui.showError(e?.response?.data?.error || e?.message || 'Failed to load activity') } catch (_) { /* ignore */ }
        }
      }
      if (activityData) {
      // Ensure selected project matches the activity's project for downstream loads
      try {
        const actPid = String(activityData.projectId || '')
        if (actPid) {
          if (typeof (projectStore as any).setCurrentProjectId === 'function') {
            (projectStore as any).setCurrentProjectId(actPid)
          }
          try { localStorage.setItem('selectedProjectId', actPid) } catch (_) { /* ignore */ }
        }
      } catch (_) { /* non-blocking */ }
      Object.assign(form, {
        name: activityData?.name || '',
        // Prefer stored HTML; fallback to plain description if present
        descriptionHtml: activityData?.descriptionHtml || activityData?.description || '',
        type: activityData?.type || 'Site Visit Review',
        status: activityData?.status || 'draft',
        startDate: activityData?.startDate ? activityData.startDate.substring(0,10) : form.startDate,
        endDate: activityData?.endDate ? activityData.endDate.substring(0,10) : form.endDate,
        projectId: activityData?.projectId || form.projectId,
        location: activityData?.location || '',
        spaceId: (activityData as any)?.spaceId || null,
        systems: activityData?.systems || [],
        labels: normalizeLabels((activityData as any)?.labels),
        issues: Array.isArray((activityData as any)?.issues) ? (activityData as any).issues : [],
      })
      // Persisted settings bucket (e.g., report settings)
      ;(form as any).settings = ((activityData as any)?.settings && typeof (activityData as any).settings === 'object')
        ? (activityData as any).settings
        : {}
      // Hydrate report settings: prefer session (in-progress UI state), otherwise load persisted settings.
      if (!loadActivityReportSettingsFromSession()) {
        loadActivityReportSettingsFromActivitySettings()
      }
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
    }
  } finally {
    pageLoading.value = false
  }
  try { await loadLinkedTasks() } catch (_) { /* ignore */ }
})

const currentTab = ref('Info')
const photosLoaded = ref(false)
const issuesLoaded = ref(false)
const commentsLoaded = ref(false)
const attachmentsLoaded = ref(false)
const equipmentLoaded = ref(false)
const logsLoaded = ref(false)
const fullEquipmentCache = new Map<string, any>()

const linkedTasks = ref<any[]>([])
const linkedTasksLoading = ref(false)

async function loadLinkedTasks() {
  const aid = String(isNew.value ? (pendingCreatedId.value || id.value || '') : (id.value || '')).trim()
  const pid = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
  if (!aid || !pid || aid === 'new') { linkedTasks.value = []; return }
  linkedTasksLoading.value = true
  try {
    const resp = await http.get('/api/tasks', { params: { projectId: pid, activityId: aid, limit: 1000 } })
    linkedTasks.value = Array.isArray(resp?.data?.tasks) ? resp.data.tasks : []
  } catch (e) {
    linkedTasks.value = []
  } finally {
    linkedTasksLoading.value = false
  }
}

function hasPhotoData(list: any): boolean {
  const arr = Array.isArray(list) ? list : []
  return arr.some((p: any) => p && p.data)
}

async function loadPhotos() {
  const aid = String(isNew.value ? (pendingCreatedId.value || id.value || '') : (id.value || '')).trim()
  if (!aid) return
  try {
    // Ensure store.current points at this activity so fetchActivityPhotos can hydrate it.
    const cur = store.current
    if (!cur || String((cur as any).id || (cur as any)._id || '') !== aid) {
      try { await store.fetchActivity(aid, { light: true }) } catch (_) { /* ignore */ }
    }
    const photos = await store.fetchActivityPhotos(aid)
    ;(form as any).photos = Array.isArray(photos) ? photos : []
    photosLoaded.value = hasPhotoData(photos)
  } catch (e) {
    // non-blocking: leave current state as-is
  }
}

// Ensure all heavy data is loaded before generating reports (photos, attachments, issues, equipment)
async function ensureReportData() {
  const pid = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
  const toYmd = (v: any): string => {
    if (!v) return ''
    if (typeof v === 'string') {
      // Accept yyyy-MM-dd already or normalize ISO timestamps
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
      if (v.includes('T') && v.length >= 10) return v.slice(0, 10)
      // Best-effort parse
      const d = new Date(v)
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
      return v
    }
    try {
      const d = new Date(v)
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
    } catch (e) { /* ignore */ }
    return ''
  }
  // Avoid direct `/api/activities/:id?includePhotos=true` fetches here because if the
  // activity id is stale/missing it spams the browser console with 404s, and the
  // report can be generated from already-loaded state.
  try {
    const cur = store.current
    if (cur && String((cur as any).id || (cur as any)._id || '') === String(id.value || '')) {
      Object.assign(form, cur as any)
    } else if (pid && id.value) {
      // Best-effort hydrate from the project list without hitting the single-activity endpoint.
      const list = await store.fetchActivities(pid)
      const found = (list || []).find((a: any) => String(a?.id || a?._id) === String(id.value))
      if (found) Object.assign(form, found as any)
    }
    // Normalize date inputs (the UI uses <input type="date"> which requires yyyy-MM-dd).
    form.startDate = toYmd((form as any).startDate)
    form.endDate = toYmd((form as any).endDate)

    // Mark what we can as loaded based on current form data.
    photosLoaded.value = Array.isArray((form as any).photos)
    attachmentsLoaded.value = Array.isArray((form as any).attachments)
    commentsLoaded.value = Array.isArray((form as any).comments)
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

async function resolveActivity(options?: { includePhotos?: boolean }) {
  const aid = String(id.value)
  // Prefer store.current if it matches id
  const cur = store.current
  if (cur && String((cur as any).id || (cur as any)._id) === aid) return cur
  // Prefer project list lookup to avoid 404s
  try {
    const pid = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
    if (pid) {
      const list = await store.fetchActivities(pid)
      const found = (list || []).find((a: any) => String(a?.id || a?._id) === aid)
      if (found) return found
    }
  } catch (_) { /* ignore */ }
  // Fallback to direct fetch (no error surfacing here)
  try { return await store.fetchActivity(aid, options || {}) } catch (_) { return null }
}

watch(() => currentTab.value, async (tab) => {
  if (isNew.value) return
  const pid = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
  if (tab === 'Photos' && (!photosLoaded.value || !hasPhotoData((current.value as any)?.photos))) {
    try {
      await loadPhotos()
    } catch (e) { /* ignore */ }
  }
  if (tab === 'Issues' && !issuesLoaded.value && pid) {
    try { await issuesStore.fetchIssues(pid); issuesLoaded.value = true } catch (e) { /* ignore */ }
  }
  if (tab === 'Comments' && !commentsLoaded.value) {
    try { const a = await resolveActivity({ includePhotos: false }); form.comments = (a as any)?.comments || []; commentsLoaded.value = true } catch (e) { /* ignore */ }
  }
  if (tab === 'Attachments' && !attachmentsLoaded.value) {
    try { const a = await resolveActivity({ includePhotos: false }); form.attachments = (a as any)?.attachments || []; attachmentsLoaded.value = true } catch (e) { /* ignore */ }
  }
  if (tab === 'Equipment' && !equipmentLoaded.value && pid) {
    try { await Promise.all([ equipmentStore.fetchByProject(pid), spacesStore.fetchByProject(pid) ]); equipmentLoaded.value = true } catch (e) { /* ignore */ }
  }
  if (tab === 'Logs' && !logsLoaded.value) {
    try { await loadLogs(); logsLoaded.value = true } catch (e) { /* ignore */ }
  }
})

// Ensure issues load once project context becomes available, even if the user
// navigated to the Issues tab before projectId was set.
watch(
  () => [form.projectId, projectStore.currentProjectId],
  async () => {
    if (isNew.value) return
    const pid = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
    if (currentTab.value === 'Issues' && !issuesLoaded.value && pid) {
      try { await issuesStore.fetchIssues(pid); issuesLoaded.value = true } catch (e) { /* ignore */ }
    }
  }
)

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
  const payload: any = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() }
  // Ensure projectId is always present (fallback to current project if needed)
  payload.projectId = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
  // Persist report settings into activity.settings.report on every activity save.
  const existingSettings = (payload.settings && typeof payload.settings === 'object') ? payload.settings : {}
  payload.settings = { ...existingSettings, report: activityReport.value }
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
  try {
    const photos = await store.fetchActivityPhotos(String(targetId))
    ;(form as any).photos = Array.isArray(photos) ? photos : []
    photosLoaded.value = hasPhotoData(photos)
  } catch (e) { /* ignore */ }
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
  const base: any = { ...form, startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString() }
  const existingSettings = (base.settings && typeof base.settings === 'object') ? base.settings : {}
  base.settings = { ...existingSettings, report: activityReport.value }
  const created = await store.createActivity(base)
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
function setBodyFont(doc: any, weight: 'normal' | 'bold' = 'normal') {
  doc.setFont('helvetica', weight)
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
function htmlToText(html?: string): string {
  if (!html) return ''
  try {
    const tmp = document.createElement('div')
    tmp.innerHTML = String(html)
    const t = tmp.textContent || tmp.innerText || ''
    return t.replace(/\s+/g, ' ').trim()
  } catch (e) {
    // Fallback: naive tag strip
    return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

async function downloadActivityPdf() {
  if (!id.value || isNew.value || downloading.value) return
  downloading.value = true
  loadActivityReportSettingsFromSession()
  const generatingToast = 'Generating PDF… this can take up to 5 minutes for large reports.'
  ui.showInfo(generatingToast, { duration: 10000 })
  try {
    await ensureReportData()
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    // Helvetica is default; SourceSansPro removed
    setZeroCharSpace(doc)
    setBodyFont(doc, 'normal')
      const margin = 12
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const bottomLimit = pageHeight - 26
      const pageDate = new Date().toLocaleDateString()
      let pageNo = 1
      let y = margin
      let pageHasBodyContent = false
      const markBodyContent = () => { pageHasBodyContent = true }
      // Resolve project logos (reuse current project store)
      const project: any = projectStore.currentProject || {}
      const clientImg = await loadImage((project as any)?.logo)
      const cxaImg = await loadImage((project as any)?.commissioning_agent?.logo)
      // Footer branding: icon + "cxma"
      let footerLogo = await loadImage('/brand/logo-2.png'); if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo-2.svg')
      if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.png')
      if (!footerLogo.dataUrl) footerLogo = await loadImage('/brand/logo.svg')
      const drawFooter = () => {
      const prevFont = (doc as any).getFont ? (doc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
      const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 9
      drawBrandedFooter(doc, {
        margin,
        pageWidth,
        pageHeight,
        pageNo,
        pageDate,
        footerLogo,
        leftLabel: `${form.name || 'Activity'} Report`,
        setBold: () => setBodyFont(doc, 'bold'),
        setNormal: () => setBodyFont(doc, 'normal'),
        })
        doc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal'); doc.setFontSize(prevSize)
      }
      const drawHeader = () => {
        const prevFont = (doc as any).getFont ? (doc as any).getFont() : { fontName: 'helvetica', fontStyle: 'normal' }
        const prevSize = (doc as any).getFontSize ? (doc as any).getFontSize() : 9
        const res = drawBrandedHeader(doc, {
          margin,
          pageWidth,
          title: `${form.name || 'Activity'} Report`,
        leftLogo: clientImg,
        rightLogo: cxaImg,
        logoH: 12,
        maxLogoW: 36,
          titleFontSize: 20,
          setTitleFont: () => setBodyFont(doc, 'bold'),
        })
        y = res.nextY
        doc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal'); doc.setFontSize(prevSize)
      }
      const ensureSpace = (amount: number): boolean => {
        if (y + amount > bottomLimit) {
          drawFooter()
          doc.addPage()
          pageNo++
          y = margin
          pageHasBodyContent = false
          drawHeader()
          return true
        }
        return false
      }
      const sectionGap = (gap = 6) => { ensureSpace(gap); y += gap }
      // Do not include the standard report header on the cover page.
      if (!activityReport.value.include.coverPage) drawHeader()

    // Optional cover + TOC pages (inserted before main content)
    if (activityReport.value.include.coverPage) {
      // No header on the cover page.
      y = margin
      const projectName = String((projectStore.currentProject as any)?.name || '')
      const projectLabel = projectName || String(form.projectId || '')
      const dateRange = [form.startDate, form.endDate].filter(Boolean).join(' – ')

      // Titles are fully user-controlled; if left blank, we omit them.
      const coverTitle = String(activityReport.value.coverTitle || '').trim()
      const coverSubtitle = String(activityReport.value.coverSubtitle || '').trim()
      const coverByLine = String(activityReport.value.coverByLine || '').trim()
        const coverJumboSrc = String(activityReport.value.coverJumbotronDataUrl || '').trim()

        // Start cover content just below logos.
        let coverY = y
        if (coverTitle) {
          setBodyFont(doc, 'bold')
          doc.setFontSize(22)
          doc.text(coverTitle, pageWidth / 2, coverY + 10, { align: 'center' })
          coverY += 14
        }
        if (coverSubtitle) {
          setBodyFont(doc, 'bold')
          doc.setFontSize(18)
          doc.text(coverSubtitle, pageWidth / 2, coverY + 10, { align: 'center' })
          coverY += 12
        }
        if (coverTitle || coverSubtitle) markBodyContent()
        setBodyFont(doc, 'normal')
        doc.setFontSize(12)

      const meta: Array<[string, string]> = [
        ['Project', projectLabel],
        ['Type', String(form.type || '')],
        ['Dates', dateRange || '—'],
        ['Location', String(form.location || '—')],
      ]
      if (coverByLine) meta.push(['By', coverByLine])

      const lineH = 7
      const metaBlockH = meta.length * lineH
        const metaStartY = Math.max(coverY + 18, bottomLimit - metaBlockH - 10)

        // Jumbotron photo in the middle of the page (optional)
        if (coverJumboSrc) {
          const boxX = margin
          const boxW = pageWidth - margin * 2
          const boxTop = coverY + 6
          const boxBottom = metaStartY - 8
          const boxH = boxBottom - boxTop
          if (boxH > 20) {
            const img = await loadImage(coverJumboSrc)
            if (img?.dataUrl) {
            const iw = Number((img as any).width || 0)
            const ih = Number((img as any).height || 0)
            const aspect = (iw > 0 && ih > 0) ? (iw / ih) : 1.6
            let drawW = boxW
            let drawH = drawW / aspect
              if (drawH > boxH) { drawH = boxH; drawW = drawH * aspect }
              const dx = boxX + (boxW - drawW) / 2
              const dy = boxTop + (boxH - drawH) / 2
              try { doc.addImage(img.dataUrl, img.format || 'JPEG', dx, dy, drawW, drawH) } catch (e) { /* ignore */ }
              markBodyContent()
            }
          }
        }

        let cy = metaStartY
        for (const [k, v] of meta) {
          doc.setTextColor(100)
          doc.text(`${k}:`, margin, cy)
          doc.setTextColor(0)
          doc.text(String(v || '—'), margin + 26, cy)
          markBodyContent()
          cy += lineH
        }
        y = cy + 2
        drawFooter()
        doc.addPage(); pageNo++; y = margin; pageHasBodyContent = false; drawHeader()
      }

      if (activityReport.value.include.toc) {
        const items: string[] = []
        if (activityReport.value.include.info) items.push('Info')
        if (activityReport.value.include.description) items.push('Description')
        if (activityReport.value.include.photos) items.push('Photos')
        if (activityReport.value.include.equipmentList && selectedEquip.value.length) items.push('Equipment List')
        if (activityReport.value.include.issues) items.push('Issues')
        if (activityReport.value.include.equipmentReports && selectedEquip.value.length) items.push('Equipment Reports')
        if (activityReport.value.include.attachments) items.push('Attachments')

        ensureSpace(14)
        setBodyFont(doc, 'bold'); doc.setFontSize(16); doc.text('Table of Contents', margin, y); y += 10
        markBodyContent()
        setBodyFont(doc, 'normal'); doc.setFontSize(12)
        for (const it of items) {
          ensureSpace(7)
          doc.text(`• ${it}`, margin + 2, y)
          markBodyContent()
          y += 7

          // For "Equipment Reports", include sub-bullets for each equipment in current order.
          if (it === 'Equipment Reports' && selectedEquip.value.length) {
            const eqItems = [...(selectedEquip.value || [])]
            for (const eq of eqItems) {
              const tag = String(eq?.tag || '').trim()
              const title = String(eq?.title || '').trim()
              const label = [tag, title].filter(Boolean).join(' — ') || 'Equipment'
              ensureSpace(6)
              doc.text(`- ${label}`, margin + 8, y)
              markBodyContent()
              y += 6
            }
            y += 2
          }
        }
        y += 2
        drawFooter()
        doc.addPage(); pageNo++; y = margin; pageHasBodyContent = false; drawHeader()
      }

      // Info
      if (activityReport.value.include.info) {
        setBodyFont(doc, 'bold'); doc.setFontSize(12); doc.text('Info', margin, y); y += 6; setBodyFont(doc, 'normal'); doc.setFontSize(12)
        markBodyContent()
        const projectName = String((projectStore.currentProject as any)?.name || '')
        const projectLabel = projectName || String(form.projectId || '')
        const info: Array<[string,string]> = [
          ['Type', form.type],
          ['Start', form.startDate],
          ['End', form.endDate],
        ['Location', form.location],
          ['Project', projectLabel]
        ]
        const colW = (pageWidth - margin*2) / 2
        let i = 0
        for (const [label, value] of info) {
          const col = i % 2
          const row = Math.floor(i / 2)
          const x = margin + col * colW
          const yy = y + row * 8
          ensureSpace(11)
          doc.setTextColor(100)
          doc.text(label + ':', x, yy)
          doc.setTextColor(0)
          const lines = doc.splitTextToSize(String(value || '—'), colW - 24) as string[]
          doc.text(lines, x + 24, yy)
          markBodyContent()
          i++
        }
        const rows = Math.ceil(info.length / 2)
        y += rows * 8 + 2
      }
    // Description (rich HTML rendering)
    if (activityReport.value.include.description && form.descriptionHtml) {
      // Render description content without the "Description" label
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
        // 12pt ≈ 16px (Word 12)
        .replace(/<p/gi,'<p style="font-size:16px; margin:2px 0; line-height:1.35;"')
        .replace(/<ul/gi,'<ul style="margin:4px 0; padding-left:18px; list-style-type:disc; list-style-position:outside;"')
        .replace(/<ol/gi,'<ol style="margin:4px 0; padding-left:18px; list-style-type:decimal; list-style-position:outside;"')
        .replace(/<li/gi,'<li style="font-size:16px; margin:1px 0;"')
      document.body.appendChild(container)
      const pxPerMm = 3.7795275591
      const mmPerPx = 1 / pxPerMm
      const targetWidthMm = pageWidth - margin*2
      const targetWidthPx = Math.round(targetWidthMm * pxPerMm)
        try {
          // Render with html2canvas and paginate manually for reliable output
          const canvas = await (window as any).html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
          const scale = targetWidthPx / canvas.width
        // html2canvas can include a large amount of trailing whitespace; trim it to avoid
        // generating an extra "blank" page at the end of the Description section.
        const trimTrailingWhitespace = (srcCanvas: HTMLCanvasElement): number => {
          try {
            const ctx2d = srcCanvas.getContext('2d', { willReadFrequently: true } as any)
            if (!ctx2d) return srcCanvas.height
            const w = srcCanvas.width
            const maxInk = 0.01
            const stepX = 8
            const blockH = 220
            for (let blockStart = Math.max(0, srcCanvas.height - blockH); blockStart >= 0; blockStart -= blockH) {
              const regionH = Math.min(blockH, srcCanvas.height - blockStart)
              const img = ctx2d.getImageData(0, blockStart, w, regionH)
              const data = img.data
              // Search within this block from bottom-up for any "ink" row
              for (let ry = regionH - 2; ry >= 1; ry--) {
                let ink = 0
                let samples = 0
                const rowBase = ry * w * 4
                for (let x = 0; x < w; x += stepX) {
                  const idx = rowBase + x * 4
                  const a = data[idx + 3]
                  if (a < 16) { samples++; continue }
                  const r = data[idx]
                  const g = data[idx + 1]
                  const b = data[idx + 2]
                  if (r < 245 || g < 245 || b < 245) ink++
                  samples++
                }
                if (samples && (ink / samples) > maxInk) {
                  // Keep a small buffer below the last ink row.
                  return Math.min(srcCanvas.height, blockStart + ry + 24)
                }
              }
            }
          } catch (_) { /* ignore */ }
          return canvas.height
        }
        const contentHeightPx = trimTrailingWhitespace(canvas)
        let offsetPx = 0
        // Leave a small bottom padding to avoid clipping the last line on page breaks.
        // 6pt ≈ 2.12mm (half a typical 12pt line height).
        const descBottomPadMm = 2.2
        const findWhitespaceCut = (srcCanvas: HTMLCanvasElement, startPx: number, desiredLenPx: number): number => {
          try {
            const ctx2d = srcCanvas.getContext('2d', { willReadFrequently: true } as any)
            if (!ctx2d) return desiredLenPx
            // Search near the bottom of the slice for a mostly-white horizontal row
            const searchWindow = Math.min(90, Math.max(0, desiredLenPx))
            const searchStart = Math.max(0, desiredLenPx - searchWindow)
            const regionY = startPx + searchStart
            if (regionY < 0 || regionY >= srcCanvas.height) return desiredLenPx
            const regionH = Math.min(searchWindow, srcCanvas.height - regionY)
            if (regionH <= 2) return desiredLenPx
            const img = ctx2d.getImageData(0, regionY, srcCanvas.width, regionH)
            const w = img.width
            const h = img.height
            const data = img.data
            const stepX = 6 // sample stride
            // A row is "blank" if < ~1% of sampled pixels are non-white
            const maxInk = 0.01
            for (let ry = h - 2; ry >= 2; ry--) {
              let ink = 0
              let samples = 0
              const rowBase = ry * w * 4
              for (let x = 0; x < w; x += stepX) {
                const idx = rowBase + x * 4
                const a = data[idx + 3]
                if (a < 16) { samples++; continue }
                const r = data[idx]
                const g = data[idx + 1]
                const b = data[idx + 2]
                // treat near-white as background
                if (r < 245 || g < 245 || b < 245) ink++
                samples++
              }
              if (samples && (ink / samples) <= maxInk) {
                // Cut at this row to avoid splitting a line of text.
                const cutLen = searchStart + ry
                // Ensure we don't return 0-length slices.
                return Math.max(1, cutLen)
              }
            }
          } catch (_) { /* ignore */ }
          return desiredLenPx
        }
        while (offsetPx < contentHeightPx - 1) {
          const availableMm = Math.max(0, bottomLimit - y - descBottomPadMm)
          // If we don't have enough vertical space for a reasonable slice, advance to next page
          // to avoid rounding/scale artifacts that can clip the last line.
          if (availableMm < 6) {
            drawFooter(); doc.addPage(); pageNo++; y = margin; pageHasBodyContent = false; drawHeader()
            continue
          }
            const availableTargetPx = Math.max(10, Math.floor(availableMm * pxPerMm))
            // Pick the segment height in source pixels such that after scaling it stays
            // strictly within the available target height (avoid rounding up causing clipping).
            const maxSrcPx = Math.max(1, Math.floor((availableTargetPx - 1) / scale))
            const desiredSrcPx = Math.min(maxSrcPx, contentHeightPx - offsetPx)
          const segmentSrcPx = findWhitespaceCut(canvas, offsetPx, desiredSrcPx)
          // Create a segment canvas to crop
            const seg = document.createElement('canvas'); seg.width = canvas.width; seg.height = segmentSrcPx
            const segCtx = seg.getContext('2d')!
            segCtx.fillStyle = '#ffffff'; segCtx.fillRect(0,0,seg.width,seg.height)
            segCtx.drawImage(canvas, 0, offsetPx, canvas.width, segmentSrcPx, 0, 0, seg.width, seg.height)
            const segUrl = seg.toDataURL('image/png')
            const segmentTargetHeightPx = segmentSrcPx * scale
            const segmentTargetHeightMm = segmentTargetHeightPx * mmPerPx
            try { doc.addImage(segUrl, 'PNG', margin, y, targetWidthMm, segmentTargetHeightMm); markBodyContent() } catch (e) { /* ignore */ }
            y += segmentTargetHeightMm
            offsetPx += segmentSrcPx
            if (offsetPx < contentHeightPx - 1) { drawFooter(); doc.addPage(); pageNo++; y = margin; pageHasBodyContent = false; drawHeader() }
          }
          y += 2
        } catch (e) {
          // Fallback to text if html render fails
          setBodyFont(doc, 'normal'); doc.setFontSize(12)
          const lines = htmlToLines(form.descriptionHtml)
          for (const l of lines) {
            const wrapped = doc.splitTextToSize(l, pageWidth - margin * 2) as string[]
            for (const w of wrapped) { ensureSpace(7); doc.text(w, margin, y); markBodyContent(); y += 6 }
          }
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
        if (imgs.length) {
          sectionGap(); ensureSpace(10); setBodyFont(doc, 'bold'); doc.setFontSize(12); doc.text('Photos', margin, y); y += 4
          markBodyContent()
          const thumbW = (pageWidth - margin * 2 - 8) / 3
          const thumbH = thumbW * 0.75
          for (let idx = 0; idx < imgs.length; idx++) {
            const col = idx % 3
            const row = Math.floor(idx / 3)
            const x = margin + col * (thumbW + 4)
            const yy = y + row * (thumbH + 4)
            if (yy + thumbH > bottomLimit) { drawFooter(); doc.addPage(); pageNo++; y = margin; pageHasBodyContent = false; idx -= (idx % 3); continue }
            doc.addImage(imgs[idx].dataUrl, imgs[idx].format || 'JPEG', x, yy, thumbW, thumbH)
            markBodyContent()
          }
          y += Math.ceil(imgs.length / 3) * (thumbH + 4) + 2
        }
      }
      // We intentionally delay issues & attachments so equipment reports can appear before them.
      // Close out the main activity doc (without attachments yet).
      // If the current page has only header/footer (no body content), it can be an accidental
      // trailing blank page created by a page-break. Drop it to avoid an empty separator page
      // before the Equipment List.
      let skipFinalFooter = false
      try {
          const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1
          if (totalPages > 1 && !pageHasBodyContent && typeof (doc as any).deletePage === 'function') {
            (doc as any).deletePage(totalPages)
            skipFinalFooter = true
          }
        } catch (e) { /* ignore */ }
      if (!skipFinalFooter) drawFooter()
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
        // Helvetica is default; SourceSansPro removed
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
            if (footerLogo?.dataUrl) {
              const lh = 5.5
              let lw = 12
              if ((footerLogo as any).width && (footerLogo as any).height && (footerLogo as any).height > 0) {
                lw = lh * ((footerLogo as any).width / (footerLogo as any).height)
              }
              const maxW = 14
              if (lw > maxW) lw = maxW
              iDoc.addImage(footerLogo.dataUrl, footerLogo.format || 'PNG', margin, fY - lh, lw, lh)
              const brandX = margin + lw + 2
              setBodyFont(iDoc, 'bold'); iDoc.setFontSize(8)
              iDoc.text('cxma', brandX, fY - 2)
              const tw = typeof (iDoc as any).getTextWidth === 'function' ? (iDoc as any).getTextWidth('cxma') : 10
              iDoc.text(`${form.name || 'Activity'} Issues`, brandX + tw + 3, fY - 2)
            } else {
              iDoc.setFillColor(220,220,220); iDoc.rect(margin, fY - 5.5, 8,5,'F'); setBodyFont(iDoc, 'bold'); iDoc.setFontSize(8)
              iDoc.text('cxma', margin + 10, fY - 2)
              iDoc.text(`${form.name || 'Activity'} Issues`, margin + 24, fY - 2)
            }
          } catch (e) { /* ignore */ }
          setBodyFont(iDoc, 'normal'); iDoc.text(String(iPageNo), iPW/2, fY - 2, { align: 'center' });
          try { if (typeof pageDate === 'string') iDoc.text(pageDate, iPW - margin, fY - 2, { align: 'right' }) } catch (e) { /* ignore */ }
          iDoc.setFont((prevFont as any).fontName || 'helvetica', (prevFont as any).fontStyle || 'normal'); iDoc.setFontSize(prevSize)
        }
        const drawIHeader = () => {
          const res = drawBrandedHeader(iDoc, {
            margin,
            pageWidth: iPW,
            title: 'Issues',
            leftLogo: clientImg,
            rightLogo: cxaImg,
            logoH: 12,
            maxLogoW: 36,
            titleFontSize: 20,
            setTitleFont: () => setBodyFont(iDoc, 'bold'),
          })
          // Reset to body font after header
          iy = res.nextY
          setBodyFont(iDoc, 'normal'); iDoc.setFontSize(12)
        }
        const ensureISpace = (h:number) => { if (iy + h > iBottom) { drawIFooter(); iDoc.addPage(); iPageNo++; drawIHeader(); return true } return false }
        drawIHeader()
        // --- Updated Issues Table: with Recommendation column ---
        const totalW = iPW - margin*2 - 2;
        const numW = 14;
        const typeW = Math.round(22 * 0.75); // 25% reduction
        const sourceW = 20; // compact
        const titleW = Math.round(40 * 0.75); // 25% reduction
        const descW = Math.round((totalW - numW - typeW - sourceW - titleW) * 0.45);
        const recW = Math.round((totalW - numW - typeW - sourceW - titleW) * 0.35);
        const statusW = Math.round(22 * 0.75);
        const restW = totalW - numW - typeW - sourceW - titleW - descW - recW - statusW;
        const finalDescW = descW + restW;
        const tableX = margin + 1;
        const drawIssuesHeader = () => {
          ensureISpace(8);
          setBodyFont(iDoc, 'bold');
          const headerH = 7;
          iDoc.setFillColor(250,236,236);
          iDoc.rect(tableX, iy, totalW, headerH, 'F');
          iDoc.rect(tableX, iy, totalW, headerH);
          const colXs = [
            tableX,
            tableX+numW,
            tableX+numW+typeW,
            tableX+numW+typeW+sourceW,
            tableX+numW+typeW+sourceW+titleW,
            tableX+numW+typeW+sourceW+titleW+finalDescW,
            tableX+numW+typeW+sourceW+titleW+finalDescW+recW,
            tableX+numW+typeW+sourceW+titleW+finalDescW+recW+statusW
          ];
          for (let i=1;i<colXs.length;i++){ const vx = colXs[i]; iDoc.line(vx, iy, vx, iy+headerH) }
          iDoc.text('#', tableX+1.5, iy+5);
          iDoc.text('Type', tableX+numW+1.5, iy+5);
          iDoc.text('Source', tableX+numW+typeW+1.5, iy+5);
          iDoc.text('Title', tableX+numW+typeW+sourceW+1.5, iy+5);
          iDoc.text('Description', tableX+numW+typeW+sourceW+titleW+1.5, iy+5);
          iDoc.text('Recommendation', tableX+numW+typeW+sourceW+titleW+finalDescW+1.5, iy+5);
          iDoc.text('Status', tableX+numW+typeW+sourceW+titleW+finalDescW+recW+1.5, iy+5);
          iy += headerH; setBodyFont(iDoc, 'normal'); iDoc.setFontSize(12)
        };
        drawIssuesHeader();
        for (const it of issues) {
          const numTxt = '#' + (it.number ?? '—');
          const typeTxt = String(it.type||'—');
          const sourceTxt = String((it as any).__source || (it as any).assetTag || (it as any).asset || '—');
          const titleLines = iDoc.splitTextToSize(String(it.title||'—'), titleW - 3) as string[];
          const descText = htmlToText((it as any).description || (it as any).descriptionHtml || '') || '—';
          const descLines = iDoc.splitTextToSize(descText, finalDescW - 3) as string[];
          const recTxt = String(it.recommendation || it.recommendationText || it.recommendation_text || '—');
          const recLines = iDoc.splitTextToSize(recTxt, recW - 3) as string[];
          const statusTxt = String(it.status || 'Open');
          const statusLines = iDoc.splitTextToSize(statusTxt, statusW - 3) as string[];
          const hLines = Math.max(1, titleLines.length, descLines.length, recLines.length, statusLines.length);
          const rowH = Math.max(8, hLines*5 + 2);
          if (ensureISpace(rowH + 2)) drawIssuesHeader();
          // Fill closed rows with a light gray background
          const isClosedRow = String(it.status || '').toLowerCase().startsWith('closed');
          if (isClosedRow) {
            iDoc.setFillColor(230, 230, 230);
            iDoc.rect(tableX, iy, totalW, rowH, 'F');
          }
          // Draw row borders
          iDoc.setDrawColor(0, 0, 0);
          iDoc.rect(tableX, iy, totalW, rowH);
          const colXs = [
            tableX,
            tableX+numW,
            tableX+numW+typeW,
            tableX+numW+typeW+sourceW,
            tableX+numW+typeW+sourceW+titleW,
            tableX+numW+typeW+sourceW+titleW+finalDescW,
            tableX+numW+typeW+sourceW+titleW+finalDescW+recW,
            tableX+numW+typeW+sourceW+titleW+finalDescW+recW+statusW
          ];
          for (let i=1;i<colXs.length;i++){ const vx = colXs[i]; iDoc.line(vx, iy, vx, iy+rowH) }
          // Ensure text is black on all rows (especially closed ones)
          iDoc.setTextColor(0, 0, 0);
          let cx = tableX + 1.5;
          iDoc.text(numTxt, cx, iy+5);
          cx += numW;
          iDoc.text(typeTxt.slice(0,16), cx+1.5, iy+5);
          cx += typeW;
          iDoc.text(sourceTxt.slice(0,18), cx+1.5, iy+5);
          cx += sourceW;
          let tlY = iy+5;
          for (const l of titleLines) { iDoc.text(l, cx+1.5, tlY); tlY += 5 }
          cx += titleW;
          let dlY = iy+5;
          for (const l of descLines) { iDoc.text(l, cx+1.5, dlY); dlY += 5 }
          cx += finalDescW;
          let rlY = iy+5;
          for (const l of recLines) { iDoc.text(l, cx+1.5, rlY); rlY += 5 }
          cx += recW;
          let slY = iy+5;
          for (const l of statusLines) { iDoc.text(l, cx+1.5, slY); slY += 5 }
          iy += rowH;
        }
        drawIFooter();
        issuesBytes = iDoc.output('arraybuffer') as ArrayBuffer;
      }
    }
    // Defer issues merge until after the Equipment List section so ordering is:
    // main report -> Equipment List -> Issues -> Equipment Reports -> Attachments
    // Build attachments doc separately (list + image pages) if needed.
    let attachmentsBytes: ArrayBuffer | null = null
    if (activityReport.value.include.attachments) {
      const atts: any[] = Array.isArray(form.attachments) ? form.attachments : []
      if (atts.length) {
        const attDoc = new jsPDF({ unit: 'mm', format: 'a4' })
        // Helvetica is default; SourceSansPro removed
        setZeroCharSpace(attDoc)
        setBodyFont(attDoc, 'normal')
        const aPW = attDoc.internal.pageSize.getWidth(); const aPH = attDoc.internal.pageSize.getHeight(); const aBottom = aPH - 26; let ay = margin; let aPageNo = 1
        const drawAttFooter = () => { const footerY = aPH - 10; attDoc.setDrawColor(180,180,180); attDoc.line(margin, footerY - 6, aPW - margin, footerY - 6); setBodyFont(attDoc, 'normal'); attDoc.setFontSize(8); attDoc.text(String(aPageNo), aPW/2, footerY - 2, { align: 'center' }) }
        const drawAttHeader = () => { setBodyFont(attDoc, 'bold'); attDoc.setFontSize(16); attDoc.text('Attachments', aPW/2, margin + 6, { align: 'center' }); ay = margin + 16; setBodyFont(attDoc, 'normal'); attDoc.setFontSize(12) }
        const ensureAttSpace = (h:number) => { if (ay + h > aBottom) { drawAttFooter(); attDoc.addPage(); aPageNo++; drawAttHeader(); return true } return false }
        drawAttHeader()
        // Listing first
        for (let a=0; a< Math.min(8, atts.length); a++) { const name = String(atts[a]?.filename || atts[a]?.url || 'Attachment'); const lines = attDoc.splitTextToSize(name, aPW - margin*2) as string[]; for (const l of lines) { ensureAttSpace(6); attDoc.text(l, margin + 2, ay); ay += 4 } }
        // Image full pages
        const isImage = (a:any) => { const type = String(a?.type||'').toLowerCase(); const name = String(a?.filename||a?.url||'').toLowerCase(); const ext = name.split('?')[0].split('#')[0].split('.').pop()||''; return type.startsWith('image/') || ['png','jpg','jpeg','webp'].includes(ext) }
  const getDims = async (dataUrl:string): Promise<{w:number;h:number}> => { return new Promise(res => { const img = new Image(); img.onload=()=>res({ w: img.naturalWidth||img.width, h: img.naturalHeight||img.height }); img.onerror=()=>res({w:0,h:0}); img.src = dataUrl }) }
        for (const a of atts) { if (!isImage(a)) continue; const src = a?.url || a?.data; const img = await loadImage(src); if (!img.dataUrl) continue; drawAttFooter(); attDoc.addPage(); aPageNo++; drawAttHeader(); setBodyFont(attDoc, 'bold'); attDoc.setFontSize(12); const label = `Attachment: ${String(a?.filename || a?.url || '')}`; ensureAttSpace(8); attDoc.text(label, margin, ay); ay += 6; setBodyFont(attDoc, 'normal'); const dims = await getDims(img.dataUrl); const maxW = aPW - margin*2; const maxH = aBottom - ay; let drawW = maxW, drawH = maxH; if (dims.w>0 && dims.h>0) { const sc = Math.min(maxW/dims.w, maxH/dims.h); drawW = dims.w*sc; drawH = dims.h*sc } const imgX = margin + (maxW - drawW)/2; const imgY = ay + (maxH - drawH)/2; try { attDoc.addImage(img.dataUrl, img.format || 'JPEG', imgX, imgY, drawW, drawH) } catch (e) {   drawAttFooter() }
        drawAttFooter()
        attachmentsBytes = attDoc.output('arraybuffer') as ArrayBuffer
      }
    }
    // Merge equipment list + issues + equipment detailed reports + attachments
    if (activityReport.value.include.equipmentReports && selectedEquip.value.length) {
      try {
        const { PDFDocument } = await import('pdf-lib')
        // Freeze the current equipment order (matches Equipment tab order).
        const selectedEquipSnapshot = [...(selectedEquip.value || [])]
        // Build a PDF map of issues and spaces for richer equipment reports
        // Build a comprehensive issuesMap including all issues referenced by equipment
        const issuesMap: Record<string, any> = {}
        // Add all project issues by id
        for (const it of (issuesStore.issues || [])) {
          const key = String((it?.id || it?._id) || '')
          if (key) issuesMap[key] = it
        }

        const ensureIssueInMap = async (issueId: string) => {
          const id = String(issueId || '').trim()
          if (!id || issuesMap[id]) return
          const found = (issuesStore.issues || []).find((it: any) => String(it?.id || it?._id || '') === id)
          if (found) {
            issuesMap[id] = found
            return
          }
          try {
            const fetched = await issuesStore.fetchIssue(id)
            const key = String((fetched as any)?.id || (fetched as any)?._id || id)
            if (key) issuesMap[key] = fetched
          } catch (e) { /* ignore missing issues */ }
        }

        const collectIssueIdsFromEquipment = (eqObj: any): string[] => {
          const ids = new Set<string>()
          try {
            const addRef = (ref: any) => {
              const iid = issueRefToId(ref)
              if (iid) ids.add(iid)
            }
            const addRefList = (list: any) => {
              const arr = Array.isArray(list) ? list : []
              for (const it of arr) addRef(it)
            }

            addRefList(eqObj?.issues)

            const fpts: any[] = Array.isArray(eqObj?.functionalTests) ? eqObj.functionalTests : []
            for (const f of fpts) addRefList(f?.issues)

            const chks: any[] = Array.isArray(eqObj?.checklists) ? eqObj.checklists : []
            for (const c of chks) {
              const items: any[] = Array.isArray(c?.questions) ? c.questions : (Array.isArray(c?.items) ? c.items : [])
              for (const q of items) addRefList(q?.issues)
            }

            const comps: any[] = Array.isArray(eqObj?.components) ? eqObj.components : []
            for (const c of comps) addRefList(c?.issues)
          } catch (e) { /* ignore */ }
          return Array.from(ids)
        }

        const spacesMap: Record<string, any> = {}
        for (const sp of (spacesStore.items || [])) {
          const key = String((sp as any).id || (sp as any)._id || '')
          if (key) spacesMap[key] = sp
        }
        // Try to resolve project (already loaded earlier for logos)
        const projectObj: any = projectStore.currentProject || {}
        const merged = await PDFDocument.load(baseBytes)

        // --- Add Equipment List section (before equipment reports) ---
        // Only add if there is at least one equipment selected
        if (activityReport.value.include.equipmentList && selectedEquipSnapshot.length) {
          const jsPDFmod = (await import('jspdf')).jsPDF || jsPDF;
          const eqDoc = new jsPDFmod({ unit: 'mm', format: 'a4' });
          setZeroCharSpace(eqDoc);
          setBodyFont(eqDoc, 'normal');
          const eqPW = eqDoc.internal.pageSize.getWidth();
          const eqPH = eqDoc.internal.pageSize.getHeight();
          const eqMargin = 12;
          const eqBottom = eqPH - 26;
          let eqY = eqMargin;
          let eqPageNo = 1;
          const eqPageDate = pageDate;

          const drawEqFooter = () => {
            const footerY = eqPH - 10;
            eqDoc.setDrawColor(180,180,180); eqDoc.line(eqMargin, footerY - 6, eqPW - eqMargin, footerY - 6);
            try {
              if ((footerLogo as any)?.dataUrl) {
                const lh = 5.5;
                let lw = 12;
                if ((footerLogo as any).width && (footerLogo as any).height && (footerLogo as any).height > 0) {
                  lw = lh * ((footerLogo as any).width / (footerLogo as any).height);
                }
                const maxW = 14;
                if (lw > maxW) lw = maxW;
                eqDoc.addImage((footerLogo as any).dataUrl, (footerLogo as any).format || 'PNG', eqMargin, footerY - lh, lw, lh);
                const brandX = eqMargin + lw + 2;
                setBodyFont(eqDoc, 'bold'); eqDoc.setFontSize(8);
                eqDoc.text('cxma', brandX, footerY - 2);
                const tw = typeof (eqDoc as any).getTextWidth === 'function' ? (eqDoc as any).getTextWidth('cxma') : 10;
                eqDoc.text(`${form.name || 'Activity'} Equipment`, brandX + tw + 3, footerY - 2);
              } else {
                eqDoc.setFillColor(220,220,220); eqDoc.rect(eqMargin, footerY - 5.5, 8,5,'F'); setBodyFont(eqDoc, 'bold'); eqDoc.setFontSize(8);
                eqDoc.text('cxma', eqMargin + 10, footerY - 2);
                eqDoc.text(`${form.name || 'Activity'} Equipment`, eqMargin + 24, footerY - 2);
              }
            } catch (e) { /* ignore */ }
            setBodyFont(eqDoc, 'normal'); eqDoc.setFontSize(8); eqDoc.text(String(eqPageNo), eqPW/2, footerY - 2, { align: 'center' });
            try { if (typeof eqPageDate === 'string') eqDoc.text(eqPageDate, eqPW - eqMargin, footerY - 2, { align: 'right' }) } catch (e) { /* ignore */ }
          }

          const drawEqHeader = () => {
            const res = drawBrandedHeader(eqDoc, {
              margin: eqMargin,
              pageWidth: eqPW,
              title: `${form.name || 'Activity'} Report`,
              leftLogo: clientImg,
              rightLogo: cxaImg,
              logoH: 12,
              maxLogoW: 36,
              titleFontSize: 20,
              setTitleFont: () => setBodyFont(eqDoc, 'bold'),
            })
            eqY = res.nextY
            // Section title
            setBodyFont(eqDoc, 'bold'); eqDoc.setFontSize(12); eqDoc.text('Equipment List', eqMargin, eqY); eqY += 6
            setBodyFont(eqDoc, 'normal'); eqDoc.setFontSize(12)
          }

          // Table columns
          const columns = [
            { label: 'Tag', width: 24 },
            { label: 'Title', width: 60 },
            { label: 'Status', width: 44 },
            { label: 'Manufacturer', width: 32 },
            { label: 'Condition', width: 22 },
          ];
          const totalW = columns.reduce((sum, c) => sum + c.width, 0);
          const tableX = eqMargin;

          const drawTableHeader = () => {
            eqDoc.setFillColor(240,240,240);
            eqDoc.rect(tableX, eqY, totalW, 7, 'F');
            setBodyFont(eqDoc, 'bold');
            let colX = tableX;
            for (const col of columns) {
              eqDoc.text(col.label, colX + 2, eqY + 5);
              colX += col.width;
            }
            eqY += 9;
            setBodyFont(eqDoc, 'normal');
          }

          drawEqHeader();
          drawTableHeader();

          // Draw rows
          let colX = tableX;
          for (const eq of selectedEquipSnapshot) {
            if (eqY + 8 > eqBottom) {
              drawEqFooter();
              eqDoc.addPage();
              eqPageNo++;
              drawEqHeader();
              drawTableHeader();
            }
            colX = tableX;
            // attributes may be an array of {key, value} objects
            let manufacturer = '—';
            let condition = '—';
            if (Array.isArray(eq.attributes)) {
              for (const attr of eq.attributes) {
                if (attr && typeof attr === 'object') {
                  if (attr.key === 'Manufacturer' && attr.value) manufacturer = String(attr.value);
                  if (attr.key === 'Condition' && attr.value) condition = String(attr.value);
                }
              }
            } else if (eq.attributes && typeof eq.attributes === 'object') {
              // fallback for object form
              manufacturer = String(eq.attributes['Manufacturer'] || '—');
              condition = String(eq.attributes['Condition'] || '—');
            }
            const rowVals = [
              String(eq.tag || '—'),
              String(eq.title || '—'),
              String(eq.status || '—'),
              manufacturer,
              condition,
            ];
            for (let i = 0; i < columns.length; i++) {
              eqDoc.text(rowVals[i], colX + 2, eqY + 5, { maxWidth: columns[i].width - 4 });
              colX += columns[i].width;
            }
            eqY += 8;
          }
          // Footer on last page
          drawEqFooter();
          // Merge equipment table pages into main PDF
          const eqBytes = eqDoc.output('arraybuffer');
          const eqPdf = await PDFDocument.load(eqBytes);
          const eqPages = await merged.copyPages(eqPdf, eqPdf.getPageIndices());
          eqPages.forEach((p: any) => merged.addPage(p));
        }

        // Merge issues after Equipment List
        if (issuesBytes) {
          try {
            const issuesPdf = await PDFDocument.load(issuesBytes)
            const issuesPages = await merged.copyPages(issuesPdf, issuesPdf.getPageIndices())
            issuesPages.forEach((p:any) => merged.addPage(p))
            issuesBytes = null
          } catch (e) { /* ignore */ }
        }

        // Generate full equipment PDFs and merge (equipment reports)
        // Lazy-load generator only if needed (performance improvement)
        const { generateEquipmentPdf } = await import('../../utils/equipmentReport')
        for (const eq of selectedEquipSnapshot) {
          try {
            const eqId = String((eq as any)?.id || (eq as any)?._id || '')
            const fullEq = eqId ? (await fetchFullEquipmentForReport(eqId)) || eq : eq
            // Ensure any issue ids referenced in this equipment are resolved to canonical issues via the store.
            const issueIds = collectIssueIdsFromEquipment(fullEq)
            for (const iid of issueIds) await ensureIssueInMap(iid)
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

        // Insert attachments pages (non-PDF) after equipment reports & issues & equipment table
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

    // If equipment reports are not requested, optionally insert Equipment List before Issues.
    if (!(activityReport.value.include.equipmentReports && selectedEquip.value.length) && activityReport.value.include.equipmentList && selectedEquip.value.length) {
      try {
        const { PDFDocument } = await import('pdf-lib')
        const merged = await PDFDocument.load(baseBytes)

        const jsPDFmod = (await import('jspdf')).jsPDF || jsPDF
        const eqDoc = new jsPDFmod({ unit: 'mm', format: 'a4' })
        setZeroCharSpace(eqDoc)
        setBodyFont(eqDoc, 'normal')
        const eqPW = eqDoc.internal.pageSize.getWidth()
        const eqPH = eqDoc.internal.pageSize.getHeight()
        const eqMargin = 12
        const eqBottom = eqPH - 26
        let eqY = eqMargin
        let eqPageNo = 1
        const eqPageDate = pageDate

        const drawEqFooter = () => {
          const footerY = eqPH - 10
          eqDoc.setDrawColor(180, 180, 180); eqDoc.line(eqMargin, footerY - 6, eqPW - eqMargin, footerY - 6)
          try {
            if ((footerLogo as any)?.dataUrl) {
              const lh = 5.5
              let lw = 12
              if ((footerLogo as any).width && (footerLogo as any).height && (footerLogo as any).height > 0) {
                lw = lh * ((footerLogo as any).width / (footerLogo as any).height)
              }
              const maxW = 14
              if (lw > maxW) lw = maxW
              eqDoc.addImage((footerLogo as any).dataUrl, (footerLogo as any).format || 'PNG', eqMargin, footerY - lh, lw, lh)
              const brandX = eqMargin + lw + 2
              setBodyFont(eqDoc, 'bold'); eqDoc.setFontSize(8)
              eqDoc.text('cxma', brandX, footerY - 2)
              const tw = typeof (eqDoc as any).getTextWidth === 'function' ? (eqDoc as any).getTextWidth('cxma') : 10
              eqDoc.text(`${form.name || 'Activity'} Equipment`, brandX + tw + 3, footerY - 2)
            } else {
              eqDoc.setFillColor(220, 220, 220); eqDoc.rect(eqMargin, footerY - 5.5, 8, 5, 'F'); setBodyFont(eqDoc, 'bold'); eqDoc.setFontSize(8)
              eqDoc.text('cxma', eqMargin + 10, footerY - 2)
              eqDoc.text(`${form.name || 'Activity'} Equipment`, eqMargin + 24, footerY - 2)
            }
          } catch (e) { /* ignore */ }
          setBodyFont(eqDoc, 'normal'); eqDoc.setFontSize(8); eqDoc.text(String(eqPageNo), eqPW / 2, footerY - 2, { align: 'center' })
          try { if (typeof eqPageDate === 'string') eqDoc.text(eqPageDate, eqPW - eqMargin, footerY - 2, { align: 'right' }) } catch (e) { /* ignore */ }
        }

        const drawEqHeader = () => {
          const res = drawBrandedHeader(eqDoc, {
            margin: eqMargin,
            pageWidth: eqPW,
            title: `${form.name || 'Activity'} Report`,
            leftLogo: clientImg,
            rightLogo: cxaImg,
            logoH: 12,
            maxLogoW: 36,
            titleFontSize: 20,
            setTitleFont: () => setBodyFont(eqDoc, 'bold'),
          })
          eqY = res.nextY
          setBodyFont(eqDoc, 'bold'); eqDoc.setFontSize(12); eqDoc.text('Equipment List', eqMargin, eqY); eqY += 6
          setBodyFont(eqDoc, 'normal'); eqDoc.setFontSize(12)
        }

        const columns = [
          { label: 'Tag', width: 24 },
          { label: 'Title', width: 60 },
          { label: 'Status', width: 44 },
          { label: 'Manufacturer', width: 32 },
          { label: 'Condition', width: 22 },
        ]
        const totalW = columns.reduce((sum, c) => sum + c.width, 0)
        const tableX = eqMargin
        const drawTableHeader = () => {
          eqDoc.setFillColor(240, 240, 240)
          eqDoc.rect(tableX, eqY, totalW, 7, 'F')
          setBodyFont(eqDoc, 'bold')
          let colX = tableX
          for (const col of columns) { eqDoc.text(col.label, colX + 2, eqY + 5); colX += col.width }
          eqY += 9
          setBodyFont(eqDoc, 'normal')
        }

        drawEqHeader()
        drawTableHeader()
        for (const eq of selectedEquip.value) {
          if (eqY + 8 > eqBottom) {
            drawEqFooter()
            eqDoc.addPage()
            eqPageNo++
            drawEqHeader()
            drawTableHeader()
          }
          let manufacturer = '—'
          let condition = '—'
          if (Array.isArray(eq.attributes)) {
            for (const attr of eq.attributes) {
              if (attr && typeof attr === 'object') {
                if (attr.key === 'Manufacturer' && attr.value) manufacturer = String(attr.value)
                if (attr.key === 'Condition' && attr.value) condition = String(attr.value)
              }
            }
          } else if (eq.attributes && typeof eq.attributes === 'object') {
            manufacturer = String(eq.attributes['Manufacturer'] || '—')
            condition = String(eq.attributes['Condition'] || '—')
          }
          const rowVals = [
            String(eq.tag || '—'),
            String(eq.title || '—'),
            String(eq.status || '—'),
            manufacturer,
            condition,
          ]
          let colX = tableX
          for (let i = 0; i < columns.length; i++) {
            eqDoc.text(rowVals[i], colX + 2, eqY + 5, { maxWidth: columns[i].width - 4 })
            colX += columns[i].width
          }
          eqY += 8
        }
        drawEqFooter()

        const eqBytes = eqDoc.output('arraybuffer') as ArrayBuffer
        const eqPdf = await PDFDocument.load(eqBytes)
        const eqPages = await merged.copyPages(eqPdf, eqPdf.getPageIndices())
        eqPages.forEach((p: any) => merged.addPage(p))
        baseBytes = await merged.save()
      } catch (e) { /* ignore */ }
    }

    // If equipment reports are not requested, merge issues after the main report.
    if (issuesBytes) {
      try {
        const { PDFDocument } = await import('pdf-lib')
        const merged = await PDFDocument.load(baseBytes)
        const issuesPdf = await PDFDocument.load(issuesBytes)
        const issuesPages = await merged.copyPages(issuesPdf, issuesPdf.getPageIndices())
        issuesPages.forEach((p:any) => merged.addPage(p))
        baseBytes = await merged.save()
        issuesBytes = null
      } catch (e) { /* keep baseBytes as-is */ }
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
const logExpandedIndex = ref<number | null>(null)
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

function toggleLogExpanded(idx: number) {
  if (logExpandedIndex.value === idx) logExpandedIndex.value = null
  else logExpandedIndex.value = idx
}

function prettyJson(v: any) {
  try {
    if (typeof v === 'string') return v
    return JSON.stringify(v, null, 2)
  } catch (e) {
    try { return String(v) } catch (ee) { return '' }
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
function issueRefToId(ref: any): string {
  return String((ref && (ref.id || ref._id)) || ref || '').trim()
}
const issuesForActivity = computed(() => {
  // Prefer the local form.issues array, which is kept in sync on load and
  // when creating/linking issues, and fall back to store.current if needed.
  const source = Array.isArray((form as any).issues) && (form as any).issues.length
    ? (form as any).issues as any[]
    : ((current.value && (current.value as any).issues) ? ((current.value as any).issues as any[]) : [])

  const out: any[] = []
  for (const ref of (Array.isArray(source) ? source : [])) {
    const id = issueRefToId(ref)
    if (!id) continue
    const obj = issuesById.value[id]
    if (obj) {
      // Normalize recommendation for IssuesTable
      out.push({
        ...obj,
        recommendation: obj.recommendation || obj.recommendationText || obj.recommendation_text || '',
      })
    }
  }
  return out
})

// Activity Issue creation modal state
const showIssueModal = ref(false)
const activityIssueDraft = ref<any>({
  number: null,
  status: 'open',
  priority: 'medium',
  type: 'Activity',
  title: '',
  description: '',
  foundBy: '',
  dateFound: '',
  assignedTo: '',
  dueDate: '',
  location: '',
  system: '',
})

// Existing issues search/linking
const issueSearch = ref('')
const issueSuggestionsOpen = ref(false)
const issueHighlightedIndex = ref(-1)
const issueSuggestions = ref<any[]>([])
const issueSuggestionsLoading = ref(false)
const issueSuggestPage = ref(1)
const issueSuggestPerPage = ref(12)
const issueSuggestTotal = ref(0)
let issueSuggestTimer: any = null

const issueSuggestHasPrev = computed(() => issueSuggestPage.value > 1)
const issueSuggestHasNext = computed(() => issueSuggestPage.value * issueSuggestPerPage.value < issueSuggestTotal.value)
const issueSuggestTotalPages = computed(() => {
  const total = Number(issueSuggestTotal.value) || 0
  const pp = Math.max(1, Number(issueSuggestPerPage.value) || 12)
  return total ? Math.max(1, Math.ceil(total / pp)) : 1
})
const issueSuggestStart = computed(() => {
  if (!issueSuggestTotal.value) return 0
  return (issueSuggestPage.value - 1) * issueSuggestPerPage.value + 1
})
const issueSuggestEnd = computed(() => {
  if (!issueSuggestTotal.value) return 0
  return (issueSuggestPage.value - 1) * issueSuggestPerPage.value + issueSuggestions.value.length
})

async function fetchIssueSuggestions(qRaw: string, opts?: { page?: number; perPage?: number }) {
  const q = String(qRaw || '').trim()
  const pid = String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
  if (!pid) { issueSuggestions.value = []; issueSuggestTotal.value = 0; return }

  const page = Math.max(1, Number(opts?.page ?? issueSuggestPage.value) || 1)
  const perPage = Math.max(1, Number(opts?.perPage ?? issueSuggestPerPage.value) || 12)
  issueSuggestPage.value = page
  issueSuggestPerPage.value = perPage

  issueSuggestionsLoading.value = true
  try {
    const { data } = await http.get('/api/issues', {
      params: { projectId: pid, ...(q ? { search: q } : {}), page, perPage },
      headers: { ...getAuthHeaders() }
    })
    const payload = (data && (data.items || data)) || []
    const items: any[] = Array.isArray(payload) ? payload : []
    issueSuggestTotal.value = Number((data && (data.total ?? data.count)) ?? items.length)
    const linkedIds = new Set<string>((Array.isArray((form as any).issues) ? (form as any).issues : []).map(issueRefToId).filter(Boolean))
    issueSuggestions.value = items
      .map((it: any) => ({ ...(it || {}), id: it?._id || it?.id }))
      .filter((it: any) => {
        const id = String(it?.id || '')
        return id && !linkedIds.has(id)
      })
  } catch (e) {
    // Fallback to store-based filtering (may be incomplete if server paginates)
    const ql = q.toLowerCase()
    const all = Array.isArray(issuesStore.issues) ? issuesStore.issues : []
    const linkedIds = new Set<string>((Array.isArray((form as any).issues) ? (form as any).issues : []).map(issueRefToId).filter(Boolean))
    const filtered = all.filter((it: any) => {
      const id = String(it.id || it._id || '')
      if (!id || linkedIds.has(id)) return false
      if (!ql) return true
      const num = (it.number != null) ? String(it.number) : ''
      const title = String(it.title || '').toLowerCase()
      const type = String(it.type || '').toLowerCase()
      const status = String(it.status || '').toLowerCase()
      const loc = String(it.location || '').toLowerCase()
      const sys = String(it.system || '').toLowerCase()
      return num.includes(ql) || title.includes(ql) || type.includes(ql) || status.includes(ql) || loc.includes(ql) || sys.includes(ql)
    })
    issueSuggestTotal.value = filtered.length
    issueSuggestions.value = filtered
      .slice((page - 1) * perPage, (page - 1) * perPage + perPage)
      .map((it: any) => ({ ...(it || {}), id: it?._id || it?.id }))
  } finally {
    issueSuggestionsLoading.value = false
  }
}

watch(issueSearch, (q) => {
  if (issueSuggestTimer) { clearTimeout(issueSuggestTimer); issueSuggestTimer = null }
  issueSuggestPage.value = 1
  issueSuggestTimer = setTimeout(() => { fetchIssueSuggestions(String(q || ''), { page: 1 }).catch(() => {}) }, 150)
})

const showIssueSuggestions = computed<boolean>(() => issueSuggestionsOpen.value)
function openIssueSuggestions() {
  issueSuggestionsOpen.value = true
  // If opening with an empty query, allow browsing the first page of project issues.
  if (!issueSearch.value && !issueSuggestions.value.length && !issueSuggestionsLoading.value) {
    issueSuggestPage.value = 1
    fetchIssueSuggestions('', { page: 1 }).catch(() => {})
  }
}
function closeIssueSuggestions() { issueSuggestionsOpen.value = false }
function onIssueInputBlur() {
  // Delay closing so click events on suggestions still register
  setTimeout(() => { closeIssueSuggestions() }, 120)
}
watch(issueSuggestions, (list) => {
  issueHighlightedIndex.value = list.length ? 0 : -1
})
function onIssueArrowDown() {
  const n = issueSuggestions.value.length
  if (!n) return
  issueHighlightedIndex.value = (issueHighlightedIndex.value + 1 + n) % n
}
function onIssueArrowUp() {
  const n = issueSuggestions.value.length
  if (!n) return
  issueHighlightedIndex.value = (issueHighlightedIndex.value - 1 + n) % n
}
function onIssueSuggestPerPageChange() {
  issueSuggestPage.value = 1
  fetchIssueSuggestions(String(issueSearch.value || ''), { page: 1, perPage: issueSuggestPerPage.value }).catch(() => {})
}
async function issueSuggestFirst() {
  if (!issueSuggestHasPrev.value) return
  issueSuggestPage.value = 1
  await fetchIssueSuggestions(String(issueSearch.value || ''), { page: 1 }).catch(() => {})
}
async function issueSuggestPrev() {
  if (!issueSuggestHasPrev.value) return
  issueSuggestPage.value = Math.max(1, issueSuggestPage.value - 1)
  await fetchIssueSuggestions(String(issueSearch.value || ''), { page: issueSuggestPage.value }).catch(() => {})
}
async function issueSuggestNext() {
  if (!issueSuggestHasNext.value) return
  issueSuggestPage.value = issueSuggestPage.value + 1
  await fetchIssueSuggestions(String(issueSearch.value || ''), { page: issueSuggestPage.value }).catch(() => {})
}
async function issueSuggestLast() {
  if (!issueSuggestHasNext.value) return
  const last = issueSuggestTotalPages.value
  issueSuggestPage.value = last
  await fetchIssueSuggestions(String(issueSearch.value || ''), { page: last }).catch(() => {})
}
async function addHighlightedIssue() {
  const idx = issueHighlightedIndex.value
  if (idx >= 0 && issueSuggestions.value[idx]) {
    await linkExistingIssue(issueSuggestions.value[idx])
    closeIssueSuggestions()
  }
}
async function linkExistingIssue(issue: any) {
  try {
    const issueId = String(issue?.id || issue?._id || '').trim()
    if (!issueId) return
    const aid = isNew.value ? await saveAndGetId() : id.value
    // Normalize current issues list to id strings
    const existing = Array.isArray((form as any).issues) ? (form as any).issues : []
    const ids = existing.map(issueRefToId).filter(Boolean)
    if (!ids.includes(issueId)) {
      ids.push(issueId)
    }
    form.issues = ids
    await store.updateActivity(String(aid), { issues: ids })
    // Also stamp activityId on the issue for bidirectional linking (best-effort)
    try {
      await issuesStore.updateIssue(issueId, { activityId: aid })
    } catch (e) { /* non-blocking */ }
    issueSearch.value = ''
    ui.showSuccess('Issue linked to activity')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to link issue')
  }
}

async function onUnlinkIssue(issue: any) {
  try {
    if (isNew.value) return
    const issueId = String(issue?.id || issue?._id || '').trim()
    if (!issueId) return
    const aid = id.value
    const existing = Array.isArray((form as any).issues) ? (form as any).issues : []
    const next = existing.filter((ref: any) => issueRefToId(ref) !== issueId)
    form.issues = next
    await store.updateActivity(String(aid), { issues: next })
    // Best-effort: clear activityId on the issue if it points to this activity
    try {
      const currentIssue = issuesById.value[issueId]
      if (currentIssue && String((currentIssue as any).activityId || '') === String(aid)) {
        await issuesStore.updateIssue(issueId, { activityId: undefined })
      }
    } catch (e) { /* non-blocking */ }
    ui.showSuccess('Issue unlinked from activity')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to unlink issue')
  }
}

function openIssueModal() {
  const name = (form.name || '').trim()
  activityIssueDraft.value.title = name ? `${name} issue` : 'Activity issue'
  const descParts: string[] = []
  if (name) descParts.push(`Activity: ${name}`)
  if (form.location) descParts.push(`Location: ${form.location}`)
  if (form.startDate || form.endDate) descParts.push(`Dates: ${form.startDate || '—'} to ${form.endDate || '—'}`)
  activityIssueDraft.value.description = descParts.join('\n') || 'Issue for this activity'
  activityIssueDraft.value.type = 'Activity'
  activityIssueDraft.value.location = form.location || ''
  activityIssueDraft.value.system = (Array.isArray(form.systems) && form.systems[0]) ? form.systems[0] : ''
  showIssueModal.value = true
}
function closeIssueModal() { showIssueModal.value = false }

// Map IssueForm values to API values (mirrors IssuesList.vue)
function toApiPriority(v: any) {
  const m: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical', comment: 'Comment' }
  const k = String(v || '').toLowerCase()
  return m[k] || undefined
}
function toApiStatus(v: any) {
  const m: Record<string, string> = { open: 'Open', pending: 'In Progress', closed: 'Closed', resolved: 'Resolved', canceled: 'Canceled', cancelled: 'Canceled' }
  const k = String(v || '').toLowerCase()
  return m[k] || undefined
}

async function createActivityIssue() {
  try {
    const pid = String(form.projectId || projectStore.currentProjectId || '')
    if (!pid) { ui.showError('Missing project id'); return }
    // Ensure activity exists first if new
    const aid = isNew.value ? await saveAndGetId() : id.value
    const draft = activityIssueDraft.value || {}
    const title = (draft.title || '').trim() || 'Activity Issue'
    const description = (draft.description || '').trim() || 'Created from activity'

    const payload: any = {
      projectId: pid,
      title,
      description,
      type: draft.type || 'Activity',
      severity: toApiPriority(draft.priority),
      status: toApiStatus(draft.status),
      activityId: aid,
      location: draft.location || form.location || undefined,
      system: draft.system || ((Array.isArray(form.systems) && form.systems[0]) ? form.systems[0] : undefined),
      assignedTo: draft.assignedTo || undefined,
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
    try {
      const photos = await store.fetchActivityPhotos(String(aid))
      ;(form as any).photos = Array.isArray(photos) ? photos : []
      photosLoaded.value = hasPhotoData(photos)
    } catch (e) { /* ignore */ }
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
    try {
      const photos = await store.fetchActivityPhotos(String(aid))
      ;(form as any).photos = Array.isArray(photos) ? photos : []
      photosLoaded.value = hasPhotoData(photos)
    } catch (e) { /* ignore */ }
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
    // Default ordering: keep Tag ascending until the user manually reorders.
    if (!equipmentOrderTouched.value) sortSelectedEquipmentByTag()
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
  form.systems = deduped
}

const equipmentOrderTouched = ref(false)
const equipmentTagCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
function compareEquipmentTags(a?: string, b?: string) {
  const at = String(a || '').trim()
  const bt = String(b || '').trim()
  if (!at && !bt) return 0
  if (!at) return 1
  if (!bt) return -1
  return equipmentTagCollator.compare(at, bt)
}
function sortSelectedEquipmentByTag() {
  const ids = (form.systems || []).map(s => String(s || '').trim()).filter(Boolean)
  if (ids.length < 2) return
  const byId: Record<string, any> = {}
  for (const eq of equipmentInProject.value) {
    const id = String(eq?.id || eq?._id || '').trim()
    if (id) byId[id] = eq
  }
  const sorted = [...ids].sort((a, b) => {
    return compareEquipmentTags(byId[a]?.tag, byId[b]?.tag)
  })
  const same = ids.length === sorted.length && ids.every((v, i) => v === sorted[i])
  if (!same) form.systems = sorted
}

const selectedEquip = computed<any[]>(() => {
  const sels = (form.systems || []).map(s => String(s || '').trim()).filter(Boolean)
  if (!sels.length) return []
  const byId: Record<string, any> = {}
  for (const e of equipmentInProject.value) {
    const id = String(e?.id || e?._id || '')
    if (id) byId[id] = e
  }
  const out: any[] = []
  const seen = new Set<string>()
  for (const id of sels) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    const eq = byId[id]
    if (eq) out.push(eq)
  }
  return out
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
  // Default ordering by Tag (ascending) unless the user later reorders.
  sortSelectedEquipmentByTag()
})
watch(() => equipmentInProject.value, () => {
  normalizeSelectedEquipmentTokens()
  if (!equipmentOrderTouched.value) sortSelectedEquipmentByTag()
})
const pagedEquip = computed(() => {
  const start = (equipPage.value - 1) * equipPerPage.value
  return selectedEquip.value.slice(start, start + equipPerPage.value)
})

function equipmentId(e: any): string {
  return String(e?.id || e?._id || '').trim()
}
function reorderSelectedEquipment(fromId: string, toId: string) {
  const ids = (form.systems || []).map(s => String(s || '').trim()).filter(Boolean)
  const fromIdx = ids.indexOf(fromId)
  const toIdx = ids.indexOf(toId)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const next = [...ids]
  next.splice(fromIdx, 1)
  const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx
  next.splice(insertAt, 0, fromId)
  form.systems = next
  equipmentOrderTouched.value = true
  queueSaveEquipmentChange()
}
function onEquipDragStart(e: DragEvent, eq: any) {
  const id = equipmentId(eq)
  if (!id) return
  equipmentOrderTouched.value = true
  try {
    e.dataTransfer?.setData('text/plain', id)
    e.dataTransfer?.setData('application/x-equip-id', id)
    e.dataTransfer?.setDragImage?.((e.target as HTMLElement) || new Image(), 0, 0)
  } catch (_) { /* ignore */ }
}
function onEquipDrop(e: DragEvent, targetEq: any) {
  const toId = equipmentId(targetEq)
  if (!toId) return
  const fromId = (e.dataTransfer?.getData('application/x-equip-id') || e.dataTransfer?.getData('text/plain') || '').trim()
  if (!fromId || fromId === toId) return
  reorderSelectedEquipment(fromId, toId)
}

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
