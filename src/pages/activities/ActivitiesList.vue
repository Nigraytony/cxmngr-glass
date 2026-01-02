<template>
  <div class="space-y-4">
    <!-- Breadcrumbs at top -->
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/app' },
          { text: 'Activities', to: '/app/activities' }
        ]"
      />
    </div>

    <div class="flex flex-wrap gap-3 items-end">
      <!-- Error banner for plan guard or missing project -->
      <div
        v-if="store && (store as any).errorCode"
        class="w-full"
      >
        <div class="rounded-md border border-white/20 bg-red-500/20 text-red-100 px-3 py-2 text-sm inline-flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          ><path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zm.75 8a1 1 0 100-2 1 1 0 000 2z"
            clip-rule="evenodd"
          /></svg>
          <span v-if="(store as any).errorCode === 'PROJECT_NOT_FOUND'">Selected project not found. Please reselect a project.</span>
          <span v-else-if="(store as any).errorCode === 'FEATURE_NOT_IN_PLAN'">Activities are not available on your current subscription plan.</span>
          <span v-else>{{ (store as any).error || 'Unable to load activities.' }}</span>
        </div>
      </div>
      <!-- New Activity round button placed left of Search -->
      <RouterLink
        :to="{ name: 'activity-edit', params: { id: 'new' } }"
        class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
        aria-label="Add activity"
        title="Add activity"
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
      </RouterLink>
      <div>
        <label class="block text-white/70 text-sm">Search</label>
        <input
          v-model="q"
          type="text"
          placeholder="Search by name or type"
          class="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 w-64"
        >
      </div>
      <div>
        <label class="block text-white/70 text-sm">Type</label>
        <div
          ref="typeMenuRef"
          class="relative"
        >
          <button
            :aria-expanded="showTypeMenu ? 'true' : 'false'"
            class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[16rem] justify-between"
            @click="toggleTypeMenu"
          >
            <span class="flex items-center gap-2">
              <span>{{ typeFilterLabel }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ typeCount(typeFilterLabel) }}</span>
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
            class="absolute left-0 mt-2 w-80 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
              <button
                v-for="opt in typeOptions"
                :key="opt.name"
                role="menuitem"
                :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2 whitespace-nowrap', (typeFilterLabel === opt.name) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                @click="applyTypeFilter(opt.name)"
              >
                <span>{{ opt.name }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <button
        class="px-3 py-2 rounded bg-white/10 text-white border border-white/20"
        @click="refresh()"
      >
        Refresh
      </button>
      <div class="relative inline-block group shrink-0">
        <button
          :disabled="!projectStore.currentProjectId"
          aria-label="Toggle analytics"
          :title="projectStore.currentProjectId ? 'Toggle analytics' : 'Select a project'"
          class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
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
          :disabled="!canAutoTagActivitiesPage"
          aria-label="Auto-tag this page"
          :title="canAutoTagActivitiesPage ? 'Auto-tag this page' : 'Auto-tagging requires AI + a selected project'"
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
          </svg>
        </button>
        <div
          role="tooltip"
          class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
        >
          Auto-tag this page
        </div>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <button
          class="h-10 w-10 inline-grid place-items-center rounded-lg border border-white/10"
          :class="viewMode === 'cards' ? 'bg-white/12 text-white' : 'bg-white/6 hover:bg-white/10 text-white/80'"
          aria-label="Card view"
          title="Card view"
          @click="setViewMode('cards')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          class="h-10 w-10 inline-grid place-items-center rounded-lg border border-white/10"
          :class="viewMode === 'list' ? 'bg-white/12 text-white' : 'bg-white/6 hover:bg-white/10 text-white/80'"
          aria-label="List view"
          title="List view"
          @click="setViewMode('list')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              d="M6 7h14M6 12h14M6 17h14M4 7h.01M4 12h.01M4 17h.01"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
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
          class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/90"
          @click="showAnalytics = false"
        >
          Hide
        </button>
      </div>
      <ActivitiesListCharts
        :analytics="activitiesAnalytics"
        :loading="analyticsLoading"
      />
    </div>

    <div
      v-if="loading"
      class="rounded-2xl p-6 bg-white/6 border border-white/10 text-white/70 flex flex-col items-center justify-center"
    >
      <Spinner />
      <p class="mt-3 text-sm uppercase tracking-wide">
        Loading activities…
      </p>
    </div>
    <div
      v-else
      class="min-w-0"
    >
      <template v-if="!projectStore.currentProjectId">
        <div class="p-6 text-center text-white/80 w-full">
          <div class="text-lg font-semibold">
            No project selected
          </div>
          <div class="mt-2 text-sm">
            Select a project from the user menu or Projects page to view its activities.
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
              @click="setSort('name')"
            >
              <span>Name</span>
              <span
                v-if="sortKey==='name' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='name' && sortDir===-1"
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
              @click="setSort('startDate')"
            >
              <span>Start</span>
              <span
                v-if="sortKey==='startDate' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='startDate' && sortDir===-1"
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
              @click="setSort('endDate')"
            >
              <span>End</span>
              <span
                v-if="sortKey==='endDate' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='endDate' && sortDir===-1"
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
              @click="setSort('location')"
            >
              <span>Location</span>
              <span
                v-if="sortKey==='location' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='location' && sortDir===-1"
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
            <button
              type="button"
              class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
              @click="setSort('createdAt')"
            >
              <span>Created</span>
              <span
                v-if="sortKey==='createdAt' && sortDir===1"
                class="text-xs"
              >▲</span>
              <span
                v-else-if="sortKey==='createdAt' && sortDir===-1"
                class="text-xs"
              >▼</span>
              <span
                v-else
                class="text-xs opacity-40"
              >⇅</span>
            </button>
          </div>
        </div>

        <div
          v-if="viewMode === 'cards'"
          class="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <RouterLink
            v-for="a in pagedActivities"
            :key="a.id"
            :to="{ name: 'activity-edit', params: { id: a.id || a._id } }"
            class="group relative block p-4 rounded-xl bg-white/10 border border-white/20 text-white/90 transition-all duration-200 ease-out hover:bg-white/12 hover:border-white/30 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white/30 overflow-hidden"
          >
            <!-- subtle hover overlay -->
            <div class="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            <!-- bottom gradient like photo thumbnails -->
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div class="relative">
              <div class="flex items-center justify-between gap-2">
                <h2 class="font-semibold truncate">
                  {{ a.name }}
                </h2>
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
                    aria-label="Delete activity"
                    :title="`Delete ${a.name || 'activity'}`"
                    @click.stop.prevent="confirmDelete(a)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        d="M6 7h12"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                      <path
                        d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                        stroke-width="1.5"
                      />
                      <rect
                        x="6"
                        y="7"
                        width="12"
                        height="14"
                        rx="2"
                        stroke-width="1.5"
                      />
                      <path
                        d="M10 11v6M14 11v6"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                  <!-- optional chevron icon to indicate clickable card -->
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="w-4 h-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div class="mt-1 flex items-center justify-between gap-2">
                <div class="text-sm text-white/70 truncate">
                  Type: {{ a.type }}
                </div>
                <span
                  class="px-2 py-0.5 rounded-full border text-xs shrink-0"
                  :class="statusPillClass(a)"
                >
                  {{ statusLabel(a) }}
                </span>
              </div>
              <div class="text-xs text-white/60">
                Start: {{ fmt(a.startDate) }} · End: {{ fmt(a.endDate) }}
              </div>
              <div class="text-xs text-white/60 mt-1">
                Location: {{ spaceLabel(a) }}
              </div>
              <div class="mt-2 flex flex-wrap gap-2 text-xs text-white/80">
                <span class="px-2 py-0.5 rounded-full bg-white/10">Photos: {{ countField(a, 'photos') }}</span>
                <span class="px-2 py-0.5 rounded-full bg-white/10">Issues: {{ countField(a, 'issues') }}</span>
                <span class="px-2 py-0.5 rounded-full bg-white/10">Comments: {{ countField(a, 'comments') }}</span>
                <span class="px-2 py-0.5 rounded-full bg-white/10">Attachments: {{ countField(a, 'attachments') }}</span>
                <span class="px-2 py-0.5 rounded-full bg-white/10">Equipment: {{ countField(a, 'equipment') }}</span>
              </div>
            </div>
          </RouterLink>
        </div>

        <div
          v-else
          class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl overflow-x-auto min-w-0"
        >
          <div class="flex flex-col gap-3">
            <div
              v-for="a in pagedActivities"
              :key="a.id"
              class="rounded-xl bg-white/10 border border-white/10 p-3 flex flex-col md:flex-row md:items-center gap-3"
            >
              <RouterLink
                :to="{ name: 'activity-edit', params: { id: a.id || a._id } }"
                class="flex-1 min-w-0"
                style="text-decoration: none;"
              >
                <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 min-w-0">
                  <div class="min-w-0 flex-1">
                    <div class="text-base font-semibold text-white truncate">
                      {{ a.name }}
                    </div>
                    <div class="text-xs text-white/70 flex flex-wrap gap-x-3 gap-y-1">
                      <span>Type: <span class="text-white/90">{{ a.type || '—' }}</span></span>
                      <span class="inline-flex items-center gap-2">
                        Status:
                        <span
                          class="px-2 py-0.5 rounded-full border text-xs"
                          :class="statusPillClass(a)"
                        >{{ statusLabel(a) }}</span>
                      </span>
                      <span>Dates: <span class="text-white/90">{{ fmt(a.startDate) || '—' }} – {{ fmt(a.endDate) || '—' }}</span></span>
                      <span>Location: <span class="text-white/90">{{ spaceLabel(a) }}</span></span>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2 text-xs">
                    <span class="px-2 py-0.5 rounded-full bg-white/10 text-white/80">Photos: {{ countField(a, 'photos') }}</span>
                    <span class="px-2 py-0.5 rounded-full bg-white/10 text-white/80">Issues: {{ countField(a, 'issues') }}</span>
                    <span class="px-2 py-0.5 rounded-full bg-white/10 text-white/80">Comments: {{ countField(a, 'comments') }}</span>
                    <span class="px-2 py-0.5 rounded-full bg-white/10 text-white/80">Attachments: {{ countField(a, 'attachments') }}</span>
                    <span class="px-2 py-0.5 rounded-full bg-white/10 text-white/80">Equipment: {{ countField(a, 'equipment') }}</span>
                  </div>
                </div>
              </RouterLink>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  class="w-9 h-9 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
                  aria-label="Delete activity"
                  :title="`Delete ${a.name || 'activity'}`"
                  @click.stop.prevent="confirmDelete(a)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  >
                    <path
                      d="M6 7h12"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"
                      stroke-width="1.5"
                    />
                    <rect
                      x="6"
                      y="7"
                      width="12"
                      height="14"
                      rx="2"
                      stroke-width="1.5"
                    />
                    <path
                      d="M10 11v6M14 11v6"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Pagination controls -->
    <div
      v-if="projectStore.currentProjectId && totalItems > 0"
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
        <span class="ml-2">{{ startItem }}–{{ endItem }} of {{ totalItems }}</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          :disabled="page === 1"
          class="px-2 py-1 rounded border border-white/20 bg-white/5 disabled:opacity-40"
          @click="prevPage"
        >
          Prev
        </button>
        <div class="flex items-center gap-1 px-1">
          <button
            v-for="p in pageButtons"
            :key="`p-${p}`"
            :disabled="p === 0"
            class="min-w-8 px-2 py-1 rounded border border-white/20 bg-white/5 disabled:opacity-40"
            :class="p === page ? 'bg-white/15 text-white' : ''"
            @click="p !== 0 && goToPage(p)"
          >
            <span v-if="p === 0">…</span>
            <span v-else>{{ p }}</span>
          </button>
        </div>
        <button
          :disabled="page === totalPages"
          class="px-2 py-1 rounded border border-white/20 bg-white/5 disabled:opacity-40"
          @click="nextPage"
        >
          Next
        </button>
      </div>
    </div>

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
        Are you sure you want to delete activity "<strong>{{ deletingName }}</strong>"? This action cannot be undone.
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <button
            class="px-3 py-2 rounded bg-white/6 text-white"
            :disabled="deleting"
            @click="cancelDelete"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded bg-red-600 text-white"
            :disabled="deleting"
            @click="doDelete"
          >
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </template>
    </Modal>
    <BulkAutoTagModal
      v-model="showAutoTagModal"
      title="Auto-tag visible activities"
      :project-id="resolvedProjectId"
      entity-type="activity"
      :allowed-tags="projectAllowedTags"
      :items="autoTagActivityItems"
      :can-suggest="canAutoTagActivitiesPage"
      :apply-tags="applyActivityTags"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref, watch } from 'vue'
