import prisma from '../prisma';
import { PointsTransactionType } from '@prisma/client';
import { checkNFTOwnership } from './nft-service';
import { triggerBadgeCalculation } from './badge-service';

export interface ParimutuelValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ParimutuelOdds {
  yesOdds: number;
  noOdds: number;
  yesPercentage: number;
  noPercentage: number;
  totalPool: number;
  yesPool: number;
  noPool: number;
}

export interface ParimutuelPayout {
  payout: number;
  multiplier: number;
}

export function validateBetParameters(outcome: unknown, pointsAmount: unknown): ParimutuelValidationResult {
  if (typeof outcome !== 'boolean') {
    return { isValid: false, error: 'Outcome must be a boolean' };
  }
  
  if (typeof pointsAmount !== 'number' || pointsAmount <= 0) {
    return { isValid: false, error: 'Points amount must be a positive number' };
  }
  
  return { isValid: true };
}

export function validateMarketStatus(market: { isResolved: boolean; closeDate: Date }): ParimutuelValidationResult {
  if (market.isResolved) {
    return { isValid: false, error: 'Market is resolved' };
  }
  
  if (new Date() >= market.closeDate) {
    return { isValid: false, error: 'Market is closed' };
  }
  
  return { isValid: true };
}

export function validateBetAmount(pointsAmount: number, maxBetAmount: number): ParimutuelValidationResult {
  if (pointsAmount > maxBetAmount) {
    return { isValid: false, error: `Maximum bet amount is ${maxBetAmount} points` };
  }
  
  return { isValid: true };
}

export function validateUserBalance(userPoints: { balance: number } | null, pointsAmount: number): ParimutuelValidationResult {
  if (!userPoints || userPoints.balance < pointsAmount) {
    return { isValid: false, error: 'Insufficient balance' };
  }
  
  return { isValid: true };
}

export function validateExistingBet(
  existingBet: { outcome: boolean; pointsWagered: number } | null,
  newOutcome: boolean,
  newAmount: number
): ParimutuelValidationResult {
  if (!existingBet) {
    return { isValid: true };
  }
  
  if (existingBet.outcome !== newOutcome) {
    return { 
      isValid: false, 
      error: 'You cannot switch sides. You can only adjust your bet amount on the same outcome.' 
    };
  }
  
  if (existingBet.pointsWagered === newAmount) {
    return { 
      isValid: false, 
      error: 'You already have this exact bet amount. Please choose a different amount.' 
    };
  }
  
  if (newAmount < existingBet.pointsWagered) {
    return { 
      isValid: false, 
      error: 'You can only increase your bet amount. Current bet: ' + existingBet.pointsWagered + ' points.' 
    };
  }
  
  return { isValid: true };
}

export function calculateParimutuelOdds(yesPool: number, noPool: number): ParimutuelOdds {
  const totalPool = yesPool + noPool;
  
  if (totalPool === 0) {
    return {
      yesOdds: 1,
      noOdds: 1,
      yesPercentage: 50,
      noPercentage: 50,
      totalPool: 0,
      yesPool: 0,
      noPool: 0
    };
  }
  
  const yesPercentage = (yesPool / totalPool) * 100;
  const noPercentage = (noPool / totalPool) * 100;
  
  return {
    yesOdds: yesPool > 0 ? totalPool / yesPool : totalPool,
    noOdds: noPool > 0 ? totalPool / noPool : totalPool,
    yesPercentage,
    noPercentage,
    totalPool,
    yesPool,
    noPool
  };
}

export function calculatePotentialPayout(
  userBet: number, 
  outcome: boolean,
  yesPool: number, 
  noPool: number
): ParimutuelPayout {
  const currentPool = outcome ? yesPool : noPool;
  const newPool = currentPool + userBet;
  const totalPool = yesPool + noPool + userBet;
  
  if (newPool === 0) {
    return { payout: userBet, multiplier: 1 };
  }
  
  const payout = Math.floor((userBet * totalPool) / newPool);
  const multiplier = payout / userBet;
  
  return { payout, multiplier };
}

