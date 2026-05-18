// Cx Plan starter generator.
//
// Produces a Commissioning Plan in HTML, mirroring the structure of the
// representative document the team uses today (Pond & Co. "Boston Scientific
// – Arbor Lakes" Cx Plan). The role-and-responsibility sections and the
// activity-phase narratives are static boilerplate. The project/team/
// milestones/sampling sections are populated from live data passed in by
// the caller.
//
// The result is *starter* content. The user is expected to edit it in the
// WYSIWYG editor before treating it as the project's actual Cx Plan.

export interface CxPlanProject {
  name?: string
  startDate?: string | Date | null
  endDate?: string | Date | null
  team?: Array<CxPlanTeamMember> | null
  commissioning_agent?: { firstName?: string; lastName?: string; email?: string; company?: string; role?: string } | null
}

export interface CxPlanTeamMember {
  firstName?: string
  lastName?: string
  email?: string
  company?: string
  role?: string
  phone?: string
}

export interface CxPlanTask {
  name?: string
  wbs?: string | null
  start?: string | Date | null
  end?: string | Date | null
  status?: string
  description?: string
}

export interface CxPlanSystem {
  name?: string
  type?: string
  tag?: string
}

export interface CxPlanEquipment {
  tag?: string
  type?: string
  system?: string
}

