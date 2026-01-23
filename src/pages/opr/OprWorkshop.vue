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
      class="flex flex-col gap-4 h-[calc(100vh-14rem)] min-h-0"
    >
      <!-- Tabs -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm"
            :class="mainTab === 'info' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'"
            @click="tryGoTab('info')"
          >
            Info
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            :class="mainTab === 'qa' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'"
            :disabled="!canEnterQa"
            :title="canEnterQa ? 'Questions & Answers' : 'Check in and wait for admin approval to enter Q&A'"
            @click="tryGoTab('qa')"
          >
            Q&amp;A
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            :class="mainTab === 'results' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'"
            :disabled="!canEnterResults"
            :title="canEnterResults ? 'Results' : 'Check in and wait for admin approval to view Results'"
            @click="tryGoTab('results')"
          >
            Results
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            :class="mainTab === 'import' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'"
            :disabled="!canEnterImport"
            :title="canEnterImport ? 'Import OPR items' : 'Admin only'"
            @click="tryGoTab('import')"
          >
            Import
          </button>
          <span
            v-if="!isAdmin && attendeeStatusLabel"
            class="ml-2 text-xs px-2 py-0.5 rounded-full border"
            :class="attendeeStatusClass"
          >{{ attendeeStatusLabel }}</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="isAdmin && addonEnabled"
            type="button"
            class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35 text-sm disabled:opacity-50"
            :disabled="generatingWorkshopReport"
            @click="openWorkshopReportSettings"
          >
            Print/PDF
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm disabled:opacity-50"
            :disabled="opr.loading || workshopLoading || attendeesLoading || resultsLoading"
            @click="refreshAll"
          >
            Refresh
          </button>
        </div>
      </div>

      <!-- Info Tab -->
      <div
        v-if="mainTab === 'info'"
        class="grid grid-cols-12 gap-4 flex-1 min-h-0"
      >
        <div class="col-span-12 lg:col-span-6 h-full min-h-0">
          <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
            <div class="flex items-center justify-between gap-3">
              <div class="text-white font-semibold">
                Workshop info
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="isAdmin && addonEnabled"
                  type="button"
                  class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/25 text-emerald-100 text-sm disabled:opacity-50"
                  :disabled="workshopSaving"
                  @click="saveWorkshopInfo"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm disabled:opacity-50"
                  :disabled="workshopLoading"
                  @click="refreshWorkshopOnly"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div
              v-if="!addonEnabled"
              class="mt-3 rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
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
              v-else
              class="mt-3 space-y-3 overflow-auto pr-1 min-h-0 flex-1"
            >
              <div class="grid grid-cols-12 gap-3">
                <label class="col-span-12 md:col-span-7 space-y-1">
                  <div class="text-white/70 text-sm">Name</div>
                  <input
                    v-model="workshopDraft.name"
                    type="text"
                    class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white disabled:opacity-60"
                    :disabled="!isAdmin"
                    placeholder="OPR Workshop"
                  >
                </label>
                <label class="col-span-12 md:col-span-5 space-y-1">
                  <div class="text-white/70 text-sm">Date</div>
                  <input
                    v-model="workshopDraft.date"
                    type="date"
                    class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white disabled:opacity-60"
                    :disabled="!isAdmin"
                  >
                </label>
                <label class="col-span-12 space-y-1">
                  <div class="text-white/70 text-sm">Location</div>
                  <input
                    v-model="workshopDraft.location"
                    type="text"
                    class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white disabled:opacity-60"
                    :disabled="!isAdmin"
                    placeholder="e.g. Site trailer"
                  >
                </label>
                <label class="col-span-12 md:col-span-6 space-y-1">
                  <div class="text-white/70 text-sm">Start time</div>
                  <input
                    v-model="workshopDraft.startTime"
                    type="time"
                    class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white disabled:opacity-60"
                    :disabled="!isAdmin"
                  >
                </label>
                <label class="col-span-12 md:col-span-6 space-y-1">
                  <div class="text-white/70 text-sm">End time</div>
                  <input
                    v-model="workshopDraft.endTime"
                    type="time"
                    class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white disabled:opacity-60"
                    :disabled="!isAdmin"
                  >
                </label>
                <label class="col-span-12 space-y-1">
                  <div class="text-white/70 text-sm">Description</div>
                  <textarea
                    v-model="workshopDraft.description"
                    rows="4"
                    class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white disabled:opacity-60"
                    :disabled="!isAdmin"
                    placeholder="Purpose, agenda, notes…"
                  />
                </label>
              </div>

              <div>
                <div class="flex items-center gap-3">
                  <div class="text-sm text-white/70 shrink-0">
                    Tags
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="t in workshopDraft.tags"
                      :key="t"
                      class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white/80"
                    >
                      <span>{{ t }}</span>
                      <button
                        v-if="isAdmin"
                        type="button"
                        class="text-white/60 hover:text-white"
                        aria-label="Remove tag"
                        @click="removeWorkshopTag(t)"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </div>
                <div
                  v-if="isAdmin"
                  class="flex items-center gap-2 mt-2"
                >
                  <input
                    v-model="workshopTagsInput"
                    type="text"
                    placeholder="Add a tag and press Enter…"
                    class="w-full px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400"
                    @keydown.enter.prevent="addWorkshopTagsFromInput"
                    @keydown.,.prevent="addWorkshopTagsFromInput"
                  >
                  <button
                    type="button"
                    class="h-10 px-3 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-sm text-white/80"
                    @click="addWorkshopTagsFromInput"
                  >
                    Add
                  </button>
                </div>
                <div
                  v-if="isAdmin"
                  class="text-xs text-white/60 mt-1"
                >
                  Tip: use commas or Enter to add multiple tags.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-span-12 lg:col-span-6 h-full min-h-0">
          <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
            <div class="flex items-center justify-between gap-3">
              <div class="text-white font-semibold">
                Participants
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="addonEnabled"
                  class="text-[11px] px-2 py-0.5 rounded-full border"
                  :class="workshopStarted ? 'bg-emerald-500/15 border-emerald-400/25 text-emerald-200' : 'bg-white/10 border-white/20 text-white/80'"
                >
                  {{ workshopStarted ? 'Session live' : 'Session not started' }}
                </span>
                <button
                  v-if="isAdmin && addonEnabled && !workshopStarted"
                  type="button"
                  class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/25 text-emerald-100 text-sm disabled:opacity-50"
                  :disabled="startingWorkshop || workshopLoading"
                  @click="startWorkshopSession"
                >
                  {{ startingWorkshop ? 'Starting…' : 'Start session' }}
                </button>
                <button
                  v-if="isAdmin && addonEnabled && workshopStarted"
                  type="button"
                  class="px-3 py-2 rounded-md bg-red-500/15 border border-red-500/25 hover:bg-red-500/20 text-red-200 text-sm disabled:opacity-50"
                  :disabled="endingWorkshop || workshopLoading"
                  @click="endWorkshopSession"
                >
                  {{ endingWorkshop ? 'Ending…' : 'End session' }}
                </button>
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm disabled:opacity-50"
                  :disabled="attendeesLoading || workshopLoading"
                  @click="refreshAttendees"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div
              v-if="addonEnabled"
              class="mt-3 space-y-3 overflow-auto pr-1 min-h-0 flex-1"
            >
              <div
                v-if="!isAdmin"
                class="rounded-xl bg-white/5 border border-white/10 p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-white font-semibold">
                      Check-in
                    </div>
                    <div class="text-sm text-white/70 mt-1">
                      <template v-if="!workshopStarted">
                        Check-in is not available yet. Please wait for the CxA/Admin to start the session.
                      </template>
                      <template v-else>
                        Check in to join this workshop. A CxA/Admin must admit you before you can access Q&amp;A and Results.
                      </template>
                    </div>
                    <div
                      v-if="attendeeStatusLabel"
                      class="mt-2 text-xs"
                    >
                      Status:
                      <span class="px-2 py-0.5 rounded-full border ml-1" :class="attendeeStatusClass">{{ attendeeStatusLabel }}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/25 text-emerald-100 text-sm disabled:opacity-50"
                    :disabled="checkingIn || !workshopStarted || attendeeStatus === 'approved'"
                    @click="checkInToWorkshop"
                  >
                    {{ !workshopStarted ? 'Not started' : attendeeStatus === 'approved' ? 'Admitted' : checkingIn ? 'Checking in…' : 'Check in' }}
                  </button>
                </div>
                <div
                  v-if="profileIncompleteMessage"
                  class="text-xs text-amber-200 mt-2"
                >
                  {{ profileIncompleteMessage }}
                </div>
              </div>

              <div
                v-if="attendeeRows.length === 0"
                class="text-white/70 text-sm"
              >
                No participants yet.
              </div>
              <div
                v-else
                class="rounded-xl border border-white/10 overflow-hidden"
              >
                <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-white/5 text-xs text-white/70">
                  <div class="col-span-4">
                    Name
                  </div>
                  <div class="col-span-4">
                    Email
                  </div>
                  <div class="col-span-2">
                    Company
                  </div>
                  <div class="col-span-1">
                    Role
                  </div>
                  <div class="col-span-1 text-right">
                    Status
                  </div>
                </div>
                <div
                  v-for="p in attendeeRows"
                  :key="p.id"
                  class="grid grid-cols-12 gap-2 px-3 py-2 border-t border-white/10 text-sm items-center"
                >
                  <div class="col-span-4 truncate text-white/85">
                    {{ p.snapshot?.name || '—' }}
                  </div>
                  <div class="col-span-4 truncate text-white/70">
                    {{ p.snapshot?.email || '—' }}
                  </div>
                  <div class="col-span-2 truncate text-white/70">
                    {{ p.snapshot?.company || '—' }}
                  </div>
                  <div class="col-span-1 truncate text-white/70">
                    {{ p.snapshot?.role || '—' }}
                  </div>
                  <div class="col-span-1 flex items-center justify-end gap-2">
                    <span class="text-[11px] px-2 py-0.5 rounded-full border" :class="attendeeStatusPillClass(p.status)">{{ p.status }}</span>
                    <template v-if="isAdmin && p.userId">
                      <button
                        v-if="p.status !== 'approved'"
                        type="button"
                        class="text-[11px] px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-400/25 text-emerald-100 hover:bg-emerald-500/20"
                        @click="approveParticipant(p.userId)"
                      >
                        Admit
                      </button>
                      <button
                        v-if="p.status !== 'denied'"
                        type="button"
                        class="text-[11px] px-2 py-1 rounded-md bg-red-500/15 border border-red-500/25 text-red-200 hover:bg-red-500/20"
                        @click="denyParticipant(p.userId)"
                      >
                        Deny
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="mt-3 rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
            >
              Enable the OPR Workshop add-on to use participants and check-in.
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="mainTab === 'qa'"
        class="grid grid-cols-12 gap-4 flex-1 min-h-0"
      >
        <!-- Q&A Tab -->
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
                      <option :value="ALL_CATEGORIES">
                        All Categories
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
                  v-if="filteredOprItems.length === 0"
                  class="text-white/70 text-sm"
                >
                  <template v-if="registerCategoryId === ALL_CATEGORIES">
                    No OPR items yet. Close voting on questions to publish the top {{ topN }} items per category.
                  </template>
                  <template v-else>
                    No OPR items yet for this category. Close voting on a question to publish the top {{ topN }} items.
                  </template>
                </div>

                <div
                  v-else
                  class="space-y-2"
                >
                  <div
                    v-for="item in filteredOprItems"
                    :key="item.id"
                    :id="oprItemDomId(item.id)"
                    class="rounded-lg bg-white/5 border border-white/10 p-3"
                    :class="deepLinkItemId && item.id === deepLinkItemId ? 'ring-2 ring-indigo-400/40 border-indigo-400/30 bg-indigo-500/10' : ''"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 shrink-0">
                          #{{ item.rank }}
                        </span>
                        <span
                          v-if="registerCategoryId === ALL_CATEGORIES"
                          class="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80 shrink-0"
                          :title="String(categoryNameById[item.categoryId || ''] || 'Category')"
                        >
                          {{ categoryNameById[item.categoryId || ''] || 'Category' }}
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
	      <div
	        v-else-if="mainTab === 'results' || mainTab === 'import'"
	        class="flex-1 min-h-0"
	      >
        <!-- Results Tab -->
        <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
          <div class="flex items-center justify-between gap-3">
            <div class="text-white font-semibold">
              {{ mainTab === 'import' ? 'Import OPR items' : 'Results' }}
            </div>
            <div
              v-if="mainTab === 'results'"
              class="flex items-center gap-2"
            >
              <input
                v-model="resultsSearch"
                type="text"
                placeholder="Search results…"
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 placeholder-gray-400 w-64"
              >
              <button
                type="button"
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm disabled:opacity-50"
                :disabled="resultsLoading"
                @click="refreshResults"
              >
                Refresh
              </button>
	        </div>
	      </div>

      <div
        v-if="mainTab === 'import'"
        class="grid grid-cols-12 gap-4 flex-1 min-h-0"
      >
        <div class="col-span-12 lg:col-span-6 h-full min-h-0">
          <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
            <div class="flex items-center justify-between gap-3">
              <div class="text-white font-semibold">
                Add items (manual)
              </div>
              <button
                type="button"
                class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm disabled:opacity-50"
                :disabled="importSubmitting"
                @click="resetImportDraft"
              >
                Reset
              </button>
            </div>

            <div class="mt-3 space-y-3 overflow-auto pr-1 min-h-0 flex-1">
              <div
                v-if="!isAdmin"
                class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
              >
                Only the CxA/Admin can import OPR items.
              </div>
              <div
                v-else-if="!addonEnabled"
                class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
              >
                Enable the OPR Workshop add-on to import items.
              </div>
              <template v-else>
                <label class="block">
                  <div class="text-white/70 text-sm mb-1">Category</div>
                  <select
                    v-model="importDefaultCategoryId"
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
                  <div class="text-white/70 text-sm mb-1">Items (one per line)</div>
                  <textarea
                    v-model="importLines"
                    rows="10"
                    class="w-full rounded-md bg-black/20 border border-white/15 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="Enter one OPR item per line…"
                  />
                </label>

                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs text-white/60">
                    {{ manualLineCount }} items ready
                  </div>
                  <button
                    type="button"
                    class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/25 text-emerald-100 text-sm disabled:opacity-50"
                    :disabled="importSubmitting || !importDefaultCategoryId || manualLineCount === 0"
                    @click="submitManualImport"
                  >
                    {{ importSubmitting ? 'Saving…' : 'Add items' }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="col-span-12 lg:col-span-6 h-full min-h-0">
          <div class="rounded-2xl bg-white/8 border border-white/10 ring-1 ring-white/10 p-4 h-full flex flex-col min-h-0">
            <div class="flex items-center justify-between gap-3">
              <div class="text-white font-semibold">
                Upload (CSV/XLSX)
              </div>
              <div class="flex items-center gap-2">
                <label class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm cursor-pointer">
                  <input
                    type="file"
                    class="hidden"
                    accept=".csv,.xlsx,.xls"
                    :disabled="!isAdmin || importSubmitting"
                    @change="onImportFileSelected"
                  >
                  Choose file
                </label>
                <button
                  type="button"
                  class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm disabled:opacity-50"
                  :disabled="importSubmitting || importRows.length === 0"
                  @click="clearImportRows"
                >
                  Clear
                </button>
              </div>
            </div>

            <div class="mt-3 space-y-3 overflow-auto pr-1 min-h-0 flex-1">
              <div class="text-xs text-white/60">
                Expected columns: <span class="text-white/80">category</span>, <span class="text-white/80">text</span> (required). Optional: <span class="text-white/80">rank</span>, <span class="text-white/80">score</span>.
              </div>

              <div
                v-if="importRows.length === 0"
                class="rounded-xl bg-white/5 border border-white/10 p-4 text-white/70 text-sm"
              >
                Upload a CSV/XLSX file to preview and import OPR items.
              </div>

              <template v-else>
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs text-white/60">
                    {{ importRowsValidCount }} / {{ importRows.length }} valid
                  </div>
                  <button
                    type="button"
                    class="px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/25 text-emerald-100 text-sm disabled:opacity-50"
                    :disabled="importSubmitting || importRowsValidCount === 0"
                    @click="submitFileImport"
                  >
                    {{ importSubmitting ? 'Importing…' : `Import ${importRowsValidCount}` }}
                  </button>
                </div>

                <div class="rounded-xl border border-white/10 overflow-hidden">
                  <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-white/5 text-xs text-white/70">
                    <div class="col-span-4">Category</div>
                    <div class="col-span-6">Text</div>
                    <div class="col-span-1 text-right">Rank</div>
                    <div class="col-span-1 text-right">Score</div>
                  </div>
                  <div
                    v-for="(r, idx) in importRows"
                    :key="r._key"
                    class="grid grid-cols-12 gap-2 px-3 py-2 border-t border-white/10 text-sm items-start"
                    :class="rowError(r) ? 'bg-red-500/5' : ''"
                  >
                    <div class="col-span-4">
                      <select
                        v-model="importRows[idx].categoryId"
                        class="w-full rounded-md bg-black/20 border border-white/15 text-white px-2 py-1.5 text-sm"
                      >
                        <option value="">
                          Select…
                        </option>
                        <option
                          v-for="c in opr.categories"
                          :key="c.id"
                          :value="c.id"
                        >
                          {{ c.name }}
                        </option>
                      </select>
                      <div
                        v-if="rowError(r)"
                        class="text-[11px] text-red-200 mt-1"
                      >
                        {{ rowError(r) }}
                      </div>
                    </div>
                    <div class="col-span-6">
                      <textarea
                        v-model="importRows[idx].text"
                        rows="2"
                        class="w-full rounded-md bg-black/20 border border-white/15 text-white px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div class="col-span-1 text-right">
                      <input
                        v-model.number="importRows[idx].rank"
                        type="number"
                        min="1"
                        class="w-full rounded-md bg-black/20 border border-white/15 text-white px-2 py-1.5 text-sm text-right"
                      >
                    </div>
                    <div class="col-span-1 text-right">
                      <input
                        v-model.number="importRows[idx].score"
                        type="number"
                        class="w-full rounded-md bg-black/20 border border-white/15 text-white px-2 py-1.5 text-sm text-right"
                      >
                      <button
                        type="button"
                        class="mt-2 text-[11px] text-white/70 hover:text-white underline underline-offset-2"
                        @click="removeImportRow(idx)"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

          <template v-else>
          <div
            v-if="!addonEnabled"
            class="mt-3 rounded-xl bg-white/5 border border-white/10 p-4 text-white/80"
          >
            Enable the OPR Workshop add-on to view results.
          </div>

          <div
            v-else
            class="mt-3 overflow-auto pr-1 min-h-0 flex-1"
          >
            <div
              v-if="resultsLoading"
              class="text-white/70 text-sm"
            >
              Loading…
            </div>
            <div
              v-else-if="resultsRows.length === 0"
              class="text-white/70 text-sm"
            >
              No results yet. Finalize voting on questions to generate ranked results.
            </div>
            <div
              v-else
              class="rounded-xl border border-white/10 overflow-hidden"
            >
              <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-white/5 text-xs text-white/70">
                <div class="col-span-2">
                  Category
                </div>
                <div class="col-span-1">
                  Q
                </div>
                <div class="col-span-1 text-right">
                  Rank
                </div>
                <div class="col-span-1 text-right">
                  Score
                </div>
                <div class="col-span-1 text-right">
                  Votes
                </div>
                <div class="col-span-2">
                  Vote breakdown
                </div>
                <div class="col-span-4">
                  Response
                </div>
              </div>
              <div
                v-for="r in resultsRows"
                :key="r.questionId + ':' + r.answerId"
                class="grid grid-cols-12 gap-2 px-3 py-2 border-t border-white/10 text-sm items-start"
              >
                <div class="col-span-2 text-white/85">
                  {{ r.categoryName || '—' }}
                </div>
                <div class="col-span-1">
                  <span
                    v-if="questionTagMap[r.questionId]"
                    class="text-[11px] px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-white/80"
                    :title="r.questionPrompt"
                  >{{ questionTagMap[r.questionId] }}</span>
                  <span
                    v-else
                    class="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60"
                    :title="r.questionPrompt"
                  >Q</span>
                </div>
                <div class="col-span-1 text-right text-white/85">
                  {{ r.rank }}
                </div>
                <div class="col-span-1 text-right text-white/85">
                  {{ r.score }}
                </div>
                <div class="col-span-1 text-right text-white/85">
                  {{ r.voteCount }}
                </div>
                <div class="col-span-2 text-xs text-white/70 leading-5">
                  <div>#1: {{ r.rankCounts?.['1'] || 0 }} · #2: {{ r.rankCounts?.['2'] || 0 }}</div>
                  <div>#3: {{ r.rankCounts?.['3'] || 0 }} · #4: {{ r.rankCounts?.['4'] || 0 }} · #5: {{ r.rankCounts?.['5'] || 0 }}</div>
                </div>
                <div class="col-span-4 text-white/85 whitespace-pre-wrap">
                  {{ r.text }}
                </div>
              </div>
            </div>
          </div>
          </template>
        </div>
      </div>
    </div>
    <!-- OPR Workshop Report Settings Modal -->
    <Modal
      v-model="showWorkshopReportDialog"
      panel-class="max-w-3xl"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="text-lg">
            OPR Workshop Report Settings
          </div>
        </div>
      </template>

      <div class="space-y-4 text-sm">
        <div class="flex items-center gap-2 border-b border-white/10 pb-3">
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm"
            :class="workshopReportTab === 'general' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5'"
            @click="workshopReportTab = 'general'"
          >
            General Settings
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-md border text-sm"
            :class="workshopReportTab === 'cover' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5'"
            @click="workshopReportTab = 'cover'"
          >
            Cover Page
          </button>
        </div>

        <div
          v-if="workshopReportTab === 'general'"
          class="space-y-4"
        >
          <div class="grid grid-cols-2 gap-3">
            <label class="inline-flex items-center gap-2">
              <input
                v-model="workshopReport.include.coverPage"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Cover Page</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="workshopReport.include.toc"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Table of Contents</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="workshopReport.include.info"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Workshop Info</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="workshopReport.include.participants"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Participants</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="workshopReport.include.qa"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Q&amp;A (Questions + Responses + Votes)</span>
            </label>
            <label class="inline-flex items-center gap-2">
              <input
                v-model="workshopReport.include.results"
                type="checkbox"
                class="rounded"
              >
              <span class="text-gray-300">Comprehensive Results</span>
            </label>
          </div>
        </div>

        <div
          v-else
          class="space-y-4"
        >
          <label class="block">
            <div class="text-white/70 mb-1">Cover title</div>
            <input
              v-model="workshopReport.coverTitle"
              type="text"
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
              placeholder="OPR Workshop Report"
            >
          </label>
          <label class="block">
            <div class="text-white/70 mb-1">Cover subtitle</div>
            <input
              v-model="workshopReport.coverSubtitle"
              type="text"
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
              placeholder="Project name, workshop name, or date"
            >
          </label>
          <label class="block">
            <div class="text-white/70 mb-1">Cover by-line</div>
            <input
              v-model="workshopReport.coverByLine"
              type="text"
              class="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white"
              placeholder="Prepared by…"
            >
          </label>
          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                class="block text-sm text-white/70"
                @change="onWorkshopCoverImageSelected"
              >
            </label>
            <button
              v-if="workshopReport.coverJumbotronDataUrl"
              type="button"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 text-sm"
              @click="clearWorkshopCoverImage"
            >
              Clear image
            </button>
          </div>
          <div
            v-if="workshopReport.coverJumbotronDataUrl"
            class="rounded-xl border border-white/10 bg-black/10 p-2"
          >
            <img
              :src="workshopReport.coverJumbotronDataUrl"
              alt="Cover preview"
              class="w-full max-h-[240px] object-contain rounded-lg"
            >
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-2 w-full">
          <button
            type="button"
            class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
            :disabled="generatingWorkshopReport"
            @click="resetWorkshopReportSettings"
          >
            Reset
          </button>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white"
              :disabled="generatingWorkshopReport"
              @click="showWorkshopReportDialog = false"
            >
              Close
            </button>
            <button
              type="button"
              class="px-3 py-2 rounded-md bg-indigo-500/20 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-500/35 disabled:opacity-50"
              :disabled="generatingWorkshopReport"
              @click="generateWorkshopReportPdf"
            >
              {{ generatingWorkshopReport ? 'Generating…' : 'Generate PDF' }}
            </button>
          </div>
        </div>
      </template>
    </Modal>
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
  import axios from 'axios'
  import { useRoute } from 'vue-router'
  import * as XLSX from 'xlsx'
  import BreadCrumbs from '../../components/BreadCrumbs.vue'
  import Modal from '../../components/Modal.vue'
  import { useAuthStore } from '../../stores/auth'
  import { useProjectStore } from '../../stores/project'
  import { useUiStore } from '../../stores/ui'
  import { useOprStore } from '../../stores/opr'
  import type { OprAnswer, OprCategory, OprItem, OprQuestion, OprResult, OprResultsRow, OprWorkshopAttendee, OprWorkshopInfo } from '../../stores/opr'
  import { confirm } from '../../utils/confirm'
  import { getApiBase } from '../../utils/api'
  import { getAuthHeaders } from '../../utils/auth'

const auth = useAuthStore()
const projectStore = useProjectStore()
const ui = useUiStore()
const opr = useOprStore()
const route = useRoute()

const OPR_API_BASE = `${getApiBase()}/api/projects`

const projectId = computed(() => projectStore.currentProjectId)
const project = computed(() => projectStore.currentProject as any)
const addonEnabled = computed(() => Boolean(project.value?.addons?.oprWorkshop?.enabled))

const mainTab = ref<'info' | 'qa' | 'results' | 'import'>('info')

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

const workshopLoading = ref(false)
const workshopSaving = ref(false)
const attendeesLoading = ref(false)
const checkingIn = ref(false)
const resultsLoading = ref(false)
const resultsSearch = ref('')
const generatingWorkshopReport = ref(false)

// -----------------------------
// OPR Workshop Report Settings
// -----------------------------
const OPR_WORKSHOP_REPORT_SESSION_KEY = 'oprWorkshopReportSettings'
type WorkshopReportTab = 'general' | 'cover'
interface OprWorkshopReportSettings {
  include: {
    coverPage: boolean
    toc: boolean
    info: boolean
    participants: boolean
    qa: boolean
    results: boolean
  }
  coverTitle: string
  coverSubtitle: string
  coverByLine: string
  coverJumbotronDataUrl: string
}
const workshopReport = ref<OprWorkshopReportSettings>({
  include: { coverPage: true, toc: true, info: true, participants: true, qa: true, results: true },
  coverTitle: 'OPR Workshop Report',
  coverSubtitle: '',
  coverByLine: '',
  coverJumbotronDataUrl: '',
})
const showWorkshopReportDialog = ref(false)
const workshopReportTab = ref<WorkshopReportTab>('general')
async function openWorkshopReportSettings() {
  workshopReportTab.value = 'general'
  showWorkshopReportDialog.value = true
  try {
    if (projectId.value) await opr.fetchWorkshop(projectId.value)
  } catch (e) { /* ignore */ }
  if (!workshopReport.value.coverSubtitle) {
    const bits = [
      String(project.value?.name || '').trim(),
      String(opr.workshop?.name || '').trim(),
      opr.workshop?.date ? String(opr.workshop.date) : '',
    ].filter(Boolean)
    workshopReport.value.coverSubtitle = bits.join(' — ')
  }
  if (!workshopReport.value.coverByLine) {
    const first = String(auth.user?.firstName || '').trim()
    const last = String(auth.user?.lastName || '').trim()
    const full = `${first} ${last}`.trim()
    workshopReport.value.coverByLine = full ? `Prepared by ${full}` : ''
  }
}
function resetWorkshopReportSettings() {
  workshopReport.value = {
    include: { coverPage: true, toc: true, info: true, participants: true, qa: true, results: true },
    coverTitle: 'OPR Workshop Report',
    coverSubtitle: '',
    coverByLine: '',
    coverJumbotronDataUrl: '',
  }
}
function loadWorkshopReportSettingsFromSession() {
  try {
    const raw = sessionStorage.getItem(OPR_WORKSHOP_REPORT_SESSION_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      workshopReport.value = {
        include: { ...workshopReport.value.include, ...(parsed.include || {}) },
        coverTitle: typeof parsed.coverTitle === 'string' ? parsed.coverTitle : workshopReport.value.coverTitle,
        coverSubtitle: typeof parsed.coverSubtitle === 'string' ? parsed.coverSubtitle : workshopReport.value.coverSubtitle,
        coverByLine: typeof parsed.coverByLine === 'string' ? parsed.coverByLine : workshopReport.value.coverByLine,
        coverJumbotronDataUrl: typeof parsed.coverJumbotronDataUrl === 'string' ? parsed.coverJumbotronDataUrl : workshopReport.value.coverJumbotronDataUrl,
      }
      return true
    }
  } catch (e) { /* ignore */ }
  return false
}
watch(workshopReport, () => {
  try { sessionStorage.setItem(OPR_WORKSHOP_REPORT_SESSION_KEY, JSON.stringify(workshopReport.value)) } catch (e) { /* ignore */ }
}, { deep: true })

async function onWorkshopCoverImageSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
    workshopReport.value.coverJumbotronDataUrl = dataUrl
  } catch (err: any) {
    ui.showError(err?.message || 'Failed to load image')
  } finally {
    try { input.value = '' } catch (_) { /* ignore */ }
  }
}
function clearWorkshopCoverImage() {
  workshopReport.value.coverJumbotronDataUrl = ''
}

