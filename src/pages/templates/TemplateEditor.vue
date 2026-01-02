<template>
  <section class="space-y-4 text-white">
    <div>
      <BreadCrumbs :items="crumbs" />
    </div>

    <div
      v-if="loading"
      class="w-full rounded-2xl p-6 bg-white/6 backdrop-blur-xl border border-white/10 text-white/80 flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <div>
        <p class="text-sm uppercase tracking-wide">
          Loading template…
        </p>
        <p class="text-xs text-white/60">
          Fetching template details
        </p>
      </div>
    </div>

    <div
      v-else
      class="w-full rounded-2xl p-4 md:p-6 bg-white/6 backdrop-blur-xl border border-white/10"
    >
      <!-- Tabs header: Info, Components, Photos, Attachments, Checklists, FPT, Instances -->
      <div class="mb-4 md:mb-6">
        <div
          role="tablist"
          class="relative flex items-center w-full"
        >
          <div
            class="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out"
            :style="{ left: tabLeft + '%', width: tabWidth + '%' }"
          />
          <button
            v-for="t in tabs"
            :key="t"
            :aria-selected="currentTab === t"
            role="tab"
            class="flex-1 text-center px-3 py-2 text-sm flex items-center justify-center gap-2"
            :class="currentTab === t ? 'text-white border-b-2 border-white rounded-t-md bg-white/6' : 'text-white/70 hover:text-white/90'"
            @click="currentTab = t"
          >
            <svg
              v-if="t === 'Info'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><circle
              cx="12"
              cy="12"
              r="9"
              stroke-width="1.5"
            /><path
              d="M12 11v6"
              stroke-width="1.5"
              stroke-linecap="round"
            /><path
              d="M12 7h.01"
              stroke-width="2"
              stroke-linecap="round"
            /></svg>
            <svg
              v-else-if="t === 'Components'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><rect
              x="3"
              y="3"
              width="8"
              height="8"
              rx="1.5"
              stroke-width="1.5"
            /><rect
              x="13"
              y="3"
              width="8"
              height="8"
              rx="1.5"
              stroke-width="1.5"
            /><rect
              x="3"
              y="13"
              width="8"
              height="8"
              rx="1.5"
              stroke-width="1.5"
            /><rect
              x="13"
              y="13"
              width="8"
              height="8"
              rx="1.5"
              stroke-width="1.5"
            /></svg>
            <svg
              v-else-if="t === 'Photos'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
              ry="2"
              stroke-width="1.5"
            /><path
              d="M8 11l3 3 2-2 4 4"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /><circle
              cx="8.5"
              cy="9.5"
              r="1.5"
              stroke-width="1.5"
            /></svg>
            <svg
              v-else-if="t === 'Attachments'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><path
              d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 0 1-2.83-2.83l7.07-7.07"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg>
            <svg
              v-else-if="t === 'Checklists'"
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
            <svg
              v-else-if="t === 'FPT'"
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
            <svg
              v-else-if="t === 'Instances'"
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            ><rect
              x="3"
              y="4"
              width="18"
              height="16"
              rx="2"
              stroke-width="1.5"
            /><path
              d="M7 8h10M7 12h6M7 16h8"
              stroke-width="1.5"
            /></svg>
            <span>{{ t }}</span>
            <span
              v-if="countForTab(t) > 0"
              class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] leading-none text-white/80"
            >{{ countForTab(t) }}</span>
          </button>
        </div>
      </div>

      <!-- Tab content -->
      <div>
        <!-- Info Tab -->
        <div
          v-if="currentTab === 'Info'"
          class="grid md:grid-cols-2 gap-x-4 gap-y-2 items-start"
        >
          <!-- Left: core fields -->
          <div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-white/70">Tag <span class="text-red-300">*</span></label>
                <input
                  v-model="form.tag"
                  type="text"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
                >
                <div
                  v-if="!isValidTag"
                  class="text-xs text-red-300 mt-1"
                >
                  Tag is required.
                </div>
              </div>
              <div>
                <label class="block text-sm text-white/70">Type <span class="text-red-300">*</span></label>
                <div class="relative">
                  <select
                    v-model="form.type"
                    class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
                  >
                    <option
                      v-for="opt in typeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.text }}
                    </option>
                  </select>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"
                  ><path
                    d="M6 9l6 6 6-6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                </div>
                <div
                  v-if="!isValidType"
                  class="text-xs text-red-300 mt-1"
                >
                  Type is required.
                </div>
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Title <span class="text-red-300">*</span></label>
              <input
                v-model="form.title"
                type="text"
                required
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
              >
              <div
                v-if="!isValidTitle"
                class="text-xs text-red-300 mt-1"
              >
                Title is required.
              </div>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm text-white/70">System</label>
                <div class="relative">
                  <select
                    v-model="form.system"
                    class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
                  >
                    <option
                      v-for="opt in systemSelectOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.text }}
                    </option>
                  </select>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"
                  ><path
                    d="M6 9l6 6 6-6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                </div>
              </div>
              <div>
                <label class="block text-sm text-white/70">Status</label>
                <div class="relative">
                  <select
                    v-model="form.status"
                    class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
                  >
                    <option
                      v-for="s in statuses"
                      :key="s"
                      :value="s"
                    >
                      {{ s }}
                    </option>
                  </select>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"
                  ><path
                    d="M6 9l6 6 6-6"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  /></svg>
                </div>
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Space</label>
              <div class="relative">
                <select
                  v-model="(form as any).spaceId"
                  class="w-full px-3 pr-10 py-2 rounded-md bg-white/10 border border-white/20 appearance-none"
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/80"
                ><path
                  d="M6 9l6 6 6-6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
              </div>
            </div>
            <div class="mt-2">
              <label class="block text-sm text-white/70">Description</label>
              <textarea
                v-model="form.description"
                rows="4"
                class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
              />
            </div>
            <div class="mt-2">
              <div class="flex items-center gap-3">
                <div class="text-sm text-white/70 shrink-0">
                  Tags
                </div>
                <button
                  v-if="canSuggestTemplateTags"
                  type="button"
                  class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80 disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="suggestingTemplateTags"
                  @click="suggestTemplateTags"
                >
                  {{ suggestingTemplateTags ? 'Suggesting…' : 'Suggest tags' }}
                </button>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="t in (form as any).tags"
                    :key="t"
                    class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/80"
                  >
                    <span>{{ t }}</span>
                    <button
                      type="button"
                      class="text-white/60 hover:text-white"
                      aria-label="Remove tag"
                      @click="removeTemplateTag(t)"
                    >
                      ×
                    </button>
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-2">
                <input
                  v-model="templateTagsInput"
                  type="text"
                  placeholder="Add a tag and press Enter…"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                  @keydown.enter.prevent="addTemplateTagsFromInput"
                  @keydown.,.prevent="addTemplateTagsFromInput"
                >
                <button
                  type="button"
                  class="h-10 px-3 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
                  @click="addTemplateTagsFromInput"
                >
                  Add
                </button>
              </div>
              <div class="text-xs text-white/60 mt-1">
                Tip: use commas or Enter to add multiple tags.
              </div>
              <div
                v-if="suggestedTemplateTagsFiltered.length"
                class="mt-2 rounded-md border border-white/10 bg-black/20 p-3"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs text-white/60">
                    Suggested tags
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="px-2 py-1 rounded-md bg-white/10 border border-white/15 hover:bg-white/15 text-xs text-white/80"
                      @click="applyAllSuggestedTemplateTags"
                    >
                      Add all
                    </button>
                    <button
                      type="button"
                      class="px-2 py-1 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-white/70"
                      @click="dismissSuggestedTemplateTags"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    v-for="s in suggestedTemplateTagsFiltered"
                    :key="s.tag"
                    type="button"
                    class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/85 hover:bg-white/15"
                    :title="s.reason || ''"
                    @click="addTemplateTag(String(s.tag || ''))"
                  >
                    <span>{{ s.tag }}</span>
                    <span
                      v-if="typeof s.confidence === 'number'"
                      class="text-white/60"
                    >{{ Math.round(s.confidence * 100) }}%</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-2">
              <button
                :disabled="saving || !isValidForm"
                class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 inline-flex items-center gap-2"
                :class="(saving || !isValidForm) ? 'opacity-60 cursor-not-allowed' : ''"
                @click="save"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                ><path
                  d="M5 13l4 4L19 7"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
                <span>Save</span>
              </button>
              <button
                class="px-3 py-2 rounded-md bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 inline-flex items-center gap-2"
                @click="onDelete"
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
                <span>Delete</span>
              </button>
              <div class="flex-1" />
            </div>
          </div>

          <!-- Right: Attributes editor -->
          <div class="space-y-2">
            <div class="rounded-md border border-white/10 bg-white/5 p-3">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm text-white/80">
                  Attributes
                </div>
                <div class="text-xs text-white/60">
                  {{ currentAttributes.length }} items
                </div>
              </div>
              <div
                v-if="currentAttributes.length === 0"
                class="text-white/60 text-sm"
              >
                No attributes yet.
              </div>
              <ul
                v-else
                class="divide-y divide-white/10"
              >
                <li
                  v-for="(a, i) in currentAttributes"
                  :key="i"
                  class="py-2 flex items-center gap-2"
                >
                  <template v-if="editingIndex === i">
                    <input
                      v-model="editKey"
                      class="w-40 px-2 py-1 rounded-md bg-white/10 border border-white/20"
                      placeholder="Key"
                    >
                    <input
                      v-model="editValue"
                      class="flex-1 min-w-0 px-2 py-1 rounded-md bg-white/10 border border-white/20"
                      placeholder="Value"
                    >
                    <button
                      class="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-500/35 text-sm"
                      @click="saveEdit(i)"
                    >
                      Save
                    </button>
                    <button
                      class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                      @click="cancelEdit"
                    >
                      Cancel
                    </button>
                  </template>
                  <template v-else>
                    <span class="w-40 truncate text-white/90">{{ a.key }}</span>
                    <span class="flex-1 min-w-0 truncate text-white/70">{{ a.value }}</span>
                    <button
                      class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                      @click="startEdit(i)"
                    >
                      Edit
                    </button>
                    <button
                      class="px-2 py-1 rounded-md bg-red-500/20 border border-red-400/60 text-red-100 hover:bg-red-500/35 text-sm"
                      @click="removeAttr(i)"
                    >
                      Remove
                    </button>
                  </template>
                </li>
              </ul>
              <div class="mt-3 flex items-center gap-2">
                <input
                  v-model="newAttrKey"
                  class="w-40 px-2 py-1 rounded-md bg-white/10 border border-white/20"
                  placeholder="Key"
                >
                <input
                  v-model="newAttrValue"
                  class="flex-1 min-w-0 px-2 py-1 rounded-md bg-white/10 border border-white/20"
                  placeholder="Value"
                >
                <button
                  :disabled="!newAttrKey.trim()"
                  class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm"
                  :class="!newAttrKey.trim() ? 'opacity-60 cursor-not-allowed' : ''"
                  @click="addAttr"
                >
                  Add
                </button>
              </div>
            </div>

            <!-- Navigation moved to footer -->
          </div>
        </div>

        <!-- Components Tab -->
        <div
          v-else-if="currentTab === 'Components'"
          class="space-y-3"
        >
          <ComponentsPanel
            v-model="components"
            :statuses="statuses"
            :project-id="String(form.projectId || projectStore.currentProjectId || '')"
            :asset-id="String(form.id || (form as any)._id || id)"
            :asset-tag="String(form.tag || '')"
            :asset-system="String(form.system || '')"
            @change="onComponentsChange"
          />
        </div>

        <!-- Photos Tab -->
        <div
          v-else-if="currentTab === 'Photos'"
          class="space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="text-white/80">
              Photos
            </div>
            <PhotoUploader
              :upload="uploadPhoto"
              :existing-count="(form as any).photos ? (form as any).photos.length : 0"
              :max-count="16"
              :concurrency="1"
              @done="refreshAfterUpload('photos')"
            />
          </div>
          <div
            v-if="!(form as any).photos || !(form as any).photos.length"
            class="text-white/60 text-sm"
          >
            No photos yet.
          </div>
          <div
            v-else
            class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            <div
              v-for="(p, idx) in (form as any).photos"
              :key="idx"
              class="rounded-md overflow-hidden border border-white/10 bg-white/5"
            >
              <img
                :src="p.data"
                :alt="p.filename"
                class="w-full h-40 object-cover"
              >
              <div class="p-2 text-xs text-white/70 flex items-center justify-between gap-2">
                <input
                  v-model="p.caption"
                  placeholder="Caption"
                  class="w-full px-2 py-1 rounded bg-white/10 border border-white/20"
                  @change="updatePhotoMeta(idx, p.caption)"
                >
                <button
                  class="ml-2 px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30"
                  @click="removePhoto(idx)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Attachments Tab -->
        <div
          v-else-if="currentTab === 'Attachments'"
          class="space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="text-white/80">
              Attachments
            </div>
            <DocumentUploader
              :upload="uploadAttachment"
              :concurrency="2"
              @done="refreshAfterUpload('attachments')"
            />
          </div>
          <div
            v-if="!(form as any).attachments || !(form as any).attachments.length"
            class="text-white/60 text-sm"
          >
            No attachments yet.
          </div>
          <div
            v-else
            class="space-y-2"
          >
            <div
              v-for="(a, idx) in (form as any).attachments"
              :key="idx"
              class="flex items-center justify-between gap-3 p-2 rounded-md bg-white/5 border border-white/10"
            >
              <div class="truncate">
                <a
                  :href="a.url || a.data"
                  target="_blank"
                  rel="noopener"
                  class="text-white/90 hover:underline"
                >{{ a.filename || a.url }}</a>
              </div>
              <button
                class="px-2 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-200 hover:bg-red-500/30 text-sm"
                @click="removeAttachment(idx)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Checklists Tab -->
        <div v-else-if="currentTab === 'Checklists'">
          <ChecklistPanel
            v-model="checklists"
            :project-id="String(form.projectId || '')"
            :equipment-id="String(form.id || (form as any)._id || '')"
            :equipment-tag="form.tag || ''"
            @change="onChecklistsChange"
          />
        </div>

        <!-- FPT Tab -->
        <div v-else-if="currentTab === 'FPT'">
          <FunctionalTestsPanel
            v-model="functionalTests"
            :project-id="String(form.projectId || '')"
            :equipment-id="String(form.id || (form as any)._id || '')"
            :equipment-tag="form.tag || ''"
            @change="onFunctionalTestsChange"
            @save="onFunctionalTestsSave"
          />
        </div>
        
        <!-- Instances Tab -->
        <div
          v-else-if="currentTab === 'Instances'"
          class="space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="text-white/80">
              Equipment created from this template.
            </div>
            <div class="flex items-center gap-2">
              <button
                :disabled="selectedInstanceIds.length === 0 || pushing"
                class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 hover:bg-emerald-500/30 inline-flex items-center gap-2 disabled:opacity-50"
                @click="onPushChanges"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  class="w-4 h-4"
                ><path
                  d="M4 12h16"
                  stroke-width="1.5"
                  stroke-linecap="round"
                /><path
                  d="M10 6l6 6-6 6"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                /></svg>
                <span v-if="pushing">Pushing…</span>
                <span v-else>Push changes<span v-if="selectedInstanceIds.length"> ({{ selectedInstanceIds.length }})</span></span>
              </button>
              <button
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2"
                @click="showCreateDialog = true"
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
                <span>Create from template</span>
              </button>
              <button
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 inline-flex items-center gap-2"
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
                <span>Upload Tags</span>
              </button>
            </div>
          </div>
          <div
            v-if="!instancesForTemplate.length"
            class="text-white/60"
          >
            No equipment instances yet.
          </div>
          <div
            v-else
            class="overflow-x-auto rounded-md border border-white/10"
          >
            <table class="min-w-full text-sm">
              <thead class="bg-white/5 text-white/70">
                <tr>
                  <th class="w-8 px-2 py-2">
                    <input
                      type="checkbox"
                      :checked="allSelected"
                      @change="toggleSelectAll(($event.target as HTMLInputElement)?.checked)"
                    >
                  </th>
                  <th class="text-left px-3 py-2">
                    Tag
                  </th>
                  <th class="text-left px-3 py-2">
                    Title
                  </th>
                  <th class="text-left px-3 py-2">
                    Location
                  </th>
                  <th class="text-left px-3 py-2">
                    Status
                  </th>
                  <th class="text-right px-3 py-2">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="e in instancesForTemplate"
                  :key="e.id"
                  class="border-t border-white/10 hover:bg-white/5"
                >
                  <td class="px-2 py-2 align-middle">
                    <input
                      v-model="selectedInstanceIds"
                      type="checkbox"
                      :value="e.id"
                    >
                  </td>
                  <td class="px-3 py-2 align-middle whitespace-nowrap">
                    {{ e.tag || '—' }}
                  </td>
                  <td class="px-3 py-2 align-middle truncate">
                    {{ e.title || '—' }}
                  </td>
                  <td class="px-3 py-2 align-middle truncate">
                    {{ spaceName(e.spaceId) || '—' }}
                  </td>
                  <td class="px-3 py-2 align-middle whitespace-nowrap">
                    {{ e.status || 'Not Started' }}
                  </td>
                  <td class="px-3 py-2 align-middle text-right">
                    <RouterLink
                      :to="{ name: 'equipment-edit', params: { id: e.id } }"
                      class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                      title="Open"
                      aria-label="Open"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        class="w-4 h-4"
                      >
                        <path
                          d="M4 12h16"
                          stroke-width="1.5"
                          stroke-linecap="round"
                        />
                        <path
                          d="M14 6l6 6-6 6"
                          stroke-width="1.5"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Create from template dialog -->
          <Modal
            v-model="showCreateDialog"
            :panel-class="'max-w-xl'"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-lg">
                  Create equipment from template
                </div>
              </div>
            </template>
            <div class="space-y-4">
              <div class="text-sm text-white/70">
                Provide tags for the new equipment. You can either paste a comma-separated list, or generate tags using a prefix and count. Location/space and status will be inherited from this template.
              </div>

              <div class="flex items-center gap-3">
                <button
                  class="px-3 py-1.5 rounded-md border"
                  :class="createMode === 'csv' ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20'"
                  @click="createMode = 'csv'"
                >
                  CSV list
                </button>
                <button
                  class="px-3 py-1.5 rounded-md border"
                  :class="createMode === 'prefix' ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20'"
                  @click="createMode = 'prefix'"
                >
                  Prefix + count
                </button>
              </div>

              <div
                v-if="createMode === 'csv'"
                class="space-y-2"
              >
                <label class="block text-sm text-white/80">Tags (comma-separated)</label>
                <textarea
                  v-model="createForm.tagsCsv"
                  rows="3"
                  placeholder="e.g. AHU-01, AHU-02, AHU-03"
                  class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
                />
              </div>

              <div
                v-else
                class="grid grid-cols-2 gap-3"
              >
                <div>
                  <label class="block text-sm text-white/80">Prefix</label>
                  <input
                    v-model="createForm.prefix"
                    placeholder="e.g. AHU-"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
                  >
                </div>
                <div>
                  <label class="block text-sm text-white/80">Count</label>
                  <input
                    v-model.number="createForm.count"
                    type="number"
                    min="1"
                    max="200"
                    placeholder="e.g. 3"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20"
                  >
                </div>
              </div>

              <div class="rounded-md bg-white/5 border border-white/10 p-3">
                <div class="text-xs text-white/60 mb-1">
                  Preview ({{ generatedTags.length }})
                </div>
                <div
                  v-if="!generatedTags.length"
                  class="text-white/50 text-sm"
                >
                  No tags yet.
                </div>
                <div
                  v-else
                  class="flex flex-wrap gap-2"
                >
                  <span
                    v-for="t in generatedTags.slice(0, 20)"
                    :key="t"
                    class="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs"
                  >{{ t }}</span>
                  <span
                    v-if="generatedTags.length > 20"
                    class="text-xs text-white/60"
                  >+{{ generatedTags.length - 20 }} more…</span>
                </div>
              </div>

              <div
                v-if="createError"
                class="text-sm text-red-300"
              >
                {{ createError }}
              </div>
            </div>
            <template #footer>
              <div class="flex items-center justify-between gap-3">
                <div
                  v-if="duplicateTags.length"
                  class="text-xs text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-md px-2 py-1"
                >
                  <div class="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      class="w-4 h-4"
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
                    <span>Duplicate tags detected in this project:</span>
                    <span class="font-medium">{{ duplicateTags.slice(0,5).join(', ') }}</span>
                    <span v-if="duplicateTags.length > 5">+{{ duplicateTags.length - 5 }} more</span>
                    <span class="text-amber-300/90">Creating will make duplicates.</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15"
                    @click="showCreateDialog = false"
                  >
                    Cancel
                  </button>
                  <button
                    :disabled="creating || generatedTags.length === 0"
                    class="px-3 py-2 rounded-md border text-emerald-100 hover:bg-emerald-500/20"
                    :class="[(creating || generatedTags.length === 0) ? 'opacity-60 cursor-not-allowed' : '', duplicateTags.length ? 'bg-amber-500/10 border-amber-400/40 text-amber-100 hover:bg-amber-500/20' : 'bg-emerald-500/20 border-emerald-400/50']"
                    @click="submitCreate"
                  >
                    <span v-if="creating">Creating…</span>
                    <span v-else>Create</span>
                  </button>
                </div>
              </div>
            </template>
          </Modal>

          <!-- Upload tags dialog -->
          <Modal
            v-model="showUploadDialog"
            :panel-class="'max-w-2xl'"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <div class="text-lg">
                  Upload tags from spreadsheet
                </div>
              </div>
            </template>
            <div class="space-y-4">
              <div class="text-sm text-white/70">
                Upload a CSV/XLSX with columns: <span class="font-medium">tag</span> (required), <span class="font-medium">title</span> (optional), <span class="font-medium">location</span> (optional), <span class="font-medium">status</span> (optional).
              </div>
              <div>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  class="block w-full text-sm"
                  @change="onUploadFileChange"
                >
                <div
                  v-if="uploadFileName"
                  class="mt-1 text-xs text-white/60"
                >
                  Selected: {{ uploadFileName }}
                </div>
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
                  </div>
                  <div
                    v-if="uploadInvalidRowsCount"
                    class="text-red-200"
                  >
                    Invalid: {{ uploadInvalidRowsCount }} (missing tag)
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
                          Title
                        </th>
                        <th class="px-2 py-1 text-left">
                          Location
                        </th>
                        <th class="px-2 py-1 text-left">
                          Status
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
                        <td class="px-2 py-1 truncate">
                          {{ r.title }}
                        </td>
                        <td class="px-2 py-1 truncate">
                          {{ r.location }}
                        </td>
                        <td class="px-2 py-1">
                          {{ r.status }}
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
                  Duplicate tags detected in this project. Creating will make duplicates.
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
                    <span v-if="creating">Creating…</span>
                    <span v-else>Create</span>
                  </button>
                </div>
              </div>
            </template>
          </Modal>
        </div>
      </div>

      <!-- Footer navigation across all tabs -->
      <div class="mt-6 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 justify-start">
        <div class="flex items-center gap-2">
          <button
            :disabled="!prevTemplateId"
            class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50"
            @click="goPrev"
          >
            Prev
          </button>
          <button
            :disabled="!nextTemplateId"
            class="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50"
            @click="goNext"
          >
            Next
          </button>
        </div>
        <div
          v-if="positionText"
          class="w-full text-center text-xs text-white/60"
        >
          {{ positionText }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import ChecklistPanel from '../../components/ChecklistPanel.vue'
import FunctionalTestsPanel from '../../components/FunctionalTestsPanel.vue'
import Modal from '../../components/Modal.vue'
import { useProjectStore } from '../../stores/project'
import { useSpacesStore } from '../../stores/spaces'
import { useTemplatesStore, type Template } from '../../stores/templates'
import { useEquipmentStore } from '../../stores/equipment'
import { useUiStore } from '../../stores/ui'
import { useAiStore, type SuggestedTag } from '../../stores/ai'
import lists from '../../lists.js'
import PhotoUploader from '../../components/PhotoUploader.vue'
import DocumentUploader from '../../components/DocumentUploader.vue'
import ComponentsPanel from '../../components/ComponentsPanel.vue'
import Spinner from '../../components/Spinner.vue'
import http from '../../utils/http'
import { getAuthHeaders } from '../../utils/auth'
import { confirm as inlineConfirm } from '../../utils/confirm'
import { RouterLink } from 'vue-router'
import * as XLSX from 'xlsx'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))

