CREATE TYPE "PointsTransactionType" AS ENUM ('DAILY_CLAIM', 'REFERRAL_BONUS', 'BET_PLACED', 'BET_WON', 'BET_LOST', 'ADMIN_ADJUSTMENT');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_points" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_points_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "daily_claims" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimDate" TIMESTAMP(3) NOT NULL,
    "baseAmount" INTEGER NOT NULL DEFAULT 1000,
    "totalAmount" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_claims_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "points_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PointsTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_address_key" ON "users"("address");

CREATE UNIQUE INDEX "user_points_userId_key" ON "user_points"("userId");

CREATE INDEX "daily_claims_userId_createdAt_idx" ON "daily_claims"("userId", "createdAt");

CREATE INDEX "points_transactions_userId_createdAt_idx" ON "points_transactions"("userId", "createdAt");

CREATE INDEX "points_transactions_type_createdAt_idx" ON "points_transactions"("type", "createdAt");

ALTER TABLE "user_points" ADD CONSTRAINT "user_points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_claims" ADD CONSTRAINT "daily_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
