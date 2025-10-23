const express = require('express');
const router = express.Router();
const Issue = require('../models/issue');
const Project = require('../models/project');
const { requireActiveProject } = require('../middleware/subscription');

// Create a new issue (assign project-scoped atomic number)
// Creating an issue is a premium action and requires an active subscription for the project
router.post('/', requireActiveProject, async (req, res) => {
  try {
    const { projectId } = req.body || {};
    if (!projectId) return res.status(400).send({ error: 'projectId is required' });

    // Atomically increment a per-project counter (lastIssueNumber)
    // Use findByIdAndUpdate on the Project to $inc lastIssueNumber and get the new value
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $inc: { lastIssueNumber: 1 } },
      { new: true, upsert: false }
    );

    if (!updatedProject) return res.status(404).send({ error: 'Project not found' });

    const assignedNumber = updatedProject.lastIssueNumber || 0;

    // Compose the issue with the assigned number to ensure atomic assignment
    const issueData = { ...req.body, number: assignedNumber };
    const issue = new Issue(issueData);
    await issue.save();

    // Add issue to the corresponding project issues array
    updatedProject.issues.push(issue._id);
    await updatedProject.save();

    res.status(201).send(issue);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Read issues (optionally filtered by ?projectId=...)
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query || {};
    const filter = {};
    if (projectId) {
      try {
        const mongoose = require('mongoose');
        filter.projectId = mongoose.Types.ObjectId(projectId);
      } catch (e) {
        filter.projectId = projectId;
      }
    }
    const issues = await Issue.find(filter);
    res.status(200).send(issues);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single issue by ID
router.get('/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).send();
    }
    res.status(200).send(issue);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update an issue by ID
// Updating an issue requires an active subscription. Load the issue first, set projectId so middleware can validate,
// then perform the update if allowed.
router.patch('/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).send();

    // ensure middleware can see the parent project ID
    req.body = req.body || {}
    req.body.projectId = issue.projectId

    return requireActiveProject(req, res, async () => {
      try {
        const updated = await Issue.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updated) return res.status(404).send();
        return res.status(200).send(updated);
      } catch (err) {
        return res.status(400).send(err);
      }
    });
  } catch (error) {
    return res.status(500).send(error);
  }
});

// Delete an issue by ID
// Deleting an issue requires an active subscription for the parent project. Load the issue, set projectId for middleware,
// then delete if allowed.
router.delete('/:id', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).send();

    req.body = req.body || {}
    req.body.projectId = issue.projectId

    return requireActiveProject(req, res, async () => {
      try {
        await Issue.findByIdAndDelete(req.params.id);
        // Remove issue from the corresponding project
        const project = await Project.findById(issue.projectId);
        if (project) {
          project.issues.pull(issue._id);
          await project.save();
        }
        return res.status(200).send(issue);
      } catch (err) {
        return res.status(500).send(err);
      }
    });
  } catch (error) {
    return res.status(500).send(error);
  }
});

module.exports = router;