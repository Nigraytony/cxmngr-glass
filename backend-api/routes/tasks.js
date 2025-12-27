const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const Project = require('../models/project');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const { requireFeature } = require('../middleware/planGuard');
const { rateLimit } = require('../middleware/rateLimit');
const { requireNotDisabled } = require('../middleware/killSwitch');
const { isObjectId, requireObjectIdParam, requireObjectIdQuery } = require('../middleware/validate');
const runMiddleware = require('../middleware/runMiddleware');
const multer = require('multer');
const { XMLParser } = require('fast-xml-parser');
const TaskTemplate = require('../models/taskTemplate');
const sanitizeHtml = require('sanitize-html');
const { buildSafeRegex } = require('../utils/search')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const importLimiter = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'tasks-import' })

function isProdEnv() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production'
}

function normalizeShortString(value, { maxLen = 128 } = {}) {
  if (value === undefined || value === null) return null
  const s = String(value).trim()
  if (!s) return null
  if (s.length > maxLen) return null
  return s
}

function safeErrorMessage(err, fallback) {
  const fb = fallback || 'Server error'
  if (isProdEnv()) return fb
  const msg = err && (err.message || err.error || (typeof err === 'string' ? err : null))
  return msg ? String(msg) : fb
}

function sendServerError(res, err, fallback) {
  return res.status(500).send({ error: safeErrorMessage(err, fallback) })
}

function pickTaskPayload(source) {
  const body = source || {}
  const out = {}
  const allowed = [
    'taskId',
    'wbs',
    'name',
    'description',
    'notes',
    'start',
    'end',
    'duration',
    'percentComplete',
    'status',
    'cost',
    'autoCost',
    'expenses',
    'parentId',
    'dependencies',
    'assignee',
    'tags',
    'activityId',
    'deleted',
  ]
  for (const k of allowed) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  return out
}

async function loadTaskProjectId(req, res, next) {
  try {
    const id = String(req.params.id || '').trim()
    if (!id) return res.status(400).send({ error: 'Task id is required' })
    const mongoose = require('mongoose')
    let task = null
    if (mongoose.Types.ObjectId.isValid(id)) task = await Task.findById(id).select('projectId').lean()
    if (!task) task = await Task.findOne({ taskId: id }).select('projectId').lean()
    if (!task) return res.status(404).send({ error: 'Task not found' })
    req.query = { ...(req.query || {}), projectId: String(task.projectId) }
    req.body = req.body || {}
    if (!req.body.projectId) req.body.projectId = task.projectId
    return next()
  } catch (e) {
    return sendServerError(res, e, 'Failed to resolve task project')
  }
}

function buildMsProjectParser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    isArray: (_name, jpath) => {
      // ensure Tasks.Task are arrays
      return ['Project.Tasks.Task', 'Project.PredecessorLink', 'PredecessorLink'].includes(jpath);
    }
  });
}

