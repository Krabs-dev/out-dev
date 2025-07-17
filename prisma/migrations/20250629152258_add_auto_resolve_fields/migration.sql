CREATE TYPE "PriceDirection" AS ENUM ('ABOVE', 'BELOW');

ALTER TABLE "markets" ADD COLUMN     "autoResolve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coingeckoId" TEXT,
ADD COLUMN     "lastCheckedPrice" DOUBLE PRECISION,
ADD COLUMN     "lastPriceCheckAt" TIMESTAMP(3),
ADD COLUMN     "priceDirection" "PriceDirection",
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "targetPrice" DOUBLE PRECISION;

ALTER TABLE "parimutuel_bets" ADD COLUMN     "referralCode" TEXT;

CREATE TABLE "bet_referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "shareCode" TEXT NOT NULL,
    "totalCommission" INTEGER NOT NULL DEFAULT 0,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bet_referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bet_referrals_shareCode_key" ON "bet_referrals"("shareCode");

CREATE INDEX "bet_referrals_shareCode_idx" ON "bet_referrals"("shareCode");

CREATE INDEX "bet_referrals_referrerId_createdAt_idx" ON "bet_referrals"("referrerId", "createdAt");

CREATE INDEX "bet_referrals_marketId_idx" ON "bet_referrals"("marketId");

CREATE UNIQUE INDEX "bet_referrals_referrerId_marketId_key" ON "bet_referrals"("referrerId", "marketId");

CREATE INDEX "parimutuel_bets_referralCode_idx" ON "parimutuel_bets"("referralCode");

ALTER TABLE "bet_referrals" ADD CONSTRAINT "bet_referrals_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bet_referrals" ADD CONSTRAINT "bet_referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