import { useActivitiesStore } from '../../stores/activities'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'
import { useSpacesStore } from '../../stores/spaces'
import lists from '../../lists.js'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Spinner from '../../components/Spinner.vue'
import Modal from '../../components/Modal.vue'
import BulkAutoTagModal from '../../components/BulkAutoTagModal.vue'
import ActivitiesListCharts from '../../components/charts/ActivitiesListCharts.vue'
import type { ActivitiesAnalytics } from '../../components/charts/ActivitiesListCharts.vue'
import http from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'

const store = useActivitiesStore()
const projectStore = useProjectStore()
const spacesStore = useSpacesStore()
const q = ref('')
const typeFilter = ref<string>('')
const showDeleteModal = ref(false)
const deletingActivity = ref<string | null>(null)
const deletingName = ref<string>('')
const deleting = ref(false)
const ui = useUiStore()
const loading = computed(() => store.loading)
const viewMode = ref<'cards' | 'list'>('cards')
const pageSize = ref(12)
const pageSizes = [6, 12, 24, 48, 96]
const page = ref(1)
const sortKey = ref<'createdAt' | 'updatedAt' | 'name' | 'type' | 'status' | 'startDate' | 'endDate' | 'location'>('createdAt')
const sortDir = ref<1 | -1>(-1) // default matches API list sort (created desc)
const showAnalytics = ref(false)
const analyticsLoading = ref(false)
const activitiesAnalytics = ref<ActivitiesAnalytics | null>(null)
const analyticsForProjectId = ref('')
const showAutoTagModal = ref(false)

