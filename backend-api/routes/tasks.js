const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const Project = require('../models/project');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { requireActiveProject } = require('../middleware/subscription');
const runMiddleware = require('../middleware/runMiddleware');
const multer = require('multer');
const { XMLParser } = require('fast-xml-parser');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Create a new task (project-scoped)
router.post('/', auth, async (req, res) => {
  try {
    // require permission to create tasks in the project
    await runMiddleware(req, res, requirePermission('tasks.create', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const task = new Task(req.body);
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

// POST /api/tasks/import - upload MS Project XML and import tasks into a project
router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    // require projectId as either form field or query param
    const projectId = req.body.projectId || req.query.projectId;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    // attach projectId for RBAC and subscription checks
    req.body = req.body || {};
    req.body.projectId = projectId;

    await runMiddleware(req, res, requirePermission('tasks.create', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No file uploaded' });
    const xml = req.file.buffer.toString('utf8');

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' , allowBooleanAttributes: true, isArray: (name, jpath, isLeafNode, isAttribute) => {
      // ensure Tasks.Task are arrays
      return ['Project.Tasks.Task', 'Project.PredecessorLink', 'PredecessorLink'].includes(jpath);
    }});
    let parsed;
    try {
      parsed = parser.parse(xml);
    } catch (e) {
      return res.status(400).json({ error: 'Failed to parse XML', detail: e.message });
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
        name: name || `Task ${uid || ''}`,
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

    res.status(201).json({ imported: created.length, tasks: created.map(t => ({ _id: t._id, taskId: t.taskId, name: t.name })) });
  } catch (err) {
    res.status(500).json({ error: err && err.message ? err.message : err });
  }
});

// Read tasks (supports projectId filter, search q, status, deleted, pagination)
router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 1000);
    const skip = Math.max(parseInt(req.query.skip || '0', 10), 0);
    const q = String(req.query.q || '').trim();
    const filter = {};
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.deleted !== undefined) filter.deleted = (String(req.query.deleted) === 'true');
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(filter).sort({ start: -1 }).skip(skip).limit(limit).lean();
    const total = await Task.countDocuments(filter);
    res.status(200).send({ tasks, total, skip, limit });
  } catch (error) {
    res.status(500).send({ error: error && error.message ? error.message : error });
  }
});

// Read a single task by ID (ObjectId or taskId)
router.get('/:id', auth, async (req, res) => {
  try {
    const id = req.params.id;
    let task = null;
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) task = await Task.findById(id);
    if (!task) task = await Task.findOne({ taskId: id });
    if (!task) return res.status(404).send({ error: 'Task not found' });
    res.status(200).send(task);
  } catch (error) {
    res.status(500).send({ error: error && error.message ? error.message : error });
  }
});

// Update a task by ID (requires permission on the task's project)
router.patch('/:id', auth, async (req, res) => {
  try {
    // Load task to determine project for RBAC/subscription checks
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).send({ error: 'Task not found' });

    req.body = req.body || {};
    req.body.projectId = task.projectId;

    await runMiddleware(req, res, requirePermission('tasks.update', { projectParam: 'projectId' }));
    await runMiddleware(req, res, requireActiveProject);

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).send({ error: 'Task not found' });
    res.status(200).send(updated);
  } catch (error) {
    res.status(400).send({ error: error && error.message ? error.message : error });
  }
});

// Delete (soft-delete) a task by ID
router.delete('/:id', auth, async (req, res) => {
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
    res.status(500).send({ error: error && error.message ? error.message : error });
  }
});

// DELETE /api/tasks/subtree/:id - soft-delete a task and all descendant tasks (by WBS prefix)
router.delete('/subtree/:id', auth, async (req, res) => {
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
    res.status(500).send({ error: error && error.message ? error.message : error });
  }
});

module.exports = router;