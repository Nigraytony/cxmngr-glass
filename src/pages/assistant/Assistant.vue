<template>
  <section class="h-full min-h-0 flex flex-col gap-6 overflow-hidden">
    <BreadCrumbs
      :items="[
        { text: 'Dashboard', to: '/' },
        { text: 'Assistant', to: '/assistant' }
      ]"
      title="Assistant"
    />

    <div
      v-if="!assistantStore.introDismissed"
      class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-white/90"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold">
            What is the Assistant?
          </div>
          <div class="mt-1 text-sm text-white/75">
            The Assistant helps guide you through commissioning workflows based on your project type, with a compliance checklist, trusted documentation, and (if enabled) AI chat.
          </div>
          <div class="mt-2 text-xs text-white/60">
            Tip: Use “Recommended actions” for quick shortcuts, or select a checklist item to see CXMA guidance + documentation.
          </div>
        </div>
        <button
          class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/85 shrink-0"
          @click="assistantStore.dismissIntro()"
        >
          Dismiss
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
      <div class="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col min-h-0">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-white/90">
              Compliance checklist
            </div>
            <div class="mt-1 text-xs text-white/50">
              Project type: {{ projectType || '—' }}
            </div>
          </div>
          <div
            v-if="projectId"
            class="flex items-center gap-2"
          >
            <button
              class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80"
              :disabled="checklistStore.loading"
              @click="checklistStore.fetchChecklist(projectId)"
            >
              Refresh
            </button>
            <div class="relative inline-block group">
              <button
                type="button"
                aria-label="Add checklist item"
                title="Add checklist item"
                class="w-8 h-8 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10 disabled:opacity-40"
                :disabled="checklistStore.loading"
                @click="toggleAddItem"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4"
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
                class="pointer-events-none absolute right-0 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
              >
                Add checklist item
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="projectId && showAddItem"
          class="mt-3 space-y-2"
        >
          <div class="text-xs text-white/60">
            Add a custom checklist item for this project.
          </div>
          <input
            v-model="newItemTitle"
            class="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm text-white/90 placeholder:text-white/40"
            placeholder="Title (required)"
            maxlength="200"
          >
          <input
            v-model="newItemCategory"
            class="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm text-white/90 placeholder:text-white/40"
            placeholder="Category (optional)"
            maxlength="80"
          >
          <textarea
            v-model="newItemDescription"
            class="w-full rounded-md bg-white/5 border border-white/15 px-3 py-2 text-sm text-white/90 placeholder:text-white/40 min-h-[90px]"
            placeholder="Description (optional)"
            maxlength="2000"
          />
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/25 text-sm text-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
              type="button"
              :disabled="checklistStore.loading || !newItemTitle.trim()"
              @click="createChecklistItem"
            >
              Add to checklist
            </button>
            <button
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
              type="button"
              :disabled="checklistStore.loading"
              @click="toggleAddItem"
            >
              Cancel
            </button>
          </div>
        </div>

        <div
          v-if="projectId"
          class="mt-3 rounded-lg border border-white/10 bg-black/15 p-3"
        >
          <div class="text-xs font-semibold text-white/80">
            Recommended actions
          </div>
          <div class="mt-1 text-xs text-white/50">
            Quick CXMA shortcuts based on the current project type.
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <div
              v-if="!dismissedRecommendedActions.has('quick-import')"
              class="relative inline-flex"
            >
              <button
                class="px-3 pr-7 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs text-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="quickImportLoading || !projectId || !projectType"
                @click="quickImportTasksFromTemplate"
              >
                {{ quickImportLoading ? 'Importing…' : 'Quick import tasks' }}
              </button>
              <button
                class="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-emerald-100/70 hover:text-emerald-100 hover:bg-white/10"
                type="button"
                aria-label="Hide this recommended action"
                @click.stop.prevent="dismissRecommendedAction('quick-import')"
              >
                ×
              </button>
            </div>

            <div
              v-for="a in recommendedActions"
              :key="a.key"
              class="relative inline-flex"
            >
              <RouterLink
                :to="a.to"
                class="px-3 pr-7 py-1.5 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/85"
              >
                {{ a.title }}
              </RouterLink>
              <button
                class="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-white/60 hover:text-white/85 hover:bg-white/10"
                type="button"
                aria-label="Hide this recommended action"
                @click.stop.prevent="dismissRecommendedAction(a.key)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <div class="mt-3 flex-1 min-h-0 overflow-y-auto pr-1">
          <div
            v-if="!projectId"
            class="text-sm text-white/70"
          >
            Select a project to view its compliance checklist.
          </div>

          <div
            v-else-if="checklistStore.loading"
            class="text-sm text-white/70"
          >
            Loading checklist…
          </div>

          <div
            v-else-if="checklistStore.error"
            class="text-sm text-red-300"
          >
            {{ checklistStore.error }}
          </div>

          <div
            v-else-if="checklist && checklist.items && checklist.items.length"
          >
            <div class="flex items-center justify-between text-xs text-white/70">
              <span>{{ checklist.progress.completed }} / {{ checklist.progress.total }} complete</span>
              <span>{{ checklist.progress.percent }}%</span>
            </div>
            <div class="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                class="h-2 rounded-full bg-emerald-500/60"
                :style="{ width: `${checklist.progress.percent}%` }"
              />
            </div>

            <div class="mt-4 space-y-2">
              <div
                v-for="item in checklist.items"
                :key="item.id"
                class="rounded-lg border border-white/10 bg-black/20 p-2 cursor-pointer hover:bg-black/30"
                :class="selectedItemId === item.id ? 'ring-1 ring-emerald-400/40' : ''"
                @click="selectItem(item.id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <input
                    type="checkbox"
                    class="mt-0.5 form-checkbox h-6 w-6 rounded bg-white/10 border-white/30 text-emerald-400 cursor-pointer"
                    :aria-label="`Mark complete: ${item.title}`"
                    :checked="item.completed === true"
                    :disabled="checklistStore.loading"
                    @click.stop
                    @change="(e) => onToggleItem(item, (e.target as HTMLInputElement).checked)"
                  >
                  <div class="min-w-0">
                    <div
                      class="text-sm text-white/90"
                      :class="item.completed ? 'line-through text-white/60' : ''"
                    >
                      <span
                        v-if="item.category"
                        class="mr-2 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70"
                      >{{ item.category }}</span>
                      {{ item.title }}
                    </div>
                    <div
                      v-if="item.description"
                      class="mt-1 text-xs text-white/60"
                    >
                      {{ item.description }}
                    </div>
                  </div>
                  <button
                    class="shrink-0 rounded-md p-1.5 text-white/50 hover:text-white/80 hover:bg-white/10"
                    type="button"
                    aria-label="Delete checklist item"
                    @click.stop.prevent="deleteChecklistItem(item)"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else-if="projectId"
            class="text-sm text-white/70"
          >
            No checklist items yet for this project.
          </div>
        </div>
      </div>

      <div class="lg:col-span-3 rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col min-h-0">
        <div class="text-sm font-semibold text-white/90">
          Documentation
        </div>

        <div class="mt-2 flex-1 min-h-0 overflow-y-auto pr-1">
          <div
            v-if="selectedItem"
            class="rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm text-white/90">
                  <span
                    v-if="selectedItem.category"
                    class="mr-2 text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70"
                  >{{ selectedItem.category }}</span>
                  {{ selectedItem.title }}
                </div>
                <div
                  v-if="selectedItem.description"
                  class="mt-2 text-sm text-white/70"
                >
                  {{ selectedItem.description }}
                </div>
                <div
                  v-if="selectedItem.guidance"
                  class="mt-3 text-sm text-white/70 whitespace-pre-line"
                >
                  {{ selectedItem.guidance }}
                </div>

                <div
                  v-if="selectedItem.platformGuidance || platformLinks.length"
                  class="mt-4 rounded-lg border border-white/10 bg-black/30 p-3"
                >
                  <div class="text-xs font-semibold text-white/80">
                    In CXMA
                  </div>
                  <div
                    v-if="selectedItem.platformGuidance"
                    class="mt-2 text-sm text-white/70 whitespace-pre-line"
                  >
                    {{ selectedItem.platformGuidance }}
                  </div>
                  <div
                    v-if="resolvedPlatformLinks.length"
                    class="mt-3 flex flex-wrap gap-2"
                  >
                    <RouterLink
                      v-for="l in resolvedPlatformLinks"
                      :key="l.title"
                      class="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80"
                      :to="l.to"
                    >
                      {{ l.title }}
                    </RouterLink>
                  </div>
                  <div
                    v-if="resolvedPlatformLinks.some((l) => l.note)"
                    class="mt-2 space-y-1 text-[11px] text-white/50"
                  >
                    <div
                      v-for="(l, idx) in resolvedPlatformLinks.filter((x) => x.note)"
                      :key="`note-${idx}`"
                    >
                      <span class="text-white/40">{{ l.title }}:</span> {{ l.note }}
                    </div>
                  </div>
                </div>

                <div
                  v-if="selectedItem.sourceTitle || selectedItem.sourceUrl"
                  class="mt-3 text-xs text-white/50"
                >
                  <span class="text-white/40">Source:</span>
                  <a
                    v-if="selectedItem.sourceUrl"
                    class="ml-1 underline hover:text-white/70"
                    :href="selectedItem.sourceUrl"
                    target="_blank"
                    rel="noreferrer"
                  >{{ selectedItem.sourceTitle || selectedItem.sourceUrl }}</a>
                  <span
                    v-else
                    class="ml-1"
                  >{{ selectedItem.sourceTitle }}</span>
                </div>
              </div>
              <button
                class="shrink-0 px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80"
                @click="clearSelection"
              >
                Clear
              </button>
            </div>
            <div class="mt-3 text-xs text-white/40">
              Guidance is informational; confirm requirements against the official standards and project contract documents.
            </div>

            <div class="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
              <div class="text-xs font-semibold text-white/80">
                Trusted links
              </div>
              <div class="mt-1 text-[11px] text-white/50">
                Links only; CXMA does not store or reproduce copyrighted standards text.
              </div>
              <div
                v-if="docsStore.loading"
                class="mt-2 text-xs text-white/60"
              >
                Loading links…
              </div>
              <div
                v-else-if="docsStore.error"
                class="mt-2 text-xs text-red-300"
              >
                {{ docsStore.error }}
              </div>
              <div
                v-else-if="docsLinks.length === 0 && generalLinks.length === 0"
                class="mt-2 text-xs text-white/60"
              >
                No trusted links available yet for this item.
              </div>
              <ul
                v-else
                class="mt-2 space-y-2"
              >
                <li
                  v-for="(l, idx) in docsLinks"
                  :key="`doc-${idx}`"
                  class="text-xs text-white/80"
                >
                  <a
                    class="underline hover:text-white"
                    :href="l.url"
                    target="_blank"
                    rel="noreferrer"
                  >{{ l.title }}</a>
                  <div
                    v-if="l.note"
                    class="mt-0.5 text-[11px] text-white/50"
                  >
                    {{ l.note }}
                  </div>
                </li>
                <li
                  v-if="docsLinks.length && generalLinks.length"
                  class="pt-1 border-t border-white/10"
                />
                <li
                  v-for="(l, idx) in generalLinks"
                  :key="`general-${idx}`"
                  class="text-xs text-white/70"
                >
                  <a
                    class="underline hover:text-white/90"
                    :href="l.url"
                    target="_blank"
                    rel="noreferrer"
                  >{{ l.title }}</a>
                  <div
                    v-if="l.note"
                    class="mt-0.5 text-[11px] text-white/50"
                  >
                    {{ l.note }}
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div
            v-else
            class="text-sm text-white/70"
          >
            <div class="text-sm text-white/70">
              Browse trusted articles, or select a checklist item to see item-specific guidance.
            </div>

            <div class="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div class="text-xs font-semibold text-white/80">
                  Articles
                </div>
                <div class="flex items-center gap-2">
                  <input
                    v-model="articleQuery"
                    type="text"
                    placeholder="Search articles…"
                    class="w-64 max-w-full px-2 py-1 rounded-md bg-white/10 border border-white/20 text-xs text-white/80 placeholder:text-white/40"
                  >
                  <button
                    class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80"
                    :disabled="articlesStore.loadingList || !projectId"
                    @click="refreshArticles"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="c in articleCategories"
                  :key="c"
                  class="px-2 py-1 rounded-full text-[11px] border"
                  :class="selectedArticleCategory === c ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200' : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10'"
                  @click="setArticleCategory(c)"
                >
                  {{ c }}
                </button>
              </div>

              <div
                v-if="articlesStore.loadingList"
                class="mt-3 text-xs text-white/60"
              >
                Loading articles…
              </div>
              <div
                v-else-if="articlesStore.error"
                class="mt-3 text-xs text-red-300"
              >
                {{ articlesStore.error }}
              </div>

              <div
                v-else-if="selectedArticle"
                class="mt-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm text-white/90">
                      {{ selectedArticle.title }}
                    </div>
                    <div
                      v-if="selectedArticle.author"
                      class="mt-1 text-xs text-white/60"
                    >
                      By {{ selectedArticle.author }}
                    </div>
                    <div class="mt-1 text-xs text-white/50">
                      {{ selectedArticle.category }} • Updated {{ formatDate(selectedArticle.updatedAt) }}
                    </div>
                  </div>
                  <button
                    class="shrink-0 px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-xs text-white/80"
                    @click="clearArticleSelection"
                  >
                    Back
                  </button>
                </div>

                <div class="mt-3">
                  <div class="flex items-center gap-2">
                    <div class="text-xs text-white/60">
                      Search in article:
                    </div>
                    <input
                      v-model="articleBodyQuery"
                      type="text"
                      placeholder="Find…"
                      class="w-56 max-w-full px-2 py-1 rounded-md bg-white/10 border border-white/20 text-xs text-white/80 placeholder:text-white/40"
                    >
                  </div>
                  <div class="mt-3 text-sm text-white/80 whitespace-pre-wrap leading-6">
                    <template
                      v-for="(seg, idx) in highlightedArticleBody"
                      :key="`seg-${idx}`"
                    >
                      <mark
                        v-if="seg.match"
                        class="bg-emerald-500/20 text-emerald-100 px-0.5 rounded"
                      >{{ seg.text }}</mark>
                      <span v-else>{{ seg.text }}</span>
                    </template>
                  </div>
                </div>
              </div>

              <div
                v-else-if="articlesStore.articles.length"
                class="mt-4 space-y-2"
              >
                <button
                  v-for="a in articlesStore.articles"
                  :key="a.slug"
                  class="w-full text-left rounded-lg border border-white/10 bg-black/20 p-3 hover:bg-black/30"
                  @click="openArticle(a.slug)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-sm text-white/90">
                        {{ a.title }}
                      </div>
                      <div class="mt-1 text-xs text-white/50">
                        {{ a.category }}
                        <span
                          v-if="a.author"
                          class="ml-2 text-white/60"
                        >By {{ a.author }}</span>
                      </div>
                      <div
                        v-if="a.summary"
                        class="mt-2 text-xs text-white/70 line-clamp-2"
                      >
                        {{ a.summary }}
                      </div>
                    </div>
                    <div class="shrink-0 text-xs text-white/40">
                      {{ formatDate(a.updatedAt) }}
                    </div>
                  </div>
                </button>
              </div>

              <div
                v-else
                class="mt-4 text-xs text-white/60"
              >
                No articles found.
              </div>
            </div>

            <div
              v-if="docsStore.loading"
              class="mt-4 text-xs text-white/50"
            >
              Loading trusted links…
            </div>
            <div
              v-else-if="docsStore.error"
              class="mt-4 text-xs text-red-300"
            >
              {{ docsStore.error }}
            </div>
            <div
              v-else-if="generalLinks.length"
              class="mt-4 rounded-lg border border-white/10 bg-black/30 p-3"
            >
              <div class="text-xs font-semibold text-white/80">
                Trusted sources
              </div>
              <ul class="mt-2 space-y-2">
                <li
                  v-for="(l, idx) in generalLinks"
                  :key="`general-empty-${idx}`"
                  class="text-xs text-white/70"
                >
                  <a
                    class="underline hover:text-white/90"
                    :href="l.url"
                    target="_blank"
                    rel="noreferrer"
                  >{{ l.title }}</a>
                  <div
                    v-if="l.note"
                    class="mt-0.5 text-[11px] text-white/50"
                  >
                    {{ l.note }}
                  </div>
                </li>
              </ul>
            </div>
            <div
              v-else-if="docs && docs.docsAvailable === false"
              class="mt-4 rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/60"
            >
              {{ docs.message || 'No documentation is available for this project type yet.' }}
            </div>
          </div>

          <div
            class="mt-4"
          >
            <div
              v-if="aiStatusLoading"
              class="text-xs text-white/60"
            >
              Loading AI status…
            </div>
            <div
              v-else-if="aiStatus && aiStatus.ai && aiStatus.ai.canChat === false"
              class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-50"
            >
              <div class="font-semibold">
                AI is not ready for this project
              </div>
              <div class="mt-1 text-sm text-amber-100/90">
                <span v-if="aiStatus.ai.reason === 'FEATURE_NOT_IN_PLAN'">Upgrade to the Premium plan to enable AI.</span>
                <span v-else-if="aiStatus.ai.reason === 'AI_DISABLED'">AI is disabled for this project.</span>
                <span v-else>AI needs an API key (project key or server key fallback) to operate.</span>
              </div>
            </div>
            <div
              v-else-if="aiStatus && aiStatus.ai && aiStatus.ai.canChat === true"
              class="rounded-xl border border-white/10 bg-black/30 overflow-hidden"
            >
              <AssistantChat class="h-[420px]" />
            </div>
            <div v-else>
              <AssistantHelper />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BreadCrumbs from '../../components/BreadCrumbs.vue'
