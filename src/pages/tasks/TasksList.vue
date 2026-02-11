<template>
  <div class="space-y-4">
    <BreadCrumbs :items="[{ text: 'Dashboard', to: '/app' }, { text: 'Tasks', to: '/app/tasks' }]">
      <template #middle>
        <SearchPill
          v-model="q"
          placeholder="Search by name"
        />
      </template>
    </BreadCrumbs>

    <div class="rounded-2xl p-3 bg-white/6 backdrop-blur-xl border border-white/10 min-w-0 relative z-30">
      <div class="flex flex-wrap items-center justify-between gap-3 gap-y-2 min-w-0">
        <div class="flex flex-wrap items-center gap-3 gap-y-2 min-w-0">
          <div class="relative inline-block group">
            <button
              class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
              @click="editingId = 'new'; showEditModal = true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              New task
            </div>
          </div>

          <div class="inline-flex items-center gap-2">
            <div class="relative inline-block group">
              <button
                :class="['px-3 py-1 rounded', viewMode === 'list' ? 'bg-white/10' : 'bg-transparent']"
                @click="viewMode = 'list'"
              >
                List
              </button>
              <div
                role="tooltip"
                class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
              >
                List view
              </div>
            </div>

            <div class="relative inline-block group">
              <button
                :class="['px-3 py-1 rounded', viewMode === 'gantt' ? 'bg-white/10' : 'bg-transparent']"
                @click="viewMode = 'gantt'"
              >
                Gantt
              </button>
              <div
                role="tooltip"
                class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
              >
                Gantt view
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 gap-y-2">
          <div class="relative inline-block group">
            <button
              class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10"
              aria-label="Refresh"
              @click="fetch()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <path
                  d="M3 12a9 9 0 1 0 3-6.7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M3 4v4h4"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Refresh
            </div>
          </div>

          <div class="relative inline-block group">
            <button
              class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10"
              aria-label="Settings"
              @click="openSettingsModal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              ><path
                d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z"
                stroke-width="1.5"
              /><path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.35 17.3l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.67 0 1.26-.39 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06c.5.5 1.2.69 1.82.33.4-.2.8-.3 1.24-.3H12a1.65 1.65 0 0 0 1.24.3c.62.36 1.32.17 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.2.4-.3.8-.3 1.24V9c.3.7.96 1.2 1.66 1.2h.09a2 2 0 1 1 0 4h-.09c-.7 0-1.36.5-1.66 1.2v.3c.02.41.14.81.34 1.2z"
                stroke-width="1"
              /></svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Settings
            </div>
          </div>

          <div class="relative inline-block group">
            <button
              class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10"
              aria-label="Export PDF report"
              :disabled="downloadingTasksPdf"
              @click="downloadTasksPdf"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <path
                  d="M7 3h7l3 3v15a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 21V4.5A1.5 1.5 0 0 1 7.5 3"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M14 3v4h4"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M8 12h8"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M8 16h6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Export PDF report
            </div>
          </div>

          <div class="relative inline-block group">
            <button
              class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10"
              aria-label="Import tasks"
              @click="openImportModal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <path
                  d="M12 3v12"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M7 8l5-5 5 5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <rect
                  x="4"
                  y="15"
                  width="16"
                  height="6"
                  rx="1.5"
                  stroke-width="1.5"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Import tasks from a template or XML
            </div>
          </div>

          <div class="relative inline-block group shrink-0">
            <button
              :disabled="!projectStore.currentProjectId"
              aria-label="Toggle analytics"
              :title="projectStore.currentProjectId ? 'Toggle analytics' : 'Select a project'"
              :class="[
                'w-10 h-10 flex items-center justify-center rounded-full text-white border disabled:opacity-40',
                showAnalytics ? 'bg-white/15 border-white/20 hover:bg-white/20' : 'bg-transparent border-white/10 hover:bg-white/10'
              ]"
              @click="toggleAnalytics"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  d="M4 19V5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M8 19v-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M12 19V9"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M16 19v-3"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M20 19V7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              {{ showAnalytics ? 'Hide analytics' : 'Show analytics' }}
            </div>
          </div>

          <div class="relative inline-block group">
            <button
              :disabled="!canAutoTagTasksPage"
              aria-label="Auto-tag this page"
              :title="canAutoTagTasksPage ? 'Auto-tag this page' : 'Auto-tagging requires AI + a selected project'"
              class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-40"
              @click="showAutoTagModal = true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <path
                  d="M4 7h9a3 3 0 0 1 0 6H9a3 3 0 1 0 0 6h11"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Auto-tag this page
            </div>
          </div>

          <div class="flex items-end gap-2">
            <div class="relative inline-block group">
              <button
                class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10"
                aria-label="Collapse all"
                @click="collapseAll"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M7 14l5-5 5 5"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <div
                role="tooltip"
                class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
              >
                Collapse all
              </div>
            </div>

            <div class="relative inline-block group">
              <button
                class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10"
                aria-label="Expand all"
                @click="expandAll"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M7 10l5 5 5-5"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <div
                role="tooltip"
                class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
              >
                Expand all
              </div>
            </div>
          </div>

          <!-- More tools (collapsible filters) -->
          <div class="relative inline-block group">
            <button
              type="button"
              aria-label="More tools"
              :class="['w-10 h-10 flex items-center justify-center rounded-full text-white border', showAdvancedFilters ? 'bg-white/15 border-white/20 hover:bg-white/20' : 'bg-white/6 border-white/10 hover:bg-white/10']"
              @click="showAdvancedFilters = !showAdvancedFilters"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <circle
                  cx="5"
                  cy="12"
                  r="1.5"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="1.5"
                />
                <circle
                  cx="19"
                  cy="12"
                  r="1.5"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              More tools
            </div>
          </div>
        </div>
      </div>

      <!-- advanced filters -->
      <div
        v-if="showAdvancedFilters"
        class="mt-3 pt-3 border-t border-white/10"
      >
        <div class="space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-white/70 text-sm">Status</label>
              <select
                v-model="statusFilter"
                class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="">
                  All
                </option>
                <option
                  v-for="opt in statusFilterOptions"
                  :key="`s-${opt}`"
                  :value="opt"
                >
                  {{ opt }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-white/70 text-sm">Assigned to</label>
              <select
                v-model="assigneeFilter"
                class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="">
                  All
                </option>
                <option
                  v-for="opt in assigneeFilterOptions"
                  :key="`a-${opt.value}`"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-white/70 text-sm">Date range</label>
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model="dateFrom"
                  type="date"
                  placeholder="From"
                  :class="[
                    'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
                    dateFrom ? 'text-white' : 'text-white/60',
                  ]"
                >
                <input
                  v-model="dateTo"
                  type="date"
                  placeholder="To"
                  :class="[
                    'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
                    dateTo ? 'text-white' : 'text-white/60',
                  ]"
                >
              </div>
            </div>

            <div class="flex flex-col gap-1 md:col-span-1 xl:col-span-3">
              <label class="text-white/70 text-sm">Tags</label>
              <input
                v-model="tagsFilter"
                type="text"
                placeholder="e.g. commissioning, urgent"
                class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <TasksListCharts
      v-if="projectId && showAnalytics"
      :analytics="tasksAnalytics"
      :loading="tasksAnalyticsLoading"
    />

    <div
      v-if="!projectId"
      class="p-6 text-white/80"
    >
      Select a project to view its tasks.
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <div
        v-if="loading"
        class="rounded-2xl p-6 bg-white/6 border border-white/10 text-white/70 flex flex-col items-center justify-center"
      >
        <Spinner />
        <p class="mt-3 text-sm uppercase tracking-wide">
          Loading tasks…
        </p>
      </div>
      <div v-else>
        <div
          v-if="tasks.length === 0"
          class="text-white/70"
        >
          No tasks found for this project.
        </div>
        <template v-else>
          <div
            v-if="viewMode === 'list'"
            class="rounded-md border border-white/10"
          >
            <table class="w-full table-fixed text-sm compact-rows">
              <thead class="bg-white/5 text-white/70">
                <tr>
                  <th class="w-8 px-2" />
                  <th class="w-20 px-3 py-2 text-left">
                    WBS
                  </th>
                  <th class="text-left px-3 py-2">
                    Name
                  </th>
                  <th
                    v-if="showDurationColumn"
                    class="w-24 text-left px-3 py-2"
                  >
                    Duration (hours)
                  </th>
                  <th
                    v-if="showStartColumn"
                    class="w-24 text-left px-3 py-2"
                  >
                    Start
                  </th>
                  <th
                    v-if="showFinishColumn"
                    class="w-24 text-left px-3 py-2"
                  >
                    Finish
                  </th>
                  <th
                    v-if="showCostColumn"
                    class="w-28 text-left px-3 py-2"
                  >
                    Cost
                  </th>
                  <th class="w-48 text-right px-3 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="(t, idx) in filtered"
                  :key="t?._id || t?.id || idx"
                >
                  <tr
                    v-if="dragOverIndex === idx && dragOverPos === 'above'"
                    class="h-6"
                  >
                    <td
                      :colspan="headerColspan"
                      class="h-6 bg-emerald-400/10 border-t-2 border-emerald-400/60"
                    />
                  </tr>

                  <tr
                    :class="[
                      'border-t border-white/10 hover:bg-white/5',
                      dragOverIndex === idx && dragOverPos === 'on' ? 'bg-white/10 ring-1 ring-emerald-400/60' : ''
                    ]"
                    draggable="true"
                    @dragstart="(e) => onDragStart(t, e)"
                    @dragover.prevent="(e) => onDragOver(e, idx)"
                    @dragleave.prevent="onDragLeave"
                    @drop.prevent="(e) => onDrop(e, idx)"
                  >
                    <td class="px-2 py-2 align-top">
                      <span
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
                    </td>
                    <td
                      class="px-3 py-2 align-top cursor-pointer break-words"
                      @click="(e) => openTask(t, e)"
                    >
                      <div class="text-sm font-medium">
                        {{ t.wbs || '—' }}
                      </div>
                    </td>
                    <td
                      class="px-3 py-2 align-top relative cursor-pointer break-words"
                      @click="(e) => openTask(t, e)"
                    >
                      <div :style="{ paddingLeft: `calc(${wbsDepth(t.wbs) * 1.25}rem + ${wbsDepth(t.wbs) * 3}ch)`, paddingBottom: '0.6rem' }">
                        <div class="flex items-center gap-2">
                          <button
                            v-if="hasChildren(t)"
                            :aria-expanded="!isCollapsed(t)"
                            class="relative h-6 w-6 inline-grid place-items-center text-white/70 hover:text-white"
                            @click.stop="toggleCollapse(t)"
                          >
                            <span
                              v-if="isCollapsed(t) && descendantCount(t) > 0"
                              class="absolute -left-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] leading-none rounded-full border border-white/10 text-white bg-black/20"
                            >{{ descendantCount(t) }}</span>
                            <svg
                              :class="['w-4 h-4 transition-transform', isCollapsed(t) ? '' : 'rotate-90']"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            ><path
                              fill-rule="evenodd"
                              d="M6.3 4.3a1 1 0 011.4 0l6 6a1 1 0 010 1.4l-6 6a1 1 0 11-1.4-1.4L11.586 11 6.3 5.7a1 1 0 010-1.4z"
                              clip-rule="evenodd"
                            /></svg>
                          </button>
                          <div class="font-semibold">
                            {{ t.name }}
                          </div>
                        </div>
                        <div class="text-xs text-white/70">
                          {{ t.description || '' }}
                        </div>
                        <div
                          v-if="t.activityId"
                          :class="['text-xs text-white/60 mt-0.5', hasChildren(t) ? 'pl-8' : '']"
                        >
                          Activity:
                          <RouterLink
                            :to="{ name: 'activity-edit', params: { id: String(t.activityId) } }"
                            class="text-white/80 hover:text-white underline"
                          >
                            {{ activityNameForTask(t) }}
                          </RouterLink>
                        </div>
                      </div>
                      <!-- thin progress bar positioned at the bottom of the name cell -->
                      <div class="absolute left-3 right-3 -bottom-px h-3 flex items-end">
                        <div class="relative w-full">
                          <div class="h-[3px] bg-white/10 rounded overflow-hidden">
                            <div
                              :style="{ width: pct(t) + '%' }"
                              class="h-full bg-emerald-400/80"
                            />
                          </div>
                          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span class="text-[9px] leading-none text-white/80">{{ pct(t) + '%' }}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      v-if="showDurationColumn"
                      class="px-3 py-2 align-top cursor-pointer"
                      @click="(e) => openTask(t, e)"
                    >
                      <div>{{ dur(t) != null ? dur(t) : '' }}</div>
                    </td>
                    <td
                      v-if="showStartColumn"
                      class="px-3 py-2 align-top cursor-pointer"
                      @click="(e) => openTask(t, e)"
                    >
                      {{ fmt(startVal(t)) }}
                    </td>
                    <td
                      v-if="showFinishColumn"
                      class="px-3 py-2 align-top cursor-pointer"
                      @click="(e) => openTask(t, e)"
                    >
                      {{ fmt(endVal(t)) }}
                    </td>
                    <td
                      v-if="showCostColumn"
                      class="px-3 py-2 align-top cursor-pointer"
                      @click="(e) => openTask(t, e)"
                    >
                      <div>{{ formatCurrency(costVal(t)) }}</div>
                    </td>
                    <td class="px-3 py-2 text-right overflow-hidden">
                      <div class="flex flex-wrap items-center justify-end gap-2">
                        <label class="inline-flex items-center gap-2 text-sm text-white/80">
                          <input
                            type="checkbox"
                            :checked="isComplete(t)"
                            class="w-4 h-4"
                            @change="(e) => toggleComplete(t, e.target.checked)"
                          >
                        </label>

                        <button
                          v-if="showCreateLinkActivityButton"
                          :disabled="!!t.activityId"
                          class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
                          :title="t.activityId ? 'Activity already linked' : 'Create & link activity'"
                          aria-label="Create and link activity"
                          @click="createAndLinkActivityForTask(t)"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            class="w-4 h-4"
                          >
                            <path
                              d="M8 6h13M8 12h13M8 18h13"
                              stroke-width="1.5"
                              stroke-linecap="round"
                            />
                            <path
                              d="M3 12h2M4 11v2"
                              stroke-width="1.5"
                              stroke-linecap="round"
                            />
                          </svg>
                        </button>

                        <button
                          class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                          title="Edit"
                          @click="editingId = t._id; showEditModal = true"
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
                          class="h-8 w-8 inline-grid place-items-center rounded-md bg-red-500/20 border border-red-400/60 text-red-200 hover:bg-red-500/35"
                          title="Delete"
                          @click="confirmDelete(t)"
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
                      </div>
                    </td>
                  </tr>

                  <tr
                    v-if="dragOverIndex === idx && dragOverPos === 'below'"
                    class="h-6"
                  >
                    <td
                      :colspan="headerColspan"
                      class="h-6 bg-emerald-400/10 border-t-2 border-emerald-400/60"
                    />
                  </tr>
                </template>
                <tr
                  v-if="dragOverIndex === filtered.length - 1 && dragOverPos === 'below'"
                  class="h-6"
                >
                  <td
                    :colspan="headerColspan"
                    class="h-6 bg-emerald-400/10 border-t-2 border-emerald-400/60"
                  />
                </tr>

                <tr
                  v-if="listTopLevelTasks.length"
                  class="border-t border-white/15 bg-white/5"
                >
                  <td class="px-2 py-2" />
                  <td class="px-3 py-2 align-top">
                    <div class="text-sm font-medium text-white/60">
                      —
                    </div>
                  </td>
                  <td class="px-3 py-2 align-top relative">
                    <div style="padding-bottom: 0.6rem">
                      <div class="flex items-center justify-between gap-3">
                        <div class="font-semibold">
                          Totals
                        </div>
                        <div class="text-xs text-white/70">
                          {{ listTotals.status }}
                        </div>
                      </div>
                    </div>
                    <div class="absolute left-3 right-3 -bottom-px h-3 flex items-end">
                      <div class="relative w-full">
                        <div class="h-[3px] bg-white/10 rounded overflow-hidden">
                          <div
                            :style="{ width: (listTotals.percentComplete || 0) + '%' }"
                            class="h-full bg-emerald-400/80"
                          />
                        </div>
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span class="text-[9px] leading-none text-white/80">{{ (listTotals.percentComplete || 0) + '%' }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td
                    v-if="showDurationColumn"
                    class="px-3 py-2 align-top"
                  >
                    <div>{{ listTotals.duration != null ? listTotals.duration : '' }}</div>
                  </td>
                  <td
                    v-if="showStartColumn"
                    class="px-3 py-2 align-top"
                  >
                    {{ fmt(listTotals.start) }}
                  </td>
                  <td
                    v-if="showFinishColumn"
                    class="px-3 py-2 align-top"
                  >
                    {{ fmt(listTotals.finish) }}
                  </td>
                  <td
                    v-if="showCostColumn"
                    class="px-3 py-2 align-top"
                  >
                    <div>{{ listTotals.cost != null ? formatCurrency(listTotals.cost) : '' }}</div>
                  </td>
                  <td class="px-3 py-2 text-right text-white/60">
                    Project totals
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-else-if="viewMode === 'gantt'"
            class="rounded-2xl bg-white/6 border border-white/10 p-3"
          >
            <div class="flex items-center justify-between gap-3 mb-2">
              <div class="text-white/80 text-sm">
                Gantt
              </div>
              <div class="flex items-center gap-2">
                <label class="text-white/60 text-xs">Scale</label>
                <select
                  v-model="ganttViewMode"
                  class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-xs border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value="Day">
                    Day
                  </option>
                  <option value="Week">
                    Week
                  </option>
                  <option value="Month">
                    Month
                  </option>
                </select>
              </div>
            </div>

            <div
              v-if="ganttError"
              class="text-sm text-red-200 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2 mb-2"
            >
              {{ ganttError }}
            </div>

            <div
              class="rounded-xl overflow-auto bg-white"
              style="max-height: 70vh;"
            >
              <div
                ref="ganttEl"
                class="min-w-[900px]"
              />
            </div>

            <div
              v-if="ganttNoTasks"
              class="text-white/70 text-sm mt-2"
            >
              No tasks with valid Start/Finish dates to render.
            </div>
          </div>
        </template>
      </div>
    </div>

    <Modal
      v-model="showImportModal"
      panel-class="max-w-xl"
    >
      <template #header>
        <div class="text-lg font-semibold text-white">
          Import tasks
        </div>
      </template>

      <div class="space-y-4 text-white/90">
        <div class="flex gap-2">
          <button
            :class="['px-3 py-2 rounded border', importTab === 'template' ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/10 text-white/80 hover:bg-white/5']"
            @click="() => { importTab = 'template'; loadTaskTemplates() }"
          >
            Use template
          </button>
          <button
            :class="['px-3 py-2 rounded border', importTab === 'upload-xml' ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/10 text-white/80 hover:bg-white/5']"
            @click="() => { importTab = 'upload-xml' }"
          >
            Upload XML
          </button>
          <button
            :class="['px-3 py-2 rounded border', importTab === 'upload-csv' ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/10 text-white/80 hover:bg-white/5']"
            @click="() => { importTab = 'upload-csv' }"
          >
            Upload CSV
          </button>
        </div>

        <div
          v-if="importTab === 'template'"
          class="space-y-3"
        >
          <div class="flex gap-2">
            <input
              v-model="templateQuery"
              type="text"
              placeholder="Search templates"
              class="flex-1 px-3 py-2 rounded bg-white/10 border border-white/15 text-white placeholder-white/50"
              @keyup.enter="loadTaskTemplates"
            >
            <button
              class="px-3 py-2 rounded bg-white/10 border border-white/15 text-white hover:bg-white/15"
              @click="loadTaskTemplates"
            >
              Search
            </button>
          </div>

          <div
            v-if="templatesError"
            class="text-red-400 text-sm"
          >
            {{ templatesError }}
          </div>

          <div class="space-y-2">
            <label class="block text-sm text-white/80">Template</label>
            <select
              v-model="selectedTemplateId"
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/15 text-white"
            >
              <option value="">
                Select a template…
              </option>
              <option
                v-for="t in taskTemplates"
                :key="t._id"
                :value="t._id"
              >
                {{ [t.category, t.name].filter(Boolean).join(' — ') }} (v{{ t.version || '1.0.0' }})
              </option>
            </select>
            <p class="text-xs text-white/60">
              Templates seed tasks into the current project (they are copied into the Tasks table).
            </p>
          </div>
        </div>

        <div
          v-else-if="importTab === 'upload-xml'"
          class="space-y-2"
        >
          <label class="block text-sm text-white/80">MS Project XML file</label>
          <input
            ref="xmlFileInput"
            type="file"
            accept=".xml"
            class="text-sm text-white bg-transparent"
            @change="onXmlFileSelected"
          >
          <p class="text-xs text-white/60">
            Uploading will import tasks into the current project.
          </p>
        </div>

        <div
          v-else
          class="space-y-2"
        >
          <label class="block text-sm text-white/80">CSV file</label>
          <input
            ref="csvFileInput"
            type="file"
            accept=".csv,text/csv"
            class="text-sm text-white bg-transparent"
            @change="onCsvFileSelected"
          >
          <p class="text-xs text-white/60 break-words">
            Uploading will import tasks into the current project. Header suggestions:
            <span class="font-mono break-all block">
              taskId,wbs,name,description,start,finish,duration,percentComplete,status,notes,tags,dependencies
            </span>
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-2 rounded bg-white/6 text-white"
            @click="showImportModal = false"
          >
            Close
          </button>
          <button
            v-if="importTab === 'template'"
            class="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
            :disabled="importing || templatesLoading || !selectedTemplateId"
            @click="importFromTemplate"
          >
            <span v-if="importing">Importing…</span>
            <span v-else>Import</span>
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      v-model="showDeleteModal"
      panel-class="max-w-md"
    >
      <template #header>
        <div class="text-lg font-semibold text-white">
          Confirm deletion
        </div>
      </template>

      <div class="text-white/90">
        <template v-if="deletingCount > 1">
          Deleting "<strong>{{ deletingName }}</strong>" will also delete
          <strong>{{ deletingCount - 1 }}</strong> child task<span v-if="deletingCount - 1 !== 1">s</span>
          (total <strong>{{ deletingCount }}</strong>). This action cannot be undone. Continue?
        </template>
        <template v-else>
          Are you sure you want to delete task "<strong>{{ deletingName }}</strong>"?
        </template>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-2 rounded bg-white/6 text-white"
            @click="cancelDelete"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded bg-red-600 text-white"
            @click="doDelete"
          >
            <span v-if="deletingCount > 1">Delete ({{ deletingCount }})</span>
            <span v-else>Delete</span>
          </button>
        </div>
      </template>
    </Modal>
    <Modal
      v-model="showEditModal"
      panel-class="max-w-2xl"
    >
      <template #header>
        <div class="text-lg font-semibold text-white">
          {{ editingId && editingId !== 'new' ? 'Edit Task' : 'New Task' }}
        </div>
      </template>
      <TaskEditForm
        :id="editingId"
        :project-id="projectStore.currentProjectId"
        @saved="onEditSaved"
        @cancel="onEditCancel"
      />
    </Modal>
    <BulkAutoTagModal
      v-model="showAutoTagModal"
      title="Auto-tag visible tasks"
      :project-id="resolvedProjectId"
      entity-type="task"
      :allowed-tags="projectAllowedTags"
      :items="autoTagTaskItems"
      :can-suggest="canAutoTagTasksPage"
      :apply-tags="applyTaskTags"
    />
    <Modal
      v-model="showSettingsModal"
      panel-class="max-w-md"
    >
      <template #header>
        <div class="text-lg font-semibold text-white">
          Settings
        </div>
      </template>
      <div class="space-y-4 text-sm text-white/90">
        <div class="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm"
            :class="settingsTab === 'list' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5'"
            @click="settingsTab = 'list'"
          >
            List
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm"
            :class="settingsTab === 'report' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5'"
            @click="settingsTab = 'report'"
          >
            Report
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm"
            :class="settingsTab === 'cover' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5'"
            @click="settingsTab = 'cover'"
          >
            Cover Page
          </button>
        </div>

        <div
          v-if="settingsTab === 'list'"
          class="space-y-3"
        >
          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="w-4 h-4"
                :checked="ui.showTaskCreateLinkActivityButton"
                @change="(e) => { ui.setShowTaskCreateLinkActivityButton(e.target.checked); ui.showInfo('Settings updated') }"
              >
              <span>Show “Create &amp; link activity” button</span>
            </label>
          </div>
          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="w-4 h-4"
                :checked="ui.showTaskDurationColumn"
                @change="(e) => { ui.setShowTaskDurationColumn(e.target.checked); ui.showInfo('Settings updated') }"
              >
              <span>Show Duration column</span>
            </label>
          </div>
          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="w-4 h-4"
                :checked="ui.showTaskStartColumn"
                @change="(e) => { ui.setShowTaskStartColumn(e.target.checked); ui.showInfo('Settings updated') }"
              >
              <span>Show Start column</span>
            </label>
          </div>
          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="w-4 h-4"
                :checked="ui.showTaskFinishColumn"
                @change="(e) => { ui.setShowTaskFinishColumn(e.target.checked); ui.showInfo('Settings updated') }"
              >
              <span>Show Finish column</span>
            </label>
          </div>
          <div
            v-if="isAdmin"
            class="space-y-4"
          >
            <div class="flex items-center gap-3">
              <label class="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  class="w-4 h-4"
                  :checked="ui.showCostColumn"
                  @change="(e) => { ui.setShowCostColumn(e.target.checked); ui.showInfo('Settings updated') }"
                >
                <span>Show Cost column</span>
              </label>
            </div>
            <div>
              <div class="flex items-center gap-3">
                <label class="text-sm text-white/80 whitespace-nowrap">Bill rate</label>
                <div class="flex items-center gap-2 flex-1">
                  <span class="text-white/70">$</span>
                  <input
                    v-model.number="billRateInput"
                    type="number"
                    min="0"
                    step="0.01"
                    class="flex-1 px-3 py-2 rounded bg-white/10 border border-white/15 text-white"
                    @change="persistBillRateSetting"
                    @blur="persistBillRateSetting"
                  >
                </div>
              </div>
              <p class="text-xs text-white/60 mt-1">
                Used when tasks auto-calculate cost as duration × bill rate.
              </p>
            </div>
          </div>
          <div
            v-else
            class="text-sm text-white/70"
          >
            Cost column visible to admins only.
          </div>
        </div>

        <div
          v-else-if="settingsTab === 'report'"
          class="space-y-4"
        >
          <div class="grid grid-cols-2 gap-3">
            <label class="inline-flex items-center gap-2">
              <input
                v-model="tasksReport.include.coverPage"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Cover Page</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="tasksReport.include.analytics"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Analytics charts</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="tasksReport.include.summary"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Progress summary</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="tasksReport.include.table"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Tasks table</span>
            </label>
          </div>

          <div class="space-y-2">
            <div class="text-white/80">
              Report columns
            </div>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="c in tasksReportColumnOptions"
                :key="c.key"
                class="inline-flex items-center gap-2 text-sm"
              >
                <input
                  v-model="tasksReport.columns[c.key]"
                  type="checkbox"
                  class="rounded"
                >
                <span class="text-white/80">{{ c.label }}</span>
              </label>
            </div>
            <div class="text-xs text-white/60">
              The PDF uses the current filters/search. Toggle columns here.
            </div>
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
                v-model="tasksReport.coverTitle"
                type="text"
                placeholder="Tasks Report"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 placeholder-white/40"
              >
            </div>
            <div>
              <label class="block text-white/80 mb-1">Cover subtitle</label>
              <input
                v-model="tasksReport.coverSubtitle"
                type="text"
                placeholder="Project Name"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 placeholder-white/40"
              >
            </div>
            <div>
              <label class="block text-white/80 mb-1">By line (optional)</label>
              <input
                v-model="tasksReport.coverByLine"
                type="text"
                placeholder="By: John Doe, PE (Company)"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 text-white/90 placeholder-white/40"
              >
              <div class="text-xs text-white/60 mt-1">
                Printed on the cover page below the project name.
              </div>
            </div>
            <div>
              <label class="block text-white/80 mb-1">Jumbotron photo (optional)</label>
              <div class="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  class="block w-full text-white/80 text-sm"
                  @change="onTasksCoverJumbotronSelected"
                >
                <button
                  v-if="tasksReport.coverJumbotronDataUrl"
                  type="button"
                  class="px-3 py-2 rounded-md bg-red-500/20 border border-red-500/30 text-red-100 hover:bg-red-500/30 text-sm"
                  @click="clearTasksCoverJumbotron"
                >
                  Remove
                </button>
              </div>
              <div
                v-if="tasksReport.coverJumbotronDataUrl"
                class="mt-3"
              >
                <img
                  :src="tasksReport.coverJumbotronDataUrl"
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
            @click="resetTasksReportSettings"
          >
            Reset report settings
          </button>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
              @click="showSettingsModal = false"
            >
              Close
            </button>
            <button
              class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35"
              @click="saveTasksReportSettings"
            >
              Save report settings
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- Hidden letter-sized report DOM used for PDF generation -->
    <div
      v-if="renderTasksReport"
      ref="tasksReportRoot"
      class="fixed top-0 -left-[2500px] w-[816px] pointer-events-none"
    >
      <div class="space-y-0">
        <div
          v-if="tasksReport.include.coverPage"
          class="tasks-report-page bg-white text-black px-12 py-12"
          style="width:816px; height:1056px; box-sizing:border-box;"
        >
          <div class="h-full flex flex-col">
            <div class="flex items-center justify-between">
              <div class="w-40">
                <img
                  v-if="clientLogoForReport"
                  :src="clientLogoForReport"
                  class="h-10 w-auto object-contain"
                  alt="Client logo"
                >
              </div>
              <div class="w-40 flex justify-end">
                <img
                  v-if="cxaLogoForReport"
                  :src="cxaLogoForReport"
                  class="h-10 w-auto object-contain"
                  alt="Commissioning agent logo"
                >
              </div>
            </div>

            <div class="text-center mt-6">
              <div
                v-if="String(tasksReport.coverTitle || '').trim()"
                class="text-3xl font-semibold"
              >
                {{ reportTitleResolved }}
              </div>
              <div
                v-if="String(coverSubtitleResolved).trim()"
                class="text-xl font-semibold mt-3"
              >
                {{ coverSubtitleResolved }}
              </div>
            </div>

            <div
              v-if="tasksReport.coverJumbotronDataUrl"
              class="flex-1 flex items-center justify-center mt-8"
            >
              <img
                :src="tasksReport.coverJumbotronDataUrl"
                class="max-h-[520px] w-full object-contain rounded-lg border border-black/10"
              >
            </div>

            <div
              v-if="String(tasksReport.coverByLine || '').trim() || reportGeneratedDate"
              class="text-center mt-6"
            >
              <div
                v-if="String(tasksReport.coverByLine || '').trim()"
                class="text-sm text-black/70"
              >
                {{ tasksReport.coverByLine }}
              </div>
              <div class="text-sm text-black/60 mt-2">
                Generated {{ reportGeneratedDate }}
              </div>
            </div>

            <div class="mt-auto">
              <div class="text-sm text-black/80">
                <span class="font-semibold">Project:</span>
                <span class="ml-1">{{ projectNameResolved }}</span>
              </div>
              <div class="text-sm text-black/80 mt-1">
                <span class="font-semibold">Tasks:</span>
                <span class="ml-1">{{ reportTotalTasks }} total, {{ reportCompletedTasks }} completed ({{ reportCompletionPercent }}%)</span>
              </div>

              <div class="mt-10 pt-3 border-t border-black/10 flex items-center justify-between text-xs text-black/60">
                <div class="flex items-center gap-1">
                  <img
                    v-if="cxmaLogoForReport"
                    :src="cxmaLogoForReport"
                    class="block h-4 w-4 shrink-0 object-contain"
                    alt="cxma"
                  >
                  <div class="font-semibold tracking-wide leading-none relative -top-1.5">
                    cxma
                  </div>
                  <div class="ml-3 font-semibold tracking-wide text-black/60">
                    Tasks Report
                  </div>
                </div>
                <div>
                  Page {{ reportCoverPageNo }} of {{ reportTotalPages }}
                </div>
                <div>
                  {{ reportGeneratedDate }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="shouldRenderOverviewPage"
          class="tasks-report-page bg-white text-black px-10 pt-4 pb-8"
          style="width:816px; height:1056px; box-sizing:border-box;"
        >
          <div class="h-full flex flex-col">
            <div class="flex items-center justify-between">
              <div class="w-40">
                <img
                  v-if="clientLogoForReport"
                  :src="clientLogoForReport"
                  class="h-10 w-auto object-contain"
                  alt="Client logo"
                >
              </div>
              <div class="text-center">
                <div class="text-2xl font-semibold">
                  {{ reportTitleResolved }}
                </div>
              </div>
              <div class="w-40 flex justify-end">
                <img
                  v-if="cxaLogoForReport"
                  :src="cxaLogoForReport"
                  class="h-10 w-auto object-contain"
                  alt="Commissioning agent logo"
                >
              </div>
            </div>

            <div
              v-if="tasksReport.include.summary"
              class="mt-4 grid grid-cols-3 gap-4"
            >
              <div class="rounded-lg border border-black/10 p-4">
                <div class="text-xs text-black/60">
                  Total tasks
                </div>
                <div class="text-2xl font-semibold">
                  {{ reportTotalTasks }}
                </div>
              </div>
              <div class="rounded-lg border border-black/10 p-4">
                <div class="text-xs text-black/60">
                  Completed
                </div>
                <div class="text-2xl font-semibold">
                  {{ reportCompletedTasks }}
                </div>
              </div>
              <div class="rounded-lg border border-black/10 p-4">
                <div class="text-xs text-black/60">
                  Overall completion
                </div>
                <div class="text-2xl font-semibold">
                  {{ reportCompletionPercent }}%
                </div>
              </div>
            </div>

            <div
              v-if="tasksReport.include.analytics"
              class="mt-6"
            >
              <div class="rounded-lg border border-black/10 p-3">
                <TasksListCharts
                  :analytics="tasksAnalytics"
                  :loading="tasksAnalyticsLoading"
                  mode="light"
                  embedded
                  :height-scale="0.60"
                  variant="report"
                />
              </div>
            </div>

            <div class="mt-auto">
              <div
                v-if="tasksReport.include.analytics"
                class="text-xs text-black/50 pt-4"
              >
                Notes: Charts are project-wide analytics.
              </div>

              <div class="mt-3 pt-3 border-t border-black/10 flex items-center justify-between text-xs text-black/60">
                <div class="flex items-center gap-1">
                  <img
                    v-if="cxmaLogoForReport"
                    :src="cxmaLogoForReport"
                    class="block h-4 w-4 shrink-0 object-contain"
                    alt="cxma"
                  >
                  <div class="font-semibold tracking-wide leading-none relative -top-1.5">
                    cxma
                  </div>
                  <div class="ml-3 font-semibold tracking-wide text-black/60">
                    Tasks Report
                  </div>
                </div>
                <div>
                  Page {{ reportOverviewPageNo }} of {{ reportTotalPages }}
                </div>
                <div>
                  {{ reportGeneratedDate }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <template v-if="tasksReport.include.table">
          <div
            v-for="(chunk, idx) in reportTaskChunks"
            :key="`tp-${idx}`"
            class="tasks-report-page bg-white text-black px-10 py-10"
            style="width:816px; height:1056px; box-sizing:border-box;"
          >
            <div class="h-full flex flex-col">
              <div class="flex items-center justify-between">
                <div class="w-40">
                  <img
                    v-if="clientLogoForReport"
                    :src="clientLogoForReport"
                    class="h-10 w-auto object-contain"
                    alt="Client logo"
                  >
                </div>
                <div class="w-40 flex justify-end">
                  <img
                    v-if="cxaLogoForReport"
                    :src="cxaLogoForReport"
                    class="h-10 w-auto object-contain"
                    alt="Commissioning agent logo"
                  >
                </div>
              </div>

              <div class="mt-4 overflow-hidden rounded-lg border border-black/10">
                <table class="w-full text-[11px]">
                  <thead class="bg-black/5">
                    <tr>
                      <th
                        v-for="col in reportSelectedColumns"
                        :key="`h-${col.key}`"
                        class="text-left font-semibold px-2 py-2 border-b border-black/10"
                      >
                        {{ col.label }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="t in chunk"
                      :key="t && (t._id || t.taskId || t.wbs || t.name)"
                      :class="[
                        'border-b border-black/5',
                        wbsDepth(t?.wbs) === 0 ? 'font-semibold' : 'font-normal',
                      ]"
                    >
                      <td
                        v-for="col in reportSelectedColumns"
                        :key="`c-${col.key}`"
                        class="px-2 py-2 align-top"
                      >
                        <template v-if="col.key === 'name'">
                          <div
                            :style="{ paddingLeft: `${Math.min(6, wbsDepth(t?.wbs)) * 10}px` }"
                            class="whitespace-normal"
                          >
                            {{ reportValue(col.key, t) }}
                          </div>
                        </template>
                        <template v-else>
                          {{ reportValue(col.key, t) }}
                        </template>
                      </td>
                    </tr>

                    <tr
                      v-if="idx === (reportTaskChunks.length - 1)"
                      class="bg-black/5 border-t border-black/10 font-semibold"
                    >
                      <td
                        v-for="col in reportSelectedColumns"
                        :key="`tot-${col.key}`"
                        class="px-2 py-2 align-top"
                      >
                        <template v-if="col.key === 'name'">
                          Totals
                        </template>
                        <template v-else>
                          {{ reportTotalsValue(col.key) }}
                        </template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mt-auto pt-3 border-t border-black/10 flex items-center justify-between text-xs text-black/60">
                <div class="flex items-center gap-1">
                  <img
                    v-if="cxmaLogoForReport"
                    :src="cxmaLogoForReport"
                    class="block h-4 w-4 shrink-0 object-contain"
                    alt="cxma"
                  >
                  <div class="font-semibold tracking-wide leading-none relative -top-1.5">
                    cxma
                  </div>
                  <div class="ml-3 font-semibold tracking-wide text-black/60">
                    Tasks Report
                  </div>
                </div>
                <div>
                  Page {{ reportTableStartPageNo + idx }} of {{ reportTotalPages }}
                </div>
                <div>
                  {{ reportGeneratedDate }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import { useActivitiesStore } from '../../stores/activities'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import SearchPill from '../../components/SearchPill.vue'
import Spinner from '../../components/Spinner.vue'
import Modal from '../../components/Modal.vue'
import TaskEditForm from '../../components/TaskEditForm.vue'
import TasksListCharts from '../../components/charts/TasksListCharts.vue'
  import BulkAutoTagModal from '../../components/BulkAutoTagModal.vue'
  import { http } from '../../utils/http'
  import { runCoachmarkOnce } from '../../utils/coachmarks'
  import { useRoute, useRouter } from 'vue-router'
import { loadGantt } from '../../lib/frappeGanttAdapter'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
;(window).html2canvas = (window).html2canvas || html2canvas

const projectStore = useProjectStore()
const ui = useUiStore()
const auth = useAuthStore()
const activitiesStore = useActivitiesStore()
const router = useRouter()
const route = useRoute()
const projectId = computed(() => projectStore.currentProjectId)
const resolvedProjectId = computed(() => String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim())
const tasks = ref([])
const q = ref('')
const loading = ref(false)
const showDeleteModal = ref(false)
const deletingId = ref(null)
const deletingName = ref('')
const deletingCount = ref(0)
const viewMode = ref('list')

const ganttEl = ref(null)
const ganttViewMode = ref('Week')
const ganttError = ref('')
const ganttNoTasks = ref(false)
let ganttCtor = null

function toYmd(d) {
  if (!d) return null
  try {
    const ms = new Date(d).getTime()
    if (!Number.isFinite(ms)) return null
    return new Date(ms).toISOString().slice(0, 10)
  } catch (e) {
    return null
  }
}

async function renderGantt() {
  if (viewMode.value !== 'gantt') return
  if (!ganttEl.value) return

  ganttError.value = ''
  ganttNoTasks.value = false

  const rows = Array.isArray(filtered.value) ? filtered.value : []
  const items = rows
    .filter(t => t && t._id)
    .map(t => {
      const start = toYmd(startVal(t))
      const end = toYmd(endVal(t) || startVal(t))
      if (!start || !end) return null
      return {
        id: String(t._id),
        name: `${t.wbs ? String(t.wbs) + ' ' : ''}${String(t.name || '').trim()}`.trim() || String(t.wbs || t._id),
        start,
        end,
        progress: Number(pct(t) || 0),
        dependencies: ''
      }
    })
    .filter(Boolean)

  if (!items.length) {
    ganttNoTasks.value = true
    try { ganttEl.value.innerHTML = '' } catch (e) { /* ignore */ }
    return
  }

  try {
    if (!ganttCtor) ganttCtor = await loadGantt()
    // reset container to avoid stale SVG
    ganttEl.value.innerHTML = ''
    new ganttCtor(ganttEl.value, items, {
      view_mode: ganttViewMode.value,
      on_click: (task) => {
        try {
          const id = task && task.id ? String(task.id) : ''
          const original = rows.find(x => x && String(x._id) === id)
          if (original) openTask(original, null)
        } catch (e) { /* ignore */ }
      }
    })
  } catch (e) {
    console.error('renderGantt error', e)
    ganttError.value = e?.message || 'Failed to render Gantt'
  }
}
const showEditModal = ref(false)
const editingId = ref(null)
const showSettingsModal = ref(false)
const billRateInput = ref(ui.tasksBillRate || 0)
const showAutoTagModal = ref(false)

const settingsTab = ref('list')

const downloadingTasksPdf = ref(false)
const renderTasksReport = ref(false)
const tasksReportRoot = ref(null)

const reportLogos = ref({ client: '', cxa: '', cxma: '' })

const TASKS_REPORT_STORAGE_KEY = computed(() => `tasksReportSettings:${projectStore.currentProjectId || 'global'}`)
function hasLocalStorage() {
  try { return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' } catch (e) { return false }
}
function defaultTasksReportSettings() {
  return {
    include: { coverPage: true, analytics: true, summary: true, table: true },
    coverTitle: 'Tasks Report',
    coverSubtitle: '',
    coverByLine: '',
    coverJumbotronDataUrl: '',
    columns: {
      wbs: true,
      name: true,
      status: true,
      percentComplete: true,
      start: true,
      finish: true,
      duration: false,
      assignee: true,
      tags: false,
      cost: false,
    },
  }
}

const tasksReport = ref(defaultTasksReportSettings())

async function fetchAsDataUrl(src) {
  try {
    const s = String(src || '').trim()
    if (!s) return ''
    if (s.startsWith('data:')) return s
    const res = await fetch(s, { mode: 'cors', credentials: 'same-origin' })
    if (!res.ok) return ''
    const blob = await res.blob()
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
    return String(dataUrl || '')
  } catch (e) {
    return ''
  }
}

async function prepareReportLogos() {
  const p = projectStore.currentProject || {}
  const clientSrc = String(p.logo || '').trim()
  const cxaSrc = String((p.commissioning_agent && p.commissioning_agent.logo) || '').trim()
  const cxmaSrc = '/brand/logo-2.png'
  const [client, cxa, cxma] = await Promise.all([
    fetchAsDataUrl(clientSrc),
    fetchAsDataUrl(cxaSrc),
    fetchAsDataUrl(cxmaSrc),
  ])
  reportLogos.value = {
    client: client || clientSrc,
    cxa: cxa || cxaSrc,
    cxma: cxma || cxmaSrc,
  }
}

function loadTasksReportSettings() {
  if (!hasLocalStorage()) return
  try {
    const raw = localStorage.getItem(TASKS_REPORT_STORAGE_KEY.value)
    if (!raw) return
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return
    const base = defaultTasksReportSettings()
    tasksReport.value = {
      ...base,
      ...data,
      include: { ...base.include, ...(data.include || {}) },
      columns: { ...base.columns, ...(data.columns || {}) },
    }

    // Normalize legacy title value
    if (String(tasksReport.value.coverTitle || '').trim() === 'TasksReport') {
      tasksReport.value.coverTitle = 'Tasks Report'
    }
  } catch (e) { /* ignore */ }
}

function saveTasksReportSettings() {
  if (!hasLocalStorage()) {
    try { ui.showInfo('Report settings saved') } catch (e) { /* ignore */ }
    return
  }
  try {
    localStorage.setItem(TASKS_REPORT_STORAGE_KEY.value, JSON.stringify(tasksReport.value))
    ui.showInfo('Report settings saved')
  } catch (e) {
    try { ui.showError('Failed to save report settings') } catch (err) { /* ignore */ }
  }
}

function resetTasksReportSettings() {
  tasksReport.value = defaultTasksReportSettings()
  saveTasksReportSettings()
}

function openSettingsModal() {
  settingsTab.value = 'list'
  loadTasksReportSettings()
  showSettingsModal.value = true
}

function onTasksCoverJumbotronSelected(evt) {
  try {
    const file = evt && evt.target && evt.target.files && evt.target.files[0] ? evt.target.files[0] : null
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { tasksReport.value.coverJumbotronDataUrl = String(reader.result || '') }
    reader.readAsDataURL(file)
  } catch (e) { /* ignore */ }
}

function clearTasksCoverJumbotron() {
  tasksReport.value.coverJumbotronDataUrl = ''
}

const showAdvancedFilters = ref(false)
const statusFilter = ref('')
const assigneeFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const tagsFilter = ref('')

const statusFilterOptions = Object.freeze(['Not Started', 'Pending', 'In Progress', 'Completed'])

const tasksReportColumnOptions = computed(() => {
  const base = [
    { key: 'wbs', label: 'WBS' },
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
    { key: 'percentComplete', label: '% Complete' },
    { key: 'start', label: 'Start' },
    { key: 'finish', label: 'Finish' },
    { key: 'duration', label: 'Duration' },
    { key: 'assignee', label: 'Assigned to' },
    { key: 'tags', label: 'Tags' },
  ]
  if (isAdmin.value) base.push({ key: 'cost', label: 'Cost' })
  return base
})

const reportSelectedColumns = computed(() => {
  const cols = tasksReport.value && tasksReport.value.columns ? tasksReport.value.columns : {}
  return (tasksReportColumnOptions.value || []).filter(c => cols && cols[c.key] === true)
})

const projectNameResolved = computed(() => String((projectStore.currentProject && projectStore.currentProject.name) || '').trim() || 'Project')
const coverSubtitleResolved = computed(() => {
  const user = String(tasksReport.value.coverSubtitle || '').trim()
  return user
})
function humanizeTitleSpacing(input) {
  const s = String(input || '')
  if (!s) return ''
  // Add spaces for common camelCase/PascalCase boundaries while keeping acronyms intact.
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const reportTitleResolved = computed(() => {
  const raw = String(tasksReport.value.coverTitle || '').trim()
  return humanizeTitleSpacing(raw || 'Tasks Report')
})
const reportGeneratedDate = computed(() => {
  try { return new Date().toLocaleDateString() } catch (e) { return '' }
})

const clientLogoForReport = computed(() => String(reportLogos.value.client || '').trim())
const cxaLogoForReport = computed(() => String(reportLogos.value.cxa || '').trim())
const cxmaLogoForReport = computed(() => String(reportLogos.value.cxma || '').trim())

const shouldRenderOverviewPage = computed(() => {
  return !!(tasksReport.value && tasksReport.value.include && (tasksReport.value.include.summary || tasksReport.value.include.analytics))
})

const reportTotalPages = computed(() => {
  const cover = tasksReport.value && tasksReport.value.include && tasksReport.value.include.coverPage
  const overview = shouldRenderOverviewPage.value ? 1 : 0
  const tablePages = (tasksReport.value && tasksReport.value.include && tasksReport.value.include.table) ? (reportTaskChunks.value || []).length : 0
  return (cover ? 1 : 0) + overview + tablePages
})
const reportCoverPageNo = computed(() => 1)
const reportOverviewPageNo = computed(() => {
  const coverPages = (tasksReport.value && tasksReport.value.include && tasksReport.value.include.coverPage) ? 1 : 0
  return coverPages + 1
})
const reportTableStartPageNo = computed(() => {
  const coverPages = (tasksReport.value && tasksReport.value.include && tasksReport.value.include.coverPage) ? 1 : 0
  const overviewPages = shouldRenderOverviewPage.value ? 1 : 0
  return coverPages + overviewPages + 1
})

const reportTasksBase = computed(() => {
  // Use the same list the user is looking at (search + filters) and exclude deleted.
  return (filtered.value || []).filter(t => !(t && (t.deleted === true || String(t.status || '').toLowerCase() === 'deleted')))
})

const reportTotalTasks = computed(() => (reportTasksBase.value || []).length)
const reportCompletedTasks = computed(() => (reportTasksBase.value || []).filter(t => isComplete(t)).length)
const reportCompletionPercent = computed(() => {
  const total = reportTotalTasks.value
  if (!total) return 0
  return Math.round((reportCompletedTasks.value / total) * 100)
})

function chunkArray(arr, size) {
  const out = []
  const a = Array.isArray(arr) ? arr : []
  const n = Math.max(1, Number(size) || 1)
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n))
  return out
}

const reportTaskChunks = computed(() => {
  // Keep conservative to avoid clipping at the bottom when rows wrap.
  const rowsPerPage = 26
  return chunkArray(reportTasksBase.value || [], rowsPerPage)
})

function computeTopLevelTotals(topTasks) {
  const top = Array.isArray(topTasks) ? topTasks : []

  let percentSum = 0
  let percentCount = 0
  let durationSum = 0
  let durationAny = false
  let costSum = 0
  let costAny = false
  let earliestStart = null
  let latestFinish = null

  for (const t of top) {
    const p = pct(t)
    if (Number.isFinite(p)) {
      percentSum += p
      percentCount += 1
    }

    const d = dur(t)
    if (d != null && Number.isFinite(Number(d))) {
      durationSum += Number(d)
      durationAny = true
    }

    const c = costVal(t)
    if (c != null && Number.isFinite(Number(c))) {
      costSum += Number(c)
      costAny = true
    }

    const sd = startVal(t)
    if (sd instanceof Date && !isNaN(sd.getTime())) {
      if (earliestStart === null || sd < earliestStart) earliestStart = sd
    }

    const ed = endVal(t)
    if (ed instanceof Date && !isNaN(ed.getTime())) {
      if (latestFinish === null || ed > latestFinish) latestFinish = ed
    }
  }

  const percentComplete = percentCount ? Math.max(0, Math.min(100, Math.round(percentSum / percentCount))) : 0
  const status = percentComplete >= 100 ? 'Completed' : (percentComplete <= 0 ? 'Not Started' : 'In Progress')
  const duration = durationAny ? Number(durationSum.toFixed(2)) : null
  const cost = costAny ? Number(costSum.toFixed(2)) : null

  return {
    status,
    percentComplete,
    start: earliestStart,
    finish: latestFinish,
    duration,
    cost,
  }
}

const reportTopLevelTasks = computed(() => {
  return (reportTasksBase.value || []).filter(t => wbsDepth(t?.wbs) === 0)
})
const reportTotals = computed(() => {
  return computeTopLevelTotals(reportTopLevelTasks.value || [])
})

const listActiveTasks = computed(() => {
  // Project totals should not depend on current search/filter UI; only exclude deleted.
  return (tasks.value || []).filter(t => !(t && (t.deleted === true || String(t.status || '').toLowerCase() === 'deleted')))
})

const listTopLevelTasks = computed(() => {
  return (listActiveTasks.value || []).filter(t => wbsDepth(t?.wbs) === 0)
})

const listTotals = computed(() => computeTopLevelTotals(listTopLevelTasks.value || []))
function reportTotalsValue(key) {
  try {
    const tot = reportTotals.value || {}
    if (key === 'status') return String(tot.status || '')
    if (key === 'percentComplete') return `${Number(tot.percentComplete || 0)}%`
    if (key === 'start') return fmtDateShort(tot.start)
    if (key === 'finish') return fmtDateShort(tot.finish)
    if (key === 'duration') return tot.duration != null ? String(tot.duration) : ''
    if (key === 'cost') return tot.cost != null ? formatCurrency(tot.cost) : ''
    return ''
  } catch (e) {
    return ''
  }
}

const teamMemberLabelById = computed(() => {
  const p = projectStore.currentProject || {}
  const team = Array.isArray(p.team) ? p.team : []
  const map = {}
  for (const m of team) {
    const id = String(m?._id || m?.id || '').trim()
    if (!id) continue
    map[id] = teamMemberLabel(m)
  }
  return map
})

function fmtDateShort(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString() } catch (e) { return String(d) }
}

function reportValue(key, t) {
  try {
    if (!t) return ''
    if (key === 'wbs') return String(t.wbs || '')
    if (key === 'name') return String(t.name || t.title || '')
    if (key === 'status') {
      const children = getImmediateChildren(t)
      if (children && children.length > 0) {
        const p = pct(t)
        if (p >= 100) return 'Completed'
        if (p <= 0) return 'Not Started'
        return 'In Progress'
      }
      return String(t.status || '')
    }
    if (key === 'percentComplete') return `${pct(t)}%`
    if (key === 'start') return fmtDateShort(startVal(t))
    if (key === 'finish') return fmtDateShort(endVal(t))
    if (key === 'duration') {
      const d = dur(t)
      return d != null ? String(d) : ''
    }
    if (key === 'assignee') {
      const id = taskAssigneeId(t)
      return id ? (teamMemberLabelById.value[id] || id) : ''
    }
    if (key === 'tags') return Array.isArray(t.tags) ? t.tags.join(', ') : ''
    if (key === 'cost') return formatCurrency(costVal(t))
    return ''
  } catch (e) {
    return ''
  }
}

async function downloadTasksPdf() {
  if (downloadingTasksPdf.value) return
  downloadingTasksPdf.value = true
  loadTasksReportSettings()
  try {
    await prepareReportLogos()
    if (tasksReport.value.include.analytics && projectStore.currentProjectId) {
      // Ensure analytics is loaded for charts.
      if (!tasksAnalytics.value && !tasksAnalyticsLoading.value) await fetchTasksAnalytics(projectStore.currentProjectId)
    }

    renderTasksReport.value = true
    await nextTick()
    // Allow charts to render.
    await new Promise(resolve => setTimeout(resolve, 600))

    const root = tasksReportRoot.value
    if (!root) throw new Error('Report container not available')
    const pages = Array.from(root.querySelectorAll('.tasks-report-page'))
    if (!pages.length) throw new Error('No report pages to export')

    const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    for (let i = 0; i < pages.length; i += 1) {
      const el = pages[i]
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
      })
      const imgData = canvas.toDataURL('image/png')
      if (i > 0) doc.addPage('letter', 'portrait')
      doc.addImage(imgData, 'PNG', 0, 0, pageW, pageH)
    }

    const safeName = projectNameResolved.value.replace(/[^a-z0-9\-_]+/gi, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '')
    const stamp = (() => {
      try {
        const d = new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}${m}${day}`
      } catch (e) { return '' }
    })()
    const filename = `tasks-report${safeName ? `-${safeName}` : ''}${stamp ? `-${stamp}` : ''}.pdf`
    doc.save(filename)
    try { ui.showInfo('PDF downloaded') } catch (e) { /* ignore */ }
  } catch (e) {
    console.error('downloadTasksPdf error', e)
    try { ui.showError(e?.message || 'Failed to generate PDF') } catch (err) { /* ignore */ }
  } finally {
    renderTasksReport.value = false
    downloadingTasksPdf.value = false
  }
}

const projectAllowedTags = computed(() => {
  const p = projectStore.currentProject || {}
  const tags = p && Array.isArray(p.tags) ? p.tags : []
  return tags.map(t => String(t).trim()).filter(Boolean)
})

function norm(v) {
  return String(v || '').trim()
}

function normLower(v) {
  return norm(v).toLowerCase()
}

function dateInputToMs(v, endOfDay = false) {
  const s = String(v || '').trim()
  if (!s) return null
  const iso = endOfDay ? `${s}T23:59:59.999` : `${s}T00:00:00.000`
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : null
}

function taskAssigneeId(t) {
  const a = t && t.assignee !== undefined ? t.assignee : null
  if (!a) return ''
  if (typeof a === 'string') return String(a)
  if (typeof a === 'object') return String(a._id || a.id || '')
  return String(a)
}

function teamMemberLabel(m) {
  const first = norm(m?.firstName)
  const last = norm(m?.lastName)
  const name = norm([first, last].filter(Boolean).join(' '))
  const role = norm(m?.role)
  return role ? `${name || '(No name)'} — ${role}` : (name || '(No name)')
}

const assigneeFilterOptions = computed(() => {
  const p = projectStore.currentProject || {}
  const team = Array.isArray(p.team) ? p.team : []

  const options = team
    .map(m => {
      const id = String(m?._id || m?.id || '').trim()
      if (!id) return null
      return {
        value: id,
        label: teamMemberLabel(m),
        sortKey: `${norm(m?.lastName)}|${norm(m?.firstName)}|${id}`.toLowerCase(),
      }
    })
    .filter(Boolean)

  options.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  return options.map(({ value, label }) => ({ value, label }))
})

const canAutoTagTasksPage = computed(() => {
  const pid = resolvedProjectId.value
  if (!pid) return false
  const p = projectStore.currentProject || {}
  if (p.ai && p.ai.enabled === false) return false
  const tier = String(p.subscriptionTier || '').toLowerCase()
  const hasFeature = p.subscriptionFeatures && (p.subscriptionFeatures.ai === true || p.subscriptionFeatures.AI === true)
  return tier === 'premium' || hasFeature
})

const billRate = computed(() => {
  const v = Number(ui.tasksBillRate)
  return Number.isFinite(v) ? v : 0
})

const isAdmin = computed(() => {
  const u = auth.user
  if (!u || !u.role) return false
  return ['admin', 'globaladmin', 'superadmin'].includes(String(u.role))
})

    const showCostColumn = computed(() => {
      return isAdmin.value && !!ui.showCostColumn
    })

    const activityById = computed(() => {
      const m = {}
      for (const a of (activitiesStore.activities || [])) {
        const id = String(a?.id || a?._id || '')
        if (id) m[id] = a
      }
      return m
    })

    function activityNameForTask(t) {
      const aid = t && t.activityId ? String(t.activityId) : ''
      if (!aid) return ''
      const a = activityById.value[aid]
      return a && a.name ? String(a.name) : aid
    }

    const showDurationColumn = computed(() => ui.showTaskDurationColumn !== false)
    const showStartColumn = computed(() => ui.showTaskStartColumn !== false)
    const showFinishColumn = computed(() => ui.showTaskFinishColumn !== false)
    const showCreateLinkActivityButton = computed(() => ui.showTaskCreateLinkActivityButton !== false)

    const headerColspan = computed(() => {
      // drag + WBS + Name + Actions
      let n = 4
      if (showDurationColumn.value) n += 1
      if (showStartColumn.value) n += 1
      if (showFinishColumn.value) n += 1
      if (showCostColumn.value) n += 1
      return n
    })

function onEditSaved(_res) {
  // close modal and refresh list
  showEditModal.value = false
  fetch()
}

function onEditCancel() {
  showEditModal.value = false
}

function isComplete(t) {
  const effective = pct(t)
  return (t && (effective === 100 || (t.status && String(t.status).toLowerCase() === 'completed')))
}

function openTask(t, evt) {
  try {
    if (!t || !t._id) return
    const target = evt && evt.target ? evt.target : null
    if (target && typeof target.closest === 'function') {
      if (target.closest('button, a, input, textarea, select, label, .drag-handle')) return
    }
    router.push({ name: 'task-edit', params: { id: String(t._id) } })
  } catch (e) { /* ignore */ }
}

// Persist list UI state (search text and view mode) per project in sessionStorage
const listStateKey = computed(() => `tasksListState:${projectStore.currentProjectId || 'global'}`)
function hasSessionStorage() {
  try { return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined' } catch (e) { return false }
}

// Analytics: default from Profile settings, overridden per-session
const analyticsStateKey = computed(() => `tasksListChartsOpen:${projectStore.currentProjectId || 'global'}`)
const showAnalyticsDefault = computed(() => !!auth.user?.contact?.ui?.tasksListChartsDefault)
const showAnalytics = ref(false)
const tasksAnalytics = ref(null)
const tasksAnalyticsLoading = ref(false)

function loadAnalyticsState() {
  if (!hasSessionStorage()) {
    showAnalytics.value = showAnalyticsDefault.value
    return
  }
  try {
    const raw = sessionStorage.getItem(analyticsStateKey.value)
    if (raw === '1') showAnalytics.value = true
    else if (raw === '0') showAnalytics.value = false
    else showAnalytics.value = showAnalyticsDefault.value
  } catch (e) {
    showAnalytics.value = showAnalyticsDefault.value
  }
}

function persistAnalyticsState() {
  if (!hasSessionStorage()) return
  try { sessionStorage.setItem(analyticsStateKey.value, showAnalytics.value ? '1' : '0') } catch (e) { /* ignore */ }
}

async function fetchTasksAnalytics(pid) {
  const projectId = pid || projectStore.currentProjectId
  if (!projectId) return
  tasksAnalyticsLoading.value = true
  try {
    const { data } = await http.get('/api/tasks/analytics', { params: { projectId } })
    tasksAnalytics.value = data || null
  } catch (e) {
    console.error('fetchTasksAnalytics error', e)
  } finally {
    tasksAnalyticsLoading.value = false
  }
}

function toggleAnalytics() {
  showAnalytics.value = !showAnalytics.value
  persistAnalyticsState()
  if (showAnalytics.value) fetchTasksAnalytics().catch(() => {})
}
function loadListState() {
  if (!hasSessionStorage()) return
  try {
    const raw = sessionStorage.getItem(listStateKey.value)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data && typeof data === 'object') {
      if (typeof data.q === 'string') q.value = data.q
      if (typeof data.viewMode === 'string') viewMode.value = data.viewMode
    }
  } catch (e) { /* ignore storage errors */ }
}
function persistListState() {
  if (!hasSessionStorage()) return
  try {
    sessionStorage.setItem(listStateKey.value, JSON.stringify({ q: q.value, viewMode: viewMode.value }))
  } catch (e) { /* ignore storage errors */ }
}
watch(listStateKey, () => loadListState(), { immediate: true })
watch([q, viewMode], () => persistListState())

async function toggleComplete(t, checked) {
  if (!t || !t._id) return

  // Determine descendants by WBS prefix; if present, propagate toggle to all descendants
  const cp = t.wbs ? canonicalDescendantPrefix(String(t.wbs)) : ''
  const toUpdate = []
  if (cp) {
    // include the task itself and all descendants
    const descendants = (tasks.value || []).filter(x => x && x.wbs && String(x.wbs).startsWith(cp))
    toUpdate.push(t)
    for (const d of descendants) toUpdate.push(d)
  } else {
    toUpdate.push(t)
  }

  // Save old values for rollback
  const oldMap = new Map()
  for (const item of toUpdate) {
    oldMap.set(item._id || (item.wbs || ''), { status: item.status, percentComplete: item.percentComplete })
    item.percentComplete = checked ? 100 : 0
    item.status = checked ? 'Completed' : 'Not Started'
  }

  try {
    // Update server-side subtree in one request to avoid partial failures.
    await http.patch(`/api/tasks/subtree/${t._id}`, { projectId: projectStore.currentProjectId, status: checked ? 'Completed' : 'Not Started', percentComplete: checked ? 100 : 0 })
    notifyTasksUpdated()
  } catch (err) {
    const status = err?.response?.status
    const detail = err?.response?.data?.error || err?.message || String(err)

    // Fallback for older deployments/dev servers that don't yet have subtree endpoint.
    if (status === 404) {
      try {
        const patches = toUpdate.map(item => {
          if (!item || !item._id) return Promise.resolve({ ok: true })
          return http.patch(`/api/tasks/${item._id}`, { projectId: projectStore.currentProjectId, status: item.status, percentComplete: item.percentComplete })
            .then(() => ({ ok: true }))
            .catch(e => ({ ok: false, id: item._id, err: e }))
        })
        const res = await Promise.all(patches)
        const failed = res.filter(r => r && r.ok === false)
        if (failed.length > 0) {
          // rollback failed items only
          for (const f of failed) {
            const id = f.id
            const item = (tasks.value || []).find(x => x && x._id === id)
            if (item) {
              const old = oldMap.get(id) || {}
              item.status = old.status
              item.percentComplete = old.percentComplete
            }
          }
          const msg = failed[0]?.err?.response?.data?.error || failed[0]?.err?.message
          try { ui.showError(`Failed to update ${failed.length} task(s)${msg ? `: ${msg}` : ''}`) } catch (e) { /* ignore */ }
        }
        notifyTasksUpdated()
        return
      } catch (e) {
        // fall through to full rollback below
      }
    }

    // revert all on error
    for (const item of toUpdate) {
      const key = item._id || (item.wbs || '')
      const old = oldMap.get(key) || {}
      item.status = old.status
      item.percentComplete = old.percentComplete
    }
    console.error('Failed to update task status', err)
    try { ui.showError(`Failed to update task status${detail ? `: ${detail}` : ''}`) } catch (e) { /* ignore */ }
  }
}

function fmt(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString() } catch (e) { return String(d) } }

function wbsDepth(w) {
  if (!w) return 0
  const segs = parseWbs(w)
  if (!segs.length) return 0
  const last = segs[segs.length - 1]
  if (last === 0) {
    // Treat trailing zero as a placeholder parent (e.g. 1.0) at the same level as its index.
    return Math.max(0, segs.length - 2)
  }
  return Math.max(0, segs.length - 1)
}

const filtered = computed(() => {
  const s = (q.value || '').trim().toLowerCase()
  const terms = s ? s.split(/\s+/).filter(Boolean) : []
  let list = tasks.value || []
  // Exclude soft-deleted tasks (server may mark records with `deleted: true` or status 'Deleted')
  list = list.filter(t => !(t && (t.deleted === true || String(t.status || '').toLowerCase() === 'deleted')))

  const statusNeedle = normLower(statusFilter.value)
  if (statusNeedle) list = list.filter(t => normLower(t?.status) === statusNeedle)

  const assigneeNeedle = normLower(assigneeFilter.value)
  if (assigneeNeedle) list = list.filter(t => normLower(taskAssigneeId(t)) === assigneeNeedle)

  const fromMs = dateInputToMs(dateFrom.value, false)
  const toMs = dateInputToMs(dateTo.value, true)
  if (fromMs !== null || toMs !== null) {
    list = list.filter(t => {
      const startRaw = t?.start || t?.startDate || t?.start_date || null
      const finishRaw = t?.finish || t?.end || t?.endDate || t?.finish_date || null
      const startMs = startRaw ? new Date(startRaw).getTime() : NaN
      const finishMs = finishRaw ? new Date(finishRaw).getTime() : NaN
      const hasStart = Number.isFinite(startMs)
      const hasFinish = Number.isFinite(finishMs)
      if (fromMs !== null) {
        if (!hasStart) return false
        if (startMs < fromMs) return false
      }
      if (toMs !== null) {
        const cmp = hasFinish ? finishMs : (hasStart ? startMs : NaN)
        if (!Number.isFinite(cmp)) return false
        if (cmp > toMs) return false
      }
      return true
    })
  }

  const tagTerms = (tagsFilter.value || '')
    .split(/[,\s]+/)
    .map(v => normLower(v))
    .filter(Boolean)
  if (tagTerms.length) {
    list = list.filter(t => {
      const tags = Array.isArray(t?.tags) ? t.tags : []
      const hay = tags.map(v => normLower(v)).filter(Boolean)
      if (!hay.length) return false
      return tagTerms.every(term => hay.some(tag => tag.includes(term)))
    })
  }

  if (terms.length) {
    list = list.filter(t => {
      const haystack = [
        t?.name,
        t?.title, // some payloads use title instead of name
        t?.description
      ].map(v => String(v || '').toLowerCase()).join(' ')
      return terms.every(term => haystack.includes(term))
    })
  }
  // sort by WBS ascending (string compare). Null/empty WBS go last.
  const sorted = list.slice().sort((a, b) => {
    const A = (a && a.wbs) ? String(a.wbs) : ''
    const B = (b && b.wbs) ? String(b.wbs) : ''
    if (A === B) return (String(a.name || '')).localeCompare(String(b.name || ''))
    if (!A) return 1
    if (!B) return -1
    return A.localeCompare(B, undefined, { numeric: true })
  })

  // apply collapsed filtering: remove any task that is a descendant of a collapsed parent (collapsed stored by _id)
  const taskById = Object.fromEntries((tasks.value || []).map(x => [String(x._id), x]))
  const visibleParentIds = new Set(sorted.map(t => String(t?._id || '')))
  const visible = sorted.filter(t => {
    if (!t || !t.wbs) return true
    const taskId = t && t._id ? String(t._id) : null
    for (const pId of collapsed.value) {
      if (!pId) continue
      if (!visibleParentIds.has(String(pId))) continue
      const parent = taskById[String(pId)]
      if (!parent || !parent.wbs) continue
      if (taskId && taskId === String(pId)) continue
      const cp = canonicalDescendantPrefix(String(parent.wbs))
      if (!cp) continue
      if (cp && String(t.wbs).startsWith(cp)) return false
    }
    return true
  })

  return visible
})

// Re-render Gantt when switching views, changing scale, or updating the visible task set.
// These watchers must be declared after `filtered` to avoid TDZ errors during setup.
watch(viewMode, async (mode) => {
  if (mode !== 'gantt') return
  await nextTick()
  renderGantt()
})

watch(ganttViewMode, async () => {
  if (viewMode.value !== 'gantt') return
  await nextTick()
  renderGantt()
})

watch(filtered, async () => {
  if (viewMode.value !== 'gantt') return
  await nextTick()
  renderGantt()
})

const autoTagTaskItems = computed(() => {
  const list = Array.isArray(filtered.value) ? filtered.value : []
  return list.slice(0, 25).map(t => {
    const id = String(t?._id || t?.id || '').trim()
    if (!id) return null
    const title = String(t?.name || t?.title || '').trim() || `Task ${String(t?.wbs || id)}`
    const subtitle = String(t?.wbs || '').trim()
    const existingTags = Array.isArray(t?.tags) ? t.tags : []
    const entity = {
      taskId: t?.taskId || null,
      wbs: t?.wbs || null,
      name: title,
      status: t?.status || null,
      percentComplete: t?.percentComplete ?? null,
      start: t?.start || null,
      finish: t?.end || t?.finish || null,
      duration: t?.duration ?? null,
      description: String(t?.description || '').trim(),
      notes: String(t?.notes || '').trim(),
      dependencies: Array.isArray(t?.dependencies) ? t.dependencies : [],
    }
    return { id, title, subtitle, existingTags, entity }
  }).filter(Boolean)
})

async function applyTaskTags(id, tags) {
  await http.patch(`/api/tasks/${id}`, { tags })
  const idx = (tasks.value || []).findIndex(x => String(x?._id || x?.id || '') === String(id))
  if (idx >= 0) {
    const current = tasks.value[idx] || {}
    tasks.value[idx] = { ...current, tags: Array.isArray(tags) ? tags : [] }
  }
  notifyTasksUpdated()
}

const xmlFileInput = ref(null)
const csvFileInput = ref(null)
const importing = ref(false)
const showImportModal = ref(false)
const importTab = ref('template') // 'template' | 'upload-xml' | 'upload-csv'
const taskTemplates = ref([])
const templatesLoading = ref(false)
const templatesError = ref('')
const templateQuery = ref('')
const selectedTemplateId = ref('')
const draggingId = ref(null)
const dragOverIndex = ref(-1)
const dragOverPos = ref('') // 'above' | 'on' | 'below'
const collapsed = ref([]) // array of task _id strings that are collapsed

function storageKey() {
  return `tasks_collapsed_${projectStore.currentProjectId || 'global'}`
}

function loadCollapsed() {
  try {
    const key = storageKey()
    const raw = localStorage.getItem(key)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) collapsed.value = arr
    }
  } catch (e) {
    console.error('loadCollapsed error', e)
    collapsed.value = []
  }
}

function saveCollapsed() {
  try {
    const key = storageKey()
    localStorage.setItem(key, JSON.stringify(collapsed.value || []))
  } catch (e) { console.error('saveCollapsed error', e) }
}

function collapseAll() {
  // Collapse to top-most parents only (prefer WBS entries that end with a trailing 0,
  // e.g. `1.0`). If none with trailing 0 exist, pick the shallowest parents (minimum WBS depth).
  const parents = (tasks.value || []).filter(t => hasChildren(t) && t._id)
  if (!parents || parents.length === 0) {
    collapsed.value = []
    return
  }

  // Prefer parents whose last WBS segment is 0 (e.g. 1.0)
  const zeroParents = parents.filter(p => {
    try { const segs = parseWbs(String(p.wbs || '')); return segs.length > 0 && (segs[segs.length - 1] === 0) } catch (e) { return false }
  })

  let candidates = zeroParents.length ? zeroParents : parents
  // reduce to the shallowest (top-most) parents by WBS depth
  let minDepth = Infinity
  const byDepth = {}
  for (const p of candidates) {
    const segs = parseWbs(String(p.wbs || ''))
    const d = segs.length || 0
    minDepth = Math.min(minDepth, d)
    if (!byDepth[d]) byDepth[d] = []
    byDepth[d].push(p)
  }
  const topMost = byDepth[minDepth] || []

  // Ensure at least one task remains visible: collapsing parents hides descendants but leaves parents visible.
  // If for some reason topMost is empty, fallback to not collapsing.
  if (!topMost || topMost.length === 0) {
    collapsed.value = []
    return
  }

  collapsed.value = topMost.map(p => String(p._id))
}

function expandAll() {
  collapsed.value = []
}

function persistBillRateSetting() {
  ui.setTasksBillRate(billRateInput.value)
}

// persist collapsed state when it changes
watch(collapsed, () => saveCollapsed())
// when project changes, reload persisted collapsed state
watch(() => projectStore.currentProjectId, () => {
  loadCollapsed()
  loadAnalyticsState()
  if (showAnalytics.value) fetchTasksAnalytics().catch(() => {})
  fetch()
  handleImportDeepLink().catch(() => {})
})
// when tasks change we may want to reload persisted collapsed ids to keep consistency
watch(tasks, () => { /* noop placeholder - keep collapsed ids by id, no action needed */ })
watch(() => ui.tasksBillRate, (v) => {
  const num = Number(v)
  billRateInput.value = Number.isFinite(num) ? num : 0
  clearCaches()
})
watch(billRate, () => clearCaches())

function canonicalDescendantPrefix(parentWbs) {
  if (!parentWbs) return ''
  const segs = parseWbs(parentWbs)
  const last = segs[segs.length - 1] || 0
  if (last === 0) {
    const base = segs.slice(0, -1).join('.')
    if (base) return base + '.'
    const joined = segs.join('.')
    return joined ? joined + '.' : ''
  }
  return parentWbs + '.'
}

function isCollapsed(t) {
  if (!t || !t._id) return false
  return collapsed.value.includes(String(t._id))
}

function toggleCollapse(t) {
  if (!t || !t._id) return
  const key = String(t._id)
  if (collapsed.value.includes(key)) {
    collapsed.value = collapsed.value.filter(x => x !== key)
  } else {
    collapsed.value = [...collapsed.value, key]
  }
}

function hasChildren(t) {
  if (!t || !t.wbs) return false
  const cp = canonicalDescendantPrefix(String(t.wbs))
  if (!cp) return false
  return (tasks.value || []).some(x => {
    if (!x.wbs) return false
    if (String(x.wbs) === String(t.wbs)) return false
    return String(x.wbs).startsWith(cp)
  })
}

function getImmediateChildren(parent) {
  // Determine immediate children purely by WBS semantics.
  // Rules:
  // - If parent WBS ends with a trailing 0 (e.g. "1.0"), its direct children are
  //   the WBS values that share the prefix up to the trailing 0 (e.g. "1.*")
  //   and have the same segment length as the parent (so "1.1" is a child of "1.0").
  // - Otherwise, direct children are those with exactly one more segment and whose
  //   prefix matches the parent's full WBS (e.g. "1.1" is a child of "1" and
  //   "1.1.1" is a child of "1.1").
  if (!parent || !parent.wbs) return []
  const parentWbs = String(parent.wbs)
  const parentSegs = parseWbs(parentWbs)
  const last = parentSegs[parentSegs.length - 1] || 0

  let basePrefix = ''
  let childDepth = 0
  if (last === 0) {
    // children live at the same depth, replacing trailing 0
    basePrefix = parentSegs.slice(0, -1).join('.')
    childDepth = parentSegs.length
  } else {
    // children are one segment deeper under the full parentWbs
    basePrefix = parentWbs
    childDepth = parentSegs.length + 1
  }

  return (tasks.value || []).filter(x => {
    if (!x || !x.wbs) return false
    const k = String(x.wbs)
    if (k === parentWbs) return false
    const segs = parseWbs(k)
    if (segs.length !== childDepth) return false
    if (!basePrefix) return true
    return k.startsWith(basePrefix + '.')
  })
}

function computePercentRecursive(task, seen = new Set()) {
  if (!task) return 0
  const id = task._id || String(task.wbs || '')
  if (percentCache.has(id)) return percentCache.get(id)
  if (seen.has(id)) return 0
  seen.add(id)

  const children = getImmediateChildren(task)
  if (!children || children.length === 0) {
    const p = Number(task.percentComplete)
    const val = Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : 0
    percentCache.set(id, val)
    return val
  }

  // simple average of immediate children's percents (each child equal weight)
  let sum = 0
  for (const c of children) {
    const childPercent = computePercentRecursive(c, seen)
    sum += childPercent
  }
  const avg = children.length > 0 ? (sum / children.length) : 0
  const out = Math.max(0, Math.min(100, Math.round(avg)))
  percentCache.set(id, out)
  return out
}

function pct(t) {
  // prefer computed percent if task has children
  const children = getImmediateChildren(t)
  if (children && children.length > 0) return computePercentRecursive(t)
  const p = Number(t && t.percentComplete)
  return Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : 0
}

// Memoization caches for a single render/fetch pass to speed recursive computations
const percentCache = new Map()
const durationCache = new Map()
const costCache = new Map()
const startCache = new Map()
const endCache = new Map()

function clearCaches() {
  percentCache.clear()
  durationCache.clear()
  costCache.clear()
  startCache.clear()
  endCache.clear()
}

// Clear caches when tasks list changes (deep watch to catch mutations)
watch(tasks, () => clearCaches(), { deep: true })

function computeDurationRecursive(task, seen = new Set()) {
  if (!task) return null
  const id = task._id || String(task.wbs || '')
  if (durationCache.has(id)) return durationCache.get(id)
  if (seen.has(id)) return null
  seen.add(id)

  const children = getImmediateChildren(task)
  if (!children || children.length === 0) {
    const d = task && typeof task.duration === 'number' && Number.isFinite(task.duration) ? task.duration : null
    durationCache.set(id, d)
    return d
  }

  let sum = 0
  let any = false
  for (const c of children) {
    const cd = computeDurationRecursive(c, seen)
    if (cd != null) {
      sum += cd
      any = true
    }
  }
  // Parent duration is strictly the sum of its children's durations
  const out = any ? sum : null
  durationCache.set(id, out)
  return out
}

function dur(t) {
  const children = getImmediateChildren(t)
  if (children && children.length > 0) {
    return computeDurationRecursive(t)
  }
  return (t && typeof t.duration === 'number' && Number.isFinite(t.duration)) ? t.duration : null
}

function usesManualCost(task) {
  return task && task.autoCost === false
}

function numberOrZero(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function expensesTotalValue(task) {
  const e = (task && task.expenses && typeof task.expenses === 'object') ? task.expenses : {}
  return [
    e.airfare,
    e.hotel,
    e.rentalCar,
    e.food,
    e.mileage,
    e.labor,
    e.other1,
    e.other2
  ].map(numberOrZero).reduce((a, b) => a + b, 0)
}

function autoCostValue(task) {
  if (!task) return null
  const rate = billRate.value
  const duration = Number(task.duration)
  if (!Number.isFinite(rate) || !Number.isFinite(duration)) return null
  const calc = (duration * rate) + expensesTotalValue(task)
  return Number.isFinite(calc) ? Number(calc.toFixed(2)) : null
}

function taskCostValue(task) {
  if (!task) return null
  if (usesManualCost(task)) {
    const c = Number(task.cost)
    return Number.isFinite(c) ? c : null
  }
  const autoVal = autoCostValue(task)
  if (autoVal != null) return autoVal
  const fallback = Number(task.cost)
  return Number.isFinite(fallback) ? fallback : null
}

function formatCurrency(val) {
  if (!Number.isFinite(val)) return ''
  return `$${val.toFixed(2)}`
}

function computeCostRecursive(task, seen = new Set()) {
  if (!task) return null
  const id = task._id || String(task.wbs || '')
  if (costCache.has(id)) return costCache.get(id)
  if (seen.has(id)) return null
  seen.add(id)

  const children = getImmediateChildren(task)
  if (!children || children.length === 0) {
    const leafCost = taskCostValue(task)
    costCache.set(id, leafCost)
    return leafCost
  }

  let sum = 0
  let any = false
  const childDetails = []
  for (const c of children) {
    const cc = computeCostRecursive(c, seen)
    childDetails.push({ id: c && c._id, wbs: c && c.wbs, cost: cc })
    if (cc != null) { sum += cc; any = true }
  }
  // Parent cost is strictly the sum of its children's costs
  const out = any ? sum : null
  // Temporary debug: log details when a parent computes a non-null cost
  try {
    if (typeof console !== 'undefined') {
      console.debug('[tasks] computeCostRecursive:', { id, wbs: task && task.wbs, childDetails, sum, out })
    }
  } catch (e) { /* ignore */ }
  costCache.set(id, out)
  return out
}

function costVal(t) {
  const children = getImmediateChildren(t)
  if (children && children.length > 0) return computeCostRecursive(t)
  return taskCostValue(t)
}

function parseDate(val) {
  if (!val && val !== 0) return null
  const s = String(val).trim()
  // try native parse/ISO
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  // try mm/dd/yyyy or mm/dd/yyyy HH:MM
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (m) {
    const mm = parseInt(m[1], 10)
    const dd = parseInt(m[2], 10)
    const yyyy = parseInt(m[3], 10)
    const hh = m[4] ? parseInt(m[4], 10) : 0
    const min = m[5] ? parseInt(m[5], 10) : 0
    return new Date(yyyy, mm - 1, dd, hh, min, 0, 0)
  }
  return null
}

function computeStartRecursive(task, seen = new Set()) {
  if (!task) return null
  const id = task._id || String(task.wbs || '')
  if (startCache.has(id)) return startCache.get(id)
  if (seen.has(id)) return null
  seen.add(id)

  const children = getImmediateChildren(task)
  if (!children || children.length === 0) {
    const sd = parseDate(task.start)
    startCache.set(id, sd)
    return sd
  }

  let earliest = null
  for (const c of children) {
    const sd = computeStartRecursive(c, seen)
    if (sd instanceof Date && !isNaN(sd.getTime())) {
      if (earliest === null || sd < earliest) earliest = sd
    }
  }
  startCache.set(id, earliest)
  return earliest
}

function startVal(t) {
  const children = getImmediateChildren(t)
  if (children && children.length > 0) return computeStartRecursive(t)
  return parseDate(t.start)
}

function computeEndRecursive(task, seen = new Set()) {
  if (!task) return null
  const id = task._id || String(task.wbs || '')
  if (endCache.has(id)) return endCache.get(id)
  if (seen.has(id)) return null
  seen.add(id)

  const children = getImmediateChildren(task)
  if (!children || children.length === 0) {
    const ed = parseDate(task.end)
    endCache.set(id, ed)
    return ed
  }

  let latest = null
  for (const c of children) {
    const ed = computeEndRecursive(c, seen)
    if (ed instanceof Date && !isNaN(ed.getTime())) {
      if (latest === null || ed > latest) latest = ed
    }
  }
  endCache.set(id, latest)
  return latest
}

function endVal(t) {
  const children = getImmediateChildren(t)
  if (children && children.length > 0) return computeEndRecursive(t)
  return parseDate(t.end)
}

function descendantCount(t) {
  if (!t || !t.wbs) return 0
  const cp = canonicalDescendantPrefix(String(t.wbs))
  if (!cp) return 0
  let cnt = 0
  for (const x of (tasks.value || [])) {
    if (!x.wbs) continue
    if (String(x.wbs) === String(t.wbs)) continue
    if (String(x.wbs).startsWith(cp)) cnt++
  }
  return cnt
}

function onXmlFileSelected(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  uploadFile(f, 'xml').catch(() => {})
}

function onCsvFileSelected(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  uploadFile(f, 'csv').catch(() => {})
}

function asBoolQuery(v) {
  const s = String(v || '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes'
}

function normalizeImportTab(v) {
  const s = String(v || '').trim().toLowerCase()
  if (s === 'template') return 'template'
  if (s === 'upload-xml' || s === 'xml') return 'upload-xml'
  if (s === 'upload-csv' || s === 'csv') return 'upload-csv'
  return null
}

function openImportModal() {
  showImportModal.value = true
  importTab.value = 'template'
  selectedTemplateId.value = ''
  loadTaskTemplates().catch(() => {})
}

async function handleImportDeepLink() {
  if (!projectStore.currentProjectId) return
  const shouldOpen = asBoolQuery(route.query.import) || asBoolQuery(route.query.openImport)
  if (!shouldOpen) return

  const nextTab = normalizeImportTab(route.query.tab)
  const nextQuery = String(route.query.templateQ || route.query.q || '').trim()

  showImportModal.value = true
  importTab.value = nextTab || 'template'
  selectedTemplateId.value = ''

  if (importTab.value === 'template') {
    templateQuery.value = nextQuery
    await loadTaskTemplates()
  }

  // Clear query params so we don't reopen on subsequent reactive updates.
  const next = { ...route.query }
  delete next.import
  delete next.openImport
  delete next.tab
  delete next.templateQ
  delete next.q
  router.replace({ query: next }).catch(() => {})
}

async function loadTaskTemplates() {
  if (!projectStore.currentProjectId) return
  templatesLoading.value = true
  templatesError.value = ''
  try {
    const { data } = await http.get('/api/tasks/templates', { params: { projectId: projectStore.currentProjectId, q: templateQuery.value || '' } })
    taskTemplates.value = (data && data.templates) ? data.templates : []
  } catch (err) {
    taskTemplates.value = []
    templatesError.value = err?.response?.data?.error || err?.message || String(err)
  } finally {
    templatesLoading.value = false
  }
}

async function importFromTemplate() {
  if (!projectStore.currentProjectId) return alert('Select a project first')
  if (!selectedTemplateId.value) return
  importing.value = true
  try {
    const resp = await http.post('/api/tasks/import-template', { projectId: projectStore.currentProjectId, templateId: selectedTemplateId.value })
    const count = resp.data && resp.data.imported ? resp.data.imported : 0
    ui.showInfo(`Imported ${count} tasks`)
    showImportModal.value = false
    await fetch()
  } catch (err) {
    const msg = err?.response?.data?.error || err?.message || String(err)
    ui.showError(`Import failed: ${msg}`)
  } finally {
    importing.value = false
  }
}

function onDragStart(t, e) {
  draggingId.value = t && t._id ? t._id : null
  try { e.dataTransfer.setData('text/plain', draggingId.value) } catch (err) { console.error(err) }
  e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(e, idx) {
  dragOverIndex.value = idx
  const row = e.currentTarget
  if (!row) { dragOverPos.value = 'on'; return }
  const rect = row.getBoundingClientRect()
  const y = e.clientY - rect.top
  const h = rect.height
  if (y < h * 0.33) dragOverPos.value = 'above'
  else if (y > h * 0.66) dragOverPos.value = 'below'
  else dragOverPos.value = 'on'
}

function onDragLeave() {
  dragOverIndex.value = -1
  dragOverPos.value = ''
}

async function onDrop(e, idx) {
  const draggedId = (e.dataTransfer && e.dataTransfer.getData && e.dataTransfer.getData('text/plain')) || draggingId.value
  if (!draggedId) return onDragLeave()
  const list = filtered.value
  const target = list[idx]
  if (!target) return onDragLeave()
  const dragged = tasks.value.find(x => x._id === draggedId)
  if (!dragged) return onDragLeave()

  // if dropped on same task, do nothing
  if (dragged._id === target._id) { onDragLeave(); return }

  // compute mapping of oldWbs -> newWbs for affected tasks
  const updates = computeWbsReorder(tasks.value, dragged, target, dragOverPos.value)

  if (!updates || Object.keys(updates).length === 0) { onDragLeave(); return }

  // apply locally
  for (const t of tasks.value) {
    if (updates[t.wbs]) {
      t.wbs = updates[t.wbs]
    }
  }

  // Simpler approach: send PATCH for every task whose _id is in updates map by matching start of old prefix
  const patchPromises = []
  // we need original list snapshot to know old wbs values
  const snapshot = await http.get('/api/tasks', { params: { projectId: projectStore.currentProjectId, limit: 1000 } }).then(r => r.data.tasks || []).catch(() => tasks.value)
  for (const s of snapshot) {
    const old = s.wbs || ''
    if (updates[old]) {
      const newW = updates[old]
      patchPromises.push(http.patch(`/api/tasks/${s._id}`, { wbs: newW }).catch(() => {}))
    }
  }

  try {
    await Promise.all(patchPromises)
  } catch (err) {
    console.error('onDrop patch error', err)
    // ignore for now; could re-fetch
  }

  notifyTasksUpdated()
  onDragLeave()
}

function parseWbs(w) {
  if (!w) return []
  return String(w).split('.').map(s => { const n = parseInt(s, 10); return Number.isNaN(n) ? 0 : n })
}

function joinWbs(segments) {
  return segments.join('.')
}

function computeWbsReorder(allTasks, dragged, target, pos) {
  // Build map oldWbs -> newWbs
  const map = {}
  const byWbs = Object.fromEntries((allTasks || []).map(t => [String(t.wbs || ''), t]))

  const targetWbs = String(target.wbs || '')
  const draggedWbs = String(dragged.wbs || '')

  if (pos === 'on') {
    // Make dragged a child of target.
    // Special handling: if target ends with a trailing zero (e.g. "1.0") then
    // its children should be numbered like "1.1", "1.2" (replace the trailing 0),
    // not as deeper nodes like "1.0.1". Otherwise create deeper children under target.
    const targetSegs = parseWbs(targetWbs)
    const targetLast = targetSegs[targetSegs.length - 1] || 0

    // Determine base prefix where direct children are numbered
    // If target ends with 0, children live at the same depth as target (replace trailing 0)
    // Otherwise children are one level deeper under the full targetWbs
    let childBasePrefix = ''
    let childBaseLevel = 0
    if (targetLast === 0) {
      childBasePrefix = targetSegs.slice(0, -1).join('.')
      childBaseLevel = targetSegs.length - 1
    } else {
      childBasePrefix = targetWbs
      childBaseLevel = targetSegs.length
    }

    // find direct children under childBasePrefix (exactly one segment deeper than base)
    const children = Object.keys(byWbs).filter(k => {
      const segs = parseWbs(k)
      const prefixMatch = childBasePrefix ? k.startsWith(childBasePrefix + '.') : true
      if (!prefixMatch) return false
      return segs.length === (childBaseLevel + 1)
    })

    let max = 0
    for (const c of children) {
      const segs = parseWbs(c)
      const last = segs[segs.length - 1] || 0
      if (last > max) max = last
    }

    const newLast = max + 1
    const newW = childBasePrefix ? (childBasePrefix + '.' + newLast) : String(newLast)

    // update dragged and its descendants (move subtree) by replacing the dragged prefix
    for (const k of Object.keys(byWbs)) {
      if (k === draggedWbs || k.startsWith(draggedWbs + '.')) {
        map[k] = k.replace(draggedWbs, newW)
      }
    }
    return map
  }

  // For 'above' or 'below' we insert among siblings of target
  const targetSegs = parseWbs(targetWbs)
  const parentPrefix = targetSegs.slice(0, -1).join('.')
  const targetIndex = targetSegs[targetSegs.length - 1] || 0

  // Determine insertion index: if above -> insert at targetIndex, shifting target and later siblings up by 1
  // if below -> insert at targetIndex + 1, shifting later siblings starting at that index up by 1
  const insertAt = (pos === 'above') ? targetIndex : (targetIndex + 1)

  // collect siblings under same parent
  const siblings = Object.keys(byWbs).filter(k => {
    const segs = parseWbs(k)
    const p = segs.slice(0, -1).join('.')
    return p === parentPrefix
  }).map(k => ({ w: k, segs: parseWbs(k) }))
  // sort siblings by numeric segments
  siblings.sort((a, b) => a.w.localeCompare(b.w, undefined, { numeric: true }))

  // For each sibling with last segment >= insertAt, increment last segment by 1 (and adjust descendants)
  for (const s of siblings) {
    const last = s.segs[s.segs.length -1] || 0
    if (last >= insertAt) {
      const oldPrefix = s.w
      const newSegs = s.segs.slice()
      newSegs[newSegs.length -1] = last + 1
      const newW = joinWbs(newSegs)
      // update sibling and its descendants
      for (const k of Object.keys(byWbs)) {
        if (k === oldPrefix || k.startsWith(oldPrefix + '.')) {
          map[k] = k.replace(oldPrefix, newW)
        }
      }
    }
  }

  // Now assign dragged to the insert position under parentPrefix
  const newLast = insertAt
  // build string newW
  const newW = parentPrefix ? (parentPrefix + '.' + newLast) : String(newLast)
  for (const k of Object.keys(byWbs)) {
    if (k === draggedWbs || k.startsWith(draggedWbs + '.')) {
      map[k] = k.replace(draggedWbs, newW)
    }
  }

  return map
}

async function uploadFile(file, format) {
  if (!projectStore.currentProjectId) return alert('Select a project first')
  importing.value = true
  try {
    const projectId = String(projectStore.currentProjectId || '')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('projectId', projectId)
    const fmt = String(format || '').toLowerCase()
    const baseUrl = (fmt === 'csv' || fmt === 'xml') ? `/api/tasks/import?format=${encodeURIComponent(fmt)}` : '/api/tasks/import'
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}projectId=${encodeURIComponent(projectId)}`
    // Don't manually set Content-Type for FormData; the browser will include the required boundary.
    const resp = await http.post(url, fd)
    // show brief feedback then refresh
    const count = resp.data && resp.data.imported ? resp.data.imported : 0
    try { ui.showInfo(`Imported ${count} tasks`) } catch (e) { /* ignore */ }
    showImportModal.value = false
    await fetch()
  } catch (err) {
    const msg = err && err.response && err.response.data && err.response.data.error ? err.response.data.error : (err.message || err)
    try { ui.showError(`Import failed: ${msg}`) } catch (e) { /* ignore */ }
  } finally {
    importing.value = false
    try { if (xmlFileInput.value) xmlFileInput.value.value = '' } catch (_) { /* ignore */ }
    try { if (csvFileInput.value) csvFileInput.value.value = '' } catch (_) { /* ignore */ }
  }
}

const TASKS_UPDATED_EVENT = 'cxma:tasks-updated'
let tasksUpdatedTimer = null
function notifyTasksUpdated() {
  try {
    const pid = String(projectStore.currentProjectId || '').trim()
    if (!pid) return
    if (typeof window === 'undefined') return
    if (tasksUpdatedTimer) clearTimeout(tasksUpdatedTimer)
    tasksUpdatedTimer = setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent(TASKS_UPDATED_EVENT, { detail: { projectId: pid, at: Date.now() } }))
      } catch (e) { /* ignore */ }
    }, 150)
  } catch (e) { /* ignore */ }
}

