<template>
  <!-- eslint-disable vue/no-mutating-props -- ActivityEdit passes its reactive
       `form` on purpose: this panel is a page-private extension of that form
       and the page's Save button persists the mutations. -->
  <div class="mt-4 space-y-4">
    <!-- Summary of findings -->
    <details
      class="rounded-xl bg-white/5 border border-white/10"
      open
    >
      <summary class="px-4 py-2.5 cursor-pointer select-none text-white/90 font-medium">
        Summary of findings
        <span class="text-white/50 text-xs ml-2">3–5 numbered points on the report cover · section is omitted when empty</span>
      </summary>
      <div class="p-4 pt-1">
        <RichTextEditor v-model="form.summary" />
      </div>
    </details>

    <!-- Report identity -->
    <details class="rounded-xl bg-white/5 border border-white/10">
      <summary class="px-4 py-2.5 cursor-pointer select-none text-white/90 font-medium">
        Report details
        <span class="text-white/50 text-xs ml-2">report ID, next visit, revision history</span>
      </summary>
      <div class="p-4 pt-2 space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label class="block">
            <span class="text-white/60 text-xs">Report ID (blank = derived, e.g. SV-03)</span>
            <input
              v-model="form.reportId"
              type="text"
              placeholder="SV-03"
              class="mt-1 w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 text-white placeholder-white/30"
            >
          </label>
          <label class="block">
            <span class="text-white/60 text-xs">Next site visit (date or condition)</span>
            <input
              v-model="form.nextVisitDate"
              type="text"
              placeholder="Week of July 13"
              class="mt-1 w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 text-white placeholder-white/30"
            >
          </label>
        </div>
        <div>
          <div class="flex items-center justify-between">
            <span class="text-white/60 text-xs">Revision history (latest row prints on the cover and footer)</span>
            <button
              type="button"
              class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/80 text-xs"
              @click="addRevision"
            >
              + Add revision
            </button>
          </div>
          <div
            v-for="(r, i) in form.revisions"
            :key="i"
            class="mt-2 grid grid-cols-12 gap-2 items-center"
          >
            <input
              v-model.number="r.rev"
              type="number"
              min="0"
              title="Rev"
              class="col-span-2 md:col-span-1 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm"
            >
            <input
              v-model="r.date"
              type="date"
              title="Date"
              class="col-span-4 md:col-span-2 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm"
            >
            <input
              v-model="r.description"
              type="text"
              placeholder="Issued for distribution"
              class="col-span-12 md:col-span-6 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
            >
            <input
              v-model="r.by"
              type="text"
              placeholder="By"
              class="col-span-10 md:col-span-2 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
            >
            <button
              type="button"
              class="col-span-2 md:col-span-1 text-rose-300/80 hover:text-rose-300 text-sm"
              title="Remove revision"
              @click="form.revisions.splice(i, 1)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </details>

    <!-- Structured meeting sessions -->
    <details class="rounded-xl bg-white/5 border border-white/10">
      <summary class="px-4 py-2.5 cursor-pointer select-none text-white/90 font-medium">
        Meeting sessions
        <span class="text-white/50 text-xs ml-2">structured minutes · when empty the report parses the description's H3 headings</span>
      </summary>
      <div class="p-4 pt-2 space-y-3">
        <div
          v-for="(s, i) in form.sessions"
          :key="i"
          class="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              v-model="s.name"
              type="text"
              placeholder="Session name (e.g. Cx site walk)"
              class="rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
            >
            <input
              v-model="s.time"
              type="text"
              placeholder="9:00 – 10:00 AM"
              class="rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
            >
            <div class="flex gap-2">
              <input
                v-model="s.location"
                type="text"
                placeholder="Location / participants"
                class="flex-1 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
              >
              <button
                type="button"
                class="text-rose-300/80 hover:text-rose-300 text-sm px-1"
                title="Remove session"
                @click="form.sessions.splice(i, 1)"
              >
                ✕
              </button>
            </div>
          </div>
          <textarea
            :value="(s.bullets || []).join('\n')"
            rows="4"
            placeholder="One bullet per line. Start a line with 'Decision:' to bold it; end with '→ Issues #2, #3' or '→ A-1' for an accent cross-reference."
            class="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
            @input="s.bullets = String(($event.target as HTMLTextAreaElement).value || '').split('\n').map(v => v.trim()).filter(Boolean)"
          />
        </div>
        <button
          type="button"
          class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/80 text-xs"
          @click="form.sessions.push({ name: '', time: '', location: '', bullets: [] })"
        >
          + Add session
        </button>
      </div>
    </details>

    <!-- Attendance -->
    <details class="rounded-xl bg-white/5 border border-white/10">
      <summary class="px-4 py-2.5 cursor-pointer select-none text-white/90 font-medium">
        Attendance & distribution
        <span class="text-white/50 text-xs ml-2">project team is the distribution list · check who was present</span>
      </summary>
      <div class="p-4 pt-2 space-y-3">
        <!-- Project team (from Project Settings > Team) -->
        <div v-if="teamRows.length">
          <div class="text-white/60 text-xs mb-1.5">
            Project team — ● prints as present, ○ as distribution only
          </div>
          <div
            v-for="a in teamRows"
            :key="attendeeKey(a)"
            class="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-b-0"
          >
            <label
              class="inline-flex items-center gap-2 text-white/80 text-sm cursor-pointer min-w-24"
              title="Present at this activity"
            >
              <input
                v-model="a.signedIn"
                type="checkbox"
                class="rounded bg-white/10 border-white/20"
              >
              Present
            </label>
            <span
              class="text-sm"
              :class="a.signedIn ? 'text-white font-medium' : 'text-white/60'"
            >{{ a.name }}</span>
            <span class="text-white/40 text-xs truncate">{{ [a.company, a.role].filter(Boolean).join(' · ') }}</span>
          </div>
        </div>
        <div
          v-else
          class="text-white/40 text-xs"
        >
          No team members yet — add them under Project Settings → Team and they'll appear here.
        </div>

        <!-- Additional attendees (not on the project team) -->
        <div>
          <div class="text-white/60 text-xs mb-1.5 mt-1">
            Additional attendees
          </div>
          <div
            v-for="a in guestRows"
            :key="attendeeKey(a)"
            class="grid grid-cols-12 gap-2 items-center mb-1.5"
          >
            <label
              class="col-span-2 md:col-span-1 inline-flex items-center gap-1 text-white/70 text-xs"
              title="Present at this activity"
            >
              <input
                v-model="a.signedIn"
                type="checkbox"
                class="rounded bg-white/10 border-white/20"
              >
              <span class="hidden md:inline">Pres.</span>
            </label>
            <input
              v-model="a.name"
              type="text"
              placeholder="Name"
              class="col-span-10 md:col-span-3 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
            >
            <input
              v-model="a.company"
              type="text"
              placeholder="Company"
              class="col-span-5 md:col-span-3 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm placeholder-white/30"
            >
            <select
              v-model="a.role"
              class="col-span-5 md:col-span-4 rounded-md bg-white/10 border border-white/15 px-2 py-1.5 text-white text-sm [&>option]:bg-slate-800 [&>option]:text-white"
            >
              <option value="">
                Role…
              </option>
              <option
                v-for="r in roleChoices(a)"
                :key="r"
                :value="r"
              >
                {{ r }}
              </option>
            </select>
            <button
              type="button"
              class="col-span-2 md:col-span-1 text-rose-300/80 hover:text-rose-300 text-sm"
              title="Remove attendee"
              @click="removeAttendee(a)"
            >
              ✕
            </button>
          </div>
          <div class="flex items-center gap-2 flex-wrap pt-1">
            <button
              type="button"
              class="px-2 py-1 rounded-md bg-white/10 border border-white/20 hover:bg-white/15 text-white/80 text-xs"
              @click="form.attendees.push({ name: '', company: '', email: '', role: '', signedIn: true })"
            >
              + Add attendee
            </button>
            <select
              v-if="importCandidates.length"
              class="rounded-md bg-white/10 border border-white/15 px-2 py-1 text-white/80 text-xs [&>option]:bg-slate-800 [&>option]:text-white"
              @change="importFrom(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
            >
              <option value="">
                Import from another activity…
              </option>
              <option
                v-for="c in importCandidates"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }} ({{ c.attendees.length }})
              </option>
            </select>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props -- see template note: the parent's
   reactive form is mutated by design; the page's Save persists. */
