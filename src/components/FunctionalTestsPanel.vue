<template>
  <div class="space-y-4">
    <!-- Header: add, progress, bulk actions -->
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
    >
      <div class="flex items-center gap-2">
        <button
          class="h-10 w-10 grid place-items-center rounded-full bg-white/20 border border-white/30 hover:bg-white/30 text-white/90"
          title="New test"
          aria-label="New test"
          @click="openNewFpt"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              d="M12 5v14M5 12h14"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <input
          v-model="search"
          type="text"
          placeholder="Search tests…"
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 w-56"
        >
      </div>
      <div class="flex items-center gap-2">
        <div
          class="text-sm text-white/70"
        >
          {{ passedCount }} / {{ local.length }} passed
        </div>
        <div class="w-40 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            class="h-full bg-emerald-400/80"
            :style="{ width: progressPct + '%' }"
          />
        </div>
        <button
          class="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35 text-sm"
          @click="markAll(true)"
        >
          All Pass
        </button>
        <button
          class="px-2 py-1 rounded-md bg-red-500/20 border border-red-400/60 text-red-100 hover:bg-red-500/35 text-sm"
          @click="markAll(false)"
        >
          All Fail
        </button>
        <button
          class="px-2 py-1 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35 text-sm"
          @click="markAll(null)"
        >
          All N/A
        </button>
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
        <label class="inline-flex items-center gap-2 text-sm text-white/70">
          <input
            v-model="showSignatures"
            type="checkbox"
            class="h-4 w-4 accent-emerald-400"
            aria-label="Show signatures"
          >
          <span>Show signatures</span>
        </label>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!local.length"
      class="rounded-2xl p-6 bg-white/5 border border-white/10 text-center"
    >
      <div class="text-white/80 font-medium">
        No functional tests yet
      </div>
      <div class="text-white/60 text-sm mt-1">
        Create the first FPT for this equipment.
      </div>
      <div class="mt-3">
        <button
          class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2"
          @click="openNewFpt"
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
          <span>New Test</span>
        </button>
      </div>
    </div>

    <!-- Tests list -->
    <div
      v-else
      class="space-y-3"
    >
      <div
        v-for="(t, i) in filtered"
        :key="t.number || i"
        class="rounded-md border border-white/10 bg-white/5"
        :class="isOpen(t) ? 'border-emerald-400/60 bg-emerald-500/10 shadow-md shadow-emerald-900/20 relative overflow-hidden' : ''"
        :draggable="dragEnabled"
        @dragstart="onDragStart(t, $event)"
        @dragover.prevent="onDragOver(t, $event)"
        @drop.prevent="onDrop(t, $event)"
      >
        <div
          v-if="isOpen(t)"
          class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/80 rounded-l-md"
        />
        <div
          class="w-full text-left px-3 py-2 flex items-center justify-between rounded-t-md cursor-pointer select-none"
          :class="isOpen(t) ? 'bg-emerald-500/20 hover:bg-emerald-500/25' : 'bg-white/5'"
          tabindex="0"
          role="button"
          :aria-expanded="isOpen(t)"
          @click="toggleOpen(t)"
          @keydown.enter.prevent="toggleOpen(t)"
          @keydown.space.prevent="toggleOpen(t)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-180': isOpen(t) }"
            ><path
              d="M6 9l6 6 6-6"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
            <span class="text-xs px-1.5 py-0.5 rounded bg-white/10 border border-white/20">#{{ t.number ?? (i+1) }}</span>
            <span
              class="truncate"
              :class="isOpen(t) ? 'text-white font-medium' : ''"
            >{{ t.name || 'Test' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              v-if="t.pass === true"
              class="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/20 border-emerald-400/60 text-emerald-100"
            >PASS</span>
            <span
              v-else-if="t.pass === false"
              class="text-[10px] px-1.5 py-0.5 rounded border bg-red-500/20 border-red-400/60 text-red-100"
            >FAIL</span>
            <span
              v-else-if="getStatus(t) === 'na'"
              class="text-[10px] px-1.5 py-0.5 rounded border text-indigo-200 border-indigo-400/60"
            >N/A</span>
            <span
              v-if="oprItemCount(t) > 0"
              class="text-[10px] px-1.5 py-0.5 rounded border bg-white/10 border-white/20 text-white/80"
            >OPR: {{ oprItemCount(t) }}</span>
            <button
              v-if="!dragEnabled"
              :disabled="i===0"
              class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-40"
              title="Move up"
              aria-label="Move up"
              @click.stop="move(i, -1)"
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
              v-if="!dragEnabled"
              :disabled="i===local.length-1"
              class="h-7 w-7 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-40"
              title="Move down"
              aria-label="Move down"
              @click.stop="move(i, 1)"
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
            <span
              v-if="dragEnabled"
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
              class="h-7 w-7 grid place-items-center rounded-md bg-red-500/20 border border-red-400/40 text-red-200 hover:bg-red-500/30"
              title="Delete"
              aria-label="Delete"
              @click.stop="removeTest(i)"
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
        </div>
        <div
          v-show="isOpen(t)"
          class="px-3 py-3 space-y-3"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-white/70">Name</label>
              <input
                v-model="local[i].name"
                type="text"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
                @change="notifyChange"
              >
            </div>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2">
                <button
                  class="h-6 w-6 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  :aria-expanded="isDescOpen(local[i])"
                  :title="isDescOpen(local[i]) ? 'Hide description' : 'Show description'"
                  @click.stop="toggleDesc(local[i])"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4 transition-transform"
                    :class="{ 'rotate-180': isDescOpen(local[i]) }"
                  ><path
                    d="M6 9l6 6 6-6"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                </button>
                <label class="text-sm text-white/70">Description</label>
                <span
                  v-if="!isDescOpen(local[i]) && !(local[i].description||'').trim()"
                  class="text-xs text-white/50"
                >(hidden)</span>
              </div>
              <div
                v-if="isDescOpen(local[i])"
                class="mt-1"
              >
                <textarea
                  v-model="local[i].description"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
                  rows="2"
                  @change="notifyChange"
                />
              </div>
            </div>

            <div class="md:col-span-2">
              <OprItemPicker
                v-model="(local[i] as any).oprItemIds"
                :project-id="String(props.projectId || '')"
                :disabled="!props.projectId"
                label="OPR items"
                @update:model-value="notifyChange"
              />
            </div>

            <template v-if="!(local[i] as any).kind || (local[i] as any).kind === 'standard'">
              <div class="md:col-span-2 space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-sm text-white/70">Table</label>
                  <div class="flex items-center gap-2">
                    <button
                      class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                      @click="addTableColumn(i)"
                    >
                      Add Column
                    </button>
                    <button
                      class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                      @click="addTableRow(i)"
                    >
                      Add Row
                    </button>
                  </div>
                </div>
                <div class="rounded-md border border-white/10 overflow-y-auto overflow-x-hidden">
                  <table class="w-full table-fixed text-sm">
                    <colgroup>
                      <col style="width: 2rem">
                      <template
                        v-for="col in ((local[i] as any).table?.columns || [])"
                        :key="col.key + ':col'"
                      >
                        <col :style="colStyle(col.name)">
                      </template>
                      <col style="width: 2.75rem">
                    </colgroup>
                    <thead class="bg-white/5 text-white/80">
                      <tr>
                        <th class="px-1 py-1 text-left text-xs font-medium">
                          #
                        </th>
                        <th
                          v-for="(col, ci) in ((local[i] as any).table?.columns || [])"
                          :key="col.key"
                          class="px-1 py-1 text-left align-middle"
                        >
                          <div class="flex items-center gap-1">
                            <input
                              v-model="(local[i] as any).table.columns[ci].name"
                              type="text"
                              class="px-2 py-1 rounded bg-white/10 border border-white/20 w-full disabled:opacity-70"
                              :disabled="isPassColumnName((local[i] as any).table.columns[ci].name)"
                              :title="isPassColumnName((local[i] as any).table.columns[ci].name) ? 'Locked: Pass column' : ''"
                              @change="notifyChange"
                            >
                            <button
                              class="h-7 w-7 grid place-items-center rounded-full bg-red-500/20 border border-red-400/40 text-red-100 hover:bg-red-500/30"
                              title="Remove column"
                              aria-label="Remove column"
                              @click="removeTableColumn(i, ci)"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                class="w-4 h-4"
                              ><path
                                d="M5 12h14"
                                stroke-width="1.5"
                                stroke-linecap="round"
                              /></svg>
                            </button>
                          </div>
                        </th>
                        <th class="w-14" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, ri) in ((local[i] as any).table?.rows || [])"
                        :key="'r'+ri"
                        class="border-t border-white/10"
                      >
                        <td class="px-1 py-1 text-white/60 text-xs align-top">
                          {{ ri + 1 }}
                        </td>
                        <td
                          v-for="col in ((local[i] as any).table?.columns || [])"
                          :key="col.key + ':' + ri"
                          class="px-1 py-1 align-top"
                        >
                          <template v-if="isPassColumnName(col.name)">
                            <div class="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                role="switch"
                                :aria-checked="ariaChecked(passCellState((local[i] as any).table.rows[ri][col.key]))"
                                :title="passLabel(passCellState((local[i] as any).table.rows[ri][col.key]))"
                                class="relative inline-flex h-6 w-12 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                                :class="passBgClass(passCellState((local[i] as any).table.rows[ri][col.key]))"
                                @click="cyclePassCell(i, ri, col.key)"
                                @keydown.space.prevent="cyclePassCell(i, ri, col.key)"
                                @keydown.enter.prevent="cyclePassCell(i, ri, col.key)"
                              >
                                <span class="sr-only">Pass/Fail</span>
                                <span
                                  class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                                  :style="{ transform: knobTransform(passCellState((local[i] as any).table.rows[ri][col.key])) }"
                                />
                              </button>
                              <span
                                class="text-[10px] leading-none"
                                :class="passTextClass(passCellState((local[i] as any).table.rows[ri][col.key]))"
                              >
                                {{ passText(passCellState((local[i] as any).table.rows[ri][col.key])) }}
                              </span>
                            </div>
                          </template>
                          <template v-else>
                            <textarea
                              v-model="(local[i] as any).table.rows[ri][col.key]"
                              v-autogrow
                              rows="2"
                              class="w-full px-2 py-1 rounded bg-white/10 border border-white/20 resize-none overflow-hidden"
                              @change="notifyChange"
                            />
                          </template>
                        </td>
                        <td class="px-1 py-1 text-right align-top">
                          <button
                            class="h-7 w-7 grid place-items-center rounded-full bg-red-500/20 border border-red-400/40 text-red-100 hover:bg-red-500/30"
                            title="Remove row"
                            aria-label="Remove row"
                            @click="removeTableRow(i, ri)"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              class="w-4 h-4"
                            ><path
                              d="M5 12h14"
                              stroke-width="1.5"
                              stroke-linecap="round"
                            /></svg>
                          </button>
                        </td>
                      </tr>
                      <tr v-if="!(((local[i] as any).table?.columns || []).length) && !(((local[i] as any).table?.rows || []).length)">
                        <td
                          colspan="999"
                          class="px-2 py-3 text-center text-white/60"
                        >
                          No columns or rows yet. Use "Add Column" and "Add Row" to build your table.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
            <template v-else-if="(local[i] as any).kind === 'sheet'">
              <div class="md:col-span-2 space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-sm text-white/70">Spreadsheet</label>
                  <div class="flex items-center gap-2">
                    <button
                      class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                      @click="addRow(i)"
                    >
                      Add Row
                    </button>
                    <button
                      class="px-2 py-1 rounded-md bg-red-500/20 border border-red-400/40 text-red-100 hover:bg-red-500/30 text-sm"
                      @click="clearRows(i)"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div class="overflow-auto rounded-md border border-white/10">
                  <table class="min-w-full text-sm">
                    <thead class="bg-white/5 text-white/70">
                      <tr>
                        <th class="text-left px-2 py-1 font-medium">
                          Step
                        </th>
                        <th class="text-left px-2 py-1 font-medium">
                          Expected
                        </th>
                        <th class="text-left px-2 py-1 font-medium">
                          Actual
                        </th>
                        <th class="px-2 py-1" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(r, ri) in (local[i] as any).rows"
                        :key="ri"
                        class="border-t border-white/10"
                      >
                        <td class="px-2 py-1 align-top w-1/4">
                          <input
                            v-model="(local[i] as any).rows[ri].step"
                            type="text"
                            class="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                            @change="notifyChange"
                          >
                        </td>
                        <td class="px-2 py-1 align-top">
                          <textarea
                            v-model="(local[i] as any).rows[ri].expected"
                            rows="2"
                            class="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                            @change="notifyChange"
                          />
                        </td>
                        <td class="px-2 py-1 align-top">
                          <textarea
                            v-model="(local[i] as any).rows[ri].actual"
                            rows="2"
                            class="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                            @change="notifyChange"
                          />
                        </td>
                        <td class="px-2 py-1 align-top text-right">
                          <button
                            class="px-2 py-1 rounded-md bg-red-500/20 border border-red-400/40 text-red-100 hover:bg-red-500/30 text-xs"
                            @click="removeRow(i, ri)"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                      <tr v-if="!(local[i] as any).rows || !(local[i] as any).rows.length">
                        <td
                          colspan="4"
                          class="px-2 py-2 text-center text-white/60"
                        >
                          No rows yet
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
            <template v-else-if="(local[i] as any).kind === 'table'">
              <div class="md:col-span-2 space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-sm text-white/70">Table</label>
                  <div class="flex items-center gap-2">
                    <button
                      class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                      @click="addTableColumn(i)"
                    >
                      Add Column
                    </button>
                    <button
                      class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                      @click="addTableRow(i)"
                    >
                      Add Row
                    </button>
                  </div>
                </div>
                <div class="rounded-md border border-white/10 overflow-y-auto overflow-x-hidden">
                  <table class="w-full table-fixed text-sm">
                    <colgroup>
                      <col style="width: 2rem">
                      <template
                        v-for="col in (local[i] as any).table.columns"
                        :key="col.key + ':col'"
                      >
                        <col :style="colStyle(col.name)">
                      </template>
                      <col style="width: 2.75rem">
                    </colgroup>
                    <thead class="bg-white/5 text-white/80">
                      <tr>
                        <th class="px-1 py-1 text-left text-xs font-medium">
                          #
                        </th>
                        <th
                          v-for="(col, ci) in (local[i] as any).table.columns"
                          :key="col.key"
                          class="px-1 py-1 text-left align-middle"
                        >
                          <div class="flex items-center gap-1">
                            <input
                              v-model="(local[i] as any).table.columns[ci].name"
                              type="text"
                              class="px-2 py-1 rounded bg-white/10 border border-white/20 w-full disabled:opacity-70"
                              :disabled="isPassColumnName((local[i] as any).table.columns[ci].name)"
                              :title="isPassColumnName((local[i] as any).table.columns[ci].name) ? 'Locked: Pass column' : ''"
                              @change="notifyChange"
                            >
                            <button
                              class="h-7 w-7 grid place-items-center rounded-full bg-red-500/20 border border-red-400/40 text-red-100 hover:bg-red-500/30"
                              title="Remove column"
                              aria-label="Remove column"
                              @click="removeTableColumn(i, ci)"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                class="w-4 h-4"
                              ><path
                                d="M5 12h14"
                                stroke-width="1.5"
                                stroke-linecap="round"
                              /></svg>
                            </button>
                          </div>
                        </th>
                        <th class="w-14" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, ri) in (local[i] as any).table.rows"
                        :key="'r'+ri"
                        class="border-t border-white/10"
                      >
                        <td class="px-1 py-1 text-white/60 text-xs align-top">
                          {{ ri + 1 }}
                        </td>
                        <td
                          v-for="col in (local[i] as any).table.columns"
                          :key="col.key + ':' + ri"
                          class="px-1 py-1 align-top"
                        >
                          <template v-if="isPassColumnName(col.name)">
                            <div class="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                role="switch"
                                :aria-checked="ariaChecked(passCellState((local[i] as any).table.rows[ri][col.key]))"
                                :title="passLabel(passCellState((local[i] as any).table.rows[ri][col.key]))"
                                class="relative inline-flex h-6 w-12 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
                                :class="passBgClass(passCellState((local[i] as any).table.rows[ri][col.key]))"
                                @click="cyclePassCell(i, ri, col.key)"
                                @keydown.space.prevent="cyclePassCell(i, ri, col.key)"
                                @keydown.enter.prevent="cyclePassCell(i, ri, col.key)"
                              >
                                <span class="sr-only">Pass/Fail</span>
                                <span
                                  class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                                  :style="{ transform: knobTransform(passCellState((local[i] as any).table.rows[ri][col.key])) }"
                                />
                              </button>
                              <span
                                class="text-[10px] leading-none"
                                :class="passTextClass(passCellState((local[i] as any).table.rows[ri][col.key]))"
                              >
                                {{ passText(passCellState((local[i] as any).table.rows[ri][col.key])) }}
                              </span>
                            </div>
                          </template>
                          <template v-else>
                            <input
                              v-model="(local[i] as any).table.rows[ri][col.key]"
                              type="text"
                              class="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                              @change="notifyChange"
                            >
                          </template>
                        </td>
                        <td class="px-1 py-1 text-right align-top">
                          <button
                            class="h-7 w-7 grid place-items-center rounded-full bg-red-500/20 border border-red-400/40 text-red-100 hover:bg-red-500/30"
                            title="Remove row"
                            aria-label="Remove row"
                            @click="removeTableRow(i, ri)"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              class="w-4 h-4"
                            ><path
                              d="M5 12h14"
                              stroke-width="1.5"
                              stroke-linecap="round"
                            /></svg>
                          </button>
                        </td>
                      </tr>
                      <tr v-if="!((local[i] as any).table.columns || []).length && !((local[i] as any).table.rows || []).length">
                        <td
                          colspan="999"
                          class="px-2 py-3 text-center text-white/60"
                        >
                          No columns or rows yet. Use "Add Column" and "Add Row" to build your table.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
            <div class="md:col-span-2">
              <div class="flex items-center gap-2">
                <button
                  class="h-6 w-6 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                  :aria-expanded="isNotesOpen(local[i])"
                  :title="isNotesOpen(local[i]) ? 'Hide notes' : 'Show notes'"
                  @click.stop="toggleNotes(local[i])"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4 transition-transform"
                    :class="{ 'rotate-180': isNotesOpen(local[i]) }"
                  ><path
                    d="M6 9l6 6 6-6"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                </button>
                <label class="text-sm text-white/70">Notes</label>
                <span
                  v-if="!isNotesOpen(local[i]) && !(local[i].notes||'').toString().trim()"
                  class="text-xs text-white/50"
                >(hidden)</span>
              </div>
              <div
                v-if="isNotesOpen(local[i])"
                class="mt-1"
              >
                <template v-if="!(local[i] as any).kind || (local[i] as any).kind === 'standard'">
                  <textarea
                    v-model="local[i].notes"
                    rows="3"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
                    @change="notifyChange"
                  />
                </template>
                <template v-else>
                  <input
                    v-model="local[i].notes"
                    type="text"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
                    @change="notifyChange"
                  >
                </template>
              </div>
            </div>
          </div>

          <!-- Issues quick attach + Pass/Fail/N/A row -->
          <div class="pt-1">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35 inline-flex items-center gap-2"
                  @click="saveNow"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  ><path
                    d="M5 13l4 4L19 7"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                  <span>Save</span>
                </button>
                <button
                  class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2"
                  @click="openIssue(i)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="w-4 h-4"
                  ><path
                    d="M12 5v14M5 12h14"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  /></svg>
                  <span>Attach Issue</span>
                </button>
              </div>
              <div class="flex items-center gap-2">
                <button
                  :class="passClass(local[i].pass === true)"
                  class="px-2 py-1 rounded-md border"
                  @click="setPass(i, true)"
                >
                  Pass
                </button>
                <button
                  :class="failClass(local[i].pass === false)"
                  class="px-2 py-1 rounded-md border"
                  @click="setPass(i, false)"
                >
                  Fail
                </button>
                <button
                  :class="naClass(getStatus(local[i]) === 'na')"
                  class="px-2 py-1 rounded-md border"
                  @click="setPass(i, null)"
                >
                  N/A
                </button>
              </div>
            </div>
            <div
              v-if="visibleIssues(t).length"
              class="mt-2 space-y-1"
            >
              <div class="text-xs text-white/70">
                Attached Issues
              </div>
              <ul class="space-y-1">
                <li
                  v-for="(iss, k) in visibleIssues(t)"
                  :key="(iss.id||iss._id)||k"
                  class="text-sm"
                >
                  <RouterLink
                    :to="{ name: 'issue-edit', params: { id: (iss.id||iss._id)||k } }"
                    class="hover:underline"
                  >
                    #{{ iss.number ?? '—' }} {{ iss.title || 'Issue' }}
                  </RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Signatures accordion (below tests list) -->
    <div
      v-if="showSignatures"
      class="pt-2"
    >
      <div class="rounded-md border border-white/10 bg-white/5">
        <div
          class="w-full px-3 py-2 flex items-center justify-between rounded-t-md bg-white/5 cursor-pointer"
          role="button"
          :aria-expanded="signOpen"
          @click="signOpen = !signOpen"
        >
          <div class="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              class="w-4 h-4"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span class="font-medium">Signatures</span>
          </div>
          <div class="text-xs text-white/70 flex items-center gap-2">
            <div>
              {{ sigList.length }} entries
            </div>
            <button
              class="h-7 w-7 grid place-items-center rounded-full bg-white/10 border border-white/20 hover:bg-white/15"
              :class="{ 'opacity-40 cursor-not-allowed': ((sigList.length || 0) + (drafts.length || 0)) >= 6 }"
              :title="((sigList.length || 0) + (drafts.length || 0)) >= 6 ? 'Maximum of 6 signatures reached' : 'Add signature'"
              aria-label="Add signature"
              @click.stop="((sigList.length || 0) + (drafts.length || 0)) < 6 ? createDraft() : ui.showError('Maximum of 6 signatures allowed per test')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                class="w-3 h-3"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button
              class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm ml-2"
              title="Use my stored profile signature"
              :disabled="!((authStore.user && authStore.user.contact && authStore.user.contact.signature && authStore.user.contact.signature.block) || false) || ((sigList.length || 0) + (drafts.length || 0)) >= 6"
              @click.stop="insertProfileSignature"
            >
              Use my Stored Signature
            </button>
          </div>
        </div>
        <div
          v-show="signOpen"
          class="p-3"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <template v-if="!sigList.length">
              <div class="p-3 rounded bg-white/6 border border-white/10 md:col-span-2">
                <div class="flex items-center gap-3">
                  <button
                    class="px-3 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                    @click.stop="createDraft"
                  >
                    Add signature
                  </button>
                  <div class="text-white/60">
                    No signatures yet. Use the card below to add your first signature.
                  </div>
                </div>
              </div>
            </template>

            <div
              v-for="(s, idx) in sigList"
              :key="idx"
              class="p-3 rounded bg-white/6 border border-white/10 relative"
            >
              <!-- Trash icon to remove saved signature -->
              <button
                class="absolute top-2 right-2 h-6 w-6 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                title="Delete signature"
                aria-label="Delete signature"
                @click.stop="removeSignature(idx)"
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
              <!-- Re-capture (redo) button -->
              <button
                class="absolute top-2 right-10 h-6 w-6 grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                title="Re-capture signature"
                aria-label="Re-capture signature"
                @click.stop="startEditSignature(idx)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                >
                  <path
                    d="M21 12a9 9 0 1 0-9 9"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M21 3v6h-6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
              <!-- Title / Name above the signature -->
              <div class="mb-2">
                <div class="font-medium text-white/90 truncate">
                  <span class="truncate">{{ s.title || 'Signature' }}:</span>
                  <span
                    v-if="s && (s.role || s.person)"
                    class="text-sm text-white/70 ml-2"
                  >
                    <span
                      v-if="s.role"
                      class="mr-1"
                    >{{ s.role }}:</span>
                    <span v-if="s.person">{{ s.person }}</span>
                  </span>
                </div>
              </div>

              <!-- Signature block -->
              <div class="mb-2">
                <template v-if="editingIndex === idx">
                  <div>
                    <!-- <input
                      v-model="editingDraft.title"
                      placeholder="Title"
                      class="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-white/90 mb-2"
                    >
                    <input
                      v-model="editingDraft.person"
                      placeholder="Name"
                      class="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-white/90 mb-2"
                    > -->
                    <div class="mb-2">
                      <SignaturePad
                        v-model="editingDraft.block"
                        v-model:title="editingDraft.title"
                        v-model:person="editingDraft.person"
                        v-model:role="editingDraft.role"
                        :removable="true"
                        @saved="onPadSavedEdited(idx, $event)"
                        @remove="removeSignature(idx)"
                      />
                    </div>
                    <!-- Date is shown only on saved signatures; hide while editing/recapturing -->
                  </div>
                </template>
                <template v-else>
                  <img
                    v-if="isDataUrl(s.block)"
                    :src="s.block"
                    class="w-full h-36 object-contain bg-black/10"
                  >
                  <div
                    v-else
                    class="text-sm text-white/80 whitespace-pre-wrap"
                  >
                    {{ s.block }}
                  </div>
                </template>
              </div>

              <div class="mt-2 flex items-center justify-between">
                <div class="text-xs text-white/60">
                  <span v-if="s && s.block">Signed: {{ formatDateTime(s.date) }}</span>
                </div>
                <!-- Buttons hidden for saved signatures per UX: display saved signature only -->
                <div class="text-xs text-emerald-200">
                  Saved
                </div>
              </div>
            </div>

            <!-- Draft signature cards -->
            <template v-if="(sigList.length + drafts.length) <= 6">
              <div
                v-for="(d, di) in drafts"
                :key="'draft-'+di"
                class="p-3 rounded bg-white/6 border border-white/10"
              >
                <div class="mb-2">
                  <div class="text-sm text-white/70 mt-1">
                    Add title and name, then capture signature
                  </div>
                </div>

                <div class="mb-2">
                  <SignaturePad
                    v-model="d.block"
                    v-model:title="d.title"
                    v-model:person="d.person"
                    v-model:role="d.role"
                    :removable="true"
                    @saved="onPadSavedDraft(di, $event)"
                    @remove="removeDraft(di)"
                  />
                </div>

                <!-- Date is shown only on saved signatures; hide while drafting before confirm -->
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Issue Modal -->
    <Modal v-model="issueOpen">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-medium">
            Attach Issue
          </div>
          <div class="text-white/70 text-sm">
            Create an issue linked to this test
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
            @click="closeIssue"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35"
            @click="createIssueFromTest"
          >
            Create
          </button>
        </div>
      </template>
    </Modal>

    <!-- New FPT Modal -->
    <Modal v-model="newOpen">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-medium">
            New FPT
          </div>
          <div class="text-white/70 text-sm">
            Choose the test type
          </div>
        </div>
      </template>
      <template #default>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-white/70 mb-1">Type</label>
            <div class="flex items-center gap-3">
              <label class="inline-flex items-center gap-2">
                <input
                  v-model="newType"
                  type="radio"
                  class="accent-emerald-400"
                  value="standard"
                >
                <span>Standard</span>
              </label>
              <label class="inline-flex items-center gap-2">
                <input
                  v-model="newType"
                  type="radio"
                  class="accent-emerald-400"
                  value="table"
                >
                <span>Table</span>
              </label>
            </div>
          </div>
          <div>
            <label class="block text-sm text-white/70">Name (optional)</label>
            <input
              v-model="newName"
              type="text"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
              placeholder="e.g. Supply Fan Start/Stop"
            >
          </div>
          <div>
            <label class="block text-sm text-white/70">Description (optional)</label>
            <textarea
              v-model="newDesc"
              rows="2"
              class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
              placeholder="Short description"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30"
            @click="closeNewFpt"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35"
            @click="createNewFpt"
          >
            Create
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import Modal from './Modal.vue'
import IssueForm from './IssueForm.vue'
import OprItemPicker from './OprItemPicker.vue'
import { useUiStore } from '../stores/ui'
import { useProjectStore } from '../stores/project'
import { useIssuesStore } from '../stores/issues'
import { confirm as inlineConfirm } from '../utils/confirm'
import SignaturePad from './SignaturePad.vue'
import { useAuthStore } from '../stores/auth'
// Removed GridEditor/XLSX usage in favor of a simple editable table per test