const resolvedProjectId = computed(() => {
  try {
    return String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
  } catch (e) {
    return String(projectStore.currentProjectId || '').trim()
  }
})

const projectAllowedTags = computed(() => {
  const p: any = projectStore.currentProject || {}
  const tags = p && Array.isArray(p.tags) ? p.tags : []
  return tags.map((t: any) => String(t).trim()).filter(Boolean)
})

const canAutoTagActivitiesPage = computed(() => {
  const pid = resolvedProjectId.value
  if (!pid) return false
  const p: any = projectStore.currentProject || {}
  if (p.ai && p.ai.enabled === false) return false
  const tier = String(p.subscriptionTier || '').toLowerCase()
  const hasFeature = p.subscriptionFeatures && (p.subscriptionFeatures.ai === true || p.subscriptionFeatures.AI === true)
  return tier === 'premium' || hasFeature
})

function viewStorageKey() {
  return `ui.activities.viewMode:${projectStore.currentProjectId || 'global'}`
}

function paginationStorageKey() {
  return `ui.activities.pageSize:${projectStore.currentProjectId || 'global'}`
}

function sortStorageKey() {
  return `ui.activities.sort:${projectStore.currentProjectId || 'global'}`
}

function loadSort() {
  try {
    const raw = localStorage.getItem(sortStorageKey())
    if (!raw) return
    const data = JSON.parse(raw)
    const allowed = new Set(['createdAt', 'updatedAt', 'name', 'type', 'status', 'startDate', 'endDate', 'location'])
    if (data && allowed.has(String(data.sortKey))) sortKey.value = String(data.sortKey) as any
    if (data && (data.sortDir === 1 || data.sortDir === -1)) sortDir.value = data.sortDir
  } catch (e) { /* ignore */ }
}