async function fetch() {
  if (!projectStore.currentProjectId) return
  loading.value = true
  try {
    const resp = await http.get('/api/tasks', { params: { projectId: projectStore.currentProjectId, limit: 200 } })
    tasks.value = resp.data.tasks || []
    notifyTasksUpdated()
    try { await activitiesStore.fetchActivities(projectStore.currentProjectId) } catch (e) { /* ignore */ }
    if (showAnalytics.value) fetchTasksAnalytics(projectStore.currentProjectId).catch(() => {})
  } catch (e) {
    tasks.value = []
  } finally { loading.value = false }
}

async function createAndLinkActivityForTask(t) {
  if (!t || !t._id) return
  if (t.activityId) return
  const pid = String(projectStore.currentProjectId || '')
  if (!pid) return
  try {
    const now = new Date().toISOString()
    const name = t.name ? String(t.name) : `Task ${t._id}`
    const created = await http.post('/api/activities', {
      projectId: pid,
      name,
      type: 'Other',
      startDate: now,
      endDate: now
    }).then(r => r.data)
    const aid = created && (created._id || created.id) ? String(created._id || created.id) : ''
    if (!aid) throw new Error('Activity not created')

    await http.patch(`/api/tasks/${t._id}`, { projectId: pid, activityId: aid })
    t.activityId = aid
    // refresh cached activities so name lookup works immediately
    try { await activitiesStore.fetchActivities(pid) } catch (e) { /* ignore */ }
    try { ui.showSuccess('Activity created and linked') } catch (e) { /* ignore */ }
  } catch (e) {
    console.error('createAndLinkActivityForTask error', e)
    const msg = e?.response?.data?.error || e?.message || 'Failed to create/link activity'
    try { ui.showError(msg) } catch (ee) { /* ignore */ }
  }
}

