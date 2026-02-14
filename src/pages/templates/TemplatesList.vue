<template>
  <section
    ref="pageSection"
    class="space-y-6 relative"
  >
    <!-- header with breadcrumbs -->
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Templates', to: '/templates' }
        ]"
        title="Templates"
      >
        <template #middle>
          <SearchPill
            v-model="search"
            placeholder="Search by tag, title or type"
          />
        </template>
      </BreadCrumbs>
    </div>

    <!-- toolbar -->
    <div class="rounded-2xl p-3 bg-white/6 backdrop-blur-xl border border-white/10 min-w-0 relative z-30">
      <!-- Error banner for plan guard or missing project -->
      <div
        v-if="(templatesStore as any).errorCode"
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
          <span v-if="(templatesStore as any).errorCode === 'PROJECT_NOT_FOUND'">Selected project not found. Please reselect a project.</span>
          <span v-else-if="(templatesStore as any).errorCode === 'FEATURE_NOT_IN_PLAN'">Templates are not available on your current subscription plan.</span>
          <span v-else>{{ (templatesStore as any).error || 'Unable to load templates.' }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-end justify-between gap-3 gap-y-2 min-w-0">
        <div class="flex flex-wrap items-end gap-3 gap-y-2 min-w-0">
          <div class="relative inline-block group">
            <button
              :disabled="!projectStore.currentProjectId"
              aria-label="Add template"
              :title="projectStore.currentProjectId ? 'Add template' : 'Select a project'"
              class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
              @click="openCreate()"
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
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              {{ projectStore.currentProjectId ? 'Add template' : 'Select a project to add templates' }}
            </div>
          </div>

          <div>
            <label class="block text-white/70 text-sm">Type</label>
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
                  <span>{{ typeFilter || 'All' }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ typeCount(typeFilter || 'All') }}</span>
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
                <div class="py-1 max-h-96 overflow-auto">
                  <button
                    v-for="opt in typeOptions"
                    :key="opt.name"
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', (typeFilter || 'All') === opt.name ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="typeFilter = (opt.name === 'All' ? '' : opt.name); closeTypeMenu()"
                  >
                    <span>{{ opt.name }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-white/70 text-sm">System</label>
            <div
              ref="systemMenuRef"
              class="relative"
            >
              <button
                :aria-expanded="showSystemMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[12rem] justify-between"
                @click="toggleSystemMenu"
              >
                <span class="flex items-center gap-2">
                  <span>{{ systemFilterLabel }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ systemCount(systemFilter || 'All') }}</span>
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
                v-if="showSystemMenu"
                class="absolute left-0 mt-2 w-56 rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
                role="menu"
              >
                <div class="py-1 max-h-96 overflow-auto">
                  <button
                    v-for="opt in systemOptions"
                    :key="opt.value || opt.name"
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', systemFilterKey === (opt.name === 'All' ? 'All' : String(opt.value).toLowerCase()) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="systemFilter = (opt.name === 'All' ? '' : String(opt.value || '')); closeSystemMenu()"
                  >
                    <span>{{ opt.name }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-white/70 text-sm">Status</label>
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
                  <span>{{ statusFilter || 'All' }}</span>
                  <span :class="statusBadgeClass(statusFilter || 'All') + ' text-xs px-2 py-0.5 rounded-full'">{{ statusCount(statusFilter || 'All') }}</span>
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
                <div class="py-1 max-h-96 overflow-auto">
                  <button
                    v-for="opt in statusOptions"
                    :key="opt.name"
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', (statusFilter || 'All') === opt.name ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="statusFilter = (opt.name === 'All' ? '' : opt.name); closeStatusMenu()"
                  >
                    <span class="inline-flex items-center gap-2">
                      <span
                        class="inline-block w-2.5 h-2.5 rounded-full"
                        :class="statusDotClass(opt.name)"
                      />
                      <span>{{ opt.name }}</span>
                    </span>
                    <span :class="statusBadgeClass(opt.name) + ' text-xs px-2 py-0.5 rounded-full'">{{ opt.count }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 gap-y-2">
          <div class="relative inline-block group shrink-0">
            <button
              :disabled="importing || !projectStore.currentProjectId"
              aria-label="Upload templates"
              :title="projectStore.currentProjectId ? 'Upload templates from CSV/XLSX' : 'Select a project'"
              class="px-3 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40 gap-2"
              @click="triggerImport()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              ><path
                d="M12 3v12"
                stroke-width="1.5"
                stroke-linecap="round"
              /><path
                d="M7 8l5-5 5 5"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /><rect
                x="4"
                y="15"
                width="16"
                height="6"
                rx="1.5"
                stroke-width="1.5"
              /></svg>
              <span class="text-sm">{{ importing ? 'Importing…' : 'Upload' }}</span>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Upload templates from CSV/XLSX
            </div>
          </div>

          <div class="relative inline-block group shrink-0">
            <button
              :disabled="exporting || !projectStore.currentProjectId"
              aria-label="Download templates XLSX"
              :title="projectStore.currentProjectId ? 'Download filtered templates as XLSX (editable)' : 'Select a project'"
              class="px-3 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40 gap-2"
              @click="downloadTemplatesXlsx()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              ><path
                d="M12 3v12"
                stroke-width="1.5"
                stroke-linecap="round"
              /><path
                d="M7 10l5 5 5-5"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /><rect
                x="4"
                y="17"
                width="16"
                height="4"
                rx="1.5"
                stroke-width="1.5"
              /></svg>
              <span class="text-sm">{{ exporting ? 'Exporting…' : 'xlsx' }}</span>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Download editable XLSX
            </div>
          </div>

          <div class="relative inline-block group shrink-0">
            <button
              :disabled="exportingCsv || !projectStore.currentProjectId"
              aria-label="Download templates CSV"
              :title="projectStore.currentProjectId ? 'Download filtered templates as CSV' : 'Select a project'"
              class="px-3 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40 gap-2"
              @click="downloadTemplatesCsv()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-4 h-4"
              ><path
                d="M12 3v12"
                stroke-width="1.5"
                stroke-linecap="round"
              /><path
                d="M7 10l5 5 5-5"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              /><rect
                x="4"
                y="17"
                width="16"
                height="4"
                rx="1.5"
                stroke-width="1.5"
              /></svg>
              <span class="text-sm">{{ exportingCsv ? 'Exporting…' : 'CSV' }}</span>
            </button>
            <div
              role="tooltip"
              class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
            >
              Download CSV
            </div>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            accept=".csv,.xlsx,.xls"
            @change="handleImportFile"
          >
        </div>
      </div>
    </div>

    <!-- list -->
    <div class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl overflow-x-auto min-w-0">
      <div class="flex items-center justify-between gap-3 gap-y-2 flex-wrap px-2 py-1 text-white/70 text-sm">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-white/60">Sort</span>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
            @click="setSort('tag')"
          >
            <span>Tag</span>
            <span
              v-if="sortKey === 'tag' && sortDir === 1"
              class="text-xs"
            >▲</span>
            <span
              v-else-if="sortKey === 'tag' && sortDir === -1"
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
              v-if="sortKey === 'title' && sortDir === 1"
              class="text-xs"
            >▲</span>
            <span
              v-else-if="sortKey === 'title' && sortDir === -1"
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
          <button
            type="button"
            class="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
            @click="setSort('system')"
          >
            <span>System</span>
            <span
              v-if="sortKey === 'system' && sortDir === 1"
              class="text-xs"
            >▲</span>
            <span
              v-else-if="sortKey === 'system' && sortDir === -1"
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
            @click="setSort('space')"
          >
            <span>Location</span>
            <span
              v-if="sortKey === 'space' && sortDir === 1"
              class="text-xs"
            >▲</span>
            <span
              v-else-if="sortKey === 'space' && sortDir === -1"
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
              v-if="sortKey === 'status' && sortDir === 1"
              class="text-xs"
            >▲</span>
            <span
              v-else-if="sortKey === 'status' && sortDir === -1"
              class="text-xs"
            >▼</span>
            <span
              v-else
              class="text-xs opacity-40"
            >⇅</span>
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3 mt-2">
        <div
          v-for="t in paged"
          :key="t.id || (t as any)._id"
          class="rounded-xl bg-white/10 border border-white/10 p-2 flex flex-col md:flex-row md:items-center gap-2 shadow-sm"
        >
          <RouterLink
            :to="{ name: 'template-edit', params: { id: t.id || (t as any)._id } }"
            class="flex-1 min-w-0"
            tabindex="0"
            style="text-decoration: none;"
          >
            <div class="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <div class="flex flex-col min-w-[70px] items-start">
                <div class="text-xs text-white/60">
                  Tag
                </div>
                <div class="text-lg font-bold text-white">
                  {{ t.tag || '-' }}
                </div>
              </div>
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                  <span class="text-xs text-white/60">Title:</span>
                  <span
                    class="text-base font-semibold text-white truncate"
                    :title="t.title"
                  >{{ t.title || '-' }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-2 mb-1">
                  <span class="text-xs text-white/60">Type:</span>
                  <span
                    v-if="t.type"
                    class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                  >{{ t.type }}</span>
                  <span
                    v-else
                    class="text-xs text-white/40"
                  >N/A</span>
                  <span class="text-xs text-white/60 ml-4">System:</span>
                  <span
                    v-if="t.system"
                    class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                  >{{ t.system }}</span>
                  <span
                    v-else
                    class="text-xs text-white/40"
                  >N/A</span>
                  <span class="text-xs text-white/60 ml-4">Status:</span>
                  <span
                    v-if="t.status"
                    :class="statusBadgeClass(t.status) + ' text-xs px-2 py-0.5 rounded-full'"
                  >{{ t.status }}</span>
                  <span
                    v-else
                    class="text-xs text-white/40"
                  >N/A</span>
                </div>
                <div class="w-full border-t border-dashed border-white/30 my-1" />
                <div class="flex flex-wrap gap-4 text-xs text-white/60 mt-1">
                  <span v-if="spaceName(t.spaceId)"><span class="text-white/80">Location:</span> {{ spaceName(t.spaceId) }}</span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                    <span class="font-semibold">{{ Number((t as any).instancesCount || 0) }}</span>
                    <span>Instances</span>
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                    <span class="font-semibold">{{ countArray((t as any).components) }}</span>
                    <span>Components</span>
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                    <span class="font-semibold">{{ countArray((t as any).checklists) }}</span>
                    <span>Checklists</span>
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                    <span class="font-semibold">{{ countArray((t as any).functionalTests) }}</span>
                    <span>FPT</span>
                  </span>
                </div>
              </div>
            </div>
          </RouterLink>
          <div class="flex flex-col items-end min-w-[160px] justify-end gap-1">
            <div class="flex items-center justify-end gap-2">
              <RouterLink
                :to="{ name: 'template-edit', params: { id: t.id || (t as any)._id } }"
                class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                aria-label="Open"
                :title="'Open ' + (t.title || t.tag)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                ><path
                  d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
                  stroke-width="1.5"
                /><circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke-width="1.5"
                /></svg>
              </RouterLink>
              <button
                class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                aria-label="Duplicate"
                title="Duplicate"
                @click="duplicateTemplate(t)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <rect
                    x="9"
                    y="3"
                    width="12"
                    height="12"
                    rx="2"
                    stroke-width="1.5"
                  />
                  <rect
                    x="3"
                    y="9"
                    width="12"
                    height="12"
                    rx="2"
                    stroke-width="1.5"
                  />
                </svg>
              </button>
              <button
                class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                aria-label="Edit"
                @click="openEdit(t)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                ><path
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                  stroke-width="1.5"
                /><path
                  d="M14.06 6.19l1.77-1.77a1.5 1.5 0 0 1 2.12 0l1.63 1.63a1.5 1.5 0 0 1 0 2.12l-1.77 1.77"
                  stroke-width="1.5"
                /></svg>
              </button>
              <button
                class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
                aria-label="Delete"
                @click="confirmRemove(t)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
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
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="!loading && !Number(displayTotal) && !templates.length && !serverTemplates.length"
          class="p-6 text-white/60 text-center"
        >
          No templates yet.
        </div>
        <div
          v-else-if="!loading && !filtered.length"
          class="p-6 text-white/60 text-center"
        >
          No matching templates.
        </div>
        <div v-if="loading">
          <Spinner />
        </div>
      </div>
      <!-- pagination controls -->
      <div
        v-if="filtered.length"
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

    <Modal
      v-model="modalOpen"
      panel-class="max-w-[640px]"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            {{ editing ? 'Edit Template' : 'Create Template' }}
          </h2>
          <button
            class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20"
            @click="closeModal"
          >
            ✕
          </button>
        </div>
      </template>

      <form @submit.prevent="save">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm text-white/70">Tag</label>
            <input
              v-model="form.tag"
              type="text"
              required
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
            >
          </div>
          <div>
            <label class="text-sm text-white/70">Type</label>
            <select
              v-model="form.type"
              required
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
            >
              <option
                v-for="opt in modalTypeOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.text }}
              </option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="text-sm text-white/70">Title</label>
            <input
              v-model="form.title"
              type="text"
              required
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
            >
          </div>
          <div>
            <label class="text-sm text-white/70">System</label>
            <select
              v-model="form.system"
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
            >
              <option
                v-for="opt in modalSystemOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.text }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-sm text-white/70">Status</label>
            <select
              v-model="form.status"
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
            >
              <option
                v-for="s in statuses"
                :key="s"
                :value="s"
              >
                {{ s }}
              </option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="text-sm text-white/70">Space</label>
            <select
              v-model="form.spaceId"
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
            >
              <option :value="''">
                None
              </option>
              <option
                v-for="p in parentOptions"
                :key="p.id"
                :value="p.id"
              >
                {{ p.title }} ({{ p.type }})
              </option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="text-sm text-white/70">Description</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
            />
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded bg-white/10 border border-white/20 hover:bg-white/20"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-3 py-2 rounded bg-white/20 border border-white/30 hover:bg-white/30"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import SearchPill from '../../components/SearchPill.vue'
import Spinner from '../../components/Spinner.vue'
import Modal from '../../components/Modal.vue'
import http from '../../utils/http'
import { getApiBase } from '../../utils/api'
import { getAuthHeaders } from '../../utils/auth'
import { useProjectStore } from '../../stores/project'
import { useSpacesStore } from '../../stores/spaces'
import { useTemplatesStore, type Template } from '../../stores/templates'
import lists from '../../lists.js'
import { useUiStore } from '../../stores/ui'
import { confirm as inlineConfirm } from '../../utils/confirm'
import { useAuthStore } from '../../stores/auth'
import * as XLSX from 'xlsx'

const projectStore = useProjectStore()
const spacesStore = useSpacesStore()
const templatesStore = useTemplatesStore()
const ui = useUiStore()
const auth = useAuthStore()

const statuses = ['Ordered','Shipped','In Storage','Installed','Tested','Operational','Not Started']

const search = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const systemFilter = ref('')
const modalOpen = ref(false)
const editing = ref(false)
const form = ref<Template>({ tag: '', title: '', type: '', system: '', status: 'Not Started', description: '', projectId: '' })
const exporting = ref(false)
const exportingCsv = ref(false)
const importing = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Custom dropdown menus state and refs
const showTypeMenu = ref(false)
const showSystemMenu = ref(false)
const showStatusMenu = ref(false)
const typeMenuRef = ref<HTMLElement | null>(null)
const systemMenuRef = ref<HTMLElement | null>(null)
const statusMenuRef = ref<HTMLElement | null>(null)

function toggleTypeMenu() { showTypeMenu.value = !showTypeMenu.value }
function closeTypeMenu() { showTypeMenu.value = false }
function toggleSystemMenu() { showSystemMenu.value = !showSystemMenu.value }
function closeSystemMenu() { showSystemMenu.value = false }
function toggleStatusMenu() { showStatusMenu.value = !showStatusMenu.value }
function closeStatusMenu() { showStatusMenu.value = false }

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  const tEl = typeMenuRef.value
  const sEl = systemMenuRef.value
  const stEl = statusMenuRef.value
  if (tEl && !tEl.contains(target)) closeTypeMenu()
  if (sEl && !sEl.contains(target)) closeSystemMenu()
  if (stEl && !stEl.contains(target)) closeStatusMenu()
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

const templates = computed(() => templatesStore.items)
const loading = computed(() => templatesStore.loading)
const serverTemplates = ref<Template[]>([])
const serverTotal = ref(0)
const serverTotalAll = ref(0)
const totalFiltered = computed(() => Number(serverTotal.value || 0) || filtered.value.length)
const serverTypes = ref<string[]>([])
const serverStatuses = ref<string[]>([])
const serverSystems = ref<string[]>([])
const serverTypeCounts = ref<Record<string, number>>({})
const serverStatusCounts = ref<Record<string, number>>({})
const serverSystemCounts = ref<Record<string, number>>({})

const parentMap = computed(() => spacesStore.byId)
function spaceName(spaceId?: string | null) {
  const pid = spaceId ? String(spaceId) : ''
  return pid && parentMap.value[pid] ? parentMap.value[pid].title : ''
}

function countArray(v: any) {
  return Array.isArray(v) ? v.length : 0
}

// Prefer server-provided page when available; otherwise filter the full store list
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const s = statusFilter.value
  const sys = systemFilter.value
  const baseList = (Array.isArray(serverTemplates.value) && serverTemplates.value.length > 0) ? serverTemplates.value : templates.value
  return (baseList || []).filter(e => {
    if (t && e.type !== t) return false
    if (s && e.status !== s) return false
    if (sys && String(e.system || '').toLowerCase() !== String(sys)) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})

const parentOptions = computed(() => spacesStore.items)

/* filterTypeOptions removed — not used in this component */

const modalTypeOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.equipmentTypes || []
  return arr.filter((opt: any) => opt && opt.value).map((opt: any) => ({ value: String(opt.value), text: String(opt.text ?? opt.value) }))
})

const modalSystemOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.systemOptions || []
  return arr
    .filter((opt: any) => opt && (opt.value !== undefined))
    .map((opt: any) => ({ value: opt.value === null ? '' : String(opt.value), text: String(opt.text ?? opt.value) }))
})

const preSystemFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const s = statusFilter.value
  const base = Array.isArray(serverTemplates.value) && serverTemplates.value.length ? serverTemplates.value : templates.value
  return base.filter(e => {
    if (t && e.type !== t) return false
    if (s && e.status !== s) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})

const systemCounts = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  const serverCounts = serverSystemCounts.value || {}
  if (Object.keys(serverCounts).length) {
    for (const [k, v] of Object.entries(serverCounts)) {
      const key = String(k || '').trim()
      if (!key) continue
      m[key] = Number(v) || 0
    }
  }
  if (!Object.keys(m).length && Array.isArray(serverTemplates.value) && serverTemplates.value.length) {
    for (const e of serverTemplates.value as any[]) {
      const key = String((e as any).system || '').trim()
      if (!key) continue
      m[key] = (m[key] || 0) + 1
    }
  }
  if (!Object.keys(m).length) {
    for (const e of preSystemFiltered.value) {
      const key = String(e.system || '').trim()
      if (!key) continue
      m[key] = (m[key] || 0) + 1
    }
  }
  m['All'] = Number(totalFiltered.value || filtered.value.length || 0)
  return m
})

const systemOptions = computed<Array<{ name: string; value: string; count: number }>>(() => {
  const opts: Array<{ name: string; value: string; count: number }> = []
  const mappingArr: Array<any> = (lists as any)?.systemOptions || []
  const labelFor = (valLower: string) => {
    const found = mappingArr.find((o: any) => o && o.value !== undefined && String(o.value).toLowerCase() === valLower)
    return found ? String(found.text ?? found.value) : valLower
  }
  const names = serverSystems.value.length ? serverSystems.value : Object.keys(systemCounts.value).filter(k => k !== 'All')
  for (const name of names) {
    if (!name) continue
    const count = systemCounts.value[name] || 0
    opts.push({ name: labelFor(name), value: String(name).toLowerCase(), count })
  }
  opts.sort((a, b) => a.name.localeCompare(b.name))
  return [{ name: 'All', value: 'All', count: systemCounts.value['All'] || preSystemFiltered.value.length }, ...opts]
})
const systemFilterKey = computed(() => (systemFilter.value ? String(systemFilter.value).toLowerCase() : 'All'))
const systemFilterLabel = computed(() => {
  if (!systemFilter.value) return 'All'
  const val = String(systemFilter.value).toLowerCase()
  const found = (systemOptions.value || []).find(o => o && o.value === val)
  return found ? found.name : systemFilter.value
})
function systemCount(nameOrVal: string) {
  if (nameOrVal === 'All') return systemCounts.value['All'] || preSystemFiltered.value.length
  const val = String(nameOrVal).toLowerCase()
  return systemCounts.value[val] || 0
}

const preTypeFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const sys = systemFilter.value
  const s = statusFilter.value
  const base = Array.isArray(serverTemplates.value) && serverTemplates.value.length ? serverTemplates.value : templates.value
  return base.filter(e => {
    if (sys && String(e.system || '').toLowerCase() !== String(sys)) return false
    if (s && e.status !== s) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})
const typeCounts = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  const serverCounts = serverTypeCounts.value || {}
  if (Object.keys(serverCounts).length) {
    for (const [k, v] of Object.entries(serverCounts)) {
      const key = String(k || '').trim()
      if (!key) continue
      m[key] = Number(v) || 0
    }
  }
  if (!Object.keys(m).length && Array.isArray(serverTemplates.value) && serverTemplates.value.length) {
    for (const e of serverTemplates.value as any[]) {
      const key = String((e as any).type || '').trim()
      if (!key) continue
      m[key] = (m[key] || 0) + 1
    }
  }
  if (!Object.keys(m).length) {
    for (const e of preTypeFiltered.value) {
      const key = String(e.type || '').trim()
      if (!key) continue
      m[key] = (m[key] || 0) + 1
    }
  }
  m['All'] = Number(totalFiltered.value || filtered.value.length || 0)
  return m
})
const typeOptions = computed<Array<{ name: string; count: number }>>(() => {
  const opts: Array<{ name: string; count: number }> = []
  const names = serverTypes.value.length ? serverTypes.value : Object.keys(typeCounts.value).filter(k => k !== 'All')
  for (const name of names) {
    if (!name) continue
    const count = typeCounts.value[name] || 0
    opts.push({ name, count })
  }
  opts.sort((a, b) => a.name.localeCompare(b.name))
  return [{ name: 'All', count: typeCounts.value['All'] || preTypeFiltered.value.length }, ...opts]
})
function typeCount(name: string) {
  const opt = (typeOptions.value || []).find(o => o.name === name)
  return opt ? opt.count : 0
}

const preStatusFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const sys = systemFilter.value
  const base = Array.isArray(serverTemplates.value) && serverTemplates.value.length ? serverTemplates.value : templates.value
  return base.filter(e => {
    if (t && e.type !== t) return false
    if (sys && String(e.system || '').toLowerCase() !== String(sys)) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})
const statusCounts = computed<Record<string, number>>(() => {
  const m: Record<string, number> = {}
  const serverCounts = serverStatusCounts.value || {}
  if (Object.keys(serverCounts).length) {
    for (const [k, v] of Object.entries(serverCounts)) {
      const key = String(k || '').trim()
      if (!key) continue
      m[key] = Number(v) || 0
    }
  }
  if (!Object.keys(m).length && Array.isArray(serverTemplates.value) && serverTemplates.value.length) {
    for (const e of serverTemplates.value as any[]) {
      const key = String((e as any).status || '').trim()
      if (!key) continue
      m[key] = (m[key] || 0) + 1
    }
  }
  if (!Object.keys(m).length) {
    for (const e of preStatusFiltered.value) {
      const key = String(e.status || '').trim()
      if (!key) continue
      m[key] = (m[key] || 0) + 1
    }
  }
  m['All'] = Number(totalFiltered.value || filtered.value.length || 0)
  return m
})
const statusOptions = computed<Array<{ name: string; count: number }>>(() => {
  const opts: Array<{ name: string; count: number }> = []
  const names = serverStatuses.value.length ? serverStatuses.value : Object.keys(statusCounts.value).filter(k => k !== 'All')
  for (const name of names) {
    if (!name) continue
    const count = statusCounts.value[name] || 0
    opts.push({ name, count })
  }
  const order = statuses.slice()
  opts.sort((a, b) => {
    const ia = order.indexOf(a.name)
    const ib = order.indexOf(b.name)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.name.localeCompare(b.name)
  })
  return [{ name: 'All', count: statusCounts.value['All'] || preStatusFiltered.value.length }, ...opts]
})
function statusCount(name: string) {
  const opt = (statusOptions.value || []).find(o => o.name === name)
  return opt ? opt.count : 0
}
function statusDotClass(s: string) {
  const key = String(s || '').toLowerCase()
  if (key === 'ordered') return 'bg-sky-500'
  if (key === 'shipped') return 'bg-indigo-500'
  if (key === 'in storage') return 'bg-amber-500'
  if (key === 'installed') return 'bg-emerald-500'
  if (key === 'tested') return 'bg-cyan-500'
  if (key === 'operational') return 'bg-green-500'
  if (key === 'not started') return 'bg-gray-500'
  return 'bg-white/30'
}
function statusBadgeClass(s: string) {
  if (!s || s === 'All') return 'bg-white/10 text-white/80'
  const key = String(s || '').toLowerCase()
  if (key === 'ordered') return 'bg-sky-500 text-white'
  if (key === 'shipped') return 'bg-indigo-500 text-white'
  if (key === 'in storage') return 'bg-amber-500 text-black'
  if (key === 'installed') return 'bg-emerald-500 text-white'
  if (key === 'tested') return 'bg-cyan-500 text-black'
  if (key === 'operational') return 'bg-green-600 text-white'
  if (key === 'not started') return 'bg-gray-500 text-white'
  return 'bg-white/10 text-white/80'
}

