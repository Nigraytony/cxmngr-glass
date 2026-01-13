const express = require('express')
const mongoose = require('mongoose')

const router = express.Router({ mergeParams: true })

const { auth } = require('../middleware/auth')
const { requireActiveProject } = require('../middleware/subscription')
const { requireNotDisabled } = require('../middleware/killSwitch')
const { isTruthy, requireObjectIdParam, requireObjectIdQuery, requireObjectIdBody } = require('../middleware/validate')
const Project = require('../models/project')
const DocFolder = require('../models/docFolder')
const DocFile = require('../models/docFile')
const { validateFolderName, validateFilename } = require('../utils/docsValidation')

function asString(v) {
  return typeof v === 'string' ? v : (v == null ? '' : String(v))
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

async function computeFolderPath({ orgId, projectId, parentId, name }) {
  if (!parentId) return name
  const parent = await DocFolder.findOne({ _id: parentId, orgId, projectId }).select('path').lean()
  if (!parent) return null
  const base = asString(parent.path).trim()
  return base ? `${base}/${name}` : name
}

async function loadFolder(req, res, next) {
  try {
    const orgId = req.docsOrgId
    const projectId = req.params.projectId
    const folderId = req.params.folderId
    const folder = await DocFolder.findOne({ _id: folderId, orgId, projectId }).lean()
    if (!folder) return res.status(404).json({ error: 'Folder not found' })
    req.docFolder = folder
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load folder' })
  }
}

async function loadFile(req, res, next) {
  try {
    const orgId = req.docsOrgId
    const projectId = req.params.projectId
    const fileId = req.params.fileId
    const file = await DocFile.findOne({ _id: fileId, orgId, projectId }).lean()
    if (!file) return res.status(404).json({ error: 'File not found' })
    req.docFile = file
    return next()
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load file' })
  }
}

function buildTree(folders) {
  const nodes = new Map()
  const childrenByParent = new Map()
  for (const f of folders) {
    const id = String(f._id)
    nodes.set(id, { id, name: f.name, path: f.path, parentId: f.parentId ? String(f.parentId) : null, children: [] })
    const parentKey = f.parentId ? String(f.parentId) : '__root__'
    const list = childrenByParent.get(parentKey) || []
    list.push(id)
    childrenByParent.set(parentKey, list)
  }

  function attach(parentKey, out) {
    const ids = childrenByParent.get(parentKey) || []
    ids.sort((a, b) => {
      const an = nodes.get(a)?.name || ''
      const bn = nodes.get(b)?.name || ''
      return an.localeCompare(bn)
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
  requireDocsProjectAccess,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const folders = await DocFolder.find({ orgId, projectId }).select('name path parentId').lean()
      return res.json({ root: buildTree(folders) })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load folder tree' })
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
      if (e && e.code === 11000) return res.status(409).json({ error: 'A folder with this name already exists in this location' })
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
          if (pid === String(folderId)) return res.status(400).json({ error: 'Cannot move a folder into itself' })
          nextParentId = pid
        }
      }

      const oldPath = asString(folder.path)
      const newPath = await computeFolderPath({ orgId, projectId, parentId: nextParentId, name: nextName })
      if (nextParentId && !newPath) return res.status(404).json({ error: 'Parent folder not found' })

      // Prevent moving into own subtree by checking path prefix.
      if (nextParentId) {
        const parent = await DocFolder.findOne({ _id: nextParentId, orgId, projectId }).select('path').lean()
        const parentPath = asString(parent && parent.path)
        if (parentPath && (parentPath === oldPath || parentPath.startsWith(`${oldPath}/`))) {
          return res.status(400).json({ error: 'Cannot move a folder into its own descendant' })
        }
      }

      // Update folder
      await DocFolder.updateOne(
        { _id: folderId, orgId, projectId },
        { $set: { name: nextName, parentId: nextParentId, path: newPath } }
      )

      // Update descendants (best-effort; keep it simple and bounded)
      if (newPath !== oldPath) {
        const prefix = new RegExp(`^${escapeRegex(oldPath)}/`)
        const descendants = await DocFolder.find({ orgId, projectId, path: prefix }).select('_id path').lean()
        for (const d of descendants) {
          const dPath = asString(d.path)
          const updated = dPath.replace(oldPath, newPath)
          await DocFolder.updateOne({ _id: d._id, orgId, projectId }, { $set: { path: updated } })
        }
      }

      const updatedFolder = await DocFolder.findOne({ _id: folderId, orgId, projectId }).lean()
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
      if (e && e.code === 11000) return res.status(409).json({ error: 'A folder with this name already exists in this location' })
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
  requireDocsProjectAccess,
  loadFolder,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const folderId = req.params.folderId

      const subfolderCount = await DocFolder.countDocuments({ orgId, projectId, parentId: folderId })
      if (subfolderCount > 0) return res.status(409).json({ error: 'Folder is not empty' })
      const fileCount = await DocFile.countDocuments({ orgId, projectId, folderId, status: { $ne: 'deleted' } })
      if (fileCount > 0) return res.status(409).json({ error: 'Folder is not empty' })

      await DocFolder.deleteOne({ _id: folderId, orgId, projectId })
      return res.json({ ok: true })
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
  requireDocsProjectAccess,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const folderId = String(req.query.folderId)
      const includePending = isTruthy(req.query.includePending)
      const includeDeleted = isTruthy(req.query.includeDeleted)

      const folder = await DocFolder.findOne({ _id: folderId, orgId, projectId }).select('_id').lean()
      if (!folder) return res.status(404).json({ error: 'Folder not found' })

      const status = includeDeleted
        ? (includePending ? { $in: ['pending', 'ready', 'deleted'] } : { $in: ['ready', 'deleted'] })
        : (includePending ? { $in: ['pending', 'ready'] } : 'ready')

      const files = await DocFile.find({ orgId, projectId, folderId, status })
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
  requireObjectIdParam('projectId'),
  requireActiveProject,
  requireDocsProjectAccess,
  async (_req, res) => res.status(501).json({ error: 'Not implemented yet' })
)

// POST /api/projects/:projectId/docs/files/:fileId/complete
router.post(
  '/files/:fileId/complete',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('fileId'),
  requireActiveProject,
  requireDocsProjectAccess,
  loadFile,
  async (_req, res) => res.status(501).json({ error: 'Not implemented yet' })
)

// GET /api/projects/:projectId/docs/files/:fileId/download-url
router.get(
  '/files/:fileId/download-url',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('fileId'),
  requireActiveProject,
  requireDocsProjectAccess,
  loadFile,
  async (_req, res) => res.status(501).json({ error: 'Not implemented yet' })
)

// PATCH /api/projects/:projectId/docs/files/:fileId
router.patch(
  '/files/:fileId',
  auth,
  requireNotDisabled('uploads'),
  requireObjectIdParam('projectId'),
  requireObjectIdParam('fileId'),
  requireActiveProject,
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
        next.originalName = v.value
      }

      if (req.body && req.body.folderId !== undefined) {
        const fid = String(req.body.folderId || '')
        if (!mongoose.Types.ObjectId.isValid(fid)) return res.status(400).json({ error: 'Invalid folderId' })
        const folder = await DocFolder.findOne({ _id: fid, orgId, projectId }).select('_id').lean()
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
  requireDocsProjectAccess,
  loadFile,
  async (req, res) => {
    try {
      const orgId = req.docsOrgId
      const projectId = req.params.projectId
      const fileId = req.params.fileId
      await DocFile.updateOne({ _id: fileId, orgId, projectId }, { $set: { status: 'deleted' } })
      return res.json({ ok: true })
    } catch (e) {
      return res.status(500).json({ error: 'Failed to delete file' })
    }
  }
)

module.exports = router

