/**
 * Boilerplate prose templates for the Cx Final Report.
 *
 * The Final Report's section blueprint is mostly data sources (rendered from
 * existing project data), but a handful of sections are genuinely narrative
 * and the CxA shouldn't have to write them from scratch every project:
 * Purpose, Cx Scope of Work, Roles and Responsibilities, Transition to
 * Ongoing Cx Plan, Sign-offs.
 *
 * Each template here returns sanitised HTML that's safe to set as the
 * RichTextEditor's `v-model`. Templates are LEED-target-aware — if the
 * project is pursuing LEED v5 the scope language references the v5
 * prerequisite and credit text; if it's not a LEED project we fall back to
 * G0-only phrasing.
 */

export type LeedTarget = 'none' | 'v4' | 'v4.1' | 'v5' | 'other' | null | undefined

export interface CxScope {
  fundamentalCx?: boolean
  enhancedCxMep?: boolean
  enhancedCxEnvelope?: boolean
  mbcxBasic?: boolean
  mbcxEnhanced?: boolean
  envelopeCx?: boolean
  ongoingCx?: boolean
}

export interface TemplateContext {
  projectName?: string
  client?: string
  buildingType?: string
  leedTarget?: LeedTarget
  leedCertificationLevel?: string | null
  cxScope?: CxScope
  cxaName?: string
  cxaCompany?: string
}

/**
 * Escape user-provided text before splicing it into the templated HTML.
 * Templates use safe HTML elements but we don't want a stray `<` in a
 * client name to break the markup.
 */
function escape(s: string | undefined | null): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function leedClause(target: LeedTarget, level: string | null | undefined): string {
  const t = String(target || '').toLowerCase()
  if (!t || t === 'none' || t === 'other') return ''
  const v = t === 'v4' ? 'LEED v4' : t === 'v4.1' ? 'LEED v4.1' : 'LEED v5'
  const lvl = level ? ` ${String(level).charAt(0).toUpperCase()}${String(level).slice(1)}` : ''
  return `${v} BD+C${lvl}`
}

/**
 * Purpose section — the standard opening narrative. References ASHRAE
 * Guideline 0 and the project's LEED pursuit if applicable.
 */
export function purposeTemplate(ctx: TemplateContext): string {
  const project = escape(ctx.projectName) || 'this project'
  const leed = leedClause(ctx.leedTarget, ctx.leedCertificationLevel)
  const leedSentence = leed
    ? ` This report supports the project's pursuit of ${leed} certification, fulfilling the documentation requirements of EA Prerequisite: Fundamental Commissioning and Verification${ctx.cxScope?.enhancedCxMep || ctx.cxScope?.enhancedCxEnvelope || ctx.cxScope?.mbcxBasic || ctx.cxScope?.mbcxEnhanced ? ' and EA Credit: Enhanced Commissioning' : ''}.`
    : ''
  return `<p>The purpose of this Commissioning Final Report for ${project} is to provide a comprehensive record of all commissioning activities performed during the design, construction, and acceptance phases, demonstrating that each commissioned system meets the established Owner's Project Requirements (OPR) and aligns with the Basis of Design (BoD).</p>
<p>This report documents functional performance test results, issue identification and resolution, system observations, training verification, and any outstanding items requiring follow-up. It also captures recommendations for optimization and lessons learned that will inform the building's operational strategies moving forward.${leedSentence}</p>
<p>The Final Report serves as a critical handoff document to the Owner's Facilities Team, ensuring that all commissioning findings are clearly communicated and preserved to support effective system operation, maintenance, and the transition into the Ongoing Commissioning (OCx) program.</p>`
}

/**
 * Cx Scope of Work — generated from the project's cxScope flags. Reads
 * almost exactly like the LEED v4.1 scope list in the Boston Scientific
 * sample report when ECx+MBCx are enabled.
 */
