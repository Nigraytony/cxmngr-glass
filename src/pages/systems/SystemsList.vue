<template>
  <section class="space-y-6 relative w-full min-w-0">
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Systems', to: '/systems' }
        ]"
        title="Systems"
      >
        <template #middle>
          <SearchPill
            v-model="search"
            placeholder="Search by name, tag, or type"
          />
        </template>
      </BreadCrumbs>
    </div>

    <!-- toolbar (matches IssuesList/EquipmentList styling) -->
    <div class="rounded-2xl p-3 bg-white/6 backdrop-blur-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 gap-y-2 w-full max-w-full min-w-0 relative z-30">
      <div class="flex items-center gap-3 min-w-0 flex-wrap">
        <div class="relative inline-block group shrink-0">
          <button
            :disabled="!projectStore.currentProjectId"
            aria-label="Add system"
            :title="projectStore.currentProjectId ? 'Add system' : 'Select a project first'"
            class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
            @click="openCreate"
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
            {{ projectStore.currentProjectId ? 'Add system' : 'Select a project to add systems' }}
          </div>
        </div>

        <!-- Lightweight filters -->
        <div class="hidden md:flex items-center gap-3 gap-y-2 flex-wrap">
          <!-- Type filter -->
          <div class="flex items-center gap-2">
            <label class="text-white/70 text-sm">Type</label>
            <div
              ref="typeMenuRef"
              class="relative"
            >
              <button
                :aria-expanded="showTypeMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[9rem] justify-between"
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

          <!-- Parent/Hierarchy filter -->
          <div class="flex items-center gap-2">
            <label class="text-white/70 text-sm">Hierarchy</label>
            <div
              ref="parentMenuRef"
              class="relative"
            >
              <button
                :aria-expanded="showParentMenu ? 'true' : 'false'"
                class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 min-w-[10rem] justify-between"
                @click="toggleParentMenu"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ parentFilter }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ parentCount(parentFilter) }}</span>
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
                v-if="showParentMenu"
                class="absolute left-0 mt-2 w-56 rounded-xl bg-slate-950 border border-white/10 shadow-lg ring-1 ring-white/10 z-50"
                role="menu"
              >
                <div class="py-1">
                  <button
                    v-for="opt in parentOptions"
                    :key="opt.name"
                    role="menuitem"
                    :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', parentFilter === opt.name ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
                    @click="parentFilter = opt.name; closeParentMenu()"
                  >
                    <span>{{ opt.name }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{{ opt.count }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-sm text-white/70">
          <span v-if="systemsStore.loading">Loading…</span>
          <span v-else>{{ filtered.length }} systems</span>
        </div>
        <button
          v-if="projectStore.currentProjectId"
          type="button"
          class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
          :disabled="systemsStore.loading || filtered.length===0"
          :title="filtered.length ? 'Download filtered systems as XLSX' : 'No systems to export'"
          @click="downloadSystemsXlsx"
        >
          Download XLSX
        </button>
        <button
          v-if="projectStore.currentProjectId"
          type="button"
          class="px-3 py-1.5 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10"
          :disabled="systemsStore.loading"
          @click="refresh"
        >
          Refresh
        </button>
      </div>
    </div>

    <div
      v-if="systemsStore.errorCode"
      class="rounded-md border border-white/20 bg-red-500/20 text-red-100 px-3 py-2 text-sm inline-flex items-center gap-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.5a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zm.75 8a1 1 0 100-2 1 1 0 000 2z"
          clip-rule="evenodd"
        />
      </svg>
      <span v-if="systemsStore.errorCode === 'PROJECT_NOT_FOUND'">Selected project not found. Please reselect a project.</span>
      <span v-else-if="systemsStore.errorCode === 'FEATURE_NOT_IN_PLAN'">Systems are not available on your current subscription plan.</span>
      <span v-else>{{ systemsStore.error || 'Unable to load systems.' }}</span>
    </div>

    <div
      v-if="systemsStore.loading"
      class="rounded-2xl p-6 bg-white/6 backdrop-blur-xl border border-white/10 min-w-0 flex flex-col items-center justify-center text-white/70"
    >
      <Spinner />
      <p class="mt-3 text-sm uppercase tracking-wide">
        Loading systems…
      </p>
    </div>
    <div
      v-else
      class="rounded-2xl p-4 bg-white/6 backdrop-blur-xl border border-white/10 min-w-0"
    >
      <template v-if="!projectStore.currentProjectId">
        <div class="p-6 text-center text-white/80">
          <div class="text-lg font-semibold">
            No project selected
          </div>
          <div class="mt-2 text-sm">
            Select a project from the user menu or Projects page to view its systems.
          </div>
        </div>
      </template>
      <template v-else>
        <div class="flex flex-col gap-3">
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
                  v-if="sortKey==='tag' && sortDir===1"
                  class="text-xs"
                >▲</span>
                <span
                  v-else-if="sortKey==='tag' && sortDir===-1"
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
                @click="setSort('parent')"
              >
                <span>Parent</span>
                <span
                  v-if="sortKey==='parent' && sortDir===1"
                  class="text-xs"
                >▲</span>
                <span
                  v-else-if="sortKey==='parent' && sortDir===-1"
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
                @click="setSort('updated')"
              >
                <span>Updated</span>
                <span
                  v-if="sortKey==='updated' && sortDir===1"
                  class="text-xs"
                >▲</span>
                <span
                  v-else-if="sortKey==='updated' && sortDir===-1"
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
            v-for="s in paged"
            :key="s.id || s._id"
            class="rounded-xl bg-white/10 border border-white/10 p-2 flex flex-col md:flex-row md:items-center gap-2 shadow-sm"
          >
            <RouterLink
              :to="systemEditTo(s)"
              class="flex-1 min-w-0"
              tabindex="0"
              style="text-decoration: none;"
            >
              <div class="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div class="flex flex-col min-w-[70px] items-start">
                  <div class="text-xs text-white/60">
                    Tag
                  </div>
                  <div class="text-lg font-bold text-white font-mono">
                    {{ s.tag || '-' }}
                  </div>
                </div>

                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-xs text-white/60">Name:</span>
                    <span class="text-base font-semibold text-white truncate">{{ s.name || '—' }}</span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-xs text-white/60">Type:</span>
                    <span
                      v-if="s.type"
                      class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                    >{{ s.type }}</span>
                    <span
                      v-else
                      class="text-xs text-white/40"
                    >N/A</span>

                    <span class="text-xs text-white/60 ml-4">Parent:</span>
                    <span
                      v-if="parentName(s.parentSystem) !== '—'"
                      class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80"
                    >{{ parentName(s.parentSystem) }}</span>
                    <span
                      v-else
                      class="text-xs text-white/40"
                    >N/A</span>

                    <span class="text-xs text-white/60 ml-4">Updated:</span>
                    <span class="text-xs text-white/70">{{ formatTs(s.updatedAt || s.createdAt) }}</span>
                  </div>

                  <div class="w-full border-t border-dashed border-white/30 my-1" />

                  <div
                    v-if="s.description"
                    class="text-sm text-white/70 line-clamp-2"
                  >
                    {{ s.description }}
                  </div>
                  <div
                    v-else
                    class="text-sm text-white/40"
                  >
                    No description
                  </div>
                </div>
              </div>
            </RouterLink>

            <div class="flex flex-col items-end min-w-[56px] justify-end gap-1">
              <div class="flex items-center justify-end gap-2">
                <RouterLink
                  :to="systemEditTo(s)"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                  aria-label="Open"
                  title="Open"
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

                <RouterLink
                  :to="systemEditTo(s, 'Checklists')"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                  aria-label="Checklists"
                  title="Checklists"
                >
                  <svg
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
                </RouterLink>

                <RouterLink
                  :to="systemEditTo(s, 'FPT')"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                  aria-label="FPT"
                  title="FPT"
                >
                  <svg
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
                </RouterLink>

                <RouterLink
                  :to="systemEditTo(s, 'Issues')"
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                  aria-label="Issues"
                  title="Issues"
                >
                  <svg
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
                </RouterLink>

                <button
                  class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
                  aria-label="Edit"
                  title="Edit"
                  @click="openEditModal(s)"
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
                  title="Delete"
                  @click="confirmRemove(s)"
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
            v-if="!systemsStore.items.length"
            class="py-10 text-center text-white/60"
          >
            No systems yet.
          </div>
          <div
            v-else-if="!filtered.length"
            class="py-10 text-center text-white/60"
          >
            No matching systems.
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
              @change="persistPageSizePref"
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
      </template>
    </div>

    <!-- Create modal -->
    <Modal
      v-model="showCreateModal"
      panel-class="max-w-xl"
    >
      <template #header>
        <h3 class="text-lg font-semibold text-white">
          {{ createMode === 'edit' ? 'Edit System' : 'New System' }}
        </h3>
        <div class="text-xs text-white/60">
          Project: <span class="text-white/80">{{ projectStore.currentProject?.name || projectStore.currentProjectId || '—' }}</span>
        </div>
      </template>

      <form
        class="space-y-4"
        @submit.prevent="submitCreate"
      >
        <div
          v-if="createError"
          class="rounded-md border border-white/20 bg-red-500/20 text-red-100 px-3 py-2 text-sm"
        >
          {{ createError }}
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-white/80 mb-1">Name</label>
            <input
              v-model="createForm.name"
              class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              placeholder="e.g., HVAC"
              autocomplete="off"
            >
          </div>
          <div>
            <label class="block text-sm text-white/80 mb-1">Tag</label>
            <input
              v-model="createForm.tag"
              class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              placeholder="e.g., SYS-HVAC"
              autocomplete="off"
            >
          </div>
          <div>
            <label class="block text-sm text-white/80 mb-1">Type</label>
            <input
              v-model="createForm.type"
              list="system-type-suggestions"
              class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              placeholder="e.g., Mechanical"
              autocomplete="off"
            >
            <datalist id="system-type-suggestions">
              <option
                v-for="t in createTypeSuggestions"
                :key="t"
                :value="t"
              />
            </datalist>
          </div>
          <div>
            <label class="block text-sm text-white/80 mb-1">Parent System</label>
            <select
              v-model="createForm.parentSystem"
              class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
            >
              <option value="">
                — none —
              </option>
              <option
                v-for="opt in createParentOptions"
                :key="opt.id"
                :value="opt.id"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm text-white/80 mb-1">Description</label>
          <textarea
            v-model="createForm.description"
            rows="4"
            class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
            placeholder="Optional notes"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex gap-2">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            :disabled="createSaving"
            @click="showCreateModal = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/25 text-emerald-50 border border-emerald-500/30"
            :disabled="createSaving || !canSubmitCreate"
            @click="submitCreate"
          >
            {{ createSaving ? (createMode === 'edit' ? 'Saving…' : 'Creating…') : (createMode === 'edit' ? 'Save' : 'Create') }}
          </button>
        </div>
      </template>
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
// Navigation uses <RouterLink> directly
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Modal from '../../components/Modal.vue'
import SearchPill from '../../components/SearchPill.vue'
import Spinner from '../../components/Spinner.vue'
import { useEquipmentStore } from '../../stores/equipment'
import { useOprStore } from '../../stores/opr'
import { useProjectStore } from '../../stores/project'
import { useUiStore } from '../../stores/ui'
import { useSystemsStore, type SystemRecord } from '../../stores/systems'
import { confirm as inlineConfirm } from '../../utils/confirm'

const projectStore = useProjectStore()
const systemsStore = useSystemsStore()
const equipmentStore = useEquipmentStore()
const oprStore = useOprStore()
const ui = useUiStore()

const search = ref('')

// Toolbar filters
const typeFilter = ref('All')
const parentFilter = ref('All')
const showTypeMenu = ref(false)
const showParentMenu = ref(false)
const typeMenuRef = ref<HTMLElement | null>(null)
const parentMenuRef = ref<HTMLElement | null>(null)

function closeTypeMenu() { showTypeMenu.value = false }
function closeParentMenu() { showParentMenu.value = false }
function toggleTypeMenu() {
  showTypeMenu.value = !showTypeMenu.value
  if (showTypeMenu.value) showParentMenu.value = false
}
function toggleParentMenu() {
  showParentMenu.value = !showParentMenu.value
  if (showParentMenu.value) showTypeMenu.value = false
}

function onDocClick(e: MouseEvent) {
  const el = e.target as any
  try {
    if (showTypeMenu.value && typeMenuRef.value && !typeMenuRef.value.contains(el)) closeTypeMenu()
    if (showParentMenu.value && parentMenuRef.value && !parentMenuRef.value.contains(el)) closeParentMenu()
  } catch {
    closeTypeMenu()
    closeParentMenu()
  }
}

function formatTs(ts?: string) {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  } catch {
    return '—'
  }
}

function parentName(parentId?: string | null) {
  if (!parentId) return '—'
  const p = systemsStore.byId[String(parentId)]
  return p?.name || p?.tag || '—'
}

const filtered = computed(() => {
  const q = String(search.value || '').trim().toLowerCase()
  const list = Array.isArray(systemsStore.items) ? systemsStore.items : []
  let out = list

  // Apply filters first
  const tf = String(typeFilter.value || 'All')
  if (tf && tf !== 'All') {
    out = out.filter((s: any) => String(s?.type || '').trim() === tf)
  }

  const pf = String(parentFilter.value || 'All')
  if (pf === 'Top-level') {
    out = out.filter((s: any) => !s?.parentSystem)
  } else if (pf === 'Has parent') {
    out = out.filter((s: any) => Boolean(s?.parentSystem))
  }

  // Search
  if (!q) return out
  return out.filter((s: any) => {
    const name = String(s?.name || '').toLowerCase()
    const tag = String(s?.tag || '').toLowerCase()
    const type = String(s?.type || '').toLowerCase()
    return name.includes(q) || tag.includes(q) || type.includes(q)
  })
})

// Sort + pagination (mirrors EquipmentList patterns)
const sortKey = ref<'tag' | 'name' | 'type' | 'parent' | 'updated'>('tag')
const sortDir = ref<1 | -1>(1)

const page = ref(1)
const pageSizes = [10, 20, 50, 100]
const pageSizeStorageKey = computed(() => `systemsPageSize:${projectStore.currentProjectId || 'global'}`)
const pageSize = ref(20)

function loadPageSizePref() {
  try {
    const raw = sessionStorage.getItem(pageSizeStorageKey.value)
    const n = raw ? Number(raw) : NaN
    if ([10, 20, 50, 100].includes(n)) pageSize.value = n
  } catch { /* ignore */ }
}

function persistPageSizePref() {
  try { sessionStorage.setItem(pageSizeStorageKey.value, String(pageSize.value)) } catch { /* ignore */ }
}

function parentSortLabel(s: any) {
  const pid = String(s?.parentSystem || '')
  if (!pid) return ''
  const p = systemsStore.byId[pid]
  return String(p?.name || p?.tag || '').trim()
}

function updatedSortValue(s: any) {
  const ts = s?.updatedAt || s?.createdAt
  const t = ts ? new Date(ts).getTime() : 0
  return Number.isFinite(t) ? t : 0
}

const sorted = computed(() => {
  const list = Array.isArray(filtered.value) ? [...filtered.value] : []
  const key = sortKey.value
  const dir = sortDir.value
  list.sort((a: any, b: any) => {
    if (key === 'updated') {
      return (updatedSortValue(a) - updatedSortValue(b)) * dir
    }
    let av = ''
    let bv = ''
    if (key === 'tag') {
      av = String(a?.tag || '').toLowerCase()
      bv = String(b?.tag || '').toLowerCase()
    } else if (key === 'name') {
      av = String(a?.name || '').toLowerCase()
      bv = String(b?.name || '').toLowerCase()
    } else if (key === 'type') {
      av = String(a?.type || '').toLowerCase()
      bv = String(b?.type || '').toLowerCase()
    } else if (key === 'parent') {
      av = parentSortLabel(a).toLowerCase()
      bv = parentSortLabel(b).toLowerCase()
    }
    if (av < bv) return -1 * dir
    if (av > bv) return 1 * dir
    // deterministic fallback
    const aid = String(a?.id || a?._id || '')
    const bid = String(b?.id || b?._id || '')
    return aid.localeCompare(bid)
  })
  return list
})

const displayTotal = computed(() => sorted.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil((displayTotal.value || 0) / pageSize.value)))

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sorted.value.slice(start, end)
})

