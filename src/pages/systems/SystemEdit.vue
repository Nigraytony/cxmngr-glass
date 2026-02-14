<template>
  <section class="space-y-6 relative">
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Systems', to: '/systems' },
          { text: isNew ? 'New' : (form.name || 'Edit'), to: '' }
        ]"
        :title="isNew ? 'New System' : 'Edit System'"
      />
    </div>

    <div
      v-if="error"
      class="rounded-md border border-white/20 bg-red-500/20 text-red-100 px-3 py-2 text-sm"
    >
      {{ error }}
    </div>

    <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 space-y-4">
      <!-- Tabs header: Info, Checklists, FPT, Issues, Equipment, Meta, Settings, Logs -->
      <div class="mb-2">
        <div
          role="tablist"
          class="relative flex items-center w-full"
        >
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
            <svg
              v-if="t === 'Info'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><circle
              cx="12"
              cy="12"
              r="9"
              stroke-width="1.5"
            /><path
              d="M12 11v6"
              stroke-width="1.5"
              stroke-linecap="round"
            /><path
              d="M12 7h.01"
              stroke-width="2"
              stroke-linecap="round"
            /></svg>
            <svg
              v-else-if="t === 'Checklists'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M9 11l3 3L22 4"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><path
              d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
              stroke-width="1.5"
            /></svg>
            <svg
              v-else-if="t === 'FPT'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M12 6v6l4 2"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><circle
              cx="12"
              cy="12"
              r="9"
              stroke-width="1.5"
            /></svg>
            <svg
              v-else-if="t === 'Issues'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M12 3l9 16H3l9-16z"
              stroke-width="1.5"
              stroke-linejoin="round"
            /><path
              d="M12 9v4"
              stroke-width="1.5"
              stroke-linecap="round"
            /><path
              d="M12 17h.01"
              stroke-width="2"
              stroke-linecap="round"
            /></svg>
            <svg
              v-else-if="t === 'Equipment'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M4 19V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><path
              d="M7 6V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><path
              d="M4 19h16"
              stroke-width="1.5"
              stroke-linecap="round"
            /></svg>
            <svg
              v-else-if="t === 'Meta'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M20 12a8 8 0 1 1-8-8"
              stroke-width="1.5"
              stroke-linecap="round"
            /><path
              d="M20 4v6h-6"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
            <svg
              v-else-if="t === 'Settings'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
              stroke-width="1.5"
            /><path
              d="M19.4 15a7.93 7.93 0 0 0 .1-1 7.93 7.93 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8.06 8.06 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.6a8.06 8.06 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.93 7.93 0 0 0-.1 1 7.93 7.93 0 0 0 .1 1l-2 1.5 2 3.5 2.4-1c.53.42 1.1.77 1.7 1l.4 2.6h4l.4-2.6c.6-.23 1.17-.58 1.7-1l2.4 1 2-3.5-2-1.5z"
              stroke-width="1.5"
              stroke-linejoin="round"
            /></svg>
            <svg
              v-else-if="t === 'Logs'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2z"
              stroke-width="1.5"
            /><path
              d="M8 9h8M8 13h8M8 17h6"
              stroke-width="1.5"
              stroke-linecap="round"
            /></svg>
            <span>{{ t }}</span>
          </button>
        </div>
      </div>

      <!-- Tab content -->
      <div>
        <div
          v-if="currentTab === 'Info'"
          class="space-y-4"
        >
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-white/80 mb-1">Name</label>
              <input
                v-model="form.name"
                class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                placeholder="e.g., HVAC"
              >
            </div>
            <div>
              <label class="block text-sm text-white/80 mb-1">Tag</label>
              <input
                v-model="form.tag"
                class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                placeholder="e.g., SYS-HVAC"
              >
            </div>
            <div>
              <label class="block text-sm text-white/80 mb-1">Type</label>
              <input
                v-model="form.type"
                class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                placeholder="e.g., Mechanical"
              >
            </div>
            <div>
              <label class="block text-sm text-white/80 mb-1">Parent System</label>
              <select
                v-model="form.parentSystem"
                class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              >
                <option value="">
                  — none —
                </option>
                <option
                  v-for="opt in parentOptions"
                  :key="opt.id || opt._id"
                  :value="String(opt.id || opt._id)"
                >
                  {{ opt.name }}<span v-if="opt.tag"> ({{ opt.tag }})</span>
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm text-white/80 mb-1">Description</label>
            <textarea
              v-model="form.description"
              rows="4"
              class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              placeholder="Optional notes"
            />
          </div>

          <div class="text-xs text-white/60">
            Project: <span class="text-white/80">{{ projectStore.currentProject?.name || projectStore.currentProjectId || '—' }}</span>
          </div>

          <div class="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
              @click="goBack"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
                aria-hidden="true"
              ><path
                d="M15 18l-6-6 6-6"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg>
              <span>Back</span>
            </button>

            <div class="flex items-center gap-2 justify-end">
              <button
                v-if="!isNew"
                type="button"
                class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/25 text-red-50 text-sm border border-red-500/30 disabled:opacity-50"
                :disabled="saving"
                @click="onDelete"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                  aria-hidden="true"
                ><path
                  d="M6 7h12"
                  stroke-width="1.5"
                  stroke-linecap="round"
                /><path
                  d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                  stroke-width="1.5"
                /><rect
                  x="6"
                  y="7"
                  width="12"
                  height="14"
                  rx="2"
                  stroke-width="1.5"
                /><path
                  d="M10 11v6M14 11v6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                /></svg>
                <span>Delete</span>
              </button>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/25 text-emerald-50 text-sm border border-emerald-500/30 disabled:opacity-50"
                :disabled="saving || !canSave"
                @click="onSave"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                  aria-hidden="true"
                ><path
                  d="M4 7v13h16V7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /><path
                  d="M16 4H8v6h8V4z"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /><path
                  d="M8 20v-8h8v8"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
                <span>{{ saving ? 'Saving…' : 'Save' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div
          v-else-if="currentTab === 'Checklists'"
          class="space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="text-white/70 text-sm">
              Checklists
            </div>
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
              @click="persistChecklists(checklists)"
            >
              Save Checklists
            </button>
          </div>
          <ChecklistPanel
            v-model="checklists"
            :project-id="String(form.projectId || projectStore.currentProjectId || '')"
            :equipment-id="String(form.id || (form as any)._id || id)"
            :equipment-tag="String(form.tag || '')"
            :equipment-space="''"
            asset-label="system"
            asset-entity="system"
            :asset-id="String(form.id || (form as any)._id || id)"
            :asset-tag="String(form.tag || '')"
            :asset-space="''"
            @change="onChecklistsChange"
            @persist="persistChecklists"
          />
        </div>
        <div
          v-else-if="currentTab === 'FPT'"
          class="space-y-3"
        >
          <div
            v-if="!canEditFpt"
            class="rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          >
            Read-only: you don't have permission to edit FPT. Ask a project admin/CxA to grant <span class="font-mono text-amber-100/90">systems.functionalTests.update</span>.
          </div>
          <FunctionalTestsPanel
            v-model="functionalTests"
            :project-id="String(form.projectId || projectStore.currentProjectId || '')"
            :equipment-id="String(form.id || (form as any)._id || id)"
            :equipment-tag="String(form.tag || '')"
            :equipment-space="''"
            asset-label="system"
            asset-entity="system"
            :asset-id="String(form.id || (form as any)._id || id)"
            :asset-tag="String(form.tag || '')"
            :asset-space="''"
            :signatures="fptSignatures"
            :read-only="!canEditFpt"
            @update:signatures="persistFptSignatures"
            @change="onFunctionalTestsChange"
            @save="onFunctionalTestsSave"
          />
        </div>
        <div
          v-else-if="currentTab === 'Issues'"
          class="space-y-3"
        >
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="text-white/80">
              Issues linked to this system
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
                        <span v-if="issueSuggestTotal">Total {{ issueSuggestTotal }}</span>
                        <span v-else>—</span>
                      </div>
                      <div class="text-xs text-white/60 whitespace-nowrap">
                        <span v-if="issueSuggestTotal">Showing {{ issueSuggestStart }}–{{ issueSuggestEnd }}</span>
                      </div>
                      <div class="text-xs text-white/60 whitespace-nowrap">
                        <span v-if="issueSuggestTotal">Page {{ issueSuggestPage }} / {{ issueSuggestTotalPages }}</span>
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
            :issues="issuesForSystem"
            :show-unlink="true"
            @unlink="onUnlinkIssue"
          />
        </div>
        <div
          v-else-if="currentTab === 'Equipment'"
          class="space-y-3"
        >
          <div>
            <label class="block text-sm text-white/70">Search by tag/title/system to add</label>
            <div class="relative">
              <input
                v-model="equipmentText"
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
                        title="Remove from System"
                        aria-label="Remove"
                        @click="removeSelectedEquipment(e)"
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

        <div
          v-else-if="currentTab === 'Meta'"
          class="space-y-6"
        >
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="text-white/85 font-medium">
                  Tags
                </div>
                <div class="text-xs text-white/60">
                  {{ systemTags.length }} total
                </div>
              </div>

              <div class="flex items-center gap-2">
                <input
                  v-model="metaTagInput"
                  type="text"
                  class="flex-1 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  placeholder="Add a tag and press Enter"
                  @keydown.enter.prevent="addSystemTag"
                >
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  :disabled="!metaTagInput.trim()"
                  @click="addSystemTag"
                >
                  Add
                </button>
              </div>

              <div
                v-if="systemTags.length === 0"
                class="text-xs text-white/60"
              >
                No tags yet.
              </div>

              <div
                v-else
                class="flex flex-wrap gap-2"
              >
                <span
                  v-for="t in systemTags"
                  :key="t"
                  class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/85"
                >
                  <span>{{ t }}</span>
                  <button
                    type="button"
                    class="text-white/60 hover:text-white"
                    aria-label="Remove tag"
                    @click="removeSystemTag(t)"
                  >
                    ×
                  </button>
                </span>
              </div>

              <div class="flex items-center justify-end">
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35"
                  @click="saveMeta({ tags: systemTags })"
                >
                  Save Tags
                </button>
              </div>
            </div>

            <div class="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="text-white/85 font-medium">
                  Attributes
                </div>
                <div class="text-xs text-white/60">
                  {{ attributesList.length }} total
                </div>
              </div>

              <div
                v-if="attributesList.length === 0"
                class="text-xs text-white/60"
              >
                No attributes yet.
              </div>

              <div
                v-else
                class="space-y-2"
              >
                <div
                  v-for="(a, idx) in attributesList"
                  :key="idx"
                  class="grid grid-cols-12 gap-2 items-center"
                >
                  <input
                    v-model="a.key"
                    class="col-span-5 px-3 py-2 rounded-md bg-white/10 border border-white/20 text-sm"
                    placeholder="Key"
                  >
                  <input
                    v-model="a.value"
                    class="col-span-6 px-3 py-2 rounded-md bg-white/10 border border-white/20 text-sm"
                    placeholder="Value"
                  >
                  <button
                    type="button"
                    class="col-span-1 h-9 w-9 inline-grid place-items-center rounded-md bg-red-500/15 border border-red-500/30 text-red-200 hover:bg-red-500/25"
                    aria-label="Remove attribute"
                    @click="removeAttribute(idx)"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-12 gap-2 items-center">
                <input
                  v-model="attrKey"
                  class="col-span-5 px-3 py-2 rounded-md bg-white/10 border border-white/20 text-sm"
                  placeholder="New key"
                >
                <input
                  v-model="attrValue"
                  class="col-span-6 px-3 py-2 rounded-md bg-white/10 border border-white/20 text-sm"
                  placeholder="New value"
                >
                <button
                  type="button"
                  class="col-span-1 h-9 w-9 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50"
                  aria-label="Add attribute"
                  :disabled="!attrKey.trim()"
                  @click="addAttribute"
                >
                  +
                </button>
              </div>

              <div class="flex items-center justify-end">
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35"
                  @click="saveMeta({ attributes: attributesList })"
                >
                  Save Attributes
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-xl bg-white/5 border border-white/10 p-4">
            <OprItemPicker
              :project-id="String(form.projectId || projectStore.currentProjectId || '')"
              :model-value="oprItemIds"
              label="OPR items"
              @update:model-value="onOprItemIdsUpdate"
            />
          </div>
        </div>
        <div
          v-else-if="currentTab === 'Settings'"
          class="py-12 text-center text-white/70"
        >
          Settings tab coming soon.
        </div>
        <div
          v-else-if="currentTab === 'Logs'"
          class="py-12 text-center text-white/70"
        >
          Logs tab coming soon.
        </div>
      </div>
    </div>

    <!-- Create Issue Modal (mirrors ActivityEdit behavior) -->
    <Modal v-model="showIssueModal">
      <template #header>
        <div class="text-lg font-semibold">
          Add Issue for System
        </div>
      </template>

      <IssueForm v-model="systemIssueDraft" />

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
            @click="createSystemIssue"
          >
            Create
          </button>
        </div>
      </template>
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import ChecklistPanel from '../../components/ChecklistPanel.vue'
import FunctionalTestsPanel from '../../components/FunctionalTestsPanel.vue'
import IssuesTable from '../../components/IssuesTable.vue'
import IssueForm from '../../components/IssueForm.vue'
import OprItemPicker from '../../components/OprItemPicker.vue'
import { useAuthStore } from '../../stores/auth'
import { useEquipmentStore } from '../../stores/equipment'
import { useIssuesStore } from '../../stores/issues'
import { useProjectStore } from '../../stores/project'
import { useSpacesStore } from '../../stores/spaces'
import { useUiStore } from '../../stores/ui'
import { useSystemsStore, type SystemRecord } from '../../stores/systems'
import http from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const projectStore = useProjectStore()
const systemsStore = useSystemsStore()
const ui = useUiStore()
const issuesStore = useIssuesStore()
const equipmentStore = useEquipmentStore()
const spacesStore = useSpacesStore()

const id = computed(() => String(route.params.id || ''))
const isNew = computed(() => id.value === 'new')

const saving = ref(false)
const error = ref<string>('')

// tabs state (match EquipmentEdit pattern)
const tabs = ['Info', 'Checklists', 'FPT', 'Issues', 'Equipment', 'Meta', 'Settings', 'Logs'] as const
type TabKey = (typeof tabs)[number]
const currentTab = ref<TabKey>('Info')
const tabIndex = computed(() => Math.max(0, tabs.indexOf(currentTab.value)))
const tabWidth = computed(() => 100 / tabs.length)
const tabLeft = computed(() => tabIndex.value * tabWidth.value)

function setTabFromQuery() {
  const q = String((route.query as any)?.tab || '')
  if (q && (tabs as readonly string[]).includes(q)) currentTab.value = q as TabKey
}

const form = ref<SystemRecord>({
  projectId: '',
  name: '',
  tag: '',
  type: '',
  description: '',
  parentSystem: null,
  tags: [],
  attributes: [],
  oprItemIds: [],
})

const parentOptions = computed(() => {
  const selfId = String(id.value || '')
  const list = Array.isArray(systemsStore.items) ? systemsStore.items : []
  return list.filter((s: any) => String(s.id || s._id || '') && String(s.id || s._id || '') !== selfId)
})

const canSave = computed(() => {
  if (!projectStore.currentProjectId) return false
  if (!String(form.value.name || '').trim()) return false
  return true
})

// Permission gating (mirrors EquipmentEdit pattern)
const isGlobalAdmin = computed(() => {
  const r = String((authStore.user as any)?.role || '').toLowerCase()
  return r === 'globaladmin' || r === 'superadmin'
})

const currentProjectMember = computed<any | null>(() => {
  const project: any = projectStore.currentProject || null
  const team: any[] = Array.isArray(project?.team) ? project.team : []
  const user: any = authStore.user || null
  if (!user) return null
  const uid = String(user._id || user.id || '').trim()
  const email = String(user.email || '').trim().toLowerCase()
  if (!uid && !email) return null
  return team.find((m: any) => {
    const mid = String(m?._id || m?.id || '').trim()
    const memail = String(m?.email || '').trim().toLowerCase()
    return (uid && mid && uid === mid) || (email && memail && email === memail)
  }) || null
})

const isProjectAdminOrCxA = computed(() => {
  const role = String(currentProjectMember.value?.role || '').trim().toLowerCase()
  return role === 'admin' || role === 'cxa'
})

const memberPermissions = computed<string[]>(() => {
  const perms = (currentProjectMember.value as any)?.permissions
  return Array.isArray(perms) ? perms.map((p: any) => String(p || '').trim()).filter(Boolean) : []
})

const canEditFpt = computed(() => {
  if (isGlobalAdmin.value) return true
  if (isProjectAdminOrCxA.value) return true
  return memberPermissions.value.includes('systems.functionalTests.update')
})

// Checklists and FPT lists (stored on system record)
const checklists = computed<any[]>({
  get() {
    const cl: any = (form.value as any).checklists
    if (Array.isArray(cl)) return cl
    if (cl && typeof cl === 'object') return Object.values(cl)
    return []
  },
  set(v: any[]) {
    (form.value as any).checklists = Array.isArray(v) ? v : []
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
    (form.value as any).functionalTests = Array.isArray(v) ? v : []
  }
})

const fptSignatures = computed<any[]>({
  get() {
    const s: any = (form.value as any).fptSignatures
    if (Array.isArray(s)) return s
    if (s && typeof s === 'object') return Object.values(s)
    return []
  },
  set(v: any[]) {
    (form.value as any).fptSignatures = Array.isArray(v) ? v : []
  }
})

async function persistFunctionalTests(tests: any[]) {
  try {
    if (!canEditFpt.value) {
      ui.showError('You do not have permission to edit functional tests')
      return
    }
    const sid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!sid || sid === 'new') return
    await systemsStore.updateFields(sid, { functionalTests: tests } as any)
    const fresh = await systemsStore.fetchOne(sid)
    if (fresh) form.value = { ...fresh }
    ui.showSuccess('Functional tests saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save functional tests')
  }
}

function onFunctionalTestsChange(tests: any[]) {
  (form.value as any).functionalTests = Array.isArray(tests) ? tests : []
}

function onFunctionalTestsSave(tests: any[]) {
  if (!canEditFpt.value) {
    ui.showError('You do not have permission to edit functional tests')
    return
  }
  persistFunctionalTests(tests)
}

async function persistFptSignatures(sigs: any[]) {
  try {
    if (!canEditFpt.value) {
      ui.showError('You do not have permission to edit functional test signatures')
      return
    }
    const sid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!sid || sid === 'new') return
    await systemsStore.updateFields(sid, { fptSignatures: sigs } as any)
    const fresh = await systemsStore.fetchOne(sid)
    if (fresh) form.value = { ...fresh }
    ui.showSuccess('Signatures saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save signatures')
  }
}

