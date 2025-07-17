import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { getUserLeaderboardData, findUserWithStats, getUserRank } from '@/lib/services/user-service';
import { APP_CONFIG } from '@/lib/config';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    const topUsers = await prisma.user.findMany({
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
      },
      orderBy: {
        userPoints: {
          balance: 'desc'
        }
      },
      take: APP_CONFIG.LEADERBOARD.TOP_USERS_LIMIT
    });

    const leaderboardData = await Promise.all(
      topUsers
        .filter(user => user.userPoints && user.userPoints.balance > 0)
        .map((user, index) => getUserLeaderboardData(user, index))
    );

    let currentUserRank = null;
    if (isAuthenticated(session)) {
      const currentUser = await findUserWithStats(session.address);

      if (currentUser && currentUser.userPoints) {
        const rank = await getUserRank(currentUser.userPoints.balance);
        currentUserRank = await getUserLeaderboardData(currentUser, rank - 1);
      }
    }

    const response = {
      leaderboard: leaderboardData,
      currentUser: currentUserRank,
      totalUsers: await prisma.user.count()
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}