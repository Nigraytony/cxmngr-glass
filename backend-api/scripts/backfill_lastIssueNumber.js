// ai/backend-api/scripts/backfill_lastIssueNumber.js
// Backfill script: compute lastIssueNumber per project
// Usage:
//   node scripts/backfill_lastIssueNumber.js           # actually updates DB
//   node scripts/backfill_lastIssueNumber.js --dry-run # prints what would be changed
//
// Ensure you run this from the backend project root (so require('../models/...') resolves).
// If your DB is not at the default, set MONGODB_URL env var, e.g.:
//   MONGODB_URL='mongodb://user:pass@host:port/dbname' node scripts/backfill_lastIssueNumber.js

const mongoose = require('mongoose');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/cxmngr-api';

  console.log(`[backfill_lastIssueNumber] connecting to ${mongoUrl} (dryRun=${dryRun})`);
  await mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

  // Adjust these require paths if your project structure differs.
  const Project = require('../models/project');
  const Issue = require('../models/issue');

  try {
    const projects = await Project.find().lean();
    console.log(`Found ${projects.length} projects.`);

    for (const p of projects) {
      try {
        // Find the single issue with the highest number for this project
        const top = await Issue.find({ projectId: p._id, number: { $exists: true } })
          .sort({ number: -1 })
          .limit(1)
          .lean();

        const maxNumber = (top && top.length && typeof top[0].number === 'number') ? top[0].number : 0;

        if (dryRun) {
          console.log(`[dry-run] Project ${p._id} (${p.name || 'unnamed'}) -> lastIssueNumber = ${maxNumber}`);
        } else {
          // Update the project record with lastIssueNumber
          await Project.findByIdAndUpdate(p._id, { $set: { lastIssueNumber: maxNumber, updatedAt: new Date() } });
          console.log(`Updated project ${p._id} (${p.name || 'unnamed'}) -> lastIssueNumber = ${maxNumber}`);
        }
      } catch (innerErr) {
        console.error(`Error processing project ${p._id}:`, innerErr);
      }
    }

    console.log('Backfill complete.');
  } catch (err) {
    console.error('Fatal error running backfill:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});