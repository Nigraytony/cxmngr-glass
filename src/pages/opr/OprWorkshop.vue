<template>
  <section class="flex flex-col gap-6">
    <div>
      <BreadCrumbs
        :items="[
          { text: 'Dashboard', to: '/app' },
          { text: 'OPR Workshop', to: '/app/opr' }
        ]"
        title="OPR Workshop"
      />
    </div>

    <div
      v-if="!projectId"
      class="rounded-xl bg-white/8 border border-white/10 p-4 text-white/80 flex-1"
    >
      Select a project to run an OPR workshop.
    </div>

    <div
      v-else
      class="grid grid-cols-12 gap-4 h-[calc(100vh-10rem)] min-h-0"
    >
      <!-- Left: session / controls -->
      <div class="col-span-12 lg:col-span-5 h-full min-h-0">
        <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
          <div class="flex items-center justify-between gap-3">
            <div class="text-white font-semibold">
              Questions
            </div>
            <div class="flex items-center gap-2">
              <div
                v-if="isAdmin && addonEnabled"
                class="relative inline-block group"
              >
                <button
                  type="button"
                  class="w-10 h-10 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/10 text-white border border-white/10"
                  aria-label="New question"
                  @click="openCreateQuestion"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-5 h-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                  </svg>
                </button>
                <div
                  role="tooltip"
                  class="pointer-events-none absolute left-1/2 -translate-x-1/2 mt-2 w-max opacity-0 scale-95 transform rounded-md bg-white/6 text-white/80 text-xs px-2 py-1 border border-white/10 transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:scale-100 group-focus-within:scale-100"
                >
                  New question
                </div>
              </div>
              <button
                v-if="isAdmin && active?.id"
                type="button"
                class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
                @click="selectedQuestionId = active?.id || null"
              >
                Jump to active
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm disabled:opacity-50"
                :disabled="opr.loading"
                @click="refresh"
              >
                Refresh
              </button>
            </div>
          </div>

          <div class="mt-3 space-y-3 overflow-auto pr-1 min-h-0 flex-1">
            <div
              v-if="!addonEnabled"
              class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
            >
              <div class="font-semibold text-white">
                OPR Workshop is a paid add-on
              </div>
              <div class="text-sm text-white/70 mt-1">
                One-time purchase: $24.99 per project.
              </div>
              <div class="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-emerald-500/80 hover:bg-emerald-500 text-white text-sm"
                  @click="purchaseAddon"
                >
                  Purchase
                </button>
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
                  @click="refreshProject"
                >
                  I already purchased
                </button>
              </div>
            </div>

            <div
              v-if="opr.questions.length"
              class="space-y-3"
            >
	              <div
	                v-for="q in opr.questions"
	                :key="q.id"
	                class="rounded-xl bg-white/5 border border-white/10 p-3 text-white/80"
	              >
	                <div class="flex items-start justify-between gap-3">
	                  <button
	                    type="button"
	                    class="min-w-0 text-left"
	                    @click="selectedQuestionId = q.id"
	                  >
	                    <div class="flex items-center gap-2">
	                      <span class="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 shrink-0">
	                        {{ questionTagMap[q.id] }}
	                      </span>
	                      <span class="text-white/90 text-sm font-semibold truncate">
	                        {{ truncate(q.prompt, 80) }}
	                      </span>
	                    </div>
	                    <div class="mt-1 text-white/60 text-xs">
	                      {{ statusLabel(q.status) }}
	                    </div>
	                  </button>

	                  <div class="shrink-0 flex items-center gap-2">
	                    <span
	                      v-if="active?.id === q.id"
	                      class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-emerald-200"
	                    >
	                      Active
	                    </span>

	                    <div class="flex items-center gap-1">
	                      <button
	                        type="button"
	                        class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
	                        title="View"
	                        aria-label="View"
	                        @click="selectedQuestionId = q.id"
	                      >
	                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
	                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke-width="1.5" />
	                          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke-width="1.5" />
	                        </svg>
	                      </button>

	                      <button
	                        v-if="isAdmin"
	                        type="button"
	                        class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
	                        title="Edit question"
	                        aria-label="Edit question"
	                        @click="openEditQuestion(q)"
	                      >
	                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
	                          <path d="M12 20h9" stroke-width="1.5" />
	                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke-width="1.5" />
	                        </svg>
	                      </button>

	                      <button
	                        v-if="isAdmin && (q.status === 'draft' || q.status === 'closed')"
	                        type="button"
	                        class="h-8 w-8 inline-grid place-items-center rounded-md bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
	                        title="Open for responses"
	                        aria-label="Open for responses"
	                        @click="adminOpenForResponses(q)"
	                      >
	                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
	                          <path d="M8 5v14l11-7-11-7z" />
	                        </svg>
	                      </button>

	                      <button
	                        v-if="isAdmin && q.status === 'open'"
	                        type="button"
	                        class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
	                        title="Close responses"
	                        aria-label="Close responses"
	                        @click="adminCloseResponses(q)"
	                      >
	                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
	                          <path d="M12 6v6l4 2" stroke-width="1.5" />
	                          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" stroke-width="1.5" />
	                          <path d="M6 6l12 12" stroke-width="1.5" />
	                        </svg>
	                      </button>

	                      <button
	                        v-if="isAdmin && q.status === 'closed'"
	                        type="button"
	                        class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
	                        title="Open voting"
	                        aria-label="Open voting"
	                        @click="adminOpenVotingFor(q)"
	                      >
	                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
	                          <path d="M9 12l2 2 4-4" stroke-width="1.5" />
	                          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke-width="1.5" />
	                        </svg>
	                      </button>

	                      <button
	                        v-if="isAdmin && q.status === 'voting'"
	                        type="button"
	                        class="h-8 w-8 inline-grid place-items-center rounded-md bg-white/6 border border-white/10 text-white/80 hover:bg-white/10 disabled:opacity-50"
	                        title="Close voting"
	                        aria-label="Close voting"
	                        @click="adminCloseVotingFor(q)"
	                      >
	                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
	                          <path d="M6 6h12v12H6z" />
	                        </svg>
	                      </button>

	                      <button
	                        v-if="isAdmin"
	                        type="button"
	                        class="h-8 w-8 inline-grid place-items-center rounded-md bg-red-500/15 border border-red-500/30 text-red-200 hover:bg-red-500/25 disabled:opacity-50"
	                        title="Delete question"
	                        aria-label="Delete question"
	                        @click="deleteQuestionCard(q)"
	                      >
	                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
	                          <path d="M3 6h18" stroke-width="1.5" />
	                          <path d="M8 6V4h8v2" stroke-width="1.5" />
	                          <path d="M6 6l1 16h10l1-16" stroke-width="1.5" />
	                          <path d="M10 11v6" stroke-width="1.5" />
	                          <path d="M14 11v6" stroke-width="1.5" />
	                        </svg>
	                      </button>
	                    </div>
	                  </div>
	                </div>

	                <div
	                  v-if="selectedQuestion?.id === q.id"
	                  class="mt-3 pt-3 border-t border-white/10"
	                >
	                  <div class="flex items-start justify-between gap-3">
	                    <div class="min-w-0">
	                      <div class="text-white font-semibold">
	                        <span v-if="selectedQuestionTag" class="mr-2 text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80">
	                          {{ selectedQuestionTag }}
	                        </span>
	                        {{ statusLabel(selectedQuestion.status) }}
	                      </div>
	                      <div class="text-white/70 text-sm mt-1 whitespace-pre-wrap">
	                        {{ selectedQuestion.prompt }}
	                      </div>
	                    </div>
	                    <div class="shrink-0">
	                      <span class="inline-flex items-center px-2 py-1 rounded-md text-xs bg-white/10 border border-white/15 text-white/80">
	                        {{ countdownLabel }}
	                      </span>
	                    </div>
	                  </div>

	                  <div
	                    v-if="selectedQuestion.status === 'open'"
	                    class="mt-4 grid gap-2"
	                  >
	                    <label class="block">
	                      <div class="text-white/80 text-sm mb-1">Your answer</div>
	                      <textarea
	                        v-model="answerText"
	                        rows="3"
	                        class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
	                        placeholder="Type an answer… (you can submit up to 10)"
	                      />
	                    </label>
	                    <div class="flex items-center justify-between gap-2">
	                      <div class="text-xs text-white/60">
	                        Tip: answers auto-close when time expires (admins can also close early).
	                      </div>
	                      <button
	                        type="button"
	                        class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
	                        :disabled="!answerText.trim() || submittingAnswer"
	                        @click="submitAnswer"
	                      >
	                        Submit Answer
	                      </button>
	                    </div>
	                  </div>

	                  <div
	                    v-else-if="selectedQuestion.status === 'closed'"
	                    class="mt-4"
	                  >
	                    <div class="text-sm text-white/70">
	                      Answers are now visible to all participants.
	                    </div>
	                  </div>

	                  <div
	                    v-else-if="selectedQuestion.status === 'voting'"
	                    class="mt-4 space-y-3"
	                  >
	                    <div class="text-sm text-white/70">
	                      Select your favorite 5 answers and rank them (1 = most favored).
	                    </div>

	                    <div class="grid gap-2">
	                      <div
	                        v-for="r in [1,2,3,4,5]"
	                        :key="r"
	                        class="grid grid-cols-12 gap-2 items-center"
	                      >
	                        <div class="col-span-2 text-white/80 text-sm">
	                          {{ r }}
	                        </div>
	                        <div class="col-span-10">
	                          <select
	                            v-model="voteByRank[r]"
	                            class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
	                          >
	                            <option value="">
	                              Select answer…
	                            </option>
	                            <option
	                              v-for="a in voteableAnswers"
	                              :key="a.id"
	                              :value="a.id"
	                              :disabled="isAnswerChosenElsewhere(a.id, r)"
	                            >
	                              {{ answerTagMap[a.id] ? `${answerTagMap[a.id]} — ` : '' }}{{ truncate(a.text, 100) }}
	                            </option>
	                          </select>
	                        </div>
	                      </div>
	                    </div>

	                    <div class="flex items-center justify-end gap-2">
	                      <button
	                        type="button"
	                        class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
	                        :disabled="!canSubmitVote || submittingVote"
	                        @click="submitVote"
	                      >
	                        Submit Vote
	                      </button>
	                    </div>
	                  </div>

	                  <div
	                    v-else-if="selectedQuestion.status === 'finalized'"
	                    class="mt-4"
	                  >
	                    <div class="text-sm text-white/70">
	                      Voting is closed. Results are visible on the right.
	                    </div>
	                  </div>
	                </div>
	              </div>
	            </div>

	            <div
	              v-else
	              class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/70 text-sm"
	            >
	              No questions yet.
	            </div>

	            <div
	              v-if="isAdmin && opr.questions.length === 0"
	              class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
	            >
              <div class="font-semibold text-white">
                Create the first question
              </div>
              <div class="text-sm text-white/70 mt-1">
                Create and open a new question to start the session.
              </div>

              <div class="mt-4 grid gap-3">
                <label class="block">
                  <div class="text-white/80 text-sm mb-1">Category</div>
                  <select
                    v-model="draft.categoryId"
                    class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option value="" disabled>
                      Select category…
                    </option>
                    <option
                      v-for="c in opr.categories"
                      :key="c.id"
                      :value="c.id"
                    >
                      {{ c.name }}
                    </option>
                  </select>
                </label>

                <label class="block">
                  <div class="text-white/80 text-sm mb-1">Question prompt</div>
                  <textarea
                    v-model="draft.prompt"
                    rows="4"
                    class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Enter the question for the session…"
                  />
                </label>

                <label class="block">
                  <div class="text-white/80 text-sm mb-1">Answer window (minutes)</div>
                  <input
                    v-model.number="draft.durationMinutes"
                    type="number"
                    min="1"
                    max="240"
                    class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                </label>

                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!canStart"
                  @click="startQuestion"
                >
                  Create & Open Question
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- Right: answers/results -->
      <div class="col-span-12 lg:col-span-7 h-full min-h-0">
        <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="px-3 py-2 rounded-md text-sm border"
                :class="rightTab === 'responses' ? 'bg-white/15 border-white/20 text-white/90' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'"
                @click="rightTab = 'responses'"
              >
                Responses
              </button>
              <button
                v-if="addonEnabled"
                type="button"
                class="px-3 py-2 rounded-md text-sm border"
                :class="rightTab === 'register' ? 'bg-white/15 border-white/20 text-white/90' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'"
                @click="rightTab = 'register'"
              >
                OPR Items
              </button>
            </div>
            <div class="flex items-center gap-2">
              <template v-if="rightTab === 'responses'">
                <button
                  v-if="selectedQuestion"
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
                  @click="refreshAnswersAndResults"
                >
                  Refresh
                </button>
                <button
                  v-if="canMergeAnswers"
                  type="button"
                  class="h-9 w-9 inline-grid place-items-center rounded-md bg-white/10 border border-white/15 text-white/80 hover:bg-white/15"
                  :title="mergeMode ? 'Exit merge mode' : 'Merge responses'"
                  :aria-label="mergeMode ? 'Exit merge mode' : 'Merge responses'"
                  @click="toggleMergeMode"
                >
                  <svg v-if="!mergeMode" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
                    <circle cx="7" cy="6" r="2" stroke-width="1.5" />
                    <circle cx="7" cy="18" r="2" stroke-width="1.5" />
                    <circle cx="17" cy="12" r="2" stroke-width="1.5" />
                    <path d="M9 7.2L15.2 10.8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M9 16.8L15.2 13.2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-4 h-4">
                    <path d="M6 6l12 12" stroke-width="1.5" />
                    <path d="M18 6 6 18" stroke-width="1.5" />
                  </svg>
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/15 border border-white/20 hover:bg-white/20 text-white/90 text-sm"
                  :disabled="!registerCategoryId"
                  @click="refreshItems"
                >
                  Refresh
                </button>
              </template>
            </div>
          </div>

          <div
            v-if="rightTab === 'responses' && mergeMode"
            class="mt-3 rounded-lg bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-3"
          >
            <div class="text-xs text-white/70">
              Select 2+ responses to merge. The merged response will keep the earliest response tag.
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="mergeSelectedIds.length < 2"
                @click="openMergeModal"
              >
                Merge ({{ mergeSelectedIds.length }})
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white text-sm"
                @click="exitMergeMode"
              >
                Done
              </button>
            </div>
          </div>

          <div class="mt-3 flex-1 min-h-0 overflow-auto pr-1">
            <template v-if="rightTab === 'responses'">
              <div
                v-if="!selectedQuestion"
                class="text-white/70 text-sm"
              >
                Start a question to collect answers and vote on outcomes.
              </div>

              <template v-else>
	              <div
	                v-if="selectedQuestion.status === 'finalized' && opr.results.length"
	                class="space-y-2"
	              >
	                <div
	                  v-for="r in opr.results"
	                  :key="r.answerId"
	                  class="rounded-lg bg-white/5 border border-white/10 p-3"
	                >
		                  <div class="flex items-center justify-between gap-2">
		                    <div class="flex items-center gap-2 min-w-0">
		                      <span class="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 shrink-0">
		                        {{ answerTagMap[r.answerId] || `#${r.rank}` }}
		                      </span>
		                      <span class="text-white font-semibold shrink-0">#{{ r.rank }}</span>
		                      <span
		                        v-if="isCurrentUserId(r.authorUserId)"
		                        class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/10 border border-white/15 text-white/80 shrink-0"
		                        title="Your response"
		                        aria-label="Your response"
		                      >
		                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5">
		                          <path d="M20 21a8 8 0 1 0-16 0" stroke-width="1.5" />
		                          <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke-width="1.5" />
		                        </svg>
		                      </span>
		                    </div>
		                    <div class="text-white/70 text-sm min-w-0 truncate">
		                      {{ displayNameForUserId(r.authorUserId) }} · {{ r.score }} pts
		                    </div>
		                  </div>
		                  <div class="text-white/80 text-sm mt-1 whitespace-pre-wrap">
		                    {{ r.text }}
		                  </div>
		                </div>
	              </div>

	              <div
                v-else
                class="space-y-2"
              >
	                <div
	                  v-for="a in visibleAnswers"
	                  :key="a.id"
		                  class="rounded-lg bg-white/5 border border-white/10 p-3"
                    :class="mergeMode && isMergeSelected(a.id) ? 'ring-2 ring-white/25' : ''"
		                >
		                  <div class="mb-1 flex items-center justify-between gap-2">
		                    <div class="flex items-center gap-2 min-w-0">
                          <label
                            v-if="mergeMode"
                            class="inline-flex items-center shrink-0"
                            :title="isMergeSelected(a.id) ? 'Deselect' : 'Select'"
                          >
                            <input
                              type="checkbox"
                              class="h-5 w-5 rounded border-white/20 bg-black/20 text-white focus:ring-white/30"
                              :checked="isMergeSelected(a.id)"
                              @change="toggleMergeSelected(a.id)"
                            >
                          </label>
		                      <span class="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 shrink-0">
		                        {{ answerTagMap[a.id] || '' }}
		                      </span>
                          <button
                            v-if="isAdmin && !mergeMode && mergedCountFor(a) > 0"
                            type="button"
                            class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 hover:bg-white/15 shrink-0"
                            :title="`Merged (${mergedCountFor(a)}) — click to view / unmerge`"
                            @click="openMergeDetail(a.id)"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5">
                              <path d="M8 8h8" stroke-width="1.5" />
                              <path d="M8 12h8" stroke-width="1.5" />
                              <path d="M8 16h8" stroke-width="1.5" />
                              <path d="M6 6h12v12H6z" stroke-width="1.5" />
                            </svg>
                            <span>{{ mergedCountFor(a) }}</span>
                          </button>
		                      <span
		                        v-if="isCurrentUserId(a.authorUserId)"
		                        class="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/10 border border-white/15 text-white/80 shrink-0"
		                        title="Your response"
		                        aria-label="Your response"
		                      >
		                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-3.5 h-3.5">
		                          <path d="M20 21a8 8 0 1 0-16 0" stroke-width="1.5" />
		                          <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke-width="1.5" />
		                        </svg>
		                      </span>
		                    </div>
		                    <div class="text-xs text-white/60 min-w-0 truncate">
		                      {{ displayNameForUserId(a.authorUserId) }}
		                    </div>
		                  </div>
		                  <div class="text-white/80 text-sm whitespace-pre-wrap">
		                    {{ a.text }}
		                  </div>
		                </div>
                <div
                  v-if="visibleAnswers.length === 0"
                  class="text-white/70 text-sm"
                >
                  No answers yet.
                </div>
              </div>
              </template>
            </template>

            <template v-else>
              <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <label class="block">
                    <div class="text-white/70 text-xs mb-1">Category</div>
                    <select
                      v-model="registerCategoryId"
                      class="min-w-[240px] rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    >
                      <option value="" disabled>
                        Select category…
                      </option>
                      <option
                        v-for="c in opr.categories"
                        :key="c.id"
                        :value="c.id"
                      >
                        {{ c.name }}
                      </option>
                    </select>
                  </label>

                  <label
                    v-if="isAdmin"
                    class="flex items-center gap-2 text-white/70 text-sm mt-6"
                    title="Include archived OPR items"
                  >
                    <input
                      v-model="registerIncludeArchived"
                      type="checkbox"
                      class="h-4 w-4 rounded border-white/20 bg-black/20 text-white focus:ring-white/30"
                    >
                    Include archived
                  </label>

                  <label class="block flex-1 min-w-[220px]">
                    <div class="text-white/70 text-xs mb-1">Search</div>
                    <input
                      v-model="registerSearch"
                      type="text"
                      class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                      placeholder="Search OPR items…"
                    >
                  </label>
                </div>

                <div
                  v-if="!registerCategoryId"
                  class="text-white/70 text-sm"
                >
                  Select a category to view its OPR items.
                </div>

                <div
                  v-else-if="filteredOprItems.length === 0"
                  class="text-white/70 text-sm"
                >
                  No OPR items yet for this category. Close voting on a question to publish the top {{ topN }} items.
                </div>

                <div
                  v-else
                  class="space-y-2"
                >
                  <div
                    v-for="item in filteredOprItems"
                    :key="item.id"
                    class="rounded-lg bg-white/5 border border-white/10 p-3"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 shrink-0">
                          #{{ item.rank }}
                        </span>
                        <span
                          v-if="item.questionId && questionTagMap[item.questionId]"
                          class="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 shrink-0"
                        >
                          {{ questionTagMap[item.questionId] }}
                        </span>
                        <span
                          v-if="item.status === 'archived'"
                          class="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 shrink-0"
                          title="Archived"
                        >
                          Archived
                        </span>
                      </div>

                      <div class="text-xs text-white/60 shrink-0">
                        {{ item.score }} pts
                      </div>
                    </div>

                    <div class="text-white/85 text-sm mt-1 whitespace-pre-wrap">
                      {{ item.text }}
                    </div>

                    <div class="mt-2 flex items-center justify-between gap-2">
                      <div class="text-xs text-white/60 truncate">
                        <span v-if="item.questionId && questionTagMap[item.questionId]">
                          Source: {{ questionTagMap[item.questionId] }}
                        </span>
                        <span v-if="item.questionId && sourceAnswerBadge(item)">
                          · {{ sourceAnswerBadge(item) }}
                        </span>
                      </div>

                      <button
                        v-if="item.questionId"
                        type="button"
                        class="text-xs text-white/80 hover:text-white underline underline-offset-2 shrink-0"
                        @click="jumpToItemSource(item)"
                      >
                        View source
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
	    <Modal
	      v-model="questionModalOpen"
	      panel-class="max-w-2xl"
	    >
      <template #header>
        <div class="text-lg font-semibold">
          Edit question
        </div>
      </template>

	      <div class="space-y-3">
	        <label class="block space-y-1">
	          <div class="text-white/70 text-sm">Category</div>
	          <select
	            v-model="questionModalCategoryId"
	            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
	          >
            <option value="" disabled>
              Select category…
            </option>
            <option
              v-for="c in opr.categories"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </label>

	        <label class="block space-y-1">
	          <div class="text-white/70 text-sm">Prompt</div>
	          <textarea
	            v-model="questionModalPrompt"
	            rows="5"
	            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40"
	            placeholder="Enter the question prompt…"
	          />
	        </label>

	        <label class="block space-y-1">
	          <div class="text-white/70 text-sm">Answer window (minutes)</div>
	          <input
	            v-model.number="questionModalDurationMinutes"
	            type="number"
	            min="1"
	            max="240"
	            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
	          >
	        </label>
	      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            @click="questionModalOpen = false"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white disabled:opacity-50"
            :disabled="questionModalSaving || !questionModalPrompt.trim() || !questionModalCategoryId"
            @click="saveQuestionModal"
          >
            Save
          </button>
        </div>
      </template>
    </Modal>

	    <Modal
	      v-model="createQuestionOpen"
	      panel-class="max-w-2xl"
	    >
      <template #header>
        <div class="text-lg font-semibold">
          New question
        </div>
      </template>

	      <div class="space-y-3">
	        <label class="block space-y-1">
	          <div class="text-white/70 text-sm">Category</div>
	          <select
	            v-model="createQuestionCategoryId"
	            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
	          >
            <option value="" disabled>
              Select category…
            </option>
            <option
              v-for="c in opr.categories"
              :key="c.id"
              :value="c.id"
            >
              {{ c.name }}
            </option>
          </select>
        </label>

	        <label class="block space-y-1">
	          <div class="text-white/70 text-sm">Prompt</div>
	          <textarea
	            v-model="createQuestionPrompt"
	            rows="5"
	            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40"
	            placeholder="Enter the question prompt…"
	          />
	        </label>

	        <label class="block space-y-1">
	          <div class="text-white/70 text-sm">Answer window (minutes)</div>
	          <input
	            v-model.number="createQuestionDurationMinutes"
	            type="number"
	            min="1"
	            max="240"
	            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
	          >
	        </label>
	      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            :disabled="createQuestionSaving"
            @click="createQuestionOpen = false"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white disabled:opacity-50"
            :disabled="createQuestionSaving || !createQuestionPrompt.trim() || !createQuestionCategoryId"
            @click="saveCreateQuestion"
          >
            Add
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      v-model="mergeModalOpen"
      panel-class="max-w-2xl"
    >
      <template #header>
        <div class="text-lg font-semibold">
          Merge responses
        </div>
      </template>

      <div class="space-y-3">
        <div class="text-sm text-white/70">
          Merged response tag:
          <span class="ml-2 text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80">
            {{ mergeCanonicalTag || '—' }}
          </span>
        </div>

        <div class="rounded-lg bg-white/5 border border-white/10 p-3">
          <div class="text-white font-semibold text-sm">
            Selected responses ({{ mergeSelectedAnswers.length }})
          </div>
          <div class="mt-2 space-y-2">
            <div
              v-for="a in mergeSelectedAnswers"
              :key="a.id"
              class="text-sm text-white/80"
            >
              <span class="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 mr-2">
                {{ answerTagMap[a.id] || '' }}
              </span>
              <span class="text-white/70">
                {{ displayNameForUserId(a.authorUserId) }}
              </span>
              <div class="mt-1 text-white/80 whitespace-pre-wrap">
                {{ a.text }}
              </div>
            </div>
          </div>
        </div>

        <label class="block space-y-1">
          <div class="text-white/70 text-sm">Merged text</div>
          <textarea
            v-model="mergeModalText"
            rows="6"
            class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder-white/40"
            placeholder="Write the merged response…"
          />
        </label>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            :disabled="mergeModalSaving"
            @click="mergeModalOpen = false"
          >
            Cancel
          </button>
          <button
            class="px-3 py-2 rounded-md bg-white/20 border border-white/30 hover:bg-white/30 text-white disabled:opacity-50"
            :disabled="mergeModalSaving || mergeSelectedIds.length < 2 || !mergeModalText.trim()"
            @click="confirmMerge"
          >
            Merge
          </button>
        </div>
      </template>
    </Modal>

    <Modal
      v-model="mergeDetailOpen"
      panel-class="max-w-2xl"
    >
      <template #header>
        <div class="text-lg font-semibold">
          Merged responses
        </div>
      </template>

      <div v-if="mergeDetailCanonical" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm text-white/70">
            Canonical:
            <span class="ml-2 text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80">
              {{ answerTagMap[mergeDetailCanonical.id] || '' }}
            </span>
          </div>
          <div class="text-xs text-white/60">
            {{ mergedAnswersForDetail.length }} merged
          </div>
        </div>

        <div class="rounded-lg bg-white/5 border border-white/10 p-3">
          <div class="text-white font-semibold text-sm">
            Canonical text
          </div>
          <div class="mt-1 text-white/80 text-sm whitespace-pre-wrap">
            {{ mergeDetailCanonical.text }}
          </div>
        </div>

        <div class="rounded-lg bg-white/5 border border-white/10 p-3">
          <div class="text-white font-semibold text-sm">
            Merged from
          </div>
          <div v-if="mergedAnswersForDetail.length" class="mt-2 space-y-2">
            <div
              v-for="a in mergedAnswersForDetail"
              :key="a.id"
              class="text-sm text-white/80"
            >
              <span class="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 mr-2">
                {{ answerTagMap[a.id] || '' }}
              </span>
              <span class="text-white/70">
                {{ displayNameForUserId(a.authorUserId) }}
              </span>
              <div class="mt-1 text-white/80 whitespace-pre-wrap">
                {{ a.text }}
              </div>
            </div>
          </div>
          <div v-else class="mt-2 text-sm text-white/60">
            No merged responses found.
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <button
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            @click="mergeDetailOpen = false"
          >
            Close
          </button>
          <button
            v-if="mergeDetailCanonical"
            class="px-3 py-2 rounded-md bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 text-red-200"
            @click="confirmUnmerge"
          >
            Unmerge
          </button>
        </div>
      </template>
    </Modal>
  </section>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
  import BreadCrumbs from '../../components/BreadCrumbs.vue'
  import Modal from '../../components/Modal.vue'
  import { useAuthStore } from '../../stores/auth'
  import { useProjectStore } from '../../stores/project'
  import { useUiStore } from '../../stores/ui'
  import { useOprStore } from '../../stores/opr'
  import type { OprAnswer, OprItem, OprQuestion } from '../../stores/opr'
  import { confirm } from '../../utils/confirm'