export interface FunctionalTestItem {
  number?: number | string | null
  name?: string
  description?: string
  expected_result?: string
  actual_result?: string | null
  notes?: string | null
  pass?: boolean | null
  issues?: Array<any>
  oprItemIds?: string[]
  // New optional fields for typed tests
  kind?: 'standard' | 'sheet' | 'table'
  rows?: Array<{ step: string; expected: string; actual: string }>
  table?: { columns: Array<{ key: string; name: string }>; rows: Array<Record<string, any>> }
}

const props = defineProps<{ 
  modelValue: FunctionalTestItem[] | null | undefined,
  projectId?: string,
  equipmentId?: string,
  equipmentTag?: string,
  equipmentSpace?: string,
  signatures?: any[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: FunctionalTestItem[]): void
  (e: 'change', v: FunctionalTestItem[]): void
  (e: 'save', v: FunctionalTestItem[]): void
  (e: 'update:signatures', v: any[]): void
}>()

const ui = useUiStore()
const projectStore = useProjectStore()
const issuesStore = useIssuesStore()
const authStore = useAuthStore()

function oprItemCount(t: FunctionalTestItem): number {
  const ids = Array.isArray((t as any)?.oprItemIds) ? (t as any).oprItemIds : []
  const set = new Set<string>()
  for (const raw of ids) {
    const id = String(raw || '').trim()
    if (id) set.add(id)
  }
  return set.size
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

function isIssueDeleted(issue: any): boolean {
  if (!issue) return true
  if (issue.deleted || issue.isDeleted) return true
  const status = typeof issue.status === 'string' ? issue.status.trim().toLowerCase() : ''
  return status === 'deleted' || status === 'archived'
}

const activeIssueMap = computed<Record<string, any>>(() => {
  const map: Record<string, any> = {}
  const list = Array.isArray(issuesStore.issues) ? issuesStore.issues : []
  for (const entry of list) {
    if (!entry || isIssueDeleted(entry)) continue
    const key = normalizeId((entry as any).id || (entry as any)._id)
    if (!key) continue
    map[key] = entry
  }
  return map
})

function visibleIssues(t: FunctionalTestItem) {
  const arr = Array.isArray(t.issues) ? t.issues : []
  const map = activeIssueMap.value
  return arr
    .map((raw: any) => {
      const key = normalizeId(raw?.id || raw?._id || raw)
      if (!key) return null
      const active = map[key]
      if (!active) return null
      return {
        ...(active as any),
        id: (active as any).id || (active as any)._id || key,
        _id: (active as any)._id || (active as any).id || key,
        number: (active as any).number ?? raw?.number ?? null,
        title: (active as any).title ?? raw?.title ?? 'Issue',
        type: (active as any).type ?? raw?.type ?? undefined,
      }
    })
    .filter(Boolean) as any[]
}

// Accordion open/close state per test item (by object identity)
const openVersion = ref(0)
const openState = new WeakMap<FunctionalTestItem, boolean>()
function isOpen(t: FunctionalTestItem) { openVersion.value; return openState.get(t) ?? false }
function toggleOpen(t: FunctionalTestItem) { openState.set(t, !isOpen(t)); openVersion.value++; writeOpenState() }

// Explicit status tracking to distinguish default neutral vs explicit N/A
// Values: 'pass' | 'fail' | 'na' | null (neutral/default)
const statusVersion = ref(0)
const statusMap = new WeakMap<FunctionalTestItem, 'pass' | 'fail' | 'na' | null>()
function getStatus(t: FunctionalTestItem): 'pass' | 'fail' | 'na' | null {
  // touch for reactivity
  statusVersion.value
  const s = statusMap.get(t)
  if (s !== undefined) return s ?? null
  // derive from persisted boolean for initial render
  if (t.pass === true) return 'pass'
  if (t.pass === false) return 'fail'
  return null
}
function setStatus(t: FunctionalTestItem, s: 'pass' | 'fail' | 'na' | null) {
  statusMap.set(t, s)
  statusVersion.value++
}

function normalize(v: any): FunctionalTestItem[] {
  return (Array.isArray(v) ? v : []).map((t) => {
    const fromTable = (t?.table && Array.isArray((t.table as any).columns)) ? {
      columns: (t.table as any).columns.map((c: any, idx: number) => typeof c === 'string' ? ({ key: `c${idx+1}`, name: c }) : ({ key: String(c?.key || `c${idx+1}`), name: String(c?.name ?? '') })),
      rows: Array.isArray((t.table as any).rows) ? (t.table as any).rows.map((r: any) => ({ ...(r || {}) })) : []
    } : null
    const fromWorkbook = (t?.workbook && Array.isArray((t.workbook as any).sheets) && (t.workbook as any).sheets.length)
      ? (() => {
          const s = (t.workbook as any).sheets[0]
          const columns = (Array.isArray(s?.columns) ? s.columns : []).map((c: any, idx: number) => ({ key: `c${idx+1}`, name: String(c ?? '') }))
          const rows = Array.isArray(s?.rows) ? s.rows.map((r: any) => ({ ...(r || {}) })) : []
          return { columns, rows }
        })()
      : null
  const useTable = fromTable || fromWorkbook
  // Determine kind with a bias toward 'standard' when not explicitly provided.
  // - If a test explicitly declares kind, use it.
  // - If kind is missing, default to 'standard' (even if a table exists) so
  //   existing tests render textarea cells and auto-grow works as requested.
  let kind: 'standard' | 'sheet' | 'table'
  if (t?.kind === 'sheet') kind = 'sheet'
  else if (t?.kind === 'table') kind = 'table'
  else if (t?.kind === 'standard') kind = 'standard'
  else kind = 'standard'
    const result = ({
    number: (t?.number ?? null) as any,
    name: String(t?.name ?? ''),
    description: String(t?.description ?? ''),
    expected_result: String(t?.expected_result ?? ''),
    actual_result: t?.actual_result == null ? '' : String(t.actual_result),
    notes: t?.notes == null ? '' : String(t?.notes),
    pass: (t?.pass === true || t?.pass === false) ? t.pass : null,
    issues: Array.isArray(t?.issues) ? t.issues : [],
    oprItemIds: Array.isArray(t?.oprItemIds) ? t.oprItemIds.map((id: any) => String(id || '').trim()).filter(Boolean) : [],
      kind,
    rows: Array.isArray(t?.rows) ? t.rows.map((r: any) => ({ step: String(r?.step ?? ''), expected: String(r?.expected ?? ''), actual: String(r?.actual ?? '') })) : [],
      table: useTable || (Array.isArray((t as any).columns) || Array.isArray((t as any).rows)) ? (
        useTable || {
          // very old shape fallback
          columns: (Array.isArray((t as any).columns) ? (t as any).columns : []).map((c: any, idx: number) => ({ key: `c${idx+1}`, name: String(c ?? '') })),
          rows: Array.isArray((t as any).rows) ? (t as any).rows : []
        }
      ) : undefined
    }) as FunctionalTestItem
    if (result.kind === 'standard' && !result.table) {
      result.table = { columns: [], rows: [] }
    }
    return result
  })
}

const local = reactive<FunctionalTestItem[]>(normalize(props.modelValue))
watch(() => props.modelValue, (v) => { local.splice(0, local.length, ...normalize(v)) })

// Persist accordion open/closed state per equipment
const storageKey = computed(() => `fpt-open:${props.equipmentId || props.equipmentTag || 'global'}`)
function readOpenState() {
  try {
    const raw = localStorage.getItem(storageKey.value)
    if (!raw) return
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      local.forEach((t, i) => { openState.set(t, !!arr[i]) })
      openVersion.value++
    }
  } catch (e) {
    // ignore: localStorage may be unavailable or contain invalid data
  }
}
function writeOpenState() {
  try {
    const arr = local.map(t => !!isOpen(t))
    localStorage.setItem(storageKey.value, JSON.stringify(arr))
  } catch (e) {
    // ignore: best-effort persistence only
  }
}
// initialize and keep in sync on list changes
readOpenState()
readFieldOpenState()
watch(() => props.modelValue, () => { readOpenState(); readFieldOpenState() })
watch(() => local.length, () => { writeOpenState(); writeFieldOpenState() })

