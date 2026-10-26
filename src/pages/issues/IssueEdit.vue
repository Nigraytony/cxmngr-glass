<template>
  <div class="space-y-4 text-white">
    <div>
      <BreadCrumbs
        :items="crumbs"
        class="mt-1 text-white/70"
      />
    </div>

    <ConflictBanner
      v-if="issues.conflict"
      entity-label="issue"
      @reload="reloadForConflict"
      @dismiss="issues.conflict = null"
    />

    <template v-if="!loaded && !notFound">
      <div
        class="w-full rounded-2xl p-6 bg-white/6 backdrop-blur-xl border border-white/10 text-white/80 flex items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <Spinner />
        <div>
          <p class="text-sm uppercase tracking-wide">
            Loading issue…
          </p>
          <p class="text-xs text-white/60">
            Fetching issue details
          </p>
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
              <!-- OPR -->
              <svg
                v-else-if="t === 'OPR'"
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4 text-white/90"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M9 6h10"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M9 12h10"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M9 18h10"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M5 6h.01M5 12h.01M5 18h.01"
                  stroke-width="2"
                  stroke-linecap="round"
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
                  <div class="relative">
                    <input
                      v-model="spaceQuery"
                      type="text"
                      :disabled="isClosed"
                      class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                      placeholder="Search spaces or type a location..."
                      @input="onSpaceInput"
                      @keydown.down.prevent="onSpaceArrow(1)"
                      @keydown.up.prevent="onSpaceArrow(-1)"
                      @keydown.enter.prevent="chooseHighlightedSpace"
                      @keydown.esc="hideSpaceSuggestions"
                      @focus="onSpaceFocus"
                      @blur="hideSpaceSuggestions"
                    >
                    <button
                      v-if="form.spaceId && !isClosed"
                      type="button"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                      title="Clear selected space"
                      @mousedown.prevent="clearSpace"
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
                          type="button"
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
            <!--
              The outer grid uses `items-start`, so this cell would normally
              sit at its natural height. `md:self-stretch` overrides that and
              lets the cell match the left column's full height (down to Due
              Date). `min-h-0` + flex column + `flex-1` on the editor make it
              fill that cell exactly, and the editor's own overflow-y: auto
              handles scrolling when content exceeds the fixed height.
            -->
            <div class="flex flex-col min-h-0 md:self-stretch">
              <label class="block text-sm text-white/70">Description</label>
              <RichTextEditor
                v-model="form.description"
                :editable="!isClosed"
                class="flex-1 min-h-0"
              />
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
                <label class="block text-sm text-white/70">Contractor response — corrective action</label>
                <textarea
                  v-model="form.response.correctiveAction"
                  rows="3"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  placeholder="Corrective action taken (prints in the report's response block)"
                />
                <div class="grid grid-cols-2 gap-2 mt-1.5">
                  <input
                    v-model="form.response.completedDate"
                    type="date"
                    title="Date completed"
                    class="rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm"
                  >
                  <input
                    v-model="form.response.respondedBy"
                    type="text"
                    placeholder="Responded by (name · company)"
                    class="rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
                  >
                </div>
              </div>
            </div>

            <!-- Report details + CxA verification (Issue report redesign Step 3) -->
            <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div class="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                <div class="text-white/80 text-sm font-medium">
                  Report details
                </div>
                <div>
                  <label class="block text-xs text-white/60 mb-1">Linked equipment (prints in the facts grid)</label>
                  <div
                    v-if="form.equipmentIds.length"
                    class="flex flex-wrap gap-1.5 mb-1.5"
                  >
                    <span
                      v-for="eid in form.equipmentIds"
                      :key="eid"
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/15 text-xs font-mono text-white/90"
                    >
                      {{ equipmentLabel(eid) }}
                      <button
                        type="button"
                        class="text-rose-300/80 hover:text-rose-300"
                        title="Unlink equipment"
                        @click="removeEquipment(eid)"
                      >✕</button>
                    </span>
                  </div>
                  <select
                    class="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white/80 text-sm [&>option]:bg-slate-800 [&>option]:text-white"
                    @change="addEquipment(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
                  >
                    <option value="">
                      Link equipment…
                    </option>
                    <option
                      v-for="eq in equipmentOptions"
                      :key="eq.id"
                      :value="eq.id"
                    >
                      {{ eq.label }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-white/60">Reference (spec section / code)</label>
                  <input
                    v-model="form.reference"
                    type="text"
                    placeholder="Spec 236416 · ASHRAE 15"
                    class="mt-1 w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
                  >
                </div>
                <div>
                  <label class="inline-flex items-center gap-2 text-white/80 text-sm">
                    <input
                      v-model="form.lifeSafety"
                      type="checkbox"
                      class="rounded bg-white/10 border-white/20"
                    >
                    Life-safety issue (red banner on the report)
                  </label>
                  <input
                    v-if="form.lifeSafety"
                    v-model="form.lifeSafetyNote"
                    type="text"
                    placeholder="One line: why this is life safety"
                    class="mt-1.5 w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
                  >
                </div>
              </div>
              <div class="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                <div class="text-white/80 text-sm font-medium">
                  CxA verification <span class="text-white/40 text-xs font-normal">· closing an issue requires an outcome; a closing outcome closes it on Save</span>
                </div>
                <select
                  v-model="form.verification.outcome"
                  class="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white/90 text-sm [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="">
                    No outcome recorded
                  </option>
                  <option value="verified_closed">
                    Verified, issue closed
                  </option>
                  <option value="not_resolved">
                    Not resolved, remains open
                  </option>
                  <option value="accepted_as_is">
                    Accepted by Owner as-is
                  </option>
                </select>
                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model="form.verification.verifiedBy"
                    type="text"
                    placeholder="Verified by"
                    class="rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
                  >
                  <input
                    v-model="form.verification.verifiedDate"
                    type="date"
                    title="Verified date"
                    class="rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm"
                  >
                </div>
                <textarea
                  v-model="form.verification.notes"
                  rows="2"
                  placeholder="Verification notes / back-check"
                  class="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
                />
              </div>
            </div>

            <div class="md:col-span-2 mt-2">
              <!-- Above-row: tip on the left, Suggest tags on the right. -->
              <div class="flex items-center justify-between gap-2 mb-1">
                <div class="text-xs text-white/60">
                  Tip: use commas or Enter to add multiple tags.
                </div>
                <button
                  v-if="canSuggestIssueTags"
                  type="button"
                  class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80 disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="isClosed || suggestingTags"
                  @click="suggestIssueTags"
                >
                  {{ suggestingTags ? 'Suggesting…' : 'Suggest tags' }}
                </button>
              </div>
              <!-- Main entry row: label, input, Add button on one line. -->
              <div class="flex items-center gap-2">
                <label class="text-sm text-white/70 shrink-0">Tags</label>
                <input
                  v-model="labelInput"
                  type="text"
                  placeholder="Add a tag and press Enter…"
                  class="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 disabled:opacity-60"
                  :disabled="isClosed"
                  @keydown.enter.prevent="!isClosed && addLabelFromInput()"
                  @keydown.,.prevent="!isClosed && addLabelFromInput()"
                >
                <button
                  type="button"
                  class="h-10 px-3 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                  :disabled="isClosed"
                  @click="addLabelFromInput()"
                >
                  Add
                </button>
              </div>
              <!-- Applied tag chips below the entry row. -->
              <div
                v-if="form.labels && form.labels.length"
                class="flex flex-wrap gap-2 mt-2"
              >
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
                    :disabled="isClosed"
                    @click="!isClosed && removeLabel(t)"
                  >
                    ×
                  </button>
                </span>
              </div>
              <div
                v-if="suggestedTagsFiltered.length"
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
                      :disabled="isClosed"
                      @click="applyAllSuggestedTags"
                    >
                      Add all
                    </button>
                    <button
                      type="button"
                      class="px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-white/70"
                      @click="dismissSuggestedTags"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    v-for="s in suggestedTagsFiltered"
                    :key="s.tag"
                    type="button"
                    class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/85 hover:bg-white/15"
                    :title="s.reason || ''"
                    :disabled="isClosed"
                    @click="addLabel(s.tag)"
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
                  class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="downloadingReport"
                  :title="downloadingReport ? 'Generating report…' : 'Download PDF report'"
                  @click="downloadIssuePdf"
                >
                  <svg
                    v-if="downloadingReport"
                    class="w-4 h-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="3"
                    />
                    <path
                      class="opacity-90"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
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
                  <span>{{ downloadingReport ? 'Generating…' : 'Download PDF' }}</span>
                </button>
                <div class="relative">
                  <button
                    type="button"
                    class="px-2.5 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/70"
                    title="Choose which sections print in the PDF"
                    @click.stop="showReportSections = !showReportSections"
                  >
                    ▾
                  </button>
                  <div
                    v-if="showReportSections"
                    class="absolute right-0 z-20 mt-1 w-64 rounded-lg bg-slate-900/95 border border-white/15 shadow-xl p-3 space-y-1.5"
                    @click.stop
                  >
                    <div class="text-white/60 text-xs mb-1">
                      Sections in the issue PDF — remembered per project
                    </div>
                    <label
                      v-for="s in ISSUE_REPORT_SECTIONS"
                      :key="s.key"
                      class="flex items-center gap-2 text-white/85 text-sm"
                    >
                      <input
                        v-model="reportSections[s.key]"
                        type="checkbox"
                        class="rounded bg-white/10 border-white/20"
                        @change="persistReportSections"
                      >
                      {{ s.label }}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- OPR Tab -->
          <div
            v-else-if="currentTab === 'OPR'"
            class="space-y-4"
          >
            <div
              id="opr-section"
              class="space-y-3"
            >
              <OprItemPicker
                v-model="form.oprItemIds"
                :project-id="projectId"
                :disabled="isClosed"
                label="OPR items"
                :show-selected="false"
                :show-refresh="projectId && !isNew"
                @refresh="refreshOprVerification"
              />

              <OprLinkVerification
                v-if="projectId && !isNew"
                ref="oprVerificationRef"
                :project-id="projectId"
                :opr-item-ids="(form.oprItemIds || [])"
                context-type="issue"
                :context-id="id"
                :context-label="issueOprLabel"
                target-type="issue"
                :target-id="id"
                :target-label="issueOprLabel"
                :disabled="isClosed"
                :show-header-refresh="false"
                :allow-unlink="!isClosed"
                @unlink="unlinkOprItem"
              />

              <div
                v-else-if="isNew"
                class="mt-2 text-xs text-white/60"
              >
                Save the issue to enable OPR verification.
              </div>
            </div>
          </div>

          <!-- Photos Tab -->
          <div v-else-if="currentTab === 'Photos'">
            <AzurePhotosPanel
              :project-id="azureProjectId"
              entity-type="Issue"
              :entity-id="id"
              :disabled="isClosed"
              :max-count="16"
              :max-bytes="256 * 1024"
              :concurrency="3"
              @update:count="azurePhotosCount = $event"
            />
            <IssuePhotoCaptionsPanel
              v-if="!isNew"
              :project-id="String(form.projectId || '')"
              :issue-id="String(id || '')"
              :photo-meta="form.photoMeta"
              :saving="saving"
              @save="save()"
            />
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
                :on-edit="isClosed ? undefined : onEditComment"
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
            <AzureAttachmentsPanel
              :project-id="azureProjectId"
              entity-type="Issue"
              :entity-id="id"
              :disabled="isClosed"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/*,application/zip"
              @update:count="azureAttachmentsCount = $event"
            />
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
import { onMounted, reactive, computed, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RichTextEditor from '../../components/RichTextEditor.vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ConflictBanner from '../../components/ConflictBanner.vue'
import OprItemPicker from '../../components/OprItemPicker.vue'
import OprLinkVerification from '../../components/OprLinkVerification.vue'
import Comments from '../../components/Comments.vue'
import Modal from '../../components/Modal.vue'
import Spinner from '../../components/Spinner.vue'
import AzureAttachmentsPanel from '../../components/attachments/AzureAttachmentsPanel.vue'
import AzurePhotosPanel from '../../components/photos/AzurePhotosPanel.vue'
import IssuePhotoCaptionsPanel from '../../components/issues/IssuePhotoCaptionsPanel.vue'
import { confirm as inlineConfirm } from '../../utils/confirm'
import lists from '../../lists.js'
import { useIssuesStore } from '../../stores/issues'
import { useIssuesNavStore } from '../../stores/issuesNav'
import { useProjectStore } from '../../stores/project'
import { useSpacesStore } from '../../stores/spaces'
import { useEquipmentStore } from '../../stores/equipment'
import { useUiStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { useAiStore, type SuggestedTag } from '../../stores/ai'
import { generateIssuePdf } from '../../reports/definitions/issue'
import { htmlToText } from '../../reports/core/text'
import http from '../../utils/http'

const route = useRoute()
const router = useRouter()
const issues = useIssuesStore()
// Optimistic-lock conflict: discard local edits and reload the latest record.
function reloadForConflict() { try { window.location.reload() } catch (_) { /* ignore */ } }
const issuesNav = useIssuesNavStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const auth = useAuthStore()
const ai = useAiStore()