const startItem = computed(() => displayTotal.value ? (page.value - 1) * pageSize.value + 1 : 0)
const endItem = computed(() => Math.min(displayTotal.value, page.value * pageSize.value))

function prevPage() {
  page.value = Math.max(1, page.value - 1)
}

function nextPage() {
  page.value = Math.min(totalPages.value, page.value + 1)
}

function setSort(k: 'tag' | 'name' | 'type' | 'parent' | 'updated') {
  if (sortKey.value === k) sortDir.value = (sortDir.value === 1 ? -1 : 1)
  else { sortKey.value = k; sortDir.value = 1 }
  page.value = 1
}

const typeOptions = computed(() => {
  const list = Array.isArray(systemsStore.items) ? systemsStore.items : []
  const counts: Record<string, number> = {}
  for (const s of list) {
    const t = String((s as any)?.type || '').trim()
    if (!t) continue
    counts[t] = (counts[t] || 0) + 1
  }
  const opts = [{ name: 'All', count: list.length }]
  const types = Object.keys(counts).sort((a, b) => a.localeCompare(b))
  for (const t of types) opts.push({ name: t, count: counts[t] })
  return opts
})

function typeCount(name: string) {
  const opt = (typeOptions.value || []).find(o => o.name === name)
  return opt ? opt.count : 0
}