// pagination state
const page = ref(1)
// seed pageSize from user profile preference when available
const pageSize = ref((auth && auth.user && auth.user.contact && typeof auth.user.contact.perPage === 'number') ? auth.user.contact.perPage : 10)
const pageSizes = [10, 20, 50, 100]

// Persist per-page (templates) page size preference for the current session
const pageSizeStorageKey = computed(() => `templatesPageSize:${projectStore.currentProjectId || 'global'}`)
function loadPageSizePref() {
  try {
    const raw = sessionStorage.getItem(pageSizeStorageKey.value)
    if (!raw) {
      try {
        const p = auth && auth.user && auth.user.contact && auth.user.contact.perPage
        const allowed = [10,20,50,100]
        if (typeof p === 'number' && allowed.includes(p)) {
          pageSize.value = p
        }
      } catch (e) { /* ignore */ }
      return
    }
    const n = parseInt(raw, 10)
    if ([10,20,50,100].includes(n)) pageSize.value = n
  } catch (e) { /* ignore sessionStorage read errors */ }
}
function persistPageSizePref() { try { sessionStorage.setItem(pageSizeStorageKey.value, String(pageSize.value)) } catch (e) { /* ignore sessionStorage write errors */ } }
watch(pageSizeStorageKey, () => loadPageSizePref(), { immediate: true })
watch(pageSize, () => persistPageSizePref())
// Sorting state for templates table
const sortKey = ref('')
const sortDir = ref(1) // 1 = asc, -1 = desc

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const arr = [...filtered.value]
  arr.sort((a, b) => {
    let av
    let bv
    if (sortKey.value === 'space') {
      av = String(spaceName(a && a.spaceId) || '').toLowerCase()
      bv = String(spaceName(b && b.spaceId) || '').toLowerCase()
    } else {
      av = String(((a as any)?.[sortKey.value]) || '').toLowerCase()
      bv = String(((b as any)?.[sortKey.value]) || '').toLowerCase()
    }
    if (av < bv) return -1 * sortDir.value
    if (av > bv) return 1 * sortDir.value
    return 0
  })
  return arr
})

function setSort(key: string) {
  if (sortKey.value === key) sortDir.value = -sortDir.value
  else { sortKey.value = key; sortDir.value = 1 }
  page.value = 1
}

// server-side totals and paging
const totalPages = computed(() => Math.max(1, Math.ceil((totalFiltered.value || 0) / pageSize.value)))
const paged = computed(() => {
  const list = sorted.value || []
  const total = Number(serverTotal.value || 0)
  const pageLen = Array.isArray(serverTemplates.value) ? serverTemplates.value.length : 0
  if (total > pageLen) return list
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
})
const displayTotal = computed(() => Number(serverTotalAll.value || serverTotal.value || 0))
const startItem = computed(() => totalFiltered.value ? (page.value - 1) * pageSize.value + 1 : 0)
const endItem = computed(() => Math.min(Number(totalFiltered.value || 0), page.value * pageSize.value))
function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }

function openCreate() {
  editing.value = false
  form.value = { tag: '', title: '', type: '', system: '', status: 'Not Started', description: '', projectId: projectStore.currentProjectId || '' }
  modalOpen.value = true
}

function openEdit(e: Template) {
  editing.value = true
  form.value = { ...e, id: e.id || (e as any)._id }
  modalOpen.value = true
}

function closeModal() { modalOpen.value = false }

async function save() {
  try {
    if (!form.value.title || !form.value.tag || !form.value.type) throw new Error('Tag, Title and Type are required')
    if (!form.value.projectId) form.value.projectId = projectStore.currentProjectId || ''
    if (editing.value && form.value.id) {
      await templatesStore.update(form.value as Template & { id: string })
      ui.showSuccess('Template updated')
    } else {
      await templatesStore.create(form.value as Template)
      ui.showSuccess('Template created')
    }
    modalOpen.value = false
  } catch (e: any) {
    console.error(e)
  }
}

