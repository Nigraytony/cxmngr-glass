// Demo source-project plumbing.
//
// The demo's equipment/templates are NOT hardcoded — they live in a dedicated
// "demo source" project that the team maintains in the UI. Two operations:
//
//  1. bootstrapDemoSource()  (one-time): builds the template library from baked-in
//     authored data (demoTemplates.json) into the empty demo-source project and
//     builds the demo equipment instances (linked to those templates). Run once.
//
//  2. cloneEquipmentContent() (every demo reset): replicates the demo-source
//     project's spaces / systems / templates / equipment into the public demo
//     project, preserving template links so "batch edit from template" works.
//
// Both reuse the same low-level copy primitives below.

const Template = require('../models/template')
const Equipment = require('../models/equipment')
const Space = require('../models/space')
const System = require('../models/system')
const Project = require('../models/project')

// Baked-in template library: the demo's Cx content (attributes/components/
// checklists/FPTs) is authored data committed to the repo (exported once from the
// reference templates and scrubbed of client identifiers). The demo no longer
// depends on any live project's template tags, so the bootstrap is deterministic.
const BAKED_TEMPLATES = require('./demoTemplates.json')

// ---------------------------------------------------------------------------
// Demo equipment blueprint (lightweight: tag/title + which template + where).
// The heavy Cx content (attributes/components/checklists/FPTs) lives in the
// templates and is copied in.
// ---------------------------------------------------------------------------
const DEMO_SPACES = [
  { tag: 'BLDG-A', title: 'Riverside Medical Center', type: 'Building', description: 'Acute-care facility — central utility plant' },
  { tag: 'CUP', title: 'Central Utility Plant', type: 'Room', description: 'Chilled water + condenser water equipment' },
  { tag: 'BLR-RM', title: 'Boiler Room', type: 'Room', description: 'Heating hot water plant' },
  { tag: 'CT-YARD', title: 'Cooling Tower Yard', type: 'Area', description: 'Roof / exterior heat rejection' },
  { tag: 'MECH-PH', title: 'Mechanical Penthouse', type: 'Room', description: 'Air handling units and exhaust fans' },
]

const DEMO_SYSTEMS = [
  { tag: 'CHW', name: 'Chilled Water Plant', type: 'Mechanical', description: 'Chillers, primary/secondary CHW pumps' },
  { tag: 'CDW', name: 'Condenser Water System', type: 'Mechanical', description: 'Cooling towers + condenser water pumps' },
  { tag: 'HHW', name: 'Heating Hot Water Plant', type: 'Mechanical', description: 'Boilers, HW pumps, unit heaters' },
  { tag: 'AIR', name: 'Air Distribution System', type: 'Mechanical', description: 'Air handlers, VAV terminal units, exhaust fans' },
  { tag: 'BAS', name: 'Building Automation System (BAS)', type: 'Controls', description: 'DDC controllers, sensors, schedules, trends and alarms' },
]

// VAV terminal units — 5 per AHU, served by AHU-1 / AHU-2.
const VAV_EQUIPMENT = ['AHU-1', 'AHU-2'].flatMap((ahu, i) =>
  Array.from({ length: 5 }, (_, j) => ({
    tag: `VAV-${i + 1}-${j + 1}`,
    title: `VAV Terminal Unit ${i + 1}-${j + 1}`,
    templateTag: 'VAV-TEMPLATE',
    system: 'Air Distribution System',
    space: 'BLDG-A',
    description: `VAV box with reheat, served by ${ahu}`,
  })),
)

