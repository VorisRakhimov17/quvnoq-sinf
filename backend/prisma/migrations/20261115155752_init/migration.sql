-- CreateEnum
CREATE TYPE "Subject" AS ENUM ('math', 'lang', 'nature');

-- CreateTable
CREATE TABLE "Teacher" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResult" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "teams" BOOLEAN NOT NULL DEFAULT false,
    "total" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "team1" INTEGER,
    "team2" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "subject" "Subject" NOT NULL,
    "grade" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "emoji" TEXT,
    "options" TEXT[],
    "answer" TEXT NOT NULL,
    "explain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE INDEX "GameResult_teacherId_createdAt_idx" ON "GameResult"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "Question_teacherId_subject_grade_idx" ON "Question"("teacherId", "subject", "grade");

-- AddForeignKey
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
