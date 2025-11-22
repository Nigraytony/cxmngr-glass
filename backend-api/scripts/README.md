# Backfill invoices script

This folder contains `backfill_invoices.js` — a utility to import historical Stripe invoices and charges into MongoDB.

Usage

Set environment variables (example):

```bash
export STRIPE_SECRET_KEY=sk_test_xxx
export MONGO_URI=mongodb://localhost:27017/cxmngr-api
```

Run the script from the project root (it will load `backend-api/.env` automatically):

```bash
node backend-api/scripts/backfill_invoices.js [--project <projectId>] [--since YYYY-MM-DD]
```

Options

- `--project <projectId>`: only import invoices whose `invoice.metadata.projectId` matches.
- `--since YYYY-MM-DD`: only import invoices created on or after the given date.

Notes

- The script upserts to the `Invoice` and `Charge` models defined in `backend-api/models`.
- The script attempts to expand/attach charges for each invoice and will also fetch the charge object when necessary.
- If Stripe objects lack `metadata.projectId`, consider mapping by `customerId` or running additional backfill steps.
- The script will not re-run your webhook business logic (e.g., Project subscription status updates) — if you need that, run the admin webhook replay or extend this script.
