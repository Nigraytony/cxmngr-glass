<template>
  <section
    ref="pageSection"
    class="space-y-6 relative"
  >
    <!-- header with breadcrumbs at the top -->
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Spaces', to: '/spaces' }
        ]"
        title="Spaces"
      />
    </div>

    <!-- toolbar below breadcrumbs (search first) -->
    <div class="flex flex-wrap items-center gap-2 gap-y-2 min-w-0">
      <!-- Error banner for plan guard or missing project -->
      <div
        v-if="spacesStore.errorCode"
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
          <span v-if="spacesStore.errorCode === 'PROJECT_NOT_FOUND'">Selected project not found. Please reselect a project.</span>
          <span v-else-if="spacesStore.errorCode === 'FEATURE_NOT_IN_PLAN'">Spaces are not available on your current subscription plan.</span>
          <span v-else>{{ spacesStore.error || 'Unable to load spaces.' }}</span>
        </div>
      </div>
      <!-- Add Space round button with hover tooltip, left of search -->
      <div class="relative inline-block group">
        <button
          :disabled="!projectStore.currentProjectId"
          aria-label="Add space"
          :title="projectStore.currentProjectId ? 'Add space' : 'Select a project to add spaces'"
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
          class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
        >
          {{ projectStore.currentProjectId ? 'Add space' : 'Select a project to add spaces' }}
        </div>
      </div>
      <input
        v-model="search"
        type="text"
        placeholder="Search by tag or title"
        class="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 w-64"
      >
      <!-- Types filter styled like Issues status filter -->
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
            class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
              <button
                v-for="opt in typeOptions"
                :key="opt.name"
                role="menuitem"
                :class="['w-full px-3 py-2 text-left inline-flex items-center justify-between gap-2', (typeFilterLabel === opt.name) ? 'bg-white/10 text-white' : 'text-white/90 hover:bg-white/10']"
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
        class="px-3 py-2 rounded bg-white/10 hover:bg-white/15 text-white border border-white/20 min-w-[120px]"
        @click="toggleView"
      >
        <span
          v-if="viewMode === 'list'"
          class="inline-flex items-center gap-2"
        >
          <!-- hierarchy/tree icon -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <!-- top node -->
            <circle
              cx="12"
              cy="5"
              r="2.25"
            />
            <!-- bottom left node -->
            <circle
              cx="7"
              cy="19"
              r="2.25"
            />
            <!-- bottom right node -->
            <circle
              cx="17"
              cy="19"
              r="2.25"
            />
            <!-- connectors -->
            <path
              d="M12 7.5v5.5"
              stroke-linecap="round"
            />
            <path
              d="M12 13h-3"
              stroke-linecap="round"
            />
            <path
              d="M12 13h3"
              stroke-linecap="round"
            />
          </svg>
          <span>Tree View</span>
        </span>
        <span
          v-else
          class="inline-flex items-center gap-2"
        >
          <!-- list icon -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path
              d="M5 7h14"
              stroke-linecap="round"
            />
            <path
              d="M5 12h14"
              stroke-linecap="round"
            />
            <path
              d="M5 17h14"
              stroke-linecap="round"
            />
          </svg>
          <span>List View</span>
        </span>
      </button>
      <div class="relative inline-block group">
        <button
          :disabled="!canAutoTagSpacesPage"
          aria-label="Auto-tag this page"
          :title="canAutoTagSpacesPage ? 'Auto-tag this page' : 'Auto-tagging requires AI + a selected project'"
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
      <!-- Download Excel button -->
      <button
        :disabled="!filtered.length"
        class="px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 disabled:opacity-40"
        @click="downloadSpacesXlsx"
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
      <!-- Upload Excel button + hidden input -->
      <div
        ref="uploadRef"
        class="relative inline-block group"
      >
        <button
          :disabled="!projectStore.currentProjectId || uploading"
          class="px-3 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white text-sm border border-white/10 inline-flex items-center gap-2 disabled:opacity-40"
          @click="triggerUpload"
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
              d="M8 7l4-4 4 4"
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
          <span>{{ uploading ? 'Uploading…' : 'Upload Excel' }}</span>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          class="hidden"
          @change="onFileChange"
        >
        <!-- Tooltip with import guidance -->
        <div
          role="tooltip"
          class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-[320px] opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-3 py-2 border border-white/10 shadow backdrop-blur transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100 z-40"
        >
          <div class="text-white/90 font-medium mb-1">
            Import columns
          </div>
          <div><span class="text-white/70">Required:</span> title</div>
          <div><span class="text-white/70">Optional:</span> id, tag, type, description, parent id, parent tag, parent title</div>
          <div class="mt-1 text-white/60">
            Upsert: id › tag › title · Parent: parent id › parent tag › parent title
          </div>
        </div>
      </div>
    </div>

    <!-- list -->
    <div
      v-if="viewMode === 'list'"
      class="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-2 min-w-0 overflow-x-auto"
    >
      <!-- pagination toolbar (top) removed -- keep simpler single control block at bottom -->
      <div class="grid grid-cols-12 px-2 py-2 text-white/70 text-sm">
        <div class="col-span-2">
          <button
            type="button"
            class="flex items-center gap-2"
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
        </div>
        <div class="col-span-4">
          <button
            type="button"
            class="flex items-center gap-2"
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
        </div>
        <div class="col-span-2">
          <button
            type="button"
            class="flex items-center gap-2"
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
        </div>
        <div class="col-span-3 hidden lg:block">
          <button
            type="button"
            class="flex items-center gap-2"
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
        </div>
        <div class="col-span-1 text-right">
          Actions
        </div>
      </div>
      <div class="divide-y divide-white/10">
        <div
          v-for="s in paged"
          :key="s.id"
          class="grid grid-cols-12 items-center px-2 py-2 text-white/90"
        >
          <div
            class="col-span-2 truncate"
            :title="s.tag"
          >
            {{ s.tag || '-' }}
          </div>
          <div
            class="col-span-4 truncate"
            :title="s.title"
          >
            {{ s.title }}
          </div>
          <div class="col-span-2">
            {{ s.type }}
          </div>
          <div
            class="col-span-3 hidden lg:block truncate text-sm"
            :title="s.parentChain || spaceParentChainLabelById(s.parentSpace)"
          >
            {{ s.parentChain || spaceParentChainLabelById(s.parentSpace) || '-' }}
          </div>
          <div class="col-span-1 flex items-center justify-end gap-2">
            <!-- Visit icon button -->
            <button
              class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
              aria-label="Open space"
              :title="`Open ${s.title || 'space'}`"
              @click="visit(s)"
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
              class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
              aria-label="Edit space"
              :title="`Edit ${s.title || 'space'}`"
              @click="openEdit(s)"
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
              class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
              aria-label="Delete space"
              :title="`Delete ${s.title || 'space'}`"
              @click="confirmRemove(s)"
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
        <div
          v-if="!loading && totalFiltered === 0"
          class="p-6 text-white/60 text-center"
        >
          No spaces yet.
        </div>
        <div
          v-else-if="!loading && !filtered.length"
          class="p-6 text-white/60 text-center"
        >
          No matching spaces.
        </div>
        <div
          v-if="loading"
        >
          <Spinner />
        </div>
      </div>
      <!-- pagination controls (matches EquipmentList layout) -->
      <div
        v-if="totalFiltered > 0"
        class="grid gap-2 px-2 py-3 text-white/70 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center"
      >
        <div class="flex items-center gap-2 md:justify-self-start">
          <span>Rows per page</span>
          <select
            v-model.number="pageSize"
            class="px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
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
          <span class="ml-2">{{ pageStart + 1 }}–{{ pageEnd }} of {{ totalFiltered }}</span>
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

    <!-- tree -->
    <div
      v-else
      class="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-2"
    >
      <div class="px-2 py-2 text-white/70 text-sm flex items-center gap-2">
        <span>Drag a space onto another to reparent.</span>
        <span class="text-white/50">(Building cannot have a parent; Floor must be under a Building; Room must be under a Floor)</span>
      </div>
      <!-- Drop to root -->
      <div
        class="mx-2 mb-2 px-3 py-2 rounded border border-white/10 text-white/70 hover:bg-white/10"
        :class="{ 'bg-white/15': rootDragOver }"
        @dragover.prevent="onRootDragOver"
        @dragleave="onRootDragLeave"
        @drop="onRootDrop"
      >
        Drop here to make top-level
      </div>
      <div class="divide-y divide-white/10">
        <div
          v-for="row in visibleNodes"
          :key="row.node.id"
          class="flex items-center px-2 py-1 gap-2 text-white/90"
          :class="{ 'bg-white/10': dragOverId === row.node.id }"
          @dragover="(e) => onNodeDragOver(e, row.node)"
          @dragleave="onNodeDragLeave"
          @drop="(e) => onNodeDrop(e, row.node)"
        >
          <div
            class="flex items-center"
            :style="{ marginLeft: `${row.depth * 16}px` }"
          >
            <button
              v-if="row.node.children && row.node.children.length"
              class="w-6 h-6 grid place-items-center rounded hover:bg-white/10 text-white/70"
              @click="toggleOpen(row.node)"
            >
              <span>{{ isOpen(row.node) ? '▾' : '▸' }}</span>
            </button>
            <span
              v-else
              class="w-6 h-6"
            />
            <div
              class="flex items-center gap-2"
              draggable="true"
              @dragstart="(e) => onDragStart(e, row.node)"
              @dragend="onDragEnd"
            >
              <span class="text-white/60 text-xs px-1 py-0.5 rounded bg-white/10 border border-white/10 min-w-[56px] text-center">{{ row.node.type }}</span>
              <span class="font-medium">{{ row.node.title }}</span>
              <span
                v-if="row.node.tag"
                class="text-white/60"
              >({{ row.node.tag }})</span>
            </div>
          </div>
          <div class="ml-auto flex items-center gap-2">
            <!-- Visit icon button -->
            <button
              class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
              aria-label="Open space"
              :title="`Open ${row.node.title || 'space'}`"
              @click="visit(row.node)"
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
              class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
              aria-label="Edit space"
              :title="`Edit ${row.node.title || 'space'}`"
              @click="openEdit(row.node)"
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
              class="w-8 h-8 grid place-items-center rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 border border-red-500/30"
              aria-label="Delete space"
              :title="`Delete ${row.node.title || 'space'}`"
              @click="confirmRemove(row.node)"
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
        <div
          v-if="!spaces.length && !loading"
          class="p-6 text-white/60 text-center"
        >
          No spaces yet.
        </div>
        <div
          v-if="loading"
          class="p-6 text-white/60 text-center"
        >
          Loading…
        </div>
      </div>
    </div>

    <!-- modal -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 grid place-items-center bg-black/50"
    >
      <div class="w-[640px] max-w-[95vw] rounded-xl border border-white/20 bg-white/10 backdrop-blur p-4 text-white">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">
            {{ editing ? 'Edit Space' : 'Create Space' }}
          </h2>
          <button
            class="px-2 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20"
            @click="closeModal"
          >
            ✕
          </button>
        </div>
        <form @submit.prevent="save">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm text-white/70">Tag</label>
              <input
                v-model="form.tag"
                type="text"
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
            </div>
            <div>
              <label class="text-sm text-white/70">Type</label>
              <select
                v-model="form.type"
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
                <option
                  v-for="t in spaceTypes"
                  :key="t"
                  :value="t"
                >
                  {{ t }}
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
            <div class="col-span-2">
              <label class="text-sm text-white/70">Parent Space</label>
              <select
                v-model="form.parentSpace"
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
      </div>
    </div>
    <BulkAutoTagModal
      v-model="showAutoTagModal"
      title="Auto-tag visible spaces"
      :project-id="resolvedProjectId"
      entity-type="space"
      :allowed-tags="projectAllowedTags"
      :items="autoTagSpaceItems"
      :can-suggest="canAutoTagSpacesPage"
      :apply-tags="applySpaceTags"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Spinner from '../../components/Spinner.vue'