// { tag, title, templateTag, system, space }
const DEMO_EQUIPMENT = [
  { tag: 'CH-1', title: 'Chiller 1', templateTag: 'CHLR-TEMPLATE', system: 'Chilled Water Plant', space: 'CUP' },
  { tag: 'CH-2', title: 'Chiller 2', templateTag: 'CHLR-TEMPLATE', system: 'Chilled Water Plant', space: 'CUP' },
  { tag: 'CT-1', title: 'Cooling Tower 1', templateTag: 'CT-TEMPLATE', system: 'Condenser Water System', space: 'CT-YARD' },
  { tag: 'CT-2', title: 'Cooling Tower 2', templateTag: 'CT-TEMPLATE', system: 'Condenser Water System', space: 'CT-YARD' },
  { tag: 'B-1', title: 'Boiler 1', templateTag: 'HWB-TEMPLATE', system: 'Heating Hot Water Plant', space: 'BLR-RM' },
  { tag: 'B-2', title: 'Boiler 2', templateTag: 'HWB-TEMPLATE', system: 'Heating Hot Water Plant', space: 'BLR-RM' },
  { tag: 'PCHWP-1', title: 'Primary CHW Pump 1', templateTag: 'CHWP-TEMPLATE', system: 'Chilled Water Plant', space: 'CUP' },
  { tag: 'PCHWP-2', title: 'Primary CHW Pump 2', templateTag: 'CHWP-TEMPLATE', system: 'Chilled Water Plant', space: 'CUP' },
  { tag: 'SCHWP-1', title: 'Secondary CHW Pump 1', templateTag: 'CHWP-TEMPLATE', system: 'Chilled Water Plant', space: 'CUP' },
  { tag: 'SCHWP-2', title: 'Secondary CHW Pump 2', templateTag: 'CHWP-TEMPLATE', system: 'Chilled Water Plant', space: 'CUP' },
  { tag: 'CWP-1', title: 'Condenser Water Pump 1', templateTag: 'CDWP-TEMPLATE', system: 'Condenser Water System', space: 'CUP' },
  { tag: 'CWP-2', title: 'Condenser Water Pump 2', templateTag: 'CDWP-TEMPLATE', system: 'Condenser Water System', space: 'CUP' },
  { tag: 'HWP-1', title: 'Hot Water Pump 1', templateTag: 'HWP-TEMPLATE', system: 'Heating Hot Water Plant', space: 'BLR-RM' },
  { tag: 'HWP-2', title: 'Hot Water Pump 2', templateTag: 'HWP-TEMPLATE', system: 'Heating Hot Water Plant', space: 'BLR-RM' },
  { tag: 'UH-1', title: 'Unit Heater 1', templateTag: 'HWUH-TEMPLATE', system: 'Heating Hot Water Plant', space: 'BLR-RM' },
  { tag: 'UH-2', title: 'Unit Heater 2', templateTag: 'HWUH-TEMPLATE', system: 'Heating Hot Water Plant', space: 'CUP' },
  { tag: 'AHU-1', title: 'Air Handling Unit 1', templateTag: 'AHU-TEMPLATE', system: 'Air Distribution System', space: 'MECH-PH' },
  { tag: 'AHU-2', title: 'Air Handling Unit 2', templateTag: 'AHU-TEMPLATE', system: 'Air Distribution System', space: 'MECH-PH' },
  ...VAV_EQUIPMENT,
  { tag: 'EF-1', title: 'Exhaust Fan 1', templateTag: 'EF-TEMPLATE', system: 'Air Distribution System', space: 'MECH-PH' },
  { tag: 'EF-2', title: 'Exhaust Fan 2', templateTag: 'EF-TEMPLATE', system: 'Air Distribution System', space: 'MECH-PH' },
]

// Which template tags to carry into the demo source. Built from the blueprint so
// adding equipment above automatically pulls the template it needs.
const DEMO_TEMPLATE_TAGS = [...new Set(DEMO_EQUIPMENT.map((e) => e.templateTag))]

// ---------------------------------------------------------------------------
// Defensive sanitizer — strip any source-client identifiers from copied text so
// nothing client-specific can leak into the public demo.
// ---------------------------------------------------------------------------
const CLIENT_RE = /\b(GDC|Pulaski(?:\s+State\s+Prison)?|(?:Georgia|GA)\s+Department\s+of\s+Corrections|Department\s+of\s+Corrections|inmate[s]?)\b/gi
function scrub(value) {
  if (typeof value === 'string') return value.replace(CLIENT_RE, '').replace(/\s{2,}/g, ' ').trim()
  if (Array.isArray(value)) return value.map(scrub)
  if (value && typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value)) out[k] = scrub(value[k])
    return out
  }
  return value
}

const CONTENT_FIELDS = ['attributes', 'components', 'checklists', 'functionalTests']
function pickContent(src) {
  const out = {}
  for (const f of CONTENT_FIELDS) out[f] = Array.isArray(src[f]) ? scrub(JSON.parse(JSON.stringify(src[f]))) : []
  return out
}

// ---------------------------------------------------------------------------
// Low-level copy primitives
// ---------------------------------------------------------------------------
// Create the requested templates from the baked-in library into the destination
// project. Returns Map(tag -> created doc). Content is re-scrubbed defensively.
async function createTemplatesFromData(dstProjectId, onlyTags) {
  const want = Array.isArray(onlyTags) && onlyTags.length ? new Set(onlyTags) : null
  const byTag = new Map()
  for (const t of BAKED_TEMPLATES) {
    if (want && !want.has(t.tag)) continue
    const doc = await Template.create({
      projectId: dstProjectId,
      tag: t.tag,
      title: scrub(t.title),
      type: t.type,
      system: t.system,
      status: t.status || 'Not Started',
      description: scrub(t.description || ''),
      ...pickContent(t),
    })
    byTag.set(t.tag, doc)
  }
  return byTag
}

async function createSpaces(dstProjectId, specs) {
  const byTag = new Map()
  for (const s of specs) {
    const doc = await Space.create({ project: dstProjectId, tag: s.tag, title: s.title, type: s.type, description: s.description || '' })
    byTag.set(s.tag, doc)
  }
  return byTag
}

async function createSystems(dstProjectId, specs) {
  const docs = await System.insertMany(specs.map((s) => ({ projectId: dstProjectId, tag: s.tag, name: s.name, type: s.type, description: s.description || '' })))
  return docs
}