function expandAll() { local.forEach(t => openState.set(t, true)); openVersion.value++; writeOpenState() }
function collapseAll() { local.forEach(t => openState.set(t, false)); openVersion.value++; writeOpenState() }

const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return local
  return local.filter(t =>
    (t.name || '').toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q) ||
    (t.expected_result || '').toLowerCase().includes(q)
  )
})

const passedCount = computed(() => local.filter(t => t.pass === true).length)
const progressPct = computed(() => local.length ? Math.round((passedCount.value / local.length) * 100) : 0)

// Enable drag-and-drop when not searching (to avoid filtered indices mismatch)
const dragEnabled = computed(() => !search.value.trim())

// Drag-and-drop state and handlers
const draggingTest = ref<FunctionalTestItem | null>(null)
function onDragStart(t: FunctionalTestItem, e: DragEvent) {
  if (!dragEnabled.value) return
  draggingTest.value = t
  if (e && e.dataTransfer) {
    try { e.dataTransfer.setData('text/plain', 'fpt') } catch (err) {
      // ignore: some environments disallow setting drag data
    }
    e.dataTransfer.effectAllowed = 'move'
  }
}
function onDragOver(_t: FunctionalTestItem, e: DragEvent) {
  if (!dragEnabled.value) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}
function onDrop(target: FunctionalTestItem, e: DragEvent) {
  if (!dragEnabled.value) return
  e.preventDefault()
  const src = draggingTest.value
  draggingTest.value = null
  if (!src || src === target) return
  const fromIdx = local.indexOf(src as any)
  const toIdx = local.indexOf(target as any)
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return
  const [moved] = local.splice(fromIdx, 1)
  local.splice(toIdx, 0, moved)
  renumber()
  notifyChange()
  writeOpenState()
}

