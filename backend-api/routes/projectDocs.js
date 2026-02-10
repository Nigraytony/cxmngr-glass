const express = require('express')
const crypto = require('crypto')
const mongoose = require('mongoose')

const router = express.Router({ mergeParams: true })

const { auth } = require('../middleware/auth')
const { requireActiveProject } = require('../middleware/subscription')
const { requireNotDisabled } = require('../middleware/killSwitch')
const { requirePermission } = require('../middleware/rbac')
const { isTruthy, requireObjectIdParam, requireObjectIdQuery, requireObjectIdBody } = require('../middleware/validate')
const Project = require('../models/project')
const DocFolder = require('../models/docFolder')
const DocFile = require('../models/docFile')
const { validateFolderName, validateFilename } = require('../utils/docsValidation')
const { generateBlobSasUrl, blobExists, deleteBlob, diagnoseStorageConfig } = require('../utils/blobSas')
const { getDocsAllowedContentTypes, getDocsMaxSizeBytes } = require('../config/docs')
const { rateLimit } = require('../middleware/rateLimit')
const { isOfficeDoc, convertOfficeDocToPdfBlob } = require('../utils/docsPreview')

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
}

function getLowerExt(filename) {
  const base = asString(filename).trim()
  const idx = base.lastIndexOf('.')
  if (idx <= 0 || idx === base.length - 1) return ''
  return base.slice(idx + 1).toLowerCase()
}

function getAllowedExtensionsForContentType(contentType) {
  const ct = asString(contentType).trim().toLowerCase()
  switch (ct) {
    case 'image/jpeg':
      return ['jpg', 'jpeg']
    case 'image/png':
      return ['png']
    case 'image/heic':
      return ['heic']
    case 'image/heif':
      return ['heif']
    case 'application/pdf':
      return ['pdf']
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return ['docx']
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return ['xlsx']
    default:
      return []
  }
}

function validateFilenameContentTypePair({ filename, contentType }) {
  const ext = getLowerExt(filename)
  const allowed = getAllowedExtensionsForContentType(contentType)
  if (!allowed.length) return { ok: true } // unknown mapping; allow
  if (!ext) {
    return { ok: false, error: 'Filename must include a file extension', code: 'FILENAME_EXTENSION_REQUIRED' }
  }
  if (!allowed.includes(ext)) {
    return {
      ok: false,
      error: `Filename extension ".${ext}" does not match contentType "${asString(contentType)}"`,
      code: 'FILENAME_CONTENTTYPE_MISMATCH',
      allowedExtensions: allowed,
    }
  }
  return { ok: true }
}

function isGlobalAdmin(user) {
  const role = asString(user && user.role).trim().toLowerCase()
  return role === 'globaladmin' || role === 'superadmin'
}

function isProjectMember(project, user) {
  try {
    if (!project || !user) return false
    if (isGlobalAdmin(user)) return true
    const userId = asString(user._id || user.id).trim()
    const email = asString(user.email).trim().toLowerCase()
    const team = Array.isArray(project.team) ? project.team : []
    const users = Array.isArray(project.users) ? project.users : []
    if (userId && users.some((u) => asString(u).trim() === userId)) return true
    return team.some((m) => {
      const mid = asString(m && (m._id || m.id)).trim()
      const memail = asString(m && m.email).trim().toLowerCase()
      return (userId && mid && mid === userId) || (email && memail && memail === email)
    })
  } catch (_) {
    return false
  }
}

function docsRateLimitKey(req) {
  const userId = asString(req.user && (req.user._id || req.user.id)).trim()
  const projectId = asString(req.params && req.params.projectId).trim()
  return `${userId}:${projectId}`
}

