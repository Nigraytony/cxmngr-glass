const mongoose = require('mongoose')

const taskTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: false, trim: true },
    category: { type: String, required: false, trim: true, default: '' },
    version: { type: String, required: false, trim: true, default: '1.0.0' },
    isActive: { type: Boolean, default: true },
    // Store raw MS Project XML (or other XML flavors) as the source of truth.
    xml: { type: String, required: true },
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

