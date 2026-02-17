<template>
  <section class="space-y-6 relative w-full min-w-0">
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'OPR', to: '/app/opr' },
          { text: 'OPR Items', to: '/app/opr/items' }
        ]"
        title="OPR Items"
      >
        <template #middle>
          <SearchPill
            v-model="search"
            placeholder="Search OPR items..."
            @clear="clearSearch"
          />
        </template>
      </BreadCrumbs>
    </div>

    <!-- toolbar (matches IssuesList/EquipmentList styling) -->
    <div class="rounded-2xl p-3 bg-white/6 backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 gap-y-2 w-full max-w-full min-w-0 relative z-30">
      <div class="flex items-center gap-3 min-w-0 flex-wrap">
        <!-- Keep file input in toolbar so Upload can trigger it -->
        <input
          ref="importFileInput"
          type="file"
          class="hidden"
          accept=".csv,.xlsx,.xls"
          :disabled="submitting"
          @change="onImportFileSelected"
        >

        <div class="relative inline-block group shrink-0">
          <button
            :disabled="submitting || !projectId"
            aria-label="Add"
            :title="addTooltip"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
            @click="openAddModal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-5 h-5"
            >
              <path
                d="M12 5v14"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M5 12h14"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <div
            role="tooltip"
            class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
          >
            {{ addTooltip }}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 gap-y-2">
          <div class="flex items-center gap-2">
            <label class="text-white/70 text-sm">Category</label>
            <div
              ref="categoryMenuRef"
              class="relative"
            >
              <button
                :aria-expanded="showCategoryMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 w-56 justify-between"
                @click.stop="toggleCategoryMenu"
              >
                <span class="truncate">{{ categoryFilterLabel }}</span>
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
                v-if="showCategoryMenu"
                class="absolute left-0 mt-2 w-80 rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
                role="menu"
              >
                <div class="py-1 max-h-96 overflow-auto">
                  <button
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2 whitespace-nowrap', (!categoryId) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="applyCategoryFilter('')"
                  >
                    <span>All categories</span>
                  </button>
                  <button
                    v-for="c in categories"
                    :key="c.id"
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2 whitespace-nowrap', String(categoryId) === String(c.id) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="applyCategoryFilter(String(c.id))"
                  >
                    <span>{{ c.name }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              id="includeArchivedChk"
              v-model="includeArchived"
              type="checkbox"
              class="form-checkbox h-4 w-4 rounded bg-white/10 border-white/30 text-white/80 checked:bg-white/10 checked:border-white/30"
            >
            <label
              for="includeArchivedChk"
              class="text-white/70 text-sm select-none"
            >Include archived</label>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <RouterLink
            to="/app/opr"
            class="h-10 px-3 inline-flex items-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
            title="Open OPR Workshop"
          >
            Workshop
          </RouterLink>

          <div class="relative inline-block group shrink-0">
            <button
              :disabled="!projectId"
              aria-label="Toggle progress"
              :title="projectId ? 'Toggle progress' : 'Select a project'"
              :aria-pressed="showProgress ? 'true' : 'false'"
              :class="[
                'w-10 h-10 flex items-center justify-center rounded-full text-white border disabled:opacity-40',
                showProgress ? 'bg-white/15 border-white/20 hover:bg-white/20' : 'bg-transparent border-white/15 hover:bg-white/15'
              ]"
              @click="toggleProgress"
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
                  d="M4 19V5"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M8 17v-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M12 17V7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M16 17v-4"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M20 17V9"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              {{ showProgress ? 'Hide progress' : 'Show progress' }}
            </div>
          </div>

          <div class="relative inline-block group shrink-0">
            <button
              :disabled="loading || !projectId"
              aria-label="Refresh"
              :title="refreshTooltip"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
              @click="refreshAll"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  d="M20 12a8 8 0 1 1-2.34-5.66"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M20 4v6h-6"
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
              {{ refreshTooltip }}
            </div>
          </div>

          <div class="relative inline-block group shrink-0">
            <button
              :disabled="loading || !projectId || filtered.length === 0"
              aria-label="Download"
              :title="downloadTooltip"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
              @click="downloadFilteredXlsx"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-5 h-5"
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
                  d="M4 21h16"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              {{ downloadTooltip }}
            </div>
          </div>

          <div class="relative inline-block group shrink-0">
            <button
              :disabled="submitting || !projectId"
              aria-label="Upload"
              :title="uploadTooltip"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
              @click="triggerUpload"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  d="M12 21V11"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M8 13l4-4 4 4"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M4 21h16"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              {{ uploadTooltip }}
            </div>
          </div>

          <div class="relative inline-block group shrink-0">
            <button
              :disabled="!filtersActive"
              aria-label="Clear filters"
              :title="clearFiltersTooltip"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
              @click="clearAllFilters"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  d="M6 6l12 12"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M18 6L6 18"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              {{ clearFiltersTooltip }}
            </div>
          </div>
        </div>

        <div class="text-white/70 text-sm">
          {{ displayTotal }} item{{ displayTotal === 1 ? '' : 's' }}
        </div>
        <div
          v-if="loading"
          class="text-white/60 text-xs"
        >
          Loading…
        </div>
      </div>
    </div>

    <!-- progress (collapsible card like IssuesList Analytics) -->
    <div
      v-if="showProgress"
      class="rounded-2xl p-4 md:p-6 bg-white/5 border border-white/10"
    >
      <div class="flex items-center justify-between mb-4">
        <div class="text-white font-semibold">
          Progress
        </div>
        <button
          class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
          @click="showProgress = false"
        >
          Hide
        </button>
      </div>
      <OprItemsProgressCharts
        :items="filtered"
        :coverage="coverage"
        :loading="loading"
      />
    </div>

    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12">
        <div class="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div class="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
            <div class="text-white/80 text-sm">
              {{ displayTotal }} items
            </div>
            <div class="text-white/60 text-xs">
              <span v-if="displayTotal > 0">{{ startItem }}–{{ endItem }} of {{ displayTotal }}</span>
            </div>
          </div>

          <div
            v-if="!loading && filtered.length === 0"
            class="p-6 text-white/70 text-sm"
          >
            No OPR items found.
          </div>

          <div
            v-else
            class="divide-y divide-white/10"
          >
            <div
              v-for="it in pagedItems"
              :key="it.id"
              class="p-4 flex gap-3 items-start"
            >
              <div class="shrink-0">
                <div class="text-[11px] px-2 py-1 rounded bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 inline-block">
                  #{{ it.rank }}
                </div>
                <div
                  v-if="it.status === 'archived'"
                  class="mt-1 text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 inline-block"
                >
                  Archived
                </div>
              </div>

              <div class="min-w-0 flex-1">
                <div class="text-white/90 text-sm whitespace-pre-wrap">
                  {{ it.text }}
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span class="text-white/60">{{ categoryName(it.categoryId) }}</span>
                  <span class="text-white/40">•</span>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white/80"
                    @click="openTrace(it)"
                  >
                    Where addressed
                  </button>
                </div>

                <div
                  v-if="coverageFor(it.id)?.total"
                  class="mt-2"
                >
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="text-white/50">Links:</span>

                    <button
                      v-if="!inlineTrace[it.id] && !inlineTraceLoading[it.id]"
                      type="button"
                      class="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-white/80"
                      @click="loadInlineTrace(it.id)"
                    >
                      Load ({{ coverageFor(it.id)?.total }})
                    </button>

                    <span
                      v-else-if="inlineTraceLoading[it.id]"
                      class="text-white/60"
                    >Loading…</span>

                    <template v-else>
                      <RouterLink
                        v-for="row in inlineTracePreview(it.id)"
                        :key="row.id"
                        :to="traceLocation(row)"
                        class="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-400/20 hover:bg-sky-500/15 text-sky-100 max-w-full truncate"
                        :title="traceRowLabel(row)"
                      >
                        {{ traceRowLabel(row) }}
                      </RouterLink>

                      <button
                        v-if="(inlineTrace[it.id] || []).length >= INLINE_TRACE_LIMIT"
                        type="button"
                        class="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-white/70"
                        @click="openTrace(it)"
                      >
                        More…
                      </button>
                    </template>
                  </div>
                </div>
              </div>

              <div class="shrink-0 ml-auto flex flex-col items-end gap-1 pt-0.5">
                <span
                  :class="badgeClass(coverageFor(it.id))"
                  class="px-2 py-0.5 rounded-full border text-xs whitespace-nowrap"
                >
                  {{ coverageLabel(coverageFor(it.id)) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination controls (matches IssuesList styling) -->
        <div
          v-if="displayTotal > 0"
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
      </div>
    </div>

    <Modal
      v-model="addOpen"
      panel-class="max-w-2xl"
    >
      <template #header>
        <div class="flex items-center justify-between w-full gap-3">
          <div class="text-lg font-semibold">
            Add OPR Item
          </div>
          <div class="text-sm text-white/60">
            Admin only
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12">
            <label class="block">
              <div class="text-white/70 text-sm mb-1">Default category</div>
              <select
                v-model="importDefaultCategoryId"
                class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option
                  value=""
                  disabled
                >
                  Select category…
                </option>
                <option
                  v-for="c in categories"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
            </label>
          </div>

          <div class="col-span-12">
            <label class="block">
              <div class="text-white/70 text-sm mb-1">Manual items (one per line)</div>
              <textarea
                v-model="importLines"
                rows="6"
                class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Enter one OPR item per line…"
              />
            </label>
          </div>

          <div class="col-span-12 flex items-center justify-between gap-2">
            <div class="text-xs text-white/60">
              {{ manualLineCount }} items ready
            </div>
            <button
              class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/25 text-emerald-100 text-sm disabled:opacity-50"
              :disabled="submitting || !importDefaultCategoryId || manualLineCount === 0"
              @click="submitManualImport"
            >
              {{ submitting ? 'Saving…' : 'Add items' }}
            </button>
          </div>
        </div>

        <div class="border-t border-white/10 pt-4">
          <div class="flex items-center justify-between gap-2">
            <div class="text-white/80 text-sm font-medium">
              Upload (CSV/XLSX)
            </div>
            <div class="text-xs text-white/60">
              Use the Upload button in the toolbar.
            </div>
          </div>

          <div
            v-if="importRows.length"
            class="mt-3"
          >
            <div class="text-xs text-white/60">
              Preview: {{ importRowsValidCount }} valid / {{ importRows.length }} rows
            </div>
            <div class="mt-2 max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/10">
              <div
                v-for="r in importRows"
                :key="r._key"
                class="px-3 py-2 border-b border-white/10"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="text-white/85 text-sm truncate">
                    {{ r.text }}
                  </div>
                  <div
                    class="text-xs"
                    :class="rowError(r) ? 'text-rose-200' : 'text-emerald-200'"
                  >
                    {{ rowError(r) || 'OK' }}
                  </div>
                </div>
                <div class="text-xs text-white/50">
                  {{ categoryName(r.categoryId) || '—' }}
                </div>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm"
                :disabled="submitting"
                @click="importRows = []"
              >
                Clear
              </button>
              <button
                class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/25 text-emerald-100 text-sm disabled:opacity-50"
                :disabled="submitting || importRowsValidCount === 0"
                @click="submitFileImport"
              >
                {{ submitting ? 'Saving…' : 'Import valid rows' }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="importError"
          class="rounded-xl bg-rose-500/10 border border-rose-400/20 p-3 text-rose-100 text-sm"
        >
          {{ importError }}
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            @click="addOpen = false"
          >
            Close
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      v-model="traceOpen"
      panel-class="max-w-3xl"
    >
      <template #header>
        <div class="flex items-center justify-between w-full gap-3">
          <div class="text-lg font-semibold">
            Where addressed
          </div>
          <div class="text-sm text-white/60">
            {{ traceItem?.text || '' }}
          </div>
        </div>
      </template>
      <div class="space-y-2">
        <div
          v-if="traceLoading"
          class="text-white/70 text-sm"
        >
          Loading…
        </div>
        <div
          v-else-if="traceRows.length === 0"
          class="text-white/70 text-sm"
        >
          No evaluations yet.
        </div>
        <div
          v-else
          class="divide-y divide-white/10 rounded-lg border border-white/10 bg-black/10"
        >
          <div
            v-for="row in traceRows"
            :key="row.id"
            class="px-3 py-2"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="text-white/85 text-sm">
                <span class="text-white/60">{{ row.contextType }}</span>
                <span class="text-white/40">·</span>
                <span class="text-white/80">{{ row.contextLabel || row.contextId }}</span>
                <span class="text-white/40">·</span>
                <span class="text-white/70">{{ row.targetType }}</span>
                <span
                  v-if="row.targetLabel"
                  class="text-white/50"
                >
                  ({{ row.targetLabel }})
                </span>
              </div>
              <span
                :class="badgeClassSimple(row.status)"
                class="text-[11px] px-2 py-0.5 rounded-full border"
              >
                {{ row.status }}
              </span>
            </div>

            <div class="mt-1 flex items-center justify-between gap-2">
              <div
                v-if="traceHref(row)"
                class="text-white/40 text-[11px] break-all"
              >
                {{ traceHref(row) }}
              </div>
              <RouterLink
                v-if="traceLocation(row)"
                :to="traceLocation(row)"
                class="shrink-0 text-xs px-2 py-1 rounded-md bg-sky-500/15 border border-sky-400/20 hover:bg-sky-500/20 text-sky-100"
              >
                Open
              </RouterLink>
            </div>
            <div
              v-if="row.notes"
              class="text-white/70 text-xs mt-1 whitespace-pre-wrap"
            >
              {{ row.notes }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            @click="traceOpen = false"
          >
            Close
          </button>
        </div>
      </template>
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import axios from 'axios'
import * as XLSX from 'xlsx'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import SearchPill from '../../components/SearchPill.vue'
import Modal from '../../components/Modal.vue'
import OprItemsProgressCharts from '../../components/charts/OprItemsProgressCharts.vue'
import { getApiBase } from '../../utils/api'
import { getAuthHeaders } from '../../utils/auth'
import { useAuthStore } from '../../stores/auth'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'
import { useOprLinkEvaluationsStore, type OprCoverageRow } from '../../stores/oprLinkEvaluations'

type OprCategory = { id: string; name: string; sortOrder?: number }
type OprItem = { id: string; categoryId: string | null; text: string; score: number; rank: number; status: 'active' | 'archived' }

type ImportRow = { _key: string; id?: string; categoryId: string; text: string; rank: number | null; score: number | null }

const ui = useUiStore()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const evals = useOprLinkEvaluationsStore()
const router = useRouter()

const projectId = computed(() => String((projectStore.currentProject as any)?._id || projectStore.currentProject?.id || ''))

function readProgressPreference(): boolean {
  try {
    const raw = sessionStorage.getItem('oprItemsCharts:open')
    if (raw === 'true') return true
    if (raw === 'false') return false
  } catch { /* ignore */ }
  return false
}

const showProgress = ref(readProgressPreference())

function toggleProgress() {
  showProgress.value = !showProgress.value
  try { sessionStorage.setItem('oprItemsCharts:open', showProgress.value ? 'true' : 'false') } catch { /* ignore */ }
}

const loading = ref(false)
const submitting = ref(false)
const importError = ref('')

const addOpen = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)

const categories = ref<OprCategory[]>([])
const items = ref<OprItem[]>([])
const coverage = ref<Record<string, OprCoverageRow>>({})

const INLINE_TRACE_LIMIT = 8
const INLINE_TRACE_PREVIEW = 3
const INLINE_TRACE_AUTOPREFETCH = 20
const INLINE_TRACE_CONCURRENCY = 4
const inlineTrace = ref<Record<string, any[]>>({})
const inlineTraceLoading = ref<Record<string, boolean>>({})

function titleCase(s: string): string {
  return String(s || '')
    .trim()
    .split(/[_\s]+/g)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function prettyTargetType(t: any): string {
  const v = String(t || '').trim()
  if (v === 'checklist_question') return 'Checklist question'
  if (v === 'functional_test') return 'Functional test'
  if (v === 'functional_test_step') return 'Functional test step'
  if (v === 'issue') return 'Issue'
  return titleCase(v)
}

function traceRowLabel(row: any): string {
  const contextType = titleCase(String(row?.contextType || '').trim())
  const contextLabel = String(row?.contextLabel || row?.contextId || '').trim()
  const targetType = prettyTargetType(row?.targetType)
  const targetLabel = String(row?.targetLabel || '').trim()
  const ctx = contextLabel ? `${contextType}: ${contextLabel}` : contextType
  const tgt = targetLabel ? `${targetType}: ${targetLabel}` : targetType
  return `${ctx} · ${tgt}`
}

function inlineTracePreview(itemId: string) {
  const list = Array.isArray(inlineTrace.value[itemId]) ? inlineTrace.value[itemId] : []
  return list.filter((r) => traceLocation(r)).slice(0, INLINE_TRACE_PREVIEW)
}

async function loadInlineTrace(oprItemId: string) {
  if (!projectId.value || !oprItemId) return
  if (inlineTraceLoading.value[oprItemId]) return
  if (inlineTrace.value[oprItemId]) return
  inlineTraceLoading.value = { ...inlineTraceLoading.value, [oprItemId]: true }
  try {
    const { data } = await axios.get(`${getApiBase()}/api/projects/${projectId.value}/opr/link/evaluations`, {
      headers: getAuthHeaders(),
      params: { oprItemId, limit: INLINE_TRACE_LIMIT },
    })
    inlineTrace.value = { ...inlineTrace.value, [oprItemId]: Array.isArray(data) ? data : [] }
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load links', { duration: 6000 })
  } finally {
    inlineTraceLoading.value = { ...inlineTraceLoading.value, [oprItemId]: false }
  }
}

async function prefetchInlineTraceForVisible() {
  if (!projectId.value) return
  if (loading.value) return
  const list = Array.isArray(pagedItems.value) ? pagedItems.value : []
  const visible = list.slice(0, INLINE_TRACE_AUTOPREFETCH)
  const ids = visible
    .filter((it: any) => (coverageFor(String(it?.id || ''))?.total || 0) > 0)
    .map((it: any) => String(it.id))
    .filter(Boolean)
  if (!ids.length) return

  // Simple promise pool
  const queue = ids.filter((id) => !inlineTrace.value[id] && !inlineTraceLoading.value[id])
  if (!queue.length) return
  let idx = 0
  const workers = Array.from({ length: Math.min(INLINE_TRACE_CONCURRENCY, queue.length) }, async () => {
    while (idx < queue.length) {
      const id = queue[idx++]
      try { await loadInlineTrace(id) } catch (_) { /* ignore */ }
    }
  })
  await Promise.all(workers)
}

let prefetchTimer: any = null
function schedulePrefetch() {
  if (prefetchTimer) clearTimeout(prefetchTimer)
  prefetchTimer = setTimeout(() => { void prefetchInlineTraceForVisible() }, 50)
}

const search = ref('')
const categoryId = ref('')
const includeArchived = ref(false)

// Category dropdown (IssuesList-style)
const showCategoryMenu = ref(false)
const categoryMenuRef = ref<HTMLElement | null>(null)
const categoryFilterLabel = computed(() => {
  if (!categoryId.value) return 'All categories'
  const c = categories.value.find((x) => String(x.id) === String(categoryId.value))
  return c ? String(c.name || 'All categories') : 'All categories'
})

function toggleCategoryMenu() {
  showCategoryMenu.value = !showCategoryMenu.value
}

function closeCategoryMenu() {
  showCategoryMenu.value = false
}

function applyCategoryFilter(id: string) {
  categoryId.value = String(id || '')
  closeCategoryMenu()
}

function handleClickOutside(e: MouseEvent) {
  const el = categoryMenuRef.value
  if (!el) return
  if (showCategoryMenu.value && !el.contains(e.target as Node)) closeCategoryMenu()
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

const refreshTooltip = computed(() => {
  if (!projectId.value) return 'Select a project'
  if (loading.value) return 'Loading…'
  return 'Refresh'
})

const filtersActive = computed(() => {
  return Boolean(
    (search.value || '').trim() ||
    (categoryId.value || '').trim() ||
    includeArchived.value
  )
})

const clearFiltersTooltip = computed(() => {
  return filtersActive.value ? 'Clear filters' : 'No filters to clear'
})

function clearSearch() {
  search.value = ''
}

function clearAllFilters() {
  search.value = ''
  categoryId.value = ''
  includeArchived.value = false
  closeCategoryMenu()
}

const importDefaultCategoryId = ref('')
const importLines = ref('')
const importRows = ref<ImportRow[]>([])

const manualLineCount = computed(() => String(importLines.value || '').split(/\r?\n/g).map((s) => s.trim()).filter(Boolean).length)

function normalizeHeaderKey(v: any) {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function parseMaybeNumber(v: any): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function sanitizeFilename(v: any) {
  return String(v || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9 _\-.()]+/g, '')
    .replace(/\s/g, '_')
    .slice(0, 120)
}

function todayYmd() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function readColumnValue(row: any, candidates: string[]) {
  const keys = Object.keys(row || {})
  const map: Record<string, string> = {}
  for (const k of keys) map[normalizeHeaderKey(k)] = k
  for (const c of candidates) {
    const key = map[normalizeHeaderKey(c)]
    if (key) return row[key]
  }
  return undefined
}

function mapCategoryToId(raw: any) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const cats: any[] = Array.isArray(categories.value) ? categories.value : []
  const byId = cats.find((c) => String(c?.id || '') === s)
  if (byId) return String(byId.id)
  const norm = s.toLowerCase()
  const byName = cats.find((c) => String(c?.name || '').trim().toLowerCase() === norm)
  return byName ? String(byName.id) : ''
}

function rowError(r: ImportRow) {
  if (!r?.categoryId) return 'Category required'
  const txt = String(r?.text || '').trim()
  if (!txt) return 'Text required'
  return ''
}

const importRowsValidCount = computed(() => importRows.value.filter((r) => !rowError(r)).length)

function categoryName(id: string | null) {
  if (!id) return ''
  const c = categories.value.find((x) => String(x.id) === String(id))
  return c ? c.name : ''
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = Array.isArray(items.value) ? items.value : []
  return list.filter((it) => {
    if (!includeArchived.value && it.status === 'archived') return false
    if (categoryId.value && String(it.categoryId || '') !== String(categoryId.value)) return false
    if (!q) return true
    return String(it.text || '').toLowerCase().includes(q)
  })
})

const downloadTooltip = computed(() => {
  if (!projectId.value) return 'Select a project'
  if (loading.value) return 'Loading…'
  if (filtered.value.length === 0) return 'Nothing to download'
  return 'Download XLSX'
})

const uploadTooltip = computed(() => {
  if (!projectId.value) return 'Select a project'
  if (submitting.value) return 'Uploading…'
  return 'Upload CSV/XLSX'
})

const addTooltip = computed(() => {
  if (!projectId.value) return 'Select a project'
  if (submitting.value) return 'Saving…'
  return 'Add OPR item'
})

function openAddModal() {
  addOpen.value = true
}

function triggerUpload() {
  if (submitting.value) return
  if (!projectId.value) return
  try { importFileInput.value?.click() } catch { /* ignore */ }
}

function downloadFilteredXlsx() {
  try {
    if (!projectId.value) return
    const list = Array.isArray(filtered.value) ? filtered.value : []
    if (!list.length) return

    const rows = list.map((it: any) => ({
      id: String(it?.id || ''),
      categoryId: it?.categoryId ? String(it.categoryId) : '',
      category: categoryName(it?.categoryId || null),
      rank: it?.rank ?? null,
      score: it?.score ?? null,
      status: String(it?.status || ''),
      text: String(it?.text || ''),
    }))

    const ws = XLSX.utils.json_to_sheet(rows, { header: ['id', 'categoryId', 'category', 'rank', 'score', 'status', 'text'] })

    const instructions = [
      ['How to use this spreadsheet'],
      ['- Edit existing items by keeping the `id` column value.'],
      ['- Add new items by leaving `id` blank.'],
      ['- Provide either `categoryId` (preferred) or `category` (exact category name).'],
      ['- Columns supported: id, categoryId, category, rank, score, status (active|archived), text'],
      ['- Upload via the Upload (CSV/XLSX) section on this page.'],
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(instructions)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws2, 'Instructions')
    XLSX.utils.book_append_sheet(wb, ws, 'OPR Items')

    const projectName = sanitizeFilename((projectStore.currentProject as any)?.name || '')
    const filename = sanitizeFilename(`OPR_Items_${projectName || projectId.value}_${todayYmd()}.xlsx`) || `OPR_Items_${todayYmd()}.xlsx`
    XLSX.writeFile(wb, filename)
  } catch (e: any) {
    ui.showError(e?.message || 'Failed to download XLSX', { duration: 6000 })
  }
}

// Pagination (matches IssuesList styling/behavior)
const page = ref(1)
const pageSizes = [5, 10, 25, 50, 100]
const pageSize = ref((authStore && authStore.user && authStore.user.contact && typeof (authStore.user as any).contact.perPage === 'number') ? (authStore.user as any).contact.perPage : 10)
const pageSizeStorageKey = computed(() => `oprItemsPageSize:${projectStore.currentProjectId || 'global'}`)

function loadPageSizePref() {
  try {
    const raw = sessionStorage.getItem(pageSizeStorageKey.value)
    const n = raw ? Number(raw) : NaN
    if (pageSizes.includes(n)) pageSize.value = n
  } catch (e) { /* ignore sessionStorage read errors */ }
}

function persistPageSizePref() {
  try { sessionStorage.setItem(pageSizeStorageKey.value, String(pageSize.value)) } catch (e) { /* ignore sessionStorage write errors */ }
}

watch(pageSizeStorageKey, () => loadPageSizePref(), { immediate: true })
watch(pageSize, () => persistPageSizePref())

const displayTotal = computed(() => (Array.isArray(filtered.value) ? filtered.value.length : 0))
const totalPages = computed(() => Math.max(1, Math.ceil(displayTotal.value / pageSize.value)))
const startItem = computed(() => displayTotal.value === 0 ? 0 : ((page.value - 1) * pageSize.value) + 1)
const endItem = computed(() => Math.min(displayTotal.value, page.value * pageSize.value))
const pagedItems = computed(() => {
  const list = Array.isArray(filtered.value) ? filtered.value : []
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
})

function prevPage() {
  page.value = Math.max(1, page.value - 1)
}

function nextPage() {
  page.value = Math.min(totalPages.value, page.value + 1)
}

function coverageFor(itemId: string) {
  return coverage.value[itemId]
}

function coverageLabel(c?: OprCoverageRow) {
  if (!c || !c.total) return 'Unaddressed'
  if (c.counts.fail > 0) return 'Fail'
  if (c.counts.pass > 0) return 'Pass'
  if (c.counts.na > 0) return 'N/A'
  if (c.counts.unverified > 0) return 'Unverified'
  return 'Unaddressed'
}

function badgeClass(c?: OprCoverageRow) {
  const label = coverageLabel(c)
  if (label === 'Pass') return 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
  if (label === 'Fail') return 'bg-rose-500/15 border-rose-400/30 text-rose-100'
  if (label === 'N/A') return 'bg-white/10 border-white/15 text-white/70'
  if (label === 'Unverified') return 'bg-amber-500/15 border-amber-400/30 text-amber-100'
  return 'bg-white/5 border-white/10 text-white/70'
}

function badgeClassSimple(status: string) {
  if (status === 'pass') return 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100'
  if (status === 'fail') return 'bg-rose-500/15 border-rose-400/30 text-rose-100'
  if (status === 'na') return 'bg-white/10 border-white/15 text-white/70'
  return 'bg-amber-500/15 border-amber-400/30 text-amber-100'
}

async function fetchCategories() {
  if (!projectId.value) return
  const { data } = await axios.get(`${getApiBase()}/api/projects/${projectId.value}/opr/link/categories`, { headers: getAuthHeaders() })
  categories.value = Array.isArray(data) ? data : []
  if (!importDefaultCategoryId.value) importDefaultCategoryId.value = String(categories.value[0]?.id || '')
}

async function fetchItems() {
  if (!projectId.value) return
  const params: Record<string, any> = { includeArchived: 1 }
  const { data } = await axios.get(`${getApiBase()}/api/projects/${projectId.value}/opr/link/items`, { headers: getAuthHeaders(), params })
  items.value = Array.isArray(data) ? data : []
}

async function refreshCoverage() {
  if (!projectId.value) return
  const ids = items.value.map((i) => i.id)
  coverage.value = await evals.fetchCoverage(projectId.value, ids)
}

async function refreshAll() {
  if (!projectId.value) return
  loading.value = true
  inlineTrace.value = {}
  inlineTraceLoading.value = {}
  try {
    await fetchCategories()
    await fetchItems()
    await refreshCoverage()
    schedulePrefetch()
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load OPR items', { duration: 6000 })
  } finally {
    loading.value = false
  }
}

watch(
  () => [projectId.value, loading.value, search.value, categoryId.value, includeArchived.value, filtered.value.length, page.value, pageSize.value],
  () => schedulePrefetch(),
  { flush: 'post' }
)

// Reset pagination when filters/search change
watch([() => search.value, () => categoryId.value, () => includeArchived.value, () => pageSize.value], () => {
  page.value = 1
})

// Keep page within range when filtered list changes
watch([() => filtered.value.length, () => pageSize.value], () => {
  if (page.value > totalPages.value) page.value = totalPages.value
  if (page.value < 1) page.value = 1
})

async function postImportedItems(newItems: Array<{ categoryId: string; text: string; rank?: number | null; score?: number | null }>) {
  if (!projectId.value) return
  if (!newItems.length) return
  submitting.value = true
  importError.value = ''
  try {
    await axios.post(`${getApiBase()}/api/projects/${projectId.value}/opr/link/items`, { items: newItems }, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    ui.showSuccess(`Imported ${newItems.length} OPR item${newItems.length === 1 ? '' : 's'}`, { duration: 3000 })
    await refreshAll()
  } catch (e: any) {
    importError.value = e?.response?.data?.error || e?.message || 'Failed to import OPR items'
  } finally {
    submitting.value = false
  }
}

async function upsertImportedItems(rows: Array<{ id?: string; categoryId: string; text: string; rank?: number | null; score?: number | null; status?: string }>) {
  if (!projectId.value) return
  if (!rows.length) return
  submitting.value = true
  importError.value = ''
  try {
    const { data } = await axios.post(`${getApiBase()}/api/projects/${projectId.value}/opr/link/items/upsert`, { items: rows }, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    const updated = Number(data?.updated || 0)
    const inserted = Number(data?.inserted || 0)
    const skipped = Number(data?.skipped || 0)
    ui.showSuccess(`Upserted OPR items: ${updated} updated, ${inserted} added${skipped ? `, ${skipped} skipped` : ''}`, { duration: 4000 })
    await refreshAll()
  } catch (e: any) {
    importError.value = e?.response?.data?.error || e?.message || 'Failed to upsert OPR items'
  } finally {
    submitting.value = false
  }
}

async function submitManualImport() {
  if (!importDefaultCategoryId.value) return
  const lines = String(importLines.value || '').split(/\r?\n/g).map((s) => s.trim()).filter(Boolean)
  if (!lines.length) return
  const newItems = lines.map((t) => ({ categoryId: importDefaultCategoryId.value, text: t }))
  await postImportedItems(newItems)
  importLines.value = ''
}

async function onImportFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return

  try {
    const isCsv = /\.csv$/i.test(file.name) || String(file.type || '').toLowerCase().includes('csv')
    const wb = isCsv
      ? XLSX.read(await file.text(), { type: 'string' })
      : XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheetName = wb.SheetNames?.[0]
    if (!sheetName) throw new Error('No sheets found')
    const sheet = wb.Sheets[sheetName]
    if (!sheet) throw new Error('Failed to read sheet')

    const objRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) as any[]
    let next: ImportRow[] = []
    if (Array.isArray(objRows) && objRows.length && typeof objRows[0] === 'object' && !Array.isArray(objRows[0])) {
      next = objRows.map((r, idx) => {
        const idRaw = readColumnValue(r, ['id', '_id', 'itemId', 'item id', 'oprItemId', 'opr item id'])
        const categoryRaw = readColumnValue(r, ['category', 'categoryId', 'oprCategory', 'opr category'])
        const textRaw = readColumnValue(r, ['text', 'item', 'oprItem', 'opr item', 'description', 'title'])
        const rankRaw = readColumnValue(r, ['rank', '#', 'number'])
        const scoreRaw = readColumnValue(r, ['score', 'points', 'pts'])
        const text = String(textRaw || '').trim()
        return {
          _key: `${Date.now()}-${idx}-${Math.random()}`,
          id: String(idRaw || '').trim() || undefined,
          categoryId: mapCategoryToId(categoryRaw) || importDefaultCategoryId.value,
          text,
          rank: parseMaybeNumber(rankRaw),
          score: parseMaybeNumber(scoreRaw),
        }
      }).filter((r) => String(r.text || '').trim())
    } else {
      const arrRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as any[]
      const dataRows = Array.isArray(arrRows) ? arrRows : []
      const header = (dataRows[0] || []).map((c: any) => normalizeHeaderKey(c))
      const hasHeader = header.includes('category') || header.includes('text') || header.includes('item')
      const startIdx = hasHeader ? 1 : 0
      let idIdx = -1
      let categoryIdx = 0
      let textIdx = 1
      let rankIdx = 2
      let scoreIdx = 3
      if (hasHeader) {
        idIdx = header.findIndex((h) => h === 'id' || h === '_id' || h === 'itemid' || h === 'opritemid')
        categoryIdx = header.findIndex((h) => h === 'category' || h === 'categoryid' || h === 'oprcategory')
        textIdx = header.findIndex((h) => h === 'text' || h === 'item' || h === 'opritem' || h === 'description' || h === 'title')
        rankIdx = header.findIndex((h) => h === 'rank' || h === 'number')
        scoreIdx = header.findIndex((h) => h === 'score' || h === 'points' || h === 'pts')
      }
      next = dataRows.slice(startIdx).map((r, idx) => {
        const row = Array.isArray(r) ? r : []
        const idRaw = idIdx >= 0 ? row[idIdx] : ''
        const catRaw = categoryIdx >= 0 ? row[categoryIdx] : ''
        const textRaw = textIdx >= 0 ? row[textIdx] : row[0]
        const text = String(textRaw || '').trim()
        return {
          _key: `${Date.now()}-${idx}-${Math.random()}`,
          id: String(idRaw || '').trim() || undefined,
          categoryId: mapCategoryToId(catRaw) || importDefaultCategoryId.value,
          text,
          rank: rankIdx >= 0 ? parseMaybeNumber(row[rankIdx]) : null,
          score: scoreIdx >= 0 ? parseMaybeNumber(row[scoreIdx]) : null,
        }
      }).filter((r) => String(r.text || '').trim())
    }

    importRows.value = next.slice(0, 500)
    if (next.length > 500) ui.showWarning('Imported preview limited to 500 rows', { duration: 5000 })
    // Without the right-side panel, show the preview/actions in the Add modal.
    addOpen.value = true
  } catch (err: any) {
    ui.showError(err?.message || 'Failed to parse file', { duration: 6000 })
  } finally {
    try { input.value = '' } catch (_) { /* ignore */ }
  }
}

async function submitFileImport() {
  const valid = importRows.value.filter((r) => !rowError(r))
  const rows = valid.map((r) => ({
    id: r.id,
    categoryId: r.categoryId,
    text: String(r.text || '').trim(),
    rank: r.rank,
    score: r.score,
  }))
  await upsertImportedItems(rows)
  importRows.value = []
}

const traceOpen = ref(false)
const traceItem = ref<OprItem | null>(null)
const traceLoading = ref(false)
const traceRows = ref<any[]>([])

function tabForTraceRow(row: any): string {
  const targetType = String(row?.targetType || '')
  if (targetType === 'checklist_question') return 'Checklists'
  if (targetType === 'functional_test' || targetType === 'functional_test_step') return 'FPT'
  if (targetType === 'issue') return 'Issues'
  return 'Info'
}

function traceLocation(row: any): any | null {
  const contextType = String(row?.contextType || '').trim()
  const contextId = String(row?.contextId || '').trim()
  if (!contextType || !contextId) return null

  // For Issues, the IssueEdit page already contains OPR linking + verification.
  if (contextType === 'issue') {
    return { name: 'issue-edit', params: { id: contextId }, query: { focus: 'opr' } }
  }

  const query: Record<string, any> = {
    tab: tabForTraceRow(row),
    oprTargetType: String(row?.targetType || '').trim(),
  }
  const targetId = String(row?.targetId || '').trim()
  const targetKey = String(row?.targetKey || '').trim()
  if (targetId) query.oprTargetId = targetId
  if (targetKey) query.oprTargetKey = targetKey

  if (contextType === 'equipment') return { name: 'equipment-edit', params: { id: contextId }, query }
  if (contextType === 'system') return { name: 'system-edit', params: { id: contextId }, query }
  if (contextType === 'activity') return { name: 'activity-edit', params: { id: contextId }, query }
  if (contextType === 'task') return { name: 'task-edit', params: { id: contextId }, query }
  if (contextType === 'template') return { name: 'template-edit', params: { id: contextId }, query }
  return null
}

function traceHref(row: any): string {
  try {
    const loc = traceLocation(row)
    if (!loc) return ''
    return router.resolve(loc).href
  } catch {
    return ''
  }
}

async function openTrace(it: OprItem) {
  traceItem.value = it
  traceOpen.value = true
  traceLoading.value = true
  traceRows.value = []
  try {
    const { data } = await axios.get(`${getApiBase()}/api/projects/${projectId.value}/opr/link/evaluations`, {
      headers: getAuthHeaders(),
      params: { oprItemId: it.id },
    })
    traceRows.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to load trace', { duration: 6000 })
  } finally {
    traceLoading.value = false
  }
}

watch(projectId, () => {
  if (projectId.value) refreshAll()
})

onMounted(() => {
  if (projectId.value) refreshAll()
})
</script>