export function calculateActualPayout(
  userBet: number, 
  winningPool: number, 
  totalPool: number
): number {
  if (winningPool === 0) {
    return userBet; // Remboursement si personne n'a parié sur l'issue gagnante
  }
  
  return Math.floor((userBet * totalPool) / winningPool);
}

export async function executeParimutuelBet(
  userId: string,
  marketId: string,
  outcome: boolean,
  pointsAmount: number,
  marketTitle: string,
  existingBet?: { id: string; outcome: boolean; pointsWagered: number } | null,
  referralCode?: string | null
) {
  return await prisma.$transaction(async (tx) => {
    let updatedUserPoints;
    let transaction;
    let parimutuelBet;
    
    if (existingBet) {
      const pointsDifference = pointsAmount - existingBet.pointsWagered;
      
      updatedUserPoints = await tx.userPoints.update({
        where: { userId },
        data: {
          balance: { decrement: pointsDifference },
          totalSpent: pointsDifference > 0 ? { increment: pointsDifference } : { decrement: Math.abs(pointsDifference) },
        },
      });

      transaction = await tx.pointsTransaction.create({
        data: {
          userId,
          type: PointsTransactionType.BET_PLACED,
          amount: -pointsDifference,
          description: `Updated bet from ${existingBet.pointsWagered} to ${pointsAmount} points on ${outcome ? 'YES' : 'NO'} for ${marketTitle}`,
          metadata: {
            marketId,
            outcome,
            pointsWagered: pointsAmount,
            previousBet: existingBet.pointsWagered,
            bettingSystem: 'parimutuel',
            isUpdate: true
          },
        },
      });

      parimutuelBet = await tx.parimutuelBet.update({
        where: { id: existingBet.id },
        data: {
          outcome,
          pointsWagered: pointsAmount,
        },
      });
    } else {
      
      updatedUserPoints = await tx.userPoints.update({
        where: { userId },
        data: {
          balance: { decrement: pointsAmount },
          totalSpent: { increment: pointsAmount },
        },
      });

      transaction = await tx.pointsTransaction.create({
        data: {
          userId,
          type: PointsTransactionType.BET_PLACED,
          amount: -pointsAmount,
          description: `Bet ${pointsAmount} points on ${outcome ? 'YES' : 'NO'} for ${marketTitle}`,
          metadata: {
            marketId,
            outcome,
            pointsWagered: pointsAmount,
            bettingSystem: 'parimutuel'
          },
        },
      });

      parimutuelBet = await tx.parimutuelBet.create({
        data: {
          userId,
          marketId,
          outcome,
          pointsWagered: pointsAmount,
          referralCode,
        },
      });

      if (referralCode) {
        await tx.betReferral.update({
          where: { shareCode: referralCode },
          data: { 
            usageCount: { increment: 1 }
          },
        });
      }
    }

    const currentStats = await tx.marketStats.findUnique({
      where: { marketId }
    });

    let newYesPool, newNoPool;
    
    if (existingBet) {
      const currentYesPool = currentStats?.yesPool || 0;
      const currentNoPool = currentStats?.noPool || 0;
      
      const adjustedYesPool = currentYesPool - (existingBet.outcome ? existingBet.pointsWagered : 0);
      const adjustedNoPool = currentNoPool - (!existingBet.outcome ? existingBet.pointsWagered : 0);
      
      newYesPool = adjustedYesPool + (outcome ? pointsAmount : 0);
      newNoPool = adjustedNoPool + (!outcome ? pointsAmount : 0);
    } else {
      newYesPool = (currentStats?.yesPool || 0) + (outcome ? pointsAmount : 0);
      newNoPool = (currentStats?.noPool || 0) + (!outcome ? pointsAmount : 0);
    }
    
    const newTotalPool = newYesPool + newNoPool;

    const uniqueParticipants = await tx.parimutuelBet.findMany({
      where: { marketId },
      select: { userId: true },
      distinct: ['userId']
    });
    const participantCount = uniqueParticipants.length;

    const volumeAdjustment = existingBet ? pointsAmount - existingBet.pointsWagered : pointsAmount;
    
    const updatedStats = await tx.marketStats.upsert({
      where: { marketId },
      create: {
        marketId,
        totalVolume: pointsAmount,
        participants: 1,
        yesPool: newYesPool,
        noPool: newNoPool,
        totalPool: newTotalPool,
        currentPrice: newTotalPool > 0 ? newYesPool / newTotalPool : 0.5,
      },
      update: {
        totalVolume: { increment: volumeAdjustment },
        participants: participantCount,
        yesPool: newYesPool,
        noPool: newNoPool,
        totalPool: newTotalPool,
        currentPrice: newTotalPool > 0 ? newYesPool / newTotalPool : 0.5,
      },
    });

    const odds = calculateParimutuelOdds(newYesPool, newNoPool);
    const trend = await tx.marketTrend.create({
      data: {
        marketId,
        yesPercentage: odds.yesPercentage,
        volume: updatedStats.totalVolume,
      },
    });

    return { 
      parimutuelBet, 
      updatedUserPoints, 
      transaction, 
      updatedStats, 
      trend,
      odds 
    };
  });
}