onMounted(() => {
  loadAnalyticsState()
  fetch()
  loadCollapsed()
  if (showAnalytics.value) fetchTasksAnalytics().catch(() => {})
  handleImportDeepLink().catch(() => {})

  const pid = String(resolvedProjectId.value || '').trim()
  const uid = auth.user?._id ? String(auth.user._id) : null
  if (pid) {
    runCoachmarkOnce('tasks.list.toolbar.tip', { projectId: pid, userId: uid }, () => {
      ui.showInfo('Tip: Use Analytics for quick insights, and Auto-tag to suggest tags from your project tag library.', { duration: 10000 })
    })
  }
})

watch(showImportModal, (open) => {
  if (!open) return
  const pid = String(resolvedProjectId.value || '').trim()
  const uid = auth.user?._id ? String(auth.user._id) : null
  if (!pid) return
  runCoachmarkOnce('tasks.import.modal.tip', { projectId: pid, userId: uid }, () => {
    ui.showInfo('Tip: Choose either CSV or XML for an import. CSV supports previewing the first 50 tasks before importing.', { duration: 10000 })
  })
})

function confirmDelete(t) {
  deletingId.value = t && t._id ? t._id : null
  deletingName.value = t && t.name ? t.name : ''
  // compute how many tasks will be removed (the task itself + descendants by WBS)
  let count = 1
  try {
    if (t && t.wbs) {
      const prefix = String(t.wbs)
      count = (tasks.value || []).filter(x => x && x.wbs && (String(x.wbs) === prefix || String(x.wbs).startsWith(prefix + '.'))).length
      if (!count) count = 1
    }
  } catch (e) { count = 1 }
  deletingCount.value = count
  showDeleteModal.value = true
}