async function requireDocsProjectAccess(req, res, next) {
  try {
    const projectId = asString(req.params.projectId).trim()
    if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ error: 'Invalid projectId' })
    const project = await Project.findById(projectId).select('team users client').lean()
    if (!project) return res.status(404).json({ error: 'Project not found' })
    if (!isProjectMember(project, req.user)) return res.status(403).json({ error: 'Forbidden' })
    req.docsProject = project
    // The app does not yet have a first-class org model; scope docs by projectId for tenant safety.
    req.docsOrgId = projectId
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to authorize docs access' })
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sendStorageConfigError(res, err) {
  const status = Number(err && err.status)
  if (status !== 503) return false
  return res.status(503).json({
    error: (err && err.message) || 'Azure storage is not configured',
    code: err && err.code,
    hint: err && err.hint,
  })
}

async function computeFolderPath({ orgId, projectId, parentId, name }) {
  if (!parentId) return name
  // Legacy tolerance: some older docs may have a different orgId stored; projectId is the real tenant boundary.
  const parent = await DocFolder.findOne({ _id: parentId, projectId, deletedAt: null }).select('path').lean()
  if (!parent) return null
  const base = asString(parent.path).trim()
  return base ? `${base}/${name}` : name
}

async function loadFolder(req, res, next) {
  try {
    const projectId = req.params.projectId
    const folderId = req.params.folderId
    const folder = await DocFolder.findOne({ _id: folderId, projectId, deletedAt: null }).lean()
    if (!folder) return res.status(404).json({ error: 'Folder not found' })
    req.docFolder = folder
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load folder' })
  }
}

async function loadFile(req, res, next) {
  try {
    const projectId = req.params.projectId
    const fileId = req.params.fileId
    const file = await DocFile.findOne({ _id: fileId, projectId }).lean()
    if (!file) return res.status(404).json({ error: 'File not found' })
    req.docFile = file
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load file' })
  }
}

function buildTree(folders) {
  const nodes = new Map()
  for (const f of folders) {
    const id = String(f._id)
    nodes.set(id, { id, name: f.name, path: f.path, parentId: f.parentId ? String(f.parentId) : null, children: [] })
  }

  const childrenByParent = new Map()
  for (const f of folders) {
    const id = String(f._id)
    const rawParentKey = f.parentId ? String(f.parentId) : '__root__'
    // If a folder references a missing parent (legacy data), treat it as a root child so it's visible.
    const parentKey = rawParentKey !== '__root__' && !nodes.has(rawParentKey) ? '__root__' : rawParentKey
    const list = childrenByParent.get(parentKey) || []
    list.push(id)
    childrenByParent.set(parentKey, list)
  }

  function attach(parentKey, out) {
    const ids = childrenByParent.get(parentKey) || []
    ids.sort((a, b) => {
      const an = nodes.get(a)?.name || ''
      const bn = nodes.get(b)?.name || ''
      const c = an.localeCompare(bn, undefined, { sensitivity: 'base' })
      if (c !== 0) return c
      return a.localeCompare(b)
    })
    for (const id of ids) {
      const node = nodes.get(id)
      if (!node) continue
      attach(id, node.children)
      out.push(node)
    }
  }

  const rootChildren = []
  attach('__root__', rootChildren)
  return { id: null, name: '/', children: rootChildren }
}

