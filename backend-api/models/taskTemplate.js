const mongoose = require('mongoose')

function inferSourceType(ctx) {
  try {
    // Query validator context (e.g. findOneAndUpdate with runValidators)
    if (ctx && typeof ctx.getUpdate === 'function') {
      const rawUpdate = ctx.getUpdate() || {}
      const update = rawUpdate && rawUpdate.$set ? { ...rawUpdate, ...rawUpdate.$set } : rawUpdate
      const rawType = String(update.sourceType || '').trim().toLowerCase()
      if (rawType) return rawType === 'csv' ? 'csv' : 'xml'
      const hasCsv = String(update.csv || '').trim().length > 0
      const hasXml = String(update.xml || '').trim().length > 0
      if (hasCsv && !hasXml) return 'csv'
      return 'xml'
    }

    // Document context (save/create)
    const rawType = String((ctx && ctx.sourceType) || '').trim().toLowerCase()
    if (rawType) return rawType === 'csv' ? 'csv' : 'xml'
    const hasCsv = String((ctx && ctx.csv) || '').trim().length > 0
    const hasXml = String((ctx && ctx.xml) || '').trim().length > 0
    if (hasCsv && !hasXml) return 'csv'
    return 'xml'
  } catch (_) {
    return 'xml'
  }
}

const taskTemplateSchema = new mongoose.Schema(
	  {
	    name: { type: String, required: true, trim: true },
	    slug: { type: String, required: false, trim: true },
	    category: { type: String, required: false, trim: true, default: '' },
	    version: { type: String, required: false, trim: true, default: '1.0.0' },
	    isActive: { type: Boolean, default: true },
	    description: { type: String, required: false, trim: true, default: '' },
	    tags: { type: [String], default: [] },
	    // Source format: xml or csv (mutually exclusive)
	    sourceType: { type: String, enum: ['xml', 'csv'], default: 'xml' },
	    // Store raw MS Project XML (or other XML flavors) as the source of truth.
	    xml: {
	      type: String,
	      required: function () { return inferSourceType(this) !== 'csv' },
	      default: '',
	    },
	    // Store CSV task list (first row must be headers)
	    csv: {
	      type: String,
	      required: function () { return inferSourceType(this) === 'csv' },
	      default: '',
	    },
	    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
	    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
	  },
  { timestamps: true }
)

function toSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

taskTemplateSchema.pre('save', function (next) {
  try {
    if (!this.slug && this.name) this.slug = toSlug(this.name)
    if (this.slug) this.slug = toSlug(this.slug)
  } catch (_) {
    // ignore
  }
  next()
})

taskTemplateSchema.index({ isActive: 1, name: 1 })
taskTemplateSchema.index({ slug: 1 }, { unique: false })

module.exports = mongoose.model('TaskTemplate', taskTemplateSchema)
