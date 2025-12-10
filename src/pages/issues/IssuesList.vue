<template>
  <!-- Make this section the positioning context for the toast so it spans the RouterView area (right side without the sidebar) -->
  <section
    ref="pageSection"
    class="space-y-6 relative w-full min-w-0"
  >
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Issues', to: '/issues' }
        ]"
      />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 gap-y-2 min-w-0">
      <!-- Left group: add, search, filters -->
      <div class="flex items-center gap-3">
        <div class="relative inline-block group">
          <button
            :disabled="!projectStore.currentProjectId"
            aria-label="Add issue"
            aria-describedby="add-issue-tooltip"
            :title="!projectStore.currentProjectId ? 'Select a project first' : 'Add issue'"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
            @click="openAddModal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <div
            id="add-issue-tooltip"
            role="tooltip"
            class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
          >
            {{ projectStore.currentProjectId ? 'Add issue' : 'Select a project to add issues' }}
          </div>
        </div>

        <!-- Search input -->
        <div class="relative">
          <input
            ref="searchInput"
            v-model="searchQuery"
            placeholder="Search issues..."
            class="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 hidden sm:inline-block w-64 pr-8"
          >
          <button
            v-if="searchQuery"
            class="absolute right-1 top-1/2 -translate-y-1/2 text-white/60 px-2 py-1 rounded"
            @click="clearSearch"
          >
            ✕
          </button>
        </div>

        <!-- Filters -->
        <div class="flex flex-wrap items-center gap-3 gap-y-2">
          <label class="text-white/70 text-sm">Filter</label>
          <div class="flex items-center gap-2">
            <label class="text-white/70 text-sm">Type</label>
            <div
              ref="typeMenuRef"
              class="relative"
            >
              <button
                :aria-expanded="showTypeMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[12rem] justify-between"
                @click="toggleTypeMenu"
              >
                <span class="flex items-center gap-2">
                  <span>{{ typeFilter }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ typeCount(typeFilter) }}</span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-3 h-3 ml-1"
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </button>
              <div
                v-if="showTypeMenu"
                class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
                role="menu"
              >
                <div class="py-1">
                  <button
                    v-for="opt in typeOptions"
                    :key="opt.name"
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', typeFilter === opt.name ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="typeFilter = opt.name; closeTypeMenu()"
                  >
                    <span>{{ opt.name }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-white/70 text-sm">Priority</label>
            <div
              ref="priorityMenuRef"
              class="relative"
            >
              <button
                :aria-expanded="showPriorityMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[12rem] justify-between"
                @click="togglePriorityMenu"
              >
                <span class="flex items-center gap-2">
                  <span>{{ priorityFilter }}</span>
                  <span :class="priorityBadgeClass(priorityFilter) + ' text-xs px-2 py-0.5 rounded-full'">{{ priorityCount(priorityFilter) }}</span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-3 h-3 ml-1"
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </button>
              <div
                v-if="showPriorityMenu"
                class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
                role="menu"
              >
                <div class="py-1">
                  <button
                    v-for="opt in priorityOptions"
                    :key="opt.name"
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', priorityFilter === opt.name ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="priorityFilter = opt.name; closePriorityMenu()"
                  >
                    <span class="inline-flex items-center gap-2">
                      <span
                        class="inline-block w-2.5 h-2.5 rounded-full"
                        :class="priorityBgClass(opt.name)"
                      />
                      <span>{{ opt.name }}</span>
                    </span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <label class="text-white/70 text-sm">Status</label>
            <div
              ref="statusMenuRef"
              class="relative"
            >
              <button
                :aria-expanded="showStatusMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[12rem] justify-between"
                @click="toggleStatusMenu"
              >
                <span class="flex items-center gap-2">
                  <span>{{ statusFilter }}</span>
                  <span :class="statusBadgeClass(statusFilter) + ' text-xs px-2 py-0.5 rounded-full'">{{ statusCount(statusFilter) }}</span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-3 h-3 ml-1"
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </button>
              <div
                v-if="showStatusMenu"
                class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
                role="menu"
              >
                <div class="py-1">
                  <button
                    v-for="opt in statusOptions"
                    :key="opt.name"
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', statusFilter === opt.name ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="statusFilter = opt.name; closeStatusMenu()"
                  >
                    <span class="inline-flex items-center gap-2">
                      <span
                        class="inline-block w-2.5 h-2.5 rounded-full"
                        :class="statusBgClass(opt.name)"
                      />
                      <span>{{ opt.name }}</span>
                    </span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right group: hide closed + downloads -->
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <input
            id="hideClosedChk"
            v-model="hideClosed"
            type="checkbox"
            class="form-checkbox h-4 w-4 rounded bg-white/10 border-white/30 text-white/80"
          >
          <label
            for="hideClosedChk"
            class="text-white/70 text-sm select-none"
          >Hide closed</label>
        </div>

        <div
          ref="downloadsRef"
          class="relative"
        >
          <button
            :aria-expanded="showDownloadsMenu ? 'true' : 'false'"
            class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2"
            @click="toggleDownloadsMenu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <span>Downloads</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-3 h-3 ml-1"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <div
            v-if="showDownloadsMenu"
            class="absolute right-0 mt-2 w-64 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
          >
            <div
              class="py-1"
              role="menu"
            >
              <button
                role="menuitem"
                class="w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 inline-flex items-center gap-2"
                @click="onChooseColumnsClick"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                    stroke-width="1.5"
                  />
                  <path
                    d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.8v.2a2 2 0 1 1-4 0v-.1a1 1 0 0 0-.7-.8 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.8-.6H5a2 2 0 1 1 0-4h.1a1 1 0 0 0 .8-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.8V5a2 2 0 1 1 4 0v.1a1 1 0 0 0 .7.8h.1a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .8.6H19a2 2 0 1 1 0 4h-.1a1 1 0 0 0-.8.6Z"
                    stroke-width="1.5"
                  />
                </svg>
                <span>Choose columns</span>
              </button>
              <div class="my-1 h-px bg-white/10" />
              <button
                :disabled="!filteredIssues.length"
                role="menuitem"
                class="w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 inline-flex items-center gap-2 disabled:opacity-40"
                @click="onDownloadCsvClick"
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
                  <path
                    d="M5 20h14"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
                <span>Download CSV</span>
              </button>
              <button
                :disabled="!filteredIssues.length"
                role="menuitem"
                class="w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 inline-flex items-center gap-2 disabled:opacity-40"
                @click="onDownloadXlsxClick"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    ry="2"
                    stroke-width="1.5"
                  />
                  <path
                    d="M8 3v18M16 3v18M3 8h18M3 16h18"
                    stroke-width="1.5"
                  />
                </svg>
                <span>Download Excel</span>
              </button>
              <div class="my-1 h-px bg-white/10" />
              <div class="px-3 py-1 text-xs text-white/60">
                Reports
              </div>
              <button
                :disabled="!filteredIssues.length"
                role="menuitem"
                class="w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 inline-flex items-center gap-2 disabled:opacity-40"
                @click="onDownloadDetailedReport"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                    stroke-width="1.5"
                  />
                  <path
                    d="M14 2v6h6"
                    stroke-width="1.5"
                  />
                  <path
                    d="M9 15h3a2 2 0 1 0 0-4H9v6z"
                    stroke-width="1.5"
                  />
                </svg>
                <span>Detailed PDF (one per issue)</span>
              </button>
              <button
                :disabled="!filteredIssues.length"
                role="menuitem"
                class="w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 inline-flex items-center gap-2 disabled:opacity-40"
                @click="onDownloadCompactReport"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M4 7h16M4 12h16M4 17h16"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
                <span>Compact PDF (continuous)</span>
              </button>
              <button
                :disabled="!filteredIssues.length"
                role="menuitem"
                class="w-full px-3 py-2 text-left text-white/90 hover:bg-white/10 inline-flex items-center gap-2 disabled:opacity-40"
                @click="onDownloadListReport"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="16"
                    rx="2"
                    ry="2"
                    stroke-width="1.5"
                  />
                  <path
                    d="M3 9h18M9 4v16M15 4v16"
                    stroke-width="1.5"
                  />
                </svg>
                <span>List PDF (table)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="rounded-2xl p-6 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/8 min-w-0 flex flex-col items-center justify-center text-white/70"
    >
      <Spinner />
      <p class="mt-3 text-sm uppercase tracking-wide">
        Loading issues…
      </p>
    </div>
    <div
      v-else
      class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 ring-1 ring-white/8 overflow-x-auto min-w-0"
    >
      <template v-if="!projectStore.currentProjectId">
        <div class="p-6 text-center text-white/80">
          <div class="text-lg font-semibold">
            No project selected
          </div>
          <div class="mt-2 text-sm">
            Select a project from the user menu or Projects page to view its issues.
          </div>
        </div>
      </template>
      <template v-else>
        <table class="min-w-full text-left">
          <thead>
            <tr class="text-sm text-white/70">
              <th class="px-4 py-3">
                <button
                  type="button"
                  class="flex items-center gap-2"
                  @click="setSort('number')"
                >
                  <span>#</span>
                  <span
                    v-if="sortKey === 'number' && sortDir === 1"
                    class="text-xs"
                  >▲</span>
                  <span
                    v-else-if="sortKey === 'number' && sortDir === -1"
                    class="text-xs"
                  >▼</span>
                  <span
                    v-else
                    class="text-xs opacity-40"
                  >⇅</span>
                </button>
              </th>
              <th class="px-4 py-3">
                <button
                  type="button"
                  class="flex items-center gap-2"
                  @click="setSort('type')"
                >
                  <span>Type</span>
                  <span
                    v-if="sortKey === 'type' && sortDir === 1"
                    class="text-xs"
                  >▲</span>
                  <span
                    v-else-if="sortKey === 'type' && sortDir === -1"
                    class="text-xs"
                  >▼</span>
                  <span
                    v-else
                    class="text-xs opacity-40"
                  >⇅</span>
                </button>
              </th>
              <th class="px-4 py-3">
                Description
              </th>
              <th class="px-4 py-3">
                <button
                  type="button"
                  class="flex items-center gap-2"
                  @click="setSort('priority')"
                >
                  <span>Priority</span>
                  <span
                    v-if="sortKey === 'priority' && sortDir === 1"
                    class="text-xs"
                  >▲</span>
                  <span
                    v-else-if="sortKey === 'priority' && sortDir === -1"
                    class="text-xs"
                  >▼</span>
                  <span
                    v-else
                    class="text-xs opacity-40"
                  >⇅</span>
                </button>
              </th>
              <th class="px-4 py-3">
                <button
                  type="button"
                  class="flex items-center gap-2"
                  @click="setSort('responsible_person')"
                >
                  <span>Responsible</span>
                  <span
                    v-if="sortKey === 'responsible_person' && sortDir === 1"
                    class="text-xs"
                  >▲</span>
                  <span
                    v-else-if="sortKey === 'responsible_person' && sortDir === -1"
                    class="text-xs"
                  >▼</span>
                  <span
                    v-else
                    class="text-xs opacity-40"
                  >⇅</span>
                </button>
              </th>
              <th class="px-4 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="mt-2">
            <tr
              v-for="issue in pagedIssues"
              :key="issue.id"
              :class="['align-top', isClosedRow(issue) ? 'opacity-60' : '']"
            >
              <td class="px-4 py-3 text-white">
                {{ issue.number }}
              </td>
              <td class="px-4 py-3 text-white/90">
                {{ issue.type }}
              </td>
              <td class="px-4 py-3 text-white/70 max-w-xl">
                {{ truncate(htmlToText(issue.description), 250) }}
              </td>
              <td class="px-4 py-3">
                <span :class="priorityClass(issue.priority) + ' px-3 py-1 rounded-full text-xs font-medium'">{{ issue.priority }}</span>
              </td>
              <td class="px-4 py-3 text-white/90">
                {{ issue.responsible_person }}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-2">
                  <!-- Visit icon button -->
                  <button
                    class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/8"
                    aria-label="Visit issue"
                    :title="`Visit issue #${issue.number || ''}`"
                    @click="openView(issue)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
                        stroke-width="1.5"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke-width="1.5"
                      />
                    </svg>
                  </button>
                  <!-- Edit icon button -->
                  <button
                    class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/8"
                    aria-label="Edit issue"
                    :title="`Edit issue #${issue.number || ''}`"
                    @click="openEdit(issue)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                        stroke-width="1.5"
                      />
                      <path
                        d="M14.06 6.19l1.77-1.77a1.5 1.5 0 0 1 2.12 0l1.63 1.63a1.5 1.5 0 0 1 0 2.12l-1.77 1.77"
                        stroke-width="1.5"
                      />
                    </svg>
                  </button>
                  <!-- Delete icon button -->
                  <button
                    class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/40"
                    aria-label="Delete issue"
                    :title="`Delete issue #${issue.number || ''}`"
                    @click="onDelete(issue)"
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
                  <!-- Closed ON/OFF switch (exact match with IssueEdit.vue) -->
                  <div class="inline-flex items-center gap-2 ml-2 mr-1">
                    <span class="text-sm select-none">Closed</span>
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="isClosedRow(issue)"
                      :aria-label="`Toggle Closed`"
                      class="relative inline-flex h-7 w-12 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                      :class="isClosedRow(issue) ? 'bg-emerald-500/70 border-emerald-400/80' : 'bg-white/10 border-white/30'"
                      @click="toggleIssueClosed(issue)"
                      @keydown.space.prevent="toggleIssueClosed(issue)"
                      @keydown.enter.prevent="toggleIssueClosed(issue)"
                    >
                      <span
                        class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                        :class="isClosedRow(issue) ? 'translate-x-6' : 'translate-x-1'"
                      />
                    </button>
                    <span
                      class="text-xs select-none"
                      :class="isClosedRow(issue) ? 'text-emerald-200' : 'text-white/60'"
                    >{{ isClosedRow(issue) ? 'YES' : 'NO' }}</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <!-- Pagination controls (Equipment-style): rows per page + range on left, page nav on right -->
    <div
      v-if="totalItems > 0"
      class="flex items-center justify-between px-2 py-3 text-white/70 text-sm"
    >
      <div class="flex items-center gap-2">
        <span>Rows per page</span>
        <select
          v-model.number="pageSize"
          class="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
        >
          <option
            v-for="s in pageSizes"
            :key="s"
            :value="s"
          >
            {{ s }}
          </option>
        </select>
        <span class="ml-2">{{ startItem }}–{{ endItem }} of {{ displayTotal }}</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          :disabled="page === 1"
          class="px-2 py-1 rounded border border-white/20 bg-white/5 disabled:opacity-40"
          @click="prevPage"
        >
          Prev
        </button>
        <span class="px-2">Page {{ page }} / {{ totalPages }}</span>
        <button
          :disabled="page === totalPages"
          class="px-2 py-1 rounded border border-white/20 bg-white/5 disabled:opacity-40"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>
    
    <!-- View Issue Modal -->
    <Modal v-model="showViewModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Edit Issue #{{ editIssue?.number || selectedIssue?.number || '—' }}
        </h3>
      </template>

      <!-- Use the reusable IssueForm for editing; pass validation errors -->
      <IssueForm
        v-model="editIssue"
        :errors="formErrors"
      />

      <template #footer>
        <div class="flex items-center justify-between gap-3 w-full">
          <p
            v-if="isEditReadOnly"
            class="text-sm text-white/60"
          >
            Editing is disabled for closed/canceled issues.
          </p>
          <div class="flex gap-2 ml-auto">
            <button
              v-if="isEditReadOnly"
              class="px-4 py-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-400/30"
              @click="reopenIssueFromEdit"
            >
              Reopen
            </button>
            <button
              :disabled="isEditReadOnly"
              class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white disabled:opacity-40"
              @click="saveEdit"
            >
              Save
            </button>
            <button
              class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
              @click="cancelEdit"
            >
              Cancel
            </button>
          </div>
        </div>
      </template>
    </Modal>


    <!-- Close Confirm Modal -->
    <Modal v-model="showCloseModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Close Issue #{{ selectedIssue?.id }}
        </h3>
      </template>
      <div>
        <p class="text-white/80">
          Are you sure you want to close this issue?
        </p>
        <p class="text-white/70 mt-2">
          {{ selectedIssue?.title || selectedIssue?.type }} — {{ truncate(htmlToText(selectedIssue?.description), 200) }}
        </p>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-400/40"
            @click="confirmClose"
          >
            Close issue
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="showCloseModal = false"
          >
            Cancel
          </button>
        </div>
      </template>
    </Modal>

    <!-- Add Issue Modal -->
    <Modal v-model="showAddModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Add New Issue
        </h3>
      </template>
      <IssueForm v-model="newIssue" />
      <template #footer>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="addIssue"
          >
            Create
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="showAddModal = false"
          >
            Cancel
          </button>
        </div>
      </template>
    </Modal>

    <!-- Choose Columns Modal -->
    <Modal v-model="showColumnsModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Choose columns to export
        </h3>
      </template>
      <div class="space-y-3">
        <p class="text-white/70 text-sm">
          Your selection applies to both CSV and Excel exports. It will be remembered for this project.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            class="px-3 py-1.5 rounded bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
            @click="selectCommonColumns"
          >
            Common preset
          </button>
          <button
            class="px-3 py-1.5 rounded bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
            @click="selectAllColumns"
          >
            Select all
          </button>
          <button
            class="px-3 py-1.5 rounded bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
            @click="clearAllColumns"
          >
            Clear
          </button>
        </div>

        <div class="max-h-80 overflow-auto rounded-xl border border-white/10 p-3 bg-white/5">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <label
              v-for="col in sortedAvailableColumns"
              :key="col"
              class="inline-flex items-center gap-2 text-white/90"
            >
              <input
                type="checkbox"
                class="form-checkbox rounded bg-white/10 border-white/20"
                :value="col"
                :checked="selectedColumnsSet.has(col)"
                @change="onToggleColumn(col, $event.target.checked)"
              >
              <span class="text-sm">{{ col }}</span>
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="applyAndCloseColumns"
          >
            Done
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            @click="showColumnsModal = false"
          >
            Cancel
          </button>
        </div>
      </template>
    </Modal>

    <!-- Hidden report generator component -->
    <IssuePdfReport ref="reportRef" />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import IssueForm from '../../components/IssueForm.vue'
import Spinner from '../../components/Spinner.vue'
import { useUiStore } from '../../stores/ui'
import { useIssuesStore } from '../../stores/issues'
import { useProjectStore } from '../../stores/project'
import { useAuthStore } from '../../stores/auth'
import http from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'
import { getApiBase } from '../../utils/api'
// lists is not used in this file; previously imported for legacy filtering UI
import * as XLSX from 'xlsx'
import IssuePdfReport from '../../components/reports/IssuePdfReport.vue'
import { confirm as inlineConfirm } from '../../utils/confirm'
// Preferred/common export columns in desired order
const removedColumns = ['projectId', 'comments', 'attachments', 'photos', 'documents', 'updatedAt', 'closedBy']
const preferredColumns = ['number','title','description','type','priority','severity','status','foundBy','dateFound','assignedTo','responsible_person','dueDate','createdAt','closedDate','location','system']

const issuesStore = useIssuesStore()
const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const serverIssues = ref([])
const serverTotal = ref(0)
const serverTotalAll = ref(0)
const serverTypes = ref([])
const serverPriorities = ref([])
const serverStatuses = ref([])
const serverTypeCounts = ref({})
const serverPriorityCounts = ref({})
const serverStatusCounts = ref({})

// Spinner component import removed (not used)

// Helper to get a stable id
function idOf(issue) {
  return issue?.id || issue?._id || ''
}

// Track toggle-in-progress state per issue id
import { reactive } from 'vue'
const toggling = reactive({})

function isClosedRow(issue) {
  const s = String(issue?.status || '').toLowerCase()
  return s === 'closed' || s === 'canceled' || s === 'cancelled'
}

async function toggleIssueClosed(issue) {
  const id = idOf(issue)
  if (!id) return
  try {
    toggling[id] = true
    const nextClosed = !isClosedRow(issue)
    const payload = nextClosed
      ? { status: 'Closed', closedDate: isoDate(new Date()), closedBy: defaultFoundByLabel() }
      : { status: 'Open', closedDate: '', closedBy: '' }
    await issuesStore.updateIssue(id, payload)
    ui.showSuccess(nextClosed ? 'Issue closed' : 'Issue reopened')
  } catch (e) {
    ui.showError('Failed to update issue')
  } finally {
    toggling[id] = false
  }
}

function truncate(text, n) {
  if (!text) return ''
  return text.length > n ? text.slice(0, n - 1) + '…' : text
}

// Convert WYSIWYG/HTML to plain text for display/search
function htmlToText(html) {
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

function priorityClass(p) {
  const key = (p || '').toLowerCase()
  if (key.includes('critical') || key === 'critical') return 'bg-red-600 text-white'
  if (key.includes('high')) return 'bg-red-500 text-white'
  if (key.includes('medium')) return 'bg-yellow-500 text-black'
  if (key.includes('low')) return 'bg-green-500 text-white'
  return 'bg-white/6 text-white'
}

function normalizePriorityLabel(p) {
  const key = String(p || '').trim().toLowerCase()
  if (key.includes('critical')) return 'Critical'
  if (key.includes('high')) return 'High'
  if (key.includes('medium')) return 'Medium'
  if (key.includes('low')) return 'Low'
  if (!key) return 'Unspecified'
  // default to capitalized original
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function priorityBgClass(p) {
  const key = (p || '').toLowerCase()
  if (key.includes('critical') || key === 'critical') return 'bg-red-600'
  if (key.includes('high')) return 'bg-red-500'
  if (key.includes('medium')) return 'bg-yellow-500'
  if (key.includes('low')) return 'bg-green-500'
  return 'bg-white/30'
}

function priorityBadgeClass(p) {
  if (!p || p === 'All') return 'bg-white/10 text-white/80'
  return priorityClass(p)
}

function priorityCount(name) {
  try {
    const opt = (priorityOptions.value || []).find(o => o && o.name === name)
    return opt ? opt.count : 0
  } catch (e) { return 0 }
}

function statusBgClass(s) {
  const key = (s || '').toLowerCase()
  if (key === 'open') return 'bg-sky-500'
  if (key === 'in progress' || key === 'pending') return 'bg-amber-500'
  if (key === 'resolved') return 'bg-emerald-500'
  if (key === 'closed') return 'bg-gray-500'
  if (key === 'canceled' || key === 'cancelled') return 'bg-rose-500'
  return 'bg-white/30'
}

function statusBadgeClass(s) {
  if (!s || s === 'All') return 'bg-white/10 text-white/80'
  const key = s.toLowerCase()
  if (key === 'open') return 'bg-sky-500 text-white'
  if (key === 'in progress' || key === 'pending') return 'bg-amber-500 text-black'
  if (key === 'resolved') return 'bg-emerald-500 text-white'
  if (key === 'closed') return 'bg-gray-500 text-white'
  if (key === 'canceled' || key === 'cancelled') return 'bg-rose-500 text-white'
  return 'bg-white/10 text-white/80'
}

function statusCount(name) {
  try {
    const opt = (statusOptions.value || []).find(o => o && o.name === name)
    return opt ? opt.count : 0
  } catch (e) { return 0 }
}

const selectedIssue = ref(null)
const showViewModal = ref(false)
const showAddModal = ref(false)
const newIssue = ref({
  number: null,
  title: '',
  description: '',
  type: '',
  priority: 'medium',
  status: 'open',
  foundBy: '',
  dateFound: '',
  assignedTo: '',
  dueDate: '',
  location: '',
  system: ''
})
const editIssue = ref(null)
const formErrors = ref({})
const ui = useUiStore()
const pageSection = ref(null)
const isEditReadOnly = computed(() => {
  const s = String(editIssue.value?.status || '').toLowerCase()
  return s === 'closed' || s === 'canceled' || s === 'cancelled'
})
// Columns chooser state
const showColumnsModal = ref(false)
const selectedColumns = ref([])
const selectedColumnsSet = computed(() => new Set(selectedColumns.value || []))
const columnsStorageKey = computed(() => `issuesExportColumns:${projectStore.currentProjectId || 'global'}`)
// Downloads dropdown state
const showDownloadsMenu = ref(false)
const downloadsRef = ref(null)
const reportRef = ref(null)
const showTypeMenu = ref(false)
const typeMenuRef = ref(null)
const showPriorityMenu = ref(false)
const priorityMenuRef = ref(null)
const showStatusMenu = ref(false)
const statusMenuRef = ref(null)

const availableColumns = computed(() => {
  const colSet = new Set()
  for (const it of issuesStore.issues) {
    if (!it || typeof it !== 'object') continue
    for (const k of Object.keys(it)) {
      if (k === 'id' || k === '_id') continue
      colSet.add(k)
    }
  }
  return Array.from(colSet)
})

const sortedAvailableColumns = computed(() => {
  const avail = new Set(availableColumns.value)
  removedColumns.forEach(c => avail.delete(c))
  return [
    ...preferredColumns.filter(c => avail.has(c)),
    ...Array.from(avail).filter(c => !preferredColumns.includes(c)).sort()
  ]
})

function loadSelectedColumns() {
  const sanitize = (cols) => (cols || []).filter(c => !removedColumns.includes(c))
  try {
    const raw = localStorage.getItem(columnsStorageKey.value)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        selectedColumns.value = orderColumns(sanitize(parsed))
        return
      }
    }
  } catch (e) { /* ignore */ }
  // default to preferred ∩ available
  const avail = new Set(availableColumns.value)
  removedColumns.forEach(c => avail.delete(c))
  selectedColumns.value = preferredColumns.filter(c => avail.has(c))
}

function persistSelectedColumns() {
  try { localStorage.setItem(columnsStorageKey.value, JSON.stringify(selectedColumns.value || [])) } catch (e) { /* ignore */ }
}

watch(columnsStorageKey, () => loadSelectedColumns(), { immediate: true })
watch(availableColumns, () => {
  if (!selectedColumns.value || selectedColumns.value.length === 0) loadSelectedColumns()
})
watch(selectedColumns, persistSelectedColumns, { deep: true })

function openColumnsModal() {
  if (!selectedColumns.value || selectedColumns.value.length === 0) loadSelectedColumns()
  showColumnsModal.value = true
}
function applyAndCloseColumns() { persistSelectedColumns(); showColumnsModal.value = false }
function selectAllColumns() { selectedColumns.value = sortedAvailableColumns.value.slice() }
function clearAllColumns() { selectedColumns.value = [] }
function selectCommonColumns() {
  const avail = new Set(availableColumns.value)
  selectedColumns.value = preferredColumns.filter(c => avail.has(c))
}
function orderColumns(cols) {
  const pref = preferredColumns
  const inPref = cols.filter(c => pref.includes(c))
  const remaining = cols.filter(c => !pref.includes(c)).sort()
  // Preserve preferred order, then remaining alpha
  const orderedPref = pref.filter(c => inPref.includes(c))
  return [...orderedPref, ...remaining]
}
function onToggleColumn(col, checked) {
  const set = new Set(selectedColumns.value)
  if (checked) set.add(col); else set.delete(col)
  selectedColumns.value = orderColumns(Array.from(set))
}

function getExportColumns(rows) {
  // Use selected columns if any; otherwise derive from rows using preferred order then others
  if (selectedColumns.value && selectedColumns.value.length) return orderColumns(selectedColumns.value.slice().filter(c => !removedColumns.includes(c)))
  const colSet = new Set()
  for (const it of rows) {
    if (!it || typeof it !== 'object') continue
    for (const k of Object.keys(it)) {
      if (k === 'id' || k === '_id') continue
      if (!removedColumns.includes(k)) colSet.add(k)
    }
  }
  return [
    ...preferredColumns.filter(k => colSet.has(k)),
    ...Array.from(colSet).filter(k => !preferredColumns.includes(k)).sort()
  ]
}

function toggleDownloadsMenu() {
  showDownloadsMenu.value = !showDownloadsMenu.value
}
function closeDownloadsMenu() {
  showDownloadsMenu.value = false
}
function toggleTypeMenu() {
  showTypeMenu.value = !showTypeMenu.value
}
function closeTypeMenu() {
  showTypeMenu.value = false
}
function togglePriorityMenu() {
  showPriorityMenu.value = !showPriorityMenu.value
}
function closePriorityMenu() {
  showPriorityMenu.value = false
}
function toggleStatusMenu() {
  showStatusMenu.value = !showStatusMenu.value
}
function closeStatusMenu() {
  showStatusMenu.value = false
}
function onChooseColumnsClick() {
  closeDownloadsMenu()
  openColumnsModal()
}
function onDownloadCsvClick() {
  closeDownloadsMenu()
  exportFilteredIssuesCsv()
}
function onDownloadXlsxClick() {
  closeDownloadsMenu()
  exportFilteredIssuesXlsx()
}

function handleClickOutside(e) {
  const dEl = downloadsRef.value
  const tEl = typeMenuRef.value
  const pEl = priorityMenuRef.value
  const sEl = statusMenuRef.value
  if (dEl && !dEl.contains(e.target)) closeDownloadsMenu()
  if (tEl && !tEl.contains(e.target)) closeTypeMenu()
  if (pEl && !pEl.contains(e.target)) closePriorityMenu()
  if (sEl && !sEl.contains(e.target)) closeStatusMenu()
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

onMounted(async () => {
  // fetch issues for current project on mount
  try { await issuesStore.fetchIssues() } catch (e) { /* ignore */ }
})

function validateIssue(obj) {
  const e = {}
  if ((!obj.title || !obj.title.trim()) && (!obj.type || !obj.type.trim())) e.type = 'Title or Type is required'
  if (!obj.description || obj.description.trim().length < 10) e.description = 'Description must be at least 10 characters'
  if (!obj.priority) e.priority = 'Priority is required'
  if (!obj.assignedTo || !obj.assignedTo.trim()) e.assignedTo = 'Assigned To is required'
  return e
}

// Normalize incoming values to list-backed values expected by IssueForm
function normalizePriority(v) {
  const s = String(v || '').toLowerCase()
  const map = { low: 'low', medium: 'medium', high: 'high', critical: 'critical', comment: 'comment' }
  if (map[s]) return map[s]
  // also accept API labels
  const byLabel = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' }
  return byLabel[s] || (byLabel[s.charAt(0).toUpperCase() + s.slice(1)] ? byLabel[s.charAt(0).toUpperCase() + s.slice(1)] : 'medium')
}
function normalizeStatus(v) {
  const s = String(v || '').toLowerCase()
  const map = { open: 'open', pending: 'pending', closed: 'closed', resolved: 'resolved', canceled: 'canceled', cancelled: 'canceled', 'in progress': 'pending' }
  return map[s] || 'open'
}
function computeNextIssueNumber() {
  try {
    const pid = projectStore.currentProjectId
    if (!pid) return undefined
    const nums = issuesStore.issues
      .filter(i => String(i.projectId || i.project?._id || i.project || '') === String(pid))
      .map(i => Number(i.number) || 0)
    const max = nums.length ? Math.max(...nums) : 0
    return max + 1
  } catch (e) { return undefined }
}

function isoDate(d) {
  try {
    const dt = d instanceof Date ? d : new Date(d)
    const y = dt.getFullYear()
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch (e) { return '' }
}

function defaultFoundByLabel() {
  try {
    const team = (projectStore.currentProject || {}).team || []
    const myEmail = (authStore.user && authStore.user.email) ? String(authStore.user.email) : ''
    const me = myEmail ? team.find(m => String(m?.email || '').toLowerCase() === myEmail.toLowerCase()) : null
    const firstName = (authStore.user?.firstName) || (me?.firstName) || ''
    const lastName = (authStore.user?.lastName) || (me?.lastName) || ''
    const company = (me?.company) || (authStore.user && authStore.user.company) || ''
    const name = `${firstName} ${lastName}`.trim()
    if (name && company) return `${name} (${company})`
    return name || company || ''
  } catch (e) { return '' }
}
function openAddModal() {
  // initialize with defaults and next number
  newIssue.value = {
    number: computeNextIssueNumber() || null,
    title: '',
    description: '',
    type: '',
    priority: 'medium',
    status: 'open',
    foundBy: defaultFoundByLabel(),
    dateFound: isoDate(new Date()),
    assignedTo: '',
    dueDate: isoDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
    location: '',
    system: ''
  }
  formErrors.value = {}
  showAddModal.value = true
}

// Pagination
const page = ref(1)
// seed pageSize from user's profile preference when available; per-project localStorage can override
const pageSize = ref((authStore && authStore.user && authStore.user.contact && typeof authStore.user.contact.perPage === 'number') ? authStore.user.contact.perPage : 10)
const pageSizes = [5, 10, 25, 50, 100]

// Persist per-page (issues) page size preference for the current session
const pageSizeStorageKey = computed(() => `issuesPageSize:${projectStore.currentProjectId || 'global'}`)
function loadPageSizePref() {
  try {
    // Use sessionStorage so a new browser session falls back to the user's profile setting
    const raw = sessionStorage.getItem(pageSizeStorageKey.value)
    if (!raw) {
      // If there's no session override, fall back to the user's profile preference if available
      try {
        const p = authStore.user && authStore.user.contact && authStore.user.contact.perPage
        const allowed = [5,10,25,50,100]
        if (typeof p === 'number' && allowed.includes(p)) {
          pageSize.value = p
        }
      } catch (e) { /* ignore */ }
      return
    }
    const n = parseInt(raw, 10)
    if ([5,10,25,50,100].includes(n)) pageSize.value = n
  } catch (e) { /* ignore sessionStorage read errors */ }
}
function persistPageSizePref() {
  try { sessionStorage.setItem(pageSizeStorageKey.value, String(pageSize.value)) } catch (e) { /* ignore sessionStorage write errors */ }
}
watch(pageSizeStorageKey, () => loadPageSizePref(), { immediate: true })
watch(pageSize, () => persistPageSizePref())

// Loading state and server-driven page
const loading = ref(true)
// server-driven list data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _issuesSource = computed(() => serverIssues.value)

const priorityFilter = ref('All')
const typeFilter = ref('All')
const statusFilter = ref('All')
const searchQuery = ref('')
const searchMode = computed(() => {
  try {
    const p = projectStore.currentProject && projectStore.currentProject.value ? projectStore.currentProject.value : null
    const m = p && p.searchMode ? String(p.searchMode).toLowerCase() : ''
    return m || 'substring'
  } catch (e) { return 'substring' }
})
const hideClosed = ref(false)
// Sorting state (used in persistence below; defined here to avoid temporal use)
const sortKey = ref('')
const sortDir = ref(1) // 1 = asc, -1 = desc

// Persist list UI state per project (search, filters, sort)
const listStateKey = computed(() => `issuesListState:${projectStore.currentProjectId || 'global'}`)
function hasSessionStorage() {
  try { return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined' } catch (e) { return false }
}
function loadListState() {
  if (!hasSessionStorage()) return
  try {
    const raw = sessionStorage.getItem(listStateKey.value)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data && typeof data === 'object') {
      if (typeof data.searchQuery === 'string') searchQuery.value = data.searchQuery
      if (typeof data.typeFilter === 'string') typeFilter.value = data.typeFilter
      if (typeof data.priorityFilter === 'string') priorityFilter.value = data.priorityFilter
      if (typeof data.statusFilter === 'string') statusFilter.value = data.statusFilter
      if (typeof data.hideClosed === 'boolean') hideClosed.value = data.hideClosed
      if (typeof data.sortKey === 'string') sortKey.value = data.sortKey
      if (data.sortDir === 1 || data.sortDir === -1) sortDir.value = data.sortDir
    }
  } catch (e) { /* ignore */ }
}
function persistListState() {
  if (!hasSessionStorage()) return
  try {
    sessionStorage.setItem(listStateKey.value, JSON.stringify({
      searchQuery: searchQuery.value,
      typeFilter: typeFilter.value,
      priorityFilter: priorityFilter.value,
      statusFilter: statusFilter.value,
      hideClosed: hideClosed.value,
      sortKey: sortKey.value,
      sortDir: sortDir.value
    }))
  } catch (e) { /* ignore */ }
}

// Debounce helper (small local utility)
function debounce(fn, wait = 200) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}

const effectiveSearch = ref('')
const updateEffective = debounce((val) => { effectiveSearch.value = val }, 200)

watch(() => searchQuery.value, (v) => updateEffective(v))
// Now that search/effective/search watchers exist, wire up persistence
watch(listStateKey, () => loadListState(), { immediate: true })
watch([searchQuery, typeFilter, priorityFilter, statusFilter, hideClosed, sortKey, sortDir], () => persistListState())
const priorityCounts = computed(() => {
  const map = {}
  const serverCounts = serverPriorityCounts.value || {}
  if (Object.keys(serverCounts).length) {
    for (const [k, v] of Object.entries(serverCounts)) {
      const key = normalizePriorityLabel(k || 'Unspecified')
      map[key] = Number(v) || 0
    }
  }
  if (!Object.keys(map).length && Array.isArray(serverIssues.value) && serverIssues.value.length) {
    for (const i of serverIssues.value) {
      const p = normalizePriorityLabel(i.priority || 'Unspecified')
      map[p] = (map[p] || 0) + 1
    }
  }
  if (!Object.keys(map).length && Array.isArray(issuesStore.issues)) {
    for (const i of issuesStore.issues) {
      const p = normalizePriorityLabel(i.priority || 'Unspecified')
      map[p] = (map[p] || 0) + 1
    }
  }
  map['All'] = Number(serverTotalAll.value || serverTotal.value || issuesStore.issues.length || 0)
  return map
})

const priorityOptions = computed(() => {
  const entries = Object.entries(priorityCounts.value)
    .filter(([name]) => name !== 'All')
    .map(([name, count]) => ({ name: normalizePriorityLabel(name), count }))
  // Sort commonly used priorities first
  const order = ['Critical', 'High', 'Medium', 'Low', 'Unspecified']
  entries.sort((a, b) => {
    const ia = order.indexOf(a.name) === -1 ? order.length : order.indexOf(a.name)
    const ib = order.indexOf(b.name) === -1 ? order.length : order.indexOf(b.name)
    if (ia !== ib) return ia - ib
    return a.name.localeCompare(b.name)
  })
  // Add 'All' at the start
  return [{ name: 'All', count: priorityCounts.value['All'] || issuesStore.issues.length }, ...entries]
})

const typeCounts = computed(() => {
  const map = {}
  const serverCounts = serverTypeCounts.value || {}
  if (Object.keys(serverCounts).length) {
    for (const [k, v] of Object.entries(serverCounts)) {
      const key = String(k || 'Unspecified')
      map[key] = Number(v) || 0
    }
  }
  if (!Object.keys(map).length && Array.isArray(serverIssues.value) && serverIssues.value.length) {
    for (const i of serverIssues.value) {
      const t = (i.type || 'Unspecified')
      map[t] = (map[t] || 0) + 1
    }
  }
  if (!Object.keys(map).length && Array.isArray(issuesStore.issues)) {
    for (const i of issuesStore.issues) {
      const t = (i.type || 'Unspecified')
      map[t] = (map[t] || 0) + 1
    }
  }
  map['All'] = Number(serverTotalAll.value || serverTotal.value || issuesStore.issues.length || 0)
  return map
})

const typeOptions = computed(() => {
  const entries = Object.entries(typeCounts.value)
    .filter(([name]) => name !== 'All')
    .map(([name, count]) => ({ name, count }))
  entries.sort((a, b) => a.name.localeCompare(b.name))
  return [{ name: 'All', count: typeCounts.value['All'] || issuesStore.issues.length }, ...entries]
})
function typeCount(name) {
  const opt = (typeOptions.value || []).find(o => o && o.name === name)
  return opt ? opt.count : 0
}

const statusCounts = computed(() => {
  const map = {}
  const serverCounts = serverStatusCounts.value || {}
  if (Object.keys(serverCounts).length) {
    for (const [k, v] of Object.entries(serverCounts)) {
      const key = String(k || 'Unspecified')
      map[key] = Number(v) || 0
    }
  }
  if (!Object.keys(map).length && Array.isArray(serverIssues.value) && serverIssues.value.length) {
    for (const i of serverIssues.value) {
      const s = (i.status || 'Unspecified')
      map[s] = (map[s] || 0) + 1
    }
  }
  if (!Object.keys(map).length && Array.isArray(issuesStore.issues)) {
    for (const i of issuesStore.issues) {
      const s = (i.status || 'Unspecified')
      map[s] = (map[s] || 0) + 1
    }
  }
  map['All'] = Number(serverTotalAll.value || serverTotal.value || issuesStore.issues.length || 0)
  return map
})

const statusOptions = computed(() => {
  const entries = Object.entries(statusCounts.value).map(([name, count]) => ({ name, count }))
  // Preferred order
  const order = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Canceled', 'Cancelled']
  entries.sort((a, b) => {
    const ia = order.indexOf(a.name) === -1 ? order.length : order.indexOf(a.name)
    const ib = order.indexOf(b.name) === -1 ? order.length : order.indexOf(b.name)
    if (ia !== ib) return ia - ib
    return b.count - a.count
  })
  return [{ name: 'All', count: statusCounts.value['All'] || issuesStore.issues.length }, ...entries]
})

// Apply client-side filter over the server-returned page so exports and UI behave
const filteredIssues = computed(() => {
  const q = (effectiveSearch.value || '').trim().toLowerCase()
  // prefer server-provided page when available; otherwise fall back to full store list
  const useServer = Number(serverTotal.value || 0) > 0 && Array.isArray(serverIssues.value) && serverIssues.value.length > 0
  const baseAll = useServer ? serverIssues.value : (Array.isArray(issuesStore.issues) ? issuesStore.issues : [])
  const list = (!priorityFilter.value || priorityFilter.value === 'All')
    ? baseAll
    : baseAll.filter(i => (i.priority || '').toLowerCase() === priorityFilter.value.toLowerCase())
  const withType = (!typeFilter.value || typeFilter.value === 'All')
    ? list
    : list.filter(i => String(i.type || '').toLowerCase() === typeFilter.value.toLowerCase())
  const withStatus = (!statusFilter.value || statusFilter.value === 'All')
    ? withType
    : withType.filter(i => String(i.status || '').toLowerCase() === statusFilter.value.toLowerCase())
  const base = hideClosed.value ? withStatus.filter(i => !isClosedRow(i)) : withStatus

  if (!q) return base
  return base.filter(i => {
    const fields = [String(i.id || ''), i.type || '', i.description || '', i.responsible_person || '', i.priority || '']
      .map(f => String(f).toLowerCase())
    return fields.some(f => f.includes(q))
  })
})

function clearSearch() {
  searchQuery.value = ''
  effectiveSearch.value = ''
}

// Keyboard shortcuts: '/' focuses search, Escape clears
function keyHandler(e) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault()
    const el = document.querySelector('input[placeholder="Search issues..."]')
    if (el) el.focus()
  }
  if (e.key === 'Escape') {
    clearSearch()
    const el = document.querySelector('input[placeholder="Search issues..."]')
    if (el) el.blur()
  }
}
onMounted(() => window.addEventListener('keydown', keyHandler))
onBeforeUnmount(() => window.removeEventListener('keydown', keyHandler))