import AssistantChat from '../../components/assistant/AssistantChat.vue'
import AssistantHelper from '../../components/assistant/AssistantHelper.vue'
import { useProjectStore } from '../../stores/project'
import { useAssistantStore } from '../../stores/assistant'
import { useAssistantChecklistStore, type AssistantChecklistItem } from '../../stores/assistantChecklist'
import { useAssistantDocsStore } from '../../stores/assistantDocs'
import { useAssistantArticlesStore } from '../../stores/assistantArticles'
import { useUiStore } from '../../stores/ui'
import { useAuthStore } from '../../stores/auth'
import http from '../../utils/http'
import { confirm } from '../../utils/confirm'
import { runCoachmarkOnce } from '../../utils/coachmarks'

const projectStore = useProjectStore()
const assistantStore = useAssistantStore()
const checklistStore = useAssistantChecklistStore()
const docsStore = useAssistantDocsStore()
const articlesStore = useAssistantArticlesStore()
const ui = useUiStore()
const authStore = useAuthStore()

const projectId = computed(() => String(projectStore.currentProjectId || localStorage.getItem('selectedProjectId') || '').trim())
const projectType = computed(() => String(projectStore.currentProject?.project_type || projectStore.currentProject?.type || '').trim())

const aiStatusLoading = ref(false)
const aiStatus = ref<any | null>(null)

