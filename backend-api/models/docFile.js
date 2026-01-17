const mongoose = require('mongoose')

const docFileSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocFolder', required: true, index: true },
    originalName: { type: String, required: true },
    // Server-generated UUID name; never accept from client.
    blobName: { type: String, required: true, index: true },
    // Optional derived preview (e.g., converted PDF for Office docs).
    previewBlobName: { type: String, required: false, index: true },
    previewContentType: { type: String, required: false },
    previewStatus: { type: String, enum: ['none', 'pending', 'ready', 'error'], default: 'none', index: true },
    previewError: { type: String, required: false },
    previewUpdatedAt: { type: Date, required: false },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'ready', 'deleted'], default: 'pending', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

docFileSchema.index({ orgId: 1, projectId: 1, folderId: 1, originalName: 1 })

docFileSchema.pre('validate', function (next) {
  try {
    if (this.originalName) this.originalName = String(this.originalName).trim()
    if (this.contentType) this.contentType = String(this.contentType).trim().toLowerCase()
    if (this.orgId) this.orgId = String(this.orgId).trim()
  } catch (e) {
    // best-effort
  }
  next()
})

module.exports = mongoose.model('DocFile', docFileSchema)
