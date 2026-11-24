-- CreateTable
CREATE TABLE "GamePack" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "subject" "Subject" NOT NULL,
    "grade" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GamePack_teacherId_createdAt_idx" ON "GamePack"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "GamePack" ADD CONSTRAINT "GamePack_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
