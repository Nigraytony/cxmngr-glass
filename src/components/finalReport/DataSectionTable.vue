<template>
  <!--
    Renders a data-section payload returned from
    POST /api/projects/:id/final-report/sections/:key/refresh.
    Six provider shapes are supported: opr, tasks, activities, equipment, issues, team.
    Unknown sources show a fallback "no renderer" hint so the page never breaks.
  -->
  <div
    v-if="!data"
    class="text-sm text-white/50 italic"
  >
    No data yet — click <strong>Refresh data</strong> to pull from the project.
  </div>

  <!-- OPR — rank, text, score, category -->
  <div
    v-else-if="dataSource === 'opr'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-12 text-right'">
            Rank
          </th>
          <th :class="thClass">
            Item
          </th>
          <th :class="thClass + ' w-20 text-right'">
            Score
          </th>
          <th :class="thClass + ' w-32'">
            Category
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in (data.rows || [])"
          :key="r.rank"
          :class="trClass"
        >
          <td :class="tdClass + ' text-right text-white/60'">
            {{ r.rank }}
          </td>
          <td :class="tdClass">
            {{ r.text }}
          </td>
          <td :class="tdClass + ' text-right'">
            {{ r.score }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.category }}
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="4"
            :class="emptyClass"
          >
            No OPR items.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Tasks (milestones) — wbs, name, planned dates, %, status -->
  <div
    v-else-if="dataSource === 'tasks'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-20'">
            WBS
          </th>
          <th :class="thClass">
            Milestone
          </th>
          <th :class="thClass + ' w-28'">
            Start
          </th>
          <th :class="thClass + ' w-28'">
            End
          </th>
          <th :class="thClass + ' w-16 text-right'">
            %
          </th>
          <th :class="thClass + ' w-28'">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="i"
          :class="trClass"
        >
          <td :class="tdClass + ' text-white/60'">
            {{ r.wbs || '—' }}
          </td>
          <td :class="tdClass">
            {{ r.name }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ formatDate(r.start) }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ formatDate(r.end) }}
          </td>
          <td :class="tdClass + ' text-right'">
            {{ r.percentComplete }}%
          </td>
          <td :class="tdClass">
            <span
              class="px-2 py-0.5 rounded-full text-xs border"
              :class="taskStatusBadge(r.status)"
            >{{ r.status }}</span>
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="6"
            :class="emptyClass"
          >
            No tasks defined for this project.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Activities — date, type, name, status, location, preview -->
  <div
    v-else-if="dataSource === 'activities'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-28'">
            Date
          </th>
          <th :class="thClass + ' w-36'">
            Type
          </th>
          <th :class="thClass">
            Name
          </th>
          <th :class="thClass + ' w-28'">
            Status
          </th>
          <th :class="thClass + ' w-32'">
            Location
          </th>
          <th :class="thClass + ' w-16 text-right'">
            Issues
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="r._id || i"
          :class="trClass"
        >
          <td :class="tdClass + ' text-white/70'">
            {{ formatDate(r.startDate) }}
          </td>
          <td :class="tdClass">
            {{ r.type }}
          </td>
          <td :class="tdClass">
            <div class="font-medium">
              {{ r.name }}
            </div>
            <div
              v-if="r.descriptionPreview"
              class="text-xs text-white/55 mt-0.5"
            >
              {{ r.descriptionPreview }}
            </div>
          </td>
          <td :class="tdClass + ' text-white/80 capitalize'">
            {{ r.status }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.location || '—' }}
          </td>
          <td :class="tdClass + ' text-right text-white/80'">
            {{ r.issueCount }}
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="6"
            :class="emptyClass"
          >
            No activities recorded yet.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Scoped Systems — flat table of all equipment with checklist/FPT counts
       and a derived 3-state progress status (Not Started / In Progress /
       Complete). Status comes from the backend's deriveScopedSystemProgress. -->
  <div
    v-else-if="dataSource === 'scoped-systems'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-32'">
            Tag
          </th>
          <th :class="thClass">
            Name
          </th>
          <th :class="thClass + ' w-28'">
            System
          </th>
          <th :class="thClass + ' w-24 text-right'">
            # Checklists
          </th>
          <th :class="thClass + ' w-20 text-right'">
            # FPTs
          </th>
          <th :class="thClass + ' w-32'">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="i"
          :class="trClass"
        >
          <td :class="tdClass + ' font-medium'">
            {{ r.tag || '—' }}
          </td>
          <td :class="tdClass">
            {{ r.name || '—' }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.system || '—' }}
          </td>
          <td :class="tdClass + ' text-right text-white/80'">
            {{ r.checklistsCount }}
          </td>
          <td :class="tdClass + ' text-right text-white/80'">
            {{ r.fptsCount }}
          </td>
          <td :class="tdClass">
            <span
              class="px-2 py-0.5 rounded-full text-xs border"
              :class="progressBadge(r.status)"
            >{{ r.status }}</span>
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="6"
            :class="emptyClass"
          >
            No equipment in project scope.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Equipment — grouped by system -->
  <div v-else-if="dataSource === 'equipment'">
    <div
      v-for="g in (data.groups || [])"
      :key="g.system"
      class="rounded-lg border border-white/10 overflow-hidden mb-3"
    >
      <div class="px-3 py-2 bg-white/5 text-white/85 text-sm font-medium border-b border-white/10">
        {{ g.system }} <span class="text-white/50">· {{ g.rows.length }}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead :class="theadClass">
            <tr>
              <th :class="thClass + ' w-32'">
                Tag
              </th>
              <th :class="thClass">
                Title
              </th>
              <th :class="thClass + ' w-32'">
                Type
              </th>
              <th :class="thClass + ' w-32'">
                Status
              </th>
              <th :class="thClass + ' w-40'">
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in g.rows"
              :key="i"
              :class="trClass"
            >
              <td :class="tdClass + ' font-medium'">
                {{ r.tag }}
              </td>
              <td :class="tdClass">
                {{ r.title }}
              </td>
              <td :class="tdClass + ' text-white/70'">
                {{ r.type }}
              </td>
              <td :class="tdClass + ' text-white/80'">
                {{ r.status }}
              </td>
              <td :class="tdClass + ' text-white/70'">
                {{ r.location || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div
      v-if="!(data.groups || []).length"
      class="text-sm text-white/50 italic"
    >
      No equipment on this project yet.
    </div>
  </div>

  <!-- Issues — # / title / severity / status / system / location / etc -->
  <div
    v-else-if="dataSource === 'issues'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-12 text-right'">
            #
          </th>
          <th :class="thClass">
            Issue
          </th>
          <th :class="thClass + ' w-24'">
            Severity
          </th>
          <th :class="thClass + ' w-28'">
            Status
          </th>
          <th :class="thClass + ' w-28'">
            System
          </th>
          <th :class="thClass + ' w-28'">
            Date Found
          </th>
          <th :class="thClass + ' w-28'">
            Closed
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="i"
          :class="trClass"
        >
          <td :class="tdClass + ' text-right text-white/60'">
            {{ r.number ?? '—' }}
          </td>
          <td :class="tdClass">
            <div class="font-medium">
              {{ r.title }}
            </div>
            <div
              v-if="r.resolution"
              class="text-xs text-emerald-200 mt-0.5"
            >
              Resolved: {{ r.resolution }}
            </div>
          </td>
          <td :class="tdClass">
            <span
              class="px-2 py-0.5 rounded-full text-xs border"
              :class="severityBadge(r.severity)"
            >{{ r.severity || '—' }}</span>
          </td>
          <td :class="tdClass">
            <span
              class="px-2 py-0.5 rounded-full text-xs border"
              :class="issueStatusBadge(r.status)"
            >{{ r.status || '—' }}</span>
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.system || '—' }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.dateFound || '—' }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.closedDate || '—' }}
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="7"
            :class="emptyClass"
          >
            No issues recorded on this project.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Team — roster + commissioning agent block -->
  <div v-else-if="dataSource === 'team'">
    <div
      v-if="data.commissioningAgent"
      class="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 mb-3 text-sm"
    >
      <div class="text-emerald-100 font-medium">
        Commissioning Agent
      </div>
      <div class="text-white/85">
        {{ [data.commissioningAgent.firstName, data.commissioningAgent.lastName].filter(Boolean).join(' ') || '—' }}
        <span v-if="data.commissioningAgent.company">· {{ data.commissioningAgent.company }}</span>
      </div>
      <div class="text-xs text-white/60">
        <span v-if="data.commissioningAgent.email">{{ data.commissioningAgent.email }}</span>
        <span v-if="data.commissioningAgent.phone"> · {{ data.commissioningAgent.phone }}</span>
      </div>
    </div>
    <div class="overflow-x-auto rounded-lg border border-white/10">
      <table class="w-full text-sm">
        <thead :class="theadClass">
          <tr>
            <th :class="thClass">
              Name
            </th>
            <th :class="thClass + ' w-40'">
              Email
            </th>
            <th :class="thClass + ' w-36'">
              Company
            </th>
            <th :class="thClass + ' w-24'">
              Role
            </th>
            <th :class="thClass + ' w-24'">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in (data.rows || [])"
            :key="i"
            :class="trClass"
          >
            <td :class="tdClass + ' font-medium'">
              {{ [r.firstName, r.lastName].filter(Boolean).join(' ') || '—' }}
            </td>
            <td :class="tdClass + ' text-white/70'">
              {{ r.email || '—' }}
            </td>
            <td :class="tdClass + ' text-white/70'">
              {{ r.company || '—' }}
            </td>
            <td :class="tdClass + ' text-white/85'">
              {{ r.role || '—' }}
            </td>
            <td :class="tdClass + ' text-white/70 capitalize'">
              {{ r.status || 'active' }}
            </td>
          </tr>
          <tr v-if="!(data.rows || []).length">
            <td
              colspan="5"
              :class="emptyClass"
            >
              No team members on this project yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- =====================================================================
       Phase 1 renderers — LEED-aware sections sourced from project data.
       Each maps 1:1 to a provider in backend-api/utils/finalReportDataSources.
       ===================================================================== -->

  <!-- Project Description — render project.description as a single block,
       with light building metadata as a header. -->
  <div v-else-if="dataSource === 'project-description'">
    <div class="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
      <div
        class="flex flex-wrap gap-4 text-xs text-white/60"
      >
        <span v-if="data.client">Client: <span class="text-white/85">{{ data.client }}</span></span>
        <span v-if="data.location">Location: <span class="text-white/85">{{ data.location }}</span></span>
        <span v-if="data.buildingType">Building type: <span class="text-white/85">{{ data.buildingType }}</span></span>
        <span v-if="data.startDate">Start: <span class="text-white/85">{{ formatDate(data.startDate) }}</span></span>
        <span v-if="data.endDate">End: <span class="text-white/85">{{ formatDate(data.endDate) }}</span></span>
      </div>
      <div
        v-if="data.description"
        class="text-sm text-white/85 whitespace-pre-wrap"
      >
        {{ data.description }}
      </div>
      <div
        v-else
        class="text-sm text-white/50 italic"
      >
        No project description yet — set it in Project Settings → Info.
      </div>
    </div>
  </div>

  <!-- Revisions — table of manual + release-derived entries. -->
  <div
    v-else-if="dataSource === 'revisions'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-28'">
            Version
          </th>
          <th :class="thClass">
            Summary
          </th>
          <th :class="thClass + ' w-32'">
            Reviser
          </th>
          <th :class="thClass + ' w-28'">
            Date
          </th>
          <th :class="thClass + ' w-24'">
            Kind
          </th>
          <th
            v-if="editable"
            :class="thClass + ' w-12'"
          >
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="i"
          :class="trClass"
        >
          <td :class="tdClass + ' font-medium'">
            {{ r.versionLabel || '—' }}
          </td>
          <td :class="tdClass">
            {{ r.summary || '—' }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.reviser || '—' }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ formatDate(r.date) }}
          </td>
          <td :class="tdClass">
            <span
              class="px-2 py-0.5 rounded-full text-xs border"
              :class="r.kind === 'release' ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100' : 'bg-white/10 border-white/20 text-white/70'"
            >{{ r.kind }}</span>
          </td>
          <td
            v-if="editable"
            :class="tdClass + ' text-right'"
          >
            <button
              v-if="r.kind === 'manual' && r.id"
              type="button"
              class="px-2 py-1 rounded-md text-red-300 hover:text-red-200 hover:bg-red-500/10 text-xs"
              title="Delete revision"
              @click="emit('delete-revision', r.id)"
            >
              ✕
            </button>
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length && !editable">
          <td
            colspan="5"
            :class="emptyClass"
          >
            No revisions yet — add a manual entry or lock a release.
          </td>
        </tr>
        <!-- Add manual revision -->
        <tr
          v-if="editable"
          class="border-t border-white/10 bg-white/3"
        >
          <td class="px-3 py-2 align-top">
            <input
              v-model="newRevision.versionLabel"
              placeholder="e.g. 1.0"
              class="w-full rounded p-1.5 bg-white/5 border border-white/15 text-sm placeholder-white/40"
            >
          </td>
          <td class="px-3 py-2 align-top">
            <input
              v-model="newRevision.summary"
              placeholder="Summary of changes"
              class="w-full rounded p-1.5 bg-white/5 border border-white/15 text-sm placeholder-white/40"
              @keyup.enter="submitRevision"
            >
          </td>
          <td class="px-3 py-2 align-top">
            <input
              v-model="newRevision.reviserName"
              placeholder="Reviser"
              class="w-full rounded p-1.5 bg-white/5 border border-white/15 text-sm placeholder-white/40"
            >
          </td>
          <td class="px-3 py-2 align-top">
            <input
              v-model="newRevision.date"
              type="date"
              class="w-full rounded p-1.5 bg-white/5 border border-white/15 text-sm"
            >
          </td>
          <td
            class="px-3 py-2 align-top"
            colspan="2"
          >
            <button
              type="button"
              class="px-3 py-1.5 rounded-md bg-emerald-600/80 border border-emerald-400/60 text-white hover:bg-emerald-600 text-sm inline-flex items-center gap-1.5 disabled:opacity-50"
              :disabled="!newRevision.versionLabel.trim() && !newRevision.summary.trim()"
              @click="submitRevision"
            >
              + Add
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Commissioned Systems / Sampling Methodology — system rollups with verification %s. -->
  <div
    v-else-if="dataSource === 'commissioned-systems'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass">
            Commissioned System
          </th>
          <th :class="thClass + ' w-20 text-right'">
            Quantity
          </th>
          <th :class="thClass + ' w-24 text-right'">
            PFPT %
          </th>
          <th :class="thClass + ' w-20 text-right'">
            BAS %
          </th>
          <th :class="thClass + ' w-20 text-right'">
            TAB %
          </th>
          <th :class="thClass + ' w-20 text-right'">
            FPT %
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="i"
          :class="trClass"
        >
          <td :class="tdClass + ' font-medium'">
            {{ r.system }}
          </td>
          <td :class="tdClass + ' text-right'">
            {{ r.quantity }}
          </td>
          <td :class="tdClass + ' text-right text-white/85'">
            {{ r.pfptPct }}%
          </td>
          <td :class="tdClass + ' text-right text-white/85'">
            {{ r.basPct }}%
          </td>
          <td :class="tdClass + ' text-right text-white/85'">
            {{ r.tabPct }}%
          </td>
          <td :class="tdClass + ' text-right text-white/85'">
            {{ r.fptPct }}%
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="6"
            :class="emptyClass"
          >
            No systems or equipment yet — add them to the project to populate this table.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Cx Activities by Phase — grouped by ASHRAE phase. -->
  <div v-else-if="dataSource === 'activities-by-phase'">
    <div
      v-for="g in (data.groups || []).filter((x) => (x.rows || []).length)"
      :key="g.phase"
      class="rounded-lg border border-white/10 overflow-hidden mb-3"
    >
      <div class="px-3 py-2 bg-white/5 text-white/85 text-sm font-medium border-b border-white/10">
        {{ g.label }} <span class="text-white/50">· {{ g.rows.length }}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead :class="theadClass">
            <tr>
              <th :class="thClass + ' w-28'">
                Date
              </th>
              <th :class="thClass + ' w-36'">
                Type
              </th>
              <th :class="thClass">
                Activity
              </th>
              <th :class="thClass + ' w-28'">
                Milestone
              </th>
              <th :class="thClass + ' w-16 text-right'">
                Issues
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in g.rows"
              :key="r._id || i"
              :class="trClass"
            >
              <td :class="tdClass + ' text-white/70'">
                {{ formatDate(r.startDate) }}
              </td>
              <td :class="tdClass">
                {{ r.type }}
              </td>
              <td :class="tdClass">
                <div class="font-medium">
                  {{ r.name }}
                </div>
                <div
                  v-if="r.descriptionPreview"
                  class="text-xs text-white/55 mt-0.5"
                >
                  {{ r.descriptionPreview }}
                </div>
              </td>
              <td :class="tdClass + ' text-white/70'">
                {{ r.milestone || '—' }}
              </td>
              <td :class="tdClass + ' text-right text-white/80'">
                {{ r.issueCount }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div
      v-if="!(data.groups || []).some((g) => (g.rows || []).length)"
      class="text-sm text-white/50 italic"
    >
      No activities recorded yet.
    </div>
  </div>

  <!-- OPR Coverage — verification rollup per OPR item. -->
  <div v-else-if="dataSource === 'opr-coverage'">
    <div class="flex flex-wrap gap-3 mb-3 text-xs">
      <span class="px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-100">
        ✓ Verified · {{ data.verifiedCount }}
      </span>
      <span class="px-2 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-100">
        ✗ Failed · {{ data.failedCount }}
      </span>
      <span class="px-2 py-1 rounded-full bg-white/10 border border-white/20 text-white/70">
        N/A · {{ data.naCount }}
      </span>
      <span class="px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-100">
        Unverified · {{ data.unverifiedCount }}
      </span>
    </div>
    <div class="overflow-x-auto rounded-lg border border-white/10">
      <table class="w-full text-sm">
        <thead :class="theadClass">
          <tr>
            <th :class="thClass + ' w-12 text-right'">
              Rank
            </th>
            <th :class="thClass">
              OPR Item
            </th>
            <th :class="thClass + ' w-32'">
              Category
            </th>
            <th :class="thClass + ' w-20 text-right'">
              Links
            </th>
            <th :class="thClass + ' w-28'">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in (data.rows || [])"
            :key="i"
            :class="trClass"
          >
            <td :class="tdClass + ' text-right text-white/60'">
              {{ r.rank }}
            </td>
            <td :class="tdClass">
              <div class="font-medium">
                {{ r.text }}
              </div>
              <div
                v-if="r.links && r.links.length"
                class="text-xs text-white/55 mt-0.5"
              >
                Verified by: <span
                  v-for="(l, li) in r.links"
                  :key="li"
                >
                  {{ l.contextLabel || l.contextType }}<span v-if="l.targetLabel"> → {{ l.targetLabel }}</span><span v-if="li < r.links.length - 1">, </span>
                </span>
              </div>
            </td>
            <td :class="tdClass + ' text-white/70'">
              {{ r.category }}
            </td>
            <td :class="tdClass + ' text-right text-white/80'">
              {{ r.totalLinks }}
            </td>
            <td :class="tdClass">
              <span
                class="px-2 py-0.5 rounded-full text-xs border"
                :class="oprStatusBadge(r.overallStatus)"
              >{{ oprStatusLabel(r.overallStatus) }}</span>
            </td>
          </tr>
          <tr v-if="!(data.rows || []).length">
            <td
              colspan="5"
              :class="emptyClass"
            >
              No active OPR items. Run an OPR Workshop session to populate.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- OPR Deviations — narrower view of OPR items with any failed link. -->
  <div
    v-else-if="dataSource === 'opr-deviations'"
    class="overflow-x-auto rounded-lg border border-red-400/30 bg-red-500/5"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-12 text-right'">
            Rank
          </th>
          <th :class="thClass">
            OPR Item Not Meeting Requirements
          </th>
          <th :class="thClass + ' w-32'">
            Category
          </th>
          <th :class="thClass + ' w-24 text-right'">
            Failures
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="i"
          :class="trClass"
        >
          <td :class="tdClass + ' text-right text-white/60'">
            {{ r.rank }}
          </td>
          <td :class="tdClass">
            <div class="font-medium">
              {{ r.text }}
            </div>
            <div
              v-for="(f, fi) in (r.failures || [])"
              :key="fi"
              class="text-xs text-red-200 mt-0.5"
            >
              {{ f.contextLabel || f.contextType }} — {{ f.targetLabel || f.targetType }}<span v-if="f.notes"> · {{ f.notes }}</span>
            </div>
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.category }}
          </td>
          <td :class="tdClass + ' text-right text-red-200'">
            {{ r.failLinks }}
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="4"
            :class="emptyClass"
          >
            No OPR deviations recorded — every linked verification is pass or N/A.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- FPT Results — pass/fail/na/pending counts per equipment. -->
  <div
    v-else-if="dataSource === 'fpt-results'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-28'">
            Tag
          </th>
          <th :class="thClass">
            Name
          </th>
          <th :class="thClass + ' w-28'">
            System
          </th>
          <th :class="thClass + ' w-16 text-right'">
            Total
          </th>
          <th :class="thClass + ' w-16 text-right'">
            Pass
          </th>
          <th :class="thClass + ' w-16 text-right'">
            Fail
          </th>
          <th :class="thClass + ' w-16 text-right'">
            N/A
          </th>
          <th :class="thClass + ' w-20 text-right'">
            Pending
          </th>
          <th :class="thClass + ' w-20'">
            Signed
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="i"
          :class="trClass"
        >
          <td :class="tdClass + ' font-medium'">
            {{ r.tag || (r.kind === 'system' ? '—' : '') }}
          </td>
          <td :class="tdClass">
            {{ r.name }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.system || '—' }}
          </td>
          <td :class="tdClass + ' text-right text-white/85'">
            {{ r.total }}
          </td>
          <td :class="tdClass + ' text-right text-emerald-200'">
            {{ r.pass }}
          </td>
          <td :class="tdClass + ' text-right text-red-200'">
            {{ r.fail }}
          </td>
          <td :class="tdClass + ' text-right text-white/60'">
            {{ r.na }}
          </td>
          <td :class="tdClass + ' text-right text-amber-200'">
            {{ r.pending }}
          </td>
          <td :class="tdClass + ' text-white/85'">
            {{ r.hasSignatures ? '✓' : '—' }}
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="9"
            :class="emptyClass"
          >
            No FPTs recorded. Add functional tests to Equipment or Systems.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Construction Checklist Summary — per-equipment section completion. -->
  <div
    v-else-if="dataSource === 'checklist-summary'"
    class="overflow-x-auto rounded-lg border border-white/10"
  >
    <table class="w-full text-sm">
      <thead :class="theadClass">
        <tr>
          <th :class="thClass + ' w-28'">
            Tag
          </th>
          <th :class="thClass">
            Name
          </th>
          <th :class="thClass + ' w-28'">
            System
          </th>
          <th :class="thClass + ' w-16 text-right'">
            Total
          </th>
          <th :class="thClass + ' w-20 text-right'">
            Complete
          </th>
          <th :class="thClass + ' w-20 text-right'">
            Partial
          </th>
          <th :class="thClass + ' w-24 text-right'">
            Not Started
          </th>
          <th :class="thClass + ' w-20 text-right'">
            %
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in (data.rows || [])"
          :key="i"
          :class="trClass"
        >
          <td :class="tdClass + ' font-medium'">
            {{ r.tag || (r.kind === 'system' ? '—' : '') }}
          </td>
          <td :class="tdClass">
            {{ r.name }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.system || '—' }}
          </td>
          <td :class="tdClass + ' text-right text-white/85'">
            {{ r.totalSections }}
          </td>
          <td :class="tdClass + ' text-right text-emerald-200'">
            {{ r.completeSections }}
          </td>
          <td :class="tdClass + ' text-right text-amber-200'">
            {{ r.partialSections }}
          </td>
          <td :class="tdClass + ' text-right text-white/60'">
            {{ r.notStarted }}
          </td>
          <td :class="tdClass + ' text-right text-white/85'">
            {{ r.completionPct }}%
          </td>
        </tr>
        <tr v-if="!(data.rows || []).length">
          <td
            colspan="8"
            :class="emptyClass"
          >
            No construction checklists recorded yet.
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Training Verification — sessions with attendee counts + attachment indicator. -->
  <div
    v-else-if="dataSource === 'training-sessions'"
    class="space-y-3"
  >
    <div
      v-for="(s, si) in (data.rows || [])"
      :key="s._id || si"
      class="rounded-lg border border-white/10 overflow-hidden"
    >
      <div class="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div class="text-white/90 font-medium">
            {{ s.topic || s.name }}
          </div>
          <div class="text-xs text-white/60">
            {{ formatDate(s.date) }}<span v-if="s.location"> · {{ s.location }}</span>
          </div>
        </div>
        <div class="text-xs text-white/60 flex items-center gap-3">
          <span>{{ s.attendeeCount }} attendee{{ s.attendeeCount === 1 ? '' : 's' }}</span>
          <span v-if="s.attachmentCount">
            📎 {{ s.attachmentCount }} sign-in sheet{{ s.attachmentCount === 1 ? '' : 's' }}
          </span>
        </div>
      </div>
      <div
        v-if="s.attendees && s.attendees.length"
        class="overflow-x-auto"
      >
        <table class="w-full text-sm">
          <thead :class="theadClass">
            <tr>
              <th :class="thClass">
                Name
              </th>
              <th :class="thClass + ' w-36'">
                Company
              </th>
              <th :class="thClass + ' w-40'">
                Email
              </th>
              <th :class="thClass + ' w-28'">
                Role
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(a, ai) in s.attendees"
              :key="ai"
              :class="trClass"
            >
              <td :class="tdClass">
                {{ a.name || '—' }}
              </td>
              <td :class="tdClass + ' text-white/70'">
                {{ a.company || '—' }}
              </td>
              <td :class="tdClass + ' text-white/70'">
                {{ a.email || '—' }}
              </td>
              <td :class="tdClass + ' text-white/70'">
                {{ a.role || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-else
        class="px-3 py-3 text-xs text-white/50 italic"
      >
        No attendees recorded — see the linked sign-in sheet attachment{{ s.attachmentCount > 1 ? 's' : '' }}.
      </div>
    </div>
    <div
      v-if="!(data.rows || []).length"
      class="text-sm text-white/50 italic"
    >
      No training sessions recorded yet. Add Activities of type "Training Review".
    </div>
  </div>

  <!-- Recommendations — grouped by system, drawn from Issue.recommendation. -->
  <div v-else-if="dataSource === 'recommendations'">
    <div
      v-for="g in (data.groups || [])"
      :key="g.system"
      class="rounded-lg border border-white/10 overflow-hidden mb-3"
    >
      <div class="px-3 py-2 bg-white/5 text-white/85 text-sm font-medium border-b border-white/10">
        {{ g.system }} <span class="text-white/50">· {{ g.rows.length }}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead :class="theadClass">
            <tr>
              <th :class="thClass + ' w-12 text-right'">
                #
              </th>
              <th :class="thClass + ' w-48'">
                Issue
              </th>
              <th :class="thClass">
                Recommendation
              </th>
              <th :class="thClass + ' w-24'">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in g.rows"
              :key="i"
              :class="trClass"
            >
              <td :class="tdClass + ' text-right text-white/60'">
                {{ r.number ?? '—' }}
              </td>
              <td :class="tdClass + ' font-medium'">
                {{ r.title }}
              </td>
              <td :class="tdClass">
                {{ r.recommendation }}
              </td>
              <td :class="tdClass">
                <span
                  class="px-2 py-0.5 rounded-full text-xs border"
                  :class="issueStatusBadge(r.status)"
                >{{ r.status || '—' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div
      v-if="!(data.groups || []).length"
      class="text-sm text-white/50 italic"
    >
      No recommendations yet. Fill in the Recommendation field on issues as they're worked.
    </div>
  </div>

  <!-- 10-Month Warranty Review — Activities tagged with phase=occupancy. -->
  <div
    v-else-if="dataSource === 'warranty-review'"
    class="space-y-3"
  >
    <div
      v-for="(r, i) in (data.rows || [])"
      :key="r._id || i"
      class="rounded-lg border border-white/10 overflow-hidden"
    >
      <div class="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between gap-2">
        <div>
          <div class="text-white/90 font-medium">
            {{ r.name }}
          </div>
          <div class="text-xs text-white/60">
            {{ r.type }} · {{ formatDate(r.date) }}<span v-if="r.location"> · {{ r.location }}</span>
          </div>
        </div>
        <div class="text-xs text-white/60">
          <span v-if="r.issueCount">🐞 {{ r.issueCount }}</span>
          <span
            v-if="r.attachmentCount"
            class="ml-2"
          >📎 {{ r.attachmentCount }}</span>
        </div>
      </div>
      <div
        v-if="r.descriptionPreview"
        class="px-3 py-2 text-sm text-white/80"
      >
        {{ r.descriptionPreview }}
      </div>
    </div>
    <div
      v-if="!(data.rows || []).length"
      class="text-sm text-white/50 italic"
    >
      No occupancy-phase activities yet — typically added 10 months after substantial completion.
    </div>
  </div>

  <!-- Unknown source — never crash, just nudge -->
  <div
    v-else
    class="text-sm text-amber-200"
  >
    No renderer for data source <code>{{ dataSource }}</code>.
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  dataSource: string | null
  data: any
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'add-revision', payload: { versionLabel: string; summary: string; reviserName: string; date: string }): void
  (e: 'delete-revision', id: string): void
}>()

// Manual revision-log add form (Revisions section).
const newRevision = ref({ versionLabel: '', summary: '', reviserName: '', date: '' })
function submitRevision() {
  const p = newRevision.value
  if (!p.versionLabel.trim() && !p.summary.trim()) return
  emit('add-revision', {
    versionLabel: p.versionLabel.trim(),
    summary: p.summary.trim(),
    reviserName: p.reviserName.trim(),
    date: p.date,
  })
  newRevision.value = { versionLabel: '', summary: '', reviserName: '', date: '' }
}

// Tailwind class shorthands — reused across every table block above.
const theadClass = 'bg-white/5 text-white/55 text-xs uppercase tracking-wide'
const thClass = 'text-left px-3 py-2 font-medium border-b border-white/10'
const trClass = 'border-b border-white/5 last:border-b-0 hover:bg-white/5'
const tdClass = 'px-3 py-2 align-top text-white/90'
const emptyClass = 'px-3 py-6 text-center text-white/50 italic text-sm'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  } catch (_) {
    return iso
  }
}