const auth = useAuthStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const opr = useOprStore()

const projectId = computed(() => projectStore.currentProjectId)
const project = computed(() => projectStore.currentProject as any)
const addonEnabled = computed(() => Boolean(project.value?.addons?.oprWorkshop?.enabled))

const isAdmin = computed(() => {
  const role = String(auth.user?.role || '').toLowerCase()
  if (role === 'globaladmin' || role === 'superadmin') return true
  const team = Array.isArray(project.value?.team) ? project.value.team : []
  const uid = String(auth.user?._id || '')
  const email = String(auth.user?.email || '').toLowerCase()
  return team.some((m: any) => {
    const rid = String(m?._id || m?.id || '')
    const memail = String(m?.email || '').toLowerCase()
    const r = String(m?.role || '').toLowerCase()
    const match = (uid && rid && uid === rid) || (email && memail && email === memail)
    return match && (r === 'admin' || r === 'globaladmin')
  })
})

const active = computed(() => opr.active)
const selectedQuestionId = ref<string | null>(null)
const currentUserId = computed(() => String(auth.user?._id || auth.user?.id || ''))
const teamMemberNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  const team = Array.isArray(project.value?.team) ? project.value.team : []
  for (const m of team) {
    const id = String(m?._id || m?.id || '').trim()
    if (!id) continue
    const first = String(m?.firstName || '').trim()
    const last = String(m?.lastName || '').trim()
    const full = `${first} ${last}`.trim()
    const email = String(m?.email || '').trim()
    map[id] = full || email || id
  }
  return map
})