const projectStore = useProjectStore()
const spacesStore = useSpacesStore()
const equipmentStore = useEquipmentStore()
const templatesStore = useTemplatesStore()
const ui = useUiStore()
const ai = useAiStore()

const statuses = ['Ordered','Shipped','In Storage','Installed','Tested','Operational','Not Started']

const form = ref<Template>({ tag: '', title: '', type: '', system: '', status: 'Not Started', description: '', projectId: '', tags: [], attributes: [] as any, checklists: [], functionalTests: [] } as any)
const loading = ref(true)
const saving = ref(false)
const templateTagsInput = ref('')
const suggestingTemplateTags = ref(false)
const suggestedTemplateTags = ref<SuggestedTag[]>([])

const canSuggestTemplateTags = computed(() => {
  const pid = String((form.value as any).projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
  if (!pid) return false
  const p: any = projectStore.currentProject || {}
  if (p.ai && p.ai.enabled === false) return false
  const tier = String(p.subscriptionTier || '').toLowerCase()
  const hasFeature = p.subscriptionFeatures && (p.subscriptionFeatures.ai === true || p.subscriptionFeatures.AI === true)
  return tier === 'premium' || hasFeature
})

function normalizeTemplateTags(tags: any): string[] {
  const arr = Array.isArray(tags) ? tags : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of arr) {
    const t = String(raw || '').trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

function addTemplateTag(tag: string) {
  const t = String(tag || '').trim()
  if (!t) return
  ;(form.value as any).tags = normalizeTemplateTags([ ...(((form.value as any).tags) || []), t ])
}

function addTemplateTagsFromInput() {
  const raw = String(templateTagsInput.value || '')
  const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return
  ;(form.value as any).tags = normalizeTemplateTags([ ...(((form.value as any).tags) || []), ...parts ])
  templateTagsInput.value = ''
}

function removeTemplateTag(tag: string) {
  const key = String(tag || '').trim().toLowerCase()
  ;(form.value as any).tags = ((((form.value as any).tags) || []) as any[])
    .filter((t) => String(t || '').trim().toLowerCase() !== key)
}

const suggestedTemplateTagsFiltered = computed(() => {
  const existing = new Set((((form.value as any).tags) || []).map((t: any) => String(t || '').trim().toLowerCase()).filter(Boolean))
  const list = Array.isArray(suggestedTemplateTags.value) ? suggestedTemplateTags.value : []
  return list
    .filter((s: any) => s && s.tag && !existing.has(String(s.tag).trim().toLowerCase()))
    .slice(0, 12)
})

function dismissSuggestedTemplateTags() {
  suggestedTemplateTags.value = []
}

function applyAllSuggestedTemplateTags() {
  for (const s of suggestedTemplateTagsFiltered.value) addTemplateTag(String((s as any).tag || ''))
  dismissSuggestedTemplateTags()
}

async function suggestTemplateTags() {
  const pid = String((form.value as any).projectId || projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim()
  if (!pid) {
    ui.showError('No project selected')
    return
  }
  suggestingTemplateTags.value = true
  try {
    const entity = {
      tag: String((form.value as any).tag || '').trim(),
      title: String((form.value as any).title || '').trim(),
      type: String((form.value as any).type || '').trim(),
      system: String((form.value as any).system || '').trim(),
      status: String((form.value as any).status || '').trim(),
      description: String((form.value as any).description || '').trim(),
      attributes: Array.isArray((form.value as any).attributes) ? (form.value as any).attributes : [],
    }
    const allowed = Array.isArray(projectStore.currentProject?.tags) ? projectStore.currentProject?.tags : []
    const existing = Array.isArray((form.value as any).tags) ? (form.value as any).tags : []
    const tags = await ai.suggestTags(pid, 'template', entity, { existingTags: existing, allowedTags: allowed as any })
    suggestedTemplateTags.value = Array.isArray(tags) ? tags : []
    if (!suggestedTemplateTagsFiltered.value.length) ui.showInfo('No new tag suggestions')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to suggest tags')
  } finally {
    suggestingTemplateTags.value = false
  }
}

const crumbs = computed(() => [
  { text: 'Dashboard', to: '/' },
  { text: 'Templates', to: '/templates' },
  { text: (form.value?.tag || form.value?.title || 'Edit'), to: `/templates/${id.value}` }
])

// tabs state: Info, Components, Photos, Attachments, Checklists, FPT, Instances
const tabs = ['Info', 'Components', 'Photos', 'Attachments', 'Checklists', 'FPT', 'Instances'] as const
const currentTab = ref<typeof tabs[number]>('Info')
const tabIndex = computed(() => Math.max(0, tabs.indexOf(currentTab.value)))
const tabWidth = computed(() => 100 / tabs.length)
const tabLeft = computed(() => tabIndex.value * tabWidth.value)

const systemSelectOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.systemOptions || []
  return arr
    .filter((opt: any) => opt && (opt.value !== undefined))
    .map((opt: any) => ({ value: opt.value === null ? '' : String(opt.value), text: String(opt.text ?? opt.value) }))
})

const typeOptions = computed(() => {
  const arr: Array<any> = (lists as any)?.equipmentTypes || []
  return arr.filter((opt: any) => opt && opt.value).map((opt: any) => ({ value: String(opt.value), text: String(opt.text ?? opt.value) }))
})

const parentOptions = computed(() => spacesStore.items)

// Ordered templates for navigation (same project), sorted by tag then title
const projectIdForNav = computed(() => String(form.value.projectId || projectStore.currentProjectId || ''))
function norm(s: any) { return String(s || '').toLowerCase() }
const orderedTemplates = computed(() => {
  const pid = projectIdForNav.value
  const list = (templatesStore.items || []).filter((e: any) => String(e.projectId || '') === pid)
  return list.slice().sort((a: any, b: any) => {
    const at = norm(a.tag); const bt = norm(b.tag)
    if (at && bt && at !== bt) return at < bt ? -1 : 1
    const atitle = norm(a.title); const btitle = norm(b.title)
    if (atitle !== btitle) return atitle < btitle ? -1 : 1
    const aid = String(a.id || a._id || '')
    const bid = String(b.id || b._id || '')
    return aid < bid ? -1 : (aid > bid ? 1 : 0)
  })
})

const currentIndex = computed(() => {
  const curId = String(id.value || '')
  return orderedTemplates.value.findIndex((e: any) => String(e.id || e._id || '') === curId)
})
const prevTemplateId = computed<string | null>(() => {
  const idx = currentIndex.value
  if (idx > 0) {
    const e = orderedTemplates.value[idx - 1]
    return String(e.id || e._id || '')
  }
  return null
})
const nextTemplateId = computed<string | null>(() => {
  const idx = currentIndex.value
  if (idx !== -1 && idx < orderedTemplates.value.length - 1) {
    const e = orderedTemplates.value[idx + 1]
    return String(e.id || e._id || '')
  }
  return null
})
const positionText = computed(() => {
  const total = orderedTemplates.value.length
  const idx = currentIndex.value
  if (total && idx >= 0) return `${idx + 1} of ${total}`
  return ''
})
function goPrev() { if (prevTemplateId.value) router.push({ name: 'template-edit', params: { id: prevTemplateId.value } }) }
function goNext() { if (nextTemplateId.value) router.push({ name: 'template-edit', params: { id: nextTemplateId.value } }) }

// Attributes UI state and helpers (key/value mapped to template attributes {key, value})
const newAttrKey = ref('')
const newAttrValue = ref('')
const editingIndex = ref<number | null>(null)
const editKey = ref('')
const editValue = ref('')

const currentAttributes = computed<Array<{ key: string; value: string }>>(() => {
  const arr = Array.isArray((form.value as any).attributes) ? (form.value as any).attributes : []
  // map {title,value} -> {key,value}
  return arr.map((r: any) => ({ key: String(r?.key ?? r?.title ?? ''), value: String(r?.value ?? '') })).filter((r: any) => (r.key || r.value))
})

async function persistAttributes(): Promise<boolean> {
  try {
    const tid = (form.value.id || (form.value as any)._id || id.value) as string
    if (!tid) return false
    const attrs = currentAttributes.value
      .map(r => ({ key: String(r.key || '').trim(), value: String(r.value || '') }))
      .filter(r => !!r.key) // enforce schema: key is required
    await templatesStore.updateFields(tid, { attributes: attrs } as any)
    const fresh = await templatesStore.fetchOne(tid)
    if (fresh) form.value = { ...fresh }
    return true
  } catch (err: any) {
    const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to save attributes'
    ui.showError(msg)
    return false
  }
}

async function addAttr() {
  const k = String(newAttrKey.value || '').trim()
  const v = String(newAttrValue.value || '').trim()
  if (!k) return
  const arr = currentAttributes.value.slice()
  arr.push({ key: k, value: v })
  ;(form.value as any).attributes = arr
  newAttrKey.value = ''
  newAttrValue.value = ''
  await persistAttributes()
}
async function removeAttr(i: number) {
  const arr = currentAttributes.value.slice()
  arr.splice(i, 1)
  ;(form.value as any).attributes = arr
  if (editingIndex.value === i) cancelEdit()
  await persistAttributes()
}
function startEdit(i: number) {
  const item = currentAttributes.value[i]
  editingIndex.value = i
  editKey.value = item?.key || ''
  editValue.value = item?.value || ''
}
async function saveEdit(i: number) {
  const k = String(editKey.value || '').trim()
  const v = String(editValue.value || '').trim()
  if (!k) return
  const arr = currentAttributes.value.slice()
  arr[i] = { key: k, value: v }
  ;(form.value as any).attributes = arr
  cancelEdit()
  await persistAttributes()
}
function cancelEdit() { editingIndex.value = null; editKey.value = ''; editValue.value = '' }

// Checklists and FPT as arrays with debounced persistence
const checklists = computed<any[]>({
  get() {
    const cl: any = (form.value as any).checklists
    if (Array.isArray(cl)) return cl
    if (cl && typeof cl === 'object') return Object.values(cl)
    return []
  },
  set(v: any[]) { (form.value as any).checklists = Array.isArray(v) ? v : [] }
})
const functionalTests = computed<any[]>({
  get() {
    const ft: any = (form.value as any).functionalTests
    if (Array.isArray(ft)) return ft
    if (ft && typeof ft === 'object') return Object.values(ft)
    return []
  },
  set(v: any[]) { (form.value as any).functionalTests = Array.isArray(v) ? v : [] }
})

let fptSaveTimer: any = null
async function persistFunctionalTests(tests: any[]) {
  try {
    const tid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!tid) return
    // Only update the field we need to avoid sending invalid/large payloads
    await templatesStore.updateFields(tid, { functionalTests: tests } as any)
    const fresh = await templatesStore.fetchOne(tid)
    if (fresh) form.value = { ...fresh }
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save functional tests')
  }
}
function onFunctionalTestsChange(tests: any[]) {
  if (fptSaveTimer) clearTimeout(fptSaveTimer)
  fptSaveTimer = setTimeout(async () => {
    await persistFunctionalTests(tests)
    ui.showSuccess('Functional tests saved')
    fptSaveTimer = null
  }, 700)
}

