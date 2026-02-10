<template>
  <div class="space-y-4">
    <!-- Header: create, filters and progress -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="h-10 w-10 grid place-items-center rounded-full bg-white/20 border border-white/30 hover:bg-white/30 text-white/90"
          title="New checklist"
          aria-label="New checklist"
          @click="openNew"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-5 h-5"
          ><path
            d="M12 5v14M5 12h14"
            stroke-width="1.8"
            stroke-linecap="round"
          /></svg>
        </button>
        <input
          v-model="search"
          type="text"
          placeholder="Search questions…"
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 w-56"
        >
        <select
          v-model="filterType"
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20"
        >
          <option value="">
            All Types
          </option>
          <option
            v-for="t in typeOptions"
            :key="t"
            :value="t"
          >
            {{ t }}
          </option>
        </select>
        <select
          v-model="filterSystem"
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20"
        >
          <option value="">
            All Systems
          </option>
          <option
            v-for="s in systemOptions"
            :key="s"
            :value="s"
          >
            {{ s }}
          </option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-sm text-white/70">
          {{ totalAnswered }} / {{ totalQuestions }} answered
        </div>
        <div class="w-40 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            class="h-full bg-emerald-400/80"
            :style="{ width: progressPct + '%' }"
          />
        </div>
        <button
          class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
          @click="expandAll"
        >
          Expand All
        </button>
        <button
          class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
          @click="collapseAll"
        >
          Collapse All
        </button>
      </div>
    </div>

    <!-- Empty state: no checklists yet -->
    <div
      v-if="!local.length"
      class="rounded-2xl p-6 bg-white/5 border border-white/10 text-center"
    >
      <div class="text-white/80 font-medium">
        No checklists yet
      </div>
      <div class="text-white/60 text-sm mt-1">
        Create the first checklist for this equipment.
      </div>
      <div class="mt-3">
        <button
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2"
          @click="openNew"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-4 h-4"
          ><path
            d="M12 5v14M5 12h14"
            stroke-width="1.8"
            stroke-linecap="round"
          /></svg>
          <span>New Checklist</span>
        </button>
      </div>
    </div>

    <!-- Empty filter result -->
    <div
      v-else-if="filteredSections.length === 0"
      class="rounded-2xl p-6 bg-white/5 border border-white/10 text-center"
    >
      <div class="text-white/80 font-medium">
        No matching checklists
      </div>
      <div class="text-white/60 text-sm mt-1">
        Try clearing filters or adjusting your search.
      </div>
      <div class="mt-3 flex items-center justify-center gap-2">
        <button
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
          @click="clearFilters"
        >
          Clear filters
        </button>
        <button
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
          @click="openNew"
        >
          New Checklist
        </button>
      </div>
    </div>

    <!-- Sections as accordions (drag to reorder when no filters/search) -->
    <div
      v-for="(sec, si) in filteredSections"
      :key="sec.number || si"
      class="rounded-md border border-white/10 bg-white/5"
      :class="isOpen(secKey(sec, si)) ? 'border-emerald-400/60 bg-emerald-500/10 shadow-md shadow-emerald-900/20 relative overflow-hidden' : ''"
      :draggable="sectionDragEnabled"
      @dragstart="onSecDragStart(sec, $event)"
      @dragover.prevent="onSecDragOver(sec, $event)"
      @drop.prevent="onSecDrop(sec, $event)"
    >
      <div
        v-if="isOpen(secKey(sec, si))"
        class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/80 rounded-l-md"
      />
      <button
        class="w-full text-left px-3 py-2 flex items-center justify-between rounded-t-md"
        :class="isOpen(secKey(sec, si)) ? 'bg-emerald-500/20 hover:bg-emerald-500/25' : 'bg-white/5 hover:bg-white/10'"
        @click="toggleSection(secKey(sec, si))"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/20">#{{ sec.number ?? (si+1) }}</span>
          <span
            class="truncate"
            :class="isOpen(secKey(sec, si)) ? 'text-white font-medium' : ''"
          >{{ sec.title || 'Section' }}</span>
          <span class="text-xs text-white/60 truncate">· {{ (sec.type || 'type') }} · {{ (sec.system || 'system') }}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-white/70">{{ counted(si).answered }} / {{ counted(si).total }}</span>
          <span
            :class="sectionBadgeClass(si)"
            class="text-[10px] px-1.5 py-0.5 rounded border"
          >{{ sectionStatusText(si) }}</span>
          <!-- Actions: reorder, edit, delete -->
          <button
            v-if="!sectionDragEnabled"
            :disabled="si===0"
            class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-40"
            title="Move up"
            aria-label="Move up"
            @click.stop="moveSection(si, -1)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4"
            ><path
              d="M12 5l-6 6h12l-6-6z"
              stroke-width="1.5"
            /></svg>
          </button>
          <button
            v-if="!sectionDragEnabled"
            :disabled="si===local.length-1"
            class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-40"
            title="Move down"
            aria-label="Move down"
            @click.stop="moveSection(si, 1)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4"
            ><path
              d="M12 19l6-6H6l6 6z"
              stroke-width="1.5"
            /></svg>
          </button>
          <!-- Drag handle hint -->
          <span
            v-if="sectionDragEnabled"
            class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 text-white/70 cursor-grab active:cursor-grabbing select-none drag-handle"
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="w-4 h-4 opacity-80"
            ><path d="M9 6.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM9 12a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 9 12Zm8 0a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 17 12ZM9 17.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" /></svg>
          </span>
          <button
            class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
            title="Edit"
            aria-label="Edit"
            @click.stop="startEdit(si)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4"
            ><path
              d="M12 20h9"
              stroke-width="1.5"
              stroke-linecap="round"
            /><path
              d="M16.5 3.5l4 4-10 10H6.5v-4.5l10-10z"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
          </button>
          <button
            class="h-7 w-7 grid place-items-center rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30"
            title="Delete"
            aria-label="Delete"
            @click.stop="deleteSection(si)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4"
            ><path
              d="M3 6h18"
              stroke-width="1.5"
              stroke-linecap="round"
            /><path
              d="M8 6l1-2h6l1 2"
              stroke-width="1.5"
              stroke-linecap="round"
            /><rect
              x="6"
              y="6"
              width="12"
              height="14"
              rx="1.5"
              stroke-width="1.5"
            /><path
              d="M10 10v6M14 10v6"
              stroke-width="1.5"
              stroke-linecap="round"
            /></svg>
          </button>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-4 h-4"
          ><path
            d="M6 9l6 6 6-6"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          /></svg>
        </div>
      </button>
      <div
        v-show="isOpen(secKey(sec, si))"
        class="px-3 py-2 space-y-3"
      >
        <!-- Section notes and actions -->
        <div class="flex items-center justify-between gap-3">
          <input
            v-model="local[si].notes"
            type="text"
            placeholder="Section notes…"
            class="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
            @change="notifyChange"
          >
          <div class="flex items-center gap-2">
            <button
              class="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35 text-sm"
              @click="bulkSet(si, 'yes')"
            >
              All Yes
            </button>
            <button
              class="px-2 py-1 rounded-md bg-red-500/20 border border-red-400/60 text-red-100 hover:bg-red-500/35 text-sm"
              @click="bulkSet(si, 'no')"
            >
              All No
            </button>
            <button
              class="px-2 py-1 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35 text-sm"
              @click="bulkSet(si, 'na')"
            >
              All N/A
            </button>
            <label class="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                v-model="local[si].is_complete"
                type="checkbox"
                @change="onSectionCompleteToggle(si)"
              >
              <span>Mark complete</span>
            </label>
          </div>
        </div>
        <!-- Questions list -->
        <ul class="space-y-2">
          <li
            v-for="(q, qi) in local[si].questions"
            :key="q.number || qi"
            class="p-2 rounded-md bg-white/5 border border-white/10"
            draggable="true"
            @dragstart="onQDragStart(si, q, $event)"
            @dragover.prevent="onQDragOver(si, qi, $event)"
            @drop.prevent="onQDrop(si, qi, $event)"
          >
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div class="flex items-start gap-2 min-w-0">
                <span class="text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/20 shrink-0">#{{ q.number ?? (qi+1) }}</span>
                <span class="truncate">{{ q.question_text }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <!-- Issues count badge as red triangle -->
                <span
                  v-if="issuesCount(si, qi) > 0"
                  :title="issuesCount(si, qi) + ' issue' + (issuesCount(si, qi) > 1 ? 's' : '')"
                  class="relative inline-flex items-center justify-center h-6 w-6 shrink-0 select-none"
                >
                  <svg
                    viewBox="0 0 20 18"
                    class="h-5 w-5 text-red-400/90"
                  >
                    <path
                      d="M10 0L20 18H0L10 0Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span class="absolute text-[11px] leading-none font-semibold text-white">{{ issuesCount(si, qi) }}</span>
                </span>
                <span
                  v-if="oprItemCount(local[si].questions[qi]) > 0"
                  class="text-[10px] px-1.5 py-0.5 rounded border bg-white/10 border-white/20 text-white/80"
                  :title="oprItemCount(local[si].questions[qi]) + ' OPR item' + (oprItemCount(local[si].questions[qi]) > 1 ? 's' : '') + ' linked'"
                >
                  OPR: {{ oprItemCount(local[si].questions[qi]) }}
                </span>
                <button
                  class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  title="Show details"
                  :aria-expanded="isQOpen(si, qi) ? 'true' : 'false'"
                  aria-label="Toggle details"
                  @click="toggleQ(si, qi)"
                >
                  <svg
                    v-if="!isQOpen(si, qi)"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  ><path
                    d="M6 9l6 6 6-6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  ><path
                    d="M18 15l-6-6-6 6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                </button>
                <span
                  class="hidden md:inline-flex h-7 w-7 mr-1 items-center justify-center rounded-md bg-white/10 border border-white/20 text-white/70 cursor-grab active:cursor-grabbing select-none"
                  title="Drag to reorder"
                  aria-label="Drag question"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="w-4 h-4 opacity-80"
                  ><path d="M9 6.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0ZM9 12a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 9 12Zm8 0a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 17 12ZM9 17.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" /></svg>
                </span>
                <button
                  :class="answerBtnClass(q.answer === 'yes','emerald')"
                  title="Yes"
                  @click="setAnswer(si, qi, 'yes')"
                >
                  Y
                </button>
                <button
                  :class="answerBtnClass(q.answer === 'no','red')"
                  title="No"
                  @click="setAnswer(si, qi, 'no')"
                >
                  N
                </button>
                <button
                  :class="answerBtnClass(q.answer === 'na','indigo')"
                  title="N/A"
                  @click="setAnswer(si, qi, 'na')"
                >
                  N/A
                </button>
              </div>
            </div>
            <div
              v-if="isQOpen(si, qi)"
              class="mt-2 space-y-2"
            >
              <!-- Row 1: Notes, Answered by, Answered date -->
              <div class="flex flex-col md:flex-row md:items-center gap-2">
                <textarea
                  v-model="local[si].questions[qi].notes"
                  rows="1"
                  placeholder="Notes…"
                  class="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 resize-y"
                  @change="notifyChange"
                />
                <div class="text-sm text-white/80 flex items-center gap-2 shrink-0">
                  <span class="px-2 py-1 rounded-md bg-white/10 border border-white/20">Answered by:</span>
                  <span class="truncate max-w-[12rem]">{{ local[si].questions[qi].answered_by || '—' }}</span>
                </div>
                <div class="text-sm text-white/70 flex items-center justify-start shrink-0">
                  <span class="truncate max-w-[12rem]">{{ formatDateTime(local[si].questions[qi].answered_at) || '—' }}</span>
                </div>
              </div>
              <!-- Row 2: CxA response, CxA responded by, CxA response date -->
              <div class="flex flex-col md:flex-row md:items-center gap-2">
                <textarea
                  v-model="local[si].questions[qi].cx_answer"
                  rows="1"
                  placeholder="CxA response…"
                  class="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 resize-y"
                  @change="onCxAnswerChange(si, qi)"
                />
                <div class="text-sm text-white/80 flex items-center gap-2 shrink-0">
                  <span class="px-2 py-1 rounded-md bg-white/10 border border-white/20">CxA responded by:</span>
                  <span class="truncate max-w-[12rem]">{{ local[si].questions[qi].cx_answered_by || '—' }}</span>
                </div>
                <div class="text-sm text-white/70 flex items-center justify-start shrink-0">
                  <span class="truncate max-w-[12rem]">{{ formatDateTime(local[si].questions[qi].cx_answered_at) || '—' }}</span>
                </div>
              </div>

              <div class="pt-1">
                <OprItemPicker
                  v-model="(local[si].questions[qi] as any).oprItemIds"
                  :project-id="String(props.projectId || '')"
                  :disabled="!props.projectId"
                  label="OPR items"
                  @update:model-value="notifyChange"
                />
              </div>
              <!-- Actions: Attach issue -->
              <div class="pt-1">
                <button
                  class="px-2 py-1 rounded-md bg-amber-500/20 border border-amber-400/60 text-amber-100 hover:bg-amber-500/30 text-sm inline-flex items-center gap-2"
                  @click="openAttachIssue(si, qi)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  ><path
                    d="M12 5v14M5 12h14"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  /></svg>
                  <span>Attach issue</span>
                </button>
              </div>
              <!-- Attached issues for this question -->
              <div v-if="(local[si].issues || []).some((it:any) => it && it.questionIndex === qi)">
                <div class="text-sm text-white/70">
                  Attached issues:
                </div>
                <ul class="mt-1 flex flex-wrap gap-2">
                  <li
                    v-for="(it, k) in (local[si].issues || []).filter((it:any) => it && it.questionIndex === qi)"
                    :key="k"
                    class="text-xs px-2 py-1 rounded bg-white/10 border border-white/20"
                  >
                    <router-link
                      :to="{ name: 'issue-edit', params: { id: it.id } }"
                      class="hover:underline"
                    >
                      #{{ it.number || '—' }} {{ it.title || 'Issue' }}
                    </router-link>
                  </li>
                </ul>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <!-- New Checklist Modal -->
  <Modal v-model="newOpen">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="font-medium">
          New Checklist
        </div>
        <div class="text-white/70 text-sm">
          Fill in details and add questions
        </div>
      </div>
    </template>
    <div class="space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm text-white/70">Number</label>
          <input
            :value="nextNumber"
            type="text"
            disabled
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
        </div>
        <div>
          <label class="block text-sm text-white/70">Title</label>
          <input
            v-model="draft.title"
            type="text"
            placeholder="Section title"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300 placeholder-gray-400"
          >
        </div>
        <div>
          <label class="block text-sm text-white/70">Type</label>
          <select
            v-model="draft.type"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
            <option
              v-for="opt in checklistTypeOptions"
              :key="String(opt.value ?? opt.text)"
              :value="opt.value ?? ''"
              class="bg-slate-950 text-gray-300"
            >
              {{ opt.text }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-white/70">System</label>
          <select
            v-model="draft.system"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
            <option
              v-for="opt in systemSelectOptions"
              :key="String(opt.value ?? opt.text)"
              :value="opt.value ?? ''"
              class="bg-slate-950 text-gray-300"
            >
              {{ opt.text }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-white/70">Status</label>
          <select
            v-model="draft.status"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
            <option
              value="not started"
              class="bg-slate-950 text-gray-300"
            >
              not started
            </option>
            <option
              value="in progress"
              class="bg-slate-950 text-gray-300"
            >
              in progress
            </option>
            <option
              value="complete"
              class="bg-slate-950 text-gray-300"
            >
              complete
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-white/70">Responsible</label>
          <select
            v-model="draft.responsible"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
            <option
              v-for="opt in roleOptions"
              :key="String(opt.value ?? opt.text)"
              :value="opt.value ?? ''"
              class="bg-slate-950 text-gray-300"
            >
              {{ opt.text }}
            </option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-sm text-white/70">Notes</label>
        <input
          v-model="draft.notes"
          type="text"
          placeholder="Optional notes"
          class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300 placeholder-gray-400"
        >
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm text-white/70">Questions</label>
          <button
            class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-gray-300"
            @click="addDraftQuestion"
          >
            Add Question
          </button>
        </div>
        <div
          v-if="!draft.questions.length"
          class="text-white/60 text-sm"
        >
          No questions added yet.
        </div>
        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="(q, i) in draft.questions"
            :key="i"
            class="p-2 rounded-md bg-white/5 border border-white/10 flex items-center gap-2"
          >
            <span class="text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/20">#{{ i+1 }}</span>
            <input
              v-model="q.question_text"
              type="text"
              placeholder="Question text"
              class="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300 placeholder-gray-400"
            >
            <button
              class="h-8 w-8 grid place-items-center rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30"
              title="Remove question"
              aria-label="Remove question"
              @click="removeDraftQuestion(i)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              ><path
                d="M3 6h18"
                stroke-width="1.5"
                stroke-linecap="round"
              /><path
                d="M8 6l1-2h6l1 2"
                stroke-width="1.5"
                stroke-linecap="round"
              /><rect
                x="6"
                y="6"
                width="12"
                height="14"
                rx="1.5"
                stroke-width="1.5"
              /><path
                d="M10 10v6M14 10v6"
                stroke-width="1.5"
                stroke-linecap="round"
              /></svg>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30"
          @click="cancelNew"
        >
          Cancel
        </button>
        <button
          :disabled="!canSave"
          class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35"
          :class="!canSave ? 'opacity-60 cursor-not-allowed' : ''"
          @click="saveNew"
        >
          Create
        </button>
      </div>
    </template>
  </Modal>
  
  <!-- Attach Issue Modal -->
  <Modal v-model="issueOpen">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="font-medium">
          Attach Issue
        </div>
        <div class="text-white/70 text-sm">
          Create an issue linked to this checklist
        </div>
      </div>
    </template>
    <template #default>
      <IssueForm
        v-model="issueDraft"
        :errors="issueErrors"
      />
    </template>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30"
          @click="cancelAttachIssue"
        >
          Cancel
        </button>
        <button
          class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35"
          @click="saveAttachIssue"
        >
          Create
        </button>
      </div>
    </template>
  </Modal>
  <!-- Edit Checklist Modal -->
  <Modal v-model="editOpen">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="font-medium">
          Edit Checklist
        </div>
        <div class="text-white/70 text-sm">
          Update details and questions
        </div>
      </div>
    </template>
    <div class="space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm text-white/70">Number</label>
          <input
            v-model="editDraft.number"
            type="number"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 text-gray-300"
          >
        </div>
        <div>
          <label class="block text-sm text-white/70">Title</label>
          <input
            v-model="editDraft.title"
            type="text"
            placeholder="Section title"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 text-gray-300"
          >
        </div>
        <div>
          <label class="block text-sm text-white/70">Type</label>
          <select
            v-model="editDraft.type"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
            <option
              v-for="opt in checklistTypeOptions"
              :key="String(opt.value ?? opt.text)"
              :value="opt.value ?? ''"
              class="bg-slate-950 text-gray-300"
            >
              {{ opt.text }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-white/70">System</label>
          <select
            v-model="editDraft.system"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
            <option
              v-for="opt in systemSelectOptions"
              :key="String(opt.value ?? opt.text)"
              :value="opt.value ?? ''"
              class="bg-slate-950 text-gray-300"
            >
              {{ opt.text }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-white/70">Status</label>
          <select
            v-model="editDraft.status"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
            <option
              value="not started"
              class="bg-slate-900 text-gray-300"
            >
              not started
            </option>
            <option
              value="in progress"
              class="bg-slate-900 text-gray-300"
            >
              in progress
            </option>
            <option
              value="complete"
              class="bg-slate-900 text-gray-300"
            >
              complete
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-white/70">Responsible</label>
          <select
            v-model="editDraft.responsible"
            class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-gray-300"
          >
            <option
              v-for="opt in roleOptions"
              :key="String(opt.value ?? opt.text)"
              :value="opt.value ?? ''"
              class="bg-slate-950 text-gray-300"
            >
              {{ opt.text }}
            </option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-sm text-white/70">Notes</label>
        <input
          v-model="editDraft.notes"
          type="text"
          placeholder="Optional notes"
          class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 text-gray-300"
        >
      </div>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm text-white/70">Questions</label>
          <button
            class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-gray-300"
            @click="addEditQuestion"
          >
            Add Question
          </button>
        </div>
        <div
          v-if="!editDraft.questions.length"
          class="text-white/60 text-sm"
        >
          No questions yet.
        </div>
        <ul
          v-else
          class="space-y-2"
        >
          <li
            v-for="(q, i) in editDraft.questions"
            :key="i"
            class="p-2 rounded-md bg-white/5 border border-white/10 flex items-center gap-2"
          >
            <input
              v-model="q.number"
              type="number"
              class="w-20 px-2 py-1 rounded-md bg-white/10 border border-white/20 text-gray-300"
            >
            <input
              v-model="q.question_text"
              type="text"
              placeholder="Question text"
              class="flex-1 min-w-0 px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 text-gray-300"
            >
            <button
              class="h-8 w-8 grid place-items-center rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30"
              title="Remove question"
              aria-label="Remove question"
              @click="removeEditQuestion(i)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              ><path
                d="M3 6h18"
                stroke-width="1.5"
                stroke-linecap="round"
              /><path
                d="M8 6l1-2h6l1 2"
                stroke-width="1.5"
                stroke-linecap="round"
              /><rect
                x="6"
                y="6"
                width="12"
                height="14"
                rx="1.5"
                stroke-width="1.5"
              /><path
                d="M10 10v6M14 10v6"
                stroke-width="1.5"
                stroke-linecap="round"
              /></svg>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30"
          @click="cancelEdit"
        >
          Cancel
        </button>
        <button
          :disabled="!canSaveEdit"
          class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35"
          :class="!canSaveEdit ? 'opacity-60 cursor-not-allowed' : ''"
          @click="saveEditSection"
        >
          Save
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
	import { computed, reactive, watch, ref, onMounted } from 'vue'
	import Modal from './Modal.vue'
	import IssueForm from './IssueForm.vue'
  import OprItemPicker from './OprItemPicker.vue'
	import { confirm as inlineConfirm } from '../utils/confirm'
	import lists from '../lists'
	import { useAuthStore } from '../stores/auth'
	import { useProjectStore } from '../stores/project'
	import { useIssuesStore } from '../stores/issues'
	import { useRouter } from 'vue-router'

	type SelectOption = { value: any; text: string }
	const roleOptions = ((lists as any)?.roleOptions as SelectOption[]) || []
	const checklistTypeOptions = ((lists as any)?.checklistTypes as SelectOption[]) || []
	const systemSelectOptions = ((lists as any)?.systemOptions as SelectOption[]) || []

export interface ChecklistQuestion {
  number?: number
  question_text: string
  answer?: 'yes' | 'no' | 'na' | null | string
  oprItemIds?: string[]
  cx_answer?: string | null
  cx_answered_by?: string | null
  cx_answered_at?: string | null
  status?: string | null
  answered_by?: string | null
  answered_at?: string | null
  is_complete?: boolean | null
  notes?: string | null
}
export interface ChecklistSection {
  number?: number
  title?: string
  type?: string
  system?: string
  status?: string
  is_complete?: boolean
  responsible?: string | null
  notes?: string | null
  questions: ChecklistQuestion[]
  documents?: any[]
  photos?: any[]
  issues?: any[]
  settings?: any[]
  meta?: any[]
}

const props = defineProps<{
  modelValue: ChecklistSection[] | null | undefined
  projectId?: string | null
  equipmentId?: string | null
  equipmentTag?: string | null
  equipmentSpace?: string | null
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: ChecklistSection[]): void
  (e: 'change', v: ChecklistSection[]): void
  (e: 'persist', v: ChecklistSection[]): void
}>()

const local = reactive<ChecklistSection[]>(normalize(props.modelValue))
watch(() => props.modelValue, (v) => {
  const next = normalize(v)
  // Replace contents to keep reactivity
  local.splice(0, local.length, ...next)
})
function normalize(v: any): ChecklistSection[] {
  const arr = Array.isArray(v) ? v : []
  return arr.map((s: any) => ({
    number: s?.number ?? null,
    title: s?.title ?? '',
    type: s?.type ?? '',
	    system: s?.system ?? '',
	    status: s?.status ?? 'not started',
	    is_complete: !!s?.is_complete,
	    responsible: s?.responsible ?? '',
	    notes: s?.notes ?? '',
	    questions: Array.isArray(s?.questions) ? s.questions.map((q: any) => ({
	      number: q?.number ?? null,
	      question_text: String(q?.question_text || ''),
      answer: q?.answer ?? null,
	      oprItemIds: Array.isArray(q?.oprItemIds) ? q.oprItemIds.map((id: any) => String(id || '').trim()).filter(Boolean) : [],
      cx_answer: q?.cx_answer ?? null,
      cx_answered_by: q?.cx_answered_by ?? null,
      cx_answered_at: q?.cx_answered_at ?? null,
      status: q?.status ?? null,
      answered_by: q?.answered_by ?? null,
      answered_at: q?.answered_at ?? null,
      is_complete: q?.is_complete ?? null,
      notes: q?.notes ?? null,
    })) : [],
    documents: s?.documents || [],
    photos: s?.photos || [],
    issues: s?.issues || [],
    settings: s?.settings || [],
    meta: s?.meta || [],
  }))
}

// Filters and search (persist per equipment in sessionStorage)
const search = ref('')
const filterType = ref('')
const filterSystem = ref('')
const FILTER_STATE_KEY = computed(() => `checklistsFilters:${String(props.equipmentId || props.equipmentTag || 'unknown')}`)
function loadFilterState() {
  try {
    const raw = sessionStorage.getItem(FILTER_STATE_KEY.value)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      search.value = String(parsed.search || '')
      filterType.value = String(parsed.filterType || '')
      filterSystem.value = String(parsed.filterSystem || '')
    }
  } catch (_) { /* ignore */ }
}
function saveFilterState() {
  try {
    const payload = { search: search.value, filterType: filterType.value, filterSystem: filterSystem.value }
    sessionStorage.setItem(FILTER_STATE_KEY.value, JSON.stringify(payload))
  } catch (_) { /* ignore */ }
}
onMounted(loadFilterState)
watch([search, filterType, filterSystem], saveFilterState, { deep: false })
const typeOptions = computed(() => Array.from(new Set(local.map(s => (s.type || '').trim()).filter(Boolean))))
const systemOptions = computed(() => Array.from(new Set(local.map(s => (s.system || '').trim()).filter(Boolean))))

const filteredSections = computed(() => {
  const q = (search.value || '').toLowerCase()
  return local.filter(sec => {
    if (filterType.value && (sec.type || '') !== filterType.value) return false
    if (filterSystem.value && (sec.system || '') !== filterSystem.value) return false
    if (!q) return true
    const inTitle = (sec.title || '').toLowerCase().includes(q)
    const inAnyQ = (sec.questions || []).some(qq => (qq.question_text || '').toLowerCase().includes(q))
    return inTitle || inAnyQ
  })
})

function clearFilters() {
  search.value = ''
  filterType.value = ''
  filterSystem.value = ''
}

// Enable section drag only when not filtered/searched (to avoid index mismatch)
const sectionDragEnabled = computed(() => !search.value && !filterType.value && !filterSystem.value)

// Current user (for stamping answered_by)
const auth = useAuthStore()
const currentUserName = computed(() => {
  const u: any = auth?.user || null
  if (!u) return ''
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ')
  return name || u.email || ''
})

// Issues integration: quick attach an Issue from a checklist context
const issuesStore = useIssuesStore()
// _router is intentionally kept for potential navigation usages from checklist actions;
// it's currently unused in some codepaths — silence the unused-vars warning explicitly.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _router = useRouter()
const issueOpen = ref(false)
const issueCtx = ref<{ si: number; qi: number | null } | null>(null)
const issueErrors = reactive<Record<string, string>>({})
const issueDraft = ref<{
  number: number | null
  status: string
  priority: string
  title: string
  type: string | null
  foundBy: string
  dateFound: string
  assignedTo: string
  dueDate: string
  location: string
  system: string
  description: string
}>({
  number: null,
  status: 'open',
  priority: 'medium',
  title: '',
  type: 'checklist',
  foundBy: '',
  dateFound: '',
  assignedTo: '',
  dueDate: '',
  location: '',
  system: '',
  description: ''
})

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

function normalizeId(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined
    return trimmed
  }
  if (value == null) return undefined
  const str = String(value).trim()
  return (!str || str === 'undefined' || str === 'null') ? undefined : str
}
function normalizeText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || undefined
  }
  if (value == null) return undefined
  const str = String(value).trim()
  return str || undefined
}