const parentOptions = computed(() => {
  const list = Array.isArray(systemsStore.items) ? systemsStore.items : []
  const top = list.filter((s: any) => !s?.parentSystem).length
  const child = list.filter((s: any) => Boolean(s?.parentSystem)).length
  return [
    { name: 'All', count: list.length },
    { name: 'Top-level', count: top },
    { name: 'Has parent', count: child },
  ]
})

function parentCount(name: string) {
  const opt = (parentOptions.value || []).find(o => o.name === name)
  return opt ? opt.count : 0
}

async function refresh() {
  const pid = String(projectStore.currentProjectId || '')
  if (!pid) return
  await systemsStore.fetchByProject(pid)
}

function encodePipeCell(v: any) {
  const s = String(v ?? '').trim()
  if (!s) return ''
  return s
    .replace(/\|/g, '¦')
    .replace(/\r?\n/g, '\\n')
}

function buildQuestionsPipeTable(questions: any[]) {
  const qs = Array.isArray(questions) ? questions : []
  const header = '# | Number [number] | Question [question_text] | Answer [answer] | Notes [notes] | CX Answer [cx_answer] | OPR Item Ids [oprItemIds]'
  const lines = [header]
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i] || {}
    const opr = Array.isArray(q.oprItemIds) ? q.oprItemIds.map((x: any) => String((x && (x._id || x.id)) || x || '').trim()).filter(Boolean).join(',') : String(q.oprItemIds || '').trim()
    lines.push([
      String(i + 1),
      encodePipeCell(q.number ?? ''),
      encodePipeCell(q.question_text ?? q.question ?? ''),
      encodePipeCell(q.answer ?? ''),
      encodePipeCell(q.notes ?? ''),
      encodePipeCell(q.cx_answer ?? ''),
      encodePipeCell(opr),
    ].join(' | '))
  }
  return lines.join('\n')
}