async function fetchAiStatus() {
  const pid = String(projectId.value || '').trim()
  if (!pid) {
    aiStatus.value = null
    return
  }
  aiStatusLoading.value = true
  try {
    const { data } = await http.get('/api/ai/status', { params: { projectId: pid } })
    aiStatus.value = data || null
  } catch (_) {
    aiStatus.value = null
  } finally {
    aiStatusLoading.value = false
  }
}

const dismissedRecommendedActionsStorageKey = computed(() => {
  const uid = String(authStore.user?._id || authStore.user?.id || authStore.user?.email || 'anon')
  const pid = String(projectId.value || '').trim()
  return `assistant.recommended.dismissed:${uid}:${pid || 'no-project'}`
})
const dismissedRecommendedActions = ref<Set<string>>(new Set())
watch(
  dismissedRecommendedActionsStorageKey,
  (key) => {
    try {
      const raw = localStorage.getItem(key)
      const list = raw ? JSON.parse(raw) : []
      dismissedRecommendedActions.value = new Set(Array.isArray(list) ? list.map((x) => String(x)) : [])
    } catch {
      dismissedRecommendedActions.value = new Set()
    }
  },
  { immediate: true },
)
function dismissRecommendedAction(key: string) {
  const k = String(key || '').trim()
  if (!k) return
  const next = new Set(dismissedRecommendedActions.value)
  next.add(k)
  dismissedRecommendedActions.value = next
  try {
    localStorage.setItem(dismissedRecommendedActionsStorageKey.value, JSON.stringify(Array.from(next)))
  } catch {
    /* ignore */
  }
}