import BulkAutoTagModal from '../../components/BulkAutoTagModal.vue'
import http from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'
import { useProjectStore } from '../../stores/project'
import { useSpacesStore, type Space } from '../../stores/spaces'
import { useUiStore } from '../../stores/ui'
	import { useAuthStore } from '../../stores/auth'
	import { confirm as inlineConfirm } from '../../utils/confirm'
	import { runCoachmarkOnce } from '../../utils/coachmarks'
	import * as XLSX from 'xlsx'
	import { useRouter } from 'vue-router'

const projectStore = useProjectStore()
const spacesStore = useSpacesStore()
const ui = useUiStore()
const router = useRouter()
const auth = useAuthStore()

const spaceTypes = ['Building', 'Floor', 'Room', 'Area', 'Level', 'Corridor', 'Roof']

const search = ref('')
const typeFilter = ref('')
const modalOpen = ref(false)
const editing = ref(false)
const form = ref<Space>({ title: '', type: 'Room', project: '', tag: '', parentSpace: '' })
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

const canAutoTagSpacesPage = computed(() => {
  const pid = resolvedProjectId.value
  if (!pid) return false
  const p: any = projectStore.currentProject || {}
  if (p.ai && p.ai.enabled === false) return false
  const tier = String(p.subscriptionTier || '').toLowerCase()
  const hasFeature = p.subscriptionFeatures && (p.subscriptionFeatures.ai === true || p.subscriptionFeatures.AI === true)
  return tier === 'premium' || hasFeature
})