export function cxScopeOfWorkTemplate(ctx: TemplateContext): string {
  const scope = ctx.cxScope || {}
  const leed = leedClause(ctx.leedTarget, ctx.leedCertificationLevel)
  const lines: string[] = []
  if (scope.fundamentalCx) {
    lines.push(`Provide Fundamental Commissioning per ${leed ? leed + ' EA Prerequisite' : 'ASHRAE Guideline 0'}, including OPR review, BoD review, Cx Plan development, construction checklists, functional performance testing, issues log maintenance, and Final Cx Report delivery.`)
  }
  if (scope.enhancedCxMep) {
    lines.push('Provide Enhanced Commissioning for MEP Systems per ANSI/ASHRAE/IES Standard 202-2024, including ≥2 design coordination meetings, training verification, and post-occupancy review.')
  }
  if (scope.enhancedCxEnvelope) {
    lines.push('Provide Enhanced Commissioning for Building Enclosure per ASTM E2947-21a, including air leakage testing (ASTM E783/E779/E1186), water penetration testing (ASTM E71105/AAMA 501.2), and infrared imaging (ASTM C1153/C1060).')
  }
  if (scope.envelopeCx) {
    lines.push('Provide Building Envelope Commissioning including review of envelope BoD, witness sample of field tests, and incorporation of envelope items into the Issues Log and Final Report.')
  }
  if (scope.mbcxBasic) {
    lines.push('Provide Monitoring-Based Commissioning (Basic Software path) — develop MBCx Plan, implement EIS with annual benchmarking and hourly sub-metered visualization, deliver quarterly anomaly summaries and annual trend reports for a minimum of three years.')
  }
  if (scope.mbcxEnhanced) {
    lines.push('Provide Monitoring-Based Commissioning (Enhanced Software path) — all Basic deliverables plus Fault Detection and Diagnostics (FDD) for large HVAC/refrigeration systems with anomaly reporting, energy normalization, and GHG reporting.')
  }
  if (scope.ongoingCx) {
    lines.push('Develop and deliver an Ongoing Commissioning Plan covering trend monitoring strategies, annual testing requirements, documentation practices, and re-commissioning triggers for the occupancy phase.')
  }
  if (lines.length === 0) {
    lines.push('Provide commissioning services per the Owner-CxA agreement and the project Cx Plan.')
  }
  const items = lines.map((l) => `<li>${l}</li>`).join('\n')
  return `<p>The commissioning scope of work for this project includes the following activities:</p>
<ol>
${items}
</ol>`
}

/**
 * Roles and Responsibilities — full G0/LEED-aligned boilerplate covering
 * the standard parties. The CxA edits the specifics per project.
 */
export function rolesAndResponsibilitiesTemplate(ctx: TemplateContext): string {
  const cxa = escape(ctx.cxaName)
  const cxaCo = escape(ctx.cxaCompany)
  const cxaLine = cxa
    ? `<p>${cxa}${cxaCo ? ` of ${cxaCo}` : ''} serves as the Commissioning Authority (CxA) for this project.</p>`
    : ''
  return `<p>Each party involved in the design and construction phases has a unique role and is dependent on the other parties to achieve a successful project. The summary below reflects ASHRAE Guideline 0 + LEED-compliant responsibilities.</p>
${cxaLine}
<h3>Owner</h3>
<ul>
<li>Develop and commit to the Owner's Project Requirements (OPR).</li>
<li>Select and contract the Commissioning Authority directly.</li>
<li>Assign O&amp;M personnel for training, observations, and inspections.</li>
<li>Review and approve changes to the OPR, Construction Documents, and Cx Process deliverables.</li>
<li>Review and accept the CxA's verification reports and Final Commissioning Process Report.</li>
<li>Conduct O&amp;M scheduled activities to maintain optimum systems reliability and performance.</li>
</ul>
<h3>Commissioning Authority (CxA)</h3>
<ul>
<li>Act as an independent third party on behalf of the Owner.</li>
<li>Organize and lead the Cx Team; develop and integrate Cx activities into the project schedule.</li>
<li>Assist in OPR development and review the BoD for completeness and adherence to the OPR.</li>
<li>Prepare and maintain the Commissioning Plan.</li>
<li>Develop construction checklists, functional test procedures, and the issues log format.</li>
<li>Review submittals applicable to commissioned systems concurrent with the A/E review.</li>
<li>Verify installations through site visits, witness start-up of major equipment, and supervise functional testing.</li>
<li>Review the contractor training program, attend select sessions, and verify training delivery.</li>
<li>Receive and review O&amp;M documentation, verify Systems Manual content, and prepare the final Commissioning Process Report.</li>
<li>Conduct the 10-month warranty review (where contracted) and deliver the Ongoing Cx Plan.</li>
</ul>
<h3>Design Professionals (A/E)</h3>
<ul>
<li>Develop quality construction documents that satisfy the OPR.</li>
<li>Document the Basis of Design (BoD) and respond to CxA design review comments.</li>
<li>Integrate Cx Process requirements into the project specifications and drawings.</li>
<li>Review and approve submittals, O&amp;M data, training materials, and as-builts.</li>
<li>Coordinate resolution of system deficiencies identified during commissioning.</li>
</ul>
<h3>Contractors and Subcontractors</h3>
<ul>
<li>Construct the project per the Contract Documents; include the cost of commissioning in the contract.</li>
<li>Schedule and participate in commissioning meetings; provide manufacturer representatives as required.</li>
<li>Complete pre-functional checklists and provide the CxA with contractor readiness notifications.</li>
<li>Execute functional tests with CxA oversight; coordinate resolution of identified deficiencies.</li>
<li>Deliver O&amp;M data and conduct Owner training per the Contract Documents.</li>
</ul>
<h3>Equipment and Material Suppliers</h3>
<ul>
<li>Provide submittal data including detailed start-up procedures and Owner responsibilities.</li>
<li>Assist in equipment testing per agreements with the Contractor.</li>
<li>Provide special tools, instruments, and training as required by the Contract Documents.</li>
</ul>`
}

