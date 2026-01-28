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
      >
        <template #middle>
          <div class="hidden sm:block">
            <SearchPill
              v-model="searchQuery"
              placeholder="Search issues..."
              @clear="clearSearch"
            />
          </div>
        </template>
      </BreadCrumbs>
    </div>

    <div class="rounded-2xl p-3 bg-white/6 backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 gap-y-2 min-w-0 relative z-30">
      <!-- Left group: add, search, filters -->
      <div class="flex items-center gap-3 min-w-0">
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

	        <!-- Primary filters (Type + Status) -->
	        <div class="hidden md:flex flex-wrap items-center gap-3 gap-y-2">
	          <div class="flex items-center gap-2">
	            <label class="text-white/70 text-sm">Type</label>
            <div
              ref="typeMenuRef"
              class="relative"
            >
	              <button
	                :aria-expanded="showTypeMenu ? 'true' : 'false'"
	                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 w-40 justify-between"
	                @click="toggleTypeMenu"
	              >
	                <span class="flex items-center gap-2 min-w-0">
	                  <span class="truncate">{{ typeFilter }}</span>
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
                class="absolute left-0 mt-2 w-56 rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
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
	            <label class="text-white/70 text-sm">Status</label>
            <div
              ref="statusMenuRef"
              class="relative"
            >
	              <button
	                :aria-expanded="showStatusMenu ? 'true' : 'false'"
	                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 w-40 justify-between"
	                @click="toggleStatusMenu"
	              >
	                <span class="flex items-center gap-2 min-w-0">
	                  <span class="truncate">{{ statusFilter }}</span>
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
                class="absolute left-0 mt-2 w-56 rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
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
	            class="form-checkbox h-4 w-4 rounded bg-white/10 border-white/30 text-white/80 checked:bg-white/10 checked:border-white/30"
          >
	          <label
	            for="hideClosedChk"
	            class="text-white/70 text-sm select-none"
	          >Hide closed</label>
	        </div>

	        <div class="relative inline-block group shrink-0">
	          <button
	            :disabled="!projectStore.currentProjectId"
	            aria-label="Toggle My Issues"
	            :title="projectStore.currentProjectId ? 'Toggle My Issues' : 'Select a project'"
	            :aria-pressed="myIssuesOnly ? 'true' : 'false'"
	            :class="[
	              'w-10 h-10 flex items-center justify-center rounded-full text-white border disabled:opacity-40',
	              myIssuesOnly ? 'bg-white/15 border-white/20 hover:bg-white/20' : 'bg-white/6 border-white/10 hover:bg-white/10'
	            ]"
	            @click="myIssuesOnly = !myIssuesOnly"
	          >
	            <svg
	              xmlns="http://www.w3.org/2000/svg"
	              viewBox="0 0 24 24"
	              fill="none"
	              stroke="currentColor"
	              class="w-5 h-5"
	              aria-hidden="true"
	            >
	              <path
	                d="M20 21a8 8 0 10-16 0"
	                stroke-width="1.5"
	                stroke-linecap="round"
	              />
	              <path
	                d="M12 11a4 4 0 100-8 4 4 0 000 8z"
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
	            {{ myIssuesOnly ? 'Showing My Issues' : 'My Issues' }}
	          </div>
	        </div>

	        <div class="relative inline-block group shrink-0">
	          <button
	            :disabled="!projectStore.currentProjectId"
	            aria-label="Toggle analytics"
            :title="projectStore.currentProjectId ? 'Toggle analytics' : 'Select a project'"
            :class="[
              'h-10 px-3 inline-flex items-center gap-2 rounded-full text-white border disabled:opacity-40',
              showAnalytics ? 'bg-white/15 border-white/20 hover:bg-white/20' : 'bg-transparent border-white/15 hover:bg-white/15'
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

	        <div class="relative inline-block group shrink-0">
	          <button
	            :disabled="!canAutoTagIssuesPage"
            aria-label="Auto-tag this page"
            :title="canAutoTagIssuesPage ? 'Auto-tag this page' : 'Auto-tagging requires AI + a selected project'"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
            @click="showAutoTagModal = true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                d="M4 7h9a3 3 0 0 1 0 6H9a3 3 0 1 0 0 6h11"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M4 7v0"
                stroke-width="1.5"
                stroke-linecap="round"
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

	        <div class="relative inline-block group shrink-0">
	          <button
	            :disabled="!projectStore.currentProjectId"
	            type="button"
	            aria-label="More tools"
	            :title="projectStore.currentProjectId ? 'More tools' : 'Select a project'"
	            :class="[
	              'w-10 h-10 flex items-center justify-center rounded-full text-white border disabled:opacity-40 relative',
	              (showAdvancedFilters || showFiltersModal) ? 'bg-white/15 border-white/20 hover:bg-white/20' : 'bg-transparent border-white/10 hover:bg-white/10'
	            ]"
	            @click="openFilters"
	          >
	            <svg
	              xmlns="http://www.w3.org/2000/svg"
	              viewBox="0 0 24 24"
	              fill="none"
	              stroke="currentColor"
	              class="w-5 h-5"
	              aria-hidden="true"
	            >
	              <path
	                d="M6 12h.01M12 12h.01M18 12h.01"
	                stroke-width="2.5"
	                stroke-linecap="round"
	                stroke-linejoin="round"
	              />
	            </svg>
	            <span
	              :class="[
	                'absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white/15 border border-white/20 text-white/80 text-[11px] inline-flex items-center justify-center',
	                advancedFiltersActiveCount > 0 ? '' : 'invisible'
	              ]"
	            >{{ advancedFiltersActiveCount }}</span>
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

      <!-- Advanced filters (md+). For mobile, use the modal. -->
      <div
        v-if="showAdvancedFilters && isDesktop"
        class="w-full mt-3 pt-3 border-t border-white/10"
	      >
	        <div class="space-y-3">
	          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[2.25fr_0.9fr_2.25fr_2fr_2fr] gap-3 items-end">
	            <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Priority</label>
	            <div
	              ref="priorityMenuRef"
	              class="relative"
	            >
              <button
                :aria-expanded="showPriorityMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 w-full justify-between"
                @click="togglePriorityMenu"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ priorityFilter }}</span>
                  <span :class="priorityBadgeClass(priorityFilter) + ' text-xs px-2 py-0.5 rounded-full shrink-0'">{{ priorityCount(priorityFilter) }}</span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-3 h-3 ml-1 shrink-0"
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </button>
              <div
                v-if="showPriorityMenu"
                class="absolute left-0 mt-2 w-56 rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
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
	
	            <div class="flex flex-col gap-1">
	              <label
	                for="hasOprChk"
	                class="text-white/70 text-sm whitespace-nowrap text-center"
	              >Has OPR</label>
	              <label
	                for="hasOprChk"
	                class="w-full h-8 rounded-lg bg-white/6 flex items-center justify-center cursor-pointer"
	              >
	                <input
	                  id="hasOprChk"
	                  v-model="hasOprFilter"
	                  type="checkbox"
		                  class="form-checkbox h-4 w-4 rounded bg-white/10 border-white/30 text-white/80 checked:bg-white/10 checked:border-white/30"
	                  :disabled="oprAddonRequired || !preferredProjectId"
	                >
	              </label>
	            </div>
	
	            <div class="flex flex-col gap-1">
		            <label class="text-white/70 text-sm">OPR</label>
		            <div
		              ref="oprMenuRef"
		              class="relative"
		            >
              <button
                :aria-expanded="showOprMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 w-full justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="oprAddonRequired || !preferredProjectId"
                @click="toggleOprMenu"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ oprFilterLabel }}</span>
                  <span
                    v-if="oprFiltersLoading || oprItemsLoading"
                    class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 shrink-0"
                  >
                    Loading…
                  </span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-3 h-3 ml-1 shrink-0"
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </button>

              <div
                v-if="showOprMenu"
                class="absolute left-0 mt-2 w-[28rem] max-w-[85vw] max-h-96 overflow-auto rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
                role="menu"
              >
                <div class="py-1">
                  <button
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', oprCategoryFilter === 'All' && oprItemFilter === 'All' ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="selectOprFilter({ kind: 'all' })"
                  >
                    <span>All</span>
                  </button>
                  <div class="my-1 h-px bg-white/10" />
                  <button
                    v-for="opt in oprFilterOptions"
                    :key="opt.key"
                    role="menuitem"
                    :class="[
                      'w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2',
                      opt.kind === 'category' ? 'text-white/80 font-semibold' : 'text-white/90',
                      isOprFilterSelected(opt) ? 'bg-white/10 text-white' : (opt.kind === 'category' ? 'hover:bg-white/10' : 'hover:bg-white/10')
                    ]"
                    @click="selectOprFilter(opt)"
                  >
                    <span class="min-w-0 truncate">{{ opt.label }}</span>
                    <span
                      v-if="opt.kind === 'item' && opt.status === 'archived'"
                      class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70 shrink-0"
                    >
                      Archived
	            </span>
	          </button>
		              </div>
		            </div>
	            </div>
	            </div>
		
	            <div class="flex flex-col gap-1">
	              <label class="text-white/70 text-sm">Location</label>
	              <input
	                v-model="locationFilter"
	                type="text"
	                placeholder="e.g. Mezzanine"
	                class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
	              >
	            </div>
	
	            <div class="flex flex-col gap-1">
	              <label class="text-white/70 text-sm">Responsible</label>
	              <input
	                v-model="responsibleFilter"
	                type="text"
	                placeholder="name or email"
	                class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
	              >
	            </div>
	          </div>
	
	          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
	            <div class="flex flex-col gap-1">
		            <label class="text-white/70 text-sm">System</label>
		            <input
		              v-model="systemFilter"
		              type="text"
	              placeholder="e.g. HVAC"
	              class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
	            >
	            </div>
	
	            <div class="flex flex-col gap-1">
		            <label class="text-white/70 text-sm">Date Found</label>
		            <div class="grid grid-cols-2 gap-2">
		              <input
		                v-model="dateFoundFrom"
	                type="date"
	                placeholder="From"
	                :class="[
	                  'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
	                  dateFoundFrom ? 'text-white' : 'text-white/60',
	                ]"
	              >
	              <input
	                v-model="dateFoundTo"
	                type="date"
	                placeholder="To"
	                :class="[
	                  'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
	                  dateFoundTo ? 'text-white' : 'text-white/60',
	                ]"
		              >
		            </div>
	            </div>
	
	            <div class="flex flex-col gap-1">
		            <label class="text-white/70 text-sm">Due Date</label>
		            <div class="grid grid-cols-2 gap-2">
		              <input
		                v-model="dueDateFrom"
	                type="date"
	                placeholder="From"
	                :class="[
	                  'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
	                  dueDateFrom ? 'text-white' : 'text-white/60',
	                ]"
	              >
	              <input
	                v-model="dueDateTo"
	                type="date"
	                placeholder="To"
	                :class="[
	                  'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
	                  dueDateTo ? 'text-white' : 'text-white/60',
	                ]"
		              >
		            </div>
	            </div>
	
	            <div class="flex flex-col gap-1">
		            <label class="text-white/70 text-sm">Tags</label>
		            <input
		              v-model="tagsFilter"
		              type="text"
		              placeholder="comma-separated"
		              class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
		            >
	            </div>
	          </div>

	        <div class="mt-3 flex items-center justify-between gap-3">
	          <div class="flex flex-wrap items-center gap-2">
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
	                class="absolute left-0 mt-2 w-64 rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
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
	            <button
	              type="button"
	              class="px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
	              @click="clearAdvancedFilters"
	            >
	              Clear advanced filters
	            </button>
	          </div>
	          <div class="text-xs text-white/50">
	            Advanced filters show on desktop; mobile uses the Filters panel.
	          </div>
	        </div>
      </div>
    </div>

    <!-- analytics -->
    <div
      v-if="showAnalytics"
      class="rounded-2xl p-4 md:p-6 bg-white/5 border border-white/10"
    >
      <div class="flex items-center justify-between mb-4">
        <div class="text-white font-semibold">
          Analytics
        </div>
        <button
          class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
          @click="showAnalytics = false"
        >
          Hide
        </button>
      </div>
      <IssuesListCharts
        :analytics="issuesAnalytics"
        :loading="analyticsLoading"
      />
    </div>

    <div
      v-if="loading"
      class="rounded-2xl p-6 bg-white/6 backdrop-blur-xl border border-white/10 min-w-0 flex flex-col items-center justify-center text-white/70"
    >
      <Spinner />
      <p class="mt-3 text-sm uppercase tracking-wide">
        Loading issues…
      </p>
    </div>
    <div
      v-else
      class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl overflow-x-auto min-w-0"
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
        <div class="flex items-center justify-between gap-3 gap-y-2 flex-wrap px-2 py-1 text-white/70 text-sm mb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-white/60">Sort</span>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              @click="setSort('number')"
            >
              <span>Number</span>
              <span
                v-if="sortKey==='number' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='number' && sortDir===-1"
                class="text-xs"
              >▼</span>
              <span
                v-else
                class="text-xs opacity-40"
              >⇅</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              @click="setSort('title')"
            >
              <span>Title</span>
              <span
                v-if="sortKey==='title' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='title' && sortDir===-1"
                class="text-xs"
              >▼</span>
              <span
                v-else
                class="text-xs opacity-40"
              >⇅</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              @click="setSort('type')"
            >
              <span>Type</span>
              <span
                v-if="sortKey==='type' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='type' && sortDir===-1"
                class="text-xs"
              >▼</span>
              <span
                v-else
                class="text-xs opacity-40"
              >⇅</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              @click="setSort('priority')"
            >
              <span>Priority</span>
              <span
                v-if="sortKey==='priority' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='priority' && sortDir===-1"
                class="text-xs"
              >▼</span>
              <span
                v-else
                class="text-xs opacity-40"
              >⇅</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              @click="setSort('status')"
            >
              <span>Status</span>
              <span
                v-if="sortKey==='status' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='status' && sortDir===-1"
                class="text-xs"
              >▼</span>
              <span
                v-else
                class="text-xs opacity-40"
              >⇅</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              @click="setSort('updatedAt')"
            >
              <span>Updated</span>
              <span
                v-if="sortKey==='updatedAt' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='updatedAt' && sortDir===-1"
                class="text-xs"
              >▼</span>
              <span
                v-else
                class="text-xs opacity-40"
              >⇅</span>
            </button>
          </div>
        </div>
        <!-- Card-based issue list -->
        <div class="flex flex-col gap-4">
          <div
            v-for="issue in pagedIssues"
            :key="issue.id"
            :class="['rounded-xl bg-white/10 border border-white/10 p-2 flex flex-col md:flex-row md:items-center gap-2 shadow-sm transition-opacity', isClosedRow(issue) ? 'opacity-60' : '']"
          >
            <!-- Left: Main info -->
            <router-link
              :to="`/app/issues/${issue.id}`"
              class="flex-1 ..."
              tabindex="0"
              style="text-decoration: none;"
            >
              <div class="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <div class="flex flex-col min-w-[60px] items-start">
                  <div class="text-xs text-white/60">
                    Issue #
                  </div>
                  <div class="text-lg font-bold text-white">
                    {{ issue.number }}
                  </div>
                </div>
                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-xs text-white/60">Title:</span>
                    <span class="text-base font-semibold text-white">{{ issue.title || issue.type }}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-xs text-white/60">Type:</span>
                    <span
                      v-if="issue.type"
                      class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                    >{{ issue.type }}</span>
                    <span
                      v-else
                      class="text-xs text-white/40"
                    >N/A</span>
                    <span class="text-xs text-white/60 ml-4">Status:</span>
                    <span
                      v-if="issue.status"
                      :class="statusBadgeClass(issue.status) + ' text-xs px-2 py-0.5 rounded-full'"
                    >{{ issue.status }}</span>
                    <span
                      v-else
                      class="text-xs text-white/40"
                    >N/A</span>
                    <span class="text-xs text-white/60 ml-4">Priority:</span>
                    <span
                      v-if="issue.priority"
                      :class="priorityClass(issue.priority) + ' text-xs px-2 py-0.5 rounded-full'"
                    >{{ issue.priority }}</span>
                    <span
                      v-else
                      class="text-xs text-white/40"
                    >N/A</span>
                    <span
                      v-if="issue.foundBy || issue.dateFound"
                      class="text-xs text-white/60 ml-4"
                    >
                      <template v-if="issue.foundBy && issue.dateFound">
                        Found by <span class="text-white/80">{{ issue.foundBy }}</span> on <span class="text-white/80">{{ formatDate(issue.dateFound) }}</span>
                      </template>
                      <template v-else-if="issue.foundBy">
                        Found by <span class="text-white/80">{{ issue.foundBy }}</span>
                      </template>
                      <template v-else-if="issue.dateFound">
                        Found on <span class="text-white/80">{{ formatDate(issue.dateFound) }}</span>
                      </template>
                    </span>
                  </div>
                  <div
                    v-if="Array.isArray(issue.oprItemIds) && issue.oprItemIds.length"
                    class="flex flex-wrap items-center gap-2 mb-1"
                  >
                    <span class="text-xs text-white/60">OPR:</span>
                    <template v-if="issueOprItems(issue).length">
                      <button
                        v-for="it in issueOprItems(issue)"
                        :key="it.id"
                        type="button"
                        class="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-xs text-white/85 max-w-[18rem] hover:bg-white/15 hover:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/30"
                        :title="`Open OPR item: #${it.rank} ${it.text}`"
                        @click.stop.prevent="openOprItemFromChip(it)"
                      >
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 shrink-0">
                          #{{ it.rank }}
                        </span>
                        <span
                          v-if="it.status === 'archived'"
                          class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/60 shrink-0"
                        >
                          Archived
                        </span>
                        <span class="truncate min-w-0">{{ truncate(it.text, 60) }}</span>
                      </button>
                    </template>
                    <template v-else>
                      <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                        {{ issue.oprItemIds.length }} linked
                      </span>
                    </template>
                  </div>
                  <div class="w-full border-t border-dashed border-white/30 my-1" />
                  <div class="mb-1">
                    <span class="text-white/70 text-sm">{{ truncate(htmlToText(issue.description), 500) }}<span v-if="htmlToText(issue.description)?.length > 500">...</span></span>
                  </div>
                  <div class="flex flex-wrap gap-4 text-xs text-white/60 mt-1">
                    <span v-if="issue.system"><span class="text-white/80">System:</span> {{ issue.system }}</span>
                    <span v-if="issue.location"><span class="text-white/80">Location:</span> {{ issue.location }}</span>
                    <span v-if="issue.responsible_person"><span class="text-white/80">Responsible:</span> {{ issue.responsible_person }}</span>
                    <span v-if="issue.equipment"><span class="text-white/80">Equipment:</span> {{ issue.equipment }}</span>
                    <span v-if="issue.recommendation"><span class="text-white/80">Recommendation:</span> {{ issue.recommendation }}</span>
                    <span v-if="issue.dueDate"><span class="text-white/80">Respond By:</span> {{ formatDate(issue.dueDate) }}</span>
                    <span v-if="issue.closedDate"><span class="text-white/80">Closed:</span> {{ formatDate(issue.closedDate) }}</span>
                  </div>
                </div>
              </div>
            </router-link>
            <!-- Right: Actions -->
            <div class="flex flex-col items-end min-w-[120px] justify-end">
              <div class="flex flex-row items-center gap-1">
                <button
                  class="w-6 h-6 grid place-items-center rounded bg-white/10 hover:bg-white/20 text-white border border-white/10 p-0"
                  aria-label="Visit issue"
                  :title="`Visit issue #${issue.number || ''}`"
                  @click="openView(issue)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-3 h-3"
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
                <button
                  class="w-6 h-6 grid place-items-center rounded bg-white/10 hover:bg-white/20 text-white border border-white/10 p-0"
                  aria-label="Edit issue"
                  :title="`Edit issue #${issue.number || ''}`"
                  @click="openEdit(issue)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-3 h-3"
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
                <button
                  class="w-6 h-6 grid place-items-center rounded bg-red-500/30 hover:bg-red-500/50 text-red-100 border border-red-400/40 p-0"
                  aria-label="Delete issue"
                  :title="`Delete issue #${issue.number || ''}`"
                  @click="onDelete(issue)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-3 h-3"
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
              <div class="inline-flex items-center gap-1 mt-2">
                <span class="text-xs select-none">Closed</span>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="isClosedRow(issue)"
                  :aria-label="`Toggle Closed`"
                  class="relative inline-flex h-5 w-8 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                  :class="isClosedRow(issue) ? 'bg-emerald-500/70 border-emerald-400/80' : 'bg-white/10 border-white/30'"
                  @click="toggleIssueClosed(issue)"
                  @keydown.space.prevent="toggleIssueClosed(issue)"
                  @keydown.enter.prevent="toggleIssueClosed(issue)"
                >
                  <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                    :class="isClosedRow(issue) ? 'translate-x-3' : 'translate-x-0.5'"
                  />
                </button>
                <span
                  class="text-xs select-none"
                  :class="isClosedRow(issue) ? 'text-emerald-200' : 'text-white/60'"
                >{{ isClosedRow(issue) ? 'YES' : 'NO' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Pagination controls (Equipment-style): rows per page + range on left, page nav on right -->
    <div
      v-if="totalItems > 0"
      class="grid gap-2 px-2 py-3 text-white/70 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center"
    >
      <div class="flex items-center gap-2 md:justify-self-start">
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
      <div class="flex items-center gap-1 md:justify-self-center">
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
      <div
        aria-hidden="true"
        class="hidden md:block"
      />
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

    <BulkAutoTagModal
      v-model="showAutoTagModal"
      :project-id="resolvedProjectId"
      entity-type="issue"
      :allowed-tags="projectAllowedTags"
      :items="autoTagIssueItems"
      :can-suggest="canAutoTagIssuesPage"
      :apply-tags="applyIssueTags"
    />

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

    <!-- Mobile Filters Modal -->
    <Modal v-model="showFiltersModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Filters
        </h3>
      </template>
      <div class="space-y-4">
	        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Type</label>
            <select
              v-model="typeFilter"
              class="px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
            >
              <option
                v-for="opt in typeOptions"
                :key="opt.name"
                :value="opt.name"
              >
                {{ opt.name }} ({{ opt.count }})
              </option>
            </select>
          </div>

	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Status</label>
            <select
              v-model="statusFilter"
              class="px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
            >
              <option
                v-for="opt in statusOptions"
                :key="opt.name"
                :value="opt.name"
              >
                {{ opt.name }} ({{ opt.count }})
              </option>
            </select>
          </div>

	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Priority</label>
		            <select
		              v-model="priorityFilter"
	              class="px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
	            >
              <option
                v-for="opt in priorityOptions"
                :key="opt.name"
                :value="opt.name"
              >
                {{ opt.name }} ({{ opt.count }})
              </option>
		            </select>
		          </div>
	
		          <div class="flex flex-col gap-1">
		            <label
		              for="hasOprChkMobile"
		              class="text-white/70 text-sm text-center"
		            >Has OPR</label>
		            <label
		              for="hasOprChkMobile"
		              class="w-full h-8 rounded-lg bg-white/6 flex items-center justify-center cursor-pointer"
		            >
		              <input
		                id="hasOprChkMobile"
		                v-model="hasOprFilter"
		                type="checkbox"
			                class="form-checkbox h-4 w-4 rounded bg-white/10 border-white/30 text-white/80 checked:bg-white/10 checked:border-white/30"
		                :disabled="oprAddonRequired || !preferredProjectId"
		              >
		            </label>
		          </div>
	
	          <div class="flex flex-col gap-1 items-start">
	            <label
	              for="myIssuesChkMobile"
	              class="text-white/70 text-sm"
	            >My Issues</label>
	            <input
	              id="myIssuesChkMobile"
	              v-model="myIssuesOnly"
	              type="checkbox"
	              class="form-checkbox h-4 w-4 rounded bg-white/10 border-white/30 text-white/80 checked:bg-white/10 checked:border-white/30 mt-1"
	            >
	          </div>
	
			          <div class="flex flex-col gap-1">
			            <label class="text-white/70 text-sm">OPR</label>
			            <div
			              ref="oprMenuRef"
	              class="relative"
	            >
	              <button
	                :aria-expanded="showOprMenu ? 'true' : 'false'"
	                class="px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 w-full justify-between disabled:opacity-40 disabled:cursor-not-allowed"
	                :disabled="oprAddonRequired || !preferredProjectId"
	                @click="toggleOprMenu"
	              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ oprFilterLabel }}</span>
                  <span
                    v-if="oprFiltersLoading || oprItemsLoading"
                    class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 shrink-0"
                  >
                    Loading…
                  </span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-3 h-3 ml-1 shrink-0"
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </button>

              <div
                v-if="showOprMenu"
                class="absolute left-0 mt-2 w-[28rem] max-w-[85vw] max-h-96 overflow-auto rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
                role="menu"
              >
                <div class="py-1">
                  <button
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', oprCategoryFilter === 'All' && oprItemFilter === 'All' ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="selectOprFilter({ kind: 'all' })"
                  >
                    <span>All</span>
                  </button>
                  <div class="my-1 h-px bg-white/10" />
                  <button
                    v-for="opt in oprFilterOptions"
                    :key="opt.key"
                    role="menuitem"
                    :class="[
                      'w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2',
                      opt.kind === 'category' ? 'text-white/80 font-semibold' : 'text-white/90',
                      isOprFilterSelected(opt) ? 'bg-white/10 text-white' : (opt.kind === 'category' ? 'hover:bg-white/10' : 'hover:bg-white/10')
                    ]"
                    @click="selectOprFilter(opt)"
                  >
                    <span class="min-w-0 truncate">{{ opt.label }}</span>
                    <span
                      v-if="opt.kind === 'item' && opt.status === 'archived'"
                      class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/70 shrink-0"
                    >
                      Archived
                    </span>
                  </button>
			                </div>
			              </div>
			            </div>
			          </div>

	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Location</label>
	            <input
	              v-model="locationFilter"
	              type="text"
	              class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
	              placeholder="e.g. Mezzanine"
	            >
	          </div>

	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Responsible</label>
	            <input
	              v-model="responsibleFilter"
	              type="text"
	              class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
	              placeholder="name or email"
	            >
	          </div>

	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">System</label>
	            <input
	              v-model="systemFilter"
	              type="text"
	              class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
	              placeholder="e.g. HVAC"
	            >
	          </div>

	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Date Found</label>
	            <div class="grid grid-cols-2 gap-2">
	              <input
	                v-model="dateFoundFrom"
	                type="date"
	                placeholder="From"
	                :class="[
	                  'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
	                  dateFoundFrom ? 'text-white' : 'text-white/60',
	                ]"
	              >
	              <input
	                v-model="dateFoundTo"
	                type="date"
	                placeholder="To"
	                :class="[
	                  'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
	                  dateFoundTo ? 'text-white' : 'text-white/60',
	                ]"
	              >
	            </div>
	          </div>

	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Due Date</label>
	            <div class="grid grid-cols-2 gap-2">
	              <input
	                v-model="dueDateFrom"
	                type="date"
	                placeholder="From"
	                :class="[
	                  'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
	                  dueDateFrom ? 'text-white' : 'text-white/60',
	                ]"
	              >
	              <input
	                v-model="dueDateTo"
	                type="date"
	                placeholder="To"
	                :class="[
	                  'px-3 py-2 rounded-lg appearance-none [color-scheme:dark] bg-white/10 hover:bg-white/15 focus:bg-white/15 text-sm border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-white/40',
	                  dueDateTo ? 'text-white' : 'text-white/60',
	                ]"
	              >
	            </div>
	          </div>

	          <div class="flex flex-col gap-1">
	            <label class="text-white/70 text-sm">Tags</label>
	            <input
	              v-model="tagsFilter"
	              type="text"
	              class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 focus:bg-white/15 text-white text-sm border border-white/15 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
	              placeholder="comma-separated"
	            >
	          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-between gap-2 w-full">
          <div class="flex flex-wrap items-center gap-2">
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
                class="absolute left-0 mt-2 w-64 rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
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
            <button
              type="button"
              class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
              @click="clearAllFilters"
            >
              Clear all
            </button>
          </div>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
            @click="showFiltersModal = false"
          >
            Done
          </button>
        </div>
      </template>
    </Modal>

    <!-- Hidden report generator component -->
    <IssuePdfReport ref="reportRef" />
  </section>
