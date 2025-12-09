<template>
  <section
    ref="pageSection"
    class="space-y-6 relative overflow-x-hidden"
  >
    <!-- header with breadcrumbs -->
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/' },
          { text: 'Equipment', to: '/equipment' }
        ]"
        title="Equipment"
      />
    </div>

    <!-- toolbar -->
    <div class="flex items-center gap-2 gap-y-2 flex-wrap w-full max-w-full">
      <div class="relative inline-block group shrink-0">
        <button
          :disabled="!projectStore.currentProjectId"
          aria-label="Add equipment"
          :title="projectStore.currentProjectId ? 'Add equipment' : 'Select a project'"
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
          {{ projectStore.currentProjectId ? 'Add equipment' : 'Select a project to add equipment' }}
        </div>
      </div>
      <div class="relative inline-block group shrink-0">
        <button
          :disabled="!projectStore.currentProjectId"
          aria-label="Upload equipment"
          :title="projectStore.currentProjectId ? 'Upload equipment from CSV/XLSX' : 'Select a project'"
          class="px-3 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40 gap-2"
          @click="showUploadDialog = true"
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
          <span class="text-sm">Upload</span>
        </button>
        <div
          role="tooltip"
          class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
        >
          Upload equipment from CSV/XLSX
        </div>
      </div>
      <div class="relative inline-block group shrink-0">
        <button
          :disabled="!projectStore.currentProjectId"
          aria-label="Download equipment"
          :title="projectStore.currentProjectId ? 'Download visible equipment as CSV' : 'Select a project'"
          class="px-3 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40 gap-2"
          @click="downloadEquipmentList"
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
          <span class="text-sm">Download</span>
        </button>
        <div
          role="tooltip"
          class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
        >
          Download filtered equipment as CSV
        </div>
      </div>
      <input
        v-model="search"
        type="text"
        placeholder="Search by tag, title or type"
        class="px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/50 w-full sm:w-64 flex-1 min-w-0"
      >
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
            class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
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
      <div class="flex items-center gap-2">
        <label class="text-white/70 text-sm">System</label>
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
            class="absolute left-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
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
              <span>{{ statusFilter || 'All' }}</span>
              <span :class="statusBadgeClassEquipment(statusFilter || 'All') + ' text-xs px-2 py-0.5 rounded-full'">{{ statusCount(statusFilter || 'All') }}</span>
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
            class="absolute right-0 mt-2 w-56 rounded-xl bg-white/10 backdrop-blur-xl border border-white/10 shadow-lg ring-1 ring-white/10 z-20"
            role="menu"
          >
            <div class="py-1">
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
                    :class="statusDotClassEquipment(opt.name)"
                  />
                  <span>{{ opt.name }}</span>
                </span>
                <span :class="statusBadgeClassEquipment(opt.name) + ' text-xs px-2 py-0.5 rounded-full'">{{ opt.count }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- list -->
    <div class="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-2 overflow-x-hidden">
      <div class="grid grid-cols-12 px-2 py-2 text-white/70 text-sm">
        <div class="col-span-1">
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
        <div class="col-span-3">
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
        <div class="col-span-1">
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
        <div class="col-span-1">
          <button
            type="button"
            class="flex items-center gap-2"
            @click="setSort('system')"
          >
            <span>System</span>
            <span
              v-if="sortKey==='system' && sortDir===1"
              class="text-xs"
            >▲</span>
            <span
              v-else-if="sortKey==='system' && sortDir===-1"
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
            @click="setSort('space')"
          >
            <span>Location (Space)</span>
            <span
              v-if="sortKey==='space' && sortDir===1"
              class="text-xs"
            >▲</span>
            <span
              v-else-if="sortKey==='space' && sortDir===-1"
              class="text-xs"
            >▼</span>
            <span
              v-else
              class="text-xs opacity-40"
            >⇅</span>
          </button>
        </div>
        <div class="col-span-1">
          <button
            type="button"
            class="flex items-center gap-2"
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
        </div>
        <div class="col-span-1 text-right">
          Actions
        </div>
      </div>
      <div class="divide-y divide-white/10">
        <div
          v-for="e in paged"
          :key="e.id"
          class="grid grid-cols-12 items-center px-2 py-2 text-white/90"
        >
          <div
            class="col-span-1 truncate"
            :title="e.tag"
          >
            {{ e.tag || '-' }}
          </div>
          <div
            class="col-span-3 truncate"
            :title="e.title"
          >
            {{ e.title }}
          </div>
          <div class="col-span-1 truncate">
            {{ e.type }}
          </div>
          <div class="col-span-1 truncate">
            {{ e.system || '-' }}
          </div>
        <div
          class="col-span-4 truncate text-sm"
          :title="equipmentSpaceChain(e)"
        >
          {{ equipmentSpaceChain(e) || '-' }}
        </div>
          <div class="col-span-1 truncate">
            {{ e.status || '-' }}
          </div>
          <div class="col-span-1 flex items-center justify-end gap-2">
            <RouterLink
              :to="{ name: 'equipment-edit', params: { id: e.id || (e as any)._id } }"
              class="w-8 h-8 grid place-items-center rounded-lg bg-white/6 hover:bg-white/10 text-white border border-white/10"
              aria-label="Open"
              :title="'Open ' + (e.title || e.tag)"
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
              @click="duplicateEquipment(e)"
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
              @click="openEdit(e)"
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
              @click="confirmRemove(e)"
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
        <div
          v-if="!loading && !Number(serverTotal) && !serverEquipment.length"
          class="p-6 text-white/60 text-center"
        >
          No equipment yet.
        </div>
        <div
          v-else-if="!loading && !filtered.length"
          class="p-6 text-white/60 text-center"
        >
          No matching equipment.
        </div>
        <div
          v-if="loading"
        >
          <Spinner />
        </div>
      </div>
      <!-- pagination controls -->
      <div
        v-if="filtered.length"
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
    </div>

    <!-- modal -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 grid place-items-center bg-black/50"
    >
      <div class="w-[640px] max-w-[95vw] rounded-xl border border-white/20 bg-white/10 backdrop-blur p-4 text-white">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">
            {{ editing ? 'Edit Equipment' : 'Create Equipment' }}
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
                required
                class="w-full px-3 py-2 rounded bg-white/10 border border-white/20"
              >
            </div>
            <div>
              <label class="text-sm text-white/70">Type</label>
              <div class="relative">
                <button
                  type="button"
                  class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-left flex items-center justify-between text-white/90"
                  @click="showModalTypeOptions"
                  @keydown.down.prevent="onModalTypeArrow(1)"
                  @keydown.up.prevent="onModalTypeArrow(-1)"
                  @keydown.enter.prevent="chooseHighlightedModalType"
                  @keydown.esc="hideModalTypeDropdown"
                  @blur="hideModalTypeDropdown"
                  @wheel.prevent="(e) => onModalTypeArrow(e.deltaY > 0 ? 1 : -1)"
                >
                  <span>{{ modalTypeOptions.find(opt => opt.value === form.type)?.text || form.type }}</span>
                  <svg
                    class="w-4 h-4 text-white/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  v-if="showModalTypeDropdown"
                  class="absolute left-0 right-0 mt-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-white/20 z-20 max-h-64 overflow-auto"
                >
                  <div class="py-1">
                    <button
                      v-for="(opt, i) in modalTypeOptions"
                      :key="opt.value"
                      type="button"
                      class="w-full px-3 py-2 text-left text-white/90"
                      :class="i === highlightedModalTypeIndex ? 'bg-white/20' : 'hover:bg-white/10'"
                      @click="selectModalType(opt.value)"
                    >
                      {{ opt.text }}
                    </button>
                  </div>
                </div>
              </div>
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
              <div class="relative">
                <button
                  type="button"
                  class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-left flex items-center justify-between text-white/90"
                  @click="showModalSystemOptions"
                  @keydown.down.prevent="onModalSystemArrow(1)"
                  @keydown.up.prevent="onModalSystemArrow(-1)"
                  @keydown.enter.prevent="chooseHighlightedModalSystem"
                  @keydown.esc="hideModalSystemDropdown"
                  @blur="hideModalSystemDropdown"
                  @wheel.prevent="(e) => onModalSystemArrow(e.deltaY > 0 ? 1 : -1)"
                >
                  <span>{{ modalSystemOptions.find(opt => opt.value === form.system)?.text || form.system || 'Select System' }}</span>
                  <svg
                    class="w-4 h-4 text-white/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  v-if="showModalSystemDropdown"
                  class="absolute left-0 right-0 mt-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-white/20 z-20 max-h-64 overflow-auto"
                >
                  <div class="py-1">
                    <button
                      v-for="(opt, i) in modalSystemOptions"
                      :key="opt.value"
                      type="button"
                      class="w-full px-3 py-2 text-left text-white/90"
                      :class="i === highlightedModalSystemIndex ? 'bg-white/20' : 'hover:bg-white/10'"
                      @click="selectModalSystem(opt.value)"
                    >
                      {{ opt.text }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label class="text-sm text-white/70">Status</label>
              <div class="relative">
                <button
                  type="button"
                  class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-left flex items-center justify-between text-white/90"
                  @click="showModalStatusOptions"
                  @keydown.down.prevent="onModalStatusArrow(1)"
                  @keydown.up.prevent="onModalStatusArrow(-1)"
                  @keydown.enter.prevent="chooseHighlightedModalStatus"
                  @keydown.esc="hideModalStatusDropdown"
                  @blur="hideModalStatusDropdown"
                  @wheel.prevent="(e) => onModalStatusArrow(e.deltaY > 0 ? 1 : -1)"
                >
                  <span>{{ form.status || 'Select Status' }}</span>
                  <svg
                    class="w-4 h-4 text-white/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  v-if="showModalStatusDropdown"
                  class="absolute left-0 right-0 mt-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-white/20 z-20 max-h-64 overflow-auto"
                >
                  <div class="py-1">
                    <button
                      v-for="(status, i) in statuses"
                      :key="status"
                      type="button"
                      class="w-full px-3 py-2 text-left text-white/90"
                      :class="i === highlightedModalStatusIndex ? 'bg-white/20' : 'hover:bg-white/10'"
                      @click="selectModalStatus(status)"
                    >
                      {{ status }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-span-2">
              <label class="text-sm text-white/70">Space</label>
              <div class="relative">
                <button
                  type="button"
                  class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-left flex items-center justify-between text-white/90"
                  @click="showModalSpaceOptions"
                  @keydown.down.prevent="onModalSpaceArrow(1)"
                  @keydown.up.prevent="onModalSpaceArrow(-1)"
                  @keydown.enter.prevent="chooseHighlightedModalSpace"
                  @keydown.esc="hideModalSpaceDropdown"
                  @blur="hideModalSpaceDropdown"
                  @wheel.prevent="(e) => onModalSpaceArrow(e.deltaY > 0 ? 1 : -1)"
                >
                  <span>{{ (form as any).spaceId ? parentOptions.find(p => p.id === (form as any).spaceId)?.title + ' (' + parentOptions.find(p => p.id === (form as any).spaceId)?.type + ')' : 'None' }}</span>
                  <svg
                    class="w-4 h-4 text-white/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <div
                  v-if="showModalSpaceDropdown"
                  class="absolute left-0 right-0 mt-1 rounded-xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-xl ring-1 ring-white/20 z-20 max-h-64 overflow-auto"
                >
                  <div class="py-1">
                    <button
                      type="button"
                      class="w-full px-3 py-2 text-left text-white/90"
                      :class="highlightedModalSpaceIndex === -1 ? 'bg-white/20' : 'hover:bg-white/10'"
                      @click="selectModalSpace('')"
                    >
                      None
                    </button>
                    <button
                      v-for="(p, i) in parentOptions"
                      :key="p.id"
                      type="button"
                      class="w-full px-3 py-2 text-left text-white/90"
                      :class="i === highlightedModalSpaceIndex ? 'bg-white/20' : 'hover:bg-white/10'"
                      @click="p.id && selectModalSpace(p.id)"
                    >
                      {{ p.title }} ({{ p.type }})
                    </button>
                  </div>
                </div>
              </div>
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

    <!-- Upload equipment modal -->
    <Modal
      v-model="showUploadDialog"
      :panel-class="'max-w-3xl'"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="text-lg">
            Upload equipment
          </div>
        </div>
      </template>
      <div class="space-y-4">
        <div class="text-sm text-white/70">
          Upload a CSV/XLSX with columns: <span class="font-medium">tag</span>, <span class="font-medium">type</span>,
          <span class="font-medium">title</span>, <span class="font-medium">system</span> (optional, default Mechanical),
          <span class="font-medium">status</span> (optional, default Not Started), <span class="font-medium">space</span> (optional),
          <span class="font-medium">description</span> (optional), <span class="font-medium">components</span> (optional JSON),
          <span class="font-medium">checklists</span> (optional JSON), <span class="font-medium">functional tests</span> (optional JSON).
        </div>
        <div>
          <div class="flex items-center justify-between gap-3">
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              class="block w-full text-sm"
              @change="onUploadFileChange"
            >
            <button
              type="button"
              class="shrink-0 px-2 py-1.5 text-xs rounded-md bg-white/10 hover:bg-white/15 border border-white/15 text-white"
              @click="downloadUploadTemplate"
            >
              Download CSV template
            </button>
          </div>
          <div
            v-if="uploadFileName"
            class="mt-1 text-xs text-white/60"
          >
            Selected: {{ uploadFileName }}
          </div>
        </div>
        <div
          v-if="validUploadRows.length"
          class="flex items-center gap-3 text-sm"
        >
          <div class="text-white/70">
            When tag exists:
          </div>
          <label class="inline-flex items-center gap-2">
            <input
              v-model="duplicateMode"
              type="radio"
              value="update"
              class="accent-emerald-400"
            >
            <span>Update existing</span>
          </label>
          <label class="inline-flex items-center gap-2">
            <input
              v-model="duplicateMode"
              type="radio"
              value="skip"
              class="accent-emerald-400"
            >
            <span>Skip row</span>
          </label>
        </div>
        <div
          v-if="uploadParsing"
          class="text-sm text-white/70"
        >
          Parsing…
        </div>
        <div
          v-if="uploadError"
          class="text-sm text-red-300"
        >
          {{ uploadError }}
        </div>

        <div
          v-if="uploadRows.length"
          class="rounded-md bg-white/5 border border-white/10"
        >
          <div class="px-3 py-2 text-xs text-white/60 flex items-center justify-between">
            <div>
              <span class="text-white/80">{{ uploadRows.length }}</span> rows parsed.
              <span
                v-if="uploadDuplicateTags.length"
                class="ml-2"
              >Duplicates: {{ uploadDuplicateTags.length }}</span>
              <span
                v-if="uploadInvalidRowsCount"
                class="ml-2"
              >Invalid: {{ uploadInvalidRowsCount }}</span>
              <span
                v-if="validUploadRows.length"
                class="ml-2"
              >Create: {{ plannedCreateCount }}</span>
              <span
                v-if="validUploadRows.length"
                class="ml-2"
              >Update: {{ plannedUpdateCount }}</span>
              <span
                v-if="validUploadRows.length && duplicateMode === 'skip'"
                class="ml-2"
              >Skip: {{ plannedSkipCount }}</span>
            </div>
          </div>
          <div class="max-h-64 overflow-auto">
            <table class="min-w-full text-xs">
              <thead class="bg-white/5 text-white/70">
                <tr>
                  <th class="px-2 py-1 text-left">
                    Tag
                  </th>
                  <th class="px-2 py-1 text-left">
                    Type
                  </th>
                  <th class="px-2 py-1 text-left">
                    Title
                  </th>
                  <th class="px-2 py-1 text-left">
                    System
                  </th>
                  <th class="px-2 py-1 text-left">
                    Status
                  </th>
                  <th class="px-2 py-1 text-left">
                    Space
                  </th>
                  <th class="px-2 py-1 text-left">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(r, i) in uploadRows.slice(0, 10)"
                  :key="i"
                  class="border-t border-white/10"
                >
                  <td class="px-2 py-1">
                    {{ r.tag }}
                  </td>
                  <td class="px-2 py-1">
                    {{ r.type }}
                  </td>
                  <td class="px-2 py-1 truncate">
                    {{ r.title }}
                  </td>
                  <td class="px-2 py-1">
                    {{ r.system }}
                  </td>
                  <td class="px-2 py-1">
                    {{ r.status }}
                  </td>
                  <td class="px-2 py-1 truncate">
                    {{ r.space }}
                  </td>
                  <td class="px-2 py-1">
                    <span
                      v-if="rowAction(r) === 'create'"
                      class="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-100"
                    >Create</span>
                    <span
                      v-else-if="rowAction(r) === 'update'"
                      class="inline-block px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-100"
                    >Update</span>
                    <span
                      v-else
                      class="inline-block px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/70"
                    >Skip</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="uploadRows.length > 10"
            class="px-3 py-1 text-xs text-white/60"
          >
            +{{ uploadRows.length - 10 }} more…
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-between gap-3">
          <div
            v-if="uploadDuplicateTags.length"
            class="text-xs text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-md px-2 py-1"
          >
            <template v-if="duplicateMode === 'update'">
              Duplicate tags detected. Matching rows will update existing equipment.
            </template>
            <template v-else>
              Duplicate tags detected. Matching rows will be skipped.
            </template>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
              @click="showUploadDialog = false"
            >
              Cancel
            </button>
            <button
              :disabled="creating || validUploadRows.length === 0"
              class="px-3 py-2 rounded-md border text-emerald-100 hover:bg-emerald-500/20"
              :class="[(creating || validUploadRows.length === 0) ? 'opacity-60 cursor-not-allowed' : '', uploadDuplicateTags.length ? 'bg-amber-500/10 border-amber-400/40 text-amber-100 hover:bg-amber-500/20' : 'bg-emerald-500/20 border-emerald-400/50']"
              @click="submitUploadCreate"
            >
              <span v-if="creating">Processing…</span>
              <span v-else>Import</span>
            </button>
          </div>
        </div>
      </template>
    </Modal>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import Spinner from '../../components/Spinner.vue'
import http from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'
import { getApiBase } from '../../utils/api'
import { useProjectStore } from '../../stores/project'
import { useAuthStore } from '../../stores/auth'
import { useSpacesStore } from '../../stores/spaces'
import { useEquipmentStore, type Equipment } from '../../stores/equipment'
import lists from '../../lists.js'
import { useUiStore } from '../../stores/ui'
import { confirm as inlineConfirm } from '../../utils/confirm'
import Modal from '../../components/Modal.vue'
import * as XLSX from 'xlsx'

const projectStore = useProjectStore()
const auth = useAuthStore()
const spacesStore = useSpacesStore()
const equipmentStore = useEquipmentStore()
const ui = useUiStore()

const statuses = ['Ordered','Shipped','In Storage','Installed','Tested','Operational','Not Started']

const search = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const systemFilter = ref('')
const serverTypes = ref<string[]>([])
const serverStatuses = ref<string[]>([])
const serverSystems = ref<string[]>([])
const serverTypeCounts = ref<Record<string, number>>({})
const serverStatusCounts = ref<Record<string, number>>({})
const serverSystemCounts = ref<Record<string, number>>({})
const modalOpen = ref(false)
const editing = ref(false)
const form = ref<Equipment>({ tag: '', title: '', type: '', system: '', status: 'Not Started', description: '', projectId: '' })
const creating = ref(false)
const duplicateMode = ref<'update' | 'skip'>('update')

const equipment = computed(() => equipmentStore.items)
const loading = computed(() => equipmentStore.loading)

const parentMap = computed(() => spacesStore.byId)
function spaceName(spaceId?: string | null) {
  const pid = spaceId ? String(spaceId) : ''
  return pid && parentMap.value[pid] ? parentMap.value[pid].title : ''
}

function equipmentSpaceChain(e?: any) {
  if (!e) return ''
  const chain = String((e as any).spaceChain || '').trim()
  if (chain) return chain
  const sid = (e as any).spaceId || (e as any).space
  return spaceParentChainLabelById(sid)
}

function spaceParentChainLabelById(spaceId?: string | null) {
  try {
    const pid = spaceId ? String(spaceId) : ''
    if (!pid) return ''
    let cur: any = parentMap.value[pid] || (spacesStore.items || []).find((s: any) => String(s.id || s._id) === pid)
    if (!cur) return ''
    const parts: string[] = []
    let depth = 0
    while (cur && depth < 20) {
      const title = String(cur.title || cur.tag || '')
      if (title) parts.unshift(title)
      const parentId = cur.parentSpace || cur.parent || null
      if (!parentId) break
      cur = parentMap.value[String(parentId)] || (spacesStore.items || []).find((x: any) => String(x.id || x._id) === String(parentId))
      depth++
    }
    return parts.join(' > ')
  } catch (e) {
    return ''
  }
}

// Use server-provided page when available; otherwise fall back to full store list
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const s = statusFilter.value
  const sys = systemFilter.value
  const baseList = (Array.isArray(serverEquipment.value) && serverEquipment.value.length > 0) ? listEquipment.value : equipment.value
  return (baseList || []).filter(e => {
    if (t && e.type !== t) return false
    if (s && e.status !== s) return false
    if (sys && String(e.system || '').toLowerCase() !== String(sys)) return false
    if (!q) return true
    const fields = [e.tag || '', e.title || '', e.type || '', e.system || ''].map(f => f.toLowerCase())
    return fields.some(f => f.includes(q))
  })
})

// Sorting state for equipment table
const sortKey = ref('')
const sortDir = ref(1) // 1 = asc, -1 = desc

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const arr = [...filtered.value]
  arr.sort((a: any, b: any) => {
    let av: string
    let bv: string
    if (sortKey.value === 'space') {
      av = String(equipmentSpaceChain(a) || '').toLowerCase()
      bv = String(equipmentSpaceChain(b) || '').toLowerCase()
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

// Persist list view state (search/sort/filters) per project to sessionStorage
const stateStorageKey = computed(() => `equipmentListState:${projectStore.currentProjectId || 'global'}`)
function loadListState() {
  try {
    const raw = sessionStorage.getItem(stateStorageKey.value)
    if (!raw) return
    const data = JSON.parse(raw)
    if (data && typeof data === 'object') {
      if (typeof data.search === 'string') search.value = data.search
      if (typeof data.typeFilter === 'string') typeFilter.value = data.typeFilter
      if (typeof data.statusFilter === 'string') statusFilter.value = data.statusFilter
      if (typeof data.systemFilter === 'string') systemFilter.value = data.systemFilter
      if (typeof data.sortKey === 'string') sortKey.value = data.sortKey
      if (data.sortDir === 1 || data.sortDir === -1) sortDir.value = data.sortDir
    }
  } catch (e) { /* ignore parse/storage errors */ }
}
function persistListState() {
  try {
    const payload = {
      search: search.value,
      typeFilter: typeFilter.value,
      statusFilter: statusFilter.value,
      systemFilter: systemFilter.value,
      sortKey: sortKey.value,
      sortDir: sortDir.value
    }
    sessionStorage.setItem(stateStorageKey.value, JSON.stringify(payload))
  } catch (e) { /* ignore storage errors */ }
}
watch(stateStorageKey, () => loadListState(), { immediate: true })
watch([search, typeFilter, statusFilter, systemFilter, sortKey, sortDir], () => persistListState())

const parentOptions = computed(() => spacesStore.items)

// options sourced from lists.js
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const filterTypeOptions = computed(() => {
  const base: Array<{ value: string; text: string }> = [{ value: '', text: 'All' }]
  const arr: Array<any> = (lists as any)?.equipmentTypes || []
  const seen = new Set<string>()
  for (const opt of arr) {
    if (!opt || !opt.value) continue
    if (seen.has(opt.value)) continue
    seen.add(String(opt.value))
    base.push({ value: String(opt.value), text: String(opt.text ?? opt.value) })
  }
  return base
})

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

// system filter options with counts based on current search/type/status filters
// server-driven page for equipment list
const serverEquipment = ref([])
const serverTotal = ref(0)
const serverTotalAll = ref(0)
const listEquipment = computed(() => serverEquipment.value)

const preSystemFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const s = statusFilter.value
  const base = listEquipment.value || []
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
  if (!Object.keys(m).length && Array.isArray(serverEquipment.value) && serverEquipment.value.length) {
    for (const e of serverEquipment.value as any[]) {
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const systemFilterOptions = computed(() => {
  const base: Array<{ value: string; text: string }> = [{ value: '', text: 'All' }]
  const seen = new Set<string>()
  const entries = Object.entries(systemCounts.value || {})
  for (const [val, cnt] of entries) {
    if (!val) continue
    const valLower = String(val).toLowerCase()
    if (seen.has(valLower)) continue
    seen.add(valLower)
    const label = (lists as any)?.systemOptions?.find((o: any) => String(o.value).toLowerCase() === valLower)?.text || valLower
    base.push({ value: valLower, text: `${label} (${cnt})` })
  }
  // Add any configured systems not already present
  const arr: Array<any> = (lists as any)?.systemOptions || []
  for (const opt of arr) {
    if (!opt || opt.value === undefined || opt.value === null) continue
    const valLower = String(opt.value).toLowerCase()
    if (seen.has(valLower)) continue
    base.push({ value: valLower, text: `${String(opt.text ?? opt.value)}` })
  }
  return base
})

// Custom dropdown menus (Type/System/Status) like IssuesList.vue
const showTypeMenu = ref(false)
const showSystemMenu = ref(false)
const showStatusMenu = ref(false)
const typeMenuRef = ref<HTMLElement | null>(null)
const systemMenuRef = ref<HTMLElement | null>(null)
const statusMenuRef = ref<HTMLElement | null>(null)

// Modal dropdown state
const showModalTypeDropdown = ref(false)
const showModalSystemDropdown = ref(false)
const showModalStatusDropdown = ref(false)
const showModalSpaceDropdown = ref(false)
const highlightedModalTypeIndex = ref(-1)
const highlightedModalSystemIndex = ref(-1)
const highlightedModalStatusIndex = ref(-1)
const highlightedModalSpaceIndex = ref(-1)

function toggleTypeMenu() { showTypeMenu.value = !showTypeMenu.value }
function closeTypeMenu() { showTypeMenu.value = false }
function toggleSystemMenu() { showSystemMenu.value = !showSystemMenu.value }
function closeSystemMenu() { showSystemMenu.value = false }
function toggleStatusMenu() { showStatusMenu.value = !showStatusMenu.value }
function closeStatusMenu() { showStatusMenu.value = false }

function handleClickOutside(e: MouseEvent) {
  const tEl = typeMenuRef.value
  const sEl = systemMenuRef.value
  const stEl = statusMenuRef.value
  const target = e.target as Node
  if (tEl && !tEl.contains(target)) closeTypeMenu()
  if (sEl && !sEl.contains(target)) closeSystemMenu()
  if (stEl && !stEl.contains(target)) closeStatusMenu()
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

// Modal Type dropdown functions
function showModalTypeOptions() {
  showModalTypeDropdown.value = true
  highlightedModalTypeIndex.value = modalTypeOptions.value.findIndex(opt => opt.value === form.value.type)
}

function hideModalTypeDropdown() {
  setTimeout(() => {
    showModalTypeDropdown.value = false
    highlightedModalTypeIndex.value = -1
  }, 150)
}

function onModalTypeArrow(direction: number) {
  if (!showModalTypeDropdown.value) {
    showModalTypeOptions()
    return
  }
  const newIndex = Math.max(0, Math.min(modalTypeOptions.value.length - 1, highlightedModalTypeIndex.value + direction))
  highlightedModalTypeIndex.value = newIndex
}

function chooseHighlightedModalType() {
  if (highlightedModalTypeIndex.value >= 0 && highlightedModalTypeIndex.value < modalTypeOptions.value.length) {
    selectModalType(modalTypeOptions.value[highlightedModalTypeIndex.value].value)
  }
}

function selectModalType(type: string) {
  form.value.type = type
  hideModalTypeDropdown()
}

// Modal System dropdown functions
function showModalSystemOptions() {
  showModalSystemDropdown.value = true
  highlightedModalSystemIndex.value = modalSystemOptions.value.findIndex(opt => opt.value === form.value.system)
}

function hideModalSystemDropdown() {
  setTimeout(() => {
    showModalSystemDropdown.value = false
    highlightedModalSystemIndex.value = -1
  }, 150)
}

function onModalSystemArrow(direction: number) {
  if (!showModalSystemDropdown.value) {
    showModalSystemOptions()
    return
  }
  const newIndex = Math.max(0, Math.min(modalSystemOptions.value.length - 1, highlightedModalSystemIndex.value + direction))
  highlightedModalSystemIndex.value = newIndex
}

function chooseHighlightedModalSystem() {
  if (highlightedModalSystemIndex.value >= 0 && highlightedModalSystemIndex.value < modalSystemOptions.value.length) {
    selectModalSystem(modalSystemOptions.value[highlightedModalSystemIndex.value].value)
  }
}

function selectModalSystem(system: string) {
  form.value.system = system
  hideModalSystemDropdown()
}

// Modal Status dropdown functions
function showModalStatusOptions() {
  showModalStatusDropdown.value = true
  highlightedModalStatusIndex.value = statuses.findIndex(status => status === form.value.status)
}

function hideModalStatusDropdown() {
  setTimeout(() => {
    showModalStatusDropdown.value = false
    highlightedModalStatusIndex.value = -1
  }, 150)
}

function onModalStatusArrow(direction: number) {
  if (!showModalStatusDropdown.value) {
    showModalStatusOptions()
    return
  }
  const newIndex = Math.max(0, Math.min(statuses.length - 1, highlightedModalStatusIndex.value + direction))
  highlightedModalStatusIndex.value = newIndex
}

function chooseHighlightedModalStatus() {
  if (highlightedModalStatusIndex.value >= 0 && highlightedModalStatusIndex.value < statuses.length) {
    selectModalStatus(statuses[highlightedModalStatusIndex.value])
  }
}

function selectModalStatus(status: string) {
  form.value.status = status as any
  hideModalStatusDropdown()
}

// Modal Space dropdown functions
function showModalSpaceOptions() {
  showModalSpaceDropdown.value = true
  highlightedModalSpaceIndex.value = parentOptions.value.findIndex(opt => opt.id === (form.value as any).spaceId)
}

function hideModalSpaceDropdown() {
  setTimeout(() => {
    showModalSpaceDropdown.value = false
    highlightedModalSpaceIndex.value = -1
  }, 150)
}

function onModalSpaceArrow(direction: number) {
  if (!showModalSpaceDropdown.value) {
    showModalSpaceOptions()
    return
  }
  const newIndex = Math.max(-1, Math.min(parentOptions.value.length - 1, highlightedModalSpaceIndex.value + direction))
  highlightedModalSpaceIndex.value = newIndex
}

function chooseHighlightedModalSpace() {
  if (highlightedModalSpaceIndex.value === -1) {
    selectModalSpace('')
  } else if (highlightedModalSpaceIndex.value >= 0 && highlightedModalSpaceIndex.value < parentOptions.value.length) {
    const spaceId = parentOptions.value[highlightedModalSpaceIndex.value].id
    if (spaceId) selectModalSpace(spaceId)
  }
}

function selectModalSpace(spaceId: string) {
  (form.value as any).spaceId = spaceId
  hideModalSpaceDropdown()
}

// Counts and option lists for Type/System/Status
const preTypeFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const sys = systemFilter.value
  const s = statusFilter.value
  return equipment.value.filter(e => {
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
  // 1) prefer server-provided facet counts when they exist
  if (Object.keys(serverCounts).length) {
    for (const [k, v] of Object.entries(serverCounts)) {
      const key = String(k || '')
      if (!key) continue
      m[key] = Number(v) || 0
    }
  }
  // 2) fall back to deriving from the current server page if no server counts were returned
  if (!Object.keys(m).length && Array.isArray(serverEquipment.value) && serverEquipment.value.length) {
    for (const e of serverEquipment.value as any[]) {
      const key = String((e as any).type || '').trim()
      if (!key) continue
      m[key] = (m[key] || 0) + 1
    }
  }
  // 3) final fallback to the in-store list (covers offline cases)
  if (!Object.keys(m).length) {
    for (const e of preTypeFiltered.value) {
      const key = String(e.type || '').trim()
      if (!key) continue
      m[key] = (m[key] || 0) + 1
    }
  }
  m['All'] = Number(serverTotalAll.value || serverTotal.value || 0) || preTypeFiltered.value.length
  return m
})
const typeOptions = computed<Array<{ name: string; count: number }>>(() => {
  const opts: Array<{ name: string; count: number }> = []
  const counts = typeCounts.value
  const names = serverTypes.value.length
    ? serverTypes.value
    : Object.keys(counts).filter(k => k !== 'All')
  for (const name of names) {
    if (!name) continue
    const count = counts[name] || 0
    opts.push({ name, count })
  }
  // sort alphabetically
  opts.sort((a, b) => a.name.localeCompare(b.name))
  // Put All first
  return [{ name: 'All', count: counts['All'] || preTypeFiltered.value.length }, ...opts]
})
function typeCount(name: string) {
  const opt = (typeOptions.value || []).find(o => o.name === name)
  return opt ? opt.count : 0
}

const systemOptions = computed<Array<{ name: string; value: string; count: number }>>(() => {
  const opts: Array<{ name: string; value: string; count: number }> = []
  const mappingArr: Array<any> = (lists as any)?.systemOptions || []
  const labelFor = (val: string) => {
    const valLower = String(val || '').toLowerCase()
    const found = mappingArr.find((o: any) => o && o.value !== undefined && String(o.value).toLowerCase() === valLower)
    return found ? String(found.text ?? found.value) : val
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

const preStatusFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const t = typeFilter.value
  const sys = systemFilter.value
  return equipment.value.filter(e => {
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
  if (!Object.keys(m).length && Array.isArray(serverEquipment.value) && serverEquipment.value.length) {
    for (const e of serverEquipment.value as any[]) {
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
  const counts = statusCounts.value
  const names = serverStatuses.value.length ? serverStatuses.value : Object.keys(counts).filter(k => k !== 'All')
  for (const name of names) {
    if (!name) continue
    const count = counts[name] || 0
    opts.push({ name, count })
  }
  // Sort by our known statuses order if present, else alpha
  const order = statuses.slice()
  opts.sort((a, b) => {
    const ia = order.indexOf(a.name)
    const ib = order.indexOf(b.name)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.name.localeCompare(b.name)
  })
  return [{ name: 'All', count: preStatusFiltered.value.length }, ...opts]
})
function statusCount(name: string) {
  const opt = (statusOptions.value || []).find(o => o.name === name)
  return opt ? opt.count : 0
}
function statusDotClassEquipment(s: string) {
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
function statusBadgeClassEquipment(s: string) {
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
// derive default page size from user profile preference, then project settings with a fallback of 10
const defaultPageSize = computed(() => {
  const fallback = 10
  try {
    const pval = auth && auth.user && auth.user.contact && auth.user.contact.perPage
    if (typeof pval === 'number' && !isNaN(pval)) return Math.max(1, Number(pval))
  } catch (e) { /* ignore */ }

  const p: any = projectStore.currentProject as any
  if (!p) return fallback
  const numericCandidates = [p.equipmentPageSize, p.listPageSize, p.pageSize, p.defaultPageSize]
  const foundNum = numericCandidates.find((v: any) => typeof v === 'number' && !isNaN(v))
  if (foundNum !== undefined) return Math.max(1, Number(foundNum))
  const foundStr = numericCandidates.find((v: any) => typeof v === 'string' && /^\d+$/.test(v))
  if (foundStr !== undefined) return Math.max(1, parseInt(foundStr as string, 10))
  const settings = p?.settings
  if (Array.isArray(settings)) {
    const entry = settings.find((s: any) => typeof s === 'string' && /equipmentPageSize\s*[:=]\s*\d+/.test(s))
    if (entry) {
      const m = String(entry).match(/(\d+)/)
      if (m) return Math.max(1, parseInt(m[1], 10))
    }
    const entry2 = settings.find((s: any) => typeof s === 'string' && /listPageSize\s*[:=]\s*\d+/.test(s))
    if (entry2) {
      const m = String(entry2).match(/(\d+)/)
      if (m) return Math.max(1, parseInt(m[1], 10))
    }
  } else if (settings && typeof settings === 'object') {
    const n = (settings as any).equipmentPageSize || (settings as any).listPageSize
    if (n && !isNaN(Number(n))) return Math.max(1, Number(n))
  }
  return fallback
})
const pageSize = ref(defaultPageSize.value)
const pageSizes = [10, 20, 50, 100]

// Persist per-page (equipment) page size preference for the current session
const pageSizeStorageKey = computed(() => `equipmentPageSize:${projectStore.currentProjectId || 'global'}`)
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
const totalFiltered = computed(() => Number(serverTotal.value || 0) || filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil((totalFiltered.value || 0) / pageSize.value)))
const paged = computed(() => {
  const list = sorted.value || []
  const total = Number(serverTotal.value || 0)
  const pageLen = Array.isArray(serverEquipment.value) ? serverEquipment.value.length : 0
  // If server returned a paged result (total larger than page length), return server page as-is
  if (total > pageLen) return list
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return list.slice(start, end)
})
const displayTotal = computed(() => Number(serverTotalAll.value || serverTotal.value || 0))
const startItem = computed(() => totalFiltered.value ? (page.value - 1) * pageSize.value + 1 : 0)
const endItem = computed(() => Math.min(totalFiltered.value, page.value * pageSize.value))
function prevPage() { if (page.value > 1) page.value-- }
function nextPage() { if (page.value < totalPages.value) page.value++ }

function openCreate() {
  editing.value = false
  form.value = { tag: '', title: '', type: '', system: '', status: 'Not Started', description: '', projectId: projectStore.currentProjectId || '' }
  modalOpen.value = true
}

function openEdit(e: Equipment) {
  editing.value = true
  form.value = { ...e, id: e.id || (e as any)._id }
  modalOpen.value = true
}

function closeModal() { 
  modalOpen.value = false
  // Reset dropdown states
  showModalTypeDropdown.value = false
  showModalSystemDropdown.value = false
  showModalStatusDropdown.value = false
  showModalSpaceDropdown.value = false
  highlightedModalTypeIndex.value = -1
  highlightedModalSystemIndex.value = -1
  highlightedModalStatusIndex.value = -1
  highlightedModalSpaceIndex.value = -1
}

async function save() {
  try {
    if (!form.value.title || !form.value.tag || !form.value.type) throw new Error('Tag, Title and Type are required')
    if (!form.value.projectId) form.value.projectId = projectStore.currentProjectId || ''
    if (editing.value && form.value.id) {
      await equipmentStore.update(form.value as Equipment & { id: string })
      ui.showSuccess('Equipment updated')
    } else {
      await equipmentStore.create(form.value as Equipment)
      ui.showSuccess('Equipment created')
    }
    modalOpen.value = false
  } catch (e: any) {
    // You can hook into a toast here if desired
    console.error(e)
  }
}

async function confirmRemove(e: Equipment) {
  if (!e.id) e.id = (e as any)._id
  if (!e.id) return
  await new Promise(r => setTimeout(r))
  const confirmed = await inlineConfirm({
    title: 'Delete equipment',
    message: `Delete "${e.title || e.tag || 'this equipment'}"? This cannot be undone.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!confirmed) return
  await equipmentStore.remove(String(e.id))
  ui.showSuccess('Equipment deleted')
}

watch(() => projectStore.currentProjectId, async (id) => {
  if (!id) return
  // Clear stale lists when switching projects
  serverEquipment.value = []
  serverTotal.value = 0
  equipmentStore.items = []
  // load spaces for dropdown and names
  await spacesStore.fetchByProject(String(id))
  // fetch paged equipment from server for list view
  pageSize.value = defaultPageSize.value
  page.value = 1
  fetchEquipmentPage(String(id)).catch(() => {})
}, { immediate: true })

// reset pagination when page size changes
watch(pageSize, () => {
  page.value = 1
})

function nextDuplicateTag(tag: string): string {
  const s = String(tag || '').trim()
  if (!s) return ''
  const m = s.match(/^(.*?)-(\d+)$/)
  const base = m ? m[1] : s
  let n = m ? (isFinite(parseInt(m[2], 10)) ? parseInt(m[2], 10) + 1 : 1) : 1
  const existing = new Set((equipment.value || []).map(it => String(it?.tag || '').trim()).filter(Boolean))
  let candidate = `${base}-${n}`
  while (existing.has(candidate)) { n += 1; candidate = `${base}-${n}` }
  return candidate
}

async function duplicateEquipment(e: Equipment) {
  try {
    const srcId = String(e.id || (e as any)._id || '')
    const projectId = String((e as any).projectId || projectStore.currentProjectId || '')
    if (!projectId || !srcId) { ui.showError('Missing project or item'); return }
    const newTag = nextDuplicateTag(String(e.tag || ''))
    let created: any = null
    // Prefer server-side duplication; if not available, fallback locally
    const hasStoreDuplicate = typeof (equipmentStore as any).duplicate === 'function'
    if (hasStoreDuplicate) {
      created = await (equipmentStore as any).duplicate(srcId, { tag: newTag })
    } else {
      // Local fallback: fetch full record, deep-copy, and create
      let src: any = (equipmentStore as any).byId?.[srcId]
      if (!src) src = await equipmentStore.fetchOne(srcId)
      if (!src) throw new Error('Source equipment not found')
      // build payload by shallow-copying src and removing internal fields we don't want to copy
      const payloadObj = { ...src }
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
      created = await equipmentStore.create(payload as Equipment)
    }
    if (created) ui.showSuccess(`Duplicated as ${created.tag}`)
  } catch (err: any) {
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to duplicate')
  }
}

// Upload equipment logic
const showUploadDialog = ref(false)
const uploadParsing = ref(false)
const uploadFileName = ref('')
const uploadError = ref('')
type UploadRow = { tag: string; type: string; title: string; system?: string; status?: string; space?: string; description?: string; components?: string; checklists?: string; functionaltests?: string }
const uploadRows = ref<UploadRow[]>([])

function normalizeHeader(h: any): string { return String(h || '').trim().toLowerCase() }

function onUploadFileChange(e: Event) {
  uploadError.value = ''
  uploadRows.value = []
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  uploadFileName.value = file.name
  uploadParsing.value = true
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = reader.result as ArrayBuffer
      const wb = XLSX.read(data, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[]
      const rows: UploadRow[] = []
      for (const obj of json) {
        const m: Record<string, any> = {}
        for (const k of Object.keys(obj)) m[normalizeHeader(k)] = obj[k]
        rows.push({
          tag: String(m['tag'] || '').trim(),
          type: String(m['type'] || '').trim(),
          title: String(m['title'] || '').trim(),
          system: String(m['system'] || '').trim(),
          status: String(m['status'] || '').trim(),
          space: String(m['space'] || '').trim(),
          description: String(m['description'] || '').trim(),
          components: String(m['components'] || '').trim(),
          checklists: String(m['checklists'] || '').trim(),
          functionaltests: String(m['functional tests'] || m['functionaltests'] || '').trim(),
        })
      }
      uploadRows.value = rows
    } catch (err: any) {
      uploadError.value = err?.message || 'Failed to parse file'
    } finally {
      uploadParsing.value = false
    }
  }
  reader.onerror = () => { uploadParsing.value = false; uploadError.value = 'Failed to read file' }
  reader.readAsArrayBuffer(file)
}

const existingProjectTagSet = computed<Set<string>>(() => {
  const pid = String(projectStore.currentProjectId || '')
  const set = new Set<string>()
  const list = Array.isArray(listEquipment.value) ? listEquipment.value : []
  for (const e of list) {
    if (String((e as any).projectId || '') !== pid) continue
    const t = String((e as any).tag || '').trim().toLowerCase()
    if (t) set.add(t)
  }
  return set
})
const existingByTagLower = computed<Map<string, any>>(() => {
  const pid = String(projectStore.currentProjectId || '')
  const map = new Map<string, any>()
  const list = Array.isArray(listEquipment.value) ? listEquipment.value : []
  for (const e of list) {
    if (String((e as any).projectId || '') !== pid) continue
    const t = String((e as any).tag || '').trim().toLowerCase()
    if (t && !map.has(t)) map.set(t, e)
  }
  return map
})

async function fetchEquipmentPage(projectId?: string) {
  const loadingRef: any = (equipmentStore as any).loading
  const setLoading = (val: boolean) => {
    if (loadingRef && typeof loadingRef === 'object' && 'value' in loadingRef) loadingRef.value = val
    else (equipmentStore as any).loading = val
  }
  setLoading(true)
  try {
    const pid = projectId ?? (projectStore.currentProjectId || '')
    if (!pid) {
      serverEquipment.value = []
      serverTotal.value = 0
      return
    }

    const params: any = { page: page.value, perPage: pageSize.value, includeFacets: true }
    params.projectId = pid
    if (search.value) params.search = search.value
    if (typeFilter.value) params.type = typeFilter.value
    if (systemFilter.value) params.system = systemFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    if (sortKey.value) { params.sortBy = sortKey.value; params.sortDir = sortDir.value === 1 ? 'asc' : 'desc' }
    const res = await http.get('/api/equipment', { params, headers: getAuthHeaders() })
    const data = res && res.data ? res.data : {}
    const normalizeItem = (it: any) => {
      const obj: any = { ...(it || {}) }
      obj.id = it?._id || it?.id
      // normalize space id/chain fields
      obj.spaceId = it?.spaceId || it?.space || obj.spaceId
      obj.space = obj.spaceId
      obj.spaceChain = it?.spaceChain || it?.space_path || ''
      return obj
    }
    if (Array.isArray(data.items)) serverEquipment.value = data.items.map(normalizeItem)
    else if (Array.isArray(data)) serverEquipment.value = data.map(normalizeItem)
    else serverEquipment.value = []
    serverTotal.value = Number(data.total ?? data.count ?? serverEquipment.value.length)
    serverTotalAll.value = Number(data.totalAll || serverTotal.value || serverEquipment.value.length)
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
    const totalPagesNow = Math.max(1, Math.ceil(Number(serverTotal.value || 0) / pageSize.value))
    if (page.value > totalPagesNow && serverTotal.value > 0) {
      page.value = totalPagesNow
      // retry with the adjusted page so UI doesn't snap to page 1 on transient empty result
      await fetchEquipmentPage(pid)
    }
  } finally {
    setLoading(false)
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

const debouncedFetch = debounce(() => { fetchEquipmentPage().catch(() => {}) }, 150)
watch([() => page.value, () => pageSize.value, () => sortKey.value, () => sortDir.value, () => search.value, () => typeFilter.value, () => systemFilter.value, () => statusFilter.value], () => debouncedFetch(), { immediate: false })
const validUploadRows = computed(() => (uploadRows.value || []).filter(r => r.tag && r.type && r.title))
const uploadInvalidRowsCount = computed(() => (uploadRows.value || []).length - validUploadRows.value.length)
const uploadDuplicateTags = computed<string[]>(() => {
  const set = existingProjectTagSet.value
  return validUploadRows.value.map(r => r.tag).filter(t => set.has(String(t || '').trim().toLowerCase()))
})

type RowAction = 'create' | 'update' | 'skip'
function rowAction(r: UploadRow): RowAction {
  const exists = existingByTagLower.value.has(String(r.tag || '').trim().toLowerCase())
  if (!exists) return 'create'
  return duplicateMode.value === 'skip' ? 'skip' : 'update'
}
const plannedCreateCount = computed(() => validUploadRows.value.filter(r => rowAction(r) === 'create').length)
const plannedUpdateCount = computed(() => validUploadRows.value.filter(r => rowAction(r) === 'update').length)
const plannedSkipCount = computed(() => validUploadRows.value.filter(r => rowAction(r) === 'skip').length)

function resolveStatus(s?: string): string {
  const v = String(s || '').trim()
  if (!v) return 'Not Started'
  const m = statuses.find(x => x.toLowerCase() === v.toLowerCase())
  return m || 'Not Started'
}
function resolveSystem(s?: string): string {
  const v = String(s || '').trim()
  if (!v) return 'Mechanical'
  // Accept as-is; optionally, we could match against systemOptions here
  return v
}
function resolveSpaceId(name?: string): string | undefined {
  const q = String(name || '').trim().toLowerCase()
  if (!q) return undefined
  const sp = (spacesStore.items || []).find((s: any) => {
    const t = String(s?.title || '').toLowerCase()
    const g = String(s?.tag || '').toLowerCase()
    return t === q || g === q
  })
  return sp ? String(sp.id || sp._id) : undefined
}

function parseJsonMaybe<T = any>(txt?: string): T | undefined {
  const s = String(txt || '').trim()
  if (!s) return undefined
  try { return JSON.parse(s) as T } catch (e) { return undefined }
}
function normalizeComponentAttributes(attrs: any): any {
  if (!attrs) return {}
  if (Array.isArray(attrs)) {
    const out: Record<string, any> = {}
    for (const it of attrs) {
      if (!it) continue
      const k = String((it.key ?? it.title ?? '').toString().trim())
      if (!k) continue
      out[k] = it.value
    }
    return out
  }
  if (typeof attrs === 'object') return attrs
  return {}
}

async function submitUploadCreate() {
  uploadError.value = ''
  const rows = validUploadRows.value
  if (!rows.length) { uploadError.value = 'No valid rows found'; return }
  const pid = String(projectStore.currentProjectId || '')
  if (!pid) { uploadError.value = 'Select a project first'; return }

  // Sequential creation to keep server stable and handle fallbacks
  creating.value = true
  try {
    let createdCount = 0
    let updatedCount = 0
    const hasVal = (s?: string) => String(s || '').trim().length > 0
    for (const r of rows) {
      const action = rowAction(r)
      if (action === 'skip') continue
      const tagLower = String(r.tag || '').trim().toLowerCase()
      const existing = existingByTagLower.value.get(tagLower)
      if (existing && action === 'update') {
        // Update path: only update fields that are provided (non-empty)
        const id = String((existing as any).id || (existing as any)._id)
        const simpleFields: any = {}
        if (hasVal(r.title)) simpleFields.title = r.title
        if (hasVal(r.type)) simpleFields.type = r.type
        if (hasVal(r.system)) simpleFields.system = r.system
        if (hasVal(r.status)) simpleFields.status = resolveStatus(r.status)
        if (hasVal(r.description)) simpleFields.description = r.description
        if (hasVal(r.space)) {
          const sid = resolveSpaceId(r.space)
          if (sid) simpleFields.spaceId = sid
        }
        if (Object.keys(simpleFields).length) {
          try { await (equipmentStore as any).updateFields(id, simpleFields) } catch (e) { /* best-effort */ }
        }
        // Nested arrays: replace only if JSON provided
        const compJson = hasVal(r.components) ? parseJsonMaybe<any[]>(r.components) : undefined
        if (Array.isArray(compJson)) {
          const mapped = compJson.map(c => ({
            tag: c?.tag || '',
            type: c?.type,
            title: c?.title,
            attributes: normalizeComponentAttributes(c?.attributes),
            status: c?.status || '',
            notes: c?.notes || '',
            issues: Array.isArray(c?.issues) ? c.issues : undefined,
          }))
          try { await (equipmentStore as any).updateFields(id, { components: mapped }) } catch (e) { /* ignore */ }
        }
        const cl = hasVal(r.checklists) ? parseJsonMaybe<any[]>(r.checklists) : undefined
        if (Array.isArray(cl)) {
          try { await (equipmentStore as any).updateFields(id, { checklists: cl }) } catch (e) { /* ignore */ }
        }
        const ft = hasVal(r.functionaltests) ? parseJsonMaybe<any[]>(r.functionaltests) : undefined
        if (Array.isArray(ft)) {
          try { await (equipmentStore as any).updateFields(id, { functionalTests: ft }) } catch (e) { /* best-effort */ }
        }
        updatedCount += 1
      } else if (!existing && action === 'create') {
        // Create path
        const payload: any = {
          projectId: pid,
          tag: r.tag,
          type: r.type,
          title: r.title,
          system: resolveSystem(r.system),
          status: resolveStatus(r.status),
          description: r.description || undefined,
        }
        const sid = resolveSpaceId(r.space)
        if (sid) payload.spaceId = sid

        const compJson = parseJsonMaybe<any[]>(r.components)
        if (Array.isArray(compJson)) {
          payload.components = compJson.map(c => ({
            tag: c?.tag || '',
            type: c?.type,
            title: c?.title,
            attributes: normalizeComponentAttributes(c?.attributes),
            status: c?.status || '',
            notes: c?.notes || '',
            issues: Array.isArray(c?.issues) ? c.issues : undefined,
          }))
        }
        const cl = parseJsonMaybe<any[]>(r.checklists)
        if (Array.isArray(cl)) payload.checklists = cl
        const ft = parseJsonMaybe<any[]>(r.functionaltests)
        if (Array.isArray(ft)) payload.functionalTests = ft

        try {
          await equipmentStore.create(payload as Equipment)
        } catch (err: any) {
          // Fallback: minimal and patch heavy fields
          const minimal: any = {
            projectId: pid,
            tag: payload.tag,
            title: payload.title,
            type: payload.type,
            status: payload.status,
          }
          if (payload.system) minimal.system = payload.system
          if (payload.description) minimal.description = payload.description
          if (payload.spaceId) minimal.spaceId = payload.spaceId
          const created = await equipmentStore.create(minimal)
          const createdId = String((created as any).id || (created as any)._id)
          try { if (payload.components) await equipmentStore.updateFields(createdId, { components: payload.components } as any) } catch (e) { /* best-effort */ }
          try { if (payload.checklists) await equipmentStore.updateFields(createdId, { checklists: payload.checklists } as any) } catch (e) { /* best-effort */ }
          try { if (payload.functionalTests) await equipmentStore.updateFields(createdId, { functionalTests: payload.functionalTests } as any) } catch (e) { /* best-effort */ }
        }
        createdCount += 1
      }
    }
    await equipmentStore.fetchByProject(pid)
    ui.showSuccess(`Imported: ${updatedCount} updated, ${createdCount} created`)
    // reset modal state
    showUploadDialog.value = false
    uploadRows.value = []
    uploadFileName.value = ''
  } catch (e: any) {
    uploadError.value = e?.response?.data?.error || e?.message || 'Failed to create equipment from upload'
  } finally {
    creating.value = false
  }
}

function downloadUploadTemplate() {
  const headers = [
    'tag',
    'type',
    'title',
    'system',
    'status',
    'space',
    'description',
    'components',
    'checklists',
    'functional tests',
  ]

  const example = {
    tag: 'EQ-001',
    type: 'Pump',
    title: 'Chilled Water Pump 1',
    system: 'Mechanical',
    status: 'Not Started',
    space: 'Level 1 - Mechanical Room',
    description: 'Example equipment created via upload',
    components: JSON.stringify([
      {
        tag: 'CMP-001',
        type: 'Motor',
        title: 'Motor 5hp',
        attributes: { Voltage: '480V', Phase: '3' }
      }
    ]),
    checklists: JSON.stringify([
      { title: 'Pre-Start', items: [ { text: 'Verify power', done: false } ] }
    ]),
    'functional tests': JSON.stringify([
      { title: 'Spin Test', steps: [ { text: 'Start', result: '' } ] }
    ])
  } as Record<string, any>

  const esc = (val: any) => {
    const s = String(val ?? '')
    // Escape quotes by doubling them per RFC4180, and wrap in quotes if needed
    const needsQuotes = /[",\n\r]/.test(s) || s.includes(',')
    const doubled = s.replace(/"/g, '""')
    return needsQuotes ? '"' + doubled + '"' : doubled
  }

  const csvRows: string[] = []
  csvRows.push(headers.join(','))
  const exampleRow = headers.map(h => esc(example[h] ?? ''))
  csvRows.push(exampleRow.join(','))
  const csv = '\ufeff' + csvRows.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'equipment-upload-template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadEquipmentList() {
  const rows = filtered.value
  // Define headers with rich fields; nested arrays/objects are JSON strings
  const headers = [
    'id',
    'tag',
    'type',
    'title',
    'system',
    'status',
    'space',
    'spaceId',
    'description',
    'attributes',
    'components',
    'checklists',
    'functional tests',
    'template',
    'images',
    'attachments',
    'projectId',
  ]

  const esc = (val: any) => {
    const s = String(val ?? '')
    const needsQuotes = /[",\n\r]/.test(s) || s.includes(',')
    const doubled = s.replace(/"/g, '""')
    return needsQuotes ? '"' + doubled + '"' : doubled
  }

  const sanitizeMediaArray = (arr: any[]) => {
    if (!Array.isArray(arr)) return []
    return arr.map((m: any) => {
      const out: any = {}
      if (m?.filename) out.filename = m.filename
      if (m?.url) out.url = m.url
      if (m?.caption) out.caption = m.caption
      // Avoid embedding raw data/base64 to keep CSV light
      return out
    })
  }

  const toComponentsJson = (compArr: any[]) => {
    if (!Array.isArray(compArr)) return undefined
    return compArr.map((c: any) => ({
      tag: c?.tag || '',
      type: c?.type,
      title: c?.title,
      attributes: (typeof c?.attributes === 'object' && c?.attributes) ? c.attributes : {},
      status: c?.status || '',
      notes: c?.notes || '',
      issues: Array.isArray(c?.issues) ? c.issues : undefined,
    }))
  }

  const toAttributesJson = (attrs: any) => {
    if (Array.isArray(attrs)) return attrs
    if (attrs && typeof attrs === 'object') return attrs
    return undefined
  }

  const csvRows: string[] = []
  csvRows.push(headers.join(','))

  for (const e of rows as any[]) {
    const space = spaceName((e as any).spaceId)
    const imagesJson = JSON.stringify(sanitizeMediaArray((e as any).images || (e as any).photos || []))
    const attsJson = JSON.stringify(((e as any).attachments ? sanitizeMediaArray((e as any).attachments) : []))
    const compsJson = JSON.stringify(toComponentsJson((e as any).components || []))
    const attrsJson = JSON.stringify(toAttributesJson((e as any).attributes))
    const checksJson = JSON.stringify((e as any).checklists || [])
    const ftestsJson = JSON.stringify((e as any).functionalTests || [])
    const rowVals = [
      String((e as any).id || (e as any)._id || ''),
      String((e as any).tag || ''),
      String((e as any).type || ''),
      String((e as any).title || ''),
      String((e as any).system || ''),
      String((e as any).status || ''),
      String(space || ''),
      String((e as any).spaceId || ''),
      String((e as any).description || ''),
      attrsJson || '',
      compsJson || '',
      checksJson || '',
      ftestsJson || '',
      String((e as any).template || ''),
      imagesJson || '',
      attsJson || '',
      String((e as any).projectId || ''),
    ]
    csvRows.push(rowVals.map(esc).join(','))
  }

  const csv = '\ufeff' + csvRows.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const proj: any = projectStore.currentProject as any
  const name = String(proj?.title || proj?.name || 'project')
  const safeName = name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]+/g, '')
  const today = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}-equipment-${today}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>