function openAttachIssue(si: number, qi: number | null = null) {
  issueCtx.value = { si, qi }
  Object.keys(issueErrors).forEach(k => delete issueErrors[k])
  const sec = local[si]
  const q = qi != null ? sec?.questions?.[qi] : null
  const eq = (props.equipmentTag || props.equipmentId || 'Equipment') as any
  const secLabel = `Sec ${sec?.number ?? (si+1)}${sec?.title ? ' – ' + sec.title : ''}`
  const qLabel = q ? ` • Q${q.number ?? (qi!+1)}${q.question_text ? ' – ' + q.question_text : ''}` : ''
  issueDraft.value.title = `Checklist: ${eq} • ${secLabel}${qLabel}`.slice(0, 120)
  const lines: string[] = []
  lines.push(`Equipment: ${eq}`)
  lines.push(`Section: ${secLabel}`)
  if (q) lines.push(`Question: ${q.question_text || ''}`)
  if (q && q.answer) lines.push(`Answer: ${String(q.answer).toUpperCase()}`)
  if (q && q.notes) lines.push(`Notes: ${q.notes}`)
  issueDraft.value.description = lines.join('\n')
  issueDraft.value.type = 'checklist'
  issueDraft.value.status = 'open'
  issueDraft.value.priority = 'medium'
  // `Issue.location` should represent physical location/space; store equipment tag in `Issue.tag`.
  issueDraft.value.location = normalizeText(props.equipmentSpace) || ''
  issueDraft.value.system = (sec?.system as any) ? String(sec.system) : ''
  issueDraft.value.foundBy = ''
  issueDraft.value.dateFound = ''
  issueDraft.value.dueDate = ''
  issueDraft.value.assignedTo = ''
  issueOpen.value = true
}
function cancelAttachIssue() { issueOpen.value = false; issueCtx.value = null }
async function saveAttachIssue() {
  try {
    const ctx = issueCtx.value
    if (!ctx) return
    const si = ctx.si
    const qi = ctx.qi
    const sec = local[si]
    const ps = useProjectStore()
    const pid = normalizeId(props.projectId) || normalizeId(ps.currentProjectId) || ''
    if (!pid) return
    const draft = issueDraft.value || ({} as any)
    const payload: any = {
      projectId: pid,
      title: (draft.title || '').trim() || 'Checklist Issue',
      description: (draft.description || '').trim() || 'Created from checklist',
      type: draft.type || 'checklist',
      severity: toApiPriority(draft.priority),
      status: toApiStatus(draft.status),
      system: normalizeText(draft.system) || (sec?.system as any) || undefined,
      tag: normalizeText(props.equipmentTag) || undefined,
      location: normalizeText(draft.location) || normalizeText(props.equipmentSpace) || undefined,
      assetId: normalizeId(props.equipmentId),
      assignedTo: normalizeText(draft.assignedTo),
      foundBy: normalizeText(draft.foundBy),
      dateFound: normalizeText(draft.dateFound),
      dueDate: normalizeText(draft.dueDate),
    }
    const created = await issuesStore.createIssue(payload)
    if (!Array.isArray(sec.issues)) (sec as any).issues = []
    ;(sec.issues as any).push({ id: (created as any).id || (created as any)._id, number: (created as any).number, title: (created as any).title, type: (created as any).type, questionIndex: qi })
    notifyChange()
    logEvent(si, 'checklist_issue_created', { issueId: (created as any).id || (created as any)._id, issueNumber: (created as any).number, questionIndex: qi })
    issueOpen.value = false
    issueCtx.value = null
  } catch (err) {
    console.error('create issue from checklist failed', err)
  }
}

