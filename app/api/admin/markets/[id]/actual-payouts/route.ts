import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

interface UserActualPayout {
  userId: string;
  userAddress: string;
  outcome: boolean;
  pointsWagered: number;
  actualPayout: number;
  profit: number;
  nftBonus?: number;
  nftMultiplier?: number;
  isWinner: boolean;
}

interface ActualResolutionData {
  outcome: boolean;
  resolvedAt: string;
  resolvedBy: string;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  totalPool: number;
  winningPool: number;
  losingPool: number;
  totalBasePayout: number;
  totalNFTBonus: number;
  totalActualPayout: number;
  userPayouts: UserActualPayout[];
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

    if (!market.isResolved) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Market is not resolved yet'
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

    const winRecords = await prisma.winRecord.findMany({
      where: { marketId },
      include: {
        user: {
          select: {
            address: true
          }
        }
      }
    });

    const transactions = await prisma.pointsTransaction.findMany({
      where: {
        AND: [
          {
            metadata: {
              path: ['marketId'],
              equals: marketId
            }
          },
          {
            OR: [
              { type: 'BET_WON' },
              { type: 'BET_LOST' }
            ]
          }
        ]
      },
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
        outcome: market.resolvedOutcome!,
        resolvedAt: market.resolvedAt!.toISOString(),
        resolvedBy: market.resolvedBy || 'UNKNOWN',
        totalBets: 0,
        winningBets: 0,
        losingBets: 0,
        totalPool: 0,
        winningPool: 0,
        losingPool: 0,
        totalBasePayout: 0,
        totalNFTBonus: 0,
        totalActualPayout: 0,
        userPayouts: []
      });
    }

    const totalPool = allBets.reduce((sum, bet) => sum + bet.pointsWagered, 0);
    const winningBets = allBets.filter(bet => bet.outcome === market.resolvedOutcome);
    const losingBets = allBets.filter(bet => bet.outcome !== market.resolvedOutcome);
    const winningPool = winningBets.reduce((sum, bet) => sum + bet.pointsWagered, 0);
    const losingPool = losingBets.reduce((sum, bet) => sum + bet.pointsWagered, 0);

    const userPayouts: UserActualPayout[] = [];
    let totalBasePayout = 0;
    let totalNFTBonus = 0;

    for (const bet of allBets) {
      const isWinner = bet.outcome === market.resolvedOutcome;
      let actualPayout = 0;
      let nftBonus = 0;
      let nftMultiplier = 1;

      if (isWinner) {
        const winRecord = winRecords.find(wr => wr.userId === bet.userId);
        if (winRecord) {
          actualPayout = winRecord.winAmount;
          totalBasePayout += actualPayout;
        }

        const nftTransaction = transactions.find(tx => 
          tx.userId === bet.userId && 
          tx.metadata && 
          typeof tx.metadata === 'object' && 
          'isNFTBonus' in tx.metadata && 
          tx.metadata.isNFTBonus === true
        );

        if (nftTransaction) {
          nftBonus = nftTransaction.amount;
          totalNFTBonus += nftBonus;
          
          if (nftTransaction.metadata && typeof nftTransaction.metadata === 'object' && 'nftMultiplier' in nftTransaction.metadata) {
            nftMultiplier = nftTransaction.metadata.nftMultiplier as number;
          }
        }

        const baseTransaction = transactions.find(tx => 
          tx.userId === bet.userId && 
          tx.metadata && 
          typeof tx.metadata === 'object' && 
          (!('isNFTBonus' in tx.metadata) || tx.metadata.isNFTBonus !== true) &&
          'basePayout' in tx.metadata
        );

        if (baseTransaction && baseTransaction.metadata && typeof baseTransaction.metadata === 'object' && 'basePayout' in baseTransaction.metadata) {
          const basePayout = baseTransaction.metadata.basePayout as number;
          if (nftBonus > 0) {
            actualPayout = basePayout + nftBonus;
          }
        }
      }

      const profit = actualPayout - bet.pointsWagered;

      userPayouts.push({
        userId: bet.userId,
        userAddress: bet.user.address,
        outcome: bet.outcome,
        pointsWagered: bet.pointsWagered,
        actualPayout,
        profit,
        nftBonus: nftBonus > 0 ? nftBonus : undefined,
        nftMultiplier: nftMultiplier > 1 ? nftMultiplier : undefined,
        isWinner
      });
    }

    userPayouts.sort((a, b) => {
      if (a.actualPayout !== b.actualPayout) {
        return b.actualPayout - a.actualPayout;
      }
      return b.pointsWagered - a.pointsWagered;
    });

    const actualResolutionData: ActualResolutionData = {
      outcome: market.resolvedOutcome!,
      resolvedAt: market.resolvedAt!.toISOString(),
      resolvedBy: market.resolvedBy || 'UNKNOWN',
      totalBets: allBets.length,
      winningBets: winningBets.length,
      losingBets: losingBets.length,
      totalPool,
      winningPool,
      losingPool,
      totalBasePayout,
      totalNFTBonus,
      totalActualPayout: totalBasePayout + totalNFTBonus,
      userPayouts
    };

    return createSuccessResponse(actualResolutionData);

  } catch (error) {
    console.error('Error fetching actual payouts:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}