const oprVerificationRef = ref<any>(null)

function refreshOprVerification() {
  try {
    if (oprVerificationRef.value && typeof oprVerificationRef.value.refresh === 'function') {
      oprVerificationRef.value.refresh()
      return
    }
  } catch { /* ignore */ }
  try { ui.showWarning('Save the issue to enable OPR verification.') } catch { /* ignore */ }
}

async function unlinkOprItem(oprItemId: string) {
  if (isClosed.value) return
  const id = String(oprItemId || '').trim()
  if (!id) return

  const ok = await inlineConfirm({
    title: 'Unlink OPR item?'
    , message: 'This removes the OPR item from this issue. Remember to save the issue to persist the change.'
    , confirmText: 'Unlink'
    , cancelText: 'Cancel'
    , variant: 'danger'
  })
  if (!ok) return

  const current = Array.isArray(form.oprItemIds) ? form.oprItemIds : []
  const next = current.filter((x: any) => String(x || '').trim() !== id)
  form.oprItemIds = next
  try { ui.showSuccess('OPR item unlinked (pending save)') } catch { /* ignore */ }
}

const azureAttachmentsCount = ref(0)
const azurePhotosCount = ref(0)
const azureProjectId = computed(() => String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim())

function maybeNumber(v: any): number | null {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function initAzureBadgeCountsFromIssue(issue: any) {
  const photos = maybeNumber(issue?.docsPhotosCount)
  const attachments = maybeNumber(issue?.docsAttachmentsCount)
  if (photos !== null) azurePhotosCount.value = photos
  if (attachments !== null) azureAttachmentsCount.value = attachments
}

const id = computed(() => String(route.params.id))
const isNew = computed(() => id.value === 'new')
const saving = ref(false)
const loaded = ref(false)
const notFound = ref(false)

const issueOprLabel = computed(() => {
  const n = (form as any)?.number
  const num = (typeof n === 'number' && Number.isFinite(n) && n > 0) ? `#${n}` : ''
  const title = String((form as any)?.title || '').trim()
  return (num && title) ? `${num} ${title}` : (num || title || `Issue ${id.value}`)
})

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
    'In Progress': 'progress',
    'Progress': 'progress',
    'Pending': 'pending',
    'Started': 'progress',
    'Closed': 'closed',
    'Resolved': 'resolved',
    'Canceled': 'cancelled',
    'Cancelled': 'cancelled',
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
  spaceId: null as string | null,
  system: '',
  recommendation: '',
  resolution: '',
  closedBy: '',
  closedDate: '',
  projectId: '',
  labels: [] as string[],
  oprItemIds: [] as string[],
  comments: [] as any[],
  attachments: [] as any[],
  photos: [] as any[],
  // Issue report redesign Step 2 fields (see backend models/issue.js)
  equipmentIds: [] as string[],
  lifeSafety: false,
  lifeSafetyNote: '',
  reference: '',
  response: { correctiveAction: '', completedDate: '', respondedBy: '' },
  verification: { outcome: '', verifiedBy: '', verifiedDate: '', notes: '' },
  photoMeta: {} as Record<string, any>,
})