// GET /api/projects/:projectId/docs/folders/tree
router.get(
  '/folders/tree',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireActiveProject,
  requirePermission('folders.read', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  async (req, res) => {
    try {
      const projectId = req.params.projectId
      const includeDeleted = isTruthy(req.query.includeDeleted)
      if (includeDeleted && !isGlobalAdmin(req.user)) {
        return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN_DEBUG_LISTING' })
      }
      // Note: projectId is the tenant boundary; allow reading folders even if legacy orgId mismatches.
      const folders = await DocFolder.find(includeDeleted ? { projectId } : { projectId, deletedAt: null })
        .select('name path parentId')
        .lean()
      return res.json({ root: buildTree(folders) })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load folder tree' })
    }
  }
)

// GET /api/projects/:projectId/docs/storage-status
// Returns a non-secret diagnostic about Azure Blob configuration so UI can guide setup.
router.get(
  '/storage-status',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireActiveProject,
  requirePermission('documents.read', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  async (req, res) => {
    try {
      const diag = diagnoseStorageConfig()
      if (!diag.ok) {
        return res.status(503).json({ ok: false, error: diag.error, code: diag.code, hint: diag.hint })
      }
      const cfg = diag.cfg || {}
      return res.json({
        ok: true,
        mode: cfg.mode,
        container: cfg.container,
        accountName: cfg.accountName,
        blobEndpoint: cfg.blobEndpoint,
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to check storage status' })
    }
  }
)

// POST /api/projects/:projectId/docs/folders
router.post(
  '/folders',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireActiveProject,
  requirePermission('folders.create', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const parentIdRaw = req.body && req.body.parentId != null ? String(req.body.parentId) : null
      const parentId = parentIdRaw ? (mongoose.Types.ObjectId.isValid(parentIdRaw) ? parentIdRaw : null) : null
      if (parentIdRaw && !parentId) return res.status(400).json({ error: 'Invalid parentId' })

      const nameV = validateFolderName(req.body && req.body.name)
      if (!nameV.ok) return res.status(400).json({ error: nameV.error })

      const path = await computeFolderPath({ orgId, projectId, parentId, name: nameV.value })
      if (parentId && !path) return res.status(404).json({ error: 'Parent folder not found' })

      const folder = await DocFolder.create({
        orgId,
        projectId,
        parentId,
        name: nameV.value,
        path,
        createdBy: req.user._id,
        updatedBy: req.user._id,
      })

      return res.status(201).json({
        folder: {
          id: String(folder._id),
          parentId: folder.parentId ? String(folder.parentId) : null,
          name: folder.name,
          path: folder.path,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
        },
      })
    } catch (e) {
      if (e && e.code === 11000) return res.status(409).json({ error: 'A folder with this name already exists in this location', code: 'DUPLICATE_FOLDER_NAME' })
      return res.status(500).json({ error: 'Failed to create folder' })
    }
  }
)

// PATCH /api/projects/:projectId/docs/folders/:folderId
router.patch(
  '/folders/:folderId',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('folderId'),
  requireActiveProject,
  requirePermission('folders.update', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  loadFolder,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const folderId = req.params.folderId
      const folder = req.docFolder

      const nameRaw = req.body && req.body.name !== undefined ? req.body.name : undefined
      const parentIdRaw = req.body && req.body.parentId !== undefined ? req.body.parentId : undefined

      let nextName = folder.name
      if (nameRaw !== undefined) {
        const nameV = validateFolderName(nameRaw)
        if (!nameV.ok) return res.status(400).json({ error: nameV.error })
        nextName = nameV.value
      }

      let nextParentId = folder.parentId ? String(folder.parentId) : null
      if (parentIdRaw !== undefined) {
        if (parentIdRaw === null || parentIdRaw === '') {
          nextParentId = null
        } else {
          const pid = String(parentIdRaw)
          if (!mongoose.Types.ObjectId.isValid(pid)) return res.status(400).json({ error: 'Invalid parentId' })
          if (pid === String(folderId)) return res.status(400).json({ error: 'Cannot move a folder into itself', code: 'INVALID_FOLDER_MOVE' })
          nextParentId = pid
        }
      }

      const oldPath = asString(folder.path)
      const newPath = await computeFolderPath({ orgId, projectId, parentId: nextParentId, name: nextName })
      if (nextParentId && !newPath) return res.status(404).json({ error: 'Parent folder not found' })

      // Prevent moving into own subtree by checking path prefix.
      if (nextParentId) {
        const parent = await DocFolder.findOne({ _id: nextParentId, projectId, deletedAt: null }).select('path').lean()
        const parentPath = asString(parent && parent.path)
        if (parentPath && (parentPath === oldPath || parentPath.startsWith(`${oldPath}/`))) {
          return res.status(400).json({ error: 'Cannot move a folder into its own descendant', code: 'INVALID_FOLDER_MOVE' })
        }
      }

      // Update folder
      await DocFolder.updateOne(
        { _id: folderId, projectId },
        { $set: { name: nextName, parentId: nextParentId, path: newPath, updatedBy: req.user._id } }
      )

      // Update descendants (best-effort; keep it simple and bounded)
      if (newPath !== oldPath) {
        const prefix = new RegExp(`^${escapeRegex(oldPath)}/`)
        const descendants = await DocFolder.find({ projectId, deletedAt: null, path: prefix }).select('_id path').lean()
        for (const d of descendants) {
          const dPath = asString(d.path)
          // Replace only the leading prefix, not any later occurrences.
          const updated = dPath.startsWith(oldPath) ? `${newPath}${dPath.slice(oldPath.length)}` : dPath
          await DocFolder.updateOne({ _id: d._id, projectId }, { $set: { path: updated, updatedBy: req.user._id } })
        }
      }

      const updatedFolder = await DocFolder.findOne({ _id: folderId, projectId, deletedAt: null }).lean()
      return res.json({
        folder: {
          id: String(updatedFolder._id),
          parentId: updatedFolder.parentId ? String(updatedFolder.parentId) : null,
          name: updatedFolder.name,
          path: updatedFolder.path,
          createdAt: updatedFolder.createdAt,
          updatedAt: updatedFolder.updatedAt,
        },
      })
    } catch (e) {
      if (e && e.code === 11000) return res.status(409).json({ error: 'A folder with this name already exists in this location', code: 'DUPLICATE_FOLDER_NAME' })
      return res.status(500).json({ error: 'Failed to update folder' })
    }
  }
)

// DELETE /api/projects/:projectId/docs/folders/:folderId
router.delete(
  '/folders/:folderId',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('folderId'),
  requireActiveProject,
  requirePermission('folders.delete', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  loadFolder,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const folderId = req.params.folderId
      const recursive = isTruthy(req.query.recursive)

      if (!recursive) {
        const subfolderCount = await DocFolder.countDocuments({ projectId, deletedAt: null, parentId: folderId })
        if (subfolderCount > 0) return res.status(409).json({ error: 'Folder is not empty', code: 'FOLDER_NOT_EMPTY', subfolderCount })
        const fileCount = await DocFile.countDocuments({ projectId, folderId, status: { $ne: 'deleted' } })
        if (fileCount > 0) return res.status(409).json({ error: 'Folder is not empty', code: 'FOLDER_NOT_EMPTY', fileCount })

        await DocFolder.updateOne(
          { _id: folderId, projectId },
          { $set: { deletedAt: new Date(), deletedBy: req.user._id, updatedBy: req.user._id } }
        )
        return res.json({ ok: true })
      }

      // Recursive delete: delete all descendant folders and mark all files as deleted (and delete blobs).
      const rootFolder = req.docFolder
      const rootPath = asString(rootFolder.path)
      const pathRe = rootPath ? new RegExp(`^${escapeRegex(rootPath)}(?:/|$)`) : null
      const folderDocs = await DocFolder.find(
        pathRe ? { projectId, deletedAt: null, path: pathRe } : { projectId, deletedAt: null, _id: folderId }
      ).select('_id').lean()
      const folderIds = Array.from(new Set(folderDocs.map((f) => String(f._id))))
      if (!folderIds.includes(String(folderId))) folderIds.push(String(folderId))

      const files = await DocFile.find({
        projectId,
        folderId: { $in: folderIds },
        status: { $ne: 'deleted' },
      }).select('_id blobName').lean()

      for (const f of files) {
        try {
          const sas = await generateBlobSasUrl({ blobName: asString(f.blobName), permissions: 'd', expiresInSec: 600 })
          await deleteBlob(sas.url)
        } catch (_) {
          // best-effort
        }
        try {
          await DocFile.updateOne(
            { _id: f._id, projectId },
            { $set: { status: 'deleted', deletedAt: new Date(), deletedBy: req.user._id, updatedBy: req.user._id } }
          )
        } catch (_) {
          // best-effort
        }
      }

      await DocFolder.updateMany(
        { projectId, _id: { $in: folderIds } },
        { $set: { deletedAt: new Date(), deletedBy: req.user._id, updatedBy: req.user._id } }
      )
      return res.json({ ok: true, recursive: true, deletedFolders: folderIds.length, deletedFiles: files.length })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete folder' })
    }
  }
)

// GET /api/projects/:projectId/docs/files?folderId=...
router.get(
  '/files',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdQuery('folderId'),
  requireActiveProject,
  requirePermission('documents.read', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  async (req, res) => {
    try {
      const projectId = req.params.projectId
      const folderId = String(req.query.folderId)
      const includePending = isTruthy(req.query.includePending)
      const includeDeleted = isTruthy(req.query.includeDeleted)

      if ((includePending || includeDeleted) && !isGlobalAdmin(req.user)) {
        return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN_DEBUG_LISTING' })
      }

      const folder = await DocFolder.findOne({ _id: folderId, projectId, deletedAt: null }).select('_id').lean()
      if (!folder) return res.status(404).json({ error: 'Folder not found' })

      const status = includeDeleted
        ? (includePending ? { $in: ['pending', 'ready', 'deleted'] } : { $in: ['ready', 'deleted'] })
        : (includePending ? { $in: ['pending', 'ready'] } : 'ready')

      const files = await DocFile.find({ projectId, folderId, status })
        .sort({ updatedAt: -1 })
        .select('originalName contentType sizeBytes status createdAt updatedAt')
        .lean()

      return res.json({
        files: files.map((f) => ({
          id: String(f._id),
          originalName: f.originalName,
          contentType: f.contentType,
          sizeBytes: f.sizeBytes,
          status: f.status,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to list files' })
    }
  }
)

// POST /api/projects/:projectId/docs/files/request-upload
router.post(
  '/files/request-upload',
  auth,
  requireNotDisabled('uploads'),
  rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'docs-upload', keyFn: docsRateLimitKey }),
  requireObjectIdParam('projectId'),
  requireActiveProject,
  requirePermission('documents.create', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  requireObjectIdBody('folderId'),
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const folderId = String(req.body.folderId)

      // projectId is the tenant boundary; allow request even if legacy orgId differs.
      const folder = await DocFolder.findOne({ _id: folderId, projectId, deletedAt: null }).select('_id path').lean()
      if (!folder) return res.status(404).json({ error: 'Folder not found' })

      const filenameV = validateFilename(req.body && req.body.filename)
      if (!filenameV.ok) return res.status(400).json({ error: filenameV.error })

      const contentType = asString(req.body && req.body.contentType).trim().toLowerCase()
      if (!contentType) return res.status(400).json({ error: 'contentType is required' })
      const allowed = new Set(getDocsAllowedContentTypes())
      if (!allowed.has(contentType)) return res.status(400).json({ error: 'Unsupported contentType' })

      const sizeBytes = Number(req.body && req.body.sizeBytes)
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return res.status(400).json({ error: 'sizeBytes must be a positive number' })
      const maxSizeBytes = getDocsMaxSizeBytes()
      if (sizeBytes > maxSizeBytes) return res.status(400).json({ error: `File is too large (max ${maxSizeBytes} bytes)` })

      // Special constraints for photos stored under the "Photos" root.
      const folderPath = asString(folder.path).trim()
      const pathParts = folderPath.split('/').map((p) => p.trim()).filter(Boolean)
      const isPhotosRoot = pathParts.length > 0 && pathParts[0].toLowerCase() === 'photos'
      const isPhotosLeaf = isPhotosRoot && pathParts.length >= 3
      if (isPhotosRoot) {
        if (!contentType.startsWith('image/')) {
          return res.status(400).json({ error: 'Photos must be images', code: 'PHOTOS_IMAGE_REQUIRED' })
        }
        const maxPhotoBytes = 256 * 1024
        if (sizeBytes > maxPhotoBytes) {
          return res.status(400).json({ error: `Photo is too large (max ${maxPhotoBytes} bytes)`, code: 'PHOTO_TOO_LARGE' })
        }
        if (isPhotosLeaf) {
          const currentCount = await DocFile.countDocuments({ projectId, folderId, status: { $ne: 'deleted' } })
          if (currentCount >= 16) {
            return res.status(409).json({ error: 'Maximum number of photos reached (16)', code: 'MAX_PHOTOS_REACHED' })
          }
        }
      }

      const pairV = validateFilenameContentTypePair({ filename: filenameV.value, contentType })
      if (!pairV.ok) {
        return res.status(400).json({ error: pairV.error, code: pairV.code, allowedExtensions: pairV.allowedExtensions })
      }

      const uuid = crypto.randomUUID()
      const blobName = `docs/${projectId}/${uuid}`

      const file = await DocFile.create({
        orgId,
        projectId,
        folderId,
        originalName: filenameV.value,
        blobName,
        contentType,
        sizeBytes,
        status: 'pending',
        createdBy: req.user._id,
      })

      const sas = await generateBlobSasUrl({ blobName, permissions: 'cw', expiresInSec: 600 })
      try {
        console.log(JSON.stringify({
          level: 'info',
          msg: 'docs.request-upload',
          reqId: req.id,
          projectId,
          userId: String(req.user && (req.user._id || req.user.id) || ''),
          folderId,
          fileId: String(file._id),
          blobName,
          originalName: file.originalName,
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
        }))
      } catch (_) {}
      return res.status(201).json({
        fileId: String(file._id),
        uploadUrl: sas.url,
        expiresAt: sas.expiresAt,
      })
    } catch (e) {
      if (sendStorageConfigError(res, e)) return
      return res.status(500).json({ error: 'Failed to request upload' })
    }
  }
)

// POST /api/projects/:projectId/docs/files/:fileId/complete
router.post(
  '/files/:fileId/complete',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('fileId'),
  requireActiveProject,
  requirePermission('documents.create', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  loadFile,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const fileId = req.params.fileId
      const file = req.docFile

      if (file.status === 'deleted') return res.status(409).json({ error: 'File is deleted' })
      if (file.status === 'ready') {
        return res.json({
          file: {
            id: String(file._id),
            originalName: file.originalName,
            contentType: file.contentType,
            sizeBytes: file.sizeBytes,
            status: file.status,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          },
        })
      }

      const sas = await generateBlobSasUrl({ blobName: file.blobName, permissions: 'r', expiresInSec: 600 })
      const head = await blobExists(sas.url)
      if (!head.exists) return res.status(404).json({ error: 'Blob not found' })

      const expectedCt = asString(file.contentType).trim().toLowerCase()
      const actualCt = asString(head.contentType).trim().toLowerCase()
      if (actualCt && actualCt !== 'application/octet-stream' && expectedCt && actualCt !== expectedCt) {
        return res.status(409).json({
          error: 'Blob contentType does not match expected',
          code: 'CONTENT_TYPE_MISMATCH',
          expected: expectedCt,
          actual: actualCt,
        })
      }

      const next = { status: 'ready' }
      if (Number.isFinite(head.sizeBytes) && head.sizeBytes > 0) next.sizeBytes = head.sizeBytes
      if (actualCt && actualCt !== 'application/octet-stream') next.contentType = actualCt
      next.updatedBy = req.user._id

      await DocFile.updateOne({ _id: fileId, orgId, projectId }, { $set: next })
      const updated = await DocFile.findOne({ _id: fileId, orgId, projectId }).lean()
      try {
        console.log(JSON.stringify({
          level: 'info',
          msg: 'docs.complete',
          reqId: req.id,
          projectId,
          userId: String(req.user && (req.user._id || req.user.id) || ''),
          fileId,
          blobName: file.blobName,
          status: 'ready',
        }))
      } catch (_) {}
      return res.json({
        file: {
          id: String(updated._id),
          originalName: updated.originalName,
          contentType: updated.contentType,
          sizeBytes: updated.sizeBytes,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      })
    } catch (e) {
      if (sendStorageConfigError(res, e)) return
      return res.status(500).json({ error: 'Failed to complete upload' })
    }
  }
)

// GET /api/projects/:projectId/docs/files/:fileId/download-url
router.get(
  '/files/:fileId/download-url',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('fileId'),
  requireActiveProject,
  requirePermission('documents.read', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  loadFile,
  async (req, res) => {
    try {
      const file = req.docFile
      if (file.status !== 'ready') return res.status(409).json({ error: 'File is not ready' })
      const sas = await generateBlobSasUrl({ blobName: file.blobName, permissions: 'r', expiresInSec: 600 })
      return res.json({ downloadUrl: sas.url, expiresAt: sas.expiresAt })
    } catch (e) {
      if (sendStorageConfigError(res, e)) return
      return res.status(500).json({ error: 'Failed to create download URL' })
    }
  }
)

// GET /api/projects/:projectId/docs/files/:fileId/preview-url
// For PDFs/images: returns the original blob read SAS.
// For Office docs (docx/xlsx): converts to PDF (best-effort) and returns a read SAS for the preview.
router.get(
  '/files/:fileId/preview-url',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('fileId'),
  requireActiveProject,
  requirePermission('documents.read', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  loadFile,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const fileId = req.params.fileId
      const file = req.docFile

      if (file.status === 'deleted') return res.status(409).json({ error: 'File is deleted' })
      if (file.status !== 'ready') return res.status(409).json({ error: 'File is not ready' })

      const ct = asString(file.contentType).trim().toLowerCase()
      const isPdf = ct.includes('pdf')
      const isImg = ct.startsWith('image/')

      // If already previewable, just return download SAS for original.
      if (isPdf || isImg) {
        const sas = await generateBlobSasUrl({ blobName: file.blobName, permissions: 'r', expiresInSec: 600 })
        return res.json({ previewUrl: sas.url, contentType: file.contentType, source: 'original', expiresAt: sas.expiresAt })
      }

      if (!isOfficeDoc(ct)) {
        return res.status(415).json({ error: 'Preview not supported for this file type', code: 'PREVIEW_UNSUPPORTED' })
      }

      // Use cached preview if present and accessible.
      if (file.previewBlobName && file.previewStatus === 'ready') {
        const sas = await generateBlobSasUrl({ blobName: file.previewBlobName, permissions: 'r', expiresInSec: 600 })
        const head = await blobExists(sas.url)
        if (head.exists) {
          return res.json({ previewUrl: sas.url, contentType: 'application/pdf', source: 'converted', expiresAt: sas.expiresAt })
        }
      }

      // Convert on demand.
      await DocFile.updateOne(
        { _id: fileId, orgId, projectId },
        { $set: { previewStatus: 'pending', previewError: '', updatedBy: req.user._id } }
      )

      let result
      try {
        const originalRead = await generateBlobSasUrl({ blobName: file.blobName, permissions: 'r', expiresInSec: 600 })
        result = await convertOfficeDocToPdfBlob({
          downloadUrl: originalRead.url,
          projectId,
          fileId,
          contentType: file.contentType,
          generateUploadUrl: (previewBlobName) => generateBlobSasUrl({ blobName: previewBlobName, permissions: 'cw', expiresInSec: 600 }),
        })
      } catch (e) {
        try {
          await DocFile.updateOne(
            { _id: fileId, orgId, projectId },
            { $set: { previewStatus: 'error', previewError: (e && e.message) ? String(e.message).slice(0, 500) : 'Preview conversion failed', updatedBy: req.user._id } }
          )
        } catch (_) {}
        throw e
      }

      await DocFile.updateOne(
        { _id: fileId, orgId, projectId },
        {
          $set: {
            previewBlobName: result.previewBlobName,
            previewContentType: 'application/pdf',
            previewStatus: 'ready',
            previewUpdatedAt: new Date(),
            updatedBy: req.user._id,
          },
        }
      )

      const previewRead = await generateBlobSasUrl({ blobName: result.previewBlobName, permissions: 'r', expiresInSec: 600 })
      return res.json({ previewUrl: previewRead.url, contentType: 'application/pdf', source: 'converted', expiresAt: previewRead.expiresAt })
    } catch (e) {
      if (sendStorageConfigError(res, e)) return
      const status = Number(e && e.status) || 500
      const code = e && e.code
      const hint = e && e.hint
      const msg = (e && e.message) || 'Failed to create preview URL'
      if (code) return res.status(status).json(hint ? { error: msg, code, hint } : { error: msg, code })
      return res.status(status).json({ error: msg })
    }
  }
)

// PATCH /api/projects/:projectId/docs/files/:fileId
router.patch(
  '/files/:fileId',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('fileId'),
  requireActiveProject,
  requirePermission('documents.update', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  loadFile,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const fileId = req.params.fileId
      const file = req.docFile

      const next = {}

      if (req.body && req.body.filename !== undefined) {
        const v = validateFilename(req.body.filename)
        if (!v.ok) return res.status(400).json({ error: v.error })
        const pairV = validateFilenameContentTypePair({ filename: v.value, contentType: file.contentType })
        if (!pairV.ok) {
          return res.status(400).json({ error: pairV.error, code: pairV.code, allowedExtensions: pairV.allowedExtensions })
        }
        next.originalName = v.value
      }

      if (req.body && req.body.folderId !== undefined) {
        const fid = String(req.body.folderId || '')
        if (!mongoose.Types.ObjectId.isValid(fid)) return res.status(400).json({ error: 'Invalid folderId' })
        // projectId is the tenant boundary; allow move even if legacy orgId differs.
        const folder = await DocFolder.findOne({ _id: fid, projectId, deletedAt: null }).select('_id').lean()
        if (!folder) return res.status(404).json({ error: 'Folder not found' })
        next.folderId = fid
      }

      if (!Object.keys(next).length) {
        return res.json({
          file: {
            id: String(file._id),
            originalName: file.originalName,
            contentType: file.contentType,
            sizeBytes: file.sizeBytes,
            status: file.status,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          },
        })
      }

      next.updatedBy = req.user._id
      await DocFile.updateOne({ _id: fileId, orgId, projectId }, { $set: next })
      const updated = await DocFile.findOne({ _id: fileId, orgId, projectId }).lean()
      return res.json({
        file: {
          id: String(updated._id),
          originalName: updated.originalName,
          contentType: updated.contentType,
          sizeBytes: updated.sizeBytes,
          status: updated.status,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update file' })
    }
  }
)

// DELETE /api/projects/:projectId/docs/files/:fileId
router.delete(
  '/files/:fileId',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('fileId'),
  requireActiveProject,
  requirePermission('documents.delete', { projectParam: 'projectId' }),
  requireDocsProjectAccess,
  loadFile,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const fileId = req.params.fileId
      const file = req.docFile
      if (file.status === 'deleted') return res.json({ ok: true, blobDeleted: true })

      let blobDeleted = false
      let previewBlobDeleted = false
      // Delete blob first (best effort), then mark metadata deleted.
      try {
        const sas = await generateBlobSasUrl({ blobName: file.blobName, permissions: 'd', expiresInSec: 600 })
        const del = await deleteBlob(sas.url)
        blobDeleted = !!del.deleted
        if (file.previewBlobName) {
          try {
            const psas = await generateBlobSasUrl({ blobName: file.previewBlobName, permissions: 'd', expiresInSec: 600 })
            const pdel = await deleteBlob(psas.url)
            previewBlobDeleted = !!pdel.deleted
          } catch (_) {
            previewBlobDeleted = false
          }
        }
      } catch (e) {
        // If Azure isn't configured, bubble the diagnostic so the user can fix it.
        if (sendStorageConfigError(res, e)) return
        blobDeleted = false
      }

      await DocFile.updateOne(
        { _id: fileId, orgId, projectId },
        { $set: { status: 'deleted', deletedBy: req.user._id, deletedAt: new Date(), updatedBy: req.user._id } }
      )
      try {
        console.log(JSON.stringify({
          level: 'info',
          msg: 'docs.delete',
          reqId: req.id,
          projectId,
          userId: String(req.user && (req.user._id || req.user.id) || ''),
          fileId,
          blobName: file.blobName,
          blobDeleted,
          previewBlobDeleted,
        }))
      } catch (_) {}
      return res.json({ ok: true, blobDeleted })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete file' })
    }
  }
)

module.exports = router