function notifyChange() {
  emit('update:modelValue', local)
  emit('change', local)
}

function saveNow() {
  // ensure v-model is updated and notify parent to persist immediately
  emit('update:modelValue', local)
  emit('save', local)
}

// Optional field visibility (Description, Notes) per test item
const fieldOpenVersion = ref(0)
const descOpenMap = new WeakMap<FunctionalTestItem, boolean>()
const notesOpenMap = new WeakMap<FunctionalTestItem, boolean>()

// Persist field open/closed state per equipment across sessions (by current list index)
const storageFieldsKey = computed(() => `${storageKey.value}:fields`)
function readFieldOpenState() {
  try {
    const raw = localStorage.getItem(storageFieldsKey.value)
    const arr = raw ? JSON.parse(raw) : null
    if (!Array.isArray(arr)) return
    local.forEach((t, i) => {
      const it = arr[i]
      if (it && typeof it === 'object') {
        if (typeof it.desc === 'boolean') descOpenMap.set(t, it.desc)
        if (typeof it.notes === 'boolean') notesOpenMap.set(t, it.notes)
      }
    })
    fieldOpenVersion.value++
  } catch (e) {
    // ignore: localStorage may be unavailable or contain invalid data
  }
}
function writeFieldOpenState() {
  try {
    const out = local.map((t) => ({ desc: !!descOpenMap.get(t), notes: !!notesOpenMap.get(t) }))
    localStorage.setItem(storageFieldsKey.value, JSON.stringify(out))
  } catch (e) {
    // ignore: best-effort persistence only
  }
}

