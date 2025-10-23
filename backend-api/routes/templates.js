const express = require('express');
const router = express.Router();
const Template = require('../models/template');
const Project = require('../models/project');

// Create a new template
router.post('/', async (req, res) => {
  try {
    const template = new Template(req.body);
    await template.save();

    // Add template to the corresponding project
    // const project = await Project.findById(template.projectId);
    // project.templates.push(template._id);
    // await project.save();

    res.status(201).send(template);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Read all templates
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find();
    res.status(200).send(templates);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single template by ID
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).send();
    }
    res.status(200).send(template);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a template by ID
router.patch('/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!template) {
      return res.status(404).send();
    }
    res.status(200).send(template);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a template by ID
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).send();
    }

    // Remove template from the corresponding project
    const project = await Project.findById(template.projectId);
    project.templates.pull(template._id);
    await project.save();

    res.status(200).send(template);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;