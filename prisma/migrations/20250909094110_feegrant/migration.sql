-- AlterTable
ALTER TABLE "public"."Address" ADD COLUMN     "hasFeeGrant" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Job" ALTER COLUMN "keep_until" SET DEFAULT now() + interval '14 days';
