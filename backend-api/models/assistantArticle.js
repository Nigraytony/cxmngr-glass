const mongoose = require('mongoose')

const assistantArticleSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, index: true },
    title: { type: String, required: true },
    author: { type: String, default: '', index: true },
    summary: { type: String, default: '' },
    body: { type: String, default: '' }, // plain text/markdown-ish (no HTML rendering by default)
    tags: { type: [String], default: [] },
    isPublished: { type: Boolean, default: true, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'assistant_articles' }
)

assistantArticleSchema.index({ title: 'text', author: 'text', summary: 'text', body: 'text', category: 'text', tags: 'text' })

assistantArticleSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

assistantArticleSchema.pre('findOneAndUpdate', function (next) {
  try {
    const update = this.getUpdate() || {}
    if (!update.$set) update.$set = {}
    update.$set.updatedAt = new Date()
    this.setUpdate(update)
  } catch (_) {
    // ignore
  }
  next()
})

module.exports = mongoose.model('AssistantArticle', assistantArticleSchema)