function buildResultsPipeTable(table: any) {
  const columns = Array.isArray(table?.columns) ? table.columns : []
  const rows = Array.isArray(table?.rows) ? table.rows : []
  const cols = columns
    .map((c: any, idx: number) => ({ key: String(c?.key || '').trim() || `col_${idx + 1}`, name: String(c?.name || c?.key || '').trim() || String(c?.key || '').trim() || `col_${idx + 1}` }))
    .filter((c: any) => c.key)
  if (!cols.length) return ''

  const header = ['#', ...cols.map((c: any) => `${encodePipeCell(c.name)} [${encodePipeCell(c.key)}]`)].join(' | ')
  const lines = [header]
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {}
    lines.push([
      String(i + 1),
      ...cols.map((c: any) => encodePipeCell(r[c.key] ?? '')),
    ].join(' | '))
  }
  return lines.join('\n')
}

function normalizeIdArray(raw: any): string[] {
  const arr = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of arr) {
    const id = String((v && (v._id || v.id)) || v || '').trim()
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

async function downloadSystemsXlsx() {
  try {
    const pid = String(projectStore.currentProjectId || '')
    if (!pid) {
      ui.showError('Select a project first')
      return
    }
    const systems = Array.isArray(sorted.value) ? sorted.value : []
    if (!systems.length) {
      ui.showWarning('No systems to export')
      return
    }

    // Best-effort: load lookup tables for equipment + OPR item text.
    try {
      if (!Array.isArray(equipmentStore.items) || equipmentStore.items.length === 0 || equipmentStore.items.some((e: any) => String(e?.projectId || '') !== pid)) {
        await equipmentStore.fetchByProject(pid)
      }
    } catch { /* non-blocking */ }
    try {
      // OPR may not be enabled in plan; treat failures as non-blocking.
      if (!Array.isArray(oprStore.items) || oprStore.items.length === 0) {
        await oprStore.fetchItems(pid)
      }
    } catch { /* non-blocking */ }

    const oprItemById: Record<string, any> = {}
    try {
      for (const it of (Array.isArray(oprStore.items) ? oprStore.items : [])) {
        const id = String((it as any)?.id || (it as any)?._id || '').trim()
        if (id) oprItemById[id] = it
      }
    } catch { /* ignore */ }

    const equipmentById = equipmentStore.byId

    const systemsRows = systems.map((s: any) => {
      const parent = s?.parentSystem ? systemsStore.byId[String(s.parentSystem)] : null
      const tags = Array.isArray(s?.tags) ? s.tags.join(', ') : ''
      const attrs = Array.isArray(s?.attributes)
        ? s.attributes
          .filter((a: any) => a && String(a.key || '').trim())
          .map((a: any) => `${String(a.key || '').trim()}: ${String(a.value || '').trim()}`.trim())
          .join('\n')
        : ''

      const equipmentIds = normalizeIdArray(s?.equipmentIds)
      const equipmentList = equipmentIds
        .map((id) => {
          const e: any = equipmentById[String(id)]
          const tag = String(e?.tag || '').trim()
          const title = String(e?.title || '').trim()
          if (tag && title) return `${tag} - ${title}`
          if (tag) return tag
          if (title) return title
          return id
        })
        .join('\n')

      const oprItemIds = normalizeIdArray(s?.oprItemIds)
      const oprList = oprItemIds
        .map((id) => {
          const it: any = oprItemById[String(id)]
          const text = String(it?.text || '').trim()
          return text || id
        })
        .join('\n')

      return {
        tag: String(s?.tag || ''),
        name: String(s?.name || ''),
        type: String(s?.type || ''),
        parentTag: String(parent?.tag || ''),
        parentName: String(parent?.name || ''),
        description: String(s?.description || ''),
        tags,
        attributes: attrs,
        equipment: equipmentList,
        oprItems: oprList,
        createdAt: s?.createdAt || '',
        updatedAt: s?.updatedAt || '',
      }
    })

    const checklistsRows: any[] = []
    for (const s of systems) {
      const systemTag = String((s as any)?.tag || '')
      const cls = Array.isArray((s as any)?.checklists) ? (s as any).checklists : []
      for (let i = 0; i < cls.length; i++) {
        const sec = cls[i] || {}
        const questions = Array.isArray(sec?.questions) ? sec.questions : []
        checklistsRows.push({
          systemTag,
          checklistIndex: i,
          checklistNumber: sec?.number ?? '',
          checklistTitle: String(sec?.title || ''),
          checklistType: String(sec?.type || ''),
          checklistSystem: String(sec?.system || ''),
          checklistResponsible: String(sec?.responsible || ''),
          Questions: buildQuestionsPipeTable(questions),
        })
      }
    }

    const functionalTestsRows: any[] = []
    for (const s of systems) {
      const systemTag = String((s as any)?.tag || '')
      const tests = Array.isArray((s as any)?.functionalTests) ? (s as any).functionalTests : []
      for (let i = 0; i < tests.length; i++) {
        const t = tests[i] || {}
        const pass = t?.pass === true ? 'PASS' : (t?.pass === false ? 'FAIL' : '')
        const opr = Array.isArray(t?.oprItemIds)
          ? t.oprItemIds.map((x: any) => String((x && (x._id || x.id)) || x || '').trim()).filter(Boolean).join(',')
          : String(t?.oprItemIds || '').trim()

        const steps = Array.isArray(t?.rows) ? t.rows : (Array.isArray(t?.steps) ? t.steps : [])
        const results = buildResultsPipeTable(t?.table)
        if (!steps.length) {
          functionalTestsRows.push({
            systemTag,
            functionalTestIndex: i,
            functionalTestNumber: t?.number ?? '',
            name: String(t?.name || ''),
            pass,
            notes: String(t?.notes || ''),
            description: String(t?.description || ''),
            oprItemIds: opr,
            stepIndex: '',
            step: '',
            expected: '',
            actual: '',
            results,
          })
        } else {
          for (let si = 0; si < steps.length; si++) {
            const st = steps[si] || {}
            functionalTestsRows.push({
              systemTag,
              functionalTestIndex: i,
              functionalTestNumber: t?.number ?? '',
              name: String(t?.name || ''),
              pass,
              notes: String(t?.notes || ''),
              description: String(t?.description || ''),
              oprItemIds: opr,
              stepIndex: si,
              step: String(st?.step || ''),
              expected: String(st?.expected || ''),
              actual: String(st?.actual || ''),
              results,
            })
          }
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(systemsRows), 'Systems')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(checklistsRows), 'Checklists')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(functionalTestsRows), 'FunctionalTests')

    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')

    const proj: any = projectStore.currentProject as any
    const name = String(proj?.title || proj?.name || 'project')
    const safeName = name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]+/g, '')
    const today = new Date().toISOString().slice(0, 10)
    a.href = href
    a.download = `${safeName}-systems-${today}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(href)
  } catch (e: any) {
    ui.showError(e?.message || 'Failed to export Excel')
  }
}

function openCreate() {
  if (!projectStore.currentProjectId) {
    try { ui.showWarning('Select a project first') } catch { /* ignore */ }
    return
  }
  closeTypeMenu()
  closeParentMenu()
  createMode.value = 'create'
  editingSystemId.value = ''
  resetCreateForm()
  showCreateModal.value = true
}

function openEditModal(s: SystemRecord) {
  const id = String((s as any).id || (s as any)._id || '')
  if (!id) return
  closeTypeMenu()
  closeParentMenu()
  createMode.value = 'edit'
  editingSystemId.value = id
  resetCreateForm()
  createForm.value = {
    name: String((s as any).name || ''),
    tag: String((s as any).tag || ''),
    type: String((s as any).type || ''),
    parentSystem: String((s as any).parentSystem || ''),
    description: String((s as any).description || ''),
  }
  showCreateModal.value = true
}

type SystemEditTab = 'Info' | 'Checklists' | 'FPT' | 'Issues' | 'Equipment' | 'Settings' | 'Logs'

function systemEditTo(s: SystemRecord, tab?: SystemEditTab) {
  const id = String((s as any).id || (s as any)._id || '')
  const to: any = { name: 'system-edit', params: { id } }
  if (tab) to.query = { tab }
  return to
}

async function confirmRemove(s: SystemRecord) {
  const id = String((s as any).id || (s as any)._id || '')
  if (!id) return
  await new Promise(r => setTimeout(r))
  const label = String((s as any).name || (s as any).tag || 'this system')
  const confirmed = await inlineConfirm({
    title: 'Delete system',
    message: `Delete "${label}"? This cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!confirmed) return

  try {
    await systemsStore.remove(id)
    ui.showSuccess('System deleted')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete system')
  }
}