const spaces = computed(() => spacesStore.items)
// server-driven list for paging (list view)
const serverSpaces = ref([])
const serverTotal = ref(0)
const listSpaces = computed(() => serverSpaces.value)
// Local writable loading state for this component; mirror store.loading for compatibility
const loading = ref(false)
watch(() => spacesStore.loading, (v) => { loading.value = !!v }, { immediate: true })

const parentMap = computed(() => spacesStore.byId)

function spaceParentChainLabelById(spaceId?: string | null) {
  try {
    const pid = spaceId ? String(spaceId) : ''
    if (!pid) return ''
    const cur = parentMap.value[pid] || (spaces.value || []).find((s: any) => String(s.id || s._id) === pid)
    if (cur && cur.parentChain) return cur.parentChain
    let node: any = cur
    const parts: string[] = []
    let depth = 0
    while (node && depth < 20) {
      const title = String(node.title || node.tag || '')
      if (title) parts.unshift(title)
      const parentId = node.parentSpace || node.parent || null
      if (!parentId) break
      node = parentMap.value[String(parentId)] || (spaces.value || []).find((x: any) => String(x.id || x._id) === String(parentId))
      depth++
    }
    return parts.join(' > ')
  } catch (e) {
    return ''
  }
}

// Removed unused search mode and fuzzyMatch utilities

// Debounce helper (small local utility)
function debounce(fn: (...args: any[]) => void, wait = 200) {
  let t: any
  return (...args: any[]) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), wait)
  }
}

// Filter over server-provided page so list view and downloads reflect current page
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const list = listSpaces.value || []
  return list.filter(s => {
    if (t && s.type !== t) return false
    if (!q) return true
    const fields = [`${s.tag || ''}`, `${s.title || ''}`].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})

// Sorting state for spaces table
const sortKey = ref('')
const sortDir = ref(1) // 1 = asc, -1 = desc

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const arr = [...filtered.value]
  arr.sort((a: any, b: any) => {
    let av: string
    let bv: string
    if (sortKey.value === 'parent') {
        av = String(spaceParentChainLabelById((a as any).parentSpace) || '').toLowerCase()
        bv = String(spaceParentChainLabelById((b as any).parentSpace) || '').toLowerCase()
    } else {
      av = String((a?.[sortKey.value] ?? '')).toLowerCase()
      bv = String((b?.[sortKey.value] ?? '')).toLowerCase()
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

// Type filter dropdown like Issues status filter
const showTypeMenu = ref(false)
const typeMenuRef = ref<HTMLElement | null>(null)
const typeFilterLabel = computed(() => typeFilter.value || 'All')
const typeCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  // Prefer server-returned counts when available
  for (const [k, v] of Object.entries(serverTypeCounts.value)) counts[k] = v
  const allTypes = serverTypes.value.length ? serverTypes.value : spaceTypes
  for (const t of allTypes) counts[t] = counts[t] || 0
  counts['All'] = serverTotal.value || spaces.value.length
  return counts
})
const serverTypes = ref<string[]>([])
const serverTypeCounts = ref<Record<string, number>>({})
const typeOptions = computed(() => {
  const counts = typeCounts.value
  const names = serverTypes.value.length
    ? Array.from(new Set(serverTypes.value)).filter(Boolean)
    : spaceTypes
  const opts = names.map(t => ({ name: t, count: counts[t] || 0 }))
  return [{ name: 'All', count: counts['All'] || 0 }, ...opts]
})
function typeCount(name: string) { return typeCounts.value[name] || 0 }
function toggleTypeMenu() { showTypeMenu.value = !showTypeMenu.value }
function closeTypeMenu() { showTypeMenu.value = false }
function applyTypeFilter(name: string) {
  typeFilter.value = name === 'All' ? '' : name
  closeTypeMenu()
}
function onClickOutside(e: MouseEvent) {
  const el = typeMenuRef.value
  if (!el) return
  const target = e.target as Node
  if (!el.contains(target)) closeTypeMenu()
}
onMounted(() => {
  document.addEventListener('click', onClickOutside)

  const pid = String(resolvedProjectId.value || '').trim()
  const uid = auth.user?._id ? String(auth.user._id) : null
  if (pid) {
    runCoachmarkOnce('spaces.list.toolbar.tip', { projectId: pid, userId: uid }, () => {
      ui.showInfo('Tip: Use the Type filter to find spaces quickly. Auto-tag can suggest tags from your project tag library.', { duration: 10000 })
    })
  }
})
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))