export async function resolveParimutuelMarket(marketId: string, outcome: boolean) {
  console.log(`🔒 [PARIMUTUEL] Starting atomic resolution for market ${marketId} with outcome: ${outcome ? 'YES' : 'NO'}`);
  
  const atomicStartTime = Date.now();
  const updateResult = await prisma.market.updateMany({
    where: { 
      id: marketId,
      isResolved: false
    },
    data: {
      isResolved: true,
      resolvedOutcome: outcome,
      resolvedAt: new Date(),
    },
  });
  
  const atomicDuration = Date.now() - atomicStartTime;
  console.log(`🔒 [PARIMUTUEL] Atomic update completed in ${atomicDuration}ms - Updated rows: ${updateResult.count}`);
  
  if (updateResult.count === 0) {
    console.warn(`⚠️ [PARIMUTUEL] Market ${marketId} was already resolved or doesn't exist - aborting resolution`);
    throw new Error(`Market ${marketId} is already resolved or not found`);
  }
  
  console.log(`✅ [PARIMUTUEL] Market ${marketId} successfully marked as resolved atomically`);

  const allBets = await prisma.parimutuelBet.findMany({
    where: { marketId },
    include: { user: true }
  });

  if (allBets.length === 0) {
    return { resolvedBets: 0, totalPayout: 0 };
  }

  console.log(`Processing ${allBets.length} bets for market ${marketId}`);

  const winningBets = allBets.filter(bet => bet.outcome === outcome);
  const totalPool = allBets.reduce((sum, bet) => sum + bet.pointsWagered, 0);
  const winningPool = winningBets.reduce((sum, bet) => sum + bet.pointsWagered, 0);

  let totalPayout = 0;
  const BATCH_SIZE = 3;

  for (let i = 0; i < winningBets.length; i += BATCH_SIZE) {
    const batch = winningBets.slice(i, i + BATCH_SIZE);
    
    await prisma.$transaction(async (tx) => {
      for (const bet of batch) {
        const basePayout = calculateActualPayout(bet.pointsWagered, winningPool, totalPool);
        totalPayout += basePayout;
        
        const profit = basePayout - bet.pointsWagered;
        let referralCommission = 0;
        
        if (bet.referralCode && profit > 0) {
          referralCommission = Math.floor(profit * 0.1);
          
          const referral = await tx.betReferral.findUnique({
            where: { shareCode: bet.referralCode },
            include: { referrer: true }
          });
          
          if (referral) {
            await tx.userPoints.update({
              where: { userId: referral.referrerId },
              data: {
                balance: { increment: referralCommission },
                totalEarned: { increment: referralCommission },
              },
            });

            await tx.pointsTransaction.create({
              data: {
                userId: referral.referrerId,
                type: PointsTransactionType.REFERRAL_BONUS,
                amount: referralCommission,
                description: `Referral commission from ${bet.user.address.slice(0, 6)}...${bet.user.address.slice(-4)} winning bet`,
                metadata: {
                  marketId,
                  referredUserId: bet.userId,
                  originalPayout: basePayout,
                  commission: referralCommission,
                  referralCode: bet.referralCode
                },
              },
            });

            await tx.betReferral.update({
              where: { shareCode: bet.referralCode },
              data: { 
                totalCommission: { increment: referralCommission }
              }
            });
          }
        }
        
        await tx.userPoints.update({
          where: { userId: bet.userId },
          data: {
            balance: { increment: basePayout },
            totalEarned: { increment: basePayout },
          },
        });

        await tx.pointsTransaction.create({
          data: {
            userId: bet.userId,
            type: PointsTransactionType.BET_WON,
            amount: basePayout,
            description: `Won ${basePayout} points from parimutuel betting (${bet.pointsWagered} bet → ${basePayout} payout)`,
            metadata: {
              marketId,
              outcome,
              originalBet: bet.pointsWagered,
              basePayout: basePayout,
              multiplier: basePayout / bet.pointsWagered,
              bettingSystem: 'parimutuel',
              referralCommission: referralCommission > 0 ? referralCommission : undefined,
              nftBonusPending: true
            },
          },
        });

        await tx.winRecord.create({
          data: {
            userId: bet.userId,
            marketId,
            winAmount: basePayout,
            betAmount: bet.pointsWagered,
          },
        });
      }
    }, {
      timeout: 30000
    });
    
    console.log(`Processed batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(winningBets.length/BATCH_SIZE)} for market ${marketId}`);
    
    if (i + BATCH_SIZE < winningBets.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const userIds = [...new Set(allBets.map(bet => bet.userId))];
  Promise.all(
    userIds.map(userId => 
      triggerBadgeCalculation(userId, 'MARKET_RESOLVED').catch(error => {
        console.error(`Failed to trigger badge calculation for user ${userId}:`, error);
      })
    )
  ).catch(error => {
    console.error('Failed to trigger badge calculations after market resolution:', error);
  });

  return { 
    resolvedBets: allBets.length, 
    totalPayout,
    winningBets: winningBets.length,
    losingBets: allBets.length - winningBets.length
  };
}


export async function getUserBet(userId: string, marketId: string) {
  return await prisma.parimutuelBet.findUnique({
    where: {
      userId_marketId: {
        userId,
        marketId,
      },
    },
  });
}

export async function applyNFTBonuses(marketId: string) {
  console.log(`Starting NFT bonus application for market ${marketId}`);
  
  const winRecords = await prisma.winRecord.findMany({
    where: { marketId },
    include: { user: true }
  });

  if (winRecords.length === 0) {
    console.log(`No winners found for market ${marketId}`);
    return { processedUsers: 0, totalBonusDistributed: 0 };
  }

  let totalBonusDistributed = 0;
  let processedUsers = 0;
  let failedUsers = 0;

  const batchSize = 2;
  for (let i = 0; i < winRecords.length; i += batchSize) {
    const batch = winRecords.slice(i, i + batchSize);
    console.log(`🎁 [NFT-${marketId}] Processing user batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(winRecords.length/batchSize)}`);
    
    const batchResults = await Promise.allSettled(
      batch.map(record => 
        Promise.race([
          processUserNFTBonus(record, marketId),
          new Promise<{ bonus: number }>((_, reject) => 
            setTimeout(() => reject(new Error('User NFT processing timeout')), 15000)
          )
        ])
      )
    );

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        totalBonusDistributed += result.value.bonus;
        processedUsers++;
        if (result.value.bonus > 0) {
          console.log(`✅ NFT bonus applied for user ${batch[index].userId}: +${result.value.bonus} points`);
        }
      } else {
        failedUsers++;
        console.error(`❌ Failed to apply NFT bonus for user ${batch[index].userId}:`, result.reason);
      }
    });

    if (i + batchSize < winRecords.length) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  console.log(`NFT bonus application completed for market ${marketId}:`, {
    processedUsers,
    failedUsers,
    totalBonusDistributed
  });

  return { processedUsers, failedUsers, totalBonusDistributed };
}

