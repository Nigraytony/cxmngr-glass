const express = require('express');
const router = express.Router();
const Equipment = require('../models/equipment');
const Project = require('../models/project');

// Create a new equipment
router.post('/', async (req, res) => {
  console.log(req.body);
  try {
    const equipment = new Equipment(req.body);
    await equipment.save();

    // Add equipment to the corresponding project
    // const project = await Project.findById(equipment.projectId);
    // project.equipment.push(equipment._id);
    // await project.save();

    res.status(201).send(equipment);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Read all equipment
router.get('/', async (req, res) => {
  try {
    const equipment = await Equipment.find();
    res.status(200).send(equipment);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Read a single equipment by ID
router.get('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) {
      return res.status(404).send();
    }
    res.status(200).send(equipment);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update equipment by ID
router.patch('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!equipment) {
      return res.status(404).send();
    }
    res.status(200).send(equipment);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete equipment by ID
router.delete('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) {
      return res.status(404).send();
    }

    // Remove equipment from the corresponding project
    const project = await Project.findById(equipment.projectId);
    project.equipment.pull(equipment._id);
    await project.save();

    res.status(200).send(equipment);
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;