let checklistSaveTimer: any = null
async function persistChecklists(sections: any[]) {
  try {
    const sid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!sid || sid === 'new') return
    await systemsStore.updateFields(sid, { checklists: sections } as any)
    const f: any = form.value
    f.checklists = Array.isArray(sections) ? sections : []
    ui.showSuccess('Checklists saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save checklist')
  }
}

function onChecklistsChange(sections: any[]) {
  if (checklistSaveTimer) { clearTimeout(checklistSaveTimer); checklistSaveTimer = null }
  (form.value as any).checklists = Array.isArray(sections) ? sections : []
}

function goBack() {
  router.push({ name: 'systems' })
}

async function load() {
  error.value = ''

  const pid = String(projectStore.currentProjectId || '')
  if (pid) form.value.projectId = pid

  // Ensure we have systems list for parent picker
  if (pid) {
    try { await systemsStore.fetchByProject(pid) } catch { /* ignore */ }
  }

  // Best-effort supporting data for Issues/Equipment tabs
  if (pid) {
    try {
      await Promise.all([
        issuesStore.fetchIssues(pid).catch(() => {}),
        equipmentStore.fetchByProject(pid).catch(() => {}),
        spacesStore.fetchByProject(pid).catch(() => {}),
      ])
    } catch { /* ignore */ }
  }

  if (isNew.value) return

  const sys = await systemsStore.fetchOne(id.value)
  if (!sys) {
    error.value = systemsStore.error || 'System not found'
    return
  }
  // Keep all fields from the fetched system (checklists/FPT/relationships)
  form.value = {
    ...(sys as any),
    id: String((sys as any).id || (sys as any)._id || id.value),
    projectId: String((sys as any).projectId || pid || ''),
    parentSystem: (sys as any).parentSystem ? String((sys as any).parentSystem) : null,
  }

  // Normalize meta fields so the Meta tab can edit them safely
  const f: any = form.value as any
  f.tags = normalizeStringArrayClient(f.tags)
  f.attributes = normalizeAttrPairsClient(f.attributes)
  f.oprItemIds = normalizeIdArrayClient(f.oprItemIds)
}

