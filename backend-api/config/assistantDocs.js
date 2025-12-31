// Assistant documentation pointers.
// v1: provide trusted-source links only (no scraped content).
// Later: add curated excerpts and admin-managed documents.

function normalizeProjectType(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const low = s.toLowerCase()
  if (low === 'new building cx') return 'New Building Cx'
  return s
}

function doc(title, url, note) {
  return {
    title: String(title || '').trim(),
    url: String(url || '').trim(),
    note: String(note || '').trim(),
  }
}

function makeNewBuildingCxDocsV1(itemId) {
  // Note: URLs are intentionally top-level / stable entry points. We can refine to deep links later.
  const general = [
    doc('ASHRAE – Standards & Guidelines (Commissioning)', 'https://www.ashrae.org/technical-resources/standards-and-guidelines', 'Look for Guideline 0 and related commissioning resources.'),
    doc('BCxA (Building Commissioning Association)', 'https://www.bcxa.org/', 'Professional commissioning guidance, best practices, and training resources.'),
    doc('USGBC (LEED)', 'https://www.usgbc.org/', 'LEED commissioning requirements vary by rating system/version; confirm per project.'),
  ]

  const perItem = {
    'nbcx-001': [
      doc('ASHRAE – Standards & Guidelines (OPR/BOD context)', 'https://www.ashrae.org/technical-resources/standards-and-guidelines', 'OPR/BOD are foundational artifacts; confirm required content for your scope.'),
    ],
    'nbcx-002': [
      doc('ASHRAE – Standards & Guidelines (OPR/BOD alignment)', 'https://www.ashrae.org/technical-resources/standards-and-guidelines', 'Use Guideline 0 as the baseline commissioning process reference.'),
    ],
    'nbcx-003': [
      doc('BCxA – Commissioning process resources', 'https://www.bcxa.org/', 'Cx Plan content and process expectations.'),
    ],
    'nbcx-010': [
      doc('ASHRAE – Standards & Guidelines (Functional testing)', 'https://www.ashrae.org/technical-resources/standards-and-guidelines', 'Functional testing procedure guidance is typically aligned with commissioning guidelines.'),
    ],
  }

  const id = String(itemId || '').trim()
  if (id && perItem[id]) return { docs: perItem[id], general }
  return { docs: [], general }
}

function makeGenericDocsV1() {
  return {
    docs: [],
    general: [
      doc('ASHRAE – Standards & Guidelines', 'https://www.ashrae.org/technical-resources/standards-and-guidelines', 'Use as the baseline reference set; confirm applicable commissioning guidance for your scope.'),
      doc('BCxA (Building Commissioning Association)', 'https://www.bcxa.org/', 'Commissioning best practices, training resources, and guidance.'),
      doc('USGBC (LEED)', 'https://www.usgbc.org/', 'LEED commissioning requirements vary by rating system/version; confirm per project.'),
    ],
  }
}

function getAssistantDocsForProjectType(projectType, itemId) {
  const pt = normalizeProjectType(projectType)
  if (pt === 'New Building Cx') return makeNewBuildingCxDocsV1(itemId)
  // Default: provide trusted general links even when project type is missing/unknown.
  return makeGenericDocsV1()
}

module.exports = {
  getAssistantDocsForProjectType,
}