// Project-level logging helper
type LogPayload = Record<string, any>
function logEvent(si: number, type: string, data: LogPayload = {}) {
  const sec = local?.[si]
  if (!sec) return
  // Mirror to project-level logs so deletions and cross-entity events are preserved
  try {
    const ps = useProjectStore()
    const pid = (props.projectId || ps.currentProjectId) as any
    if (pid) {
      const payload = {
        ts: new Date().toISOString(),
        by: currentUserName.value || null,
        type,
        module: 'checklists',
        scope: {
          entity: 'equipment',
          equipmentId: props.equipmentId || null,
          equipmentTag: props.equipmentTag || null,
          projectId: pid,
        },
        section: {
          number: sec.number ?? (si + 1),
          title: sec.title || '',
          type: sec.type || '',
          system: sec.system || '',
        },
        ...data,
      }
      ps.appendProjectLog(String(pid), payload).catch(() => {})
    }
  } catch (e) { /* ignore normalization errors */ }
}

// Expand/collapse state (persisted per equipment in sessionStorage)
const open = ref<Record<string, boolean>>({})
const OPEN_STATE_KEY = computed(() => `checklistsOpen:${String(props.equipmentId || props.equipmentTag || 'unknown')}`)
function loadOpenState() {
  try {
    const raw = sessionStorage.getItem(OPEN_STATE_KEY.value)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') open.value = parsed
  } catch (_) { /* ignore */ }
}
function saveOpenState() {
  try { sessionStorage.setItem(OPEN_STATE_KEY.value, JSON.stringify(open.value)) } catch (_) { /* ignore */ }
}
onMounted(loadOpenState)
watch(open, saveOpenState, { deep: true })
function secKey(sec: ChecklistSection, idx: number) { return `${sec.number ?? idx}` }
function isOpen(k: string) { return !!open.value[k] }
function toggleSection(k: string) { open.value[k] = !open.value[k] }
function expandAll() { local.forEach((s, i) => open.value[secKey(s, i)] = true) }
function collapseAll() { open.value = {} }