</template>

<script setup lang="ts">
// Utility: format a date string to a readable format
function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d)) return ''
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import SearchPill from '../../components/SearchPill.vue'
import Modal from '../../components/Modal.vue'
import IssueForm from '../../components/IssueForm.vue'
import Spinner from '../../components/Spinner.vue'
import IssuesListCharts from '../../components/charts/IssuesListCharts.vue'
import type { IssuesAnalytics } from '../../components/charts/IssuesListCharts.vue'
import BulkAutoTagModal from '../../components/BulkAutoTagModal.vue'
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
  import { runCoachmarkOnce } from '../../utils/coachmarks'
// Preferred/common export columns in desired order
const removedColumns = ['projectId', 'comments', 'attachments', 'photos', 'documents', 'updatedAt', 'closedBy']
const preferredColumns = ['number','title','description','type','priority','severity','status','foundBy','dateFound','assignedTo','responsible_person','dueDate','createdAt','closedDate','location','system']

const issuesStore = useIssuesStore()
const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const showAutoTagModal = ref(false)

const resolvedProjectId = computed(() => String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim())
const projectAllowedTags = computed(() => Array.isArray((projectStore.currentProject as any)?.tags) ? (projectStore.currentProject as any).tags : [])
const canAutoTagIssuesPage = computed(() => {
  const pid = resolvedProjectId.value
  if (!pid) return false
  const p: any = projectStore.currentProject || {}
  if (p.ai && p.ai.enabled === false) return false
  const tier = String(p.subscriptionTier || '').toLowerCase()
  const hasFeature = p.subscriptionFeatures && (p.subscriptionFeatures.ai === true || p.subscriptionFeatures.AI === true)
  return tier === 'premium' || hasFeature
})