async function importMsProjectXml({ projectId, xml }) {
  const parser = buildMsProjectParser();
  let parsed;
  try {
    parsed = parser.parse(xml);
  } catch (e) {
    const err = new Error('Failed to parse XML');
    err.detail = e && e.message ? e.message : String(e);
    throw err;
  }

  // MS Project XML typically: Project -> Tasks -> Task (array)
  const proj = parsed && parsed.Project ? parsed.Project : null;
  const rawTasks = proj && proj.Tasks && proj.Tasks.Task ? proj.Tasks.Task : [];
  const tasksArray = Array.isArray(rawTasks) ? rawTasks : (rawTasks ? [rawTasks] : []);

  const created = [];
  for (const rt of tasksArray) {
    // ignore summary tasks that may not have Start/Finish or are marked as null
    const uid = rt.UID || rt.ID || rt['@_UID'] || rt['@_ID'] || null;
    const name = rt.Name || rt['@_Name'] || rt['@_name'] || '';
    const start = rt.Start || rt['@_Start'] || null;
    const finish = rt.Finish || rt['@_Finish'] || null;
    const notes = rt.Notes || rt['@_Notes'] || '';

    // Predecessors may be represented in PredecessorLink elements
    let deps = [];
    if (rt.PredecessorLink) {
      const pl = rt.PredecessorLink;
      const arr = Array.isArray(pl) ? pl : [pl];
      for (const p of arr) {
        const predUid = p.PredecessorUID || p['@_PredecessorUID'] || p['@_PredecessorID'] || p.PredecessorID || null;
        if (predUid) deps.push(String(predUid));
      }
    }

    const doc = {
      projectId: projectId,
      taskId: uid ? `T-${String(uid)}` : undefined,
      name: String(name || `Task ${uid || ''}`).trim(),
      description: '',
      notes: typeof notes === 'object' ? JSON.stringify(notes) : (notes || ''),
      start: start ? new Date(start) : null,
      end: finish ? new Date(finish) : null,
      duration: (start && finish) ? Math.max(1, Math.round((new Date(finish) - new Date(start)) / (1000 * 60 * 60 * 24))) : undefined,
      percentComplete: 0,
      status: 'Not Started',
      // WBS (outline number) from MS Project goes into `wbs` field
      wbs: rt.OutlineNumber || rt['@_OutlineNumber'] || null,
      // parentId remains available but is not the same as WBS; keep OutlineNumber in parentId for now
      parentId: rt.OutlineNumber || rt['@_OutlineNumber'] || null,
      dependencies: deps.map(d => `T-${d}`),
      assignee: null,
      tags: [],
      activityId: null,
      deleted: false,
    };

    // Sanitize imported text fields (MSP Notes can contain HTML/RTF-ish text)
    try {
      if (typeof doc.name === 'string') doc.name = doc.name.slice(0, 300)
      if (typeof doc.notes === 'string') {
        doc.notes = sanitizeHtml(String(doc.notes), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 50_000)
      }
    } catch (_) { /* ignore */ }

    try {
      const t = new Task(doc);
      await t.save();
      created.push(t);
    } catch (e) {
      // ignore individual save errors but continue
      console.error('task import save err', e && e.message ? e.message : e);
    }
  }

  // attempt to add created tasks to project.tasks
  try {
    if (created.length > 0) {
      const project = await Project.findById(projectId);
      if (project) {
        project.tasks = project.tasks || [];
        for (const c of created) project.tasks.push(c._id);
        await project.save();
      }
    }
  } catch (e) { /* ignore */ }

  return created;
}

function parseCsvRows(input, { delimiter = ',' } = {}) {
  const text = String(input || '')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    if (row.length === 1 && String(row[0] || '').trim() === '') {
      row = []
      return
    }
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1]
        if (next === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
      continue
    }
    if (c === delimiter) {
      pushField()
      continue
    }
    if (c === '\n') {
      pushField()
      pushRow()
      continue
    }
    if (c === '\r') continue
    field += c
  }
  pushField()
  pushRow()
  return rows
}

function normalizeCsvHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '')
}