async function generateWorkshopReportPdf() {
  if (!projectId.value) return
  if (!addonEnabled.value) {
    ui.showWarning('OPR Workshop is a paid add-on for this project.', { duration: 5000 })
    return
  }
  if (!isAdmin.value) {
    ui.showWarning('Only admins can generate the workshop report.', { duration: 5000 })
    return
  }

  generatingWorkshopReport.value = true
  try {
    // Ensure base data is loaded.
    await Promise.all([
      opr.fetchWorkshop(projectId.value),
      opr.fetchCategories(projectId.value),
      opr.fetchQuestions(projectId.value),
    ])

    const questions: OprQuestion[] = Array.isArray(opr.questions) ? (opr.questions as OprQuestion[]) : []
    const categories: OprCategory[] = Array.isArray(opr.categories) ? (opr.categories as OprCategory[]) : []

    // Best-effort loads that may be admin-only.
    let attendees: OprWorkshopAttendee[] = []
    try {
      const { data } = await axios.get(`${OPR_API_BASE}/${projectId.value}/opr/workshop/attendees`, { headers: getAuthHeaders() })
      attendees = Array.isArray(data?.items) ? data.items : []
    } catch (e) { /* ignore */ }

    const answersByQuestionId: Record<string, OprAnswer[]> = {}
    const resultsByQuestionId: Record<string, OprResult[]> = {}
    for (const q of questions) {
      const qid = String(q?.id || '')
      if (!qid) continue
      try {
        const { data } = await axios.get(`${OPR_API_BASE}/${projectId.value}/opr/questions/${qid}/answers`, {
          headers: getAuthHeaders(),
          params: isAdmin.value ? { includeMerged: 1 } : undefined,
        })
        answersByQuestionId[qid] = Array.isArray(data) ? data : []
      } catch (e) {
        answersByQuestionId[qid] = []
      }
      try {
        const { data } = await axios.get(`${OPR_API_BASE}/${projectId.value}/opr/questions/${qid}/results`, { headers: getAuthHeaders() })
        resultsByQuestionId[qid] = Array.isArray(data?.results) ? data.results : []
      } catch (e) {
        resultsByQuestionId[qid] = []
      }
    }

    let allResults: OprResultsRow[] = []
    try {
      const { data } = await axios.get(`${OPR_API_BASE}/${projectId.value}/opr/results/all`, { headers: getAuthHeaders() })
      allResults = Array.isArray(data?.items) ? data.items : []
    } catch (e) { /* ignore */ }

    const { generateOprWorkshopPdf } = await import('../../utils/oprWorkshopReport')
    const bytes = await generateOprWorkshopPdf({
      project: project.value,
      workshop: opr.workshop || null,
      attendees,
      categories,
      questions,
      answersByQuestionId,
      resultsByQuestionId,
      allResults,
    }, workshopReport.value as any)

    const toSlug = (s: string) => String(s || 'opr-workshop')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 64)
    const date = String(opr.workshop?.date || new Date().toISOString().slice(0, 10))
    const base = toSlug(opr.workshop?.name || 'opr-workshop') || 'opr-workshop'
    const fname = `${base}-${date}.pdf`

    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fname
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    showWorkshopReportDialog.value = false
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to generate workshop report')
  } finally {
    generatingWorkshopReport.value = false
  }
}

