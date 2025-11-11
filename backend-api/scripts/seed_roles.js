#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/role');

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cxmngr-api';

async function main() {
  console.log('[seed_roles] connecting to', mongoUri);
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

  const roles = [
    { name: 'admin', description: 'Administrator (full access)', permissions: [] },
    { name: 'user', description: 'Regular user (default)', permissions: [] },
    { name: 'tester', description: 'Test role with rbac.test permission', permissions: ['rbac.test'] },
  ];

  for (const r of roles) {
    const res = await Role.updateOne(
      { name: r.name },
      { $set: { description: r.description, permissions: r.permissions } },
      { upsert: true }
    );
    console.log(`[seed_roles] upserted role ${r.name}`);
  }

  await mongoose.disconnect();
  console.log('[seed_roles] done');
}

main().catch((err) => {
  console.error('[seed_roles] error', err && err.message ? err.message : err);
  process.exit(1);
});
