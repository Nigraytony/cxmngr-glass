/**
 * Filing released Final Report PDFs into the project's Documents module
 * (Phase 5d): every lock-to-final files the generated PDF into a root-level
 * "Final Reports" folder, so the deliverable lives with the project's other
 * documents. orgId mirrors projectId (the Documents module's convention).
 */
const DocFolder = require('../models/docFolder')
const DocFile = require('../models/docFile')

const FINAL_REPORTS_FOLDER = 'Final Reports'

async function ensureFinalReportsFolder(projectId, userId) {
  const existing = await DocFolder.findOne({
    projectId,
    parentId: null,
    name: FINAL_REPORTS_FOLDER,
    deletedAt: null,
  })
  if (existing) return existing
  const folder = new DocFolder({
    orgId: String(projectId),
    projectId,
    parentId: null,
    name: FINAL_REPORTS_FOLDER,
    path: FINAL_REPORTS_FOLDER,
    createdBy: userId,
  })
  await folder.save()
  return folder
}

/**
 * Register the release PDF (already uploaded to blob storage by the PDF
 * service) as a DocFile in the Final Reports folder.
 */
async function fileReleasePdf({ projectId, userId, blobName, sizeBytes, version }) {
  const folder = await ensureFinalReportsFolder(projectId, userId)
  const stamp = new Date().toISOString().slice(0, 10)
  const doc = new DocFile({
    orgId: String(projectId),
    projectId,
    folderId: folder._id,
    originalName: `Final Cx Report v${version} (${stamp}).pdf`,
    blobName,
    contentType: 'application/pdf',
    sizeBytes: Number(sizeBytes || 0),
    status: 'ready',
    createdBy: userId,
  })
  await doc.save()
  return doc
}

module.exports = { ensureFinalReportsFolder, fileReleasePdf, FINAL_REPORTS_FOLDER }
