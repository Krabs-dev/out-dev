import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { calculateActualPayout } from '@/lib/services/parimutuel-service';

interface UserBetWithPayout {
  userId: string;
  userAddress: string;
  outcome: boolean;
  pointsWagered: number;
  potentialPayout: number;
  profit: number;
}

interface ResolutionPreview {
  outcome: boolean;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  totalPool: number;
  winningPool: number;
  losingPool: number;
  totalPayout: number;
  userPayouts: UserBetWithPayout[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: marketId } = await params;

    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

    if (market.isResolved) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Market is already resolved'
      });
    }

    const allBets = await prisma.parimutuelBet.findMany({
      where: { marketId },
      include: {
        user: {
          select: {
            address: true
          }
        }
      }
    });

    if (allBets.length === 0) {
      return createSuccessResponse({
        yesPreview: {
          outcome: true,
          totalBets: 0,
          winningBets: 0,
          losingBets: 0,
          totalPool: 0,
          winningPool: 0,
          losingPool: 0,
          totalPayout: 0,
          userPayouts: []
        },
        noPreview: {
          outcome: false,
          totalBets: 0,
          winningBets: 0,
          losingBets: 0,
          totalPool: 0,
          winningPool: 0,
          losingPool: 0,
          totalPayout: 0,
          userPayouts: []
        }
      });
    }

    const totalPool = allBets.reduce((sum, bet) => sum + bet.pointsWagered, 0);
    const yesPool = allBets.filter(bet => bet.outcome === true).reduce((sum, bet) => sum + bet.pointsWagered, 0);
    const noPool = allBets.filter(bet => bet.outcome === false).reduce((sum, bet) => sum + bet.pointsWagered, 0);

    const yesWinners = allBets.filter(bet => bet.outcome === true);
    const yesPreview: ResolutionPreview = {
      outcome: true,
      totalBets: allBets.length,
      winningBets: yesWinners.length,
      losingBets: allBets.length - yesWinners.length,
      totalPool,
      winningPool: yesPool,
      losingPool: noPool,
      totalPayout: 0,
      userPayouts: []
    };

    let yesPayout = 0;
    for (const bet of yesWinners) {
      const payout = calculateActualPayout(bet.pointsWagered, yesPool, totalPool);
      const profit = payout - bet.pointsWagered;
      yesPayout += payout;
      
      yesPreview.userPayouts.push({
        userId: bet.userId,
        userAddress: bet.user.address,
        outcome: bet.outcome,
        pointsWagered: bet.pointsWagered,
        potentialPayout: payout,
        profit
      });
    }
    yesPreview.totalPayout = yesPayout;

    yesPreview.userPayouts.sort((a, b) => b.potentialPayout - a.potentialPayout);

    const noWinners = allBets.filter(bet => bet.outcome === false);
    const noPreview: ResolutionPreview = {
      outcome: false,
      totalBets: allBets.length,
      winningBets: noWinners.length,
      losingBets: allBets.length - noWinners.length,
      totalPool,
      winningPool: noPool,
      losingPool: yesPool,
      totalPayout: 0,
      userPayouts: []
    };

    let noPayout = 0;
    for (const bet of noWinners) {
      const payout = calculateActualPayout(bet.pointsWagered, noPool, totalPool);
      const profit = payout - bet.pointsWagered;
      noPayout += payout;
      
      noPreview.userPayouts.push({
        userId: bet.userId,
        userAddress: bet.user.address,
        outcome: bet.outcome,
        pointsWagered: bet.pointsWagered,
        potentialPayout: payout,
        profit
      });
    }
    noPreview.totalPayout = noPayout;

    noPreview.userPayouts.sort((a, b) => b.potentialPayout - a.potentialPayout);

    return createSuccessResponse({
      yesPreview,
      noPreview
    });

  } catch (error) {
    console.error('Error previewing market resolution:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}