function isCurrentUserId(userId: string | null | undefined) {
  const a = String(userId || '').trim()
  const b = String(currentUserId.value || '').trim()
  return Boolean(a && b && a === b)
}

function displayNameForUserId(userId: string | null | undefined) {
  const id = String(userId || '').trim()
  if (!id) return 'Unknown'
  if (isCurrentUserId(id)) {
    const first = String(auth.user?.firstName || '').trim()
    const last = String(auth.user?.lastName || '').trim()
    const full = `${first} ${last}`.trim()
    const email = String(auth.user?.email || '').trim()
    return full || email || teamMemberNameById.value[id] || id
  }
  return teamMemberNameById.value[id] || id
}

const selectedQuestion = computed(() => {
  const qid = selectedQuestionId.value
  if (!qid) return active.value
  if (active.value?.id && active.value.id === qid) return active.value
  const list = Array.isArray(opr.questions) ? opr.questions : []
  return list.find((q) => q && q.id === qid) || active.value
})

const TAG_PREFIX = 'OPR-'
const questionTagMap = computed<Record<string, string>>(() => {
  const list = Array.isArray(opr.questions) ? opr.questions : []
  const map: Record<string, string> = {}
  list.forEach((q, idx) => {
    if (q && q.id) map[q.id] = `${TAG_PREFIX}${idx + 1}`
  })
  return map
})

