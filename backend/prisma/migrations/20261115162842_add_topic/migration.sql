-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "topic" TEXT;

-- CreateIndex
CREATE INDEX "Question_teacherId_topic_idx" ON "Question"("teacherId", "topic");