const workshopDraft = reactive<OprWorkshopInfo>({
  id: '',
  name: '',
  date: '',
  location: '',
  startTime: '',
  endTime: '',
  description: '',
  tags: [],
  updatedAt: null,
})
const workshopTagsInput = ref('')

function profileIncompleteReason() {
  const u: any = auth.user || {}
  const first = String(u.firstName || '').trim()
  const last = String(u.lastName || '').trim()
  const email = String(u.email || '').trim()
  const company = String(u?.contact?.company || '').trim()
  if (!first || !last) return 'Missing name on your profile.'
  if (!email) return 'Missing email on your profile.'
  if (!company) return 'Missing company on your profile.'
  return ''
}

const profileIncompleteMessage = computed(() => {
  const reason = profileIncompleteReason()
  return reason ? `Profile incomplete: ${reason} Update your profile to check in.` : ''
})

const attendeeStatus = computed<'pending' | 'approved' | 'denied' | ''>(() => {
  const s = String((opr.attendee as any)?.status || '').trim().toLowerCase()
  if (s === 'pending' || s === 'approved' || s === 'denied') return s
  return ''
})
const attendeeStatusLabel = computed(() => {
  const s = attendeeStatus.value
  if (!s) return ''
  if (s === 'pending') return 'Pending approval'
  if (s === 'approved') return 'Admitted'
  if (s === 'denied') return 'Denied'
  return ''
})
function attendeeStatusPillClass(status: any) {
  const s = String(status || '').trim().toLowerCase()
  if (s === 'approved') return 'bg-emerald-500/15 border-emerald-400/25 text-emerald-200'
  if (s === 'denied') return 'bg-red-500/15 border-red-500/25 text-red-200'
  return 'bg-white/10 border-white/20 text-white/80'
}
const attendeeStatusClass = computed(() => attendeeStatusPillClass(attendeeStatus.value))