// Pagination (list view only)
const page = ref(1)
// seed pageSize from user's profile perPage preference when available
const pageSize = ref((auth && auth.user && auth.user.contact && typeof auth.user.contact.perPage === 'number') ? auth.user.contact.perPage : 10)
// Persist per-page page size preference for the current session
const pageSizeStorageKey = computed(() => `spacesPageSize:${projectStore.currentProjectId || 'global'}`)
function loadPageSizePref() {
  try {
    const raw = sessionStorage.getItem(pageSizeStorageKey.value)
    if (!raw) {
      try {
        const p = auth && auth.user && auth.user.contact && auth.user.contact.perPage
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
function persistPageSizePref() { try { sessionStorage.setItem(pageSizeStorageKey.value, String(pageSize.value)) } catch (e) { /* ignore */ } }
watch(pageSizeStorageKey, () => loadPageSizePref(), { immediate: true })
watch(pageSize, () => persistPageSizePref())
// Server-driven totals and paging for list view
const totalFiltered = computed(() => Number(serverTotal.value || 0))
const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / pageSize.value)))
const pageStart = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return Math.min(start, Math.max(0, Math.max(0, totalFiltered.value - 1)))
})
const pageEnd = computed(() => Math.min(pageStart.value + pageSize.value, totalFiltered.value))
const paged = computed(() => {
  const list = sorted.value || []
  // Server always returns a page slice; just return the list
  return list
})

const autoTagSpaceItems = computed(() => {
  const list: any[] = Array.isArray(paged.value) ? (paged.value as any[]) : []
  return list.slice(0, 25).map((s: any) => {
    const id = String(s?.id || s?._id || '').trim()
    if (!id) return null
    const title = String(s?.title || s?.tag || '').trim() || `Space ${id}`
    const subtitle = String(s?.type || '').trim()
    const existingTags = Array.isArray(s?.tags) ? s.tags : []
    const entity = {
      tag: s?.tag || null,
      title,
      type: s?.type || null,
      description: String(s?.description || '').trim(),
      parentSpace: s?.parentSpace || null,
      parentChain: spaceParentChainLabelById(s?.parentSpace || null),
    }
    return { id, title, subtitle, existingTags, entity }
  }).filter(Boolean) as any
})

async function applySpaceTags(id: string, tags: string[]) {
  const sid = String(id || '').trim()
  if (!sid) return

  const fromStore: any = (spacesStore.byId && (spacesStore.byId as any)[sid]) ? (spacesStore.byId as any)[sid] : null
  const fromPage: any = (listSpaces.value || []).find((s: any) => String(s?.id || s?._id || '') === sid) || null
  const base: any = { ...(fromPage || {}), ...(fromStore || {}) }

  if (!base.title && (fromPage?.title || fromStore?.title)) base.title = fromPage?.title || fromStore?.title
  if (!base.type && (fromPage?.type || fromStore?.type)) base.type = fromPage?.type || fromStore?.type
  if (!base.project && base.projectId) base.project = base.projectId
  if (!base.project) base.project = resolvedProjectId.value

  const nextTags = Array.isArray(tags) ? tags : []
  await spacesStore.update({ ...base, id: sid, tags: nextTags } as any)

  // Also patch the server-driven page slice so tags update immediately.
  try {
    const arr: any[] = Array.isArray(serverSpaces.value) ? (serverSpaces.value as any[]) : []
    const idx = arr.findIndex((s: any) => String(s?.id || s?._id || '').trim() === sid)
    if (idx >= 0) {
      const cur = arr[idx] || {}
      serverSpaces.value.splice(idx, 1, { ...cur, tags: nextTags })
    }
  } catch (e) { /* ignore */ }
}

// Fetch page from server
async function fetchSpacesPage(projectId?: string) {
  loading.value = true
  const pid = projectId ?? projectStore.currentProjectId ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') ?? ''
  if (!pid) {
    serverSpaces.value = []
    serverTotal.value = 0
    loading.value = false
    return
  }
  try {
    const params: any = { page: page.value, perPage: pageSize.value, projectId: pid, includeTypes: true }
    if (search.value) params.search = search.value
    if (typeFilter.value && typeFilter.value !== 'All') params.type = typeFilter.value
    if (sortKey.value) { params.sortBy = sortKey.value; params.sortDir = sortDir.value === 1 ? 'asc' : 'desc' }
    const res = await http.get('/api/spaces', { params, headers: getAuthHeaders() })
  const data = res && res.data ? res.data : {}
  if (Array.isArray(data.items)) serverSpaces.value = data.items.map(s => ({ ...(s || {}), id: s._id || s.id }))
  else if (Array.isArray(data)) serverSpaces.value = data.map(s => ({ ...(s || {}), id: s._id || s.id }))
  else serverSpaces.value = []
  serverTotal.value = Number(data.total ?? data.count ?? serverSpaces.value.length)
  if (Array.isArray(data.types)) serverTypes.value = data.types.map((t: any) => String(t))
  if (data.typeCounts && typeof data.typeCounts === 'object') {
    const map: Record<string, number> = {}
    for (const [k, v] of Object.entries(data.typeCounts)) {
      map[String(k)] = Number(v) || 0
    }
    serverTypeCounts.value = map
  } else {
    serverTypeCounts.value = {}
  }
  const tp = Math.max(1, Math.ceil(serverTotal.value / pageSize.value))
  if (page.value > tp) {
    page.value = tp
    await fetchSpacesPage(pid)
  }
  } catch (e: any) {
    // If the API path isn't available (404), fall back to store-based fetch so list view still works
    if (e && e.response && e.response.status === 404) {
      try {
        const pid = projectId ?? (projectStore.currentProjectId || '')
        if (pid) {
          await spacesStore.fetchByProject(String(pid))
          const all = Array.isArray(spacesStore.items) ? spacesStore.items : []
          const filteredByProject = all.filter((s: any) => String(s.projectId || s.project || '') === String(pid))
          serverSpaces.value = filteredByProject.map((s: any) => ({ ...(s || {}), id: s._id || s.id }))
          serverTotal.value = serverSpaces.value.length
        } else {
          serverSpaces.value = []
          serverTotal.value = 0
        }
      } catch (inner) {
        serverSpaces.value = []
        serverTotal.value = 0
      }
    } else {
      serverSpaces.value = []
      serverTotal.value = 0
    }
  } finally {
    loading.value = false
  }
}