function severityBadge(sev: string | null | undefined) {
  switch (String(sev || '').toLowerCase()) {
    case 'critical':
      return 'bg-red-500/20 border-red-400/40 text-red-100'
    case 'high':
      return 'bg-orange-500/20 border-orange-400/40 text-orange-100'
    case 'medium':
      return 'bg-amber-500/20 border-amber-400/40 text-amber-100'
    case 'low':
      return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
    case 'comment':
      return 'bg-white/10 border-white/20 text-white/70'
    default:
      return 'bg-white/10 border-white/20 text-white/70'
  }
}

function issueStatusBadge(status: string | null | undefined) {
  switch (String(status || '').toLowerCase()) {
    case 'closed':
      return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
    case 'cancelled':
      return 'bg-white/10 border-white/20 text-white/60'
    case 'in progress':
      return 'bg-indigo-500/20 border-indigo-400/40 text-indigo-100'
    case 'pending':
      return 'bg-amber-500/20 border-amber-400/40 text-amber-100'
    case 'open':
    default:
      return 'bg-blue-500/20 border-blue-400/40 text-blue-100'
  }
}

/**
 * 3-state pill for the Scoped Systems table.
 * Values are produced by the backend's deriveScopedSystemProgress() — keep
 * the cases in sync if the heuristic learns more states.
 */
