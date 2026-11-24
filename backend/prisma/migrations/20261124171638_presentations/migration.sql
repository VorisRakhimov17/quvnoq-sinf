-- CreateTable
CREATE TABLE "Presentation" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "subject" "Subject" NOT NULL,
    "grade" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "deck" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presentation_teacherId_createdAt_idx" ON "Presentation"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