// Immediate save handler for explicit Save button in FunctionalTestsPanel
function onFunctionalTestsSave(tests: any[]) {
  if (fptSaveTimer) clearTimeout(fptSaveTimer)
  persistFunctionalTests(tests).then(() => {
    ui.showSuccess('Functional tests saved')
  })
}

let checklistSaveTimer: any = null
async function persistChecklists(sections: any[]) {
  try {
    const tid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!tid) return
    // Only update the field we need to avoid sending invalid/large payloads
    await templatesStore.updateFields(tid, { checklists: sections } as any)
    const fresh = await templatesStore.fetchOne(tid)
    if (fresh) form.value = { ...fresh }
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save checklist')
  }
}
function onChecklistsChange(sections: any[]) {
  if (checklistSaveTimer) clearTimeout(checklistSaveTimer)
  checklistSaveTimer = setTimeout(async () => {
    await persistChecklists(sections)
    ui.showSuccess('Checklist saved')
    checklistSaveTimer = null
  }, 700)
}

function countForTab(t: string) {
  if (t === 'Components') return Array.isArray((form.value as any).components) ? (form.value as any).components.length : 0
  if (t === 'Photos') return Array.isArray((form.value as any).photos) ? (form.value as any).photos.length : 0
  if (t === 'Attachments') return Array.isArray((form.value as any).attachments) ? (form.value as any).attachments.length : 0
  if (t === 'Checklists') return checklists.value.length
  if (t === 'FPT') return functionalTests.value.length
  if (t === 'Instances') return instancesForTemplate.value.length
  return 0
}