const autoTagIssueItems = computed(() => {
  const list: any[] = Array.isArray(pagedIssues.value) ? pagedIssues.value : []
  return list
    .map((issue: any) => {
      const id = String(issue?.id || issue?._id || '').trim()
      if (!id) return null
      const num = issue?.number != null ? String(issue.number) : ''
      const title = String(issue?.title || '').trim() || `Issue ${num || id}`
      const existing = Array.isArray(issue?.labels) ? issue.labels : []
      const entity = {
        number: issue?.number ?? null,
        title,
        type: issue?.type || null,
        status: issue?.status || null,
        priority: issue?.priority || issue?.severity || null,
        system: String(issue?.system || '').trim(),
        location: String(issue?.location || '').trim(),
        description: String(issue?.description || '').trim(),
        recommendation: String(issue?.recommendation || '').trim(),
        resolution: String(issue?.resolution || '').trim(),
      }
      const subtitle = [issue?.type, issue?.status].filter(Boolean).join(' • ')
      return { id, title: num ? `#${num} ${title}` : title, subtitle, existingTags: existing, entity }
    })
    .filter(Boolean) as any
})

async function applyIssueTags(id: string, tags: string[]) {
  await issuesStore.updateIssue(id, { labels: tags })
}

function readChartsPreference(): boolean {
  try {
    const raw = sessionStorage.getItem('issuesListCharts:open')
    if (raw === 'true') return true
    if (raw === 'false') return false
  } catch (e) { /* ignore */ }
  try {
    const v = (authStore.user as any)?.contact?.ui?.issuesListChartsDefault
    if (v === true) return true
    if (v === false) return false
  } catch (e) { /* ignore */ }
  return false
}