const selectedQuestionTag = computed(() => {
  const qid = selectedQuestion.value?.id
  if (!qid) return null
  return questionTagMap.value[qid] || null
})

const answerTagMap = computed<Record<string, string>>(() => {
  const q = selectedQuestion.value
  const qid = q?.id
  const qTag = qid ? (questionTagMap.value[qid] || null) : null
  if (!qid || !qTag) return {}
  const list = Array.isArray(opr.answers) ? opr.answers : []
  const map: Record<string, string> = {}
  list.forEach((a, idx) => {
    const seq = a && Number.isFinite((a as any).seq) ? Number((a as any).seq) : null
    if (a && a.id) map[a.id] = `${qTag}-${seq && seq > 0 ? seq : (idx + 1)}`
  })
  return map
})

const allAnswers = computed<OprAnswer[]>(() => (Array.isArray(opr.answers) ? (opr.answers as OprAnswer[]) : []))
const visibleAnswers = computed<OprAnswer[]>(() => {
  const list = allAnswers.value
  if (!isAdmin.value) return list
  return list.filter((a: any) => !a?.mergedIntoAnswerId)
})

const voteableAnswers = computed(() => visibleAnswers.value)

const rightTab = ref<'responses' | 'register'>('responses')
const topN = 10
const registerCategoryId = ref<string>('')
const registerIncludeArchived = ref(false)
const registerSearch = ref('')