const isValidTag = computed(() => !!String(form.value.tag || '').trim())
const isValidTitle = computed(() => !!String(form.value.title || '').trim())
const isValidType = computed(() => !!String(form.value.type || '').trim())
const isValidForm = computed(() => isValidTag.value && isValidTitle.value && isValidType.value)

async function load() {
  loading.value = true
  try {
    if (!id.value) return
    const t = await templatesStore.fetchOne(id.value)
    if (t) {
      form.value = { ...t } as any
      // Normalize tags from canonical field; fall back to legacy comma-separated labels if present
      const legacyLabels = typeof (t as any).labels === 'string'
        ? (t as any).labels.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []
      ;(form.value as any).tags = normalizeTemplateTags([ ...(((t as any).tags) || []), ...legacyLabels ])
      if (!form.value.projectId) form.value.projectId = (t as any).projectId || projectStore.currentProjectId || ''
      const pid = form.value.projectId || projectStore.currentProjectId || ''
      if (pid) {
        await spacesStore.fetchByProject(String(pid))
        if (!templatesStore.items.length) await templatesStore.fetchByProject(String(pid))
        // Preload equipment for this project so Instances can be derived
        await equipmentStore.fetchByProject(String(pid)).catch(() => {})
      }
      // normalize attributes to array of {key,value}
      const attrs: any = (form.value as any).attributes
      if (attrs && !Array.isArray(attrs)) {
        const arr = typeof attrs === 'object' ? Object.entries(attrs).map(([k,v]) => ({ key: String(k), value: String(v ?? '') })) : []
        ;(form.value as any).attributes = arr
      }
    }
  } finally { loading.value = false }
}