onMounted(async () => {
  try { document.addEventListener('click', onDocClick) } catch { /* ignore */ }
  loadPageSizePref()
  await refresh()
})

onBeforeUnmount(() => {
  try { document.removeEventListener('click', onDocClick) } catch { /* ignore */ }
})

watch(() => projectStore.currentProjectId, async () => {
  closeTypeMenu()
  closeParentMenu()
  page.value = 1
  loadPageSizePref()
  await refresh()
})

watch(pageSize, () => {
  page.value = 1
})

watch([filtered, totalPages], () => {
  if (page.value > totalPages.value) page.value = totalPages.value
  if (page.value < 1) page.value = 1
})

watch(() => systemsStore.items, () => {
  // If the selected filter option disappears (e.g. different project), reset to All.
  try {
    if (typeFilter.value !== 'All' && !typeOptions.value.some(o => o.name === typeFilter.value)) typeFilter.value = 'All'
  } catch { /* ignore */ }
})

// Create modal state
const showCreateModal = ref(false)
const createSaving = ref(false)
const createError = ref<string | null>(null)
const createMode = ref<'create' | 'edit'>('create')
const editingSystemId = ref<string>('')
const createForm = ref({
  name: '',
  tag: '',
  type: '',
  parentSystem: '',
  description: '',
})

