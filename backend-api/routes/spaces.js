const express = require('express');
const router = express.Router();
const Space = require('../models/space');
const Project = require('../models/project');
const mongoose = require('mongoose');

// Create a new space
router.post('/', async (req, res) => {
  // console.log(req.body);
  try {
    // Validate project field
    if (!req.body.project || !mongoose.Types.ObjectId.isValid(req.body.project)) {
      return res.status(400).send({ error: 'Invalid project ID' });
    }

    // Create a new space from request body
    const space = new Space({
      tag: req.body.tag || '',
      title: req.body.title || '',
      type: req.body.type || '',
      description: req.body.description || '',
      project: req.body.project, // Ensure project ID is valid
      parentSpace: req.body.parentSpace || '',
      attachments: req.body.attachments || '',
      settings: req.body.settings || '',
      notes: req.body.notes || '',
      metaData: req.body.metaData || '',
    });

    await space.save(); // Persist to database
    res.status(201).send(space);
  } catch (error) {
    console.error('Error saving space:', error); // Log detailed error
    res.status(400).send({ error: error.message });
  }
});

// Read all spaces
router.get('/:projectId', async (req, res) => {
  // console.log('Fetching spaces for project:', req.params.projectId);
  try {
    // const spaces = await Space.find();
    const spaces = await Space.find({ project: req.params.projectId });
    if (!spaces) {
      return res.status(404).send({ error: 'No spaces found for this project' });
    }
    res.status(200).send(spaces);
  } catch (error) {
    res.status(500).send(error);
  }
});


// Get all spaces by project ID
router.get('/project/:projectId', async (req, res) => {
  try {
    const spaces = await Space.find({ project: req.params.projectId });
    if (!spaces) {
      return res.status(404).send();
    }
    res.status(200).send(spaces);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single space by ID and find subSpaces
router.get('/:id', async (req, res) => {
  try {
    const space = await Space.findById(req.params.id);
    if (!space) {
      return res.status(404).send();
    }
    const subSpaces = await Space.find({ parentSpace: space._id }).select('_id tag title type description');
    res.status(200).send({ ...space.toObject(), subSpaces });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a space by ID
router.patch('/:id', async (req, res) => {
  // console.log('Updating space:', req.params.id, req.body);
  try {
    const space = await Space.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!space) {
      return res.status(404).send();
    }
    res.status(200).send(space);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a space by ID
router.delete('/:id', async (req, res) => {
  try {
    const space = await Space.findByIdAndDelete(req.params.id);
    if (!space) {
      return res.status(404).send();
    }
    res.status(200).send(space);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