export interface CxPlanInput {
  project?: CxPlanProject | null
  tasks?: CxPlanTask[] | null
  systems?: CxPlanSystem[] | null
  equipment?: CxPlanEquipment[] | null
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(d: unknown): string {
  if (!d) return ''
  try {
    const dt = new Date(d as string)
    if (isNaN(dt.getTime())) return ''
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '' }
}

function todayFormatted(): string {
  return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

function fullName(m: CxPlanTeamMember): string {
  const f = String(m.firstName || '').trim()
  const l = String(m.lastName || '').trim()
  return [f, l].filter(Boolean).join(' ')
}

// WBS depth: '1' → 0, '1.2' → 1, '1.2.3' → 2. Used to pick top-level tasks
// as milestone candidates when no explicit milestone flag exists.
function wbsDepth(wbs?: string | null): number {
  const s = String(wbs || '').trim()
  if (!s) return Number.POSITIVE_INFINITY
  return Math.max(0, s.split('.').length - 1)
}

// ---------------------------------------------------------------------------
// Static boilerplate sections (verbatim-ish from the reference doc)
// ---------------------------------------------------------------------------

function purposeHtml(): string {
  return `
    <h2>Purpose</h2>
    <p>The Commissioning Plan provides a roadmap of the commissioning process for this project. It serves as a reference for all project team members and acts as a repository for the records and the results of the commissioning process.</p>
    <p>Since the Commissioning Plan contains the results of the process, it can be considered a living document where the results are added throughout the process. The basic process and procedures followed throughout the project are detailed in the main body of the Commissioning Plan; materials and information developed during the commissioning process will be included in appendices. At the end of the process, the Commissioning Plan will become the Final Commissioning Report summarising key commissioning deliverables.</p>
  `
}

function revisionsHtml(): string {
  const today = new Date().toLocaleDateString()
  return `
    <h2>Revisions</h2>
    <table>
      <thead>
        <tr><th>Version</th><th>Details</th><th>Reviser</th><th>Revision Date</th></tr>
      </thead>
      <tbody>
        <tr><td>DRAFT</td><td>Initial Cx Plan starter generated from project data</td><td>—</td><td>${esc(today)}</td></tr>
      </tbody>
    </table>
  `
}

function cxScopeHtml(): string {
  return `
    <h2>Cx Scope of Work</h2>
    <ol>
      <li>Review the OPR, BOD, and project design.</li>
      <li>Develop and implement a Cx plan.</li>
      <li>Confirm incorporation of Cx requirements into the construction documents.</li>
      <li>Develop construction checklists.</li>
      <li>Develop a system test procedure (Functional Performance Tests).</li>
      <li>Verify system test execution.</li>
      <li>Maintain an issues and benefits log throughout the Cx process.</li>
      <li>Prepare a final Cx process report.</li>
      <li>Document all findings, recommendations, and report directly to the owner throughout the process.</li>
      <li>Review contractor submittals.</li>
      <li>Verify inclusion of systems manual requirements in construction documents.</li>
      <li>Verify inclusion of operator and occupant training requirements in construction documents.</li>
      <li>Verify systems manual updates and delivery.</li>
      <li>Verify operator and occupant training delivery and effectiveness.</li>
      <li>Verify seasonal testing.</li>
      <li>Review building operations 10 months after substantial completion.</li>
      <li>Develop an on-going commissioning plan.</li>
    </ol>
  `
}

function rolesAndResponsibilitiesHtml(): string {
  return `
    <h2>Roles and Responsibilities</h2>
    <p>Each party involved in the design and construction phases has a unique role and is dependent on the other parties to achieve a successful project. A summary is provided below.</p>

    <h3>All Parties</h3>
    <p>All parties are responsible for following the Commissioning Plan and attending commissioning meetings as necessary.</p>

    <h3>Owner</h3>
    <p>The owner or owner's representative is responsible for selecting and hiring the commissioning provider directly. The CxP works cooperatively with the design and construction teams but keeps the owner's best interest in mind; all results and findings are reported back to the owner.</p>
    <ol>
      <li>Develop and commit to the owner's project requirements for the facility and its use.</li>
      <li>Provide input on the scope and format for required testing and documentation including systems manuals and training.</li>
      <li>Provide basic information for the project schedule.</li>
      <li>Assign operations and maintenance personnel and schedule them to participate in meetings, training sessions, and observations/inspections.</li>
      <li>Review and approve any changes made to the owner's project requirements.</li>
      <li>Review and approve the Construction Documents.</li>
      <li>Review and comment on the CxP's Commissioning Process progress and verification reports.</li>
      <li>Review and accept the CxP's Commissioning Process Final Report.</li>
    </ol>

    <h3>Commissioning Provider (CxP)</h3>
    <p>The CxP acts as an independent third party on behalf of the owner to document the OPR and to continually review the design, construction, and turnover of the building to verify that the owner's project requirements are met.</p>
    <ol>
      <li>Organise and lead the Commissioning Team.</li>
      <li>Develop the owner's project requirements.</li>
      <li>Develop and integrate the Commissioning Process activities into the project schedule.</li>
      <li>Prepare and maintain the Commissioning Plan.</li>
      <li>Review and comment on the design documents' ability to achieve the owner's project requirements.</li>
      <li>Prepare the Commissioning Process sections to be included as part of the project specifications.</li>
      <li>Coordinate and facilitate pre-construction commissioning meetings and commissioning meetings as required.</li>
      <li>Develop the Issues Log format for each phase of the Commissioning Process.</li>
      <li>Develop construction checklists and provide the Contractor with final checklists in approved format.</li>
      <li>Review submittals applicable to systems being commissioned, concurrent with the A/E reviews.</li>
      <li>Verify system and equipment installation through site visits and completed construction checklists.</li>
      <li>Review and comment on the Contractor's training program; attend a portion of training sessions.</li>
      <li>Receive and review the O&amp;M documentation submitted by the Contractor.</li>
      <li>Develop and supervise functional test procedures.</li>
      <li>Conduct warranty review during the 10-month period of initial occupancy.</li>
      <li>Prepare the final Commissioning Process Report and recommend final acceptance to the owner.</li>
    </ol>

    <h3>Design Professionals (A/E)</h3>
    <p>The A/E develops construction documents that allow the Contractors to build the building and its associated systems. The A/E is also responsible for reviewing and approving shop drawings, O&amp;M manuals, and other items submitted by the Contractors with third-party input from the CxP.</p>
    <ol>
      <li>Participate in documenting the initial owner's project requirements.</li>
      <li>Document the Basis of Design (BoD) with narrative descriptions for each system and assembly.</li>
      <li>Prepare Contract Documents that integrate the Commissioning Process requirements.</li>
      <li>Attend design review meetings and respond to Commissioning Team comments.</li>
      <li>Provide design narrative documentation as requested by the CxP.</li>
      <li>Schedule and attend construction-phase commissioning meetings.</li>
      <li>Review and approve submittals, O&amp;M data, training programs, and as-builts.</li>
      <li>Review functional test procedures submitted by the CxP.</li>
      <li>Coordinate resolution of system deficiencies identified during commissioning.</li>
      <li>Review and comment on the final Commissioning Process Report.</li>
    </ol>

    <h3>Contractors</h3>
    <p>The Contractors construct a quality building and associated systems that meet the owner's requirements per the construction documents.</p>
    <ol>
      <li>Facilitate the coordination of commissioning work by the CxP and with other contractors.</li>
      <li>Include the cost of commissioning support in the total contract price.</li>
      <li>Verify commissioning activities are scheduled into the master schedule.</li>
      <li>Attend commissioning meetings as requested.</li>
      <li>Furnish construction documents, addenda, change orders, and approved submittals to the CxP.</li>
      <li>Complete construction verification checklists per specifications and provide tracking reports.</li>
      <li>Resolve and document checklist discrepancies noted by the CxP.</li>
      <li>Review and approve functional performance test procedures submitted by the CxP.</li>
      <li>Provide contractor readiness notification and assist the CxP during functional and seasonal testing.</li>
      <li>Coordinate and facilitate the training of Owner personnel.</li>
      <li>Prepare O&amp;M data, including as-built conditions, per the Contract Documents.</li>
    </ol>

    <h3>Equipment and Material Suppliers</h3>
    <ol>
      <li>Provide all requested submittal data, including detailed start-up procedures and warranty responsibilities.</li>
      <li>Assist in equipment testing per agreements with the Contractor.</li>
      <li>Include all special tools and instruments required for testing in the base bid to the Contractor.</li>
      <li>Provide information requested by the CxP regarding equipment sequence of operation and testing procedures.</li>
      <li>Review and approve test procedures for equipment installed by factory representatives.</li>
    </ol>

    <h3>Communication Plan</h3>
    <p>Communication resulting from, or in relation to, commissioning activities will be relayed directly to the responsible party whenever possible, with copies to the Owner, A/E, and Contractor.</p>
  `
}

function activitiesOverviewHtml(): string {
  return `
    <h2>Commissioning Activities Overviews</h2>

    <h3>Design Phase</h3>
    <ol>
      <li><strong>Owners Project Requirements Review</strong> — The CxP reviews any existing OPR documentation and tailors it to this specific project. If no OPR exists, the CxP develops one with the Owner through interviews and review of existing client documents.</li>
      <li><strong>Basis of Design Review</strong> — The CxP reviews the design team's BoD document for adherence to the OPR, completeness of system narratives, performance criteria, applicable codes, design assumptions, energy considerations, and supporting calculations.</li>
      <li><strong>Design Reviews</strong> — Early detection of issues is a cornerstone of the commissioning process. The CxP reviews the complete design submittal for adherence to the OPR, maintainability, drawing readability, test/balance/Cx capabilities, constructability, coordination between trades, and energy-efficiency opportunities.</li>
      <li><strong>Commissioning Specifications</strong> — The CxP develops Cx specifications covering the Cx process, construction verification, functional performance testing, O&amp;M, training, and demonstration, and incorporates them into the construction document package.</li>
    </ol>

    <h3>Construction Phase</h3>
    <ol>
      <li><strong>Pre-Construction Meeting</strong> — The CxP attends to introduce the Cx process and integrate Cx activities into the construction schedule.</li>
      <li><strong>Submittal Reviews</strong> — The CxP reviews submittals for compliance with the OPR, BoD, and contract documents, concurrent with the A/E.</li>
      <li><strong>Construction Checklists</strong> — The CxP develops pre-functional checklists (PFPT) for each piece of equipment, reviews them with the Subs, and tracks completion.</li>
      <li><strong>Site Visits and Cx Meetings</strong> — The CxP holds commissioning meetings, performs site observation, verifies checklist quality through random sampling, monitors as-built drawings, and witnesses initial start-up of major equipment.</li>
      <li><strong>Functional Performance Test (FPT) Development</strong> — The CxP uses the approved BAS sequences to write FPT scripts, reviews them with the BAS contractor and A/E in a pre-test meeting, and publishes them for execution.</li>
      <li><strong>Testing, Adjusting and Balancing (TAB) Verification</strong> — The CxP samples the TAB report and double-checks roughly 10% of the system; significant issues trigger contractor rebalance.</li>
      <li><strong>Functional Performance Testing</strong> — The CxP witnesses and directs FPTs in all modes of operation (start/stop, scheduling, heating, cooling, humidity, pressure, ventilation, reset strategies, etc.).</li>
      <li><strong>Training Review</strong> — The CxP oversees the contractor-led training program for the facilities maintenance staff.</li>
      <li><strong>O&amp;M Manual Review</strong> — The CxP verifies the contractor has provided all information required to install, operate, maintain, and troubleshoot the commissioned systems.</li>
    </ol>

    <h3>Warranty Phase</h3>
    <ol>
      <li><strong>Final Report</strong> — The CxP compiles a final report describing scope, activities, problems avoided, and outcomes. The Cx Plan becomes the final commissioning report.</li>
      <li><strong>Seasonal Testing</strong> — Systems that could not be tested at full load during construction are tested seasonally per the developed FPT procedures.</li>
      <li><strong>Warranty Review</strong> — Review system warranties, schedule a site visit, meet with the Owner's staff, document issues, and provide recommendations. Include results in the final Cx report.</li>
    </ol>
  `
}

function samplingMethodologiesHtml(): string {
  return `
    <h2>Sampling Methodologies</h2>
    <h3>Construction Checklists</h3>
    <p>Construction checklists will be provided for 100% of all major pieces of equipment (AHUs, exhaust fans, pumps, etc.). For high-count equipment such as terminal units and plumbing/light fixtures, a 20% sampling approach will be taken for pre-functional checklist review and Functional Performance Testing. Installation review will include 100% review.</p>
  `
}

// ---------------------------------------------------------------------------
// Dynamic sections
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section markers
//
// Sections that are derived from live project data (title, team, milestones,
// systems) are wrapped in invisible <div data-cx-plan-marker="<name>-(start|end)">
// sentinels so a later "Refresh data tables" action — or the AI Agent —
// can find them and replace just that block without disturbing user edits
// elsewhere in the document.
//
// Marker shape:
//   <div data-cx-plan-marker="<name>-start"></div>
//     …content…
//   <div data-cx-plan-marker="<name>-end"></div>
//
// We use div sentinels (not HTML comments) because the TipTap editor
// strips HTML comments through its ProseMirror schema. The
// RichTextEditor component registers a CxPlanMarker node extension so
// these divs round-trip through the editor.
//
// Backwards compatibility: refreshCxPlanSections + hasCxPlanMarkers also
// recognise the older <!-- cx-plan:* --> comment form for any Cx Plan
// generated before this change. New plans always use the div form.
//
// Static sections (Purpose / Cx Scope / Roles / Activity Overviews /
// Sampling) carry no markers because there's nothing to refresh from data.
// ---------------------------------------------------------------------------

export type CxPlanSectionName = 'title' | 'systems' | 'milestones' | 'team'
const SECTION_NAMES: CxPlanSectionName[] = ['title', 'systems', 'milestones', 'team']

function wrapSection(name: CxPlanSectionName, html: string): string {
  return [
    `<div data-cx-plan-marker="${name}-start"></div>`,
    html,
    `<div data-cx-plan-marker="${name}-end"></div>`,
  ].join('\n')
}

function buildSectionRegex(name: CxPlanSectionName): RegExp {
  // Match either the new div form or the legacy HTML-comment form.
  // start marker → content → end marker, lazy in between.
  const escName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const startPat = `(?:<div\\s+data-cx-plan-marker=["']${escName}-start["']\\s*>\\s*</div>|<!--\\s*cx-plan:${escName}-start\\s*-->)`
  const endPat = `(?:<div\\s+data-cx-plan-marker=["']${escName}-end["']\\s*>\\s*</div>|<!--\\s*cx-plan:${escName}-end\\s*-->)`
  return new RegExp(`${startPat}[\\s\\S]*?${endPat}`, 'i')
}

/**
 * Surgically replace the contents of named cx-plan section markers in an
 * existing description HTML. Returns the updated HTML and a list of sections
 * actually found (so the caller can warn the user when nothing matched —
 * e.g. an old Cx Plan generated before markers existed).
 *
 * Static sections (purpose, scope, roles, etc.) are never touched.
 */
export function refreshCxPlanSections(
  currentHtml: string,
  input: CxPlanInput,
): { html: string; refreshed: CxPlanSectionName[]; missing: CxPlanSectionName[] } {
  const project: CxPlanProject = (input && input.project) || {}
  const fresh: Record<CxPlanSectionName, string> = {
    title: wrapSection('title', titleAndCoverInner(project)),
    systems: wrapSection('systems', systemsTableInner(input?.equipment || null)),
    milestones: wrapSection('milestones', milestonesTableInner(input?.tasks || null)),
    team: wrapSection('team', commissioningTeamInner(project)),
  }
  let out = String(currentHtml || '')
  const refreshed: CxPlanSectionName[] = []
  const missing: CxPlanSectionName[] = []
  for (const name of SECTION_NAMES) {
    const re = buildSectionRegex(name)
    if (re.test(out)) {
      out = out.replace(re, fresh[name])
      refreshed.push(name)
    } else {
      missing.push(name)
    }
  }
  return { html: out, refreshed, missing }
}

/** Returns true if any cx-plan section marker is present in the HTML.
 *  Recognises both the new div sentinel form and the legacy comment form. */
export function hasCxPlanMarkers(html: string | null | undefined): boolean {
  const s = String(html || '')
  return /<div\s+data-cx-plan-marker=["'][a-z-]+-(start|end)["']\s*>\s*<\/div>/i.test(s)
      || /<!--\s*cx-plan:[a-z-]+-(start|end)\s*-->/i.test(s)
}

function projectDescriptionHtml(project: CxPlanProject): string {
  const name = String(project.name || 'this project').trim() || 'this project'
  return `
    <h2>Project Description</h2>
    <p><em>${esc(name)} — replace this paragraph with a description of the project, including building type, square footage, programmes (e.g. labs, offices, kitchens), and intended use.</em></p>
    <p>Systems within Cx scope include mechanical, electrical, plumbing, life safety, lighting controls, BMS, and any other systems identified in the Cx Scope of Work below.</p>
  `
}

function systemsTableInner(equipment: CxPlanEquipment[] | null | undefined): string {
  const rows: Array<{ name: string; count: number }> = []
  const counts = new Map<string, number>()
  for (const e of equipment || []) {
    const key = String(e?.type || '').trim() || 'Unspecified'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  if (counts.size === 0) {
    return `
      <h2>Systems to be Commissioned / Sampling Methodology</h2>
      <p><em>No equipment found in this project yet. Once equipment is added, this section will list each commissioned system type with quantity and sampling rates.</em></p>
    `
  }
  for (const [name, count] of counts) rows.push({ name, count })
  rows.sort((a, b) => b.count - a.count)
  const bodyRows = rows.map((r) => `
    <tr>
      <td>${esc(r.name)}</td>
      <td>${esc(r.count)}</td>
      <td>100%</td>
      <td>100%</td>
      <td>100%</td>
      <td>100%</td>
    </tr>
  `).join('')
  return `
    <h2>Systems to be Commissioned / Sampling Methodology</h2>
    <p>The following table lists the systems to be commissioned. The commissioning activities outlined will be completed for each of the listed systems. Sampling rates default to 100%; adjust where lower sampling has been agreed.</p>
    <table>
      <thead>
        <tr>
          <th>Commissioned System</th>
          <th>Quantity</th>
          <th>As-Built Verification (PFPT)</th>
          <th>BAS Verification</th>
          <th>TAB Verification</th>
          <th>FPT (inc. BMS Testing)</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `
}

function milestonesTableInner(tasks: CxPlanTask[] | null | undefined): string {
  const list = (tasks || []).slice()
  // Prefer top-level WBS tasks as project-level milestones. If none exist
  // (project has only flat tasks), fall back to all tasks sorted by start.
  const topLevel = list.filter((t) => wbsDepth(t.wbs) === 0)
  const chosen = (topLevel.length ? topLevel : list)
    .slice()
    .sort((a, b) => {
      const aw = String(a.wbs || '').localeCompare(String(b.wbs || ''), undefined, { numeric: true })
      if (aw !== 0) return aw
      const at = a.start ? new Date(a.start as string).getTime() : 0
      const bt = b.start ? new Date(b.start as string).getTime() : 0
      return at - bt
    })
  if (!chosen.length) {
    return `
      <h2>Project Cx Milestones</h2>
      <p><em>No tasks have been added to this project yet. Once tasks are created (Tasks page), top-level WBS items will populate this milestone table automatically the next time you regenerate the starter.</em></p>
    `
  }
  const bodyRows = chosen.map((t) => `
    <tr>
      <td>${esc(t.name || t.wbs || '—')}</td>
      <td>${esc(formatDate(t.end) || formatDate(t.start) || 'T.B.D.')}</td>
      <td>${esc(t.description || '—')}</td>
      <td>${esc(t.status || 'Not Started')}</td>
    </tr>
  `).join('')
  return `
    <h2>Project Cx Milestones</h2>
    <table>
      <thead>
        <tr><th>Milestone</th><th>Approx. Date</th><th>Deliverable</th><th>Status</th></tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <p><em>Note: project milestones are included to provide a high-level view of the Cx Scope. They are not intended to replace the integration of the Cx schedule into the project schedule.</em></p>
  `
}

function commissioningTeamInner(project: CxPlanProject): string {
  const team = Array.isArray(project.team) ? project.team : []
  const cxa = project.commissioning_agent || null
  if (!team.length && !cxa) {
    return `
      <h2>Commissioning Team</h2>
      <p><em>The project has no team members yet. Add members on the Project Settings → Team tab, then regenerate the starter to populate this section.</em></p>
    `
  }
  const all: CxPlanTeamMember[] = []
  if (cxa && (cxa.firstName || cxa.lastName || cxa.email)) {
    all.push({
      firstName: cxa.firstName,
      lastName: cxa.lastName,
      email: cxa.email,
      company: cxa.company,
      role: cxa.role || 'Commissioning Authority',
    })
  }
  for (const m of team) all.push(m)
  const bodyRows = all.map((m) => `
    <tr>
      <td>${esc(fullName(m) || '—')}</td>
      <td>${esc(m.email || '—')}</td>
      <td>${esc(m.phone || '—')}</td>
      <td>${esc(m.company || '—')}</td>
      <td>${esc(m.role || '—')}</td>
    </tr>
  `).join('')
  return `
    <h2>Commissioning Team</h2>
    <table>
      <thead>
        <tr><th>Name</th><th>Email</th><th>Phone</th><th>Company</th><th>Role</th></tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `
}

function titleAndCoverInner(project: CxPlanProject): string {
  const name = String(project.name || 'Project').trim() || 'Project'
  return `
    <h1>Commissioning Plan</h1>
    <h2>${esc(name)}</h2>
    <p><strong>Date:</strong> ${esc(todayFormatted())}</p>
    <hr/>
  `
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function buildCxPlanHtml(input: CxPlanInput): string {
  const project: CxPlanProject = (input && input.project) || {}
  const tasks = input?.tasks || null
  const equipment = input?.equipment || null
  return [
    wrapSection('title', titleAndCoverInner(project)),
    purposeHtml(),
    revisionsHtml(),
    projectDescriptionHtml(project),
    cxScopeHtml(),
    wrapSection('systems', systemsTableInner(equipment)),
    wrapSection('milestones', milestonesTableInner(tasks)),
    wrapSection('team', commissioningTeamInner(project)),
    rolesAndResponsibilitiesHtml(),
    activitiesOverviewHtml(),
    samplingMethodologiesHtml(),
    '<p><strong>End of Cx Plan</strong></p>',
  ].join('\n')
}
