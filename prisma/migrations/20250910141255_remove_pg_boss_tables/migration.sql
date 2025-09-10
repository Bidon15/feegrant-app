/*
  Warnings:

  - You are about to drop the `Archive` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Version` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."Archive";

-- DropTable
DROP TABLE "public"."Job";

-- DropTable
DROP TABLE "public"."Version";

-- DropEnum
DROP TYPE "public"."JobState";
