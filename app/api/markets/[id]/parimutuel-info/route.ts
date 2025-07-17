import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { calculateParimutuelOdds, getUserBet } from '@/lib/services/parimutuel-service';
import { requireAuthWithUserId } from '@/lib/api-middleware';

export interface ParimutuelInfoResponse {
  success: true;
  marketId: string;
  odds: {
    yesOdds: number;
    noOdds: number;
    yesPercentage: number;
    noPercentage: number;
    totalPool: number;
    yesPool: number;
    noPool: number;
  };
  userBet?: {
    outcome: boolean;
    pointsWagered: number;
    potentialPayout: number;
  };
  recentBets: Array<{
    id: string;
    outcome: boolean;
    pointsWagered: number;
    userAddress: string;
    createdAt: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;
    
    let userId: string | null = null;
    try {
      const session = await requireAuthWithUserId();
      userId = session.user.id;
    } catch {
    }

    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

    const marketStats = await prisma.marketStats.findUnique({
      where: { marketId },
    });

    const yesPool = marketStats?.yesPool || 0;
    const noPool = marketStats?.noPool || 0;
    const totalPool = marketStats?.totalPool || 0;

    const odds = calculateParimutuelOdds(yesPool, noPool);

    let userBet = null;
    if (userId) {
      const bet = await getUserBet(userId, marketId);
      if (bet) {
        const winningPool = bet.outcome ? yesPool : noPool;
        const potentialPayout = winningPool > 0 ? Math.floor((bet.pointsWagered * totalPool) / winningPool) : bet.pointsWagered;
        
        userBet = {
          outcome: bet.outcome,
          pointsWagered: bet.pointsWagered,
          potentialPayout,
        };
      }
    }

    const recentBets = await prisma.parimutuelBet.findMany({
      where: { marketId },
      include: {
        user: {
          select: { address: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const response: ParimutuelInfoResponse = {
      success: true,
      marketId,
      odds,
      userBet: userBet || undefined,
      recentBets: recentBets.map(bet => ({
        id: bet.id,
        outcome: bet.outcome,
        pointsWagered: bet.pointsWagered,
        userAddress: bet.user.address,
        createdAt: bet.createdAt.toISOString(),
      })),
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Error fetching parimutuel info:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}