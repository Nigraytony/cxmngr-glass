// Lean preset commissioning templates for common equipment types.
// Source content lives in templatePresets.json; this module exposes helpers to
// list presets and build a Template document from a preset for a given project.
const PRESETS = require('./templatePresets.json')

const byKey = new Map(PRESETS.map((p) => [p.key, p]))

// Lightweight metadata for listing / agent discovery (no heavy content).
function listPresets() {
  return PRESETS.map((p) => ({
    key: p.key,
    tag: p.tag,
    title: p.title,
    type: p.type,
    system: p.system,
    summary: p.summary,
    attributes: p.attributes.length,
    checklists: p.checklists.length,
    functionalTests: p.functionalTests.length,
  }))
}

function getPreset(key) {
  return byKey.get(String(key || '').trim()) || null
}

// Build a Template-ready document from a preset, deep-copying content so callers
// never share references with the cached preset. `overrides` may set tag/title/system.
function buildTemplateDoc(projectId, key, overrides = {}) {
  const p = getPreset(key)
  if (!p) return null
  const clone = (v) => JSON.parse(JSON.stringify(v || []))
  const ov = overrides || {}
  return {
    projectId,
    tag: String(ov.tag || p.tag),
    title: String(ov.title || p.title),
    type: String(p.type || ''),
    system: String(ov.system || p.system || ''),
    status: 'Not Started',
    description: String(ov.description != null ? ov.description : (p.description || '')),
    attributes: clone(p.attributes),
    components: clone(p.components),
    checklists: clone(p.checklists),
    functionalTests: clone(p.functionalTests),
  }
}

module.exports = { PRESETS, listPresets, getPreset, buildTemplateDoc }