const showAnalytics = ref(readChartsPreference())
const analyticsLoading = ref(false)
const issuesAnalytics = ref<IssuesAnalytics | null>(null)
const analyticsForProjectId = ref('')

function toggleAnalytics() {
  showAnalytics.value = !showAnalytics.value
  try { sessionStorage.setItem('issuesListCharts:open', showAnalytics.value ? 'true' : 'false') } catch (e) { /* ignore */ }
}

async function fetchIssuesAnalytics(projectId?: string) {
  const pid = String(projectId || projectStore.currentProjectId || '')
  if (!pid) return
  if (analyticsForProjectId.value === pid && issuesAnalytics.value) return
  analyticsLoading.value = true
  try {
    const res = await http.get('/api/issues/analytics', { params: { projectId: pid }, headers: getAuthHeaders() })
    issuesAnalytics.value = (res && res.data) ? res.data : null
    analyticsForProjectId.value = pid
  } catch (e: any) {
    analyticsForProjectId.value = pid
    issuesAnalytics.value = null
    ui.showError(e?.response?.data?.error || 'Failed to load issue analytics')
  } finally {
    analyticsLoading.value = false
  }
}
const serverIssues = ref([])
const serverTotal = ref(0)
const serverTotalAll = ref(0)
const listMode = ref<'api' | 'store'>('api')
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
const showOprMenu = ref(false)
const oprMenuRef = ref(null)

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
function toggleOprMenu() {
  showOprMenu.value = !showOprMenu.value
}
function closeOprMenu() {
  showOprMenu.value = false
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
  const oEl = oprMenuRef.value
  if (dEl && !dEl.contains(e.target)) closeDownloadsMenu()
  if (tEl && !tEl.contains(e.target)) closeTypeMenu()
  if (pEl && !pEl.contains(e.target)) closePriorityMenu()
  if (sEl && !sEl.contains(e.target)) closeStatusMenu()
  if (oEl && !oEl.contains(e.target)) closeOprMenu()
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

onMounted(async () => {
  // fetch issues for current project on mount
  try { await issuesStore.fetchIssues() } catch (e) { /* ignore */ }

  const pid = String(resolvedProjectId.value || '').trim()
  const uid = authStore.user?._id ? String(authStore.user._id) : null
  if (pid) {
    runCoachmarkOnce('issues.list.toolbar.tip', { projectId: pid, userId: uid }, () => {
      ui.showInfo('Tip: Use Analytics to see issues by status/type, and Auto-tag to suggest tags from your project library.', { duration: 10000 })
    })
  }
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
	const oprCategoryFilter = ref('All')
	const oprItemFilter = ref('All')
	const hasOprFilter = ref(false)
	const locationFilter = ref('')
	const responsibleFilter = ref('')
	const systemFilter = ref('')
	const dateFoundFrom = ref('')
	const dateFoundTo = ref('')
		const dueDateFrom = ref('')
		const dueDateTo = ref('')
		const tagsFilter = ref('')
		const showAdvancedFilters = ref(false)
		const showFiltersModal = ref(false)
		const isDesktop = ref(false)
		const searchQuery = ref('')
const searchMode = computed(() => {
  try {
    const p = projectStore.currentProject && projectStore.currentProject.value ? projectStore.currentProject.value : null
    const m = p && p.searchMode ? String(p.searchMode).toLowerCase() : ''
    return m || 'substring'
  } catch (e) { return 'substring' }
	})
	const hideClosed = ref(false)
	const myIssuesOnly = ref(false)
		// Sorting state (used in persistence below; defined here to avoid temporal use)
		const sortKey = ref('')
		const sortDir = ref(1) // 1 = asc, -1 = desc

function updateIsDesktop() {
  try {
    isDesktop.value = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 768px)').matches
      : false
  } catch (e) {
    isDesktop.value = false
  }
}

onMounted(() => {
  updateIsDesktop()
  try { window.addEventListener('resize', updateIsDesktop) } catch (e) { /* ignore */ }
})
onBeforeUnmount(() => {
  try { window.removeEventListener('resize', updateIsDesktop) } catch (e) { /* ignore */ }
})

function setSort(key: string) {
  const k = String(key || '').trim()
  if (!k) return
  if (sortKey.value === k) {
    sortDir.value = sortDir.value === 1 ? -1 : 1
  } else {
    sortKey.value = k
    sortDir.value = 1
  }
  page.value = 1
}

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
      if (typeof data.oprCategoryFilter === 'string') oprCategoryFilter.value = data.oprCategoryFilter
      if (typeof data.oprItemFilter === 'string') oprItemFilter.value = data.oprItemFilter
      if (typeof data.hasOprFilter === 'boolean') hasOprFilter.value = data.hasOprFilter
      if (typeof data.locationFilter === 'string') locationFilter.value = data.locationFilter
      if (typeof data.responsibleFilter === 'string') responsibleFilter.value = data.responsibleFilter
      if (typeof data.systemFilter === 'string') systemFilter.value = data.systemFilter
      if (typeof data.dateFoundFrom === 'string') dateFoundFrom.value = data.dateFoundFrom
      if (typeof data.dateFoundTo === 'string') dateFoundTo.value = data.dateFoundTo
      if (typeof data.dueDateFrom === 'string') dueDateFrom.value = data.dueDateFrom
      if (typeof data.dueDateTo === 'string') dueDateTo.value = data.dueDateTo
	      if (typeof data.tagsFilter === 'string') tagsFilter.value = data.tagsFilter
	      if (typeof data.hideClosed === 'boolean') hideClosed.value = data.hideClosed
	      if (typeof data.myIssuesOnly === 'boolean') myIssuesOnly.value = data.myIssuesOnly
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
      oprCategoryFilter: oprCategoryFilter.value,
      oprItemFilter: oprItemFilter.value,
      hasOprFilter: hasOprFilter.value,
      locationFilter: locationFilter.value,
      responsibleFilter: responsibleFilter.value,
      systemFilter: systemFilter.value,
	      dateFoundFrom: dateFoundFrom.value,
	      dateFoundTo: dateFoundTo.value,
	      dueDateFrom: dueDateFrom.value,
	      dueDateTo: dueDateTo.value,
	      tagsFilter: tagsFilter.value,
	      hideClosed: hideClosed.value,
	      myIssuesOnly: myIssuesOnly.value,
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

const advancedFiltersActiveCount = computed(() => {
  let n = 0
  if (priorityFilter.value && priorityFilter.value !== 'All') n += 1
  if (oprItemFilter.value && oprItemFilter.value !== 'All') n += 1
  else if (oprCategoryFilter.value && oprCategoryFilter.value !== 'All') n += 1
  if (hasOprFilter.value) n += 1
  if (String(locationFilter.value || '').trim()) n += 1
  if (String(responsibleFilter.value || '').trim()) n += 1
  if (String(systemFilter.value || '').trim()) n += 1
  if (String(dateFoundFrom.value || '').trim()) n += 1
  if (String(dateFoundTo.value || '').trim()) n += 1
  if (String(dueDateFrom.value || '').trim()) n += 1
  if (String(dueDateTo.value || '').trim()) n += 1
  if (String(tagsFilter.value || '').trim()) n += 1
  return n
})

function openFilters() {
  if (isDesktop.value) {
    showFiltersModal.value = false
    showAdvancedFilters.value = !showAdvancedFilters.value
  } else {
    showAdvancedFilters.value = false
    showFiltersModal.value = true
  }
}

function clearAdvancedFilters() {
  priorityFilter.value = 'All'
  oprCategoryFilter.value = 'All'
  oprItemFilter.value = 'All'
  hasOprFilter.value = false
  locationFilter.value = ''
  responsibleFilter.value = ''
  systemFilter.value = ''
  dateFoundFrom.value = ''
  dateFoundTo.value = ''
  dueDateFrom.value = ''
  dueDateTo.value = ''
  tagsFilter.value = ''
  closePriorityMenu()
  closeOprMenu()
}

function clearAllFilters() {
  typeFilter.value = 'All'
  statusFilter.value = 'All'
  hideClosed.value = false
  myIssuesOnly.value = false
  clearAdvancedFilters()
  closeTypeMenu()
  closeStatusMenu()
}

type OprItemMeta = { id: string; categoryId: string | null; text: string; score: number; rank: number; status: 'active' | 'archived' }
type OprCategoryMeta = { id: string; name: string; sortOrder?: number }

const oprAddonRequired = ref(false)
const oprMetaLoading = ref(false)
const oprItemMetaById = ref<Record<string, OprItemMeta>>({})
const oprCategories = ref<OprCategoryMeta[]>([])
const oprItemsForFilter = ref<OprItemMeta[]>([])
const oprFiltersLoading = ref(false)
const oprItemsLoading = ref(false)

type OprFilterOption = {
  key: string;
  kind: 'all' | 'category' | 'item';
  label: string;
  categoryId?: string;
  itemId?: string;
  status?: 'active' | 'archived';
}

const oprCategoryNameById = computed(() => {
  const map: Record<string, string> = {}
  for (const c of (oprCategories.value || [])) map[String(c.id)] = String(c.name || '').trim() || 'Unnamed'
  return map
})

function findOprItemById(id: string) {
  const sid = String(id || '').trim()
  if (!sid) return null
  const list = Array.isArray(oprItemsForFilter.value) ? oprItemsForFilter.value : []
  return list.find((it) => String(it?.id || '') === sid) || null
}

const oprFilterLabel = computed(() => {
  if (oprAddonRequired.value) return 'OPR add-on required'
  if (!preferredProjectId.value) return 'All'

  const itemId = String(oprItemFilter.value || '').trim()
  if (itemId && itemId !== 'All') {
    const it = findOprItemById(itemId)
    const catName = it?.categoryId ? (oprCategoryNameById.value[String(it.categoryId)] || 'Uncategorized') : 'Uncategorized'
    const text = String(it?.text || '').trim()
    const rank = Number(it?.rank || 0)
    return `${catName} — #${rank || 0} ${text || 'Item'}`
  }

  const catId = String(oprCategoryFilter.value || '').trim()
  if (catId && catId !== 'All') {
    return oprCategoryNameById.value[catId] || 'Category'
  }

  return 'All'
})

const oprFilterOptions = computed<OprFilterOption[]>(() => {
  const cats = Array.isArray(oprCategories.value) ? oprCategories.value : []
  const items = Array.isArray(oprItemsForFilter.value) ? oprItemsForFilter.value : []

  const itemsByCat: Record<string, OprItemMeta[]> = {}
  for (const it of items) {
    const cid = it?.categoryId ? String(it.categoryId) : ''
    if (!itemsByCat[cid]) itemsByCat[cid] = []
    itemsByCat[cid].push(it)
  }
  for (const k of Object.keys(itemsByCat)) {
    itemsByCat[k].sort((a, b) => (Number(a.rank || 0) - Number(b.rank || 0)) || String(a.id).localeCompare(String(b.id)))
  }

  const out: OprFilterOption[] = []
  for (const c of cats) {
    out.push({ key: `cat:${c.id}`, kind: 'category', label: `Category: ${c.name}`, categoryId: c.id })
    const list = itemsByCat[String(c.id)] || []
    for (const it of list) {
      const rank = Number(it.rank || 0)
      const text = String(it.text || '').trim()
      out.push({
        key: `item:${it.id}`,
        kind: 'item',
        label: `${c.name} — #${rank || 0} ${text || 'Item'}`,
        categoryId: c.id,
        itemId: it.id,
        status: it.status,
      })
    }
  }

  // Items with missing/unknown category
  const orphan = itemsByCat[''] || []
  if (orphan.length) {
    for (const it of orphan) {
      const rank = Number(it.rank || 0)
      const text = String(it.text || '').trim()
      out.push({
        key: `item:${it.id}`,
        kind: 'item',
        label: `Uncategorized — #${rank || 0} ${text || 'Item'}`,
        categoryId: 'All',
        itemId: it.id,
        status: it.status,
      })
    }
  }

  return out
})

function isOprFilterSelected(opt: any) {
  if (!opt || typeof opt !== 'object') return false
  if (opt.kind === 'category') {
    const cid = String(opt.categoryId || '').trim()
    return cid && cid !== 'All' && oprCategoryFilter.value === cid && oprItemFilter.value === 'All'
  }
  if (opt.kind === 'item') {
    const iid = String(opt.itemId || '').trim()
    return iid && oprItemFilter.value === iid
  }
  return oprCategoryFilter.value === 'All' && oprItemFilter.value === 'All'
}

function selectOprFilter(opt: any) {
  try {
    const kind = String(opt?.kind || '').trim()
    if (kind === 'all') {
      oprCategoryFilter.value = 'All'
      oprItemFilter.value = 'All'
      closeOprMenu()
      return
    }
    if (kind === 'category') {
      const cid = String(opt?.categoryId || '').trim()
      oprCategoryFilter.value = cid || 'All'
      oprItemFilter.value = 'All'
      closeOprMenu()
      return
    }
    if (kind === 'item') {
      const iid = String(opt?.itemId || '').trim()
      const it = iid ? findOprItemById(iid) : null
      oprItemFilter.value = iid || 'All'
      oprCategoryFilter.value = it?.categoryId ? String(it.categoryId) : (String(opt?.categoryId || '').trim() || 'All')
      closeOprMenu()
      return
    }
  } catch (e) { /* ignore */ }
  closeOprMenu()
}

function normalizeOprCategoryRow(row: any): OprCategoryMeta | null {
  if (!row) return null
  const id = String(row.id || row._id || '').trim()
  if (!id) return null
  return {
    id,
    name: String(row.name || '').trim() || 'Unnamed',
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : undefined,
  }
}

function normalizeOprMetaRow(row: any): OprItemMeta | null {
  if (!row) return null
  const id = String(row.id || row._id || '').trim()
  if (!id) return null
  const rank = Number(row.rank || 0)
  const status = String(row.status || '').toLowerCase() === 'archived' ? 'archived' : 'active'
  return {
    id,
    categoryId: row.categoryId ? String(row.categoryId) : null,
    text: String(row.text || '').trim(),
    score: Number(row.score || 0),
    rank: Number.isFinite(rank) ? rank : 0,
    status,
  }
}

async function hydrateOprFilters(projectId: string) {
  const pid = String(projectId || '').trim()
  if (!pid) { oprCategories.value = []; oprItemsForFilter.value = []; return }
  oprAddonRequired.value = false
  oprFiltersLoading.value = true
  try {
    const { data } = await http.get(`/api/projects/${pid}/opr/categories`, { headers: getAuthHeaders() })
    const list = Array.isArray(data) ? data.map(normalizeOprCategoryRow).filter(Boolean) as OprCategoryMeta[] : []
    list.sort((a, b) => (Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)) || a.name.localeCompare(b.name))
    oprCategories.value = list

    const validCategoryIds = new Set(list.map((c) => c.id))
    if (oprCategoryFilter.value !== 'All' && !validCategoryIds.has(oprCategoryFilter.value)) {
      oprCategoryFilter.value = 'All'
      oprItemFilter.value = 'All'
      oprItemsForFilter.value = []
    }
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (code === 'OPR_ADDON_REQUIRED' || e?.response?.status === 402) {
      oprAddonRequired.value = true
      oprCategories.value = []
      oprItemsForFilter.value = []
      oprCategoryFilter.value = 'All'
      oprItemFilter.value = 'All'
      hasOprFilter.value = false
      return
    }
    oprCategories.value = []
    oprItemsForFilter.value = []
  } finally {
    oprFiltersLoading.value = false
  }
}

async function hydrateOprItemsForProject(projectId: string) {
  const pid = String(projectId || '').trim()
  if (!pid) { oprItemsForFilter.value = []; return }
  if (oprAddonRequired.value) { oprItemsForFilter.value = []; return }
  oprItemsLoading.value = true
  try {
    const { data } = await http.get(`/api/projects/${pid}/opr/items`, {
      headers: getAuthHeaders(),
      params: { includeArchived: 1 },
    })
    const list = Array.isArray(data) ? data.map(normalizeOprMetaRow).filter(Boolean) as OprItemMeta[] : []
    list.sort((a, b) => {
      const ca = a.categoryId ? String(a.categoryId) : ''
      const cb = b.categoryId ? String(b.categoryId) : ''
      if (ca !== cb) return ca.localeCompare(cb)
      return (Number(a.rank || 0) - Number(b.rank || 0)) || String(a.id).localeCompare(String(b.id))
    })
    oprItemsForFilter.value = list

    const validItemIds = new Set(list.map((i) => i.id))
    if (oprItemFilter.value !== 'All' && !validItemIds.has(oprItemFilter.value)) {
      oprItemFilter.value = 'All'
    }
    if (oprItemFilter.value !== 'All') {
      const it = findOprItemById(oprItemFilter.value)
      if (it && it.categoryId) oprCategoryFilter.value = String(it.categoryId)
    }
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (code === 'OPR_ADDON_REQUIRED' || e?.response?.status === 402) {
      oprAddonRequired.value = true
      oprItemsForFilter.value = []
      oprCategoryFilter.value = 'All'
      oprItemFilter.value = 'All'
      hasOprFilter.value = false
      return
    }
    oprItemsForFilter.value = []
  } finally {
    oprItemsLoading.value = false
  }
}

async function hydrateOprItemMeta(projectId: string, ids: string[]) {
  const pid = String(projectId || '').trim()
  if (!pid || !Array.isArray(ids) || ids.length === 0) { oprItemMetaById.value = {}; return }
  oprAddonRequired.value = false
  oprMetaLoading.value = true
  try {
    const { data } = await http.get(`/api/projects/${pid}/opr/items`, {
      headers: getAuthHeaders(),
      params: { ids: ids.slice(0, 150).join(','), includeArchived: 1 },
    })
    const map: Record<string, OprItemMeta> = {}
    if (Array.isArray(data)) {
      for (const row of data) {
        const meta = normalizeOprMetaRow(row)
        if (meta) map[meta.id] = meta
      }
    }
    oprItemMetaById.value = map
  } catch (e: any) {
    const code = e?.response?.data?.code
    if (code === 'OPR_ADDON_REQUIRED' || e?.response?.status === 402) {
      oprAddonRequired.value = true
      oprItemMetaById.value = {}
      hasOprFilter.value = false
      return
    }
    // non-blocking; chips will fall back to count
    oprItemMetaById.value = {}
  } finally {
    oprMetaLoading.value = false
  }
}

function issueOprItems(issue: any): OprItemMeta[] {
  const ids = Array.isArray(issue?.oprItemIds) ? issue.oprItemIds : []
  if (!ids.length) return []
  const meta = oprItemMetaById.value || {}
  const list = ids.map((id: any) => meta[String(id)]).filter(Boolean) as OprItemMeta[]
  return list.sort((a, b) => (Number(a.rank || 0) - Number(b.rank || 0)) || String(a.id).localeCompare(String(b.id)))
}

function openOprItemFromChip(it: OprItemMeta) {
  try {
    const pid = preferredProjectId.value ? String(preferredProjectId.value) : ''
    if (pid && projectStore.currentProjectId !== pid) {
      projectStore.setCurrentProject(pid)
    }
    const categoryId = it?.categoryId ? String(it.categoryId) : 'all'
    const itemId = String(it?.id || '').trim()
    if (!itemId) return
    router.push({
      path: '/app/opr',
      query: {
        tab: 'qa',
        rightTab: 'register',
        categoryId,
        itemId,
      },
    })
  } catch (e) {
    // Non-blocking: if routing fails, fall back to normal click behavior.
  }
}

const effectiveSearch = ref('')
const updateEffective = debounce((val) => { effectiveSearch.value = val }, 200)

watch(() => searchQuery.value, (v) => updateEffective(v))
// Now that search/effective/search watchers exist, wire up persistence
watch(listStateKey, () => loadListState(), { immediate: true })
watch([searchQuery, typeFilter, priorityFilter, statusFilter, oprCategoryFilter, oprItemFilter, hasOprFilter, locationFilter, responsibleFilter, systemFilter, dateFoundFrom, dateFoundTo, dueDateFrom, dueDateTo, tagsFilter, hideClosed, myIssuesOnly, sortKey, sortDir], () => persistListState())
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

const myIdentity = computed(() => {
  const email = String(authStore.user?.email || '').trim().toLowerCase()
  const first = String(authStore.user?.firstName || '').trim()
  const last = String(authStore.user?.lastName || '').trim()
  const name = String([first, last].filter(Boolean).join(' ')).trim().toLowerCase()
  return { email, name }
})

function isMyIssueRow(i: any) {
  const { email, name } = myIdentity.value || { email: '', name: '' }
  if (!email && !name) return false
  const fields = [i?.responsible_person, i?.assignedTo, i?.responsible]
    .map(v => String(v || '').trim().toLowerCase())
    .filter(Boolean)
  for (const f of fields) {
    if (email && f.includes(email)) return true
    if (name && f === name) return true
  }
  return false
}

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
  const withHasOpr = hasOprFilter.value
    ? withStatus.filter(i => Array.isArray((i as any)?.oprItemIds) && (i as any).oprItemIds.length > 0)
    : withStatus
  const withOprCategory = (!oprCategoryFilter.value || oprCategoryFilter.value === 'All')
    ? withHasOpr
    : withHasOpr.filter((i: any) => {
      const ids = Array.isArray(i?.oprItemIds) ? i.oprItemIds : []
      if (!ids.length) return false
      const meta = oprItemMetaById.value || {}
      return ids.some((id: any) => meta[String(id)]?.categoryId === oprCategoryFilter.value)
    })
  const withOprItem = (!oprItemFilter.value || oprItemFilter.value === 'All')
    ? withOprCategory
    : withOprCategory.filter((i: any) => {
      const ids = Array.isArray(i?.oprItemIds) ? i.oprItemIds.map((x: any) => String(x)) : []
      return ids.includes(String(oprItemFilter.value))
    })
  const locQ = String(locationFilter.value || '').trim().toLowerCase()
  const sysQ = String(systemFilter.value || '').trim().toLowerCase()
  const respQ = String(responsibleFilter.value || '').trim().toLowerCase()
  const tagsQ = String(tagsFilter.value || '').trim()
  const tags = tagsQ
    ? tagsQ.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    : []

  const withLocation = locQ
    ? withOprItem.filter((i: any) => String(i.location || '').toLowerCase().includes(locQ))
    : withOprItem
  const withSystem = sysQ
    ? withLocation.filter((i: any) => String(i.system || '').toLowerCase().includes(sysQ))
    : withLocation
  const withResponsible = respQ
    ? withSystem.filter((i: any) => {
      const fields = [i.responsible_person, i.assignedTo, i.responsible]
        .map(v => String(v || '').toLowerCase())
      return fields.some(v => v.includes(respQ))
    })
    : withSystem
  const withTags = tags.length
    ? withResponsible.filter((i: any) => {
      const labels = Array.isArray(i.labels) ? i.labels : []
      const hay = labels.map((t: any) => String(t || '').toLowerCase())
      return tags.some(t => hay.includes(t))
    })
    : withResponsible
  const withMine = myIssuesOnly.value ? withTags.filter((i: any) => isMyIssueRow(i)) : withTags

  const dfFrom = String(dateFoundFrom.value || '').trim()
  const dfTo = String(dateFoundTo.value || '').trim()
  const dueFrom = String(dueDateFrom.value || '').trim()
  const dueTo = String(dueDateTo.value || '').trim()
  const withDateFound = (dfFrom || dfTo)
    ? withMine.filter((i: any) => {
      const v = String(i.dateFound || '').slice(0, 10)
      if (!v) return false
      if (dfFrom && v < dfFrom) return false
      if (dfTo && v > dfTo) return false
      return true
    })
    : withMine
  const withDueDate = (dueFrom || dueTo)
    ? withDateFound.filter((i: any) => {
      const v = String(i.dueDate || '').slice(0, 10)
      if (!v) return false
      if (dueFrom && v < dueFrom) return false
      if (dueTo && v > dueTo) return false
      return true
    })
    : withDateFound

  const base = hideClosed.value ? withDueDate.filter(i => !isClosedRow(i)) : withDueDate

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
  if (showAnalytics.value) fetchIssuesAnalytics(String(id)).catch(() => {})
}, { immediate: true })