const canSubmitCreate = computed(() => {
  const pid = String(projectStore.currentProjectId || '')
  return Boolean(pid && String(createForm.value.name || '').trim())
})

const createTypeSuggestions = computed(() => {
  const list = Array.isArray(systemsStore.items) ? systemsStore.items : []
  const set = new Set<string>()
  for (const s of list) {
    const t = String((s as any)?.type || '').trim()
    if (t) set.add(t)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const createParentOptions = computed(() => {
  const list = Array.isArray(systemsStore.items) ? systemsStore.items : []
  const selfId = String(editingSystemId.value || '')
  const opts = list.map((s: any) => {
    const id = String(s?.id || s?._id || '')
    const name = String(s?.name || '').trim()
    const tag = String(s?.tag || '').trim()
    const label = name ? `${name}${tag ? ` (${tag})` : ''}` : (tag || id)
    return { id, label }
  }).filter(o => o.id && (!selfId || o.id !== selfId))
  opts.sort((a, b) => a.label.localeCompare(b.label))
  return opts
})

function resetCreateForm() {
  createError.value = null
  createSaving.value = false
  createForm.value = { name: '', tag: '', type: '', parentSystem: '', description: '' }
}

async function submitCreate() {
  if (createSaving.value) return
  const pid = String(projectStore.currentProjectId || '')
  if (!pid) {
    createError.value = 'Select a project first.'
    return
  }
  const name = String(createForm.value.name || '').trim()
  if (!name) {
    createError.value = 'Name is required.'
    return
  }

  createSaving.value = true
  createError.value = null
  try {
    const payload: SystemRecord = {
      projectId: pid,
      name,
      tag: String(createForm.value.tag || '').trim() || undefined,
      type: String(createForm.value.type || '').trim() || undefined,
      description: String(createForm.value.description || '').trim() || undefined,
      parentSystem: String(createForm.value.parentSystem || '').trim() || null,
    }
    if (createMode.value === 'edit') {
      const id = String(editingSystemId.value || '')
      if (!id) throw new Error('Missing system id')
      await systemsStore.update({ ...(payload as any), id })
      showCreateModal.value = false
      try { ui.showSuccess('System updated') } catch { /* ignore */ }
    } else {
      const created = await systemsStore.create(payload)
      showCreateModal.value = false
      try { ui.showSuccess('System created') } catch { /* ignore */ }

      // Keep the list feeling responsive: if the user is currently searching/filtering,
      // auto-include the newly created name.
      try {
        const q = String(search.value || '').trim().toLowerCase()
        if (q && !String(created?.name || '').toLowerCase().includes(q)) search.value = ''
      } catch { /* ignore */ }
    }
  } catch (e: any) {
    createError.value = e?.response?.data?.error || e?.message || (createMode.value === 'edit' ? 'Failed to update system' : 'Failed to create system')
  } finally {
    createSaving.value = false
  }
}

watch(() => showCreateModal.value, (val) => {
  if (!val) {
    resetCreateForm()
    createMode.value = 'create'
    editingSystemId.value = ''
  }
})
</script>