function isDescOpen(t: FunctionalTestItem) {
  fieldOpenVersion.value // touch for reactivity
  const v = descOpenMap.get(t)
  if (v !== undefined) return v
  const def = !!(t.description && String(t.description).trim())
  descOpenMap.set(t, def)
  return def
}
function toggleDesc(t: FunctionalTestItem) {
  descOpenMap.set(t, !isDescOpen(t))
  fieldOpenVersion.value++
  writeFieldOpenState()
}
function isNotesOpen(t: FunctionalTestItem) {
  fieldOpenVersion.value
  const v = notesOpenMap.get(t)
  if (v !== undefined) return v
  const def = !!(t.notes && String(t.notes).trim())
  notesOpenMap.set(t, def)
  return def
}
function toggleNotes(t: FunctionalTestItem) {
  notesOpenMap.set(t, !isNotesOpen(t))
  fieldOpenVersion.value++
  writeFieldOpenState()
}

// Column width helper for table mode
function colStyle(name: string) {
  const n = (name || '').toString().trim().toLowerCase()
  // Special handling: let Notes flex by not forcing a large width
  if (n === 'notes') return { width: '10.5rem' }
  // Tighter widths for specific compact columns
  if (n === '#' || n === 'index' || n === 'no.' || n === 'no') return { width: '2rem' }
  if (n === 'point') return { width: '6.5rem' }
  if (n === 'reading') return { width: '6.5rem' }
  if (n === 'pass') return { width: '6rem' }
  // Default more compact base width
  return { width: '9rem' }
}