watch(showAnalytics, (open) => {
  if (!open) return
  fetchIssuesAnalytics().catch(() => {})
})

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
            listMode.value = 'store'
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
	      if (hideClosed.value) params.hideClosed = 1
	      if (myIssuesOnly.value) params.mine = 1
	      if (statusFilter.value && statusFilter.value !== 'All') params.status = statusFilter.value
	      if (priorityFilter.value && priorityFilter.value !== 'All') params.priority = priorityFilter.value
	      if (typeFilter.value && typeFilter.value !== 'All') params.type = typeFilter.value
      if (hasOprFilter.value) params.hasOpr = 1
      if (oprCategoryFilter.value && oprCategoryFilter.value !== 'All') params.oprCategoryId = oprCategoryFilter.value
      if (oprItemFilter.value && oprItemFilter.value !== 'All') params.oprItemId = oprItemFilter.value
      if (String(locationFilter.value || '').trim()) params.location = String(locationFilter.value).trim()
      if (String(responsibleFilter.value || '').trim()) params.responsible = String(responsibleFilter.value).trim()
      if (String(systemFilter.value || '').trim()) params.system = String(systemFilter.value).trim()
      if (String(dateFoundFrom.value || '').trim()) params.dateFoundFrom = String(dateFoundFrom.value).trim()
      if (String(dateFoundTo.value || '').trim()) params.dateFoundTo = String(dateFoundTo.value).trim()
      if (String(dueDateFrom.value || '').trim()) params.dueDateFrom = String(dueDateFrom.value).trim()
      if (String(dueDateTo.value || '').trim()) params.dueDateTo = String(dueDateTo.value).trim()
      if (String(tagsFilter.value || '').trim()) params.tags = String(tagsFilter.value).trim()
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
      listMode.value = 'api'
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
	              const mapped = filteredByProject.map((i) => ({ ...(i || {}), id: i._id || i.id }))
	              const mineFiltered = myIssuesOnly.value ? mapped.filter((i) => isMyIssueRow(i)) : mapped
	              serverIssues.value = mineFiltered
	              serverTotal.value = mineFiltered.length
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
          listMode.value = 'store'
        } catch (inner) {
          serverIssues.value = []
          serverTotal.value = 0
          serverTotalAll.value = 0
          listMode.value = 'store'
        }
      } else {
        serverIssues.value = []
        serverTotal.value = 0
        serverTotalAll.value = 0
        listMode.value = 'api'
      }
    } finally {
      loading.value = false
    }
  })()
}

