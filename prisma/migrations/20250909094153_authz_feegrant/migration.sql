-- AlterTable
ALTER TABLE "public"."Job" ALTER COLUMN "keep_until" SET DEFAULT now() + interval '14 days';