const debouncedFetch = debounce(() => { fetchSpacesPage().catch(() => {}) }, 150)
watch([() => page.value, () => pageSize.value, () => sortKey.value, () => sortDir.value, () => search.value, () => typeFilter.value], () => debouncedFetch(), { immediate: false })

function prevPage() { if (page.value > 1) page.value -= 1 }
function nextPage() { if (page.value < totalPages.value) page.value += 1 }

watch([search, typeFilter], () => { page.value = 1 })
watch(totalPages, (tp) => { if (page.value > tp) page.value = tp })
watch(sorted, () => { if (page.value > totalPages.value) page.value = totalPages.value })

// moved project watcher and tree init watchers below after declarations

// Use the full project list (store) for parent selection, not just the current page slice
const parentOptions = computed(() => {
  const selfId = form.value.id ? String(form.value.id) : ''
  const type = form.value.type
  const pid = projectStore.currentProjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') || ''
  // Merge server slice with store items, unique by id
  const merged: Record<string, any> = {}
  const add = (arr: any[]) => {
    for (const s of arr || []) {
      const id = String((s as any).id || (s as any)._id || '')
      if (!id) continue
      if (pid && String((s as any).project || (s as any).projectId || '') !== String(pid)) continue
      merged[id] = { ...(s as any), id }
    }
  }
  add(serverSpaces.value as any[])
  add(spacesStore.items as any[])
  let base = Object.values(merged).filter(s => !selfId || String((s as any).id) !== selfId)
  if (type === 'Building') {
    return []
  }
  if (type === 'Floor') {
    base = base.filter((s: any) => s.type === 'Building')
  } else if (type === 'Room') {
    base = base.filter((s: any) => s.type === 'Floor')
  }
  return base as any[]
})

function openCreate() {
  editing.value = false
  const currentPid = projectStore.currentProjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') || ''
  form.value = { title: '', type: 'Room', project: currentPid, projectId: currentPid, tag: '', description: '', parentSpace: '' }
  modalOpen.value = true
  if (currentPid) {
    // Ensure full project spaces are loaded for parent dropdown options
    spacesStore.fetchByProject(String(currentPid)).catch(() => {})
  }
}

function openEdit(s: Space) {
  editing.value = true
  const pid = s.project || (s as any).projectId || projectStore.currentProjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') || ''
  form.value = { ...s, id: s.id || (s as any)._id, project: pid, projectId: pid }
  modalOpen.value = true
  if (pid) {
    spacesStore.fetchByProject(String(pid)).catch(() => {})
  }
}

function visit(s: Space) {
  const sid = String((s as any).id || (s as any)._id || '')
  if (sid) router.push({ name: 'space-edit', params: { id: sid } })
}

function closeModal() {
  modalOpen.value = false
}

async function save() {
  try {
    const currentPid = projectStore.currentProjectId || (typeof localStorage !== 'undefined' ? localStorage.getItem('selectedProjectId') : '') || ''
    if (!form.value.project) form.value.project = currentPid
    if (!form.value.projectId) form.value.projectId = form.value.project || currentPid
    if (!form.value.title) throw new Error('Title is required')
    if (editing.value && form.value.id) {
      await spacesStore.update(form.value as Space & { id: string })
      ui.showSuccess('Space updated')
    } else {
      await spacesStore.create(form.value as Space)
      ui.showSuccess('Space created')
    }
    modalOpen.value = false
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save space')
  }
}

