# Backup & DR Runbook (Draft)

- Database: Neon PostgreSQL. Daily automatic backups enabled by provider. For manual export, run `pg_dump $DATABASE_URL > backup.sql`. Store exports in a separate region (e.g., S3 bucket with versioning).
- Seeds: `backend/db/seeds.sql` contains minimal tenant/user records for staging. Do not run in production without review.
- Schema/RLS: `backend/db/init.sql` applies schema + RLS + seeds. For production, run schema + RLS only.
- Restore check: Perform quarterly restore test into a staging database and execute `/health` plus a basic login flow with a test user.
- Logs/metrics: Forward application logs with tenantId to your log sink; set alerts on error rate and DB connection errors.

