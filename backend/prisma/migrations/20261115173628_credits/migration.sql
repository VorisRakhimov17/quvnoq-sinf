-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('welcome', 'generate', 'refund', 'purchase', 'admin');

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditTx" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditTx_teacherId_createdAt_idx" ON "CreditTx"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreditTx" ADD CONSTRAINT "CreditTx_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
