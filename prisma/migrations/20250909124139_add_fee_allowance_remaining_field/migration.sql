-- DropForeignKey
ALTER TABLE "public"."Address" DROP CONSTRAINT "Address_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Address" ADD COLUMN     "feeAllowanceRemaining" TEXT;

-- AlterTable
ALTER TABLE "public"."Job" ALTER COLUMN "keep_until" SET DEFAULT now() + interval '14 days';

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "public"."Address"("userId");

-- AddForeignKey
ALTER TABLE "public"."Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