// Pass column helpers (tri-state: none | pass | fail)
function isPassColumnName(name: string) {
  const n = (name || '').toString().trim().toLowerCase()
  return n === 'pass' || n === 'result' || n === 'status'
}
type PassState = 'none' | 'pass' | 'fail'
function passCellState(v: any): PassState {
  const x = v
  if (x === true || x === 'true' || String(x).toLowerCase() === 'pass' || String(x) === '1' || String(x).toLowerCase() === 'yes') return 'pass'
  if (x === false || x === 'false' || String(x).toLowerCase() === 'fail' || String(x) === '0' || String(x).toLowerCase() === 'no') return 'fail'
  return 'none'
}
function ariaChecked(state: PassState) {
  return state === 'none' ? 'mixed' : (state === 'pass')
}
function passLabel(state: PassState) {
  return state === 'pass' ? 'Pass' : state === 'fail' ? 'Fail' : 'No response'
}
function passBgClass(state: PassState) {
  if (state === 'pass') return 'bg-emerald-500/70 border-emerald-400/80'
  if (state === 'fail') return 'bg-red-500/70 border-red-400/80'
  return 'bg-white/10 border-white/30'
}
function knobTransform(state: PassState) {
  // Track width ~48px (w-12), knob ~20px; positions: 2px, 16px, 30px
  const tx = state === 'pass' ? 30 : state === 'fail' ? 2 : 16
  return `translateX(${tx}px)`
}
function cyclePassCell(i: number, ri: number, key: string) {
  const tbl = (local[i] as any).table
  const curr: PassState = passCellState(tbl.rows[ri][key])
  const next: PassState = curr === 'none' ? 'pass' : (curr === 'pass' ? 'fail' : 'none')
  tbl.rows[ri][key] = next === 'pass' ? true : next === 'fail' ? false : null
  notifyChange()
}

function passText(state: PassState) {
  return state === 'pass' ? 'PASS' : state === 'fail' ? 'FAIL' : '—'
}
function passTextClass(state: PassState) {
  if (state === 'pass') return 'text-emerald-200'
  if (state === 'fail') return 'text-red-200'
  return 'text-white/60'
}

// v-autogrow directive for standard table textarea cells
function grow(el: HTMLTextAreaElement) {
  if (!el) return
  el.style.height = 'auto'
  // small delay ensures value has updated
  const h = el.scrollHeight
  el.style.height = (h ? h : 0) + 'px'
}
const vAutogrow = {
  mounted(el: HTMLTextAreaElement) {
    requestAnimationFrame(() => grow(el))
    const onInput = () => grow(el)
    el.addEventListener('input', onInput)
    ;(el as any)._ag = onInput
  },
  updated(el: HTMLTextAreaElement) {
    requestAnimationFrame(() => grow(el))
  },
  unmounted(el: HTMLTextAreaElement) {
    const onInput = (el as any)._ag
    if (onInput) el.removeEventListener('input', onInput)
  }
}

// Signatures UI state (persisted in UI store per session)
const showSignatures = computed({ get: () => ui.showSignatures, set: (v: any) => ui.setShowSignatures(!!v) })
const signOpen = ref(false)
const sigList = computed(() => Array.isArray(props.signatures) ? props.signatures : [])
// legacy single newSig removed in favor of `drafts` array
const drafts = ref<Array<any>>([])
// Editing state for re-capturing an existing saved signature
const editingIndex = ref<number | null>(null)
const editingDraft = ref<any>(null)

function isDataUrl(s: any) {
  return typeof s === 'string' && s.startsWith('data:')
}

function emitSignatures(arr: any[]) {
  emit('update:signatures', Array.isArray(arr) ? arr : [])
}

// Clear a saved signature (keep title/person) for a specific index




function createDraft() {
  const savedCount = Array.isArray(sigList.value) ? sigList.value.length : 0
  const total = savedCount + drafts.value.length
  if (total >= 6) { ui.showError('Maximum of 6 signatures allowed per test'); return }
  // Prevent a user from creating more than one signature draft if they already have one or a saved signature
  const uid = authStore.user?._id || authStore.user?.id || null
  const personName = ((authStore.user && (String(authStore.user.firstName || '').trim() + ' ' + String(authStore.user.lastName || '').trim()).trim()) || '').trim()
  // determine project role if present
  let projectRole = ''
  try {
    const projects = Array.isArray(authStore.user?.projects) ? authStore.user!.projects as any[] : []
    const match = projects.find((p: any) => String(p?._id || p?.id || p) === String(props.projectId || ''))
    if (match && match.role) projectRole = String(match.role || '')
  } catch (e) { /* ignore */ }
  if (!projectRole && authStore.user && authStore.user.role) projectRole = String(authStore.user.role || '')
  const existingSaved = Array.isArray(sigList.value) ? sigList.value.find((s: any) => (s && ((s.createdBy && String(s.createdBy) === String(uid)) || (!s.createdBy && String(s.person || '') === personName)))) : null
  const existingDraft = drafts.value.find((d: any) => (d && d.createdBy && String(d.createdBy) === String(uid)))
  if (existingDraft) { ui.showError('You already have a signature draft for this test'); return }
  // If user already has a saved signature, prefill a draft for recapture/replacement
  if (existingSaved) {
    drafts.value.push({ title: String(existingSaved.title || '').trim(), person: String(existingSaved.person || personName), role: String(existingSaved.role || projectRole), block: '', date: new Date().toISOString(), createdBy: uid })
    return
  }
  drafts.value.push({ title: '', person: personName, role: projectRole, block: '', date: new Date().toISOString(), createdBy: uid })
}

