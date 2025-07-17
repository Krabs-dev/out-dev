import prisma from '../prisma';
import { APP_CONFIG } from '../config';
import { LeaderboardUser } from '../api-types';

export async function calculateUserBadges(user: {
  createdAt: Date;
  _count: { dailyClaims: number };
  userPoints?: { balance: number } | null;
}): Promise<string[]> {
  const badges: string[] = [];
  const totalClaims = user._count.dailyClaims;
  const daysSinceJoined = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const claimRate = daysSinceJoined > 0 ? Math.round((totalClaims / daysSinceJoined) * 100) : 0;
  
  if (totalClaims >= APP_CONFIG.LEADERBOARD.BADGES.VETERAN_CLAIMS) {
    badges.push('Veteran');
  }
  
  if (totalClaims >= APP_CONFIG.LEADERBOARD.BADGES.DAILY_PLAYER_CLAIMS && 
      claimRate >= APP_CONFIG.LEADERBOARD.BADGES.DAILY_PLAYER_RATE) {
    badges.push('Daily Player');
  }
  
  if (user.userPoints && user.userPoints.balance >= APP_CONFIG.LEADERBOARD.BADGES.HIGH_SCORER_POINTS) {
    badges.push('High Scorer');
  }
  
  if (daysSinceJoined <= APP_CONFIG.LEADERBOARD.BADGES.NEWCOMER_DAYS) {
    badges.push('Newcomer');
  }
  
  return badges;
}

export async function getUserLeaderboardData(user: { address: string; createdAt: Date; userPoints?: { balance: number; totalEarned: number } | null; _count: { dailyClaims: number }; dailyClaims: { createdAt: Date }[]; activeBadge?: { id: string; badgeType: unknown; tier?: unknown; category?: unknown } | null }, index: number): Promise<LeaderboardUser> {
  const totalClaims = user._count.dailyClaims;
  const lastClaim = user.dailyClaims[0];
  const daysSinceJoined = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const claimRate = daysSinceJoined > 0 ? Math.round((totalClaims / daysSinceJoined) * 100) : 0;
  
  const badges = await calculateUserBadges(user);
  const trend = index < 10 ? 'up' : Math.random() > 0.5 ? 'up' : 'down';

  return {
    rank: index + 1,
    address: user.address,
    username: `${user.address.slice(0, 6)}...${user.address.slice(-4)}`,
    avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${user.address}`,
    points: user.userPoints!.balance,
    totalEarned: user.userPoints!.totalEarned,
    totalClaims,
    claimRate: `${claimRate}%`,
    badges,
    trend,
    lastActive: lastClaim ? lastClaim.createdAt.toISOString() : user.createdAt.toISOString(),
    activeBadge: user.activeBadge ? {
      badgeType: user.activeBadge.badgeType ? user.activeBadge.badgeType.toString() : '',
      tier: user.activeBadge.tier ? user.activeBadge.tier.toString() : undefined,
      category: user.activeBadge.category ? user.activeBadge.category.toString() : undefined
    } : null
  };
}

export async function findUserWithStats(address: string) {
  return await prisma.user.findUnique({
    where: { address },
    include: {
      userPoints: true,
      dailyClaims: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      activeBadge: {
        select: {
          id: true,
          badgeType: true,
          tier: true,
          category: true
        }
      },
      _count: {
        select: {
          dailyClaims: true
        }
      }
    }
  });
}

export async function getUserRank(userPoints: number): Promise<number> {
  const usersWithHigherPoints = await prisma.userPoints.count({
    where: {
      balance: {
        gt: userPoints
      }
    }
  });
  
  return usersWithHigherPoints + 1;
}