async function confirmRemove(e: Template) {
  if (!e.id) e.id = (e as any)._id
  if (!e.id) return
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({
    title: 'Delete template',
    message: `Delete "${e.title || e.tag || 'this template'}"? This cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!confirmed) return
  await templatesStore.remove(String(e.id))
  ui.showSuccess('Template deleted')
}

watch(() => projectStore.currentProjectId, async (id) => {
  if (!id) return
  // fetch spaces for location lookups
  await spacesStore.fetchByProject(String(id))
  // load paged templates for list view
  page.value = 1
  fetchTemplatesPage(String(id)).catch(() => {})
}, { immediate: true })

async function fetchTemplatesPage(projectId?: string) {
  // Try store fallback when API base is not configured or points to same hostname (avoid dev cross-port 404s)
  try {
    const rawEnvBase = (import.meta as any).env?.VITE_API_BASE
    const apiBase = (rawEnvBase && typeof rawEnvBase === 'string') ? rawEnvBase : getApiBase()
    if (typeof window !== 'undefined' && apiBase) {
      try {
        const apiHostname = (new URL(apiBase)).hostname
        const pageHostname = window.location.hostname
        if (apiHostname === pageHostname || !rawEnvBase) {
          const pid = projectId ?? projectStore.currentProjectId ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') ?? ''
          if (pid) {
            await templatesStore.fetchByProject(String(pid))
            const all = Array.isArray(templatesStore.items) ? templatesStore.items : []
            const filteredByProject = all.filter((t: any) => String(t.projectId || t.project || '') === String(pid))
            serverTemplates.value = filteredByProject.map((t: any) => ({ ...(t || {}), id: t._id || t.id }))
            serverTotal.value = serverTemplates.value.length
            serverTotalAll.value = serverTotal.value
            serverTypes.value = []
            serverTypeCounts.value = {}
            serverStatuses.value = []
            serverStatusCounts.value = {}
            serverSystems.value = []
            serverSystemCounts.value = {}
          } else {
            serverTemplates.value = []
            serverTotal.value = 0
            serverTotalAll.value = 0
          }
          return
        }
      } catch (err) {
        // ignore URL parsing errors and continue
      }
    }
  } catch (e) {
    // ignore env access errors
  }

  try {
    const params: any = { page: page.value, perPage: pageSize.value, includeFacets: true }
    if (projectId) params.projectId = projectId
    if (search.value) params.search = search.value
    if (typeFilter.value) params.type = typeFilter.value
    if (systemFilter.value) params.system = systemFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    if (sortKey.value) { params.sortBy = sortKey.value; params.sortDir = sortDir.value === 1 ? 'asc' : 'desc' }
    const res = await http.get('/api/templates', { params, headers: getAuthHeaders() })
    const data = res && res.data ? res.data : {}
    const normalize = (t: any) => ({ ...(t || {}), id: t?._id || t?.id })
    if (Array.isArray(data.items)) serverTemplates.value = data.items.map(normalize)
    else if (Array.isArray(data)) serverTemplates.value = data.map(normalize)
    else serverTemplates.value = []
    serverTotal.value = Number(data.total ?? data.count ?? serverTemplates.value.length)
    serverTotalAll.value = Number(data.totalAll || serverTotal.value || serverTemplates.value.length)
    // facets
    if (Array.isArray(data.types)) {
      const map: Record<string, number> = {}
      const list: string[] = []
      for (const t of data.types) {
        const name = String((t as any)?.name || (t as any)?._id || t || '').trim()
        const count = Number((t as any)?.count || 0)
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
    if (Array.isArray(data.statuses)) {
      const map: Record<string, number> = {}
      const list: string[] = []
      for (const t of data.statuses) {
        const name = String((t as any)?.name || (t as any)?._id || t || '').trim()
        const count = Number((t as any)?.count || 0)
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
    if (Array.isArray(data.systems)) {
      const map: Record<string, number> = {}
      const list: string[] = []
      for (const t of data.systems) {
        const name = String((t as any)?.name || (t as any)?._id || t || '').trim()
        const count = Number((t as any)?.count || 0)
        if (!name) continue
        list.push(name)
        map[name] = count
      }
      serverSystems.value = list
      serverSystemCounts.value = map
    } else {
      serverSystems.value = []
      serverSystemCounts.value = {}
    }
  } catch (e: any) {
    if (e && e.response && e.response.status === 404) {
      try {
        const pid = projectId ?? (projectStore.currentProjectId || '')
        if (pid) {
          await templatesStore.fetchByProject(String(pid))
          const all = Array.isArray(templatesStore.items) ? templatesStore.items : []
          const filteredByProject = all.filter((t: any) => String(t.projectId || t.project || '') === String(pid))
          serverTemplates.value = filteredByProject.map((t: any) => ({ ...(t || {}), id: t._id || t.id }))
          serverTotal.value = serverTemplates.value.length
          serverTotalAll.value = serverTotal.value
          serverTypes.value = []
          serverTypeCounts.value = {}
          serverStatuses.value = []
          serverStatusCounts.value = {}
          serverSystems.value = []
          serverSystemCounts.value = {}
        } else {
          serverTemplates.value = []
          serverTotal.value = 0
          serverTotalAll.value = 0
        }
      } catch (inner) {
        serverTemplates.value = []
        serverTotal.value = 0
        serverTotalAll.value = 0
      }
    } else {
      serverTemplates.value = []
      serverTotal.value = 0
      serverTotalAll.value = 0
    }
  }
}

// Debounce helper (small local utility)
function debounce(fn: (...args: any[]) => any, wait = 200) {
  let t: any
  return (...args: any[]) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}

const debouncedFetch = debounce(() => { fetchTemplatesPage().catch(() => {}) }, 150)
watch([() => page.value, () => pageSize.value, () => sortKey.value, () => sortDir.value, () => search.value, () => typeFilter.value, () => systemFilter.value, () => statusFilter.value], () => debouncedFetch(), { immediate: false })

watch([sorted, pageSize], () => {
  page.value = 1
})

function nextDuplicateTag(tag: string): string {
  const s = String(tag || '').trim()
  if (!s) return ''
  const m = s.match(/^(.*?)-(\d+)$/)
  const base = m ? m[1] : s
  let n = m ? (isFinite(parseInt(m[2], 10)) ? parseInt(m[2], 10) + 1 : 1) : 1
  const existing = new Set((templates.value || []).map(it => String(it?.tag || '').trim()).filter(Boolean))
  let candidate = `${base}-${n}`
  while (existing.has(candidate)) { n += 1; candidate = `${base}-${n}` }
  return candidate
}

async function duplicateTemplate(e: Template) {
  try {
    const srcId = String(e.id || (e as any)._id || '')
    const projectId = String((e as any).projectId || projectStore.currentProjectId || '')
    if (!projectId || !srcId) { ui.showError('Missing project or item'); return }
    const newTag = nextDuplicateTag(String(e.tag || ''))
    let created: any = null
    const hasStoreDuplicate = typeof (templatesStore as any).duplicate === 'function'
    if (hasStoreDuplicate) {
      created = await (templatesStore as any).duplicate(srcId, { tag: newTag })
    } else {
      let src: any = (templatesStore as any).byId?.[srcId]
      if (!src) src = await templatesStore.fetchOne(srcId)
      if (!src) throw new Error('Source template not found')
      // Avoid creating unused local bindings by shallow-copying and deleting identity fields
      const payloadObj: any = { ...(src as any) }
      delete payloadObj._id
      delete payloadObj.id
      delete payloadObj.number
      delete payloadObj.createdAt
      delete payloadObj.updatedAt
      delete payloadObj.history
      const payload: any = {
        ...payloadObj,
        tag: newTag,
        projectId: src.projectId,
        spaceId: src.spaceId || undefined,
        components: Array.isArray(src.components) ? src.components.map((c: any) => ({ ...c })) : undefined,
        photos: (src as any).photos ? (src as any).photos.map((p: any) => ({ ...p })) : undefined,
        images: Array.isArray(src.images) ? src.images.map((p: any) => ({ ...p })) : undefined,
        attachments: Array.isArray(src.attachments) ? src.attachments.map((a: any) => ({ ...a })) : undefined,
        checklists: (src as any).checklists ? JSON.parse(JSON.stringify((src as any).checklists)) : undefined,
        functionalTests: (src as any).functionalTests ? JSON.parse(JSON.stringify((src as any).functionalTests)) : undefined,
        issues: undefined,
        metadata: src.metadata ? JSON.parse(JSON.stringify(src.metadata)) : undefined,
        attributes: src.attributes ? JSON.parse(JSON.stringify(src.attributes)) : undefined,
      }
      created = await templatesStore.create(payload as Template)
    }
    if (created) ui.showSuccess(`Duplicated as ${created.tag}`)
  } catch (err: any) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to duplicate')
  }
}

// -----------------------
// Import / Export helpers
// -----------------------
async function fetchAllTemplatesForExport(projectId: string) {
  const perPage = 200
  let page = 1
  let total = 0
  const all: any[] = []
  for (;;) {
    const { data } = await http.get('/api/templates', { params: { projectId, page, perPage }, headers: getAuthHeaders() })
    const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
    total = Number(data?.total ?? items.length)
    all.push(...items)
    if (all.length >= total || items.length === 0) break
    page += 1
  }
  // Enrich with full records so components/checklists/functionalTests are included
  const enriched: any[] = []
  for (const t of all) {
    const tid = String((t as any)._id || (t as any).id || '')
    if (!tid) continue
    try {
      const { data } = await http.get(`/api/templates/${tid}`, { headers: getAuthHeaders() })
      enriched.push(data || t)
    } catch (e) {
      enriched.push(t)
    }
  }
  return enriched
}

function normalizeTemplateRow(t: any) {
  return {
    tag: t?.tag || '',
    title: t?.title || '',
    type: t?.type || '',
    system: t?.system || '',
    status: t?.status || '',
    responsible: t?.responsible || '',
    description: t?.description || '',
    components: JSON.stringify(t?.components || []),
    checklists: JSON.stringify(t?.checklists || []),
    functionalTests: JSON.stringify(t?.functionalTests || [])
  }
}

async function downloadTemplatesXlsx() {
  const pid = projectStore.currentProjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') || ''
  if (!pid) { ui.showError('Select a project first'); return }
  if (exporting.value) return
  exporting.value = true
  try {
    const params: any = {
      projectId: String(pid),
      search: search.value || '',
      type: typeFilter.value || '',
      system: systemFilter.value || '',
      status: statusFilter.value || '',
    }

    const res = await http.get('/api/templates/export', {
      params,
      headers: getAuthHeaders(),
      responseType: 'blob'
    })

    const blob = res.data instanceof Blob
      ? res.data
      : new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')

    const safeName = String((projectStore.currentProject as any)?.name || 'project')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_.]/g, '')
      .slice(0, 50) || 'project'
    const today = new Date().toISOString().slice(0, 10)

    a.href = url
    a.download = `${safeName}-templates-${today}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to export templates')
  } finally {
    exporting.value = false
  }
}

async function downloadTemplatesCsv() {
  const pid = projectStore.currentProjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') || ''
  if (!pid) { ui.showError('Select a project first'); return }
  if (exportingCsv.value) return
  exportingCsv.value = true
  try {
    const all = await fetchAllTemplatesForExport(String(pid))
    if (!all.length) { ui.showError('No templates to export'); return }
    const rows = all.map(normalizeTemplateRow)
    const sheet = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'Templates')
    const fname = `templates-${pid}.csv`
    XLSX.writeFile(wb, fname, { bookType: 'csv' })
    ui.showSuccess(`Exported ${rows.length} templates`)
  } catch (e: any) {
    ui.showError(e?.message || 'Failed to export templates')
  } finally {
    exportingCsv.value = false
  }
}