const debouncedFetch = debounce(() => { fetchIssuesPage().catch(() => {}) }, 150)
watch([
  () => page.value,
  () => pageSize.value,
  () => sortKey.value,
  () => sortDir.value,
  () => effectiveSearch.value,
  () => statusFilter.value,
  () => priorityFilter.value,
  () => typeFilter.value,
  () => oprCategoryFilter.value,
  () => oprItemFilter.value,
  () => hasOprFilter.value,
  () => locationFilter.value,
  () => responsibleFilter.value,
  () => systemFilter.value,
  () => dateFoundFrom.value,
  () => dateFoundTo.value,
  () => dueDateFrom.value,
  () => dueDateTo.value,
  () => tagsFilter.value,
  () => hideClosed.value,
  () => myIssuesOnly.value
], () => debouncedFetch(), { immediate: false })

const oprIdsForMetaKey = computed(() => {
  const useServer = Number(serverTotal.value || 0) > 0 && Array.isArray(serverIssues.value) && serverIssues.value.length > 0
  const baseAll = useServer ? serverIssues.value : (Array.isArray(issuesStore.issues) ? issuesStore.issues : [])
  const out: string[] = []
  const seen = new Set<string>()
  for (const issue of baseAll) {
    const ids = Array.isArray((issue as any)?.oprItemIds) ? (issue as any).oprItemIds : []
    for (const id of ids) {
      const s = String(id || '').trim()
      if (!s) continue
      if (seen.has(s)) continue
      seen.add(s)
      out.push(s)
      if (out.length >= 150) break
    }
    if (out.length >= 150) break
  }
  out.sort()
  return out.join(',')
})