async function save() {
  try {
    saving.value = true
    if (!isValidForm.value) { ui.showError('Please fill Tag, Title, and Type'); return }
    if (!form.value.projectId) form.value.projectId = String(projectStore.currentProjectId || '')
    const idv = String((form.value.id || (form.value as any)._id || '') as string)
    // Prepare a minimal payload to avoid sending large media/checklist arrays which some backends reject
    const attrs = Array.isArray((form.value as any).attributes)
      ? (form.value as any).attributes
          .map((r: any) => ({ key: String(r?.key || '').trim(), value: String(r?.value || '') }))
          .filter((r: any) => !!r.key) // drop entries without a key to satisfy backend validators
      : []
    const payload: any = {
      projectId: String(form.value.projectId || projectStore.currentProjectId || ''),
      tag: form.value.tag,
      title: form.value.title,
      type: form.value.type,
      description: form.value.description || undefined,
      tags: normalizeTemplateTags((form.value as any).tags),
      attributes: attrs
    }
    if (form.value.system && String(form.value.system).trim()) payload.system = String(form.value.system)
    // Do not send status to avoid backend enum mismatches; backend will keep existing/default
    if ((form.value as any).spaceId && String((form.value as any).spaceId).trim()) payload.spaceId = String((form.value as any).spaceId)
    if (idv) {
      await templatesStore.updateFields(idv, payload)
      ui.showSuccess('Template saved')
    } else {
  // include projectId on create
  const created = await templatesStore.create({ ...payload, projectId: String(form.value.projectId || projectStore.currentProjectId || '') } as any)
      ui.showSuccess('Template created')
      router.replace({ name: 'template-edit', params: { id: String((created as any).id || (created as any)._id) } })
    }
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!id.value) return
  await new Promise(r => setTimeout(r))
  const { confirm: inlineConfirm } = await import('../../utils/confirm')
  const ok = await inlineConfirm({ title: 'Delete template', message: 'Delete this template? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!ok) return
  await templatesStore.remove(id.value)
  ui.showSuccess('Template deleted')
  router.push({ name: 'templates' })
}

// Photos helpers
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const photos = computed<any[]>(() => {
  const arr: any = (form.value as any).photos
  return Array.isArray(arr) ? arr : []
})
async function uploadPhoto(file: File, onProgress: (pct: number) => void) {
  const tid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!tid) throw new Error('Missing template id')
  const fd = new FormData()
  fd.append('photos', file)
  const res = await http.post(`/api/templates/${tid}/photos`, fd, {
    headers: { ...getAuthHeaders() },
    onUploadProgress: (e: any) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)) }
  })
  const fresh = await templatesStore.fetchOne(tid)
  if (fresh) form.value = { ...fresh } as any
  return res.data
}
async function updatePhotoMeta(index: number, caption: string) {
  const tid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!tid) return
  try {
    await http.patch(`/api/templates/${tid}/photos/${index}`, { caption }, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } })
    const fresh = await templatesStore.fetchOne(tid)
    if (fresh) form.value = { ...fresh } as any
    ui.showSuccess('Caption saved')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to save caption')
  }
}
async function removePhoto(index: number) {
  const ok = await inlineConfirm({ title: 'Delete photo', message: 'Delete this photo? This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel', variant: 'danger' })
  if (!ok) return
  const tid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!tid) return
  try {
    await http.delete(`/api/templates/${tid}/photos/${index}`, { headers: { ...getAuthHeaders() } })
    const fresh = await templatesStore.fetchOne(tid)
    if (fresh) form.value = { ...fresh } as any
    ui.showSuccess('Photo removed')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove photo')
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function refreshAfterUpload(kind: 'photos' | 'attachments') {
  const tid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!tid) return
  const fresh = await templatesStore.fetchOne(tid)
  if (fresh) form.value = { ...fresh } as any
}