function cancelDelete() { deletingId.value = null; deletingName.value = ''; deletingCount.value = 0; showDeleteModal.value = false }

async function doDelete() {
  if (!deletingId.value) return
  try {
    // Use server-side subtree delete for consistency and efficiency.
    // Use hard delete so tasks are actually removed from the DB (not just hidden via soft-delete).
    const resp = await http.delete(`/api/tasks/subtree/${deletingId.value}`, { params: { hard: true } })
    const data = resp && resp.data ? resp.data : {}
    const ids = Array.isArray(data.ids) ? data.ids.map(String) : []

    if (ids.length > 0) {
      const idSet = new Set(ids)
      tasks.value = (tasks.value || []).filter(t => !idSet.has(String(t._id)))
    } else {
      // fallback: remove the single id locally
      tasks.value = (tasks.value || []).filter(x => x._id !== deletingId.value)
    }
    try {
      ui.showSuccess(deletingCount.value > 1 ? `Deleted ${deletingCount.value} tasks` : 'Task deleted')
    } catch (e) { /* ignore */ }
    // Ensure UI is consistent with server state.
    await fetch()
  } catch (e) {
    console.error('Failed to delete tasks', e)
    const msg = e?.response?.data?.error || e?.message || 'Failed to delete task(s)'
    try { ui.showError(msg) } catch (ee) { /* ignore */ }
  } finally {
    // close modal and reset deleting state
    try { cancelDelete() } catch (e) { deletingId.value = null }
  }
}
</script>

<style scoped>
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  height: 0 !important;
}
.drop-enter-active,
.drop-leave-active {
  transition: all 220ms ease;
}
.drop-enter-active {
  transition: all 220ms ease;
}
.drop-enter-to,
.drop-leave-from {
  opacity: 1;
  transform: translateY(0);
  height: 1.5rem !important;
}
.drop-move {
  transition: transform 200ms ease;
}

/* Compact rows: reduce vertical spacing by ~25% */
.compact-rows td,
.compact-rows th {
  padding-top: 0.375rem; /* 0.5rem * 0.75 */
  padding-bottom: 0.375rem;
}
.compact-rows .drag-handle {
  height: 1.3125rem !important; /* 1.75rem * 0.75 */
  width: 1.3125rem !important;
}
.compact-rows tr.h-6 {
  height: 1.125rem !important; /* 1.5rem * 0.75 */
}
.compact-rows .drop-enter-to,
.compact-rows .drop-leave-from {
  height: 1.125rem !important;
}
</style>
