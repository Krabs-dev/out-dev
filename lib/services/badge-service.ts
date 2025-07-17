import prisma from '../prisma';
import { BadgeType, BadgeTier, MarketCategory } from '@prisma/client';
import { checkNFTOwnership } from './nft-service';

export interface BadgeCalculation {
  type: BadgeType;
  tier?: BadgeTier;
  category?: MarketCategory;
  value?: number;
  metadata?: unknown;
}

export interface UserBadgeData {
  id: string;
  badgeType: BadgeType;
  tier?: BadgeTier | null;
  category?: MarketCategory | null;
  isActive: boolean;
  unlockedAt: Date;
  value?: number | null;
  metadata?: unknown;
}

const TIER_THRESHOLDS = {
  BRONZE: 100,
  SILVER: 1000,
  GOLD: 10000,
  PLATINUM: 100000
} as const;

const BETA_CUTOFF_DATE = new Date('2024-08-01');

export function getTierFromValue(value: number): BadgeTier | null {
  if (value >= TIER_THRESHOLDS.PLATINUM) return BadgeTier.PLATINUM;
  if (value >= TIER_THRESHOLDS.GOLD) return BadgeTier.GOLD;
  if (value >= TIER_THRESHOLDS.SILVER) return BadgeTier.SILVER;
  if (value >= TIER_THRESHOLDS.BRONZE) return BadgeTier.BRONZE;
  return null;
}

export function getBadgeTitle(badge: UserBadgeData): string {
  switch (badge.badgeType) {
    case BadgeType.BETA_TESTER:
      return 'Beta Tester';
    case BadgeType.OILY_OWNER:
      return 'Oily Owner';
    case BadgeType.FIRST_BET:
      return 'First Bet';
    case BadgeType.GAINS_TIER:
      return `${badge.tier} Gains`;
    case BadgeType.LOSSES_TIER:
      return `${badge.tier} Losses`;
    case BadgeType.VOLUME_TIER_CATEGORY:
      return `${badge.tier} ${badge.category}`;
    default:
      return 'Unknown';
  }
}

export function getBadgeEmoji(badgeType: BadgeType): string {
  switch (badgeType) {
    case BadgeType.BETA_TESTER:
      return '🚀';
    case BadgeType.OILY_OWNER:
      return '🛢️';
    case BadgeType.FIRST_BET:
      return '🎯';
    case BadgeType.GAINS_TIER:
      return '💰';
    case BadgeType.LOSSES_TIER:
      return '📉';
    case BadgeType.VOLUME_TIER_CATEGORY:
      return '📊';
    default:
      return '🏆';
  }
}

export function getTierColor(tier: BadgeTier): string {
  switch (tier) {
    case BadgeTier.BRONZE:
      return 'from-[#cd7f32] via-[#e6a85c] to-[#bf6a30]';
    case BadgeTier.SILVER:
      return 'from-[#c0c0c0] via-[#e8e8e8] to-[#a8a8a8]';
    case BadgeTier.GOLD:
      return 'from-[#ffd700] via-[#ffed4e] to-[#e6c200]';
    case BadgeTier.PLATINUM:
      return 'from-[#e5e4e2] via-[#ffffff] to-[#d3d3d3]';
    default:
      return 'from-[#6b7280] to-[#4b5563]';
  }
}

export async function getUserWithStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPoints: true,
      parimutuelBets: {
        include: {
          market: true
        }
      },
      winRecords: true
    }
  });

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  return user;
}

export async function getFirstBetForUser(userId: string) {
  return await prisma.parimutuelBet.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      market: true
    }
  });
}


export async function getTotalWinnings(userId: string): Promise<number> {
  const result = await prisma.winRecord.aggregate({
    where: { userId },
    _sum: {
      winAmount: true
    }
  });

  return result._sum.winAmount || 0;
}

export async function getTotalLosses(userId: string): Promise<number> {
  const result = await prisma.parimutuelBet.aggregate({
    where: { 
      userId,
      market: {
        isResolved: true
      }
    },
    _sum: {
      pointsWagered: true
    }
  });

  const totalWagered = result._sum.pointsWagered || 0;
  const totalWinnings = await getTotalWinnings(userId);
  
  return Math.max(0, totalWagered - totalWinnings);
}