// Attachments helpers
async function uploadAttachment(file: File, onProgress: (pct: number) => void) {
  const tid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!tid) throw new Error('Missing template id')
  const fd = new FormData()
  fd.append('attachments', file)
  const res = await http.post(`/api/templates/${tid}/attachments`, fd, {
    headers: { ...getAuthHeaders() },
    onUploadProgress: (e: any) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)) }
  })
  const fresh = await templatesStore.fetchOne(tid)
  if (fresh) form.value = { ...fresh } as any
  return res.data
}
async function removeAttachment(index: number) {
  const tid = String(form.value.id || (form.value as any)._id || id.value || '')
  if (!tid) return
  try {
    await http.delete(`/api/templates/${tid}/attachments/${index}`, { headers: { ...getAuthHeaders() } })
    const fresh = await templatesStore.fetchOne(tid)
    if (fresh) form.value = { ...fresh } as any
    ui.showSuccess('Attachment removed')
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to remove attachment')
  }
}

onMounted(load)
watch(() => route.params.id, load)

// Components state and helpers (mirrors Equipment implementation)
const componentsList = computed<any[]>({
  get() {
    const arr: any = (form.value as any).components
    return Array.isArray(arr) ? arr : []
  },
  set(v: any[]) {
    (form.value as any).components = Array.isArray(v) ? v : []
  }
})

// Alias for ComponentsPanel v-model
const components = computed<any[]>({
  get() { return componentsList.value },
  set(v: any[]) { componentsList.value = Array.isArray(v) ? v : [] }
})

function objectFromPairs(pairs?: Array<{ key: string; value: any }>): Record<string, any> {
  const out: Record<string, any> = {}
  const list = Array.isArray(pairs) ? pairs : []
  for (const p of list) {
    const k = String((p as any)?.key || '').trim()
    if (!k) continue
    out[k] = (p as any)?.value
  }
  return out
}

// Instances: equipment derived from this template
const tidForMatch = computed(() => String((form.value as any).id || (form.value as any)._id || id.value || ''))
const instancesForTemplate = computed<any[]>(() => {
  const tid = tidForMatch.value
  if (!tid) return []
  const list = Array.isArray(equipmentStore.items) ? equipmentStore.items : []
  return list
    .filter((e: any) => String(e?.template || '') === tid)
    .map((e: any) => ({
      id: String(e.id || e._id || ''),
      tag: e.tag,
      title: e.title,
      spaceId: e.spaceId || '',
      status: e.status || 'Not Started'
    }))
    .filter((e: any) => e.id)
})

const selectedInstanceIds = ref<string[]>([])
const allSelected = computed(() => instancesForTemplate.value.length > 0 && selectedInstanceIds.value.length === instancesForTemplate.value.length)
function toggleSelectAll(checked?: boolean) {
  if (checked) selectedInstanceIds.value = instancesForTemplate.value.map(e => e.id)
  else selectedInstanceIds.value = []
}
function spaceName(spaceId?: string | null) {
  const pid = spaceId ? String(spaceId) : ''
  if (!pid) return ''
  const sp = (spacesStore as any).byId?.[pid] || (spacesStore.items || []).find((s: any) => String(s.id || s._id) === pid)
  return sp ? (sp.title || sp.tag || '') : ''
}