const checklist = computed(() => checklistStore.checklist)
const selectedItemId = ref<string>('')
const showAddItem = ref(false)
const newItemTitle = ref('')
const newItemCategory = ref('')
const newItemDescription = ref('')

function toggleAddItem() {
  showAddItem.value = !showAddItem.value
  if (!showAddItem.value) {
    newItemTitle.value = ''
    newItemCategory.value = ''
    newItemDescription.value = ''
  }
}

async function createChecklistItem() {
  if (!projectId.value) return
  try {
    await checklistStore.createItem(
      {
        title: newItemTitle.value,
        category: newItemCategory.value,
        description: newItemDescription.value,
      },
      projectId.value
    )
    showAddItem.value = false
    newItemTitle.value = ''
    newItemCategory.value = ''
    newItemDescription.value = ''
    ui.showSuccess('Checklist item added')
  } catch (e: any) {
    ui.showError(e?.message || 'Failed to add checklist item')
  }
}

async function deleteChecklistItem(item: AssistantChecklistItem) {
  const current = checklist.value
  if (!current?.id) return
  const iid = String(item?.id || '').trim()
  if (!iid) return
  const ok = await confirm({
    title: 'Delete checklist item?',
    message: `This will remove this item from the checklist for this project:\n\n${String(item.title || '').trim()}\n\nContinue?`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    danger: true,
  })
  if (!ok) return
  try {
    await checklistStore.deleteItem(iid)
    if (selectedItemId.value === iid) selectedItemId.value = ''
    ui.showSuccess('Checklist item deleted')
  } catch (e: any) {
    ui.showError(e?.message || 'Failed to delete checklist item')
  }
}

