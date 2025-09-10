/*
  Warnings:

  - You are about to drop the column `hasAuthzGranted` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `revoked` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the `BlobPayload` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BlobTx` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UsageCounter` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Address" DROP COLUMN "hasAuthzGranted",
DROP COLUMN "revoked";

-- DropTable
DROP TABLE "public"."BlobPayload";

-- DropTable
DROP TABLE "public"."BlobTx";

-- DropTable
DROP TABLE "public"."UsageCounter";
