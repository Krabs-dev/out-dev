import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await requireAuth();

    const user = await prisma.user.findUnique({
      where: { address: session.address },
      include: {
        userPoints: true,
        pointsTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    const response = {
      points: user?.userPoints || null,
      recentTransactions: user?.pointsTransactions || []
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Points fetch error:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}