function ensureRegisterCategory() {
  if (registerCategoryId.value) return
  const fromSelected = String(selectedQuestion.value?.categoryId || '').trim()
  const fromCategories = String((Array.isArray(opr.categories) ? opr.categories[0]?.id : '') || '').trim()
  registerCategoryId.value = fromSelected || fromCategories || ''
}

const filteredOprItems = computed<OprItem[]>(() => {
  const q = registerSearch.value.trim().toLowerCase()
  const list = Array.isArray(opr.items) ? (opr.items as any as OprItem[]) : []
  const filtered = q ? list.filter((i) => String(i.text || '').toLowerCase().includes(q)) : list
  return filtered.slice().sort((a, b) => {
    const ar = Number(a.rank || 0)
    const br = Number(b.rank || 0)
    if (ar !== br) return ar - br
    return String(a.id).localeCompare(String(b.id))
  })
})

async function refreshItems() {
  if (!projectId.value || !addonEnabled.value) {
    opr.items = []
    return
  }
  ensureRegisterCategory()
  if (!registerCategoryId.value) {
    opr.items = []
    return
  }
  try {
    await opr.fetchItems(projectId.value, {
      categoryId: registerCategoryId.value,
      includeArchived: Boolean(isAdmin.value && registerIncludeArchived.value),
    })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to load OPR items'
    ui.showError(msg, { duration: 6000 })
  }
}