// Push changes to selected instances (make equipment match current template)
const pushing = ref(false)
async function onPushChanges() {
  if (!selectedInstanceIds.value.length) return
  const tid = String((form.value as any).id || (form.value as any)._id || id.value || '')
  const pid = String(form.value.projectId || projectStore.currentProjectId || '')
  if (!tid || !pid) { ui.showError('Missing template or project'); return }

  const ok = await inlineConfirm({
    title: 'Push changes to equipment',
    message: `This will overwrite ${selectedInstanceIds.value.length} equipment to match this template. Continue?`,
    confirmText: 'Push changes',
    cancelText: 'Cancel',
    variant: 'danger'
  })
  if (!ok) return

  // Build base from template (same mapping as create)
  const base: any = {
    title: String(form.value.title),
    type: String(form.value.type),
    system: String(form.value.system || ''),
    status: String(form.value.status || 'Not Started'),
    description: (form.value as any).description || undefined,
    attributes: attrsArrayFromTemplate(),
    components: mapComponentsFromTemplate(),
    images: mapImagesFromTemplate(),
    attachments: mapAttachmentsFromTemplate(),
    checklists: deepCopy((form.value as any).checklists || []),
    functionalTests: deepCopy((form.value as any).functionalTests || []),
    template: tid
  }
  const spaceId = (form.value as any).spaceId
  if (spaceId) base.spaceId = String(spaceId)

  pushing.value = true
  try {
    // Update each selected equipment sequentially to avoid server overload
    for (const eqId of selectedInstanceIds.value) {
      try {
        // First, update simple fields in one call
        const simple: any = {
          title: base.title,
          type: base.type,
          status: base.status,
          template: tid,
        }
        if (base.system) simple.system = base.system
        if (base.description) simple.description = base.description
        if (base.spaceId) simple.spaceId = base.spaceId
        await (equipmentStore as any).updateFields(eqId, simple)

        // Then patch larger nested fields separately
  try { await (equipmentStore as any).updateFields(eqId, { attributes: base.attributes }) } catch (e) { /* best-effort */ }
  try { await (equipmentStore as any).updateFields(eqId, { components: base.components }) } catch (e) { /* best-effort */ }
  try { await (equipmentStore as any).updateFields(eqId, { checklists: base.checklists }) } catch (e) { /* best-effort */ }
  try { await (equipmentStore as any).updateFields(eqId, { functionalTests: base.functionalTests }) } catch (e) { /* best-effort */ }
  // Media last; may be disallowed by backend
  try { if (Array.isArray(base.images)) await (equipmentStore as any).updateFields(eqId, { images: base.images }) } catch (e) { /* best-effort */ }
  try { if (Array.isArray(base.attachments)) await (equipmentStore as any).updateFields(eqId, { attachments: base.attachments }) } catch (e) { /* best-effort */ }
      } catch (e) {
        // Continue with others even if one fails
        console.warn('Failed to push to', eqId, e)
      }
    }
    await equipmentStore.fetchByProject(pid)
    ui.showSuccess(`Pushed changes to ${selectedInstanceIds.value.length} instance(s)`)    
    selectedInstanceIds.value = []
  } finally {
    pushing.value = false
  }
}

async function persistComponents(): Promise<boolean> {
  try {
    const tid = String(form.value.id || (form.value as any)._id || id.value || '')
    if (!tid) return false
    const payloadList = (componentsList.value || []).map((c: any) => {
      const attrs = Array.isArray(c?.attributes) ? objectFromPairs(c.attributes as any) : (c?.attributes || {})
      const out: any = {
        id: c?.id,
        tag: c?.tag || '',
        type: c?.type,
        title: c?.title,
        attributes: attrs,
        status: c?.status || '',
        notes: c?.notes || '',
        issues: Array.isArray(c?.issues) ? c.issues : undefined
      }
      return out
    })
    await templatesStore.updateFields(tid, { components: payloadList } as any)
    return true
  } catch (err: any) {
    console.error('Failed to persist components', err)
    ui.showError(err?.response?.data?.error || err?.message || 'Failed to save components')
    return false
  }
}

// Persist components when ComponentsPanel emits change (debounced)
let componentsSaveTimer: any = null
function onComponentsChange(list: any[]) {
  if (componentsSaveTimer) clearTimeout(componentsSaveTimer)
  componentsSaveTimer = setTimeout(async () => {
    componentsList.value = Array.isArray(list) ? list : []
    const ok = await persistComponents()
    if (ok) {
      ui.showSuccess('Components saved')
      const tid = String(form.value.id || (form.value as any)._id || id.value || '')
      if (tid) {
        const fresh = await templatesStore.fetchOne(tid)
        if (fresh) form.value = { ...fresh } as any
      }
    }
    componentsSaveTimer = null
  }, 700)
}

// Create from template dialog state and logic
const showCreateDialog = ref(false)
const createMode = ref<'csv' | 'prefix'>('csv')
const createForm = ref<{ tagsCsv: string; prefix: string; count: number }>({ tagsCsv: '', prefix: '', count: 1 })
const createError = ref('')
const creating = ref(false)

function sanitizeTags(list: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of list) {
    const t = String(raw || '').trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

const generatedTags = computed<string[]>(() => {
  if (createMode.value === 'csv') {
    const csv = String(createForm.value.tagsCsv || '')
    const parts = csv.split(/[\n,]+/)
    return sanitizeTags(parts).slice(0, 200)
  }
  const prefix = String(createForm.value.prefix || '')
  const count = Math.max(0, Math.min(200, Number(createForm.value.count || 0)))
  const arr: string[] = []
  for (let i = 1; i <= count; i++) arr.push(`${prefix}${i}`)
  return sanitizeTags(arr)
})

// Upload dialog state
const showUploadDialog = ref(false)
const uploadParsing = ref(false)
const uploadFileName = ref('')
const uploadError = ref('')
const uploadRows = ref<Array<{ tag: string; title?: string; location?: string; status?: string }>>([])

function normalizeHeader(h: any): string {
  return String(h || '').trim().toLowerCase()
}

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
      const rows: Array<{ tag: string; title?: string; location?: string; status?: string }> = []
      for (const obj of json) {
        // map headers loosely
        const mapped: Record<string, any> = {}
        for (const k of Object.keys(obj)) { mapped[normalizeHeader(k)] = obj[k] }
        const tag = String(mapped['tag'] || '').trim()
        const title = String(mapped['title'] || '').trim()
        const location = String(mapped['location'] || '').trim()
        const status = String(mapped['status'] || '').trim()
        rows.push({ tag, title: title || undefined, location: location || undefined, status: status || undefined })
      }
      uploadRows.value = rows
    } catch (err: any) {
      uploadError.value = err?.message || 'Failed to parse file'
    } finally {
      uploadParsing.value = false
    }
  }
  reader.onerror = () => {
    uploadParsing.value = false
    uploadError.value = 'Failed to read file'
  }
  reader.readAsArrayBuffer(file)
}

const validUploadRows = computed(() => (uploadRows.value || []).filter(r => String(r.tag || '').trim()))
const uploadInvalidRowsCount = computed(() => (uploadRows.value || []).length - validUploadRows.value.length)
const uploadDuplicateTags = computed<string[]>(() => {
  const set = existingProjectTagSet.value
  return validUploadRows.value.map(r => r.tag).filter(t => set.has(String(t || '').trim().toLowerCase()))
})