async function confirmRemove(s: Space) {
  try {
    if (!s.id) s.id = (s as any)._id
    if (!s.id) return
    const confirmed = await inlineConfirm({
      title: 'Delete space',
      message: `Delete space "${s.title}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    })
    if (!confirmed) return
    await spacesStore.remove(String(s.id))
    ui.showSuccess('Space deleted')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to delete space')
  }
}

// View toggle and tree helpers
const viewMode = ref<'list' | 'tree'>('list')
function toggleView() {
  viewMode.value = viewMode.value === 'list' ? 'tree' : 'list'
  if (viewMode.value === 'tree') {
    // When entering tree view, load persisted state or expand first-level (Buildings)
    const loaded = loadOpenNodes()
    if (!loaded) initOpenNodesIfEmpty()
    openInitDone.value = true
  }
}

type NodeRow = { node: any, depth: number }
const openNodes = ref<Set<string>>(new Set())
const openInitDone = ref(false)
const OPEN_NODES_KEY = computed(() => `spacesTreeOpenNodes:${projectStore.currentProjectId || 'global'}`)
const LIST_STATE_KEY = computed(() => `spacesListState:${projectStore.currentProjectId || 'global'}`)

function hasSessionStorage(): boolean {
  try { return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined' } catch (e) { return false }
}

function saveOpenNodes() {
  try {
    if (!hasSessionStorage()) return
    const arr = Array.from(openNodes.value)
    sessionStorage.setItem(OPEN_NODES_KEY.value, JSON.stringify(arr))
  } catch (_) { /* ignore */ }
}
function loadOpenNodes(): boolean {
  try {
    if (!hasSessionStorage()) return false
    const raw = sessionStorage.getItem(OPEN_NODES_KEY.value)
    if (!raw) return false
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      openNodes.value = new Set(arr.map((v: any) => String(v)))
      return openNodes.value.size > 0
    }
    return false
  } catch (_) { return false }
}
function initOpenNodesIfEmpty() {
  if (openNodes.value.size > 0) return
  const roots: any[] = treeRoots.value || []
  const idsToOpen: string[] = []
  for (const n of roots) {
    const t = String(n.type || '').toLowerCase()
    if (t === 'building') idsToOpen.push(getId(n))
  }
  // If no explicit Building roots, open all roots as a fallback
  if (idsToOpen.length === 0) {
    for (const n of roots) idsToOpen.push(getId(n))
  }
  openNodes.value = new Set([ ...openNodes.value, ...idsToOpen ])
}

// Persist open node state across session (trigger on identity change)
watch(() => openNodes.value, () => { saveOpenNodes() })
function getId(n: any): string { return String(n.id || n._id) }
function isOpen(n: any) { return openNodes.value.has(getId(n)) }
function toggleOpen(n: any) {
  const id = getId(n)
  const next = new Set(openNodes.value)
  if (next.has(id)) next.delete(id); else next.add(id)
  openNodes.value = next
}

function loadListState() {
  if (!hasSessionStorage()) return
  try {
    const raw = sessionStorage.getItem(LIST_STATE_KEY.value)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data && typeof data === 'object') {
      if (typeof data.search === 'string') search.value = data.search
      if (typeof data.typeFilter === 'string') typeFilter.value = data.typeFilter
      if (typeof data.sortKey === 'string') sortKey.value = data.sortKey
      if (data.sortDir === 1 || data.sortDir === -1) sortDir.value = data.sortDir
    }
  } catch (e) { /* ignore */ }
}
function persistListState() {
  if (!hasSessionStorage()) return
  try {
    const payload = {
      search: search.value,
      typeFilter: typeFilter.value,
      sortKey: sortKey.value,
      sortDir: sortDir.value
    }
    sessionStorage.setItem(LIST_STATE_KEY.value, JSON.stringify(payload))
  } catch (e) { /* ignore */ }
}
watch(LIST_STATE_KEY, () => loadListState(), { immediate: true })
watch([search, typeFilter, sortKey, sortDir], () => persistListState())

const treeRoots = computed(() => spacesStore.buildTree())
function flatten(nodes: any[], out: NodeRow[] = [], depth = 0): NodeRow[] {
  for (const n of nodes) {
    out.push({ node: n, depth })
    const id = getId(n)
    if (openNodes.value.has(id) && Array.isArray(n.children) && n.children.length) {
      flatten(n.children, out, depth + 1)
    }
  }
  return out
}
const visibleNodes = computed<NodeRow[]>(() => flatten(treeRoots.value))

// Now that viewMode/openNodes are declared, add watchers that depend on them
watch(() => projectStore.currentProjectId, async (id) => {
  if (!id) return
  // clear stale data when switching projects
  serverSpaces.value = []
  serverTotal.value = 0
  spacesStore.items = []
  // If tree view is active, keep using the store's full-fetch for tree population
  if (viewMode.value === 'tree') {
    await spacesStore.fetchByProject(String(id))
    openNodes.value = new Set()
    openInitDone.value = false
    const loaded = loadOpenNodes()
    if (!loaded) initOpenNodesIfEmpty()
    openInitDone.value = true
    return
  }
  // Otherwise (list view) fetch paged data from server
  page.value = 1
  fetchSpacesPage(String(id)).catch(() => {})
}, { immediate: true })

// Ensure initial expansion when spaces load or when switching to tree view
watch([() => spaces.value.length, () => viewMode.value], ([len, mode]) => {
  if (mode === 'tree' && len > 0 && !openInitDone.value) {
    const loaded = loadOpenNodes()
    if (!loaded) initOpenNodesIfEmpty()
    openInitDone.value = true
  }
})

// Drag & drop
const dragSourceId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
const rootDragOver = ref(false)

function onDragStart(e: DragEvent, n: any) {
  const id = getId(n)
  dragSourceId.value = id
  e.dataTransfer?.setData('text/plain', id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDragEnd() { dragSourceId.value = null; dragOverId.value = null; rootDragOver.value = false }

function getById(id?: string | null): Space | undefined {
  if (!id) return undefined
  return spaces.value.find(s => String(s.id || (s as any)._id) === String(id))
}

function isAncestor(ancestorId: string, nodeId: string): boolean {
  let cur = getById(nodeId)
  const a = String(ancestorId)
  let guard = 0
  while (cur && guard++ < 1000) {
    const pid = cur.parentSpace ? String(cur.parentSpace) : ''
    if (!pid) return false
    if (pid === a) return true
    cur = getById(pid)
  }
  return false
}

function canReparent(source: Space, target: Space | null): boolean {
  // Type rules
  if (source.type === 'Building') return false
  if (source.type === 'Floor') {
    if (!target) return false
    if (target.type !== 'Building') return false
  } else if (source.type === 'Room') {
    if (!target) return false
    if (target.type !== 'Floor') return false
  }
  // Prevent cycles
  const sid = String(source.id || (source as any)._id)
  if (!sid) return false
  const tid = target ? String(target.id || (target as any)._id) : ''
  if (tid && (tid === sid || isAncestor(sid, tid))) return false
  return true
}

function onNodeDragOver(e: DragEvent, targetNode: any) {
  const sourceId = dragSourceId.value
  if (!sourceId) return
  const source = getById(sourceId)
  const target = getById(getId(targetNode))
  if (source && target && canReparent(source, target)) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dragOverId.value = getId(targetNode)
  }
}
function onNodeDragLeave() { dragOverId.value = null }
async function onNodeDrop(e: DragEvent, targetNode: any) {
  e.preventDefault()
  const sourceId = dragSourceId.value
  dragOverId.value = null
  if (!sourceId) return
  const source = getById(sourceId)
  const target = getById(getId(targetNode))
  if (!source || !target) return
  if (!canReparent(source, target)) return
  await spacesStore.update({ ...(source as any), id: String(source.id || (source as any)._id), parentSpace: getId(targetNode) })
}

function onRootDragOver(e: DragEvent) {
  const sourceId = dragSourceId.value
  if (!sourceId) return
  const source = getById(sourceId)
  if (!source) return
  if (canReparent(source, null)) { e.preventDefault(); rootDragOver.value = true }
}
function onRootDragLeave() { rootDragOver.value = false }
async function onRootDrop(e: DragEvent) {
  e.preventDefault(); rootDragOver.value = false
  const sourceId = dragSourceId.value
  if (!sourceId) return
  const source = getById(sourceId)
  if (!source) return
  if (!canReparent(source, null)) return
  await spacesStore.update({ ...(source as any), id: String(source.id || (source as any)._id), parentSpace: '' })
}

// Download XLSX (filtered set)
function downloadSpacesXlsx() {
  try {
    const rows = filtered.value || []
    if (!rows.length) return

    // Helpers to compute hierarchy
    const byId = parentMap.value
    const getParentObj = (s: Space): Space | null => {
      const pid = s.parentSpace ? String(s.parentSpace) : ''
      return pid && byId[pid] ? byId[pid] : null
    }
    const firstAncestorOfType = (s: Space, type: string): Space | null => {
      let cur: Space | null = getParentObj(s)
      const want = String(type || '').toLowerCase()
      let guard = 0
      while (cur && guard++ < 1000) {
        if (String(cur.type || '').toLowerCase() === want) return cur
        cur = getParentObj(cur) as any
      }
      return null
    }

    // Round-trip-friendly columns
    const cols = [
      'id',
      'tag',
      'title',
      'type',
      'description',
      'attributes',
      // parent references (names aligned with importer candidates)
      'parent id',
      'parent tag',
      'parent title',
      // hierarchy (readable)
      'building',
      'building tag',
      'floor',
      'floor tag'
    ]

    const data = rows.map((s: Space) => {
      const id = String((s as any).id || (s as any)._id || '')
      const parent = getParentObj(s)
      const building = firstAncestorOfType(s, 'Building')
      const floor = firstAncestorOfType(s, 'Floor')
      return {
        id,
        tag: s.tag || '',
        title: s.title || '',
        type: s.type || '',
        description: (s as any).description || '',
        attributes: (Array.isArray((s as any).attributes) ? (s as any).attributes.map((a: any) => {
          const k = String(a && a.key != null ? a.key : '').trim()
          const v = String(a && a.value != null ? a.value : '').trim()
          return k || v ? (k ? `${k}: ${v}` : v) : ''
        }).filter(Boolean).join('; ') : ''),
        'parent id': parent ? String((parent as any).id || (parent as any)._id || '') : '',
        'parent tag': parent?.tag || '',
        'parent title': parent?.title || '',
        building: building?.title || '',
        'building tag': building?.tag || '',
        floor: floor?.title || '',
        'floor tag': floor?.tag || ''
      }
    })

    const ws = XLSX.utils.json_to_sheet(data, { header: cols })
    // Column widths
    ws['!cols'] = [
      { wch: 24 }, // id
      { wch: 14 }, // tag
      { wch: 30 }, // title
      { wch: 14 }, // type
      { wch: 60 }, // description
      { wch: 40 }, // attributes
      { wch: 24 }, // parent id
      { wch: 14 }, // parent tag
      { wch: 30 }, // parent title
      { wch: 30 }, // building
      { wch: 16 }, // building tag
      { wch: 30 }, // floor
      { wch: 16 }  // floor tag
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Spaces')
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dt = new Date()
    const projName = (projectStore.currentProject?.name || '').trim()
  const base = projName ? `spaces-${projName.replace(/[^a-z0-9-]+/gi, '_')}` : 'spaces'
    const fn = `${base}-${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}.xlsx`
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

// Upload Excel for bulk upsert
const fileInput = ref<HTMLInputElement | null>(null)
const uploadRef = ref<HTMLElement | null>(null)
const uploading = ref(false)

function triggerUpload() {
  fileInput.value?.click()
}

function normalizeType(input: string): string {
  const v = String(input || '').trim().toLowerCase()
  if (!v) return 'Room'
  const found = spaceTypes.find(t => t.toLowerCase() === v)
  if (found) return found
  if (v.includes('build')) return 'Building'
  if (v.includes('floor') || v === 'level') return 'Floor'
  if (v.includes('room')) return 'Room'
  if (v.includes('area')) return 'Area'
  if (v.includes('corridor') || v.includes('hall')) return 'Corridor'
  if (v.includes('roof')) return 'Roof'
  return 'Room'
}

function getVal(obj: any, candidates: string[]): any {
  const map: Record<string, any> = {}
  for (const k of Object.keys(obj || {})) {
    map[k.trim().toLowerCase()] = (obj as any)[k]
  }
  for (const c of candidates) {
    const key = c.trim().toLowerCase()
    if (key in map) return map[key]
  }
  return ''
}

type UploadRow = { id?: string; tag: string; title: string; type: string; description: string; parentRef: string; parentId?: string; attributes?: Array<{ key: string; value: string }> }
function normalizeRow(obj: Record<string, any>): UploadRow | null {
  const id = String(getVal(obj, ['id', '_id', 'space id', 'space_id'])).trim()
  const tag = String(getVal(obj, ['tag', 'space tag', 'space_tag'])).trim()
  const title = String(getVal(obj, ['title', 'name'])).trim()
  const type = normalizeType(String(getVal(obj, ['type', 'space type', 'space_type'])))
  const description = String(getVal(obj, ['description', 'desc', 'details'])).trim()
  const parentRef = String(getVal(obj, ['parentspace', 'parent space', 'parent', 'parent_title', 'parent title', 'parent_tag', 'parent tag'])).trim()
  const parentId = String(getVal(obj, ['parent id', 'parent_id', 'parentid'])).trim()
  // Parse attributes from common column names. Support JSON or semicolon-separated `key: value` lists.
  const rawAttrs = String(getVal(obj, ['attributes', 'attributes_json', 'attributes (json)', 'attr', 'attribute', 'attrs'])).trim()
  let parsedAttrs: Array<{ key: string; value: string }> = []
  if (rawAttrs) {
    // Try JSON first
    try {
      const parsed = JSON.parse(rawAttrs)
      if (Array.isArray(parsed)) {
        parsedAttrs = parsed.map((p: any) => ({ key: String(p?.key || p?.name || '') , value: String(p?.value || p?.val || '') }))
          .filter((a: any) => String(a.key || a.value).trim())
      } else if (parsed && typeof parsed === 'object') {
        parsedAttrs = Object.keys(parsed).map(k => ({ key: String(k), value: String(parsed[k]) }))
      }
    } catch (e) {
      // Not JSON; parse semicolon or comma separated key:value pairs
      const parts = rawAttrs.split(/;|,/) .map(p => String(p || '').trim()).filter(Boolean)
      for (const part of parts) {
        const sepIndex = part.indexOf(':') >= 0 ? part.indexOf(':') : (part.indexOf('=') >= 0 ? part.indexOf('=') : -1)
        if (sepIndex > -1) {
          const k = part.slice(0, sepIndex).trim()
          const v = part.slice(sepIndex + 1).trim()
          if (k || v) parsedAttrs.push({ key: k, value: v })
        } else {
          // value-only attribute
          parsedAttrs.push({ key: '', value: part })
        }
      }
    }
  }
  if (!title) return null
  return { id, tag, title, type, description, parentRef, parentId, attributes: parsedAttrs }
}

function toLowerKey(s?: string | null) { return (s || '').trim().toLowerCase() }

function typeAllowsParent(childType: string, parentType: string | null): boolean {
  const c = (childType || '').toLowerCase()
  const p = (parentType || '').toLowerCase()
  if (c === 'building') return false
  if (c === 'floor') return p === 'building'
  if (c === 'room') return p === 'floor'
  return true
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input?.files
  if (!files || files.length === 0) return
  const file = files[0]
  if (!projectStore.currentProjectId) { ui.showError('Select a project first'); return }
  try {
    uploading.value = true
    await spacesStore.fetchByProject(String(projectStore.currentProjectId))

    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) throw new Error('No sheets found in the uploaded file')
    const ws = wb.Sheets[sheetName]
    const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
    const rows = raw.map(normalizeRow).filter((r): r is UploadRow => !!r)
    if (!rows.length) { ui.showError('No valid rows found'); return }

    // Build maps of existing spaces (by id, by tag and by title)
    const byIdLocal = new Map<string, Space>()
    const byTag = new Map<string, Space>()
    const byTitle = new Map<string, Space>()
    for (const s of spaces.value) {
      const ikey = String((s.id || (s as any)._id) || '')
      if (ikey) byIdLocal.set(ikey, s)
      const tkey = toLowerKey(s.tag)
      const nkey = toLowerKey(s.title)
      if (tkey) byTag.set(tkey, s)
      if (nkey) byTitle.set(nkey, s)
    }

    let created = 0, updated = 0, skipped = 0, linked = 0, invalidParent = 0

    // Pass 1: upsert rows (ignore parent for now). Prefer ID if provided, else tag.
    for (const r of rows) {
      if (!r.title) { skipped++; continue }
      const rid = (r.id || '').trim()
      const tkey = toLowerKey(r.tag)
      const existing = (rid && byIdLocal.get(rid)) || (tkey ? byTag.get(tkey) : undefined)
      const payloadBase = {
        title: r.title,
        type: r.type,
        tag: r.tag || '',
        description: r.description || '',
        project: String(projectStore.currentProjectId),
        attributes: Array.isArray(r.attributes) && r.attributes.length ? r.attributes : []
      }
      if (existing) {
        const needsUpdate = (
          (existing.title || '') !== payloadBase.title ||
          (existing.type || '') !== payloadBase.type ||
          (existing.tag || '') !== payloadBase.tag ||
          (existing.description || '') !== payloadBase.description ||
          JSON.stringify(existing.attributes || []) !== JSON.stringify(payloadBase.attributes || [])
        )
        if (needsUpdate) {
          const saved = await spacesStore.update({ ...(existing as any), id: String(existing.id || (existing as any)._id), ...payloadBase })
          updated++
          const s = saved as Space
          const iid = String((s.id || (s as any)._id) || '')
          const nt = toLowerKey(s.tag)
          const nn = toLowerKey(s.title)
          if (iid) byIdLocal.set(iid, s)
          if (nt) byTag.set(nt, s)
          if (nn) byTitle.set(nn, s)
        }
      } else {
        const saved = await spacesStore.create(payloadBase as any)
        created++
        const s = saved as Space
        const iid = String((s.id || (s as any)._id) || '')
        const nt = toLowerKey(s.tag)
        const nn = toLowerKey(s.title)
        if (iid) byIdLocal.set(iid, s)
        if (nt) byTag.set(nt, s)
        if (nn) byTitle.set(nn, s)
      }
    }

    // Pass 2: link parents by id (preferred) or by tag/title
    for (const r of rows) {
      // Identify child by id if provided, else by tag, else by title
      const child = (r.id && byIdLocal.get(r.id)) || (r.tag ? byTag.get(toLowerKey(r.tag)) : byTitle.get(toLowerKey(r.title)))
      if (!child) continue
      // Determine parent
      let parent: Space | null = null
      const pidField = (r.parentId || '').trim()
      if (pidField && byIdLocal.has(pidField)) parent = byIdLocal.get(pidField) || null
      else if (r.parentRef) parent = byTag.get(toLowerKey(r.parentRef)) || byTitle.get(toLowerKey(r.parentRef)) || null
      if (!parent) { invalidParent++; continue }
      if (!typeAllowsParent(child.type || '', parent.type || null)) { invalidParent++; continue }
      const pid = String(parent.id || (parent as any)._id)
      const curPid = child.parentSpace ? String(child.parentSpace) : ''
      if (pid && pid !== curPid) {
        await spacesStore.update({ ...(child as any), id: String(child.id || (child as any)._id), parentSpace: pid })
        linked++
      }
    }

    await spacesStore.fetchByProject(String(projectStore.currentProjectId))
    ui.showSuccess(`Spaces import complete: ${created} created, ${updated} updated, ${linked} parent links, ${invalidParent} invalid parents, ${skipped} skipped`)
  } catch (err: any) {
    ui.showError(err?.message || 'Failed to import spaces')
  } finally {
    uploading.value = false
  try { (e.target as HTMLInputElement).value = '' } catch (e) { /* ignore */ }
  }
}
</script>