// -----------------------------
// Meta tab (Tags, Attributes, OPR items)
// -----------------------------
type AttrPair = { key: string; value: string }

function normalizeStringArrayClient(value: any): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === 'string') {
      return value.split(',').map((s) => String(s || '').trim()).filter(Boolean)
    }
    return []
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    const s = String(raw || '').trim()
    if (!s) continue
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}

function normalizeAttrPairsClient(value: any): AttrPair[] {
  if (!Array.isArray(value)) return []
  const out: AttrPair[] = []
  for (const row of value) {
    if (!row) continue
    const key = String((row as any).key ?? (row as any).title ?? '').trim()
    if (!key) continue
    const val = String((row as any).value ?? '').trim()
    out.push({ key, value: val })
  }
  return out
}

function normalizeIdArrayClient(value: any): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    const id = String((raw && ((raw as any)._id || (raw as any).id)) || raw || '').trim()
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

const metaTagInput = ref('')

const systemTags = computed<string[]>({
  get() {
    const f: any = form.value as any
    if (!Array.isArray(f.tags)) f.tags = normalizeStringArrayClient(f.tags)
    return f.tags
  },
  set(v) {
    const f: any = form.value as any
    f.tags = normalizeStringArrayClient(v)
  },
})

const attributesList = computed<AttrPair[]>({
  get() {
    const f: any = form.value as any
    if (!Array.isArray(f.attributes)) f.attributes = normalizeAttrPairsClient(f.attributes)
    return f.attributes
  },
  set(v) {
    const f: any = form.value as any
    f.attributes = normalizeAttrPairsClient(v)
  },
})

