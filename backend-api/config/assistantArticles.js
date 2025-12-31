function normalizeText(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function normalizeSlug(v) {
  return normalizeText(v).trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getAssistantArticleSeeds() {
  const categories = [
    'New Building Cx',
    'Existing Building Cx',
    'LEED Cx',
    'Facility Assessments',
    'The CXMA Platform',
  ]

  return categories.map((category) => {
    const slug = normalizeSlug(category)
    return {
      slug,
      category,
      title: category,
      author: 'CXMA',
      summary: `Overview and guidance for ${category}.`,
      body: [
        `${category}`,
        '',
        'This article is a placeholder. You can author long-form guidance here.',
        '',
        'Suggested sections:',
        '- Purpose',
        '- Typical scope',
        '- Deliverables',
        '- Workflow in CXMA',
        '- Common pitfalls',
      ].join('\n'),
      tags: [normalizeSlug(category)],
      isPublished: true,
    }
  })
}

module.exports = {
  getAssistantArticleSeeds,
  normalizeSlug,
}