// Counters and progress
function counted(si: number) {
  const qs = local[si]?.questions || []
  const total = qs.length
  const answered = qs.filter(q => !!q.answer).length
  return { total, answered }
}
const totalQuestions = computed(() => local.reduce((sum, s) => sum + (s.questions?.length || 0), 0))
const totalAnswered = computed(() => local.reduce((sum, s) => sum + (s.questions?.filter(q => !!q.answer).length || 0), 0))
const progressPct = computed(() => totalQuestions.value ? Math.round((totalAnswered.value / totalQuestions.value) * 100) : 0)

function sectionStatusText(si: number) {
  const { total, answered } = counted(si)
  if (!total) return 'empty'
  if (local[si].is_complete) return 'complete'
  if (answered === 0) return 'not started'
  if (answered < total) return 'in progress'
  return 'complete'
}
function sectionBadgeClass(si: number) {
  const t = sectionStatusText(si)
  if (t === 'complete') return 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100'
  if (t === 'in progress') return 'bg-amber-500/20 border-amber-400/60 text-amber-100'
  if (t === 'not started') return 'bg-white/10 border-white/20 text-white/70'
  return 'bg-white/10 border-white/20 text-white/70'
}

// Drag-and-drop reordering
const draggingSection = ref<ChecklistSection | null>(null)
function onSecDragStart(sec: ChecklistSection, e: DragEvent) {
  if (!sectionDragEnabled.value) return
  draggingSection.value = sec
  if (e && e.dataTransfer) {
  try { e.dataTransfer.setData('text/plain', 'section') } catch (e) { /* ignore dragdata set errors */ }
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onSecDragOver(_sec: ChecklistSection, e: DragEvent) {
  if (!sectionDragEnabled.value) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}
function onSecDrop(targetSec: ChecklistSection, e: DragEvent) {
  if (!sectionDragEnabled.value) return
  e.preventDefault()
  const src = draggingSection.value
  draggingSection.value = null
  if (!src || src === targetSec) return
  const fromIdx = local.indexOf(src as any)
  const toIdx = local.indexOf(targetSec as any)
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
  const [moved] = local.splice(fromIdx, 1)
  local.splice(toIdx, 0, moved)
  // Log section reorder via drag-and-drop (use pre-renumber data)
  logEvent(toIdx, 'section_reordered', { fromIndex: fromIdx, toIndex: toIdx, number: moved?.number ?? null, title: moved?.title || '' })
  renumberSections()
  notifyChange()
}

const draggingQuestion = ref<{ secIdx: number; q: any } | null>(null)
function onQDragStart(si: number, q: any, e: DragEvent) {
  draggingQuestion.value = { secIdx: si, q }
  if (e && e.dataTransfer) {
  try { e.dataTransfer.setData('text/plain', 'question') } catch (e) { /* ignore dragdata set errors */ }
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onQDragOver(_si: number, _qi: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}
function onQDrop(si: number, qi: number, e: DragEvent) {
  e.preventDefault()
  const dq = draggingQuestion.value
  draggingQuestion.value = null
  if (!dq || dq.secIdx !== si) return // only allow within same section for now
  const arr = local[si]?.questions || []
  const fromIdx = arr.indexOf(dq.q)
  if (fromIdx === -1 || fromIdx === qi) return
  const [moved] = arr.splice(fromIdx, 1)
  arr.splice(qi, 0, moved)
  // Log question reorder within section
  logEvent(si, 'question_reordered', { fromIndex: fromIdx, toIndex: qi, number: moved?.number ?? null, text: moved?.question_text || '' })
  renumberQuestions(si)
  notifyChange()
}

function renumberSections() {
  for (let i = 0; i < local.length; i++) {
    local[i].number = i + 1
    renumberQuestions(i)
  }
}
function renumberQuestions(si: number) {
  const qs = local[si]?.questions || []
  for (let i = 0; i < qs.length; i++) {
    qs[i].number = i + 1
  }
}

// Helper: count attached issues for a specific question
function issuesCount(si: number, qi: number) {
  const sec = local[si]
  if (!sec) return 0
  const arr = (sec.issues || []) as any[]
  return arr.filter((it: any) => it && it.questionIndex === qi).length
}

function oprItemCount(q: any): number {
  const ids = Array.isArray(q?.oprItemIds) ? q.oprItemIds : []
  const set = new Set<string>()
  for (const raw of ids) {
    const id = String(raw || '').trim()
    if (id) set.add(id)
  }
  return set.size
}

// Per-question advanced details toggle (notes, answered_by)
const openQDetails = ref<Record<string, boolean>>({})
function qKey(si: number, qi: number) { return `${si}:${qi}` }
function isQOpen(si: number, qi: number) { return !!openQDetails.value[qKey(si, qi)] }
function toggleQ(si: number, qi: number) { openQDetails.value[qKey(si, qi)] = !isQOpen(si, qi) }

// Editing helpers
function setAnswer(si: number, qi: number, ans: 'yes'|'no'|'na') {
  if (!local[si] || !local[si].questions[qi]) return
  const q = local[si].questions[qi]
  const prev = q.answer
  const wasUnanswered = !q.answer
  // Toggle off if the same answer is clicked again
  if (prev === ans) {
    q.answer = null as any
    q.is_complete = false
  } else {
    q.answer = ans
    q.is_complete = ans != null
    // Stamp answered_by only the first time it's answered
    if (wasUnanswered && !q.answered_by) {
      const name = currentUserName.value
      if (name) q.answered_by = name
      if (!q.answered_at) q.answered_at = new Date().toISOString()
    }
  }
  // Log answer change
  logEvent(si, 'question_answer_set', { questionIndex: qi, number: q.number ?? (qi+1), prevAnswer: prev || null, nextAnswer: ans })
  updateSectionCompletion(si)
  local[si].status = sectionStatusText(si)
  notifyChange()
}
function bulkSet(si: number, ans: 'yes'|'no'|'na') {
  if (!local[si]) return
  const name = currentUserName.value
  let changed = 0
  local[si].questions.forEach(q => {
    const wasUnanswered = !q.answer
    if (q.answer !== ans) changed++
    q.answer = ans; q.is_complete = true
    if (wasUnanswered) {
      if (!q.answered_by && name) q.answered_by = name
      if (!q.answered_at) q.answered_at = new Date().toISOString()
    }
  })
  // Log bulk set
  logEvent(si, 'question_answer_bulk_set', { to: ans, total: local[si].questions.length, changed })
  updateSectionCompletion(si)
  local[si].status = sectionStatusText(si)
  notifyChange()
}
function onSectionCompleteToggle(si: number) {
  // If toggled to complete, backfill unanswered as 'na' to avoid partials
  let backfilled = 0
  if (local[si].is_complete) {
    const name = currentUserName.value
    local[si].questions.forEach(q => {
      if (!q.answer) {
        q.answer = 'na'; q.is_complete = true
        if (!q.answered_by && name) q.answered_by = name
        if (!q.answered_at) q.answered_at = new Date().toISOString()
        backfilled++
      }
    })
  }
  // Log section complete toggle
  logEvent(si, 'section_complete_toggle', { to: !!local[si].is_complete, backfilled })
  updateSectionCompletion(si)
  local[si].status = sectionStatusText(si)
  notifyChange()
}

let changeTimer: any = null
function snapshotPayload() {
  return local.map(s => ({ ...s, questions: s.questions.map(q => ({ ...q })) }))
}
function notifyChange() {
  const payload = snapshotPayload()
  emit('update:modelValue', payload)
  if (changeTimer) clearTimeout(changeTimer)
  changeTimer = setTimeout(() => emit('change', payload), 600)
}

// Button classes
function answerBtnClass(active: boolean, color: 'emerald'|'red'|'indigo') {
  const base = 'px-2 py-1 rounded-md border text-sm'
  const idle = 'bg-white/10 border-white/20 hover:bg-white/15'
  const map: Record<string, string> = {
    emerald: 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35',
    red: 'bg-red-500/20 border-red-400/60 text-red-100 hover:bg-red-500/35',
    indigo: 'bg-indigo-500/20 border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35',
  }
  return `${base} ${active ? map[color] : idle}`
}

function onCxAnswerChange(si: number, qi: number) {
  const q = local[si]?.questions?.[qi]
  if (!q) return
  const prev = q.cx_answer
  const name = currentUserName.value
  if (name) q.cx_answered_by = name
  q.cx_answered_at = new Date().toISOString()
  // Log CxA response change
  logEvent(si, 'question_cx_answer_set', { questionIndex: qi, number: q.number ?? (qi+1), prev: prev || null, next: q.cx_answer || null })
  notifyChange()
}
// Simple datetime formatter for display
function formatDateTime(d?: any) {
  if (!d) return ''
  try { return new Date(d).toLocaleString() } catch (e) { return String(d) }
}

// New checklist flow
const newOpen = ref(false)
const draft = reactive<{ title: string; type: string; system: string; status: string; responsible: string; notes: string; questions: Array<{ question_text: string }> }>({
  title: '', type: '', system: '', status: 'not started', responsible: '', notes: '', questions: []
})
const nextNumber = computed(() => {
  const nums = local.map(s => Number(s.number || 0)).filter(n => Number.isFinite(n))
  const max = nums.length ? Math.max(...nums) : 0
  return max + 1
})
function openNew() { resetDraft(); newOpen.value = true }
function resetDraft() { draft.title = ''; draft.type = ''; draft.system = ''; draft.status = 'not started'; draft.responsible = ''; draft.notes = ''; draft.questions = [] }
function cancelNew() { newOpen.value = false }
function addDraftQuestion() { draft.questions.push({ question_text: '' }) }
function removeDraftQuestion(i: number) { draft.questions.splice(i, 1) }
const canSave = computed(() => (draft.title || '').trim().length > 0)
function saveNew() {
  if (!canSave.value) return
  const questions = draft.questions.map((q, idx) => ({
    number: idx + 1,
    question_text: (q.question_text || '').trim(),
    answer: null,
    cx_answer: null,
    cx_answered_by: null,
    cx_answered_at: null,
    status: null,
    answered_by: null,
    answered_at: null,
    is_complete: null,
    notes: null,
  }))
  const section: ChecklistSection = {
    number: nextNumber.value,
    title: draft.title.trim(),
    type: draft.type.trim(),
    system: draft.system.trim(),
    status: draft.status || 'not started',
    is_complete: draft.status === 'complete',
    responsible: draft.responsible || '',
    notes: draft.notes || '',
    questions,
    documents: [], photos: [], issues: [], settings: [], meta: [],
  }
  local.push(section)
  // open the newly added section
  const idx = local.length - 1
  // Log section creation
  logEvent(idx, 'section_created', { number: section.number, title: section.title, type: section.type, system: section.system, questions: questions.length })
  open.value[secKey(section, idx)] = true
  // normalize numbering immediately
  renumberSections()
  notifyChange()
  emit('persist', snapshotPayload())
  newOpen.value = false
}

// Reordering
function moveSection(si: number, delta: -1 | 1) {
  const ni = si + delta
  if (ni < 0 || ni >= local.length) return
  const tmp = local[si]
  local.splice(si, 1)
  local.splice(ni, 0, tmp)
  // Log section move via buttons
  logEvent(ni, 'section_reordered', { fromIndex: si, toIndex: ni, number: tmp?.number ?? null, title: tmp?.title || '' })
  renumberSections()
  notifyChange()
}

	// Edit / Delete section
	const editOpen = ref(false)
	const editIndex = ref<number | null>(null)
	const editDraft = reactive<{ number: number | null; title: string; type: string; system: string; status: string; responsible: string; notes: string; questions: Array<{ number?: number; question_text: string }> }>({
	  number: null, title: '', type: '', system: '', status: 'not started', responsible: '', notes: '', questions: []
	})
	function startEdit(si: number) {
	  const s = local[si]
	  editIndex.value = si
	  editDraft.number = (s.number as any) ?? (si + 1)
	  editDraft.title = s.title || ''
	  editDraft.type = s.type || ''
	  editDraft.system = s.system || ''
	  editDraft.status = s.status || 'not started'
	  editDraft.responsible = (s as any)?.responsible ?? ''
	  editDraft.notes = s.notes || ''
	  editDraft.questions = (s.questions || []).map((q: any) => ({ number: q?.number, question_text: q?.question_text || '' }))
	  editOpen.value = true
	}
function cancelEdit() { editOpen.value = false; editIndex.value = null }
function addEditQuestion() { editDraft.questions.push({ question_text: '' }) }
function removeEditQuestion(i: number) { editDraft.questions.splice(i, 1) }
const canSaveEdit = computed(() => (editDraft.title || '').trim().length > 0)
function saveEditSection() {
  if (editIndex.value == null || !local[editIndex.value]) return
  const si = editIndex.value
  const before = { ...local[si] }
  const questions = editDraft.questions.map((q, idx) => ({
    number: (q.number && Number(q.number)) || (idx + 1),
    question_text: (q.question_text || '').trim(),
    answer: local[si].questions?.[idx]?.answer ?? null,
    cx_answer: local[si].questions?.[idx]?.cx_answer ?? null,
    cx_answered_by: local[si].questions?.[idx]?.cx_answered_by ?? null,
    cx_answered_at: local[si].questions?.[idx]?.cx_answered_at ?? null,
    status: local[si].questions?.[idx]?.status ?? null,
    answered_by: local[si].questions?.[idx]?.answered_by ?? null,
    answered_at: local[si].questions?.[idx]?.answered_at ?? null,
    is_complete: local[si].questions?.[idx]?.is_complete ?? null,
    notes: local[si].questions?.[idx]?.notes ?? null,
  }))
	  local[si] = {
	    ...local[si],
	    number: (editDraft.number as any) ?? local[si].number,
	    title: editDraft.title.trim(),
	    type: editDraft.type.trim(),
	    system: editDraft.system.trim(),
	    status: editDraft.status || 'not started',
	    is_complete: editDraft.status === 'complete',
	    responsible: editDraft.responsible || '',
	    notes: editDraft.notes || '',
	    questions,
	  }
  // Log key field edits (minimal)
  const after = local[si]
  const changed: Record<string, { from: any; to: any }> = {}
	  ;(['number','title','type','system','status','is_complete','responsible','notes'] as const).forEach((k) => {
	    const fromV = (before as any)?.[k]
	    const toV = (after as any)?.[k]
	    if (JSON.stringify(fromV) !== JSON.stringify(toV)) changed[k] = { from: fromV ?? null, to: toV ?? null }
	  })
  logEvent(si, 'section_edited', { changed, questionsCount: questions.length })
  notifyChange()
  emit('persist', snapshotPayload())
  editOpen.value = false
  editIndex.value = null
}
async function deleteSection(si: number) {
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({ title: 'Delete checklist', message: 'Delete this checklist section? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!confirmed) return
  const sec = local[si]
  // Log deletion before removal
  logEvent(si, 'section_deleted', { number: sec?.number ?? null, title: sec?.title || '' })
  local.splice(si, 1)
  renumberSections()
  notifyChange()
}

// Auto-completion helper: mark section complete if all questions answered
function updateSectionCompletion(si: number) {
  const sec = local[si]
  if (!sec) return
  const qs = sec.questions || []
  const allAnswered = qs.length > 0 && qs.every(q => !!q.answer)
  sec.is_complete = allAnswered
}
</script>
