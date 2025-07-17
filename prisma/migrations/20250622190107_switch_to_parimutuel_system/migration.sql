/*
  Warnings:

  - You are about to drop the column `totalNoShares` on the `market_stats` table. All the data in the column will be lost.
  - You are about to drop the column `totalYesShares` on the `market_stats` table. All the data in the column will be lost.
  - You are about to drop the column `virtualLiquidity` on the `markets` table. All the data in the column will be lost.
  - You are about to drop the `user_positions` table. If the table is not empty, all the data it contains will be lost.

*/
ALTER TABLE "user_positions" DROP CONSTRAINT "user_positions_marketId_fkey";

ALTER TABLE "user_positions" DROP CONSTRAINT "user_positions_userId_fkey";

ALTER TABLE "market_stats" DROP COLUMN "totalNoShares",
DROP COLUMN "totalYesShares",
ADD COLUMN     "noPool" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPool" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "yesPool" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "markets" DROP COLUMN "virtualLiquidity";

DROP TABLE "user_positions";

CREATE TABLE "parimutuel_bets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "outcome" BOOLEAN NOT NULL,
    "pointsWagered" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parimutuel_bets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "parimutuel_bets_marketId_outcome_idx" ON "parimutuel_bets"("marketId", "outcome");

CREATE INDEX "parimutuel_bets_userId_createdAt_idx" ON "parimutuel_bets"("userId", "createdAt");

CREATE UNIQUE INDEX "parimutuel_bets_userId_marketId_key" ON "parimutuel_bets"("userId", "marketId");

ALTER TABLE "parimutuel_bets" ADD CONSTRAINT "parimutuel_bets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parimutuel_bets" ADD CONSTRAINT "parimutuel_bets_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