function sourceAnswerBadge(item: OprItem) {
  const answerId = String(item.sourceAnswerId || '').trim()
  const qid = String(item.questionId || '').trim()
  if (!answerId || !qid) return null
  if (selectedQuestion.value?.id !== qid) return null
  const tag = answerTagMap.value[answerId]
  return tag ? `Answer ${tag}` : null
}

async function jumpToItemSource(item: OprItem) {
  const qid = String(item.questionId || '').trim()
  if (!qid) return
  rightTab.value = 'responses'
  selectedQuestionId.value = qid
  await nextTick()
  await loadSelectedQuestionData({ silent: true })
}

const canMergeAnswers = computed(() => {
  const q = selectedQuestion.value
  return Boolean(isAdmin.value && q?.id && q.status === 'closed')
})

const mergeMode = ref(false)
const mergeSelectedIds = ref<string[]>([])
const mergeModalOpen = ref(false)
const mergeModalSaving = ref(false)
const mergeModalText = ref('')
const mergeDetailOpen = ref(false)
const mergeDetailCanonicalId = ref<string | null>(null)

function isMergeSelected(id: string) {
  return mergeSelectedIds.value.includes(id)
}

function toggleMergeSelected(id: string) {
  const list = mergeSelectedIds.value.slice()
  const idx = list.indexOf(id)
  if (idx >= 0) list.splice(idx, 1)
  else list.push(id)
  mergeSelectedIds.value = list
}

function exitMergeMode() {
  mergeMode.value = false
  mergeSelectedIds.value = []
}

function toggleMergeMode() {
  if (!mergeMode.value) {
    mergeMode.value = true
    mergeSelectedIds.value = []
    return
  }
  exitMergeMode()
}

const mergeSelectedAnswers = computed<OprAnswer[]>(() => {
  const ids = new Set(mergeSelectedIds.value)
  const selected = visibleAnswers.value.filter((a) => ids.has(String(a.id)))
  return selected.sort((a: any, b: any) => {
    const as = Number.isFinite(a?.seq) ? Number(a.seq) : Number.MAX_SAFE_INTEGER
    const bs = Number.isFinite(b?.seq) ? Number(b.seq) : Number.MAX_SAFE_INTEGER
    if (as !== bs) return as - bs
    return String(a.id).localeCompare(String(b.id))
  })
})

const mergeCanonical = computed<OprAnswer | null>(() => mergeSelectedAnswers.value[0] || null)
const mergeCanonicalTag = computed(() => {
  const a = mergeCanonical.value
  if (!a) return null
  return answerTagMap.value[a.id] || null
})

function openMergeModal() {
  mergeModalText.value = mergeSelectedAnswers.value.map((a) => a.text).filter(Boolean).join('\n\n')
  mergeModalOpen.value = true
}

async function confirmMerge() {
  if (!projectId.value || !selectedQuestion.value?.id) return
  try {
    mergeModalSaving.value = true
    await opr.mergeAnswers(projectId.value, selectedQuestion.value.id, {
      answerIds: mergeSelectedIds.value.slice(),
      mergedText: mergeModalText.value,
    })
    mergeModalOpen.value = false
    ui.showSuccess('Responses merged', { duration: 2500 })
    exitMergeMode()
    await loadSelectedQuestionData({ silent: true })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to merge responses'
    ui.showError(msg, { duration: 6000 })
  } finally {
    mergeModalSaving.value = false
  }
}

function mergedCountFor(a: any) {
  return Array.isArray(a?.mergedFromAnswerIds) ? a.mergedFromAnswerIds.length : 0
}

const mergeDetailCanonical = computed<OprAnswer | null>(() => {
  const id = mergeDetailCanonicalId.value
  if (!id) return null
  return allAnswers.value.find((a) => String(a.id) === String(id)) || null
})

const mergedAnswersForDetail = computed<OprAnswer[]>(() => {
  const canonical: any = mergeDetailCanonical.value
  if (!canonical) return []
  const ids = Array.isArray(canonical.mergedFromAnswerIds) ? canonical.mergedFromAnswerIds.map((x: any) => String(x)) : []
  const set = new Set(ids)
  const list = allAnswers.value.filter((a) => set.has(String(a.id)))
  return list.sort((a: any, b: any) => {
    const as = Number.isFinite(a?.seq) ? Number(a.seq) : Number.MAX_SAFE_INTEGER
    const bs = Number.isFinite(b?.seq) ? Number(b.seq) : Number.MAX_SAFE_INTEGER
    if (as !== bs) return as - bs
    return String(a.id).localeCompare(String(b.id))
  })
})

function openMergeDetail(canonicalId: string) {
  mergeDetailCanonicalId.value = canonicalId
  mergeDetailOpen.value = true
}

async function confirmUnmerge() {
  if (!projectId.value || !selectedQuestion.value?.id || !mergeDetailCanonicalId.value) return
  try {
    const ok = await confirm({
      title: 'Unmerge responses?',
      message: 'This will restore the original response text and bring back the merged responses. This cannot be done after voting has started.',
      confirmText: 'Unmerge',
      variant: 'danger',
    })
    if (!ok) return
    await opr.unmergeAnswer(projectId.value, selectedQuestion.value.id, mergeDetailCanonicalId.value)
    mergeDetailOpen.value = false
    mergeDetailCanonicalId.value = null
    ui.showSuccess('Responses unmerged', { duration: 2500 })
    await loadSelectedQuestionData({ silent: true })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to unmerge responses'
    ui.showError(msg, { duration: 6000 })
  }
}

