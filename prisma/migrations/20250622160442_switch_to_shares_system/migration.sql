CREATE TYPE "MarketCategory" AS ENUM ('CRYPTO', 'SPORTS', 'MEMECOINS', 'TECHNOLOGY', 'POLITICS', 'OTHER');

ALTER TYPE "PointsTransactionType" ADD VALUE 'BET_REFUND';

CREATE TABLE "markets" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" "MarketCategory" NOT NULL,
    "closeDate" TIMESTAMP(3) NOT NULL,
    "resolveDate" TIMESTAMP(3),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedOutcome" BOOLEAN,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "maxBetAmount" INTEGER NOT NULL DEFAULT 50000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_positions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "yesShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "noShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_positions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_stats" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "totalYesShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNoShares" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "totalVolume" INTEGER NOT NULL DEFAULT 0,
    "participants" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_stats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "market_trends" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "yesPercentage" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_trends_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "win_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "winAmount" INTEGER NOT NULL,
    "betAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "win_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_positions_userId_createdAt_idx" ON "user_positions"("userId", "createdAt");

CREATE INDEX "user_positions_marketId_createdAt_idx" ON "user_positions"("marketId", "createdAt");

CREATE UNIQUE INDEX "user_positions_userId_marketId_key" ON "user_positions"("userId", "marketId");

CREATE UNIQUE INDEX "market_stats_marketId_key" ON "market_stats"("marketId");

CREATE INDEX "market_trends_marketId_timestamp_idx" ON "market_trends"("marketId", "timestamp");

CREATE INDEX "win_records_winAmount_createdAt_idx" ON "win_records"("winAmount", "createdAt");

ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_positions" ADD CONSTRAINT "user_positions_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "market_stats" ADD CONSTRAINT "market_stats_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "win_records" ADD CONSTRAINT "win_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