const attrKey = ref('')
const attrValue = ref('')

function addAttribute() {
  const key = String(attrKey.value || '').trim()
  if (!key) return
  const value = String(attrValue.value || '').trim()
  attributesList.value = [...attributesList.value, { key, value }]
  attrKey.value = ''
  attrValue.value = ''
}

function removeAttribute(index: number) {
  const list = Array.isArray(attributesList.value) ? attributesList.value : []
  attributesList.value = list.filter((_, i) => i !== index)
}

function addSystemTag() {
  const raw = String(metaTagInput.value || '').trim()
  if (!raw) return
  const next = normalizeStringArrayClient([...(systemTags.value || []), raw])
  systemTags.value = next
  metaTagInput.value = ''
}

function removeSystemTag(tag: string) {
  const t = String(tag || '').trim()
  if (!t) return
  systemTags.value = (systemTags.value || []).filter((x) => String(x || '').trim().toLowerCase() !== t.toLowerCase())
}

const oprItemIds = computed<string[]>(() => {
  const f: any = form.value as any
  if (!Array.isArray(f.oprItemIds)) f.oprItemIds = normalizeIdArrayClient(f.oprItemIds)
  return f.oprItemIds
})

async function saveMeta(patch: Partial<SystemRecord>) {
  try {
    const sid = await ensureSystemExists()
    if (!sid) return
    const payload: any = { ...patch }
    if (payload.tags !== undefined) payload.tags = normalizeStringArrayClient(payload.tags)
    if (payload.attributes !== undefined) payload.attributes = normalizeAttrPairsClient(payload.attributes)
    if (payload.oprItemIds !== undefined) payload.oprItemIds = normalizeIdArrayClient(payload.oprItemIds)

    const fresh = await systemsStore.updateFields(String(sid), payload)
    if (fresh) form.value = { ...(form.value as any), ...(fresh as any) }
    ui.showSuccess('Saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save')
  }
}

