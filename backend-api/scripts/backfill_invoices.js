#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Stripe = require('stripe');

const stripeKey = process.env.STRIPE_SECRET_KEY;
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/cxmngr';
if (!stripeKey) {
  console.error('Missing STRIPE_SECRET_KEY in environment');
  process.exit(1);
}

const stripe = Stripe(stripeKey);

// Simple CLI arg parsing: --project <id> and --since <YYYY-MM-DD>
const argv = process.argv.slice(2);
function getArg(name) {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  return argv[i+1] || null;
}
const projectFilter = getArg('--project');
const sinceArg = getArg('--since');
const sinceDate = sinceArg ? new Date(sinceArg) : null;

// Require models (relative to this script)
const Invoice = require(path.join(__dirname, '..', 'models', 'invoice'));
const Charge = require(path.join(__dirname, '..', 'models', 'charge'));

async function connectDb() {
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

function invoiceMatchesFilters(inv) {
  if (projectFilter) {
    const pid = inv.metadata && inv.metadata.projectId ? String(inv.metadata.projectId) : null;
    if (String(projectFilter) !== String(pid)) return false;
  }
  if (sinceDate) {
    const created = inv.created ? new Date(inv.created * 1000) : null;
    if (!created || created < sinceDate) return false;
  }
  return true;
}

async function upsertInvoice(inv) {
  const doc = {
    invoiceId: inv.id,
    projectId: inv.metadata && inv.metadata.projectId ? inv.metadata.projectId : null,
    subscriptionId: inv.subscription || null,
    customerId: inv.customer || null,
    amount_due: inv.amount_due || 0,
    amount_paid: inv.amount_paid || 0,
    currency: inv.currency || null,
    status: inv.status || null,
    hosted_invoice_url: inv.hosted_invoice_url || null,
    description: inv.description || null,
    period_start: inv.period_start ? new Date(inv.period_start * 1000) : null,
    period_end: inv.period_end ? new Date(inv.period_end * 1000) : null,
    createdAt: inv.created ? new Date(inv.created * 1000) : new Date(),
    metadata: inv.metadata || {},
    raw: inv,
  };
  await Invoice.findOneAndUpdate({ invoiceId: inv.id }, { $set: doc }, { upsert: true, new: true });
}

async function upsertCharge(chargeObj, invoiceId, projectIdFromInvoice) {
  const doc = {
    chargeId: chargeObj.id,
    invoiceId: invoiceId || (chargeObj.invoice || null),
    projectId: projectIdFromInvoice || (chargeObj.metadata && chargeObj.metadata.projectId ? chargeObj.metadata.projectId : null),
    customerId: chargeObj.customer || null,
    amount: chargeObj.amount || 0,
    currency: chargeObj.currency || null,
    status: chargeObj.status || null,
    payment_method_details: chargeObj.payment_method_details || {},
    createdAt: chargeObj.created ? new Date(chargeObj.created * 1000) : new Date(),
    metadata: chargeObj.metadata || {},
    raw: chargeObj,
  };
  await Charge.findOneAndUpdate({ chargeId: chargeObj.id }, { $set: doc }, { upsert: true, new: true });
}

async function run() {
  console.log('Backfill invoices starting');
  console.log('Mongo:', mongoUri);
  if (projectFilter) console.log('Filtering by project:', projectFilter);
  if (sinceDate) console.log('Filtering invoices since:', sinceDate.toISOString());

  await connectDb();
  console.log('Connected to MongoDB');

  let invoiceCount = 0;
  let chargeCount = 0;

  // Paginate through Stripe invoices (compatibility with older Stripe SDKs)
  const listParams = { limit: 100 };
  let startingAfter = null;
  let keepGoing = true;
  while (keepGoing) {
    const params = Object.assign({}, listParams);
    if (startingAfter) params.starting_after = startingAfter;
    const res = await stripe.invoices.list(params);
    const invoices = Array.isArray(res.data) ? res.data : [];
    for (const inv of invoices) {
      try {
        if (!invoiceMatchesFilters(inv)) continue;
        // retrieve the invoice expanded to include charges
        let invFull = inv;
        try {
          invFull = await stripe.invoices.retrieve(inv.id, { expand: ['charges.data'] });
        } catch (err) {
          // if expand unsupported or fails, fall back to the original invoice object
          console.warn('Could not expand charges for invoice', inv && inv.id, err && err.message);
        }

        await upsertInvoice(invFull);
        invoiceCount++;

        const charges = (invFull.charges && Array.isArray(invFull.charges.data)) ? invFull.charges.data : [];
        for (const c of charges) {
          try {
            await upsertCharge(c, invFull.id, invFull.metadata && invFull.metadata.projectId ? invFull.metadata.projectId : null);
            chargeCount++;
          } catch (err) {
            console.warn('Failed to upsert charge', c && c.id, err && err.message);
          }
        }

        if ((charges.length === 0) && invFull.charge) {
          try {
            const cFull = await stripe.charges.retrieve(invFull.charge);
            if (cFull) {
              await upsertCharge(cFull, invFull.id, invFull.metadata && invFull.metadata.projectId ? invFull.metadata.projectId : null);
              chargeCount++;
            }
          } catch (err) {
            console.warn('Failed to retrieve single charge', invFull.charge, err && err.message);
          }
        }
      } catch (err) {
        console.error('Error processing invoice', inv && inv.id, err && err.message);
      }
    }

    keepGoing = !!res.has_more && invoices.length > 0;
    if (invoices.length > 0) startingAfter = invoices[invoices.length - 1].id;
  }

  console.log('Backfill complete:', invoiceCount, 'invoices,', chargeCount, 'charges');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error in backfill:', err && err.stack ? err.stack : err);
  process.exit(1);
});
