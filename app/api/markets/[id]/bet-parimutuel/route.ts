import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuthWithUserId } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { 
  validateBetParameters, 
  validateMarketStatus, 
  validateBetAmount, 
  validateUserBalance,
  validateExistingBet,
  executeParimutuelBet,
  getUserBet,
  calculatePotentialPayout
} from '@/lib/services/parimutuel-service';
import { validateBetaAccess } from '@/lib/services/nft-service';
import { triggerBadgeCalculation } from '@/lib/services/badge-service';

export interface ParimutuelBetResponse {
  success: true;
  bet: {
    outcome: boolean;
    pointsWagered: number;
    potentialPayout: number;
    multiplier: number;
  };
  marketOdds: {
    yesOdds: number;
    noOdds: number;
    yesPercentage: number;
    noPercentage: number;
    totalPool: number;
    yesPool: number;
    noPool: number;
  };
  newStats: {
    totalPool: number;
    yesPool: number;
    noPool: number;
    currentPrice: number;
    totalVolume: number;
    participants: number;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;
    const session = await requireAuthWithUserId();
    const userId = session.user.id;

    const requestBody = await request.json();
    const { outcome, amount: pointsAmount, referralCode } = requestBody;

    const paramValidation = validateBetParameters(outcome, pointsAmount);
    if (!paramValidation.isValid) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: paramValidation.error!
      });
    }

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { marketStats: true },
    });

    if (!market) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

    const marketValidation = validateMarketStatus(market);
    if (!marketValidation.isValid) {
      return createErrorResponse(API_ERRORS.MARKET_CLOSED);
    }

    const amountValidation = validateBetAmount(pointsAmount, market.maxBetAmount);
    if (!amountValidation.isValid) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: amountValidation.error!
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

    const betaValidation = await validateBetaAccess(user.address);
    if (!betaValidation.hasAccess) {
      return createErrorResponse({
        ...API_ERRORS.BETA_ACCESS_DENIED,
        message: betaValidation.reason || 'Beta access required'
      });
    }

    const userPoints = await prisma.userPoints.findUnique({
      where: { userId },
    });

    const balanceValidation = validateUserBalance(userPoints, pointsAmount);
    if (!balanceValidation.isValid) {
      return createErrorResponse(API_ERRORS.INSUFFICIENT_BALANCE);
    }

    const existingBet = await getUserBet(userId, marketId);
    const existingBetValidation = validateExistingBet(existingBet, outcome, pointsAmount);
    if (!existingBetValidation.isValid) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: existingBetValidation.error!
      });
    }

    const currentYesPool = market.marketStats?.yesPool || 0;
    const currentNoPool = market.marketStats?.noPool || 0;
    const potentialPayout = calculatePotentialPayout(
      pointsAmount, 
      outcome, 
      currentYesPool, 
      currentNoPool
    );

    let validatedReferralCode = null;
    if (referralCode) {
      const referral = await prisma.betReferral.findUnique({
        where: { shareCode: referralCode },
        include: { referrer: true }
      });
      
      if (referral && 
          referral.marketId === marketId && 
          referral.referrerId !== userId) {
        validatedReferralCode = referralCode;
      }
    }

    const result = await executeParimutuelBet(
      userId,
      marketId,
      outcome,
      pointsAmount,
      market.title,
      existingBet,
      validatedReferralCode
    );

    triggerBadgeCalculation(userId, 'BET_PLACED').catch(error => {
      console.error('Failed to trigger badge calculation:', error);
    });

    const response: ParimutuelBetResponse = {
      success: true,
      bet: {
        outcome,
        pointsWagered: pointsAmount,
        potentialPayout: potentialPayout.payout,
        multiplier: potentialPayout.multiplier,
      },
      marketOdds: {
        yesOdds: result.odds.yesOdds,
        noOdds: result.odds.noOdds,
        yesPercentage: result.odds.yesPercentage,
        noPercentage: result.odds.noPercentage,
        totalPool: result.odds.totalPool,
        yesPool: result.odds.yesPool,
        noPool: result.odds.noPool,
      },
      newStats: {
        totalPool: result.updatedStats.totalPool,
        yesPool: result.updatedStats.yesPool,
        noPool: result.updatedStats.noPool,
        currentPrice: result.updatedStats.currentPrice,
        totalVolume: result.updatedStats.totalVolume,
        participants: result.updatedStats.participants,
      },
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Parimutuel bet error:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}