// Hydrate the Step 2 fields from a fetched issue. The legacy free-text
// Resolution prefills the contractor response's corrective action when no
// response was recorded yet (the agreed resolution -> response migration).
function issueExtrasFrom(i: any) {
  return {
    equipmentIds: (Array.isArray(i?.equipmentIds) ? i.equipmentIds : [])
      .map((v: any) => String((v && (v._id || v.id)) || v || '')).filter(Boolean),
    lifeSafety: !!i?.lifeSafety,
    lifeSafetyNote: i?.lifeSafetyNote || '',
    reference: i?.reference || '',
    response: {
      correctiveAction: i?.response?.correctiveAction || i?.resolution || '',
      completedDate: i?.response?.completedDate || '',
      respondedBy: i?.response?.respondedBy || '',
    },
    verification: {
      outcome: i?.verification?.outcome || '',
      verifiedBy: i?.verification?.verifiedBy || '',
      verifiedDate: i?.verification?.verifiedDate || '',
      notes: i?.verification?.notes || '',
    },
    photoMeta: (i?.photoMeta && typeof i.photoMeta === 'object') ? i.photoMeta : {},
  }
}

const labelInput = ref('')
const suggestingTags = ref(false)
const suggestedTags = ref<SuggestedTag[]>([])
const projectId = computed(() => String(form.projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || ''))
const canSuggestIssueTags = computed(() => {
  if (!projectId.value) return false
  // If project is loaded and explicitly disabled, hide the feature; otherwise allow trying.
  return projectStore.currentProject?.ai?.enabled !== false
})