const workshopStarted = computed(() => {
  const ws: any = opr.workshop || null
  return Boolean(ws && ws.startedAt && !ws.endedAt)
})

const canEnterQa = computed(() => {
  if (!projectId.value || !addonEnabled.value) return false
  if (isAdmin.value) return true
  return attendeeStatus.value === 'approved'
})
const canEnterResults = computed(() => {
  if (!projectId.value || !addonEnabled.value) return false
  if (isAdmin.value) return true
  return attendeeStatus.value === 'approved'
})

const canEnterImport = computed(() => Boolean(projectId.value && isAdmin.value))

function tryGoTab(tab: 'info' | 'qa' | 'results' | 'import') {
  if (tab === 'info') {
    mainTab.value = 'info'
    refreshWorkshopOnly().catch(() => {})
    return
  }
  if (tab === 'import' && !canEnterImport.value) {
    mainTab.value = 'info'
    ui.showWarning('Only the CxA/Admin can import OPR items.', { duration: 5000 })
    return
  }
  if (tab === 'qa' && !canEnterQa.value) {
    mainTab.value = 'info'
    ui.showWarning('Check in and wait for admin approval to enter Q&A.', { duration: 5000 })
    return
  }
  if (tab === 'results' && !canEnterResults.value) {
    mainTab.value = 'info'
    ui.showWarning('Check in and wait for admin approval to view Results.', { duration: 5000 })
    return
  }
  mainTab.value = tab
}