function safeParseDate(value) {
  const s = String(value || '').trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

function normalizeDependenciesCell(value) {
  const raw = String(value || '').trim()
  if (!raw) return []
  const parts = raw
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
  return parts.map((p) => {
    const v = String(p)
    if (/^t-\d+$/i.test(v)) return v.toUpperCase()
    if (/^\d+$/.test(v)) return `T-${v}`
    return v
  })
}

async function importCsvTasks({ projectId, csv }) {
  const text = String(csv || '')
  if (!text.trim()) {
    const err = new Error('CSV is empty')
    err.status = 400
    throw err
  }
  if (text.length > 2_000_000) {
    const err = new Error('CSV is too large')
    err.status = 413
    throw err
  }

  const rows = parseCsvRows(text)
  if (!rows.length) {
    const err = new Error('CSV contains no rows')
    err.status = 400
    throw err
  }

  const headers = rows[0].map(normalizeCsvHeader)
  const dataRows = rows.slice(1).filter((r) => Array.isArray(r) && r.some((c) => String(c || '').trim()))
  const get = (r, key) => {
    const idx = headers.indexOf(key)
    if (idx < 0) return ''
    return r[idx]
  }

  const created = []
  let i = 0
  for (const r of dataRows) {
    i++
    const uid = String(get(r, 'taskid') || get(r, 'uid') || '').trim() || String(i)
    const name = String(get(r, 'name') || '').trim()
    const wbs = String(get(r, 'wbs') || get(r, 'outlinenumber') || '').trim() || null
    const start = safeParseDate(get(r, 'start'))
    const finish = safeParseDate(get(r, 'finish') || get(r, 'end'))
    const notes = String(get(r, 'notes') || '').trim()
    const description = String(get(r, 'description') || '').trim()
    const status = String(get(r, 'status') || '').trim() || 'Not Started'
    const percentCompleteRaw = String(get(r, 'percentcomplete') || '').trim()
    const percentComplete = percentCompleteRaw && Number.isFinite(Number(percentCompleteRaw)) ? Number(percentCompleteRaw) : 0
    const tagsRaw = String(get(r, 'tags') || '').trim()
    const tags = tagsRaw ? tagsRaw.split(/[,;]+/).map(s => s.trim()).filter(Boolean) : []
    const dependencies = normalizeDependenciesCell(get(r, 'dependencies'))
    const durationRaw = String(get(r, 'duration') || '').trim()
    const durationFromCsv = durationRaw && Number.isFinite(Number(durationRaw)) ? Number(durationRaw) : null

    const duration =
      start && finish
        ? Math.max(1, Math.round((finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
        : (durationFromCsv && durationFromCsv > 0 ? Math.round(durationFromCsv) : undefined)

    const doc = {
      projectId,
      taskId: uid ? `T-${uid}` : undefined,
      name: String(name || `Task ${uid || ''}`).trim(),
      description,
      notes,
      start,
      end: finish,
      duration,
      percentComplete: Math.max(0, Math.min(100, percentComplete)),
      status,
      wbs,
      parentId: wbs,
      dependencies,
      assignee: null,
      tags,
      activityId: null,
      deleted: false,
    }

    try {
      if (typeof doc.name === 'string') doc.name = doc.name.slice(0, 300)
      if (typeof doc.description === 'string') {
        doc.description = sanitizeHtml(String(doc.description), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 50_000)
      }
      if (typeof doc.notes === 'string') {
        doc.notes = sanitizeHtml(String(doc.notes), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, 50_000)
      }
      if (Array.isArray(doc.tags)) doc.tags = doc.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 32)
    } catch (_) { /* ignore */ }

    try {
      const t = new Task(doc)
      await t.save()
      created.push(t)
    } catch (e) {
      console.error('task import save err', e && e.message ? e.message : e)
    }
  }

  try {
    if (created.length > 0) {
      const project = await Project.findById(projectId)
      if (project) {
        project.tasks = project.tasks || []
        for (const c of created) project.tasks.push(c._id)
        await project.save()
      }
    }
  } catch (e) { /* ignore */ }

  return created
}

function parseWbs(wbs) {
  if (!wbs) return [];
  const parts = String(wbs).split('.').map(s => s.trim()).filter(Boolean);
  const nums = [];
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (!Number.isFinite(n)) return [];
    nums.push(n);
  }
  return nums;
}

function subtreeWbsPrefix(wbs) {
  if (!wbs) return '';
  const segs = parseWbs(wbs);
  if (!segs.length) return String(wbs);
  const last = segs[segs.length - 1] || 0;
  if (last === 0 && segs.length > 1) return segs.slice(0, -1).join('.');
  return String(wbs);
}

// Create a new task (project-scoped)
router.post('/', auth, requireFeature('tasks'), async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === 'object') ? { ...req.body } : {}
    const projectId = payload.projectId
    if (!projectId) return res.status(400).send({ error: 'projectId is required' })
    if (!isObjectId(projectId)) return res.status(400).send({ error: 'Invalid projectId' })

    // Sanitize free-form text fields to reduce XSS risk
    if (typeof payload.description === 'string') {
      payload.description = sanitizeHtml(String(payload.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof payload.notes === 'string') {
      payload.notes = sanitizeHtml(String(payload.notes), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof payload.name === 'string') payload.name = String(payload.name).trim()
    if (!payload.name) return res.status(400).send({ error: 'name is required' })

    if (payload.tags !== undefined) {
      const arr = Array.isArray(payload.tags) ? payload.tags : []
      payload.tags = arr.map(t => String(t).trim()).filter(Boolean).slice(0, 50)
    }

    // require permission to create tasks in the project
    req.body = payload
    await runMiddleware(req, res, requirePermission('tasks.create', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const task = new Task(payload);
    await task.save();

    // Add task to the corresponding project (best-effort)
    try {
      if (task.projectId) {
        const project = await Project.findById(task.projectId);
        if (project) {
          project.tasks = project.tasks || [];
          project.tasks.push(task._id);
          await project.save();
        }
      }
    } catch (e) { /* ignore project linkage errors */ }

    res.status(201).send(task);
  } catch (error) {
    res.status(400).send({ error: error && error.message ? error.message : error });
  }
});

// POST /api/tasks/import - upload MS Project XML or CSV and import tasks into a project
router.post('/import', auth, requireNotDisabled('uploads'), requireFeature('tasks'), importLimiter, upload.single('file'), async (req, res) => {
  try {
    // require projectId as either form field or query param
    const projectId = req.body.projectId || req.query.projectId;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    if (!isObjectId(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

    // attach projectId for RBAC and subscription checks
    req.body = req.body || {};
    req.body.projectId = projectId;

    await runMiddleware(req, res, requirePermission('tasks.create', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No file uploaded' });
    const raw = req.file.buffer.toString('utf8');
    const queryFormat = normalizeShortString(req.query.format, { maxLen: 16 })
    const originalName = String(req.file.originalname || '').toLowerCase()
    const mime = String(req.file.mimetype || '').toLowerCase()

    let format = queryFormat ? String(queryFormat).toLowerCase() : ''
    if (format !== 'csv' && format !== 'xml') format = ''
    if (!format) {
      if (originalName.endsWith('.csv') || mime.includes('csv')) format = 'csv'
      else if (originalName.endsWith('.xml') || mime.includes('xml')) format = 'xml'
      else {
        // crude sniff: XML files usually begin with '<'
        const head = String(raw || '').trimStart()
        format = head.startsWith('<') ? 'xml' : 'csv'
      }
    }

    let created = []
    if (format === 'csv') {
      created = await importCsvTasks({ projectId, csv: raw })
    } else {
      created = await importMsProjectXml({ projectId, xml: raw })
    }
    res.status(201).json({ imported: created.length, tasks: created.map(t => ({ _id: t._id, taskId: t.taskId, name: t.name })) });
  } catch (err) {
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
    const detail = !isProd ? (err && (err.detail || err.stack || err.message) ? String(err.detail || err.stack || err.message) : undefined) : undefined
    res.status(500).json({ error: isProd ? 'Failed to import tasks' : (err && err.message ? err.message : 'Failed to import tasks'), detail });
  }
});

// GET /api/tasks/templates?projectId=...&q=...&category=...
// Lists active task templates for Premium users.
router.get('/templates', auth, requireObjectIdQuery('projectId'), requirePermission('tasks.read', { projectParam: 'projectId' }), requireFeature('tasks'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const filter = { isActive: true };
    if (q) {
      const rx = buildSafeRegex(q, { maxLen: 128 })
      filter.$or = [
        { name: { $regex: rx } },
        { slug: { $regex: rx } },
        { category: { $regex: rx } },
      ];
    }
    if (category) filter.category = category;
    const items = await TaskTemplate.find(filter)
      .select('name slug category version isActive sourceType description tags updatedAt createdAt')
      .sort({ category: 1, name: 1 })
      .lean();
    res.json({ templates: items });
  } catch (err) {
    const msg = safeErrorMessage(err, 'Failed to list task templates')
    res.status(500).json({ error: msg });
  }
});

// POST /api/tasks/import-template { projectId, templateId }
router.post('/import-template', auth, requireFeature('tasks'), async (req, res) => {
  try {
    const projectId = req.body && req.body.projectId ? req.body.projectId : null;
    const templateId = req.body && req.body.templateId ? req.body.templateId : null;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    if (!templateId) return res.status(400).json({ error: 'templateId is required' });
    if (!isObjectId(projectId)) return res.status(400).json({ error: 'Invalid projectId' });
    if (!isObjectId(templateId)) return res.status(400).json({ error: 'Invalid templateId' });

    req.body = req.body || {};
    req.body.projectId = projectId;

    await runMiddleware(req, res, requirePermission('tasks.create', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

	    const tpl = await TaskTemplate.findById(templateId).lean();
	    if (!tpl || !tpl.isActive) return res.status(404).json({ error: 'Task template not found' });
	    const sourceType = String(tpl.sourceType || '').trim().toLowerCase() === 'csv' ? 'csv' : 'xml'
	    let created = []
	    if (sourceType === 'csv') {
	      const csv = String(tpl.csv || '')
	      if (!csv.trim()) return res.status(400).json({ error: 'Template CSV is empty' })
	      created = await importCsvTasks({ projectId, csv })
	    } else {
	      const xml = String(tpl.xml || '');
	      if (!xml.trim()) return res.status(400).json({ error: 'Template XML is empty' });
	      created = await importMsProjectXml({ projectId, xml });
	    }
	    res.status(201).json({ imported: created.length, tasks: created.map(t => ({ _id: t._id, taskId: t.taskId, name: t.name })) });
	  } catch (err) {
	    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production'
	    const detail = !isProd ? (err && (err.detail || err.stack || err.message) ? String(err.detail || err.stack || err.message) : undefined) : undefined
    res.status(500).json({ error: isProd ? 'Failed to import tasks' : (err && err.message ? err.message : 'Failed to import tasks'), detail });
  }
});

	// Read tasks (supports projectId filter, search q, status, deleted, pagination)
	router.get('/', auth, requireFeature('tasks'), requirePermission('tasks.read', { projectParam: 'projectId' }), async (req, res) => {
	  try {
	    if (!req.query.projectId) return res.status(400).send({ error: 'projectId is required' })
	    if (!isObjectId(req.query.projectId)) return res.status(400).send({ error: 'Invalid projectId' })
	    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
	    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
		    const q = String(req.query.q || '').trim();
		    const qrx = buildSafeRegex(q, { maxLen: 128 })
		    const filter = {};
		    if (req.query.projectId) filter.projectId = req.query.projectId;
		    if (req.query.activityId !== undefined) {
		      const activityId = normalizeShortString(req.query.activityId, { maxLen: 128 })
		      if (!activityId) return res.status(400).send({ error: 'Invalid activityId' })
		      filter.activityId = activityId
		    }
		    if (req.query.status) filter.status = req.query.status;
		    if (req.query.deleted !== undefined) filter.deleted = (String(req.query.deleted) === 'true');
		    if (qrx) {
		      filter.$or = [
		        { name: { $regex: qrx } },
	        { description: { $regex: qrx } },
	        { notes: { $regex: qrx } },
	      ];
	    }

	    const tasks = await Task.find(filter).sort({ start: -1 }).skip(skip).limit(limit).lean();
	    const total = await Task.countDocuments(filter);
	    res.status(200).send({ tasks, total, skip, limit });
	  } catch (error) {
	    return sendServerError(res, error, 'Failed to list tasks')
	  }
	});

// Read a single task by ID (ObjectId or taskId)
router.get('/:id', auth, loadTaskProjectId, requireFeature('tasks'), requirePermission('tasks.read', { projectParam: 'projectId' }), async (req, res) => {
  try {
    const id = req.params.id;
    let task = null;
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) task = await Task.findById(id);
    if (!task) task = await Task.findOne({ taskId: id });
	    if (!task) return res.status(404).send({ error: 'Task not found' });
	    res.status(200).send(task);
	  } catch (error) {
	    return sendServerError(res, error, 'Failed to load task')
	  }
	});

// Update a task and all of its descendants (by WBS subtree)
router.patch('/subtree/:id', auth, requireObjectIdParam('id'), loadTaskProjectId, requireFeature('tasks'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).send({ error: 'Task not found' });

    req.body = req.body || {};
    req.body.projectId = task.projectId;

    await runMiddleware(req, res, requirePermission('tasks.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const status = req.body.status;
    const percentComplete = req.body.percentComplete;

    const update = {};
    if (status !== undefined) update.status = status;
    if (percentComplete !== undefined) update.percentComplete = percentComplete;
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No fields to update' });

    let filter = { projectId: task.projectId };
    if (task.wbs) {
      const prefix = subtreeWbsPrefix(task.wbs);
      const esc = String(prefix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.wbs = { $regex: new RegExp('^' + esc + '(?:\\.|$)') };
    } else {
      filter._id = task._id;
    }

    const affected = await Task.find(filter).select('_id').lean();
    const ids = affected.map(a => a._id).filter(Boolean);
    if (ids.length === 0) return res.status(200).json({ modifiedCount: 0, ids: [] });

    const result = await Task.updateMany({ _id: { $in: ids } }, update, { runValidators: true });
    const modified = (result && (result.modifiedCount || result.nModified)) || 0;

    res.status(200).json({ modifiedCount: modified, ids });
  } catch (error) {
    res.status(400).send({ error: error && error.message ? error.message : error });
  }
});

// Update a task by ID (requires permission on the task's project)
router.patch('/:id', auth, requireObjectIdParam('id'), loadTaskProjectId, requireFeature('tasks'), async (req, res) => {
  try {
    const incoming = pickTaskPayload(req.body)
    // Never allow changing ownership via generic patch
    delete incoming.projectId

    // Load task to determine project for RBAC/subscription checks
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).send({ error: 'Task not found' });

    req.body = req.body || {};
    req.body.projectId = task.projectId;

    await runMiddleware(req, res, requirePermission('tasks.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    // Sanitize free-form text fields to reduce XSS risk
    if (typeof incoming.description === 'string') {
      incoming.description = sanitizeHtml(String(incoming.description), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (typeof incoming.notes === 'string') {
      incoming.notes = sanitizeHtml(String(incoming.notes), { allowedTags: [], allowedAttributes: {} }).trim()
    }
    if (incoming.tags !== undefined) {
      const arr = Array.isArray(incoming.tags) ? incoming.tags : []
      incoming.tags = arr.map(t => String(t).trim()).filter(Boolean).slice(0, 50)
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, incoming, { new: true, runValidators: true });
    if (!updated) return res.status(404).send({ error: 'Task not found' });
    res.status(200).send(updated);
  } catch (error) {
    res.status(400).send({ error: error && error.message ? error.message : error });
  }
});

// Delete (soft-delete) a task by ID
router.delete('/:id', auth, requireObjectIdParam('id'), loadTaskProjectId, requireFeature('tasks'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).send({ error: 'Task not found' });

    req.body = req.body || {};
    req.body.projectId = task.projectId;

    await runMiddleware(req, res, requirePermission('tasks.delete', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    // Perform soft-delete by default
    task.deleted = true;
    task.status = 'Deleted';
    await task.save();

    // Remove task reference from project (best-effort)
    try {
      if (task.projectId) {
        const project = await Project.findById(task.projectId);
        if (project && Array.isArray(project.tasks)) {
          project.tasks.pull(task._id);
          await project.save();
        }
      }
    } catch (_) { }

	    res.status(200).send(task);
	  } catch (error) {
	    return sendServerError(res, error, 'Failed to delete task')
	  }
	});

// DELETE /api/tasks/subtree/:id - soft-delete a task and all descendant tasks (by WBS prefix)
router.delete('/subtree/:id', auth, requireObjectIdParam('id'), loadTaskProjectId, requireFeature('tasks'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).send({ error: 'Task not found' });

    req.body = req.body || {};
    req.body.projectId = task.projectId;

    await runMiddleware(req, res, requirePermission('tasks.delete', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    // Build filter for subtree using WBS: match exact WBS or starting with WBS + '.'
    let filter = { projectId: task.projectId };
    if (task.wbs) {
      const esc = String(task.wbs).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // regex matches either exact "prefix" or "prefix.<anything>"
      filter.wbs = { $regex: new RegExp('^' + esc + '(?:\\.|$)') };
    } else {
      // If no WBS on the task, fall back to only this id
      filter._id = task._id;
    }

    // Find affected IDs first
    const affected = await Task.find(filter).select('_id').lean();
    const ids = affected.map(a => a._id).filter(Boolean);

    if (ids.length === 0) return res.status(200).json({ modifiedCount: 0, ids: [] });

    // Soft-delete all matching tasks
    const update = { deleted: true, status: 'Deleted' };
    const result = await Task.updateMany({ _id: { $in: ids } }, update);

    // Remove references from project.tasks (best-effort)
    try {
      if (task.projectId) {
        await Project.updateOne({ _id: task.projectId }, { $pull: { tasks: { $in: ids } } }).catch(() => {});
      }
    } catch (e) { /* ignore */ }

	    const modified = (result && (result.modifiedCount || result.nModified)) || 0;
	    res.status(200).json({ modifiedCount: modified, ids });
	  } catch (error) {
	    return sendServerError(res, error, 'Failed to delete tasks')
	  }
	});

module.exports = router;