const selectedItem = computed(() => {
  const list = checklist.value?.items || []
  const id = String(selectedItemId.value || '').trim()
  if (!id) return null
  return list.find((i) => i.id === id) || null
})
const docs = computed(() => docsStore.docs)
const docsLinks = computed(() => docs.value?.docs || [])
const generalLinks = computed(() => docs.value?.general || [])
const platformLinks = computed(() => selectedItem.value?.platformLinks || [])
const quickImportLoading = ref(false)
const recommendedActions = computed(() => {
  const pid = String(projectId.value || '').trim()
  const ptype = String(projectType.value || '').trim()
  const replace = (input: string) => {
    let out = String(input || '')
    if (ptype) out = out.replaceAll('{projectType}', encodeURIComponent(ptype))
    if (pid) out = out.replaceAll('{projectId}', encodeURIComponent(pid))
    return out
  }
  const actions: Array<{ key: string; title: string; to: any }> = [
    { key: 'import-template', title: 'Open import wizard', to: '/app/tasks?import=1&tab=template&templateQ={projectType}' },
    { key: 'create-kickoff', title: 'Create kickoff activity', to: { name: 'activity-edit', params: { id: 'new' }, query: { preset: 'kickoff' } } },
    { key: 'open-equipment', title: 'Open equipment', to: '/app/equipment' },
    { key: 'open-issues', title: 'Open issues', to: '/app/issues' },
    { key: 'project-settings', title: 'Project settings', to: '/app/projects/edit/{projectId}' },
  ]

  const visible = actions
    .filter((a) => !dismissedRecommendedActions.value.has(a.key))
  if (!ptype) {
    return visible
      .filter((a) => a.key !== 'import-template')
      .map((a) => ({ ...a, to: typeof a.to === 'string' ? replace(a.to) : a.to }))
  }

  const kickoffLabel = (() => {
    const low = ptype.toLowerCase()
    if (low.includes('facility condition assessment')) return 'Create walkthrough activity'
    if (low.includes('retro')) return 'Create site visit activity'
    if (low.includes('envelope')) return 'Create inspection activity'
    return 'Create kickoff activity'
  })()

  const kickoffType = (() => {
    const low = ptype.toLowerCase()
    if (low.includes('facility condition assessment')) return 'Assessment'
    if (low.includes('retro')) return 'Site Visit Review'
    if (low.includes('envelope')) return 'Installation Review'
    return 'OPR Review'
  })()
  const kickoffName = (() => {
    const low = ptype.toLowerCase()
    if (low.includes('facility condition assessment')) return 'Facility Walkthrough / Assessment'
    if (low.includes('retro')) return 'Retro Cx Site Visit / Investigation'
    if (low.includes('envelope')) return 'Envelope Inspection'
    return 'Commissioning Kickoff / OPR Workshop'
  })()

  return visible.map((a) => ({
    ...a,
    title: a.key === 'create-kickoff' ? kickoffLabel : a.title,
    to: a.key === 'create-kickoff'
      ? { name: 'activity-edit', params: { id: 'new' }, query: { preset: 'kickoff', name: kickoffName, type: kickoffType, status: 'draft' } }
      : (typeof a.to === 'string' ? replace(a.to) : a.to),
  }))
})