function triggerImport() {
  const pid = projectStore.currentProjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') || ''
  if (!pid) { ui.showError('Select a project first'); return }
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

async function handleImportFile(e: Event) {
  const pid = projectStore.currentProjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') || ''
  if (!pid) { ui.showError('Select a project first'); return }
  const input = e.target as HTMLInputElement
  const file = input?.files && input.files[0]
  if (!file) return
  importing.value = true
  try {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })

    const normalizeHeader = (raw: any) => String(raw || '').trim().toLowerCase().replace(/\s+/g, '')
    const sheetNames = Array.isArray(wb.SheetNames) ? wb.SheetNames : []
    const sheetByLower = new Map<string, string>()
    for (const name of sheetNames) sheetByLower.set(String(name || '').trim().toLowerCase(), name)

    const templatesSheetName = sheetByLower.get('templates')
    const hasMultiSheet = Boolean(templatesSheetName)

    const readSheetRows = (sheetName?: string) => {
      if (!sheetName) return [] as any[]
      const s = wb.Sheets[sheetName]
      if (!s) return [] as any[]
      return XLSX.utils.sheet_to_json(s, { defval: '' }) as any[]
    }

    let created = 0
    let failed = 0

    const parseTagsCsv = (raw?: any): string[] => {
      const s = String(raw ?? '').trim()
      if (!s) return []
      return s.split(',').map((x) => String(x || '').trim()).filter(Boolean)
    }

    const parseArrayField = (raw: any) => {
      if (Array.isArray(raw)) return raw
      if (raw === undefined || raw === null) return []
      const str = String(raw).trim()
      if (!str) return []
      try {
        const parsed = JSON.parse(str)
        return Array.isArray(parsed) ? parsed : []
      } catch (err) {
        return []
      }
    }

    if (hasMultiSheet) {
      const tmplJson = readSheetRows(templatesSheetName)
      const attrsJson = readSheetRows(sheetByLower.get('attributes'))
      const compsJson = readSheetRows(sheetByLower.get('components'))
      const compAttrsJson = readSheetRows(sheetByLower.get('componentattributes'))
      const checklistJson = readSheetRows(
        sheetByLower.get('checklists') ||
        sheetByLower.get('checklist') ||
        sheetByLower.get('checklistquestions') ||
        sheetByLower.get('checklistquestion'),
      )
      const fptJson = readSheetRows(
        sheetByLower.get('functionaltests') ||
        sheetByLower.get('functionaltest'),
      )

      const tagKey = (t: any) => String(t || '').trim().toLowerCase()

      // Attributes -> { tagLower: [{key,value}, ...] }
      const attributesByTag = new Map<string, Array<{ key: string; value: any }>>()
      for (const obj of attrsJson) {
        const m: Record<string, any> = {}
        for (const k of Object.keys(obj || {})) m[normalizeHeader(k)] = (obj as any)[k]
        const t = tagKey(m['templatetag'] || m['tag'])
        const key = String(m['key'] || '').trim()
        const value = m['value']
        if (!t || !key) continue
        const list = attributesByTag.get(t) || []
        list.push({ key, value: value ?? '' })
        attributesByTag.set(t, list)
      }

      // Components + ComponentAttributes
      const componentMetaByTag = new Map<string, Array<any>>()
      const componentAttrsByTag = new Map<string, Map<number, Array<{ key: string; value: any }>>>()

      const parseKvLines = (raw: any) => {
        const s = String(raw ?? '').trim()
        if (!s) return [] as Array<{ key: string; value: any }>
        const lines = s.split(/\r?\n/).map((x) => String(x || '').trim()).filter(Boolean)
        const out: Array<{ key: string; value: any }> = []
        for (const line of lines) {
          const i = line.indexOf(':')
          if (i <= 0) continue
          const key = line.slice(0, i).trim()
          const value = line.slice(i + 1).trim()
          if (!key) continue
          out.push({ key, value })
        }
        return out
      }

      for (const obj of compsJson) {
        const m: Record<string, any> = {}
        for (const k of Object.keys(obj || {})) m[normalizeHeader(k)] = (obj as any)[k]
        const t = tagKey(m['templatetag'] || m['tag'])
        if (!t) continue
        const idx = Number(m['componentindex'] ?? m['index'] ?? '')
        const attrsFromComponentCell = parseKvLines(m['attributes'])
        const comp = {
          __index: Number.isFinite(idx) ? idx : null,
          tag: String(m['componenttag'] || m['tag'] || '').trim(),
          type: String(m['type'] || '').trim(),
          title: String(m['title'] || '').trim(),
          status: String(m['status'] || '').trim(),
          notes: String(m['notes'] || '').trim(),
          __attrs: attrsFromComponentCell,
          attributes: {},
        }
        const list = componentMetaByTag.get(t) || []
        list.push(comp)
        componentMetaByTag.set(t, list)
      }

      for (const obj of compAttrsJson) {
        const m: Record<string, any> = {}
        for (const k of Object.keys(obj || {})) m[normalizeHeader(k)] = (obj as any)[k]
        const t = tagKey(m['templatetag'] || m['tag'])
        const idx = Number(m['componentindex'] ?? m['index'] ?? '')
        const key = String(m['key'] || '').trim()
        const value = m['value']
        if (!t || !Number.isFinite(idx) || !key) continue
        if (!componentAttrsByTag.has(t)) componentAttrsByTag.set(t, new Map())
        const per = componentAttrsByTag.get(t)!
        const list = per.get(idx) || []
        list.push({ key, value: value ?? '' })
        per.set(idx, list)
      }

      const buildComponentsForTag = (tLower: string) => {
        const list = (componentMetaByTag.get(tLower) || []).slice()
        list.sort((a: any, b: any) => {
          const ai = a.__index
          const bi = b.__index
          if (ai === null && bi === null) return 0
          if (ai === null) return 1
          if (bi === null) return -1
          return ai - bi
        })
        const attrsMap = componentAttrsByTag.get(tLower) || new Map()
        return list.map((c: any, ordinal: number) => {
          const idx = (c.__index !== null && Number.isFinite(c.__index)) ? c.__index : ordinal
          const attrsList = ([] as Array<{ key: string; value: any }>).concat(c.__attrs || [], attrsMap.get(idx) || [])
          const attrsObj: Record<string, any> = {}
          for (const it of attrsList) {
            const k = String(it.key || '').trim()
            if (!k) continue
            attrsObj[k] = it.value
          }
          const out: any = { ...c }
          delete out.__index
          delete out.__attrs
          out.attributes = attrsObj
          return out
        })
      }

      // Checklists -> sections/questions
      const checklistRowsByTag = new Map<string, any[]>()
      for (const obj of checklistJson) {
        const m: Record<string, any> = {}
        for (const k of Object.keys(obj || {})) m[normalizeHeader(k)] = (obj as any)[k]
        const t = tagKey(m['templatetag'] || m['tag'])
        if (!t) continue
        const list = checklistRowsByTag.get(t) || []
        list.push(m)
        checklistRowsByTag.set(t, list)
      }

      const toNum = (v: any) => {
        const n = Number(v)
        return Number.isFinite(n) ? n : null
      }

      const parseIds = (raw: any) => {
        const s = String(raw || '').trim()
        if (!s) return []
        return s.split(',').map(x => String(x || '').trim()).filter(Boolean)
      }

      const buildChecklistsForTag = (tLower: string) => {
        const list = checklistRowsByTag.get(tLower) || []
        const sectionMap = new Map<number, any>()
        for (const m of list) {
          const checklistIndex = toNum(m['checklistindex'] ?? m['sectionindex']) ?? 0
          if (!sectionMap.has(checklistIndex)) {
            sectionMap.set(checklistIndex, {
              number: (m['checklistnumber'] ?? m['sectionnumber']) === '' ? null : (toNum(m['checklistnumber'] ?? m['sectionnumber']) ?? (m['checklistnumber'] ?? m['sectionnumber'])),
              title: String(((m['checklisttitle'] ?? m['sectiontitle']) || '')).trim(),
              type: String(((m['checklisttype'] ?? m['sectiontype']) || '')).trim(),
              system: String(((m['checklistsystem'] ?? m['sectionsystem']) || '')).trim(),
              responsible: String(((m['checklistresponsible'] ?? m['sectionresponsible']) || '')).trim(),
              notes: '',
              questions: [],
            })
          }
          const sec = sectionMap.get(checklistIndex)

          const splitPipeRow = (line: string) => String(line || '').split('|').map((x) => String(x ?? '').trim())
          const decodeCell = (v: any) => String(v ?? '').replace(/\\n/g, '\n').replace(/¦/g, '|').trim()
          const parseQuestionsPipeTable = (raw: any) => {
            const s = String(raw ?? '').trim()
            if (!s) return [] as Array<Record<string, string>>
            const lines = s.split(/\r?\n/).map((x) => String(x || '').trim()).filter(Boolean)
            if (!lines.length) return []
            const header = lines[0]
            if (!header.includes('|')) return []
            const headerSegs = splitPipeRow(header)
            const first = (headerSegs[0] || '').trim().toLowerCase()
            if (!(first === '#' || first === 'no' || first === 'no.' || first === 'row' || first === 'index')) return []

            const headerCols = headerSegs.slice(1).map((h, idx) => {
              const rawHeader = decodeCell(h)
              const m = rawHeader.match(/^(.*)\[([^\]]+)\]\s*$/)
              const name = (m ? String(m[1] || '').trim() : rawHeader.trim())
              const key = (m ? String(m[2] || '').trim() : '')
              let derivedKey = key
              if (!derivedKey) {
                derivedKey = String(name || `col_${idx + 1}`)
                  .trim()
                  .toLowerCase()
                  .replace(/\s+/g, '_')
                  .replace(/[^a-z0-9_]/g, '')
                if (!derivedKey) derivedKey = `col_${idx + 1}`
              }
              return { key: derivedKey, name: name || derivedKey, columnIndex: idx }
            }).filter((c) => c.key)

            const out: Array<Record<string, string>> = []
            for (let li = 1; li < lines.length; li++) {
              const segs = splitPipeRow(lines[li])
              if (!segs.length) continue
              const obj: Record<string, string> = {}
              for (let ci = 0; ci < headerCols.length; ci++) {
                const col = headerCols[ci]
                obj[col.key] = decodeCell(segs[ci + 1] ?? '')
              }
              out.push(obj)
            }
            return out
          }

          // New consolidated format: one row per checklist with a pipe-table in Questions.
          if (Object.prototype.hasOwnProperty.call(m, 'questions') && String(m['questions'] ?? '').trim()) {
            const qrows = parseQuestionsPipeTable(m['questions'])
            for (const qr of qrows) {
              const qText = String(qr['question_text'] ?? qr['question'] ?? qr['questiontext'] ?? '').trim()
              const qNumRaw = (qr['number'] ?? qr['questionnumber'] ?? '')
              const qNumText = String(qNumRaw ?? '').trim()
              const answerText = String(qr['answer'] ?? '').trim()
              const notesText = String(qr['notes'] ?? '').trim()
              const cxText = String(qr['cx_answer'] ?? qr['cxanswer'] ?? '').trim()
              const oprText = String(qr['opritemids'] ?? qr['opr_item_ids'] ?? qr['opritemids'] ?? '').trim()
              if (!qText && !qNumText && !answerText && !notesText && !cxText && !oprText) continue
              sec.questions.push({
                __index: sec.questions.length,
                number: qNumText === '' ? null : (toNum(qNumText) ?? qNumText),
                question_text: qText,
                answer: answerText || null,
                notes: notesText || null,
                cx_answer: cxText || null,
                oprItemIds: parseIds(oprText),
              })
            }
            continue
          }

          // Old format: one row per question.
          const qText = String(m['questiontext'] || '').trim()
          const qNumVal = (m['questionnumber'] ?? '')
          const qNumText = String(qNumVal ?? '').trim()
          const ansText = String(m['answer'] || '').trim()
          const notesText = String(m['notes'] || '').trim()
          const cxText = String(m['cx_answer'] || '').trim()
          const oprText = String(m['opritemids'] || '').trim()
          const qIndex = toNum(m['questionindex'])
          const hasQuestionData = (
            qText || qNumText || ansText || notesText || cxText || oprText ||
            qIndex !== null || Object.prototype.hasOwnProperty.call(m, 'questionindex')
          )
          if (!hasQuestionData) continue
          sec.questions.push({
            __index: qIndex ?? (sec.questions.length),
            number: qNumText === '' ? null : (toNum(qNumText) ?? qNumVal),
            question_text: qText,
            answer: ansText || null,
            notes: notesText || null,
            cx_answer: cxText || null,
            oprItemIds: parseIds(oprText),
          })
        }
        return Array.from(sectionMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([, sec]) => {
            sec.questions = (sec.questions || []).slice()
              .sort((a: any, b: any) => (a.__index ?? 0) - (b.__index ?? 0))
              .map((q: any) => {
                const out = { ...q }
                delete out.__index
                return out
              })
            return sec
          })
      }

      // FunctionalTests (consolidated sheet with inline steps + results)
      const fptByTag = new Map<string, Map<number, any>>()
      const ensureFpt = (tLower: string, idx: number) => {
        if (!fptByTag.has(tLower)) fptByTag.set(tLower, new Map())
        const m = fptByTag.get(tLower)!
        if (!m.has(idx)) m.set(idx, { __index: idx, rows: [], table: { columns: [], rows: [] } })
        return m.get(idx)!
      }

      const parseResultLines = (raw: any) => {
        const s = String(raw ?? '').trim()
        if (!s) return [] as any[]
        const lines = s.split(/\r?\n/).map((x) => String(x || '').trim()).filter(Boolean)
        const out: Array<{ rowIndex: number | null; columnIndex: number | null; columnKey: string; columnName: string; value: string }> = []
        const toKey = (k: string) => String(k || '').trim().toLowerCase()

        const splitPipeRow = (line: string) => String(line || '').split('|').map((x) => String(x ?? '').trim())
        const decodeCell = (v: any) => String(v ?? '').replace(/\\n/g, '\n').replace(/¦/g, '|').trim()

        // New format (export):
        //   # | Column Name [columnKey] | Another [anotherKey]
        //   1 | value | value
        //   2 | ...
        const looksLikePipeTable = (() => {
          if (!lines.length) return false
          const header = lines[0]
          if (!header.includes('|')) return false
          if (/\brow\s*index\s*:/i.test(header) || /\browindex\s*:/i.test(header) || /\bcolumn\s*key\s*:/i.test(header) || /\bcolumnkey\s*:/i.test(header) || /\bvalue\s*:/i.test(header)) return false
          const segs = splitPipeRow(header)
          const first = (segs[0] || '').toLowerCase()
          return (first === '#' || first === 'no' || first === 'no.' || first === 'row' || first === 'index') && segs.length >= 2
        })()

        if (looksLikePipeTable) {
          const headerSegs = splitPipeRow(lines[0])
          const headerCols = headerSegs.slice(1).map((h, idx) => {
            const rawHeader = decodeCell(h)
            const m = rawHeader.match(/^(.*)\[([^\]]+)\]\s*$/)
            const name = (m ? String(m[1] || '').trim() : rawHeader.trim())
            const key = (m ? String(m[2] || '').trim() : '')

            let derivedKey = key
            if (!derivedKey) {
              derivedKey = String(name || `col_${idx + 1}`)
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '_')
                .replace(/[^a-z0-9_]/g, '')
              if (!derivedKey) derivedKey = `col_${idx + 1}`
            }

            return { columnIndex: idx, columnKey: derivedKey, columnName: name || derivedKey }
          }).filter((c) => c.columnKey)

          for (let li = 1; li < lines.length; li++) {
            const segs = splitPipeRow(lines[li])
            if (!segs.length) continue
            const rowNo = toNum(segs[0])
            const rowIndex = (rowNo !== null && rowNo > 0) ? (rowNo - 1) : (li - 1)
            for (let ci = 0; ci < headerCols.length; ci++) {
              const col = headerCols[ci]
              const rawVal = segs[ci + 1] ?? ''
              out.push({
                rowIndex,
                columnIndex: col.columnIndex,
                columnKey: col.columnKey,
                columnName: col.columnName,
                value: decodeCell(rawVal),
              })
            }
          }
          return out
        }

        for (const line of lines) {
          const segs = line.includes('|')
            ? line.split('|')
            : (line.includes(';') ? line.split(';') : line.split(','))
          const kv: Record<string, string> = {}
          for (const seg of segs) {
            const part = String(seg || '').trim()
            if (!part) continue
            const i = part.indexOf(':')
            if (i <= 0) continue
            const k = toKey(part.slice(0, i))
            const v = part.slice(i + 1).trim()
            if (!k) continue
            kv[k] = v
          }
          const rowIndex = toNum(kv['rowindex'])
          const columnIndex = toNum(kv['columnindex'])
          const columnKey = String(kv['columnkey'] || '').trim()
          if (!columnKey) continue
          const columnName = String(kv['columnname'] || '').replace(/¦/g, '|').trim()
          const value = String(kv['value'] ?? '').replace(/\\n/g, '\n').replace(/¦/g, '|').trim()
          out.push({ rowIndex, columnIndex, columnKey, columnName, value })
        }
        return out
      }

      for (const obj of fptJson) {
        const m: Record<string, any> = {}
        for (const k of Object.keys(obj || {})) m[normalizeHeader(k)] = (obj as any)[k]
        const t = tagKey(m['templatetag'] || m['tag'])
        const idx = toNum(m['functionaltestindex'] ?? m['testindex'])
        if (!t || idx === null) continue
        const tdoc = ensureFpt(t, idx)
        const nraw = (m['functionaltestnumber'] ?? m['testnumber'])
        tdoc.number = nraw === '' ? null : (toNum(nraw) ?? nraw)
        tdoc.name = String(m['name'] || '').trim()
        const pass = String(m['pass'] || '').trim().toLowerCase()
        tdoc.pass = pass === 'pass' ? true : (pass === 'fail' ? false : null)
        tdoc.notes = String(m['notes'] || '').trim()
        tdoc.description = String(m['description'] || '').trim()
        tdoc.oprItemIds = parseIds(m['opritemids'])

        const hasInlineSteps = (
          Object.prototype.hasOwnProperty.call(m, 'stepindex') ||
          Object.prototype.hasOwnProperty.call(m, 'step') ||
          Object.prototype.hasOwnProperty.call(m, 'expected') ||
          Object.prototype.hasOwnProperty.call(m, 'actual')
        )
        if (hasInlineSteps) {
          const stepIndex = toNum(m['stepindex'])
          const step = String(m['step'] || '').trim()
          const expected = String(m['expected'] || '').trim()
          const actual = String(m['actual'] || '').trim()
          if (stepIndex !== null || step || expected || actual) {
            tdoc.rows.push({
              __index: stepIndex ?? tdoc.rows.length,
              step,
              expected,
              actual,
            })
          }
        }

        if (Object.prototype.hasOwnProperty.call(m, 'results')) {
          const cells = parseResultLines(m['results'])
          if (cells.length) {
            if (!tdoc.table || typeof tdoc.table !== 'object') tdoc.table = { columns: [], rows: [] }
            if (!Array.isArray(tdoc.table.columns)) tdoc.table.columns = []
            if (!Array.isArray(tdoc.table.rows)) tdoc.table.rows = []
            for (const cell of cells) {
              const rowIndex = cell.rowIndex
              const colKey = String(cell.columnKey || '').trim()
              if (rowIndex === null || !colKey) continue
              const existing = (tdoc.table.columns || []).find((c: any) => String(c?.key || '') === colKey)
              if (!existing) {
                tdoc.table.columns.push({ __index: cell.columnIndex ?? tdoc.table.columns.length, key: colKey, name: cell.columnName || '' })
              } else {
                if (!existing.name && cell.columnName) existing.name = cell.columnName
                if (existing.__index === undefined && cell.columnIndex !== null) existing.__index = cell.columnIndex
              }
              while ((tdoc.table.rows || []).length <= rowIndex) tdoc.table.rows.push({})
              tdoc.table.rows[rowIndex][colKey] = cell.value
            }
          }
        }
      }

      const buildFptsForTag = (tLower: string) => {
        const m = fptByTag.get(tLower)
        if (!m) return []
        const tests = Array.from(m.values()).sort((a: any, b: any) => (a.__index ?? 0) - (b.__index ?? 0))
        return tests.map((t: any) => {
          if (Array.isArray(t.rows)) {
            t.rows = t.rows.slice().sort((a: any, b: any) => (a.__index ?? 0) - (b.__index ?? 0)).map((x: any) => {
              const out = { ...x }
              delete out.__index
              return out
            })
          }
          if (t.table && Array.isArray(t.table.columns)) {
            t.table.columns = t.table.columns.slice().sort((a: any, b: any) => (a.__index ?? 0) - (b.__index ?? 0)).map((x: any) => {
              const out = { ...x }
              delete out.__index
              return out
            })
          }
          delete t.__index
          const hasCols = Array.isArray(t.table?.columns) && t.table.columns.length
          const hasRows = Array.isArray(t.table?.rows) && t.table.rows.length
          if (!hasCols && !hasRows) delete t.table
          if (!Array.isArray(t.rows) || t.rows.length === 0) delete t.rows
          return t
        })
      }

      if (!tmplJson.length) { ui.showError('No rows found in Templates sheet'); return }

      for (const obj of tmplJson) {
        const m: Record<string, any> = {}
        for (const k of Object.keys(obj || {})) m[normalizeHeader(k)] = (obj as any)[k]
        const tag = String(m['tag'] || '').trim()
        const title = String(m['title'] || '').trim()
        if (!tag || !title) continue
        const tLower = tagKey(tag)

        const payload: any = {
          tag,
          title,
          type: String(m['type'] || '').trim(),
          system: String(m['system'] || '').trim(),
          status: String(m['status'] || '').trim() || 'Not Started',
          spaceId: String(m['spaceid'] || '').trim() || undefined,
          responsible: String(m['responsible'] || '').trim(),
          description: String(m['description'] || '').trim(),
          template: String(m['template'] || '').trim() || undefined,
          orderDate: String(m['orderdate'] || '').trim() || undefined,
          installationDate: String(m['installationdate'] || '').trim() || undefined,
          balanceDate: String(m['balancedate'] || '').trim() || undefined,
          testDate: String(m['testdate'] || '').trim() || undefined,
          tags: parseTagsCsv(m['tags']),
          attributes: attributesByTag.get(tLower) || [],
          components: componentMetaByTag.has(tLower) ? buildComponentsForTag(tLower) : [],
          checklists: checklistRowsByTag.has(tLower) ? buildChecklistsForTag(tLower) : [],
          functionalTests: fptByTag.has(tLower) ? buildFptsForTag(tLower) : [],
          projectId: pid,
          project: pid,
        }

        try {
          await templatesStore.create(payload as Template)
          created += 1
        } catch (err: any) {
          failed += 1
          console.error('Import row failed', err)
        }
      }
    } else {
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      if (!rows.length) { ui.showError('No rows found in file'); return }

      for (const r of rows) {
        const get = (keys: string[]) => {
          for (const k of keys) {
            if (r[k] !== undefined && r[k] !== null && String(r[k]).trim() !== '') return String(r[k]).trim()
            if (r[k.toLowerCase()] !== undefined && r[k.toLowerCase()] !== null && String(r[k.toLowerCase()]).trim() !== '') return String(r[k.toLowerCase()]).trim()
          }
          return ''
        }
        const tag = get(['tag', 'Tag'])
        const title = get(['title', 'Title'])
        if (!tag || !title) continue
        const payload: any = {
          tag,
          title,
          type: get(['type', 'Type']),
          system: get(['system', 'System']),
          status: get(['status', 'Status']) || 'Not Started',
          responsible: get(['responsible', 'Responsible']),
          description: get(['description', 'Description']),
          tags: parseTagsCsv(r.tags ?? r.Tags),
          attributes: parseArrayField(r.attributes ?? r.Attributes),
          components: parseArrayField(r.components ?? r.Components),
          checklists: parseArrayField(r.checklists ?? r.Checklists),
          functionalTests: parseArrayField(r.functionalTests ?? r.FunctionalTests),
          projectId: pid,
          project: pid
        }
        try {
          await templatesStore.create(payload as Template)
          created += 1
        } catch (err: any) {
          failed += 1
          console.error('Import row failed', err)
        }
      }
    }

    if (failed) ui.showSuccess(`Imported ${created} templates (${failed} failed)`)
    else ui.showSuccess(`Imported ${created} templates`)
    // Refresh list
    fetchTemplatesPage(String(pid)).catch(() => {})
  } catch (err: any) {
    ui.showError(err?.message || 'Failed to import templates')
  } finally {
    importing.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}
</script>