// Insert the current user's stored profile signature as a new draft
function insertProfileSignature() {
  try {
    // Use the already-instantiated authStore for consistent reactivity
    const user = (authStore.user as any) || null
    const profileSig = user?.contact?.signature
    const savedBlock = profileSig && profileSig.block ? String(profileSig.block) : ''
    if (!savedBlock) { ui.showError('No saved signature on your profile'); return }
    const savedCount = Array.isArray(sigList.value) ? sigList.value.length : 0
    const total = savedCount + drafts.value.length
    if (total >= 6) { ui.showError('Maximum of 6 signatures allowed per test'); return }

    const personName = ((user && (String(user.firstName || '').trim() + ' ' + String(user.lastName || '').trim()).trim()) || profileSig.person || '').trim()
    // Determine project role if available, otherwise fall back to global role
    let projectRole = ''
    try {
      const projects = Array.isArray(authStore.user?.projects) ? authStore.user!.projects as any[] : []
      const match = projects.find((p: any) => String(p?._id || p?.id || p) === String(props.projectId || ''))
      if (match && match.role) projectRole = String(match.role || '')
    } catch (e) { /* ignore */ }
    if (!projectRole && user && user.role) projectRole = String(user.role || '')
    const person = personName

      // Instead of creating a draft, auto-save the profile signature into the saved signatures
    const arr = Array.isArray(sigList.value) ? sigList.value.slice() : []
    if (arr.length >= 6) { ui.showError('Maximum of 6 signatures allowed per test'); return }
    const uid = authStore.user?._id || authStore.user?.id || null
    // Prevent duplicate by user - if exists, replace existing signature for that user
    const personNamePlain = ((authStore.user && (String(authStore.user.firstName || '').trim() + ' ' + String(authStore.user.lastName || '').trim()).trim()) || profileSig.person || '').trim()
    const existingIdx = arr.findIndex((s: any) => (s && ((s.createdBy && String(s.createdBy) === String(uid)) || (!s.createdBy && String(s.person || '') === personNamePlain))))
    const newSig = { title: String(profileSig.title || '').trim(), person: person, role: projectRole, block: savedBlock, date: new Date().toISOString(), createdBy: uid }
    if (existingIdx >= 0) {
      arr[existingIdx] = newSig
    } else {
      arr.push(newSig)
    }
      emitSignatures(arr)
      // ensure the signatures accordion is visible and open so user sees the new saved signature
      showSignatures.value = true
      signOpen.value = true
      ui.showSuccess('Inserted profile signature')
  } catch (e) {
    ui.showError('Failed to insert profile signature')
  }
}

function startEditSignature(idx: number) {
  try {
    const arr = Array.isArray(sigList.value) ? sigList.value : []
    const src = arr[idx]
    if (!src) return
    editingIndex.value = idx
    // shallow copy for editing
    editingDraft.value = { title: src.title || '', person: src.person || '', role: src.role || '', block: src.block || '', date: src.date || new Date().toISOString(), createdBy: src.createdBy || null }
  } catch (e) { /* ignore */ }
}

// Note: no explicit cancel handler needed; editing is cleared on save or when replaced

function saveEditedSignature(idx: number) {
  try {
    const d = editingDraft.value
    if (!d || !d.block) { ui.showError('Signature cannot be empty'); return }
    const arr = Array.isArray(sigList.value) ? sigList.value.slice() : []
    const existingCreatedBy = (Array.isArray(sigList.value) && sigList.value[idx] && sigList.value[idx].createdBy) ? sigList.value[idx].createdBy : null
    const createdBy = existingCreatedBy || d.createdBy || (authStore.user?._id || authStore.user?.id) || null
  arr[idx] = { title: String(d.title || '').trim(), person: String(d.person || '').trim(), role: String(d.role || '').trim(), block: d.block || '', date: new Date().toISOString(), createdBy }
    emitSignatures(arr)
    // clear editing state
    editingIndex.value = null
    editingDraft.value = null
  } catch (e) { /* ignore */ }
}

function saveDraft(idx: number) {
  const d = drafts.value[idx]
  if (!d || !d.block) { ui.showError('Signature cannot be empty'); return }
  const arr = Array.isArray(sigList.value) ? sigList.value.slice() : []
  if (arr.length >= 6) { ui.showError('Maximum of 6 signatures allowed per test'); return }
  const uid = authStore.user?._id || authStore.user?.id || null
  const personName = ((authStore.user && (String(authStore.user.firstName || '').trim() + ' ' + String(authStore.user.lastName || '').trim()).trim()) || '').trim()
  const createdBy = d.createdBy || uid
  // replace existing signature for same user (fallback to person name match)
  const existingIdx = arr.findIndex((s: any) => (s && ((s.createdBy && String(s.createdBy) === String(createdBy)) || (!s.createdBy && String(s.person || '') === personName))))
  const newSig = { title: String(d.title || '').trim(), person: String(d.person || '').trim(), role: String(d.role || '').trim(), block: d.block || '', date: d.date || new Date().toISOString(), createdBy }
  if (existingIdx >= 0) arr[existingIdx] = newSig
  else arr.push(newSig)
  emitSignatures(arr)
  drafts.value.splice(idx, 1)
}

function removeDraft(idx: number) {
  drafts.value.splice(idx, 1)
}

function onPadSavedDraft(idx: number, url: string) {
  const d = drafts.value[idx]
  if (d) d.block = url
  // delegate to existing saveDraft which will validate and emit
  saveDraft(idx)
}

function onPadSavedEdited(idx: number, url: string) {
  if (!editingDraft.value) return
  editingDraft.value.block = url
  saveEditedSignature(idx)
}

// Remove a saved signature at index and persist to parent
function removeSignature(idx: number) {
  try {
    const arr = Array.isArray(sigList.value) ? sigList.value.slice() : []
    if (idx < 0 || idx >= arr.length) return
    arr.splice(idx, 1)
    emitSignatures(arr)
  } catch (e) { /* ignore */ }
}

// Auto-update draft timestamp when the signature block changes (auto-save metadata)
watch(drafts, (list) => {
  for (const d of list) {
    try {
      if (d && d.block) d.date = new Date().toISOString()
    } catch (e) { /* ignore */ }
  }
}, { deep: true })

 



// Small local helper to format dates consistently in this panel
function formatDateTime(d?: any) { if (!d) return ''; try { return new Date(d).toLocaleString() } catch (e) { return String(d) } }

// New FPT creation modal state
const newOpen = ref(false)
const newType = ref<'standard'|'table'>('standard')
const newName = ref('')
const newDesc = ref('')

function openNewFpt() { newOpen.value = true }
function closeNewFpt() { newOpen.value = false; newType.value = 'standard'; newName.value = ''; newDesc.value = '' }

function addTestOfType(kind: 'standard'|'sheet'|'table', name?: string, description?: string) {
  const nextNum = (local.length ? Number(local[local.length-1].number || local.length) + 1 : 1)
  const base: FunctionalTestItem = {
    number: isFinite(nextNum) ? nextNum : local.length + 1,
    name: name || '',
    description: description || '',
    expected_result: '',
    actual_result: '',
    notes: '',
    pass: null,
    issues: [],
    kind: kind,
    rows: kind === 'sheet' ? [{ step: '', expected: '', actual: '' }] : [],
    table: (kind === 'table' || kind === 'standard') ? { columns: [], rows: [] } : undefined
  }
  local.push(base)
  // Auto-open the newly created test for immediate visibility
  openState.set(base as any, true)
  openVersion.value++
  setStatus(base, null)
  notifyChange()
}

function createNewFpt() {
  addTestOfType(newType.value, newName.value.trim(), newDesc.value.trim())
  closeNewFpt()
}