async function quickImportTasksFromTemplate() {
  const pid = String(projectId.value || '').trim()
  const ptype = String(projectType.value || '').trim()
  if (!pid) return
  if (!ptype) {
    try { ui.showError('Project type is required to pick a task template') } catch (_) { /* ignore */ }
    return
  }
  if (quickImportLoading.value) return
  quickImportLoading.value = true
  try {
    const { data } = await http.get('/api/tasks/templates', { params: { projectId: pid, q: ptype } })
    const templates = Array.isArray((data as any)?.templates) ? (data as any).templates : []
    const first = templates[0] || null
    if (!first) {
      try { ui.showError(`No task templates found for "${ptype}". Use the import wizard instead.`) } catch (_) { /* ignore */ }
      return
    }
    const templateId = String(first._id || first.id || '').trim()
    const templateName = String(first.name || first.slug || 'Selected template').trim()
    if (!templateId) {
      try { ui.showError('Task template is missing an id') } catch (_) { /* ignore */ }
      return
    }

    const ok = await confirm({
      title: 'Import tasks from template?',
      message: `This will import tasks into the current project using:\n\n${templateName}\n\nContinue?`,
      confirmText: 'Import',
      cancelText: 'Cancel',
    })
    if (!ok) return

    const resp = await http.post('/api/tasks/import-template', { projectId: pid, templateId })
    const imported = Number((resp as any)?.data?.imported || 0)
    try { ui.showSuccess(imported > 0 ? `Imported ${imported} tasks from "${templateName}"` : `Imported tasks from "${templateName}"`) } catch (_) { /* ignore */ }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Import failed'
    try { ui.showError(`Import failed: ${msg}`) } catch (_) { /* ignore */ }
  } finally {
    quickImportLoading.value = false
  }
}
const resolvedPlatformLinks = computed(() => {
  const pid = String(projectId.value || '').trim()
  const ptype = String(projectType.value || '').trim()
  const replace = (input: string) => {
    let out = String(input || '')
    if (ptype) out = out.replaceAll('{projectType}', encodeURIComponent(ptype))
    if (pid) out = out.replaceAll('{projectId}', encodeURIComponent(pid))
    return out
  }
  return (platformLinks.value || []).map((l) => ({
    ...l,
    to: replace(String(l.to || '')),
  }))
})