// -----------------------------
// Import OPR items (manual + file)
// -----------------------------
type ImportRow = { _key: string; categoryId: string; text: string; rank: number | null; score: number | null }

const importSubmitting = ref(false)
const importDefaultCategoryId = ref('')
const importLines = ref('')
const importRows = ref<ImportRow[]>([])

const manualLineCount = computed(() => {
  const lines = String(importLines.value || '').split(/\r?\n/g).map((s) => s.trim()).filter(Boolean)
  return lines.length
})

function resetImportDraft() {
  importDefaultCategoryId.value = ''
  importLines.value = ''
  importRows.value = []
}

function clearImportRows() {
  importRows.value = []
}

function removeImportRow(idx: number) {
  const next = importRows.value.slice()
  next.splice(idx, 1)
  importRows.value = next
}

function rowError(r: ImportRow) {
  if (!r?.categoryId) return 'Category required'
  const txt = String(r?.text || '').trim()
  if (!txt) return 'Text required'
  return ''
}

const importRowsValidCount = computed(() => importRows.value.filter((r) => !rowError(r)).length)

async function postImportedItems(items: Array<{ categoryId: string; text: string; rank?: number | null; score?: number | null }>) {
  if (!projectId.value) return
  if (!items.length) return
  importSubmitting.value = true
  try {
    await axios.post(`${OPR_API_BASE}/${projectId.value}/opr/items`, { items }, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
    ui.showSuccess(`Imported ${items.length} OPR item${items.length === 1 ? '' : 's'}`, { duration: 3000 })
    // Best-effort refresh so the Register tab immediately shows the new items.
    try { await opr.fetchItems(projectId.value, { includeArchived: true }) } catch (e) { /* ignore */ }
  } catch (e: any) {
    const code = e?.response?.data?.code
    const msg = e?.response?.data?.error || e?.message || 'Failed to import OPR items'
    if (code === 'OPR_ADDON_REQUIRED' || e?.response?.status === 402) {
      ui.showWarning(msg, { duration: 6000 })
    } else {
      ui.showError(msg, { duration: 6000 })
    }
  } finally {
    importSubmitting.value = false
  }
}

async function submitManualImport() {
  if (!importDefaultCategoryId.value) return
  const lines = String(importLines.value || '').split(/\r?\n/g).map((s) => s.trim()).filter(Boolean)
  if (!lines.length) return
  const items = lines.map((t) => ({ categoryId: importDefaultCategoryId.value, text: t }))
  await postImportedItems(items)
  importLines.value = ''
}

function normalizeHeaderKey(v: any) {
  return String(v || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function mapCategoryToId(raw: any) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const cats: any[] = Array.isArray(opr.categories) ? opr.categories : []
  // Direct id match
  const byId = cats.find((c) => String(c?.id || '') === s)
  if (byId) return String(byId.id)
  const norm = s.toLowerCase()
  const byName = cats.find((c) => String(c?.name || '').trim().toLowerCase() === norm)
  return byName ? String(byName.id) : ''
}

function parseMaybeNumber(v: any): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
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

async function onImportFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  try {
    if (projectId.value && addonEnabled.value) await opr.fetchCategories(projectId.value)
  } catch (err) { /* ignore */ }

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
        const categoryRaw = readColumnValue(r, ['category', 'categoryId', 'oprCategory', 'opr category'])
        const textRaw = readColumnValue(r, ['text', 'item', 'oprItem', 'opr item', 'description', 'title'])
        const rankRaw = readColumnValue(r, ['rank', '#', 'number'])
        const scoreRaw = readColumnValue(r, ['score', 'points', 'pts'])
        const text = String(textRaw || '').trim()
        return {
          _key: `${Date.now()}-${idx}-${Math.random()}`,
          categoryId: mapCategoryToId(categoryRaw),
          text,
          rank: parseMaybeNumber(rankRaw),
          score: parseMaybeNumber(scoreRaw),
        }
      }).filter((r) => String(r.text || '').trim())
    } else {
      const arrRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as any[]
      const dataRows = Array.isArray(arrRows) ? arrRows : []
      // Attempt to detect header row
      const header = (dataRows[0] || []).map((c: any) => normalizeHeaderKey(c))
      const hasHeader = header.includes('category') || header.includes('text') || header.includes('item')
      const startIdx = hasHeader ? 1 : 0
      let categoryIdx = 0
      let textIdx = 1
      let rankIdx = 2
      let scoreIdx = 3
      if (hasHeader) {
        categoryIdx = header.findIndex((h) => h === 'category' || h === 'categoryid' || h === 'oprcategory')
        textIdx = header.findIndex((h) => h === 'text' || h === 'item' || h === 'opritem' || h === 'description' || h === 'title')
        rankIdx = header.findIndex((h) => h === 'rank' || h === 'number')
        scoreIdx = header.findIndex((h) => h === 'score' || h === 'points' || h === 'pts')
      }
      next = dataRows.slice(startIdx).map((r, idx) => {
        const row = Array.isArray(r) ? r : []
        const catRaw = categoryIdx >= 0 ? row[categoryIdx] : ''
        const textRaw = textIdx >= 0 ? row[textIdx] : row[0]
        const text = String(textRaw || '').trim()
        return {
          _key: `${Date.now()}-${idx}-${Math.random()}`,
          categoryId: mapCategoryToId(catRaw),
          text,
          rank: rankIdx >= 0 ? parseMaybeNumber(row[rankIdx]) : null,
          score: scoreIdx >= 0 ? parseMaybeNumber(row[scoreIdx]) : null,
        }
      }).filter((r) => String(r.text || '').trim())
    }

    importRows.value = next.slice(0, 500)
    if (next.length > 500) {
      ui.showWarning('Imported preview limited to 500 rows', { duration: 5000 })
    }
  } catch (err: any) {
    ui.showError(err?.message || 'Failed to parse file', { duration: 6000 })
  } finally {
    try { input.value = '' } catch (_) { /* ignore */ }
  }
}

