-- CreateTable
CREATE TABLE "Adventure" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "topics" TEXT[],
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adventure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdventureRun" (
    "id" SERIAL NOT NULL,
    "adventureId" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "missions" INTEGER NOT NULL DEFAULT 0,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdventureRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Adventure_code_key" ON "Adventure"("code");

-- CreateIndex
CREATE INDEX "Adventure_teacherId_createdAt_idx" ON "Adventure"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "AdventureRun_adventureId_stars_idx" ON "AdventureRun"("adventureId", "stars");

-- CreateIndex
CREATE UNIQUE INDEX "AdventureRun_adventureId_playerId_key" ON "AdventureRun"("adventureId", "playerId");

-- AddForeignKey
ALTER TABLE "Adventure" ADD CONSTRAINT "Adventure_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdventureRun" ADD CONSTRAINT "AdventureRun_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "Adventure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