// Stage 3 of the Activity report redesign: edits the Stage 2 fields on the
// activity form (summary, reportId, nextVisitDate, revisions, sessions,
// attendees). Mutates the parent's reactive `form`; the page's Save persists.
//
// Attendance model: the PROJECT TEAM (Project Settings > Team) is the
// distribution list. Team members sync into form.attendees automatically
// (distribution-only until their Present box is checked); ad-hoc guests are
// added below and default to present.
import { computed, watch } from 'vue'
import RichTextEditor from '../RichTextEditor.vue'

const props = defineProps<{
  form: any
  /** Project team members (name/company/email/role) — the distribution list. */
  team: Array<{ name: string; company: string; email: string; role: string }>
  /** Role choices for attendees (from project teamRoleOptions). */
  roleOptions: string[]
  /** Other activities offering attendee lists to copy. */
  importCandidates: Array<{ id: string; name: string; attendees: any[] }>
}>()

const normKey = (a: any) => (String(a?.email || '').trim().toLowerCase())
  || `${String(a?.name || '').trim().toLowerCase()}|${String(a?.company || '').trim().toLowerCase()}`

// Row keys must be STABLE while typing — a key derived from the name/email
// recreates the input on every keystroke and drops focus. Key by object
// identity instead.
const uidMap = new WeakMap<object, number>()
let uidSeq = 0
function attendeeKey(a: any): number {
  if (!uidMap.has(a)) uidMap.set(a, ++uidSeq)
  return uidMap.get(a) as number
}