// refetch issues when selected project changes
// preferredProjectId: default project from auth takes precedence over explicit selection
const preferredProjectId = computed(() => {
  try {
    const projects = authStore.user?.projects
    if (Array.isArray(projects)) {
      const dp = projects.find(p => p && p.default)
      if (dp) return typeof dp === 'string' ? dp : (dp._id || dp.id || null)
    }
  } catch (e) { /* ignore */ }
  return projectStore.currentProjectId
})

// Fetch when preferred project changes: ask server for the first page
watch(preferredProjectId, (id) => {
  page.value = 1
  fetchIssuesPage(id).catch(() => {})
}, { immediate: true })

// Fetch when paging/sort/search/filter changes (debounced)
function fetchIssuesPage(projectId) {
  return (async () => {
    loading.value = true
    try {
      const pid = projectId ?? preferredProjectId.value
      // Provide a store fallback when API is missing or on same hostname to avoid dev cross-port 404s
  try {
    const rawEnvBase = import.meta.env?.VITE_API_BASE
    const apiBase = (rawEnvBase && typeof rawEnvBase === 'string') ? rawEnvBase : getApiBase()
      if (typeof window !== 'undefined' && apiBase) {
        try {
          const apiHostname = (new URL(apiBase)).hostname
          const pageHostname = window.location.hostname
          if (apiHostname === pageHostname || !rawEnvBase) {
            if (pid) {
              // ask store to populate (per-project)
              if (typeof issuesStore.fetchByProject === 'function') await issuesStore.fetchByProject(String(pid))
              else await issuesStore.fetchIssues()
              const all = Array.isArray(issuesStore.issues) ? issuesStore.issues : []
              const filteredByProject = all.filter((i) => String(i.projectId || i.project || '') === String(pid))
              serverIssues.value = filteredByProject.map((i) => ({ ...(i || {}), id: i._id || i.id }))
              serverTotal.value = serverIssues.value.length
              serverTotalAll.value = serverTotal.value
              serverTypes.value = []
              serverTypeCounts.value = {}
              serverPriorities.value = []
              serverPriorityCounts.value = {}
              serverStatuses.value = []
              serverStatusCounts.value = {}
            } else {
              serverIssues.value = []
              serverTotal.value = 0
              serverTotalAll.value = 0
            }
            loading.value = false
            return
          }
        } catch (err) {
            // ignore URL parsing errors and continue
          }
        }
      } catch (e) {
        // ignore env access errors and continue
      }

      const params = {
        page: page.value,
        perPage: pageSize.value,
      }
      if (pid) params.projectId = pid
      if (effectiveSearch.value) params.search = effectiveSearch.value
      if (sortKey.value) {
        params.sortBy = sortKey.value
        params.sortDir = sortDir.value === 1 ? 'asc' : 'desc'
      }
      if (statusFilter.value && statusFilter.value !== 'All') params.status = statusFilter.value
      if (priorityFilter.value && priorityFilter.value !== 'All') params.priority = priorityFilter.value
      if (typeFilter.value && typeFilter.value !== 'All') params.type = typeFilter.value
      params.includeFacets = true

      const res = await http.get('/api/issues', { params, headers: getAuthHeaders() })
      const data = res && res.data ? res.data : {}
      const normalize = (i) => {
        const obj = { ...(i || {}) }
        obj.id = i?._id || i?.id
        obj.priority = obj.priority || obj.severity || 'Unspecified'
        obj.responsible_person = obj.responsible_person || obj.assignedTo || obj.responsible || ''
        return obj
      }
      if (Array.isArray(data.items)) {
        serverIssues.value = data.items.map(normalize)
      } else if (Array.isArray(data)) {
        serverIssues.value = data.map(normalize)
      } else {
        serverIssues.value = []
      }
      serverTotal.value = Number(data.total ?? data.count ?? serverIssues.value.length)
      serverTotalAll.value = Number(data.totalAll || serverTotal.value || serverIssues.value.length)
      // facets
      if (Array.isArray(data.types)) {
        const map = {}
        const list = []
        for (const t of data.types) {
          const name = String((t && t.name) || (t && t._id) || t || '').trim()
          const count = Number((t && t.count) || 0)
          if (!name) continue
          list.push(name)
          map[name] = count
        }
        serverTypes.value = list
        serverTypeCounts.value = map
      } else {
        serverTypes.value = []
        serverTypeCounts.value = {}
      }
      if (Array.isArray(data.priorities)) {
        const map = {}
        const list = []
        for (const t of data.priorities) {
          const name = String((t && t.name) || (t && t._id) || t || '').trim()
          const count = Number((t && t.count) || 0)
          if (!name) continue
          list.push(name)
          map[name] = count
        }
        serverPriorities.value = list
        serverPriorityCounts.value = map
      } else {
        serverPriorities.value = []
        serverPriorityCounts.value = {}
      }
      if (Array.isArray(data.statuses)) {
        const map = {}
        const list = []
        for (const t of data.statuses) {
          const name = String((t && t.name) || (t && t._id) || t || '').trim()
          const count = Number((t && t.count) || 0)
          if (!name) continue
          list.push(name)
          map[name] = count
        }
        serverStatuses.value = list
        serverStatusCounts.value = map
      } else {
        serverStatuses.value = []
        serverStatusCounts.value = {}
      }
    } catch (e) {
      // If endpoint missing (404), fall back to store-based data so UI still works
      if (e && e.response && e.response.status === 404) {
        try {
          const pid = projectId ?? preferredProjectId.value
            if (pid) {
            if (typeof issuesStore.fetchByProject === 'function') await issuesStore.fetchByProject(String(pid))
            else await issuesStore.fetchIssues()
            const all = Array.isArray(issuesStore.issues) ? issuesStore.issues : []
            const filteredByProject = all.filter((i) => String(i.projectId || i.project || '') === String(pid))
            serverIssues.value = filteredByProject.map((i) => ({ ...(i || {}), id: i._id || i.id }))
            serverTotal.value = serverIssues.value.length
            serverTotalAll.value = serverTotal.value
            serverTypes.value = []
            serverTypeCounts.value = {}
            serverPriorities.value = []
            serverPriorityCounts.value = {}
            serverStatuses.value = []
            serverStatusCounts.value = {}
          } else {
            serverIssues.value = []
            serverTotal.value = 0
            serverTotalAll.value = 0
          }
        } catch (inner) {
          serverIssues.value = []
          serverTotal.value = 0
          serverTotalAll.value = 0
        }
      } else {
        serverIssues.value = []
        serverTotal.value = 0
        serverTotalAll.value = 0
      }
    } finally {
      loading.value = false
    }
  })()
}

