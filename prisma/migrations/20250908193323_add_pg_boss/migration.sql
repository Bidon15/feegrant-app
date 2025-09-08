-- CreateEnum
CREATE TYPE "public"."JobState" AS ENUM ('created', 'retry', 'active', 'completed', 'expired', 'cancelled', 'failed');

-- CreateTable
CREATE TABLE "public"."Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB,
    "state" "public"."JobState" NOT NULL DEFAULT 'created',
    "retry_limit" INTEGER NOT NULL DEFAULT 2,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "retry_delay" INTEGER NOT NULL DEFAULT 0,
    "retry_backoff" BOOLEAN NOT NULL DEFAULT false,
    "start_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_on" TIMESTAMP(3),
    "singleton_key" TEXT,
    "singleton_on" TIMESTAMP(3),
    "expire_in" INTEGER NOT NULL DEFAULT 900000,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_on" TIMESTAMP(3),
    "keep_until" TIMESTAMP(3) NOT NULL DEFAULT now() + interval '14 days',
    "output" JSONB,
    "dead_letter" TEXT,
    "policy" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Archive" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "data" JSONB,
    "state" "public"."JobState" NOT NULL,
    "retry_limit" INTEGER NOT NULL DEFAULT 2,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "retry_delay" INTEGER NOT NULL DEFAULT 0,
    "retry_backoff" BOOLEAN NOT NULL DEFAULT false,
    "start_after" TIMESTAMP(3) NOT NULL,
    "started_on" TIMESTAMP(3),
    "singleton_key" TEXT,
    "singleton_on" TIMESTAMP(3),
    "expire_in" INTEGER NOT NULL,
    "created_on" TIMESTAMP(3) NOT NULL,
    "completed_on" TIMESTAMP(3),
    "keep_until" TIMESTAMP(3) NOT NULL,
    "output" JSONB,
    "dead_letter" TEXT,
    "policy" TEXT,
    "archived_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Version" (
    "version" INTEGER NOT NULL,
    "maintained_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("version")
);

-- CreateIndex
CREATE INDEX "Job_name_idx" ON "public"."Job"("name");

-- CreateIndex
CREATE INDEX "Job_state_idx" ON "public"."Job"("state");

-- CreateIndex
CREATE INDEX "Job_start_after_idx" ON "public"."Job"("start_after");

-- CreateIndex
CREATE UNIQUE INDEX "Job_name_id_key" ON "public"."Job"("name", "id");

-- CreateIndex
CREATE INDEX "Archive_archived_on_idx" ON "public"."Archive"("archived_on");