const draft = reactive({
  categoryId: '',
  prompt: '',
  durationMinutes: 10,
})

const canStart = computed(() => addonEnabled.value && draft.categoryId && draft.prompt.trim().length > 5)

const answerText = ref('')
const submittingAnswer = ref(false)
const submittingVote = ref(false)

const voteByRank = reactive<Record<number, string>>({ 1: '', 2: '', 3: '', 4: '', 5: '' })

const questionModalOpen = ref(false)
const questionModalSaving = ref(false)
const questionModalQuestionId = ref<string | null>(null)
const questionModalPrompt = ref('')
const questionModalCategoryId = ref('')
const questionModalDurationMinutes = ref(10)

const createQuestionOpen = ref(false)
const createQuestionSaving = ref(false)
const createQuestionPrompt = ref('')
const createQuestionCategoryId = ref('')
const createQuestionDurationMinutes = ref(10)

const canSubmitVote = computed(() => {
  const vals = [1, 2, 3, 4, 5].map((r) => voteByRank[r]).filter(Boolean)
  if (vals.length !== 5) return false
  return new Set(vals).size === 5
})

function isAnswerChosenElsewhere(answerId: string, currentRank: number) {
  for (const r of [1, 2, 3, 4, 5]) {
    if (r === currentRank) continue
    if (voteByRank[r] === answerId) return true
  }
  return false
}

function truncate(text: string, n: number) {
  const s = String(text || '')
  if (s.length <= n) return s
  return `${s.slice(0, n - 1)}…`
}

function coerceMinutes(value: any, fallback = 10) {
  const n = Number.parseInt(String(value), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(240, n))
}

function statusLabel(status: string) {
  switch (status) {
    case 'open': return 'Open (Answering)'
    case 'closed': return 'Closed (Review)'
    case 'voting': return 'Voting'
    case 'finalized': return 'Finalized'
    default: return 'Draft'
  }
}

const clockTick = ref(0)