function progressBadge(status: string | null | undefined) {
  switch (String(status || '').toLowerCase()) {
    case 'complete':
      return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
    case 'in progress':
      return 'bg-indigo-500/20 border-indigo-400/40 text-indigo-100'
    case 'not started':
    default:
      return 'bg-white/10 border-white/20 text-white/70'
  }
}

/**
 * OPR coverage rollup uses four overall statuses that combine all the
 * individual link evaluations. Pill color + label centralised here.
 */
function oprStatusBadge(status: string | null | undefined) {
  switch (String(status || '').toLowerCase()) {
    case 'pass':
      return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
    case 'fail':
      return 'bg-red-500/20 border-red-400/40 text-red-100'
    case 'na':
      return 'bg-white/10 border-white/20 text-white/70'
    case 'unverified':
    default:
      return 'bg-amber-500/20 border-amber-400/40 text-amber-100'
  }
}

function oprStatusLabel(status: string | null | undefined) {
  switch (String(status || '').toLowerCase()) {
    case 'pass': return 'Verified'
    case 'fail': return 'Deviation'
    case 'na': return 'N/A'
    case 'unverified':
    default: return 'Unverified'
  }
}

function taskStatusBadge(status: string | null | undefined) {
  switch (String(status || '').toLowerCase()) {
    case 'completed':
      return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
    case 'in progress':
      return 'bg-indigo-500/20 border-indigo-400/40 text-indigo-100'
    case 'pending':
      return 'bg-amber-500/20 border-amber-400/40 text-amber-100'
    case 'deleted':
      return 'bg-white/5 border-white/10 text-white/40'
    case 'not started':
    default:
      return 'bg-white/10 border-white/20 text-white/70'
  }
}
</script>