const debouncedFetch = debounce(() => { fetchIssuesPage().catch(() => {}) }, 150)
watch([() => page.value, () => pageSize.value, () => sortKey.value, () => sortDir.value, () => effectiveSearch.value, () => statusFilter.value, () => priorityFilter.value, () => typeFilter.value, () => hideClosed.value], () => debouncedFetch(), { immediate: false })

// Server-driven totals (serverTotal is set by fetchIssuesPage)
const totalItems = computed(() => Number(serverTotal.value || filteredIssues.value.length || 0))
const displayTotal = computed(() => Number(serverTotalAll.value || serverTotal.value || filteredIssues.value.length || 0))

// Client-side sorting fallback over current page
const sortedIssues = computed(() => {
  if (!sortKey.value) return filteredIssues.value
  const arr = [...filteredIssues.value]
  arr.sort((a, b) => {
    let av = a && a[sortKey.value]
    let bv = b && b[sortKey.value]
    if (sortKey.value === 'number') {
      av = Number(av || 0)
      bv = Number(bv || 0)
      return (av - bv) * sortDir.value
    }
    av = String(av || '').toLowerCase()
    bv = String(bv || '').toLowerCase()
    if (av < bv) return -1 * sortDir.value
    if (av > bv) return 1 * sortDir.value
    return 0
  })
  return arr
})