async function submitFileImport() {
  const valid = importRows.value.filter((r) => !rowError(r))
  const items = valid.map((r) => ({
    categoryId: r.categoryId,
    text: String(r.text || '').trim(),
    rank: r.rank,
    score: r.score,
  }))
  await postImportedItems(items)
}

function applyWorkshopToDraft(ws: any) {
  workshopDraft.id = String(ws?.id || '')
  workshopDraft.name = String(ws?.name || '')
  workshopDraft.date = String(ws?.date || '')
  workshopDraft.location = String(ws?.location || '')
  workshopDraft.startTime = String(ws?.startTime || '')
  workshopDraft.endTime = String(ws?.endTime || '')
  workshopDraft.description = String(ws?.description || '')
  workshopDraft.tags = Array.isArray(ws?.tags) ? ws.tags.slice() : []
  ;(workshopDraft as any).updatedAt = ws?.updatedAt || null
}

function addWorkshopTag(tag: string) {
  const t = String(tag || '').trim()
  if (!t) return
  const set = new Set(Array.isArray(workshopDraft.tags) ? workshopDraft.tags : [])
  set.add(t)
  workshopDraft.tags = Array.from(set).slice(0, 50)
}
function addWorkshopTagsFromInput() {
  const raw = String(workshopTagsInput.value || '')
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  for (const p of parts) addWorkshopTag(p)
  workshopTagsInput.value = ''
}
function removeWorkshopTag(tag: string) {
  const t = String(tag || '').trim()
  if (!t) return
  workshopDraft.tags = (Array.isArray(workshopDraft.tags) ? workshopDraft.tags : []).filter((x) => String(x) !== t)
}