const articleCategories = [
  'New Building Cx',
  'Existing Building Cx',
  'LEED Cx',
  'Facility Assessments',
  'The CXMA Platform',
] as const
const selectedArticleCategory = ref<typeof articleCategories[number]>('New Building Cx')
const articleQuery = ref('')
const articleBodyQuery = ref('')
const selectedArticleSlug = ref('')
const selectedArticle = computed(() => articlesStore.article && articlesStore.article.slug === selectedArticleSlug.value ? articlesStore.article : null)

function setArticleCategory(category: typeof articleCategories[number]) {
  selectedArticleCategory.value = category
  selectedArticleSlug.value = ''
  articlesStore.clearArticle()
  refreshArticles()
}

function refreshArticles() {
  if (!projectId.value) return
  articlesStore.fetchArticles({ projectId: projectId.value, q: articleQuery.value, category: selectedArticleCategory.value }).catch(() => {})
}

function openArticle(slug: string) {
  selectedArticleSlug.value = String(slug || '').trim()
  articleBodyQuery.value = ''
  assistantStore.setContext({ entityType: 'assistantArticle', entityId: selectedArticleSlug.value || null })
  articlesStore.fetchArticle(selectedArticleSlug.value, { projectId: projectId.value }).catch(() => {})
}

function clearArticleSelection() {
  selectedArticleSlug.value = ''
  articleBodyQuery.value = ''
  articlesStore.clearArticle()
  assistantStore.setContext({ entityType: null, entityId: null })
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const highlightedArticleBody = computed(() => {
  const body = String(selectedArticle.value?.body || '')
  const q = String(articleBodyQuery.value || '').trim()
  if (!q) return [{ text: body, match: false }]
  const re = new RegExp(escapeRegExp(q), 'ig')
  const out: Array<{ text: string, match: boolean }> = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const start = m.index
    const end = start + m[0].length
    if (start > lastIndex) out.push({ text: body.slice(lastIndex, start), match: false })
    out.push({ text: body.slice(start, end), match: true })
    lastIndex = end
    if (re.lastIndex === start) re.lastIndex++ // safety
  }
  if (lastIndex < body.length) out.push({ text: body.slice(lastIndex), match: false })
  return out.length ? out : [{ text: body, match: false }]
})

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString()
  } catch (_) {
    return ''
  }
}