// Spreadsheet (legacy sheet) row helpers
function addRow(i: number) {
  const t = local[i] as any
  if (!Array.isArray(t.rows)) t.rows = []
  t.rows.push({ step: '', expected: '', actual: '' })
  notifyChange()
}
function removeRow(i: number, ri: number) {
  const t = local[i] as any
  if (!Array.isArray(t.rows)) return
  t.rows.splice(ri, 1)
  notifyChange()
}
function clearRows(i: number) {
  const t = local[i] as any
  t.rows = []
  notifyChange()
}

// Table helpers
function ensureTable(i: number) {
  const t = local[i]
  if (!t.table) t.table = { columns: [], rows: [] }
}
function newColKey() { return 'c' + Math.random().toString(36).slice(2, 8) }
function addTableColumn(i: number) {
  ensureTable(i)
  const cols = (local[i] as any).table.columns as Array<{ key: string; name: string }>
  const idx = cols.length + 1
  cols.push({ key: newColKey(), name: `Column ${idx}` })
  notifyChange()
}
function removeTableColumn(i: number, ci: number) {
  ensureTable(i)
  const tbl = (local[i] as any).table
  const col = tbl.columns[ci]
  if (!col) return
  // Remove data from rows
  for (const r of tbl.rows) delete r[col.key]
  tbl.columns.splice(ci, 1)
  notifyChange()
}
function addTableRow(i: number) {
  ensureTable(i)
  const tbl = (local[i] as any).table
  const row: Record<string, any> = {}
  for (const c of tbl.columns) row[c.key] = ''
  tbl.rows.push(row)
  notifyChange()
}
function removeTableRow(i: number, ri: number) {
  ensureTable(i)
  const tbl = (local[i] as any).table
  tbl.rows.splice(ri, 1)
  notifyChange()
}

async function removeTest(i: number) {
  await new Promise(r => setTimeout(r))
  const ok = await inlineConfirm({ title: 'Delete test', message: 'Delete this test? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!ok) return
  local.splice(i, 1)
  renumber()
  notifyChange()
}

function move(i: number, dir: number) {
  const j = i + dir
  if (j < 0 || j >= local.length) return
  const tmp = local[i]
  local[i] = local[j]
  local[j] = tmp
  renumber()
  notifyChange()
}

function renumber() {
  // Always set numbers to match visual order
  local.forEach((t, i) => { t.number = i + 1 })
}

function setPass(i: number, v: boolean | null) {
  const t = local[i]
  const curr = t.pass
  if (v === true) {
    if (curr === true) { t.pass = null; setStatus(t, null) }
    else { t.pass = true; setStatus(t, 'pass') }
  } else if (v === false) {
    if (curr === false) { t.pass = null; setStatus(t, null) }
    else { t.pass = false; setStatus(t, 'fail') }
  } else {
    // N/A is explicit when toggled on; toggling again clears to neutral
    const s = getStatus(t)
    if (s === 'na') { t.pass = null; setStatus(t, null) }
    else { t.pass = null; setStatus(t, 'na') }
  }
  notifyChange()
}
function markAll(v: boolean | null) {
  local.forEach(t => {
    t.pass = v
    setStatus(t, v === true ? 'pass' : v === false ? 'fail' : 'na')
  })
  notifyChange()
}

function passClass(active: boolean) { return ['px-2', 'py-1', 'rounded-md', 'border', 'text-sm', active ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35' : 'bg-white/10 border-white/20 hover:bg-white/15'] }
function failClass(active: boolean) { return ['px-2', 'py-1', 'rounded-md', 'border', 'text-sm', active ? 'bg-red-500/20 border-red-400/60 text-red-100 hover:bg-red-500/35' : 'bg-white/10 border-white/20 hover:bg-white/15'] }
function naClass(active: boolean) { return ['px-2', 'py-1', 'rounded-md', 'border', 'text-sm', active ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35' : 'bg-white/10 border-white/20 hover:bg-white/15'] }

// Quick issue attach
const issueOpen = ref(false)
const issueCtx = ref<{ index: number } | null>(null)
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
  type: 'FPT',
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

function openIssue(i: number) {
  issueCtx.value = { index: i }
  const t = local[i]
  const eq = normalizeText(props.equipmentTag) || normalizeId(props.equipmentId) || 'Equipment'
  issueDraft.value.title = `FPT: ${eq} • #${t.number ?? (i+1)}${t.name ? ' – ' + t.name : ''}`.slice(0, 120)
  const lines: string[] = []
  lines.push(`Equipment: ${eq}`)
  if (props.equipmentSpace) lines.push(`Space: ${props.equipmentSpace}`)
  lines.push(`Test: #${t.number ?? (i+1)}${t.name ? ' – ' + t.name : ''}`)
  if (t.expected_result) lines.push(`Expected: ${t.expected_result}`)
  if (t.actual_result) lines.push(`Actual: ${t.actual_result}`)
  if (t.notes) lines.push(`Notes: ${t.notes}`)
  issueDraft.value.description = lines.join('\n')
  issueDraft.value.type = 'FPT'
  issueDraft.value.status = 'open'
  issueDraft.value.priority = 'medium'
  // `Issue.location` should represent physical location/space; store equipment tag in `Issue.tag`.
  issueDraft.value.location = normalizeText(props.equipmentSpace) || ''
  issueDraft.value.system = t && (t as any).system ? String((t as any).system) : ''
  issueDraft.value.foundBy = ''
  issueDraft.value.dateFound = ''
  issueDraft.value.dueDate = ''
  issueDraft.value.assignedTo = ''
  issueOpen.value = true
}
function closeIssue() { issueOpen.value = false; issueCtx.value = null }

async function createIssueFromTest() {
  try {
    const ctx = issueCtx.value
    if (!ctx) return
    const i = ctx.index
    const t = local[i]
    const pid = normalizeId(props.projectId) || normalizeId((projectStore.currentProjectId as any)?.value ?? projectStore.currentProjectId) || ''
    if (!pid) return
    const draft = issueDraft.value || ({} as any)
    const assetId = normalizeId(props.equipmentId)
    const location = normalizeText(draft.location) || normalizeText(props.equipmentSpace)
    const payload: any = {
      projectId: pid,
      title: (draft.title || '').trim() || 'FPT Issue',
      description: (draft.description || '').trim() || 'Created from FPT',
      type: draft.type || 'FPT',
      severity: toApiPriority(draft.priority),
      status: toApiStatus(draft.status),
      system: normalizeText(draft.system) || (t && (t as any).system ? (t as any).system : undefined),
      tag: normalizeText(props.equipmentTag) || undefined,
      assignedTo: draft.assignedTo || undefined,
      foundBy: draft.foundBy || undefined,
      dateFound: draft.dateFound || undefined,
      dueDate: draft.dueDate || undefined,
    }
    if (location) payload.location = location
    if (assetId) payload.assetId = assetId
    const created = await issuesStore.createIssue(payload)
    if (!Array.isArray(t.issues)) t.issues = []
    t.issues.push({ id: (created as any).id || (created as any)._id, number: (created as any).number, title: (created as any).title, type: (created as any).type })
    notifyChange()
    // best-effort log
    try {
      const who = (localStorage.getItem('userName') || '')
      const by = who || ''
      projectStore.appendProjectLog(String(pid), {
        ts: new Date().toISOString(),
        by,
        type: 'fpt_issue_created',
        module: 'fpt',
        scope: { entity: 'equipment', equipmentId: props.equipmentId || null, equipmentTag: props.equipmentTag || null, projectId: pid },
        test: { number: t.number ?? i+1, name: t.name || '' },
        issue: { id: (created as any).id || (created as any)._id, number: (created as any).number }
    }).catch(() => { /* ignore project log failures */ })
  } catch (e) { /* ignore best-effort log errors */ }
    issueOpen.value = false
    issueCtx.value = null
  } catch (err: any) {
    console.error('create issue from FPT failed', err)
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to create issue')
  }
}
</script>

<script lang="ts">
// Keep DnD helpers in a separate (merged) script block for clarity
export default {}
</script>