async function onOprItemIdsUpdate(v: string[]) {
  const next = normalizeIdArrayClient(v)
  ;(form.value as any).oprItemIds = next
  await saveMeta({ oprItemIds: next } as any)
}

// -----------------------------
// Issues tab (ported from ActivityEdit)
// -----------------------------
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
const issuesForSystem = computed(() => {
  const source = Array.isArray((form.value as any).issueIds) && (form.value as any).issueIds.length
    ? ((form.value as any).issueIds as any[])
    : []
  const out: any[] = []
  for (const ref of (Array.isArray(source) ? source : [])) {
    const iid = issueRefToId(ref)
    if (!iid) continue
    const obj = issuesById.value[iid]
    if (obj) {
      out.push({
        ...obj,
        recommendation: obj.recommendation || obj.recommendationText || obj.recommendation_text || '',
      })
    }
  }
  return out
})

const showIssueModal = ref(false)
const systemIssueDraft = ref<any>({
  number: null,
  status: 'open',
  priority: 'medium',
  type: 'System',
  title: '',
  description: '',
  foundBy: '',
  dateFound: '',
  assignedTo: '',
  dueDate: '',
  location: '',
  system: '',
})

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
  const pid = String(form.value.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '')
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
    const payload = (data && ((data as any).items || data)) || []
    const items: any[] = Array.isArray(payload) ? payload : []
    issueSuggestTotal.value = Number(((data as any) && (((data as any).total ?? (data as any).count))) ?? items.length)
    const linkedIds = new Set<string>((Array.isArray((form.value as any).issueIds) ? (form.value as any).issueIds : []).map(issueRefToId).filter(Boolean))
    issueSuggestions.value = items
      .map((it: any) => ({ ...(it || {}), id: it?._id || it?.id }))
      .filter((it: any) => {
        const iid = String(it?.id || '')
        return iid && !linkedIds.has(iid)
      })
  } catch (e) {
    const ql = q.toLowerCase()
    const all = Array.isArray(issuesStore.issues) ? issuesStore.issues : []
    const linkedIds = new Set<string>((Array.isArray((form.value as any).issueIds) ? (form.value as any).issueIds : []).map(issueRefToId).filter(Boolean))
    const filtered = all.filter((it: any) => {
      const iid = String(it.id || it._id || '')
      if (!iid || linkedIds.has(iid)) return false
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
  if (!issueSearch.value && !issueSuggestions.value.length && !issueSuggestionsLoading.value) {
    issueSuggestPage.value = 1
    fetchIssueSuggestions('', { page: 1 }).catch(() => {})
  }
}
function closeIssueSuggestions() { issueSuggestionsOpen.value = false }
function onIssueInputBlur() { setTimeout(() => { closeIssueSuggestions() }, 120) }
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

async function ensureSystemExists(): Promise<string> {
  if (!isNew.value) return String(form.value.id || (form.value as any)._id || id.value || '')
  const pid = String(projectStore.currentProjectId || form.value.projectId || '')
  if (!pid) throw new Error('Select a project first')
  if (!String(form.value.name || '').trim()) {
    ui.showError('Enter a system name first')
    return ''
  }
  const payload: any = {
    projectId: pid,
    name: String(form.value.name || '').trim(),
    tag: String(form.value.tag || '').trim() || undefined,
    type: String(form.value.type || '').trim() || undefined,
    description: String(form.value.description || '').trim() || undefined,
    parentSystem: form.value.parentSystem ? String(form.value.parentSystem) : null,
    equipmentIds: Array.isArray((form.value as any).equipmentIds) ? (form.value as any).equipmentIds : [],
    issueIds: Array.isArray((form.value as any).issueIds) ? (form.value as any).issueIds : [],
    tags: Array.isArray((form.value as any).tags) ? (form.value as any).tags : [],
    attributes: Array.isArray((form.value as any).attributes) ? (form.value as any).attributes : [],
    oprItemIds: Array.isArray((form.value as any).oprItemIds) ? (form.value as any).oprItemIds : [],
  }
  const created = await systemsStore.create(payload)
  const newId = String((created as any).id || (created as any)._id || '')
  if (newId) {
    form.value = { ...(created as any), id: newId }
    router.replace({ name: 'system-edit', params: { id: newId } })
  }
  return newId
}

async function linkExistingIssue(issue: any) {
  try {
    const issueId = String(issue?.id || issue?._id || '').trim()
    if (!issueId) return
    const sid = await ensureSystemExists()
    if (!sid) return

    const existing = Array.isArray((form.value as any).issueIds) ? (form.value as any).issueIds : []
    const ids = existing.map(issueRefToId).filter(Boolean)
    if (!ids.includes(issueId)) ids.push(issueId)
    ;(form.value as any).issueIds = ids
    await systemsStore.updateFields(String(sid), { issueIds: ids } as any)

    // Best-effort bidirectional stamp
    try {
      await issuesStore.updateIssue(issueId, {
        systemId: sid,
        system: String(form.value.tag || form.value.name || '' || '').trim() || undefined,
      } as any)
    } catch { /* non-blocking */ }

    issueSearch.value = ''
    ui.showSuccess('Issue linked to system')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to link issue')
  }
}

async function onUnlinkIssue(issue: any) {
  try {
    if (isNew.value) return
    const issueId = String(issue?.id || issue?._id || '').trim()
    if (!issueId) return
    const sid = String(form.value.id || (form.value as any)._id || id.value || '')

    const existing = Array.isArray((form.value as any).issueIds) ? (form.value as any).issueIds : []
    const next = existing.filter((ref: any) => issueRefToId(ref) !== issueId)
    ;(form.value as any).issueIds = next
    await systemsStore.updateFields(String(sid), { issueIds: next } as any)

    // Best-effort: clear systemId on the issue if it points to this system
    try {
      const currentIssue = issuesById.value[issueId]
      if (currentIssue && String((currentIssue as any).systemId || '') === String(sid)) {
        await issuesStore.updateIssue(issueId, { systemId: undefined } as any)
      }
    } catch { /* non-blocking */ }

    ui.showSuccess('Issue unlinked from system')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to unlink issue')
  }
}

function openIssueModal() {
  const name = String(form.value.name || '').trim()
  const tag = String(form.value.tag || '').trim()
  const title = tag ? `${tag} issue` : (name ? `${name} issue` : 'System issue')
  const descParts: string[] = []
  if (name) descParts.push(`System: ${name}`)
  if (tag) descParts.push(`Tag: ${tag}`)
  systemIssueDraft.value.title = title
  systemIssueDraft.value.description = descParts.join('\n') || 'Issue for this system'
  systemIssueDraft.value.type = 'System'
  systemIssueDraft.value.system = tag || name
  systemIssueDraft.value.location = ''
  showIssueModal.value = true
}
function closeIssueModal() { showIssueModal.value = false }

async function createSystemIssue() {
  try {
    const pid = String(form.value.projectId || projectStore.currentProjectId || '')
    if (!pid) { ui.showError('Missing project id'); return }
    const sid = await ensureSystemExists()
    if (!sid) return
    const draft = systemIssueDraft.value || {}
    const title = (draft.title || '').trim() || 'System Issue'
    const description = (draft.description || '').trim() || 'Created from system'

    const payload: any = {
      projectId: pid,
      title,
      description,
      type: draft.type || 'System',
      severity: toApiPriority(draft.priority),
      status: toApiStatus(draft.status),
      systemId: sid,
      system: String(draft.system || form.value.tag || form.value.name || '').trim() || undefined,
      location: draft.location || undefined,
      assignedTo: draft.assignedTo || undefined,
    }
    const created = await issuesStore.createIssue(payload)
    const newId = String((created as any).id || (created as any)._id || '')
    if (newId) {
      const cur = Array.isArray((form.value as any).issueIds) ? (form.value as any).issueIds : []
      if (!cur.includes(newId)) cur.push(newId)
      ;(form.value as any).issueIds = cur
      await systemsStore.updateFields(String(sid), { issueIds: cur } as any)
    }
    ui.showSuccess('Issue created')
    showIssueModal.value = false
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to create issue')
  }
}

// -----------------------------
// Equipment tab (ported from ActivityEdit, but persists to system.equipmentIds)
// -----------------------------
const equipmentInProject = computed<any[]>(() => Array.isArray(equipmentStore.items) ? equipmentStore.items : [])
const equipmentLoading = computed<boolean>(() => !!(equipmentStore as any).loading)

function spacesById(): Record<string, any> {
  const raw = (spacesStore as any).byId
  if (!raw) return {}
  if (typeof raw === 'object' && 'value' in raw) {
    const v = (raw as any).value
    return v && typeof v === 'object' ? v as Record<string, any> : {}
  }
  return typeof raw === 'object' ? raw as Record<string, any> : {}
}
function getSpaceById(spaceId: any): any | null {
  const key = typeof spaceId === 'string' ? spaceId.trim() : spaceId != null ? String(spaceId) : ''
  if (!key || key === 'undefined' || key === 'null') return null
  const map = spacesById()
  if (map && map[key]) return map[key]
  return (spacesStore.items || []).find((s: any) => String(s.id || s._id) === key) || null
}
function spaceParentChainLabel(s: any) {
  try {
    const parts: string[] = []
    let cur: any = s
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
  } catch { return '' }
}
function equipmentBreadcrumbLabel(equipment: any) {
  try {
    if (!equipment?.spaceId) return equipment?.tag || ''
    const space = getSpaceById(equipment.spaceId)
    if (!space) return equipment?.tag || ''
    const spaceChain = spaceParentChainLabel(space)
    const equipmentTag = String(equipment?.tag || '')
    return spaceChain ? `${spaceChain} > ${equipmentTag}` : equipmentTag
  } catch { return equipment?.tag || '' }
}
function equipmentLocationBreadcrumb(equipment: any) {
  try {
    if (!equipment?.spaceId) return '—'
    const space = getSpaceById(equipment.spaceId)
    if (!space) return '—'
    return spaceParentChainLabel(space) || space.title || space.tag || '—'
  } catch { return '—' }
}

function normalizeIdValue(v: any): string {
  const str = typeof v === 'string' ? v.trim() : v != null ? String(v).trim() : ''
  if (!str || str === 'undefined' || str === 'null' || str === '[object Object]') return ''
  return str
}

const equipmentText = ref('')
const equipmentOrderTouched = ref(false)

const selectedEquip = computed<any[]>(() => {
  const sels = (Array.isArray((form.value as any).equipmentIds) ? (form.value as any).equipmentIds : []).map((s: any) => String(s || '').trim()).filter(Boolean)
  if (!sels.length) return []
  const byId: Record<string, any> = {}
  for (const e of equipmentInProject.value) {
    const eid = String(e?.id || e?._id || '')
    if (eid) byId[eid] = e
  }
  const out: any[] = []
  const seen = new Set<string>()
  for (const eid of sels) {
    if (!eid || seen.has(eid)) continue
    seen.add(eid)
    const eq = byId[eid]
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
const pagedEquip = computed(() => {
  const start = (equipPage.value - 1) * equipPerPage.value
  return selectedEquip.value.slice(start, start + equipPerPage.value)
})

function equipmentId(e: any): string {
  return String(e?.id || e?._id || '').trim()
}

let queueSaveEquip: any = null
function queueSaveEquipmentChange() {
  if (queueSaveEquip) clearTimeout(queueSaveEquip)
  queueSaveEquip = setTimeout(async () => { await saveEquipment() }, 300)
}

async function saveEquipment() {
  if (isNew.value) {
    // Creating new system just to save equipment is allowed, but require minimum fields.
    if (!String(form.value.name || '').trim()) return
    await ensureSystemExists()
  }
  const sid = normalizeIdValue(form.value.id || (form.value as any)._id || id.value)
  if (!sid || sid === 'new') return
  const ids = (Array.isArray((form.value as any).equipmentIds) ? (form.value as any).equipmentIds : []).map((x: any) => String(x || '').trim()).filter(Boolean)
  await systemsStore.updateFields(String(sid), { equipmentIds: ids } as any)
}

function addSelectedEquipment(e: any) {
  const eid = equipmentId(e)
  if (!eid) return
  const cur = Array.isArray((form.value as any).equipmentIds) ? (form.value as any).equipmentIds : []
  const next = cur.map((x: any) => String(x || '').trim()).filter(Boolean)
  if (!next.includes(eid)) next.push(eid)
  ;(form.value as any).equipmentIds = next
  queueSaveEquipmentChange()
}
function removeSelectedEquipment(e: any) {
  const eid = equipmentId(e)
  if (!eid) return
  const cur = Array.isArray((form.value as any).equipmentIds) ? (form.value as any).equipmentIds : []
  ;(form.value as any).equipmentIds = cur.filter((x: any) => String(x || '').trim() !== eid)
  equipmentText.value = ''
  queueSaveEquipmentChange()
}

function reorderSelectedEquipment(fromId: string, toId: string) {
  const ids = (Array.isArray((form.value as any).equipmentIds) ? (form.value as any).equipmentIds : []).map((s: any) => String(s || '').trim()).filter(Boolean)
  const fromIdx = ids.indexOf(fromId)
  const toIdx = ids.indexOf(toId)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const next = [...ids]
  next.splice(fromIdx, 1)
  const insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx
  next.splice(insertAt, 0, fromId)
  ;(form.value as any).equipmentIds = next
  equipmentOrderTouched.value = true
  queueSaveEquipmentChange()
}
function onEquipDragStart(e: DragEvent, eq: any) {
  const eid = equipmentId(eq)
  if (!eid) return
  equipmentOrderTouched.value = true
  try {
    e.dataTransfer?.setData('text/plain', eid)
    e.dataTransfer?.setData('application/x-equip-id', eid)
    e.dataTransfer?.setDragImage?.((e.target as HTMLElement) || new Image(), 0, 0)
  } catch { /* ignore */ }
}
function onEquipDrop(e: DragEvent, targetEq: any) {
  const toId = equipmentId(targetEq)
  if (!toId) return
  const fromId = (e.dataTransfer?.getData('application/x-equip-id') || e.dataTransfer?.getData('text/plain') || '').trim()
  if (!fromId || fromId === toId) return
  reorderSelectedEquipment(fromId, toId)
}

function rankCandidate(e: any, q: string): number {
  const lc = q.toLowerCase()
  const tag = String(e?.tag || '').toLowerCase()
  const title = String(e?.title || '').toLowerCase()
  const type = String(e?.type || '').toLowerCase()
  const sys = String(e?.system || '').toLowerCase()
  const loc = String((() => {
    const sp = e?.spaceId ? getSpaceById(e.spaceId) : null
    return sp ? (sp.title || sp.tag || '') : ''
  })() || '').toLowerCase()
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
  const q = String(equipmentText.value || '').trim().toLowerCase()
  if (!q) return []
  const selectedIds = new Set<string>((Array.isArray((form.value as any).equipmentIds) ? (form.value as any).equipmentIds : []).map((x: any) => String(x || '').trim()).filter(Boolean))
  const list = equipmentInProject.value
    .filter((e: any) => {
      const eid = String(e?.id || e?._id || '').trim()
      if (!eid || selectedIds.has(eid)) return false
      const tag = String(e?.tag || '').trim().toLowerCase()
      const title = String(e?.title || '').toLowerCase()
      const type = String(e?.type || '').toLowerCase()
      const sys = String(e?.system || '').toLowerCase()
      const loc = String((() => {
        const sp = e?.spaceId ? getSpaceById(e.spaceId) : null
        return sp ? (sp.title || sp.tag || '') : ''
      })() || '').toLowerCase()
      return tag.includes(q) || title.includes(q) || type.includes(q) || sys.includes(q) || loc.includes(q)
    })
    .sort((a: any, b: any) => rankCandidate(b, q) - rankCandidate(a, q))
  return list.slice(0, 8)
})

const suggestionsOpen = ref(false)
const showSuggestions = computed<boolean>(() => suggestionsOpen.value && !!equipmentText.value && suggestions.value.length > 0)
function addSuggestion(e: any) {
  addSelectedEquipment(e)
  equipmentText.value = ''
  closeSuggestions()
}
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
  equipmentText.value = ''
  closeSuggestions()
}
function openSuggestions() { suggestionsOpen.value = true }
function closeSuggestions() { suggestionsOpen.value = false }
function onInputBlur() { setTimeout(() => closeSuggestions(), 100) }

function addByQuery() {
  const idx = highlightedIndex.value
  if (idx >= 0 && suggestions.value[idx]) {
    addSuggestion(suggestions.value[idx])
    return
  }
  const q = String(equipmentText.value || '').trim()
  if (!q) return
  const lc = q.toLowerCase()
  const list = equipmentInProject.value
  const exact = list.find((e: any) => String(e?.tag || '').trim().toLowerCase() === lc)
  let pick: any = exact || null
  if (!pick) {
    const cands = list.filter((e: any) => {
      const tag = String(e?.tag || '').toLowerCase()
      const title = String(e?.title || '').toLowerCase()
      const type = String(e?.type || '').toLowerCase()
      const sys = String(e?.system || '').toLowerCase()
      const loc = String((() => {
        const sp = e?.spaceId ? getSpaceById(e.spaceId) : null
        return sp ? (sp.title || sp.tag || '') : ''
      })() || '').toLowerCase()
      return tag.includes(lc) || title.includes(lc) || type.includes(lc) || sys.includes(lc) || loc.includes(lc)
    })
    if (cands.length === 1) pick = cands[0]
    else if (cands.length === 0) ui.showError(`No equipment found for "${q}"`)
    else ui.showError(`Multiple matches for "${q}". Please refine.`)
  }
  if (pick) {
    addSelectedEquipment(pick)
    equipmentText.value = ''
  }
}

async function onSave() {
  if (!canSave.value) return
  saving.value = true
  error.value = ''
  try {
    const pid = String(projectStore.currentProjectId || '')
    if (!pid) throw new Error('Select a project first')

    const payload: any = {
      projectId: pid,
      name: String(form.value.name || '').trim(),
      tag: String(form.value.tag || '').trim() || undefined,
      type: String(form.value.type || '').trim() || undefined,
      description: String(form.value.description || '').trim() || undefined,
      parentSystem: form.value.parentSystem ? String(form.value.parentSystem) : null,
    }

    if (isNew.value) {
      const created = await systemsStore.create(payload)
      const newId = String((created as any).id || (created as any)._id || '')
      if (newId) router.replace({ name: 'system-edit', params: { id: newId } })
    } else {
      await systemsStore.update({ ...payload, id: id.value })
    }
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to save system'
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (isNew.value) return
  if (!confirm('Delete this system?')) return
  saving.value = true
  error.value = ''
  try {
    await systemsStore.remove(id.value)
    goBack()
  } catch (e: any) {
    error.value = e?.response?.data?.error || e?.message || 'Failed to delete system'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  setTabFromQuery()
  await load()
})

watch(() => route.query, () => setTabFromQuery())
</script>