export async function getVolumeByCategory(userId: string): Promise<Record<MarketCategory, number>> {
  const bets = await prisma.parimutuelBet.findMany({
    where: { userId },
    include: {
      market: true
    }
  });

  const volumeByCategory: Record<MarketCategory, number> = {
    [MarketCategory.CRYPTO]: 0,
    [MarketCategory.SPORTS]: 0,
    [MarketCategory.MEMECOINS]: 0,
    [MarketCategory.TECHNOLOGY]: 0,
    [MarketCategory.POLITICS]: 0,
    [MarketCategory.OTHER]: 0
  };

  for (const bet of bets) {
    volumeByCategory[bet.market.category] += bet.pointsWagered;
  }

  return volumeByCategory;
}

export async function calculateAndAssignBadges(userId: string): Promise<BadgeCalculation[]> {
  const user = await getUserWithStats(userId);
  const newBadges: BadgeCalculation[] = [];

  if (user.createdAt < BETA_CUTOFF_DATE) {
    newBadges.push({ 
      type: BadgeType.BETA_TESTER,
      metadata: { registrationDate: user.createdAt }
    });
  }

  try {
    const nftData = await checkNFTOwnership(user.address);
    const oilyCollection = nftData.collections.find(c => c.collection === 'OILY');
    if (oilyCollection?.hasNFTs) {
      newBadges.push({ 
        type: BadgeType.OILY_OWNER,
        metadata: { 
          tokenCount: oilyCollection.tokenCount,
          multiplier: oilyCollection.multiplier
        }
      });
    }
  } catch (error) {
    console.warn(`Failed to check NFT ownership for user ${userId}:`, error);
  }

  const firstBet = await getFirstBetForUser(userId);
  if (firstBet) {
    newBadges.push({ 
      type: BadgeType.FIRST_BET,
      metadata: { 
        marketTitle: firstBet.market.title,
        betDate: firstBet.createdAt,
        outcome: firstBet.outcome,
        amount: firstBet.pointsWagered
      }
    });
  }


  const totalWinnings = await getTotalWinnings(userId);
  const gainsTier = getTierFromValue(totalWinnings);
  if (gainsTier) {
    newBadges.push({ 
      type: BadgeType.GAINS_TIER, 
      tier: gainsTier, 
      value: totalWinnings,
      metadata: { totalWinnings }
    });
  }

  const totalLosses = await getTotalLosses(userId);
  const lossesTier = getTierFromValue(totalLosses);
  if (lossesTier) {
    newBadges.push({ 
      type: BadgeType.LOSSES_TIER, 
      tier: lossesTier, 
      value: totalLosses,
      metadata: { totalLosses }
    });
  }

  const volumeByCategory = await getVolumeByCategory(userId);
  for (const [category, volume] of Object.entries(volumeByCategory)) {
    const tier = getTierFromValue(volume);
    if (tier) {
      newBadges.push({ 
        type: BadgeType.VOLUME_TIER_CATEGORY, 
        tier, 
        category: category as MarketCategory,
        value: volume,
        metadata: { volume, category }
      });
    }
  }

  return await assignBadges(userId, newBadges);
}

export async function assignBadges(userId: string, badges: BadgeCalculation[]): Promise<BadgeCalculation[]> {
  const assignedBadges: BadgeCalculation[] = [];

  for (const badge of badges) {
    try {
      const existingBadge = await prisma.userBadge.findFirst({
        where: {
          userId,
          badgeType: badge.type,
          tier: badge.tier ?? null,
          category: badge.category ?? null
        }
      });

      if (!existingBadge) {
        await prisma.userBadge.create({
          data: {
            userId,
            badgeType: badge.type,
            tier: badge.tier ?? null,
            category: badge.category ?? null,
            value: badge.value ?? null,
            metadata: badge.metadata ? JSON.parse(JSON.stringify(badge.metadata)) : null
          }
        });

        assignedBadges.push(badge);
      } else if (badge.value && existingBadge.value && badge.value > existingBadge.value) {
        await prisma.userBadge.update({
          where: { id: existingBadge.id },
          data: {
            value: badge.value ?? null,
            metadata: badge.metadata ? JSON.parse(JSON.stringify(badge.metadata)) : null,
            unlockedAt: new Date()
          }
        });

        assignedBadges.push(badge);
      }
    } catch (error) {
      console.error(`Failed to assign badge ${badge.type} to user ${userId}:`, error);
    }
  }

  return assignedBadges;
}