async function refreshAttendees() {
  if (!projectId.value || !addonEnabled.value) return
  attendeesLoading.value = true
  try {
    await opr.fetchAttendees(projectId.value)
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to load participants'
    ui.showError(msg, { duration: 6000 })
  } finally {
    attendeesLoading.value = false
  }
}

const attendeeRows = computed(() => {
  if (isAdmin.value) return Array.isArray(opr.attendees) ? opr.attendees : []
  return opr.attendee ? [opr.attendee] : (Array.isArray(opr.attendees) ? opr.attendees : [])
})

const startingWorkshop = ref(false)
const endingWorkshop = ref(false)

async function startWorkshopSession() {
  if (!projectId.value || !addonEnabled.value) return
  if (!isAdmin.value) return
  startingWorkshop.value = true
  try {
    await opr.startWorkshop(projectId.value)
    await opr.fetchWorkshop(projectId.value)
    applyWorkshopToDraft(opr.workshop)
    ui.showSuccess('Workshop session started', { duration: 2500 })
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to start workshop', { duration: 6000 })
  } finally {
    startingWorkshop.value = false
  }
}

async function endWorkshopSession() {
  if (!projectId.value || !addonEnabled.value) return
  if (!isAdmin.value) return
  const ok = await confirm({
    title: 'End workshop session',
    message: 'End the session now? Participants will no longer be able to check in.',
    confirmText: 'End session',
    cancelText: 'Cancel',
    variant: 'danger',
  })
  if (!ok) return
  endingWorkshop.value = true
  try {
    await opr.endWorkshop(projectId.value)
    await opr.fetchWorkshop(projectId.value)
    applyWorkshopToDraft(opr.workshop)
    ui.showSuccess('Workshop session ended', { duration: 2500 })
  } catch (e: any) {
    ui.showError(e?.response?.data?.error || e?.message || 'Failed to end workshop', { duration: 6000 })
  } finally {
    endingWorkshop.value = false
  }
}

async function refreshWorkshopOnly() {
  if (!projectId.value) return
  if (!addonEnabled.value) {
    opr.workshop = null
    opr.attendee = null
    opr.attendees = []
    applyWorkshopToDraft(null)
    return
  }
  workshopLoading.value = true
  try {
    await opr.fetchWorkshop(projectId.value)
    applyWorkshopToDraft(opr.workshop)
    await refreshAttendees()
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to load workshop info'
    ui.showError(msg, { duration: 6000 })
  } finally {
    workshopLoading.value = false
  }
}