function persistSort() {
  try {
    localStorage.setItem(sortStorageKey(), JSON.stringify({ sortKey: sortKey.value, sortDir: sortDir.value }))
  } catch (e) { /* ignore */ }
}

function setSort(key: any) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1
  else { sortKey.value = key; sortDir.value = 1 }
}

function loadViewMode() {
  try {
    const raw = localStorage.getItem(viewStorageKey())
    if (raw === 'list' || raw === 'cards') viewMode.value = raw
  } catch (e) { /* ignore */ }
}

function setViewMode(v: 'cards' | 'list') {
  viewMode.value = v
  try { localStorage.setItem(viewStorageKey(), v) } catch (e) { /* ignore */ }
}

function analyticsStorageKey() {
  return `ui.activities.showAnalytics:${projectStore.currentProjectId || 'global'}`
}

function loadShowAnalytics() {
  try {
    const raw = localStorage.getItem(analyticsStorageKey())
    if (raw === '1' || raw === 'true') showAnalytics.value = true
  } catch (e) { /* ignore */ }
}

async function fetchAnalytics() {
  const pid = String(projectStore.currentProjectId || '')
  if (!pid) return
  if (analyticsForProjectId.value === pid && activitiesAnalytics.value) return
  analyticsLoading.value = true
  try {
    const res = await http.get('/api/activities/analytics', { params: { projectId: pid }, headers: getAuthHeaders() })
    activitiesAnalytics.value = (res && res.data) ? res.data : null
    analyticsForProjectId.value = pid
  } catch (e: any) {
    analyticsForProjectId.value = pid
    activitiesAnalytics.value = null
    if (e?.response?.status === 403 && e?.response?.data?.code === 'FEATURE_NOT_IN_PLAN') return
    ui.showError(e?.response?.data?.error || 'Failed to load activity analytics')
  } finally {
    analyticsLoading.value = false
  }
}

