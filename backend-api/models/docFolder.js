const mongoose = require('mongoose')

const docFolderSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocFolder', default: null, index: true },
    name: { type: String, required: true },
    // Materialized path of folder names, e.g. "Root/Child/Sub"
    path: { type: String, required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// Unique folder name among siblings inside a project+org.
// Allow reusing the same name after soft-delete by making the unique index apply only to non-deleted rows.
docFolderSchema.index(
  { orgId: 1, projectId: 1, parentId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
)

docFolderSchema.pre('validate', function (next) {
  try {
    if (this.name) this.name = String(this.name).trim()
    if (this.orgId) this.orgId = String(this.orgId).trim()
  } catch (e) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('DocFolder', docFolderSchema)
