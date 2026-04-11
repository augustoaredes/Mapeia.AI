-- AlterTable users: add subscription tracking fields
ALTER TABLE "users"
  ADD COLUMN "total_projects_created" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "subscription_status"    TEXT    NOT NULL DEFAULT 'free',
  ADD COLUMN "stripe_customer_id"     TEXT;

-- AlterTable projects: add expiry date
ALTER TABLE "projects"
  ADD COLUMN "expires_at" TIMESTAMP(3);