// Create equipment instances from copied templates (the demo blueprint).
async function createEquipmentFromBlueprint(dstProjectId, templateByTag, spaceByTag) {
  const created = []
  for (const spec of DEMO_EQUIPMENT) {
    const tpl = templateByTag.get(spec.templateTag)
    if (!tpl) continue // template not in the baked library (shouldn't happen)
    const space = spaceByTag.get(spec.space)
    const doc = await Equipment.create({
      projectId: dstProjectId,
      tag: spec.tag,
      title: spec.title,
      type: tpl.type,
      system: spec.system,
      status: 'Not Started',
      description: scrub(tpl.description || ''),
      template: tpl._id,
      spaceId: space ? space._id : undefined,
      ...pickContent(tpl),
    })
    created.push(doc)
  }
  return created
}

// ---------------------------------------------------------------------------
// (1) One-time bootstrap: build the demo-source project from the baked-in library.
// ---------------------------------------------------------------------------
async function bootstrapDemoSource(targetProjectId) {
  // Start clean so the bootstrap is idempotent.
  await Promise.all([
    Template.deleteMany({ projectId: targetProjectId }),
    Equipment.deleteMany({ projectId: targetProjectId }),
    Space.deleteMany({ project: targetProjectId }),
    System.deleteMany({ projectId: targetProjectId }),
  ])
  const templateByTag = await createTemplatesFromData(targetProjectId, DEMO_TEMPLATE_TAGS)
  const spaceByTag = await createSpaces(targetProjectId, DEMO_SPACES)
  await createSystems(targetProjectId, DEMO_SYSTEMS)
  const equipment = await createEquipmentFromBlueprint(targetProjectId, templateByTag, spaceByTag)
  // Wire the project's reference arrays so the UI lists the seeded content (the
  // project pages read project.templates/spaces/equipment, not just projectId).
  await Project.findByIdAndUpdate(targetProjectId, {
    $set: {
      templates: [...templateByTag.values()].map((d) => d._id),
      spaces: [...spaceByTag.values()].map((d) => d._id),
      equipment: equipment.map((d) => d._id),
    },
  })
  return {
    templates: templateByTag.size,
    spaces: spaceByTag.size,
    systems: DEMO_SYSTEMS.length,
    equipment: equipment.length,
    missingTemplates: DEMO_TEMPLATE_TAGS.filter((t) => !templateByTag.has(t)),
  }
}

// ---------------------------------------------------------------------------
// (2) Every demo reset: clone the demo-source project's plant content into the
// public demo project. Returns the created docs so the seeder can wire refs.
// ---------------------------------------------------------------------------
async function cloneEquipmentContent(sourceProjectId, demoProjectId) {
  // Spaces (map old _id -> new), Systems, Templates (map old _id -> new),
  // then Equipment with refs remapped.
  const srcSpaces = await Space.find({ project: sourceProjectId }).lean()
  const spaceIdMap = new Map()
  const spaces = []
  for (const s of srcSpaces) {
    const doc = await Space.create({ project: demoProjectId, tag: s.tag, title: scrub(s.title), type: s.type, description: scrub(s.description || ''), parentSpace: null })
    spaceIdMap.set(String(s._id), doc._id)
    spaces.push(doc)
  }

  const srcSystems = await System.find({ projectId: sourceProjectId }).lean()
  const systems = await System.insertMany(srcSystems.map((s) => ({ projectId: demoProjectId, tag: s.tag, name: scrub(s.name), type: s.type, description: scrub(s.description || '') })))

  const srcTemplates = await Template.find({ projectId: sourceProjectId }).lean()
  const templateIdMap = new Map()
  for (const t of srcTemplates) {
    const doc = await Template.create({
      projectId: demoProjectId, tag: t.tag, title: scrub(t.title), type: t.type, system: t.system,
      status: t.status || 'Not Started', description: scrub(t.description || ''), ...pickContent(t),
    })
    templateIdMap.set(String(t._id), doc._id)
  }

  const srcEquipment = await Equipment.find({ projectId: sourceProjectId }).lean()
  const equipment = []
  for (const e of srcEquipment) {
    const doc = await Equipment.create({
      projectId: demoProjectId, tag: e.tag, title: scrub(e.title), type: e.type, system: scrub(e.system),
      status: 'Not Started', description: scrub(e.description || ''),
      template: e.template ? (templateIdMap.get(String(e.template)) || undefined) : undefined,
      spaceId: e.spaceId ? (spaceIdMap.get(String(e.spaceId)) || undefined) : undefined,
      ...pickContent(e),
    })
    equipment.push(doc)
  }

  return { spaces, systems, templates: templateIdMap.size, equipment }
}

module.exports = {
  DEMO_SPACES,
  DEMO_SYSTEMS,
  DEMO_EQUIPMENT,
  DEMO_TEMPLATE_TAGS,
  bootstrapDemoSource,
  cloneEquipmentContent,
}
