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
            No top-level tasks defined.
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
          <th :class="thClass + ' w-32'">
            Found by
          </th>
          <th :class="thClass + ' w-28'">
            Date
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
            {{ r.foundBy || '—' }}
          </td>
          <td :class="tdClass + ' text-white/70'">
            {{ r.dateFound || '—' }}
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

  <!-- Unknown source — never crash, just nudge -->
  <div
    v-else
    class="text-sm text-amber-200"
  >
    No renderer for data source <code>{{ dataSource }}</code>.
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dataSource: string | null
  data: any
}>()

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
