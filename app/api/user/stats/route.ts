import prisma from '@/lib/prisma';
import { requireAuthWithUserId } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await requireAuthWithUserId();
    const userId = session.user.id;

    const bets = await prisma.parimutuelBet.findMany({
      where: { userId },
      include: {
        market: {
          select: {
            isResolved: true,
            resolvedOutcome: true,
            marketStats: {
              select: {
                yesPool: true,
                noPool: true,
                totalPool: true,
              },
            },
          },
        },
      },
    });

    const totalBets = bets.length;
    const resolvedBets = bets.filter(bet => bet.market.isResolved);
    const wonBets = resolvedBets.filter(bet => 
      bet.market.resolvedOutcome === bet.outcome
    );
    
    const winRate = resolvedBets.length > 0 ? (wonBets.length / resolvedBets.length) * 100 : 0;
    
    const totalSpentResolved = resolvedBets.reduce((sum, bet) => sum + bet.pointsWagered, 0);
    const totalWon = wonBets.reduce((sum, bet) => {
      const totalPool = bet.market.marketStats?.totalPool || 0;
      const winningPool = bet.outcome 
        ? (bet.market.marketStats?.yesPool || 0)
        : (bet.market.marketStats?.noPool || 0);
      
      if (winningPool === 0) return sum + bet.pointsWagered;
      
      const payout = Math.floor((bet.pointsWagered * totalPool) / winningPool);
      return sum + payout;
    }, 0);
    
    const roi = totalSpentResolved > 0 ? ((totalWon - totalSpentResolved) / totalSpentResolved) * 100 : 0;
    
    const totalSpent = bets.reduce((sum, bet) => sum + bet.pointsWagered, 0);

    const userPoints = await prisma.userPoints.findUnique({
      where: { userId },
      select: {
        balance: true,
        totalEarned: true,
        totalSpent: true,
      },
    });

    const stats = {
      totalBets,
      winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
      roi: Math.round(roi * 10) / 10,
      totalPoints: userPoints?.balance || 0,
      totalSpent,
      totalSpentResolved,
      totalWon,
      activeBets: bets.filter(bet => !bet.market.isResolved).length,
      resolvedBets: resolvedBets.length,
    };

    return createSuccessResponse(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}