function onToggleItem(item: AssistantChecklistItem, checked: boolean) {
  checklistStore.setItemCompleted(item.id, Boolean(checked))
}

function selectItem(id: string) {
  selectedItemId.value = String(id || '').trim()
  selectedArticleSlug.value = ''
  articlesStore.clearArticle()
  assistantStore.setContext({ entityType: 'assistantChecklistItem', entityId: selectedItemId.value || null })
  docsStore.fetchDocs({ projectId: projectId.value, itemId: selectedItemId.value }).catch(() => {})
}

function clearSelection() {
  selectedItemId.value = ''
  selectedArticleSlug.value = ''
  articlesStore.clearArticle()
  assistantStore.setContext({ entityType: null, entityId: null })
  docsStore.fetchDocs({ projectId: projectId.value }).catch(() => {})
}

async function ensureLoaded() {
  if (!projectId.value) return
  await checklistStore.fetchChecklist(projectId.value)
  docsStore.fetchDocs({ projectId: projectId.value }).catch(() => {})
  articlesStore.fetchArticles({ projectId: projectId.value, category: selectedArticleCategory.value }).catch(() => {})
}

onMounted(() => {
  ensureLoaded().catch(() => {})
  fetchAiStatus().catch(() => {})

  const pid = String(projectId.value || '').trim()
  const uid = authStore.user?._id ? String(authStore.user._id) : null
  if (pid) {
    runCoachmarkOnce('assistant.docs.tip', { projectId: pid, userId: uid }, () => {
      ui.showInfo('Tip: Select a checklist item (checkbox toggles completion) to see CXMA guidance + trusted docs. If nothing is selected, browse/search articles on the right.', { duration: 12000 })
    })
  }
})

watch(projectId, () => {
  ensureLoaded().catch(() => {})
  fetchAiStatus().catch(() => {})
  selectedItemId.value = ''
  selectedArticleSlug.value = ''
  articleQuery.value = ''
  articleBodyQuery.value = ''
  assistantStore.setContext({ entityType: null, entityId: null })
})

let articleSearchTimer: any = null
watch(articleQuery, () => {
  if (!projectId.value) return
  if (articleSearchTimer) clearTimeout(articleSearchTimer)
  articleSearchTimer = setTimeout(() => {
    refreshArticles()
  }, 250)
})
</script>
