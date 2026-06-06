// Cleanup for entity-scoped media stored via the Azure document panels.
//
// AzurePhotosPanel / AzureAttachmentsPanel store files under virtual folders
// "Photos/<entityType>/<entityId>" and "Attachments/<entityType>/<entityId>"
// (DocFolder.path), with each file a DocFile (blobName) + Azure blob. When the
// owning entity (e.g. an Action or Activity) is deleted, those blobs would
// otherwise orphan. This soft-deletes the DocFile/DocFolder records and hard-
// deletes the blobs. Best-effort: never throws — cleanup must not block the
// primary delete or fail it when storage is unconfigured.

const DocFolder = require('../models/docFolder')
const DocFile = require('../models/docFile')
const { generateBlobSasUrl, deleteBlob } = require('./blobSas')

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function deleteEntityMedia(projectId, entityType, entityId) {
  try {
    if (!projectId || !entityType || !entityId) return
    const roots = [`Photos/${entityType}/${entityId}`, `Attachments/${entityType}/${entityId}`]
    for (const root of roots) {
      const pathRe = new RegExp(`^${escapeRegex(root)}(?:/|$)`)
      const folders = await DocFolder.find({ projectId, deletedAt: null, path: pathRe }).select('_id').lean()
      const folderIds = folders.map((f) => String(f._id))
      if (!folderIds.length) continue

      const files = await DocFile.find({
        projectId,
        folderId: { $in: folderIds },
        status: { $ne: 'deleted' },
      }).select('_id blobName previewBlobName').lean()

      for (const f of files) {
        for (const bn of [f.blobName, f.previewBlobName]) {
          if (!bn) continue
          try {
            const sas = await generateBlobSasUrl({ blobName: String(bn), permissions: 'd', expiresInSec: 600 })
            await deleteBlob(sas.url)
          } catch (_) { /* best-effort */ }
        }
        try {
          await DocFile.updateOne({ _id: f._id }, { $set: { status: 'deleted', deletedAt: new Date() } })
        } catch (_) { /* best-effort */ }
      }

      try {
        await DocFolder.updateMany({ projectId, _id: { $in: folderIds } }, { $set: { deletedAt: new Date() } })
      } catch (_) { /* best-effort */ }
    }
  } catch (_) {
    // Cleanup is best-effort; swallow all errors.
  }
}

module.exports = { deleteEntityMedia }
