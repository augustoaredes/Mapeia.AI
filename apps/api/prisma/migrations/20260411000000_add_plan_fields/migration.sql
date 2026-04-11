-- AlterTable: add plan_id and project_credits to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plan_id" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "project_credits" INTEGER NOT NULL DEFAULT 0;
