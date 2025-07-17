import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuthWithUserId, parsePaginationParams } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthWithUserId();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all'; // active, resolved, all
    const { limit, offset } = parsePaginationParams(request);

    const whereClause: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (status === 'active') {
      whereClause.market = { isResolved: false };
    } else if (status === 'resolved') {
      whereClause.market = { isResolved: true };
    }

    const bets = await prisma.parimutuelBet.findMany({
      where: whereClause,
      include: {
        market: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            category: true,
            closeDate: true,
            isResolved: true,
            resolvedOutcome: true,
            marketStats: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const formattedBets = bets.map((bet) => {
      const isWinning = bet.market.isResolved && 
        bet.market.resolvedOutcome === bet.outcome;
      
      const yesPool = bet.market.marketStats?.yesPool || 0;
      const noPool = bet.market.marketStats?.noPool || 0;
      const totalPool = yesPool + noPool;
      const winningPool = bet.outcome ? yesPool : noPool;
      
      const currentValue = bet.market.isResolved 
        ? (isWinning && winningPool > 0 ? Math.floor((bet.pointsWagered * totalPool) / winningPool) : 0)
        : (winningPool > 0 ? Math.floor((bet.pointsWagered * totalPool) / winningPool) : bet.pointsWagered);

      return {
        id: bet.id,
        marketId: bet.marketId,
        marketTitle: bet.market.title,
        marketImage: bet.market.imageUrl,
        marketCategory: bet.market.category,
        outcome: bet.outcome,
        pointsWagered: bet.pointsWagered,
        currentValue: Math.round(currentValue),
        isResolved: bet.market.isResolved,
        isWinning,
        createdAt: bet.createdAt,
        closeDate: bet.market.closeDate,
      };
    });

    return createSuccessResponse(formattedBets);
  } catch (error) {
    console.error('Error fetching user bets:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}