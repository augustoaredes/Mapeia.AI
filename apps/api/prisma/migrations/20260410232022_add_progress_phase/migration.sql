-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "phase" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;