function toggleAnalytics() {
  showAnalytics.value = !showAnalytics.value
  try { localStorage.setItem(analyticsStorageKey(), showAnalytics.value ? '1' : '0') } catch (e) { /* ignore */ }
  if (showAnalytics.value) fetchAnalytics().catch(() => {})
}

function loadPageSize() {
  try {
    const raw = localStorage.getItem(paginationStorageKey())
    const n = Number(raw)
    if (Number.isFinite(n) && pageSizes.includes(n)) pageSize.value = n
  } catch (e) { /* ignore */ }
}

function persistPageSize() {
  try { localStorage.setItem(paginationStorageKey(), String(pageSize.value)) } catch (e) { /* ignore */ }
}

onMounted(async () => {
  loadViewMode()
  loadPageSize()
  loadSort()
  loadShowAnalytics()
  await store.fetchActivities().catch(() => {})
  if (projectStore.currentProjectId) await spacesStore.fetchByProject(projectStore.currentProjectId).catch(() => {})
  if (showAnalytics.value) fetchAnalytics().catch(() => {})
})

function fmt(d?: string) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString() } catch (e) { return String(d) }
}

watch(() => projectStore.currentProjectId, async (pid) => {
  if (pid) await spacesStore.fetchByProject(pid).catch(() => {})
  loadViewMode()
  loadPageSize()
  loadSort()
  loadShowAnalytics()
  page.value = 1
  analyticsForProjectId.value = ''
  activitiesAnalytics.value = null
  if (showAnalytics.value) fetchAnalytics().catch(() => {})
})

// Styled Type dropdown state and options (like Issues filters)
const showTypeMenu = ref(false)
const typeMenuRef = ref<HTMLElement | null>(null)
const typeFilterLabel = computed(() => typeFilter.value || 'All')
const typeCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = { All: store.activities.length }
  for (const a of store.activities as any[]) {
    const t = (a && a.type) ? String(a.type) : 'Unknown'
    counts[t] = (counts[t] || 0) + 1
  }
  return counts
})
const typeOptions = computed(() => {
  // Only include types that are present in the current activities list (count > 0)
  const counts = typeCounts.value
  const presentNames = Object.keys(counts).filter(n => n !== 'All' && counts[n] > 0)
  // Preserve ordering from lists.activityOptions where possible
  const orderedFromList = (lists.activityOptions || []).map((o: any) => String(o.value)).filter(Boolean)
  const ordered = orderedFromList.filter(n => presentNames.includes(n)).concat(presentNames.filter(n => !orderedFromList.includes(n)))
  const rest = ordered.map((name: string) => ({ name, count: counts[name] || 0 }))
  return [{ name: 'All', count: counts['All'] || 0 }, ...rest]
})
function typeCount(name: string) { return typeCounts.value[name] || 0 }
function toggleTypeMenu() { showTypeMenu.value = !showTypeMenu.value }
function closeTypeMenu() { showTypeMenu.value = false }
function applyTypeFilter(name: string) { typeFilter.value = name === 'All' ? '' : name; closeTypeMenu() }
function onClickOutside(e: MouseEvent) {
  const el = typeMenuRef.value
  if (!el) return
  const target = e.target as Node
  if (!el.contains(target)) closeTypeMenu()
}
onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