async function processUserNFTBonus(winRecord: { id: string; userId: string; marketId: string; winAmount: number; betAmount: number; user: { address: string } }, marketId: string) {
  try {
    const nftData = await checkNFTOwnership(winRecord.user.address);
    
    if (nftData.totalMultiplier <= 1) {
      await updateTransactionNFTStatus(winRecord.userId, marketId, 0, 1);
      return { bonus: 0 };
    }

    const originalPayout = winRecord.winAmount;
    const multipliedPayout = Math.floor(originalPayout * nftData.totalMultiplier);
    const nftBonus = multipliedPayout - originalPayout;

    if (nftBonus > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.userPoints.update({
          where: { userId: winRecord.userId },
          data: {
            balance: { increment: nftBonus },
            totalEarned: { increment: nftBonus },
          },
        });

        await tx.winRecord.update({
          where: { id: winRecord.id },
          data: { winAmount: multipliedPayout }
        });

        await tx.pointsTransaction.create({
          data: {
            userId: winRecord.userId,
            type: PointsTransactionType.BET_WON,
            amount: nftBonus,
            description: `NFT bonus: +${nftBonus} points (${nftData.totalMultiplier}x multiplier)`,
            metadata: {
              marketId,
              isNFTBonus: true,
              nftMultiplier: nftData.totalMultiplier,
              ownedCollections: nftData.collections.filter(c => c.hasNFTs).map(c => c.name),
              originalPayout: originalPayout,
              nftBonus: nftBonus
            },
          },
        });

        await updateTransactionNFTStatus(winRecord.userId, marketId, nftBonus, nftData.totalMultiplier);
      }, {
        timeout: 20000
      });
    } else {
      await updateTransactionNFTStatus(winRecord.userId, marketId, 0, nftData.totalMultiplier);
    }

    return { bonus: nftBonus };
    
  } catch (error) {
    console.error(`Error processing NFT bonus for user ${winRecord.userId}:`, error);
    
    try {
      await updateTransactionNFTStatus(winRecord.userId, marketId, 0, 1, error instanceof Error ? error.message : 'Unknown error');
    } catch (updateError) {
      console.error(`Failed to update transaction status:`, updateError);
    }
    
    throw error;
  }
}

async function updateTransactionNFTStatus(userId: string, marketId: string, bonus: number, multiplier: number, error?: string) {
  const originalTransaction = await prisma.pointsTransaction.findFirst({
    where: {
      userId,
      AND: [
        {
          metadata: {
            path: ['marketId'],
            equals: marketId
          }
        },
        {
          metadata: {
            path: ['nftBonusPending'],
            equals: true
          }
        }
      ]
    }
  });

  if (originalTransaction) {
    const updatedMetadata = {
      ...(originalTransaction.metadata as Record<string, unknown>),
      nftBonusPending: false,
      nftBonusApplied: bonus,
      nftMultiplier: multiplier,
      nftBonusError: error || null,
      nftBonusProcessedAt: new Date().toISOString()
    };

    await prisma.pointsTransaction.update({
      where: { id: originalTransaction.id },
      data: { metadata: updatedMetadata }
    });
  }
}