/**
 * Transition to Ongoing Cx Plan — required per LEED v5 FCx (moved from
 * ECx in v4). References the OCx Plan deliverable.
 */
export function transitionToOngoingCxTemplate(ctx: TemplateContext): string {
  const project = escape(ctx.projectName) || 'the facility'
  return `<p>The transition from construction-phase commissioning to the Ongoing Commissioning (OCx) program is a critical milestone in ensuring that ${project} continues to operate in alignment with the Owner's Project Requirements (OPR) throughout its life cycle.</p>
<p>The Commissioning Authority (CxA) provides the Owner with a complete turnover package that includes this Commissioning Final Report, Functional Performance Test (FPT) documentation, the Issues and Benefits Log, as-built sequences of operation, and updated Systems Manual content. These materials serve as the baseline reference for system performance and operational intent.</p>
<p>During the transition, the CxA conducts a structured handoff meeting with the Facilities Manager and O&amp;M personnel to review major findings, demonstrate system interactions, and highlight any items requiring follow-up or future monitoring.</p>
<p>Upon turnover, the Owner's Facilities Team assumes responsibility for implementing the formal Ongoing Commissioning Plan, which defines trend monitoring strategies, annual testing requirements, documentation practices, and re-commissioning triggers. The Facilities Team integrates this plan with their internal maintenance procedures and the manufacturer-based preventative-maintenance program. The Ongoing Commissioning process begins immediately upon occupancy and remains active for the life of the facility, ensuring long-term performance, reduced operational drift, enhanced reliability, and sustained alignment with both the OPR and the Basis of Design (BoD).</p>`
}

/**
 * Sign-offs — signature blocks at the end of the report. Auto-populated
 * release info (rendered by FinalReport.vue) appears below this prose.
 */
export function signOffsTemplate(ctx: TemplateContext): string {
  const cxa = escape(ctx.cxaName)
  const cxaCo = escape(ctx.cxaCompany)
  return `<p>The undersigned parties have reviewed this Commissioning Final Report and certify that the commissioning activities described herein were completed in accordance with the project Commissioning Plan, the Owner's Project Requirements, and applicable code and contractual requirements.</p>
<table style="width:100%; border-collapse:collapse; margin-top:1em;">
<tbody>
<tr>
<td style="border:1px solid #aaa; padding:1em; width:50%;">
<p><strong>Owner Representative</strong></p>
<p>Name: ____________________________</p>
<p>Title: ____________________________</p>
<p>Date: ____________________________</p>
<p>Signature: ________________________</p>
</td>
<td style="border:1px solid #aaa; padding:1em; width:50%;">
<p><strong>Commissioning Authority</strong></p>
<p>Name: ${cxa || '____________________________'}</p>
<p>Company: ${cxaCo || '____________________________'}</p>
<p>Date: ____________________________</p>
<p>Signature: ________________________</p>
</td>
</tr>
</tbody>
</table>`
}

/**
 * Lookup table: section key → template fn. FinalReport.vue uses this to
 * decide whether to show the "Insert template" button on a prose section.
 */
export const SECTION_TEMPLATES: Record<string, (ctx: TemplateContext) => string> = {
  purpose: purposeTemplate,
  'cx-scope-of-work': cxScopeOfWorkTemplate,
  'roles-responsibilities': rolesAndResponsibilitiesTemplate,
  'transition-ongoing-cx': transitionToOngoingCxTemplate,
  'sign-offs': signOffsTemplate,
}

export function hasTemplate(sectionKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(SECTION_TEMPLATES, sectionKey)
}

export function renderTemplate(sectionKey: string, ctx: TemplateContext): string {
  const fn = SECTION_TEMPLATES[sectionKey]
  return fn ? fn(ctx) : ''
}