async function approveParticipant(userId: string) {
  if (!projectId.value) return
  try {
    await opr.approveAttendee(projectId.value, userId)
    await refreshAttendees()
    ui.showSuccess('Participant admitted', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to admit participant'
    ui.showError(msg, { duration: 6000 })
  }
}

async function denyParticipant(userId: string) {
  if (!projectId.value) return
  try {
    const ok = await confirm({
      title: 'Deny participant',
      message: 'Deny this participant? They will need to check in again to request access.',
      confirmText: 'Deny',
      cancelText: 'Cancel',
      variant: 'danger',
    })
    if (!ok) return
    await opr.denyAttendee(projectId.value, userId)
    await refreshAttendees()
    ui.showSuccess('Participant denied', { duration: 2500 })
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to deny participant'
    ui.showError(msg, { duration: 6000 })
  }
}

async function checkInToWorkshop() {
  if (!projectId.value) return
  if (profileIncompleteReason()) {
    ui.showWarning('Complete your profile (name, email, company) before checking in.', { duration: 7000 })
    return
  }
  if (!workshopStarted.value) {
    ui.showWarning('Workshop has not started yet. Please wait for an admin to start the session.', { duration: 7000 })
    return
  }
  checkingIn.value = true
  try {
    await opr.checkIn(projectId.value)
    await opr.fetchWorkshop(projectId.value)
    await refreshAttendees()
    ui.showSuccess('Checked in', { duration: 2500 })
  } catch (e: any) {
    const code = e?.response?.data?.code
    const msg = e?.response?.data?.error || e?.message || 'Failed to check in'
    if (code === 'WORKSHOP_NOT_STARTED') ui.showWarning(msg, { duration: 7000 })
    if (code === 'PROFILE_INCOMPLETE') ui.showWarning(msg, { duration: 7000 })
    else ui.showError(msg, { duration: 6000 })
  } finally {
    checkingIn.value = false
  }
}

async function saveWorkshopInfo() {
  if (!projectId.value || !addonEnabled.value) return
  if (!isAdmin.value) return
  workshopSaving.value = true
  try {
    await opr.updateWorkshop(projectId.value, {
      name: workshopDraft.name,
      date: workshopDraft.date,
      location: workshopDraft.location,
      startTime: workshopDraft.startTime,
      endTime: workshopDraft.endTime,
      description: workshopDraft.description,
      tags: Array.isArray(workshopDraft.tags) ? workshopDraft.tags : [],
    })
    await opr.fetchWorkshop(projectId.value)
    applyWorkshopToDraft(opr.workshop)
    ui.showSuccess('Workshop info saved', { duration: 2500 })
  } catch (e: any) {
    const base = e?.response?.data?.error || e?.message || 'Failed to save workshop info'
    const details = e?.response?.data?.details
    const msg = details ? `${base} (${details})` : base
    ui.showError(msg, { duration: 6000 })
  } finally {
    workshopSaving.value = false
  }
}

const resultsRows = computed<OprResultsRow[]>(() => {
  const q = String(resultsSearch.value || '').trim().toLowerCase()
  const list = Array.isArray(opr.allResults) ? (opr.allResults as any as OprResultsRow[]) : []
  if (!q) return list
  return list.filter((r) => {
    const fields = [
      r.categoryName || '',
      r.questionPrompt || '',
      r.text || '',
    ].map((s) => String(s).toLowerCase())
    return fields.some((s) => s.includes(q))
  })
})

async function refreshResults() {
  if (!projectId.value) return
  if (!addonEnabled.value) { opr.allResults = []; return }
  resultsLoading.value = true
  try {
    await opr.fetchAllResults(projectId.value)
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to load results'
    ui.showError(msg, { duration: 6000 })
  } finally {
    resultsLoading.value = false
  }
}

async function refreshAll() {
  await refreshWorkshopOnly()
  if (canEnterQa.value) await refresh()
  if (mainTab.value === 'results') await refreshResults()
  if (mainTab.value === 'import') {
    try { if (projectId.value && addonEnabled.value) await opr.fetchCategories(projectId.value) } catch (e) { /* ignore */ }
  }
}

watch(mainTab, async (tab) => {
  if (tab === 'qa' && canEnterQa.value) await refresh()
  if (tab === 'results') await refreshResults()
  if (tab === 'import') {
    try { if (projectId.value && addonEnabled.value) await opr.fetchCategories(projectId.value) } catch (e) { /* ignore */ }
  }
})

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
const ALL_CATEGORIES = '__all__'
const registerCategoryId = ref<string>('')
const registerIncludeArchived = ref(false)
const registerSearch = ref('')
const deepLinkItemId = ref<string>('')

function oprItemDomId(id: string) {
  const s = String(id || '').trim()
  return s ? `opr-item-${s}` : ''
}

function ensureRegisterCategory() {
  if (registerCategoryId.value) return
  // Default to "All Categories" so users can browse the full register.
  registerCategoryId.value = ALL_CATEGORIES
}

const filteredOprItems = computed<OprItem[]>(() => {
  const q = registerSearch.value.trim().toLowerCase()
  const list = Array.isArray(opr.items) ? (opr.items as any as OprItem[]) : []
  const filtered = q ? list.filter((i) => String(i.text || '').toLowerCase().includes(q)) : list
  return filtered.slice().sort((a, b) => {
    if (registerCategoryId.value === ALL_CATEGORIES) {
      const an = String(categoryNameById.value[a.categoryId || ''] || '').toLowerCase()
      const bn = String(categoryNameById.value[b.categoryId || ''] || '').toLowerCase()
      const byCat = an.localeCompare(bn)
      if (byCat) return byCat
    }
    const ar = Number(a.rank || 0)
    const br = Number(b.rank || 0)
    if (ar !== br) return ar - br
    return String(a.id).localeCompare(String(b.id))
  })
})

const categoryNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  const list = Array.isArray(opr.categories) ? opr.categories : []
  for (const c of list) {
    const id = String((c as any).id || '').trim()
    if (!id) continue
    map[id] = String((c as any).name || '').trim() || id
  }
  return map
})

async function refreshItems() {
  if (!projectId.value || !addonEnabled.value) {
    opr.items = []
    return
  }
  ensureRegisterCategory()
  try {
    const includeArchived = Boolean(isAdmin.value && registerIncludeArchived.value)
    if (registerCategoryId.value === ALL_CATEGORIES) {
      await opr.fetchItems(projectId.value, { includeArchived })
    } else if (registerCategoryId.value) {
      await opr.fetchItems(projectId.value, { categoryId: registerCategoryId.value, includeArchived })
    } else {
      opr.items = []
      return
    }
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || 'Failed to load OPR items'
    ui.showError(msg, { duration: 6000 })
  }
}

const deepLinkKey = ref('')
async function applyDeepLinkFromRoute() {
  const q: any = route.query || {}
  const nextKey = JSON.stringify({
    tab: q.tab,
    rightTab: q.rightTab,
    categoryId: q.categoryId,
    itemId: q.itemId,
  })
  if (nextKey === deepLinkKey.value) return
  deepLinkKey.value = nextKey

  const tab = String(q.tab || '').trim().toLowerCase()
  const rt = String(q.rightTab || '').trim().toLowerCase()
  const categoryId = String(q.categoryId || '').trim()
  const itemId = String(q.itemId || '').trim()

  deepLinkItemId.value = itemId || ''

  if (tab === 'info') {
    tryGoTab('info')
    return
  }
  if (tab === 'results') {
    tryGoTab('results')
    return
  }
  if (tab === 'qa') {
    tryGoTab('qa')
    if (!canEnterQa.value) return

    if (rt === 'register') {
      rightTab.value = 'register'
      if (!categoryId || categoryId.toLowerCase() === 'all' || categoryId === ALL_CATEGORIES) {
        registerCategoryId.value = ALL_CATEGORIES
      } else {
        registerCategoryId.value = categoryId
      }

      await nextTick()
      await refreshItems()
      await nextTick()
      if (deepLinkItemId.value) {
        const el = document.getElementById(oprItemDomId(deepLinkItemId.value))
        try { el?.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch (e) { /* ignore */ }
      }
      return
    }

    rightTab.value = 'responses'
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
  if (!canEnterQa.value) return
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
  mainTab.value = 'info'
  await refreshAll()

  // Only start the Q&A heartbeat/poll timers for admitted users (or admins).
  if (!canEnterQa.value) return

  heartbeatTimer = setInterval(async () => {
    try {
      const q = active.value
      if (!q || !projectId.value) return
      if (!canEnterQa.value) return
      await opr.heartbeat(projectId.value, q.id)
    } catch (_) {
      // ignore
    }
  }, 20_000)

  pollTimer = setInterval(async () => {
    try {
      if (!projectId.value) return
      if (!canEnterQa.value) return
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
  loadWorkshopReportSettingsFromSession()
  applyDeepLinkFromRoute().catch(() => {})
  // Other initialization handled by the projectId watcher.
})

onBeforeUnmount(() => {
  clearTimers()
})

watch(() => route.query, () => {
  applyDeepLinkFromRoute().catch(() => {})
})
</script>
