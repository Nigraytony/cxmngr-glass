const express = require('express');
const router = express.Router();
const Task = require('../models/task');
const Project = require('../models/project');

// Create a new task
router.post('/', async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();

    // Add task to the corresponding project
    const project = await Project.findById(task.projectId);
    project.tasks.push(task._id);
    await project.save();

    res.status(201).send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Read all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).send(tasks);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single task by ID
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).send();
    }
    res.status(200).send(task);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a task by ID
router.patch('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) {
      return res.status(404).send();
    }
    res.status(200).send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a task by ID
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).send();
    }

    // Remove task from the corresponding project
    const project = await Project.findById(task.projectId);
    project.tasks.pull(task._id);
    await project.save();

    res.status(200).send(task);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;