RBAC (Roles & Permissions) — seeding roles

This repository contains a minimal RBAC model (Mongoose `Role` model) used by the backend
to store named roles and their permission strings. To help bootstrap a development or test
environment you can seed a few default roles with the included script.

Seed script

Usage:

1. Ensure MongoDB is running and set `MONGODB_URI` to your database connection string. If not
   set, the script will use `mongodb://localhost:27017/cxmngr-api`.

2. Run the seed script from the repository root:

```bash
node backend-api/scripts/seed_roles.js
```

What it creates
- `admin` — administrative user (the middleware also short-circuits `admin` role so it has full access)
- `user` — default role for regular users
- `tester` — example role which has the `rbac.test` permission for test coverage

Notes
- This script performs upserts (create or update) by role `name`.
- In production you should manage roles via an administrative UI or a more controlled migration/seed process.
- The `admin` role is short-circuited in middleware (users with `role==='admin'` are allowed automatically).
