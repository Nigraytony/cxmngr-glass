#!/usr/bin/env node
// Set a project's subscription to Standard.
// Usage:
//   node backend-api/scripts/set_project_subscription.js --id <projectId>
//   node backend-api/scripts/set_project_subscription.js --name "Project Name"

const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const Project = require('../models/project')
const plans = require('../config/plans')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--id') out.id = args[++i]
    else if (a === '--name') out.name = args[++i]
    else if (a === '--contains') out.contains = args[++i]
    else if (a === '--ci') out.caseInsensitive = true
    else if (a === '--dry-run') out.dry = true
  }
  return out
}

async function main() {
  const { id, name, contains, caseInsensitive, dry } = parseArgs()
  if (!id && !name && !contains) {
    console.error('Provide --id <projectId> or --name "Project Name" or --contains "partial"')
    process.exit(1)
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cxmngr-api'
  await mongoose.connect(uri, { autoIndex: false })

  try {
    const plan = plans.find(p => p.key === 'standard')
    if (!plan) throw new Error('Standard plan not found in config')

    let query
    if (id) query = { _id: id }
    else if (name) query = caseInsensitive ? { name: new RegExp(`^${name}$`, 'i') } : { name }
    else if (contains) query = caseInsensitive ? { name: new RegExp(contains, 'i') } : { name: new RegExp(contains) }
    const project = await Project.findOne(query)
    if (!project) {
      console.error('Project not found for', query)
      process.exit(2)
    }

    console.log('Found project:', { id: project._id.toString(), name: project.name, client: project.client })

    const update = {
      subscriptionTier: 'standard',
      subscriptionFeatures: plan.features,
      stripePriceId: plan.priceId,
      stripeSubscriptionStatus: 'active',
      stripeCancelAtPeriodEnd: false,
      stripeIsPastDue: false,
    }

    console.log('Applying update:', update)
    if (dry) {
      console.log('Dry run enabled; no changes written.')
    } else {
      Object.assign(project, update)
      await project.save()
      console.log('Updated project subscription to Standard.')
    }

    const refreshed = await Project.findById(project._id).lean()
    console.log('Current billing snapshot:', {
      subscriptionTier: refreshed.subscriptionTier,
      stripePriceId: refreshed.stripePriceId,
      stripeSubscriptionStatus: refreshed.stripeSubscriptionStatus,
      stripeCancelAtPeriodEnd: refreshed.stripeCancelAtPeriodEnd,
      stripeIsPastDue: refreshed.stripeIsPastDue,
    })
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(err => {
  console.error('Error setting subscription:', err)
  process.exit(3)
})