const countdownLabel = computed(() => {
  // Depend on a local tick so countdown updates without polling.
  void clockTick.value
  const q = selectedQuestion.value
  if (!q) return ''
  const endIso = q.status === 'open' ? q.closesAt : (q.status === 'voting' ? q.votingClosesAt : null)
  if (!endIso) return '—'
  const end = new Date(String(endIso)).getTime()
  const now = Date.now()
  const ms = Math.max(0, end - now)
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}:${String(secs).padStart(2, '0')}`
})

function normalizeSelectionAfterRefresh() {
  const list = Array.isArray(opr.questions) ? opr.questions : []
  const qid = selectedQuestionId.value
  if (qid) {
    if (active.value?.id && active.value.id === qid) return
    const exists = list.some((q) => q && q.id === qid)
    if (!exists) selectedQuestionId.value = null
    return
  }

  if (!active.value && list.length) {
    selectedQuestionId.value = list[list.length - 1].id
  }
}

async function loadSelectedQuestionData(opts?: { silent?: boolean }) {
  const silent = Boolean(opts?.silent)
  if (!projectId.value) {
    opr.answers = []
    opr.results = []
    return
  }

  const q = selectedQuestion.value
  if (!q?.id) {
    opr.answers = []
    opr.results = []
    return
  }

  try {
    await opr.fetchAnswers(projectId.value, q.id, { includeMerged: isAdmin.value })
    if (q.status === 'finalized') {
      await opr.fetchResults(projectId.value, q.id)
    } else {
      opr.results = []
    }
  } catch (e: any) {
    if (silent) return
    const msg = e?.response?.data?.error || e?.message || 'Failed to load responses'
    ui.showError(msg, { duration: 5000 })
  }
}

async function refresh() {
  if (!projectId.value) return
  try {
    // Ensure current project (and its add-ons) are hydrated; the OPR add-on gate relies on it.
    if (!project.value || String(project.value?.id || project.value?._id || '') !== String(projectId.value)) {
      try { await projectStore.fetchProject(projectId.value) } catch (_) { /* ignore */ }
    }

    // If add-on isn't enabled, don't call OPR endpoints (they return 402).
    if (!addonEnabled.value) {
      opr.categories = []
      opr.questions = []
      opr.active = null
      opr.answers = []
      opr.results = []
      return
    }

    await opr.refreshSession(projectId.value)
    normalizeSelectionAfterRefresh()
    await loadSelectedQuestionData({ silent: true })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to refresh OPR session'
    ui.showError(msg, { duration: 5000 })
  }
}

async function refreshProject() {
  if (!projectId.value) return
  try {
    if (!addonEnabled.value) {
      try {
        await opr.reconcileOprPurchase(projectId.value)
      } catch (e: any) {
        const code = e?.response?.data?.code
        const msg = e?.response?.data?.error || e?.message
        if (code === 'OPR_ADDON_NOT_FOUND') {
          ui.showError('No OPR add-on purchase found for this project yet.', { duration: 5000 })
        } else if (msg) {
          ui.showError(msg, { duration: 5000 })
        }
      }
    }
    await projectStore.fetchProject(projectId.value)
    await refresh()
  } catch (e: any) {
    ui.showError('Failed to refresh project', { duration: 4000 })
  }
}

async function startQuestion() {
  if (!projectId.value) return
  try {
    const answerWindowMinutes = coerceMinutes(draft.durationMinutes, 10)
    const created = await opr.createQuestion(projectId.value, {
      categoryId: draft.categoryId,
      prompt: draft.prompt,
      answerWindowMinutes,
    })
    await opr.openQuestion(projectId.value, created.id, answerWindowMinutes)
    draft.prompt = ''
    answerText.value = ''
    for (const r of [1, 2, 3, 4, 5]) voteByRank[r] = ''
    await refresh()
    selectedQuestionId.value = opr.active?.id || created.id
    await loadSelectedQuestionData({ silent: true })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to start question'
    ui.showError(msg, { duration: 6000 })
  }
}

async function submitAnswer() {
  if (!projectId.value || !selectedQuestion.value?.id) return
  try {
    submittingAnswer.value = true
    await opr.submitAnswer(projectId.value, selectedQuestion.value.id, answerText.value)
    answerText.value = ''
    await loadSelectedQuestionData({ silent: true })
    ui.showSuccess('Answer submitted', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to submit answer'
    ui.showError(msg, { duration: 6000 })
  } finally {
    submittingAnswer.value = false
  }
}

async function refreshAnswersAndResults() {
  await loadSelectedQuestionData()
}

async function submitVote() {
  if (!projectId.value || !selectedQuestion.value?.id) return
  try {
    submittingVote.value = true
    const rankings = [1, 2, 3, 4, 5].map((r) => ({ rank: r, answerId: voteByRank[r] }))
    await opr.submitVote(projectId.value, selectedQuestion.value.id, rankings)
    ui.showSuccess('Vote submitted', { duration: 2500 })
    await loadSelectedQuestionData({ silent: true })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to submit vote'
    ui.showError(msg, { duration: 6000 })
  } finally {
    submittingVote.value = false
  }
}

function openEditQuestion(q: OprQuestion) {
  questionModalQuestionId.value = q.id
  questionModalPrompt.value = q.prompt || ''
  questionModalCategoryId.value = String(q.categoryId || '')
  questionModalDurationMinutes.value = typeof q.answerWindowMinutes === 'number' ? q.answerWindowMinutes : 10
  questionModalOpen.value = true
}

async function saveQuestionModal() {
  if (!projectId.value || !questionModalQuestionId.value) return
  try {
    questionModalSaving.value = true
    const answerWindowMinutes = coerceMinutes(questionModalDurationMinutes.value, 10)
    await opr.updateQuestion(projectId.value, questionModalQuestionId.value, {
      prompt: questionModalPrompt.value,
      categoryId: questionModalCategoryId.value,
      answerWindowMinutes,
    })
    questionModalOpen.value = false
    await refresh()
    selectedQuestionId.value = questionModalQuestionId.value
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to update question'
    ui.showError(msg, { duration: 6000 })
  } finally {
    questionModalSaving.value = false
  }
}

async function deleteQuestionCard(q: OprQuestion) {
  if (!projectId.value) return
  try {
    const ok = await confirm({
      title: 'Delete question?',
      message: 'This will delete the question and all responses and votes. This cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    await opr.deleteQuestion(projectId.value, q.id)
    if (selectedQuestionId.value === q.id) selectedQuestionId.value = null
    await refresh()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to delete question'
    ui.showError(msg, { duration: 6000 })
  }
}

function openCreateQuestion() {
  createQuestionPrompt.value = ''
  createQuestionCategoryId.value = createQuestionCategoryId.value || String(opr.categories?.[0]?.id || '')
  createQuestionDurationMinutes.value = 10
  createQuestionOpen.value = true
}

async function saveCreateQuestion() {
  if (!projectId.value) return
  try {
    createQuestionSaving.value = true
    const answerWindowMinutes = coerceMinutes(createQuestionDurationMinutes.value, 10)
    const created = await opr.createQuestion(projectId.value, {
      categoryId: createQuestionCategoryId.value,
      prompt: createQuestionPrompt.value,
      answerWindowMinutes,
    })
    createQuestionOpen.value = false
    await refresh()
    selectedQuestionId.value = created.id
    ui.showSuccess('Question created', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to create question'
    ui.showError(msg, { duration: 6000 })
  } finally {
    createQuestionSaving.value = false
  }
}

async function adminOpenForResponses(q: OprQuestion) {
  if (!projectId.value) return
  try {
    const minutes = typeof q.answerWindowMinutes === 'number' ? q.answerWindowMinutes : 10
    await opr.openQuestion(projectId.value, q.id, minutes)
    await refresh()
    selectedQuestionId.value = q.id
    ui.showSuccess('Question opened for responses', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to open question'
    ui.showError(msg, { duration: 6000 })
  }
}

async function adminCloseResponses(q: OprQuestion) {
  if (!projectId.value) return
  try {
    await opr.closeQuestion(projectId.value, q.id)
    await refresh()
    selectedQuestionId.value = q.id
    ui.showSuccess('Responses closed', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to close responses'
    ui.showError(msg, { duration: 6000 })
  }
}

async function adminOpenVotingFor(q: OprQuestion) {
  if (!projectId.value) return
  try {
    await opr.openVoting(projectId.value, q.id, 10)
    await refresh()
    selectedQuestionId.value = q.id
    ui.showSuccess('Voting opened', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to open voting'
    ui.showError(msg, { duration: 6000 })
  }
}

async function adminCloseVotingFor(q: OprQuestion) {
  if (!projectId.value) return
  try {
    await opr.closeVoting(projectId.value, q.id)
    await refresh()
    selectedQuestionId.value = q.id
    await loadSelectedQuestionData({ silent: true })
    ui.showSuccess('Voting closed', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to close voting'
    ui.showError(msg, { duration: 6000 })
  }
}

async function purchaseAddon() {
  if (!projectId.value) return
  try {
    const { url } = await opr.startOprCheckout(projectId.value)
    if (url) window.location.href = url
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to start checkout'
    ui.showError(msg, { duration: 6000 })
  }
}

let heartbeatTimer: any = null
let pollTimer: any = null
let tickTimer: any = null

async function onActiveChanged() {
  if (!projectId.value) return
  if (!active.value) return
  try {
    await opr.join(projectId.value, active.value.id)
  } catch (_) {
    // ignore initial join failures; backend will enforce voting eligibility later
  }
}

function clearTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  if (pollTimer) clearInterval(pollTimer)
  if (tickTimer) clearInterval(tickTimer)
  heartbeatTimer = null
  pollTimer = null
  tickTimer = null
}

watch(projectId, async (pid) => {
  clearTimers()
  opr.answers = []
  opr.results = []
  opr.items = []
  if (!pid) return
  await projectStore.fetchProject(pid)
  await refresh()

  heartbeatTimer = setInterval(async () => {
    try {
      const q = active.value
      if (!q || !projectId.value) return
      await opr.heartbeat(projectId.value, q.id)
    } catch (_) {
      // ignore
    }
  }, 20_000)

  pollTimer = setInterval(async () => {
    try {
      if (!projectId.value) return
      await opr.fetchActive(projectId.value)
      await loadSelectedQuestionData({ silent: true })
    } catch (_) {
      // ignore
    }
  }, 5_000)

  tickTimer = setInterval(() => {
    clockTick.value += 1
  }, 1_000)
}, { immediate: true })

watch(() => active.value?.id, async () => {
  await onActiveChanged()
})

watch(() => selectedQuestion.value?.id, async () => {
  exitMergeMode()
  mergeModalOpen.value = false
  mergeDetailOpen.value = false
  mergeDetailCanonicalId.value = null
  await loadSelectedQuestionData({ silent: true })
})

watch(rightTab, async (tab) => {
  if (tab === 'responses') return
  exitMergeMode()
  mergeModalOpen.value = false
  mergeDetailOpen.value = false
  mergeDetailCanonicalId.value = null
  ensureRegisterCategory()
  await refreshItems()
})

watch([registerCategoryId, registerIncludeArchived], async () => {
  if (rightTab.value !== 'register') return
  await refreshItems()
})

onMounted(async () => {
  await refresh()
})

onBeforeUnmount(() => {
  clearTimers()
})
</script>
