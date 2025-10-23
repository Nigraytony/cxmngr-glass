// Simple migration script to set isActive=true for projects missing the field
const mongoose = require('mongoose');
const Project = require('../models/project');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/cxmngr-api';

async function run() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const result = await Project.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
  console.log('Matched:', result.matchedCount || result.n, 'Modified:', result.modifiedCount || result.nModified);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