function setSort(key) {
  if (sortKey.value === key) sortDir.value = -sortDir.value
  else { sortKey.value = key; sortDir.value = 1 }
  page.value = 1
}

const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const startItem = computed(() => totalItems.value === 0 ? 0 : ((page.value - 1) * pageSize.value) + 1)
const endItem = computed(() => Math.min(totalItems.value, page.value * pageSize.value))
// Use client-side sortedIssues (operating over server-returned page) as the current page
const pagedIssues = computed(() => {
  const list = sortedIssues.value || []
  const total = Number(serverTotal.value || 0)
  const pageLen = Array.isArray(serverIssues.value) ? serverIssues.value.length : 0
  // If server indicates there's more items than the returned page, assume server-side paging
  if (total > pageLen) return list
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
})

function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }
// pagination helpers: explicit page setter and pages array removed
// (not needed in this component — navigation uses prevPage/nextPage)

function openView(issue) {
  const id = issue.id || issue._id
  if (!id) return
  router.push({ name: 'issue-edit', params: { id } })
}

async function onDelete(issue) {
  const id = idOf(issue)
  if (!id) return
  const ok = await inlineConfirm({
    title: `Delete Issue #${issue.number ?? ''}`,
    message: `Are you sure you want to delete this issue? This cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!ok) return
  try {
    await issuesStore.deleteIssue(id)
    ui.showSuccess('Issue deleted')
  } catch (e) {
    ui.showError(e?.response?.data?.error || 'Failed to delete issue')
  }
}


function openEdit(issue) {
  // Prepare editIssue with normalized values for the form selects
  selectedIssue.value = issue
  const norm = {
    id: issue.id || issue._id,
    number: typeof issue.number === 'number' ? issue.number : (issue.number ? Number(issue.number) : null),
    title: issue.title || issue.type || '',
    description: issue.description || '',
    type: issue.type || '',
    priority: normalizePriority(issue.priority || issue.severity) || 'medium',
    status: normalizeStatus(issue.status) || 'open',
    foundBy: issue.foundBy || '',
    dateFound: issue.dateFound || '',
    assignedTo: issue.assignedTo || issue.responsible_person || '',
    dueDate: issue.dueDate || '',
    location: issue.location || '',
    system: issue.system || ''
  }
  editIssue.value = norm
  formErrors.value = {}
  showViewModal.value = true
}


function addIssue() {
  const errs = validateIssue(newIssue.value)
  if (Object.keys(errs).length) { formErrors.value = errs; return }
  // map UI fields to backend Issue fields: responsible_person -> assignedTo, priority -> severity
  const payload = {
    projectId: projectStore.currentProjectId,
    title: newIssue.value.title || newIssue.value.type || '',
    number: typeof newIssue.value.number === 'number' ? newIssue.value.number : computeNextIssueNumber(),
    description: newIssue.value.description,
    type: newIssue.value.type,
    severity: toApiPriority(newIssue.value.priority),
    assignedTo: newIssue.value.assignedTo,
    status: toApiStatus(newIssue.value.status),
    foundBy: newIssue.value.foundBy || undefined,
    dateFound: newIssue.value.dateFound || undefined,
    dueDate: newIssue.value.dueDate || undefined,
    location: newIssue.value.location || undefined,
    system: newIssue.value.system || undefined
  }
  issuesStore.createIssue(payload).then(() => {
    newIssue.value = { number: null, title: '', description: '', type: '', priority: 'Medium', status: 'Open', foundBy: '', dateFound: '', assignedTo: '', dueDate: '', location: '', system: '' }
    showAddModal.value = false
    formErrors.value = {}
    ui.showSuccess('Issue created')
  }).catch(() => ui.showError('Failed to create issue'))
}

// Map UI values to API labels
function toApiPriority(v) {
  const m = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical', comment: 'Comment' }
  const k = String(v || '').toLowerCase()
  return m[k] || undefined
}
function toApiStatus(v) {
  const m = { open: 'Open', pending: 'In Progress', closed: 'Closed', resolved: 'Resolved', canceled: 'Canceled', cancelled: 'Canceled' }
  const k = String(v || '').toLowerCase()
  return m[k] || undefined
}

const showCloseModal = ref(false)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function openClose(issue) {
  selectedIssue.value = issue
  showCloseModal.value = true
}

function confirmClose() {
  if (!selectedIssue.value) return
  const id = selectedIssue.value.id || selectedIssue.value._id
  // update status to 'Closed' via API
  issuesStore.updateIssue(id, { status: 'Closed', closedDate: isoDate(new Date()), closedBy: defaultFoundByLabel() }).then(() => {
    showCloseModal.value = false
    ui.showSuccess('Issue closed')
  }).catch(() => ui.showError('Failed to close issue'))
}

function saveEdit() {
  if (!editIssue.value) return
  const errs = validateIssue(editIssue.value)
  if (Object.keys(errs).length) { formErrors.value = errs; return }
  const id = editIssue.value.id || editIssue.value._id || selectedIssue.value?.id || selectedIssue.value?._id
  if (!id) { ui.showError('Failed to update issue'); return }
  const payload = {
    title: editIssue.value.title || editIssue.value.type,
    description: editIssue.value.description,
    type: editIssue.value.type,
    severity: toApiPriority(editIssue.value.priority),
    assignedTo: editIssue.value.assignedTo || editIssue.value.responsible_person,
    status: toApiStatus(editIssue.value.status),
    number: typeof editIssue.value.number === 'number' ? editIssue.value.number : (editIssue.value.number ? Number(editIssue.value.number) : undefined),
    dateFound: editIssue.value.dateFound || undefined,
    foundBy: editIssue.value.foundBy || undefined,
    dueDate: editIssue.value.dueDate || undefined,
    location: editIssue.value.location || undefined,
    system: editIssue.value.system || undefined,
    // If closing via modal edit, stamp closed metadata; if reopening, clear
    ...(String(editIssue.value.status || '').toLowerCase() === 'closed'
      ? { closedDate: isoDate(new Date()), closedBy: defaultFoundByLabel() }
      : { closedDate: '', closedBy: '' }),
    projectId: selectedIssue.value?.projectId || projectStore.currentProjectId || undefined,
  }
  issuesStore.updateIssue(id, payload).then(() => {
    showViewModal.value = false
    formErrors.value = {}
    ui.showSuccess('Issue updated')
  }).catch(() => ui.showError('Failed to update issue'))
}

function cancelEdit() {
  editIssue.value = null
  showViewModal.value = false
}

async function reopenIssueFromEdit() {
  try {
    const id = editIssue.value?.id || editIssue.value?._id || selectedIssue.value?.id || selectedIssue.value?._id
    if (!id) { ui.showError('Unable to reopen issue'); return }
  await issuesStore.updateIssue(id, { status: 'Open', closedDate: '', closedBy: '' })
    if (editIssue.value) editIssue.value.status = 'open'
    if (selectedIssue.value) selectedIssue.value.status = 'Open'
    ui.showSuccess('Issue reopened')
  } catch (e) {
    ui.showError('Failed to reopen issue')
  }
}

// Keep page within range when filter/pageSize/issue list changes
watch([() => priorityFilter.value, () => pageSize.value, () => issuesStore.issues.length, () => sortedIssues.value.length, () => searchQuery.value, () => effectiveSearch.value, () => searchMode.value], () => {
  if (page.value > totalPages.value) page.value = 1
})

// Reset page when page size changes
watch(pageSize, () => {
  page.value = 1
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function togglePriority(name) {
  if (!name) return
  if (name === 'All' || name === priorityFilter.value) {
    priorityFilter.value = 'All'
  } else {
    priorityFilter.value = name
  }
}

function exportFilteredIssuesCsv() {
  try {
    const rows = filteredIssues.value || []
    if (!rows.length) return
    const cols = getExportColumns(rows)

    // CSV escaping
    const cell = (v) => {
      if (v === null || v === undefined) return ''
      let s
      if (Array.isArray(v) || typeof v === 'object') {
        try { s = JSON.stringify(v) } catch (e) { s = String(v) }
      } else { s = String(v) }
      s = s.replace(/"/g, '""')
      return `"${s}"`
    }

    const lines = []
    lines.push(cols.map(c => cell(c)).join(','))
    for (const it of rows) {
      const obj = it || {}
      const line = cols.map(c => {
        let val = obj[c]
        if (c === 'description') val = htmlToText(val)
        return cell(val)
      })
      lines.push(line.join(','))
    }
    const bom = '\uFEFF'
    const csv = bom + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dt = new Date()
    const fn = `issues-${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}.csv`
    a.href = href
    a.download = fn
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(href)
  } catch (e) {
    ui.showError('Failed to export CSV')
  }
}

function exportFilteredIssuesXlsx() {
  try {
    const rows = filteredIssues.value || []
    if (!rows.length) return
    const cols = getExportColumns(rows)

    // Build an array of objects mapping description to text-only
    const data = rows.map(it => {
      const obj = {}
      for (const c of cols) {
        let val = it?.[c]
        if (c === 'description') val = htmlToText(val)
        obj[c] = val
      }
      return obj
    })

    const ws = XLSX.utils.json_to_sheet(data, { header: cols })
    // Fit columns: set width based on header length (simple heuristic)
    const colWidths = cols.map(c => ({ wch: Math.max(10, Math.min(40, String(c).length + 2)) }))
    ws['!cols'] = colWidths
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Issues')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dt = new Date()
    const fn = `issues-${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}.xlsx`
    a.href = href
    a.download = fn
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(href)
  } catch (e) {
    ui.showError('Failed to export Excel')
  }
}

async function onDownloadDetailedReport() {
  try {
    const issues = filteredIssues.value.map(i => ({
      id: i.id || i._id,
      number: typeof i.number === 'number' ? i.number : (i.number ? Number(i.number) : null),
      title: i.title || i.type || '',
      description: i.description || '',
      type: i.type || '',
      priority: i.priority || i.severity || '',
      status: i.status || '',
      foundBy: i.foundBy || '',
      dateFound: i.dateFound || '',
      assignedTo: i.assignedTo || i.responsible_person || '',
      dueDate: i.dueDate || '',
      closedBy: i.closedBy || '',
      closedDate: i.closedDate || '',
      location: i.location || '',
      system: i.system || '',
      recommendation: i.recommendation || '',
      resolution: i.resolution || '',
      projectId: i.projectId || (projectStore.currentProjectId || undefined),
      comments: Array.isArray(i.comments) ? i.comments : [],
      attachments: Array.isArray(i.attachments) ? i.attachments : (i.documents || []),
      photos: Array.isArray(i.photos) ? i.photos : [],
    }))
    // Generate multi-issue detailed report
    await reportRef.value?.generateIssuesDetailedPdf(issues)
  } catch (e) {
    // silent; optionally show a toast
  } finally {
    showDownloadsMenu.value = false
  }
}

async function onDownloadCompactReport() {
  try {
    const issues = filteredIssues.value.map(i => ({
      id: i.id || i._id,
      number: typeof i.number === 'number' ? i.number : (i.number ? Number(i.number) : null),
      title: i.title || i.type || '',
      description: i.description || '',
      type: i.type || '',
      priority: i.priority || i.severity || '',
      status: i.status || '',
      foundBy: i.foundBy || '',
      dateFound: i.dateFound || '',
      assignedTo: i.assignedTo || i.responsible_person || '',
      dueDate: i.dueDate || '',
      closedBy: i.closedBy || '',
      closedDate: i.closedDate || '',
      location: i.location || '',
      system: i.system || '',
      recommendation: i.recommendation || '',
      resolution: i.resolution || '',
      projectId: i.projectId || (projectStore.currentProjectId || undefined),
    }))
    await reportRef.value?.generateIssuesCompactPdf(issues)
  } catch (e) {
    // silent; optionally show a toast
  } finally {
    showDownloadsMenu.value = false
  }
}

async function onDownloadListReport() {
  try {
    const cols = (selectedColumns.value && selectedColumns.value.length)
      ? selectedColumns.value.slice()
      : getExportColumns(filteredIssues.value)
    // prune removed columns in case legacy selections persist
    const prunedCols = cols.filter(c => !removedColumns.includes(c))
    const issues = filteredIssues.value.map(i => ({
      id: i.id || i._id,
      number: typeof i.number === 'number' ? i.number : (i.number ? Number(i.number) : null),
      title: i.title || i.type || '',
      description: i.description || '',
      type: i.type || '',
      priority: i.priority || i.severity || '',
      status: i.status || '',
      foundBy: i.foundBy || '',
      dateFound: i.dateFound || '',
      assignedTo: i.assignedTo || i.responsible_person || '',
      dueDate: i.dueDate || '',
      closedBy: i.closedBy || '',
      closedDate: i.closedDate || '',
      location: i.location || '',
      system: i.system || '',
      recommendation: i.recommendation || '',
      resolution: i.resolution || '',
      createdAt: i.createdAt || '',
      updatedAt: i.updatedAt || '',
      responsible_person: i.responsible_person || '',
      severity: i.severity || '',
    }))
    await reportRef.value?.generateIssuesListPdf(issues, prunedCols)
  } catch (e) {
    // silent; optionally show a toast
  } finally {
    showDownloadsMenu.value = false
  }
}

</script>
