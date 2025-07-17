import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { calculateAndAssignBadges } from '@/lib/services/badge-service';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return createErrorResponse({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        status: 401
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { 
        address: session.user.address,
        isActive: true
      }
    });

    if (!admin) {
      return createErrorResponse({
        code: 'FORBIDDEN',
        message: 'Admin access required',
        status: 403
      });
    }

    const body = await request.json();
    const { userAddress } = body;

    if (userAddress) {
      const user = await prisma.user.findUnique({
        where: { address: userAddress }
      });

      if (!user) {
        return createErrorResponse({
          code: 'NOT_FOUND',
          message: 'User not found',
          status: 404
        });
      }

      const badges = await calculateAndAssignBadges(user.id);
      
      return createSuccessResponse({
        message: `Badges migrated for user ${userAddress}`,
        userAddress,
        badgesCount: badges.length,
        badges
      });
    } else {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          address: true,
          createdAt: true
        }
      });

      let processed = 0;
      let errors = 0;
      const results = [];

      for (const user of users) {
        try {
          const badges = await calculateAndAssignBadges(user.id);
          processed++;
          results.push({
            userAddress: user.address,
            badgesCount: badges.length,
            success: true
          });
        } catch (error) {
          errors++;
          results.push({
            userAddress: user.address,
            error: error instanceof Error ? error.message : 'Unknown error',
            success: false
          });
        }
      }

      const badgeStats = await prisma.userBadge.groupBy({
        by: ['badgeType'],
        _count: true
      });

      return createSuccessResponse({
        message: 'Badge migration completed',
        totalUsers: users.length,
        processed,
        errors,
        results,
        badgeStats
      });
    }

  } catch (error) {
    console.error('Error in badge migration:', error);
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to migrate badges',
      status: 500
    });
  }
}