function resolveStatus(s?: string): string | undefined {
  const v = String(s || '').trim()
  if (!v) return undefined
  const m = statuses.find(x => x.toLowerCase() === v.toLowerCase())
  return m || undefined
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

async function submitUploadCreate() {
  uploadError.value = ''
  const rows = validUploadRows.value
  if (!rows.length) { uploadError.value = 'No valid rows found'; return }
  const pid = String(form.value.projectId || projectStore.currentProjectId || '')
  const tid = String((form.value as any).id || (form.value as any)._id || id.value || '')
  if (!pid || !tid) { uploadError.value = 'Missing project or template'; return }

  // Base payload built from template
  const base: any = {
    projectId: pid,
    title: String(form.value.title),
    type: String(form.value.type),
    system: String(form.value.system || ''),
    status: String(form.value.status || 'Not Started'),
    description: (form.value as any).description || undefined,
    attributes: attrsArrayFromTemplate(),
    components: mapComponentsFromTemplate(),
    images: mapImagesFromTemplate(),
    attachments: mapAttachmentsFromTemplate(),
    checklists: deepCopy((form.value as any).checklists || []),
    functionalTests: deepCopy((form.value as any).functionalTests || []),
    template: tid
  }
  const templateSpaceId = (form.value as any).spaceId
  if (templateSpaceId) base.spaceId = String(templateSpaceId)

  creating.value = true
  try {
  // Reuse createOne logic from submitCreate by inlining similar behavior here
  const createOneFromRow = async (row: { tag: string; title?: string; location?: string; status?: string }) => {
      const overrides: any = { tag: row.tag }
      if (row.title) overrides.title = row.title
      const rs = resolveStatus(row.status)
      if (rs) overrides.status = rs
      const sid = resolveSpaceId(row.location)
      if (sid) overrides.spaceId = sid
      const fullPayload = { ...base, ...overrides }
      try {
        return await equipmentStore.create(fullPayload as any)
      } catch (err: any) {
        // Minimal create then patch
        const minimal: any = {
          projectId: pid,
          tag: fullPayload.tag,
          title: fullPayload.title,
          type: fullPayload.type,
          status: fullPayload.status,
          template: tid,
        }
        if (fullPayload.system) minimal.system = fullPayload.system
        if (fullPayload.description) minimal.description = fullPayload.description
        if (fullPayload.spaceId) minimal.spaceId = fullPayload.spaceId
        const created = await equipmentStore.create(minimal)
        const createdId = String((created as any).id || (created as any)._id)
  try { await equipmentStore.updateFields(createdId, { attributes: base.attributes } as any) } catch (e) { /* best-effort */ }
  try { await equipmentStore.updateFields(createdId, { components: base.components } as any) } catch (e) { /* best-effort */ }
  try { await equipmentStore.updateFields(createdId, { checklists: base.checklists } as any) } catch (e) { /* best-effort */ }
  try { await equipmentStore.updateFields(createdId, { functionalTests: base.functionalTests } as any) } catch (e) { /* best-effort */ }
  try { if (Array.isArray(base.images) && base.images.length) await equipmentStore.updateFields(createdId, { images: base.images } as any) } catch (e) { /* best-effort */ }
  try { if (Array.isArray(base.attachments) && base.attachments.length) await equipmentStore.updateFields(createdId, { attachments: base.attachments } as any) } catch (e) { /* best-effort */ }
        return created
      }
    }

    for (const r of rows) { await createOneFromRow(r) }
    showUploadDialog.value = false
    await equipmentStore.fetchByProject(pid)
    selectedInstanceIds.value = []
    ui.showSuccess(`Created ${rows.length} equipment`)
    // reset state
    uploadRows.value = []
    uploadFileName.value = ''
  } catch (e: any) {
    uploadError.value = e?.response?.data?.error || e?.message || 'Failed to create equipment from upload'
  } finally {
    creating.value = false
  }
}
const projectIdCurrent = computed(() => String(form.value.projectId || projectStore.currentProjectId || ''))
const existingProjectTagSet = computed<Set<string>>(() => {
  const pid = projectIdCurrent.value
  const set = new Set<string>()
  const list = Array.isArray(equipmentStore.items) ? equipmentStore.items : []
  for (const e of list) {
    if (String((e as any).projectId || '') !== pid) continue
    const t = String((e as any).tag || '').trim().toLowerCase()
    if (t) set.add(t)
  }
  return set
})
const duplicateTags = computed<string[]>(() => {
  const set = existingProjectTagSet.value
  return generatedTags.value.filter(t => set.has(String(t || '').trim().toLowerCase()))
})

function deepCopy<T>(v: T): T {
  return v == null ? v : JSON.parse(JSON.stringify(v))
}

function attrsArrayFromTemplate(): Array<{ key: string; value: any }> {
  const arr: any = (form.value as any).attributes
  if (!Array.isArray(arr)) return []
  return arr
    .map((r: any) => ({ key: String(r?.key ?? r?.title ?? '').trim(), value: r?.value }))
    .filter((r: any) => !!r.key)
}

function mapComponentsFromTemplate(): any[] {
  const list: any[] = Array.isArray((form.value as any).components) ? (form.value as any).components : []
  return list.map((c: any) => {
    let attrs: any = c?.attributes
    if (Array.isArray(attrs)) {
      const o: Record<string, any> = {}
      for (const p of attrs) {
        const k = String((p as any)?.key || '').trim()
        if (!k) continue
        o[k] = (p as any)?.value
      }
      attrs = o
    }
    return {
      tag: c?.tag || '',
      type: c?.type,
      title: c?.title,
      attributes: attrs || {},
      status: c?.status || '',
      notes: c?.notes || '',
      issues: Array.isArray(c?.issues) ? deepCopy(c.issues) : undefined,
    }
  })
}

function mapImagesFromTemplate(): any[] {
  const photos: any[] = Array.isArray((form.value as any).photos) ? (form.value as any).photos : []
  return photos.map(p => ({ ...p }))
}

function mapAttachmentsFromTemplate(): any[] {
  const atts: any[] = Array.isArray((form.value as any).attachments) ? (form.value as any).attachments : []
  return atts.map(a => ({ ...a }))
}

async function submitCreate() {
  createError.value = ''
  const tags = generatedTags.value
  if (!tags.length) { createError.value = 'Please provide at least one tag.'; return }
  const pid = String(form.value.projectId || projectStore.currentProjectId || '')
  const tid = String((form.value as any).id || (form.value as any)._id || id.value || '')
  if (!pid) { createError.value = 'Missing project'; return }
  if (!tid) { createError.value = 'Missing template id'; return }
  if (!String(form.value.type || '').trim()) { createError.value = 'Template Type is required'; return }
  if (!String(form.value.title || '').trim()) { createError.value = 'Template Title is required'; return }

  const base: any = {
    projectId: pid,
    title: String(form.value.title),
    type: String(form.value.type),
    system: String(form.value.system || ''),
    status: String(form.value.status || 'Not Started'),
    description: (form.value as any).description || undefined,
    attributes: attrsArrayFromTemplate(),
    components: mapComponentsFromTemplate(),
    images: mapImagesFromTemplate(),
    attachments: mapAttachmentsFromTemplate(),
    checklists: deepCopy((form.value as any).checklists || []),
    functionalTests: deepCopy((form.value as any).functionalTests || []),
    template: tid
  }
  const spaceId = (form.value as any).spaceId
  if (spaceId) base.spaceId = String(spaceId)

  creating.value = true
  try {
  const createOne = async (tag: string) => {
      const fullPayload = { ...base, tag }
      try {
        // Try full create first
        return await equipmentStore.create(fullPayload as any)
      } catch (err: any) {
        // Fallback: minimal create then patch fields in smaller chunks
        const minimal: any = {
          projectId: pid,
          tag,
          title: fullPayload.title,
          type: fullPayload.type,
          status: fullPayload.status,
          template: tid,
        }
        if (fullPayload.system) minimal.system = fullPayload.system
        if (fullPayload.description) minimal.description = fullPayload.description
        if (fullPayload.spaceId) minimal.spaceId = fullPayload.spaceId
        const created = await equipmentStore.create(minimal)
        const createdId = String((created as any).id || (created as any)._id)
  // Patch attributes
  try { await equipmentStore.updateFields(createdId, { attributes: base.attributes } as any) } catch (e) { /* best-effort */ }
  // Patch components (as normalized objects already)
  try { await equipmentStore.updateFields(createdId, { components: base.components } as any) } catch (e) { /* best-effort */ }
  // Patch checklists & functional tests
  try { await equipmentStore.updateFields(createdId, { checklists: base.checklists } as any) } catch (e) { /* best-effort */ }
  try { await equipmentStore.updateFields(createdId, { functionalTests: base.functionalTests } as any) } catch (e) { /* best-effort */ }
  // Attempt to patch images and attachments last; ignore if backend disallows
  try { if (Array.isArray(base.images) && base.images.length) await equipmentStore.updateFields(createdId, { images: base.images } as any) } catch (e) { /* best-effort */ }
  try { if (Array.isArray(base.attachments) && base.attachments.length) await equipmentStore.updateFields(createdId, { attachments: base.attachments } as any) } catch (e) { /* best-effort */ }
        return created
      }
    }

    // Create sequentially to avoid overwhelming server and handle per-item fallbacks
    for (const t of tags) { await createOne(t) }

    showCreateDialog.value = false
    await equipmentStore.fetchByProject(pid)
    selectedInstanceIds.value = []
    ui.showSuccess(`Created ${tags.length} equipment`)
    createForm.value = { tagsCsv: '', prefix: '', count: 1 }
    createMode.value = 'csv'
  } catch (e: any) {
    createError.value = e?.response?.data?.error || e?.message || 'Failed to create equipment'
  } finally {
    creating.value = false
  }
}

</script>