// --- Equipment links (Issue report redesign Step 3) ---
const equipmentStore = useEquipmentStore()
watch(projectId, (pid) => {
  if (pid) equipmentStore.fetchByProject(pid).catch(() => { /* picker stays empty */ })
}, { immediate: true })
const equipmentOptions = computed(() => (equipmentStore.items || [])
  .map((e: any) => ({ id: String(e.id || e._id || ''), label: [e.tag, e.title].filter(Boolean).join(' — ') || '(untitled)' }))
  .filter((e: any) => e.id && !form.equipmentIds.includes(e.id))
  .sort((a: any, b: any) => a.label.localeCompare(b.label)))
function equipmentLabel(eid: string): string {
  const e: any = (equipmentStore.byId as any)?.[eid]
  return e ? String(e.tag || e.title || eid) : '…'
}
function addEquipment(eid: string) {
  if (eid && !form.equipmentIds.includes(eid)) form.equipmentIds.push(eid)
}
function removeEquipment(eid: string) {
  form.equipmentIds = form.equipmentIds.filter((v: string) => v !== eid)
}

// --- Location backed by the Spaces module ---
// The visible input is `spaceQuery`; selecting a suggestion links the issue to a
// Space (form.spaceId) and stamps its breadcrumb into form.location. Typing free
// text still works (projects without Spaces): it updates form.location directly
// and detaches any previously linked space.
const spacesStore = useSpacesStore()
const spaceQuery = ref('')
const showSpaceSuggestions = ref(false)
const highlightedSpaceIndex = ref(-1)
let spacesLoadedFor = ''

async function ensureSpaceDataLoaded() {
  const pid = projectId.value
  if (!pid || spacesLoadedFor === pid) return
  spacesLoadedFor = pid
  try { await spacesStore.fetchByProject(pid) } catch (e) { /* best effort; dropdown just stays empty */ }
}

function getSpaceById(id: any) {
  const pid = id ? String(id) : ''
  if (!pid) return null
  const m: any = (spacesStore as any).byId || {}
  return m[pid] || (spacesStore.items || []).find((s: any) => String((s as any).id || (s as any)._id) === pid) || null
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
  } catch (e) { return '' }
}