const searchMode = computed(() => {
  try {
    const p: any = projectStore.currentProject || null
    const m = p && p.searchMode ? String(p.searchMode).toLowerCase() : ''
    return m || 'substring'
  } catch (e) { return 'substring' }
})

function fuzzyMatch(text: string, pattern: string) {
  let pi = 0
  for (let i = 0; i < text.length && pi < pattern.length; i++) {
    if (text[i] === pattern[pi]) pi++
  }
  return pi === pattern.length
}

const filtered = computed(() => {
  let list = store.activities
  // activities in store are already filtered by current project in fetchActivities()
  if (!q.value) return list
  const s = q.value.toLowerCase()
  const mode = searchMode.value
  const base = typeFilter.value ? list.filter((a: any) => String(a.type || '').toLowerCase() === String(typeFilter.value).toLowerCase()) : list
  return base.filter((a: any) => {
    const fields = [(a.name || ''), (a.type || '')].map(f => f.toLowerCase())
    if (mode === 'exact') return fields.some(f => f === s)
    if (mode === 'fuzzy') return fields.some(f => fuzzyMatch(f, s))
    return fields.some(f => f.includes(s))
  }) as any
})

const totalItems = computed(() => (filtered.value || []).length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const startItem = computed(() => totalItems.value === 0 ? 0 : ((page.value - 1) * pageSize.value + 1))
const endItem = computed(() => Math.min(totalItems.value, page.value * pageSize.value))
const sortedActivities = computed(() => {
  const list = filtered.value ? [...filtered.value] : []
  const key = sortKey.value
  const dir = sortDir.value

  function asText(v: any) {
    return String(v || '').trim().toLowerCase()
  }

  function asTime(v: any) {
    if (!v) return 0
    const t = new Date(v).getTime()
    return Number.isFinite(t) ? t : 0
  }

  const statusOrder: Record<string, number> = { draft: 0, published: 1, completed: 2 }

  list.sort((a: any, b: any) => {
    if (key === 'status') {
      const av = statusOrder[statusValue(a)] ?? 0
      const bv = statusOrder[statusValue(b)] ?? 0
      if (av !== bv) return (av - bv) * dir
      const an = asText(a?.name)
      const bn = asText(b?.name)
      if (an < bn) return -1
      if (an > bn) return 1
      return 0
    }
    if (key === 'startDate' || key === 'endDate' || key === 'createdAt' || key === 'updatedAt') {
      const av = asTime(a?.[key])
      const bv = asTime(b?.[key])
      if (av !== bv) return (av - bv) * dir
      const an = asText(a?.name)
      const bn = asText(b?.name)
      if (an < bn) return -1
      if (an > bn) return 1
      return 0
    }
    const av = asText(a?.[key])
    const bv = asText(b?.[key])
    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    return 0
  })
  return list
})
const pagedActivities = computed(() => {
  const list = sortedActivities.value || []
  const start = (page.value - 1) * pageSize.value
  return list.slice(start, start + pageSize.value)
})

function stripHtml(input: any) {
  const s = String(input || '')
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const autoTagActivityItems = computed(() => {
  const list: any[] = Array.isArray(pagedActivities.value) ? (pagedActivities.value as any[]) : []
  return list.slice(0, 25).map((a: any) => {
    const id = String(a?.id || a?._id || '').trim()
    if (!id) return null
    const title = String(a?.name || '').trim() || `Activity ${id}`
    const subtitle = String(a?.type || '').trim() || String(a?.location || '').trim()
    const existingTags = Array.isArray(a?.labels) ? a.labels : []
    const entity = {
      name: title,
      type: a?.type || null,
      status: a?.status || null,
      location: a?.location || null,
      space: spaceLabel(a),
      systems: Array.isArray(a?.systems) ? a.systems : [],
      startDate: a?.startDate || null,
      endDate: a?.endDate || null,
      description: stripHtml(a?.descriptionHtml || ''),
    }
    return { id, title, subtitle, existingTags, entity }
  }).filter(Boolean) as any
})

async function applyActivityTags(id: string, tags: string[]) {
  await store.updateActivity(String(id), { labels: Array.isArray(tags) ? tags : [] } as any)
}

function clampPage() {
  if (page.value < 1) page.value = 1
  if (page.value > totalPages.value) page.value = totalPages.value
}

watch([totalItems, pageSize], () => {
  clampPage()
})

watch([q, typeFilter], () => {
  page.value = 1
})

watch([sortKey, sortDir], () => {
  persistSort()
  page.value = 1
})

watch(pageSize, () => {
  persistPageSize()
  page.value = 1
})

function prevPage() { if (page.value > 1) page.value -= 1 }
function nextPage() { if (page.value < totalPages.value) page.value += 1 }
function goToPage(p: number) { page.value = p; clampPage() }

const pageButtons = computed(() => {
  const tp = totalPages.value
  const current = page.value
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const set = new Set<number>()
  set.add(1); set.add(tp)
  for (let i = current - 2; i <= current + 2; i++) {
    if (i >= 1 && i <= tp) set.add(i)
  }
  const arr = Array.from(set).sort((a, b) => a - b)
  // insert 0 as ellipsis markers
  const out: number[] = []
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    out.push(v)
    const next = arr[i + 1]
    if (next && next - v > 1) out.push(0)
  }
  return out
})

function refresh() {
  // Always fetch for the current project (store handles project scoping)
  store.fetchActivities().catch(() => {})
  if (showAnalytics.value) fetchAnalytics().catch(() => {})
  page.value = 1
}

function spaceLabel(a: any) {
  const sid = a && (a.spaceId || a.spaceID) ? String(a.spaceId || a.spaceID) : ''
  if (!sid) return '—'
  const sp: any = (spacesStore as any).byId ? (spacesStore as any).byId[sid] : null
  if (!sp) return sid
  return sp.title || sp.tag || sid
}

function countField(a: any, kind: 'photos' | 'issues' | 'comments' | 'attachments' | 'equipment') {
  if (!a) return 0
  if (kind === 'photos') return Number.isFinite(a.photosCount) ? a.photosCount : (Array.isArray(a.photos) ? a.photos.length : 0)
  if (kind === 'issues') return Number.isFinite(a.issuesCount) ? a.issuesCount : (Array.isArray(a.issues) ? a.issues.length : 0)
  if (kind === 'comments') return Number.isFinite(a.commentsCount) ? a.commentsCount : (Array.isArray(a.comments) ? a.comments.length : 0)
  if (kind === 'attachments') return Number.isFinite(a.attachmentsCount) ? a.attachmentsCount : (Array.isArray(a.attachments) ? a.attachments.length : 0)
  if (kind === 'equipment') return Number.isFinite(a.equipmentCount) ? a.equipmentCount : (Array.isArray(a.systems) ? a.systems.length : 0)
  return 0
}

function statusValue(a: any): 'draft' | 'published' | 'completed' {
  const s = String(a?.status || 'draft').trim().toLowerCase()
  if (s === 'published' || s === 'completed' || s === 'draft') return s
  return 'draft'
}

function statusLabel(a: any) {
  const s = statusValue(a)
  if (s === 'published') return 'Published'
  if (s === 'completed') return 'Completed'
  return 'Draft'
}

function statusPillClass(a: any) {
  const s = statusValue(a)
  if (s === 'published') return 'bg-green-500/15 text-green-200 border-green-500/30'
  if (s === 'completed') return 'bg-white/10 text-white/80 border-white/15'
  return 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30'
}

function confirmDelete(a: any) {
  deletingActivity.value = String(a.id || a._id || '')
  deletingName.value = a.name || ''
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  deletingActivity.value = null
  deletingName.value = ''
}

async function doDelete() {
  if (!deletingActivity.value) return cancelDelete()
  deleting.value = true
  try {
    await store.deleteActivity(deletingActivity.value)
    await store.fetchActivities().catch(() => {})
    ui.showSuccess('Activity deleted')
    cancelDelete()
  } catch (e: any) {
    console.error('Failed to delete activity', e)
    const msg = e?.response?.data?.error || e?.message || 'Failed to delete activity'
    ui.showError(msg)
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
</style>