/** The row's role plus the project options (so a custom value still shows). */
function roleChoices(a: any): string[] {
  const cur = String(a?.role || '').trim()
  const base = props.roleOptions.filter(Boolean)
  return cur && !base.includes(cur) ? [cur, ...base] : base
}

const teamKeys = computed(() => new Set(props.team.map(normKey).filter(k => k && k !== '|')))

/** Attendee rows that correspond to project team members. */
const teamRows = computed(() => props.form.attendees.filter((a: any) => teamKeys.value.has(normKey(a))))
/** Everyone else (ad-hoc guests). */
const guestRows = computed(() => props.form.attendees.filter((a: any) => !teamKeys.value.has(normKey(a))))

// Keep every team member on the attendee list (distribution-only by default);
// refreshes when the team loads or changes. Never removes rows.
watch(() => props.team, (team) => {
  const have = new Set(props.form.attendees.map(normKey))
  for (const m of (team || [])) {
    const k = normKey(m)
    if (!k || k === '|' || have.has(k)) continue
    have.add(k)
    props.form.attendees.push({
      name: String(m.name || ''),
      company: String(m.company || ''),
      email: String(m.email || ''),
      role: String(m.role || ''),
      signedIn: false,
    })
  }
}, { immediate: true, deep: true })

function removeAttendee(a: any) {
  const i = props.form.attendees.indexOf(a)
  if (i >= 0) props.form.attendees.splice(i, 1)
}

function addRevision() {
  const last = props.form.revisions[props.form.revisions.length - 1]
  props.form.revisions.push({
    rev: last ? Number(last.rev || 0) + 1 : 0,
    date: new Date().toISOString().slice(0, 10),
    description: props.form.revisions.length ? '' : 'Issued for distribution',
    by: '',
  })
}

function importFrom(activityId: string) {
  if (!activityId) return
  const c = props.importCandidates.find(x => x.id === activityId)
  if (!c) return
  const existing = new Set(props.form.attendees.map(normKey))
  for (const a of c.attendees) {
    const key = normKey(a)
    if (!a?.name || !key || key === '|' || existing.has(key)) continue
    existing.add(key)
    props.form.attendees.push({
      name: String(a.name || ''),
      company: String(a.company || ''),
      email: String(a.email || ''),
      role: String(a.role || ''),
      signedIn: a.signedIn !== false,
    })
  }
}
</script>