function simpleFuzzyMatch(text: string, pattern: string) {
  if (!pattern) return true
  let pi = 0
  for (let i = 0; i < text.length && pi < pattern.length; i++) {
    if (text[i] === pattern[pi]) pi++
  }
  return pi === pattern.length
}

const filteredSpaceSuggestions = computed(() => {
  const q = (spaceQuery.value || '').trim().toLowerCase()
  const all = spacesStore.items || []
  if (!q) return all.slice(0, 50)
  const out: any[] = []
  for (const s of all) {
    const tag = String(s.tag || '').toLowerCase()
    const title = String(s.title || '').toLowerCase()
    const chain = String(spaceParentChainLabel(s)).toLowerCase()
    if (tag.includes(q) || title.includes(q) || chain.includes(q) || simpleFuzzyMatch(tag + ' ' + title + ' ' + chain, q)) {
      out.push(s)
    }
    if (out.length >= 200) break
  }
  return out
})

function onSpaceInput() {
  // Free text: keep location in sync and detach any linked space
  form.location = spaceQuery.value
  form.spaceId = null
  highlightedSpaceIndex.value = -1
  showSpaceSuggestions.value = true
  ensureSpaceDataLoaded().catch(() => {})
}

function onSpaceFocus() {
  if (isClosed.value) return
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
    const sid = String((s as any).id || (s as any)._id || '')
    form.spaceId = sid || null
    const canonical = getSpaceById(sid) || s
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

// After an issue loads, resolve the linked space into the visible breadcrumb;
// fall back to the stored free-text location.
async function syncSpaceQueryFromForm() {
  if (form.spaceId) {
    await ensureSpaceDataLoaded()
    const sp = getSpaceById(form.spaceId)
    const chain = sp ? (spaceParentChainLabel(sp) || String(sp.title || sp.tag || '')) : ''
    spaceQuery.value = chain || String(form.location || '')
    if (chain) form.location = chain
  } else {
    spaceQuery.value = String(form.location || '')
  }
}

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

function normalizeOprItemIds(value: any): string[] {
  const arr = Array.isArray(value) ? value : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of arr) {
    const s = String(raw || '').trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

function addLabel(label: string) {
  if (isClosed.value) return
  const tag = String(label || '').trim()
  if (!tag) return
  form.labels = normalizeLabels([...(form.labels || []), tag])
}

function addLabelFromInput() {
  if (isClosed.value) return
  const raw = String(labelInput.value || '')
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return
  form.labels = normalizeLabels([...(form.labels || []), ...parts])
  labelInput.value = ''
}

function removeLabel(label: string) {
  if (isClosed.value) return
  const key = String(label || '').trim().toLowerCase()
  form.labels = (form.labels || []).filter((t: string) => String(t || '').trim().toLowerCase() !== key)
}

const suggestedTagsFiltered = computed(() => {
  const existing = new Set((form.labels || []).map((t: string) => String(t || '').trim().toLowerCase()).filter(Boolean))
  const list = Array.isArray(suggestedTags.value) ? suggestedTags.value : []
  return list
    .filter((s: any) => s && s.tag && !existing.has(String(s.tag).trim().toLowerCase()))
    .slice(0, 12)
})

function dismissSuggestedTags() {
  suggestedTags.value = []
}

function applyAllSuggestedTags() {
  for (const s of suggestedTagsFiltered.value) addLabel(String((s as any).tag || ''))
  dismissSuggestedTags()
}

async function suggestIssueTags() {
  if (isClosed.value) return
  if (!projectId.value) {
    ui.showError('No project selected')
    return
  }
  suggestingTags.value = true
  try {
    const entity = {
      title: String(form.title || '').trim(),
      type: form.type || null,
      status: form.status || null,
      system: String(form.system || '').trim(),
      location: String(form.location || '').trim(),
      description: htmlToText(form.description || ''),
      recommendation: htmlToText(form.recommendation || ''),
      resolution: htmlToText(form.resolution || ''),
    }
    const allowed = Array.isArray(projectStore.currentProject?.tags) ? projectStore.currentProject?.tags : []
    const tags = await ai.suggestTags(projectId.value, 'issue', entity, { existingTags: form.labels || [], allowedTags: allowed as any })
    suggestedTags.value = Array.isArray(tags) ? tags : []
    if (!suggestedTagsFiltered.value.length) ui.showInfo('No new tag suggestions')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to suggest tags')
  } finally {
    suggestingTags.value = false
  }
}

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

function formatDateTime(dt?: string): string {
  try { return dt ? new Date(dt).toLocaleString() : '' } catch (e) { return '' }
}

// Issue PDF: shared definition from the report kit (reports/definitions/issue).
// The button disables + spins while generating so repeated clicks can't queue
// duplicate reports (gathering photos/logs takes a few seconds). The ▾ menu
// picks which sections print, remembered per project.
const ISSUE_REPORT_SECTIONS: Array<{ key: string; label: string }> = [
  { key: 'condition', label: 'Condition observed' },
  { key: 'requiredAction', label: 'Required action' },
  { key: 'oprItems', label: 'Related OPR items' },
  { key: 'photos', label: 'Photos' },
  { key: 'response', label: 'Contractor response' },
  { key: 'verification', label: 'CxA verification' },
  { key: 'history', label: 'History' },
  { key: 'comments', label: 'Comments' },
  { key: 'distribution', label: 'Distribution' },
]
const showReportSections = ref(false)
const reportSections = reactive<Record<string, boolean>>({})
const reportSectionsKey = () => `issueReportSections:${projectId.value || 'global'}`
function loadReportSections() {
  let saved: Record<string, any> = {}
  try { saved = JSON.parse(localStorage.getItem(reportSectionsKey()) || '{}') } catch (e) { saved = {} }
  for (const s of ISSUE_REPORT_SECTIONS) reportSections[s.key] = saved[s.key] !== false
}
function persistReportSections() {
  try { localStorage.setItem(reportSectionsKey(), JSON.stringify({ ...reportSections })) } catch (e) { /* ignore */ }
}
watch(projectId, loadReportSections, { immediate: true })

const downloadingReport = ref(false)
async function downloadIssuePdf() {
  if (downloadingReport.value) return
  downloadingReport.value = true
  showReportSections.value = false
  try {
    await generateIssuePdf({ ...form, id: id.value }, { sections: { ...reportSections } })
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to generate report')
  } finally {
    downloadingReport.value = false
  }
}

onMounted(async () => {
  // Restore the list's filtered ordering for prev/next (survives reload/deep-link).
  issuesNav.hydrate()
  await projectStore.fetchProjects?.()?.catch(() => {})
  const pid = chooseProjectId()
  if (pid) form.projectId = pid
  // Ensure we have a list of issues for navigation
  try { await issues.fetchIssues(pid) } catch (e) { /* ignore issues fetch race */ }
  if (!isNew.value) {
    try {
      const i = await issues.fetchIssue(id.value)
      initAzureBadgeCountsFromIssue(i)
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
        spaceId: (i as any)?.spaceId ? String((i as any).spaceId?._id || (i as any).spaceId) : null,
        system: i?.system || '',
        recommendation: i?.recommendation || '',
        resolution: i?.resolution || '',
        closedBy: i?.closedBy || '',
        closedDate: i?.closedDate || '',
        projectId: i?.projectId ? String(i.projectId) : form.projectId,
        labels: normalizeLabels((i as any)?.labels),
        oprItemIds: normalizeOprItemIds((i as any)?.oprItemIds),
        comments: Array.isArray(i?.comments) ? normalizeComments(i?.comments) : [],
        // Prefer attachments from backend; fall back to legacy documents field if present
        attachments: Array.isArray((i as any)?.attachments) ? (i as any).attachments : (i as any)?.documents || [],
        photos: Array.isArray((i as any)?.photos) ? (i as any).photos : [],
        ...issueExtrasFrom(i),
      })
      void syncSpaceQueryFromForm()
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
      number: null, foundBy: '', dateFound: '', dueDate: '', assignedTo: '', location: '', spaceId: null, system: '', recommendation: '', resolution: '',
      closedBy: '', closedDate: '',
      projectId: chooseProjectId(), labels: [], oprItemIds: [], comments: [], attachments: [], photos: [],
      ...issueExtrasFrom(null),
    })
    spaceQuery.value = ''
    return
  }
  try {
    const i = await issues.fetchIssue(String(nv))
    initAzureBadgeCountsFromIssue(i)
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
      spaceId: (i as any)?.spaceId ? String((i as any).spaceId?._id || (i as any).spaceId) : null,
      system: i?.system || '',
      recommendation: i?.recommendation || '',
      resolution: i?.resolution || '',
      closedBy: i?.closedBy || '',
      closedDate: i?.closedDate || '',
      projectId: i?.projectId ? String(i.projectId) : form.projectId,
      labels: normalizeLabels((i as any)?.labels),
      oprItemIds: normalizeOprItemIds((i as any)?.oprItemIds),
      comments: Array.isArray(i?.comments) ? normalizeComments(i?.comments) : [],
      attachments: Array.isArray((i as any)?.attachments) ? (i as any).attachments : (i as any)?.documents || [],
      photos: Array.isArray((i as any)?.photos) ? (i as any).photos : [],
      ...issueExtrasFrom(i),
    })
    void syncSpaceQueryFromForm()
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
  // Closing requires a recorded CxA verification outcome (backend enforces
  // the same rule); surface it here with a pointer to the Verification card.
  if (String(form.status || '').toLowerCase() === 'closed' && !String(form.verification?.outcome || '').trim()) {
    ui.showError('Record a CxA verification outcome before closing this issue (see the CxA verification card)')
    return
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
    spaceId: form.spaceId || null,
    system: form.system || undefined,
    closedBy: form.closedBy || undefined,
    closedDate: form.closedDate || undefined,
    recommendation: form.recommendation || undefined,
    resolution: form.resolution || undefined,
    labels: normalizeLabels(form.labels),
    oprItemIds: normalizeOprItemIds(form.oprItemIds),
    comments: form.comments,
    documents: form.attachments,
    photos: form.photos,
    // Issue report redesign Step 2 fields
    equipmentIds: Array.isArray(form.equipmentIds) ? form.equipmentIds : [],
    lifeSafety: !!form.lifeSafety,
    lifeSafetyNote: form.lifeSafetyNote || '',
    reference: form.reference || '',
    response: { ...form.response },
    verification: { ...form.verification },
    photoMeta: (form.photoMeta && typeof form.photoMeta === 'object') ? form.photoMeta : {},
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
    spaceId: form.spaceId || null,
    system: form.system || undefined,
    recommendation: form.recommendation || undefined,
    resolution: form.resolution || undefined,
    labels: normalizeLabels(form.labels),
    oprItemIds: normalizeOprItemIds(form.oprItemIds),
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
const tabs = ['Info', 'OPR', 'Photos', 'Comments', 'Attachments', 'Logs']
const currentTab = ref('Info')
const activeIndex = computed(() => {
  const i = tabs.indexOf(currentTab.value)
  return i >= 0 ? i : 0
})
const tabLeft = computed(() => (activeIndex.value * 100) / tabs.length)
const tabWidth = computed(() => 100 / tabs.length)

function applyTabFromRoute() {
  const tab = String(route.query.tab || '').trim()
  if (tab && tabs.includes(tab)) currentTab.value = tab
}

async function maybeFocusOpr() {
  const focus = String(route.query.focus || '').trim()
  if (focus !== 'opr') return
  currentTab.value = 'OPR'
  if (!loaded.value && !isNew.value) return
  await nextTick()
  const el = document.getElementById('opr-section')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  () => route.query.tab,
  () => applyTabFromRoute(),
  { immediate: true }
)

watch(
  () => [route.query.focus, loaded.value, id.value],
  () => { void maybeFocusOpr() },
  { immediate: true }
)

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
// Prefer the filtered + sorted ordering captured on the Issues list (so prev/next obey
// the filters the user set up there). Fall back to the local hardcoded sort when there's
// no list context (e.g. the issue was opened directly without visiting the list).
const fallbackOrderIds = computed(() => sortedIssues.value.map((it: any) => String(it?.id || it?._id || '')).filter(Boolean))
const orderIds = computed(() => {
  const nav = Array.isArray(issuesNav.orderedIds) ? issuesNav.orderedIds : []
  if (nav.length && nav.includes(id.value)) return nav
  return fallbackOrderIds.value
})
const currentIndex = computed(() => orderIds.value.indexOf(id.value))
const prevIssueId = computed(() => {
  if (isNew.value) return ''
  const idx = currentIndex.value
  if (idx > 0) return String(orderIds.value[idx - 1] || '')
  return ''
})
const nextIssueId = computed(() => {
  if (isNew.value) return ''
  const idx = currentIndex.value
  if (idx >= 0 && idx < orderIds.value.length - 1) return String(orderIds.value[idx + 1] || '')
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

async function onEditComment(comment: any, index?: number, nextText?: string) {
  const t = String(nextText ?? comment?.text ?? '').trim()
  if (!t) return
  // Ensure issue exists
  const iid = isNew.value ? await saveAndGetId() : id.value
  const next = [ ...(form.comments || []) ]
  let idx = typeof index === 'number' ? index : next.findIndex((c: any) => c === comment || (c.createdAt === comment?.createdAt && c.text === comment?.text))
  if (idx < 0) idx = next.length - 1
  if (idx < 0) return
  next[idx] = { ...(next[idx] || {}), text: t }
  try {
    const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
    await issues.updateIssue(String(iid), { projectId: pid, comments: commentsForSave(next) })
    form.comments = next
    ui.showSuccess('Comment updated')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to update comment')
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
  const att = (form.attachments || [])[i]
  const label = String(att?.filename || att?.name || att?.url || '').trim() || `Attachment #${i + 1}`
  const ok = await inlineConfirm({
    title: 'Remove attachment',
    message: `Remove "${label}"? This cannot be undone.`,
    confirmText: 'Remove',
    cancelText: 'Cancel',
    variant: 'danger',
  })
  if (!ok) return
  const iid = isNew.value ? id.value : id.value
  if (iid && iid !== 'new') {
    try {
      const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
      await http.delete(`/api/issues/${iid}/attachments/${i}`, { params: { projectId: pid } })
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
async function uploadPhoto(file: File, onProgress: (pct: number) => void) {
  // Ensure we have an issue id to target
  const iid = isNew.value ? await saveAndGetId() : id.value
  const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
  const fd = new FormData()
  // include projectId in case middleware reads body (we also set server-side)
  fd.append('projectId', pid)
  fd.append('photos', file, file.name)
  const res = await http.post(`/api/issues/${iid}/photos`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { projectId: pid },
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
// Counts per tab for badges
function countForTab(t: string): number {
  if (t === 'Photos') return azurePhotosCount.value
  if (t === 'Comments') return (form.comments || []).length
  if (t === 'Attachments') return azureAttachmentsCount.value
  if (t === 'OPR') return (form.oprItemIds || []).length
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
    pending: 'Pending',
    progress: 'In Progress',
    closed: 'Closed',
    resolved: 'Resolved',
    canceled: 'Cancelled',
    cancelled: 'Cancelled',
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
    await http.delete(`/api/issues/${String(iid)}/photos/${idx}`, { params: { projectId: pid } })
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

const statusAutoPersisting = ref(false)
const suppressStatusAutoPersistOnce = ref(false)

function statusKey(v: any): string {
  return String(v || '').trim().toLowerCase()
}

function isDisablingStatusKey(k: string): boolean {
  return k === 'closed' || k === 'cancelled' || k === 'canceled'
}

function ensureClosedMetaForDisabledStatus() {
  const u = auth.user
  const name = `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || (u?.email || '')
  if (!form.closedDate) form.closedDate = isoDate(new Date())
  if (!form.closedBy) form.closedBy = name
}

function statusLabelForToast(k: string): string {
  if (k === 'cancelled' || k === 'canceled') return 'Cancelled'
  if (k === 'closed') return 'Closed'
  return 'Updated'
}

async function persistStatusFromDropdown(nextStatusKey: string, prevStatusKey: string) {
  if (statusAutoPersisting.value) return
  try {
    statusAutoPersisting.value = true

    const nextIsDisabling = isDisablingStatusKey(nextStatusKey)
    if (!nextIsDisabling) return

    // For new issues, ensure we can create; if not, revert
    if (isNew.value) {
      if (!form.title && !form.type) {
        ui.showError('Title is required to save')
        form.status = prevStatusKey || 'open'
        return
      }
      // Best-effort: stamp closed meta so the UI isn't blank when disabled
      ensureClosedMetaForDisabledStatus()
      await saveAndGetId()
      ui.showSuccess(`Status set to ${statusLabelForToast(nextStatusKey)}`)
      return
    }

    if (!loaded.value || notFound.value) {
      ui.showError('Issue not found')
      form.status = prevStatusKey || 'open'
      return
    }

    const pid = isValidProjectId(form.projectId) ? String(form.projectId) : chooseProjectId()
    if (!isValidProjectId(pid)) {
      ui.showError('Select a project')
      form.status = prevStatusKey || 'open'
      return
    }

    // Closing requires a verification outcome (backend enforces it too).
    if (String(nextStatusKey) === 'closed' && !String(form.verification?.outcome || '').trim()) {
      ui.showError('Record a CxA verification outcome before closing (see the CxA verification card on the Info tab)')
      form.status = prevStatusKey || 'open'
      return
    }
    // Build minimal payload: status + closed metadata so disabled views show something.
    const payload: any = {
      projectId: pid,
      status: (toApiStatus(form.status) as any) || undefined,
    }
    if (form.verification?.outcome) payload.verification = { ...form.verification }
    ensureClosedMetaForDisabledStatus()
    payload.closedDate = form.closedDate || undefined
    payload.closedBy = form.closedBy || undefined

    // Reuse the shared update call (subscription guard needs projectId on payload).
    await issues.updateIssue(id.value, payload)
    ui.showSuccess(`Status set to ${statusLabelForToast(nextStatusKey)}`)
  } catch (e: any) {
    form.status = prevStatusKey || 'open'
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to update status')
  } finally {
    statusAutoPersisting.value = false
  }
}

// Persist status transitions into a disabling state (Closed/Cancelled) immediately, because the Save button becomes disabled.
watch(
  () => statusKey(form.status),
  (next, prev) => {
    if (suppressStatusAutoPersistOnce.value) {
      suppressStatusAutoPersistOnce.value = false
      return
    }
    if (statusAutoPersisting.value) return
    // Only act once the issue is loaded (existing issues). For new issues, allow the handler to run.
    if (!loaded.value && !isNew.value) return
    if (next === prev) return
    if (!isDisablingStatusKey(next)) return
    void persistStatusFromDropdown(next, prev)
  }
)

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
    if (next && !String(form.verification?.outcome || '').trim()) {
      ui.showError('Record a CxA verification outcome before closing (see the CxA verification card on the Info tab)')
      form.status = prev ? 'closed' : 'open'
      return
    }
    if (next && form.verification?.outcome) payload.verification = { ...form.verification }
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
    suppressStatusAutoPersistOnce.value = true
    form.status = v ? 'closed' : 'open'
    // Fire and forget persist; UI shows saving state and toasts
    persistClosedStatus(v, prev)
  }
})
</script>

<style scoped>
/* Placeholder color for inputs and textareas to improve contrast */
:deep(input::placeholder),
:deep(textarea::placeholder) {
  /* Tailwind gray-400 */
  color: #9CA3AF;
  opacity: 1; /* ensure full opacity */
}
</style>