export async function getUserBadges(userId: string): Promise<UserBadgeData[]> {
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { unlockedAt: 'desc' }
  });

  return badges.map(badge => ({
    id: badge.id,
    badgeType: badge.badgeType,
    tier: badge.tier || undefined,
    category: badge.category || undefined,
    isActive: badge.isActive,
    unlockedAt: badge.unlockedAt,
    value: badge.value || undefined,
    metadata: badge.metadata || undefined
  }));
}

export async function setActiveBadge(userId: string, badgeId: string): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    const badge = await tx.userBadge.findUnique({
      where: { id: badgeId },
      include: { user: true }
    });

    if (!badge || badge.userId !== userId) {
      throw new Error('Badge not found or does not belong to user');
    }

    await tx.userBadge.updateMany({
      where: { userId },
      data: { isActive: false }
    });
    await tx.userBadge.update({
      where: { id: badgeId },
      data: { isActive: true }
    });

    await tx.user.update({
      where: { id: userId },
      data: { activeBadgeId: badgeId }
    });

    return true;
  });
}

export async function removeActiveBadge(userId: string): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    await tx.userBadge.updateMany({
      where: { userId },
      data: { isActive: false }
    });
    await tx.user.update({
      where: { id: userId },
      data: { activeBadgeId: null }
    });

    return true;
  });
}

export async function getActiveBadge(userId: string): Promise<UserBadgeData | null> {
  const badge = await prisma.userBadge.findFirst({
    where: { 
      userId, 
      isActive: true 
    }
  });

  if (!badge) return null;

  return {
    id: badge.id,
    badgeType: badge.badgeType,
    tier: badge.tier || undefined,
    category: badge.category || undefined,
    isActive: badge.isActive,
    unlockedAt: badge.unlockedAt,
    value: badge.value || undefined,
    metadata: badge.metadata || undefined
  };
}

export async function recalculateAllBadges(userId: string): Promise<void> {
  await prisma.userBadge.deleteMany({
    where: { userId }
  });

  await calculateAndAssignBadges(userId);
}

export async function triggerBadgeCalculation(userId: string, action: 'BET_PLACED' | 'BET_WON' | 'MARKET_RESOLVED'): Promise<void> {
  try {
    switch (action) {
      case 'BET_PLACED':
        await checkFirstBetBadges(userId);
        await checkVolumeBadges(userId);
        break;
      case 'BET_WON':
      case 'MARKET_RESOLVED':
        await checkGainsLossesBadges(userId);
        break;
    }
  } catch (error) {
    console.error(`Failed to trigger badge calculation for user ${userId}:`, error);
  }
}

async function checkFirstBetBadges(userId: string): Promise<void> {
  const firstBet = await getFirstBetForUser(userId);
  if (firstBet) {
    await assignBadges(userId, [{ 
      type: BadgeType.FIRST_BET,
      metadata: { 
        marketTitle: firstBet.market.title,
        betDate: firstBet.createdAt,
        outcome: firstBet.outcome,
        amount: firstBet.pointsWagered
      }
    }]);
  }
}

async function checkVolumeBadges(userId: string): Promise<void> {
  const volumeByCategory = await getVolumeByCategory(userId);
  const badges: BadgeCalculation[] = [];

  for (const [category, volume] of Object.entries(volumeByCategory)) {
    const tier = getTierFromValue(volume);
    if (tier) {
      badges.push({ 
        type: BadgeType.VOLUME_TIER_CATEGORY, 
        tier, 
        category: category as MarketCategory,
        value: volume,
        metadata: { volume, category }
      });
    }
  }

  await assignBadges(userId, badges);
}

async function checkGainsLossesBadges(userId: string): Promise<void> {
  const badges: BadgeCalculation[] = [];

  const totalWinnings = await getTotalWinnings(userId);
  const gainsTier = getTierFromValue(totalWinnings);
  if (gainsTier) {
    badges.push({ 
      type: BadgeType.GAINS_TIER, 
      tier: gainsTier, 
      value: totalWinnings,
      metadata: { totalWinnings }
    });
  }

  const totalLosses = await getTotalLosses(userId);
  const lossesTier = getTierFromValue(totalLosses);
  if (lossesTier) {
    badges.push({ 
      type: BadgeType.LOSSES_TIER, 
      tier: lossesTier, 
      value: totalLosses,
      metadata: { totalLosses }
    });
  }

  await assignBadges(userId, badges);
}