const debouncedHydrateOprMeta = debounce(async () => {
  const pid = preferredProjectId.value ? String(preferredProjectId.value) : ''
  const ids = oprIdsForMetaKey.value ? oprIdsForMetaKey.value.split(',').filter(Boolean) : []
  await hydrateOprItemMeta(pid, ids)
}, 200)

watch([preferredProjectId, oprIdsForMetaKey], () => { debouncedHydrateOprMeta() }, { immediate: true })

watch(preferredProjectId, async (pid) => {
  const projectId = pid ? String(pid) : ''
  await hydrateOprFilters(projectId)
  await hydrateOprItemsForProject(projectId)
}, { immediate: true })


// Pagination totals should reflect filtered count when filters/search are applied
const isFiltered = computed(() => {
  // If any filter is not 'All', or search is non-empty, or hideClosed is on, treat as filtered
  return (
    (priorityFilter.value && priorityFilter.value !== 'All') ||
    (typeFilter.value && typeFilter.value !== 'All') ||
    (statusFilter.value && statusFilter.value !== 'All') ||
    (oprCategoryFilter.value && oprCategoryFilter.value !== 'All') ||
    (oprItemFilter.value && oprItemFilter.value !== 'All') ||
    hasOprFilter.value ||
    (locationFilter.value && String(locationFilter.value).trim() !== '') ||
    (responsibleFilter.value && String(responsibleFilter.value).trim() !== '') ||
    (systemFilter.value && String(systemFilter.value).trim() !== '') ||
    (dateFoundFrom.value && String(dateFoundFrom.value).trim() !== '') ||
    (dateFoundTo.value && String(dateFoundTo.value).trim() !== '') ||
    (dueDateFrom.value && String(dueDateFrom.value).trim() !== '') ||
    (dueDateTo.value && String(dueDateTo.value).trim() !== '') ||
    (tagsFilter.value && String(tagsFilter.value).trim() !== '') ||
    (effectiveSearch.value && effectiveSearch.value.trim() !== '') ||
    hideClosed.value
  )
})

const totalItems = computed(() => {
  if (listMode.value === 'api') return Number(serverTotal.value || 0)
  return Number(filteredIssues.value.length || 0)
})
const displayTotal = computed(() => {
  if (listMode.value === 'api') return Number(serverTotalAll.value || serverTotal.value || 0)
  return Number(filteredIssues.value.length || 0)
})

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




const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const startItem = computed(() => totalItems.value === 0 ? 0 : ((page.value - 1) * pageSize.value) + 1)
const endItem = computed(() => Math.min(totalItems.value, page.value * pageSize.value))

const pagedIssues = computed(() => {
  const list = sortedIssues.value || []
  if (listMode.value === 'api') return list
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
