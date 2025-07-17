import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { applyNFTBonuses } from '@/lib/services/parimutuel-service';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { marketId, marketIds } = body;

    const targetMarketIds: string[] = [];
    
    if (marketId) {
      targetMarketIds.push(marketId);
    } else if (marketIds && Array.isArray(marketIds)) {
      targetMarketIds.push(...marketIds);
    } else {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Either marketId or marketIds array is required'
      });
    }

    console.log(`🎁 [ADMIN-NFT-RETRY] Starting NFT rewards retry for ${targetMarketIds.length} markets...`);

    const markets = await prisma.market.findMany({
      where: {
        id: { in: targetMarketIds },
        isResolved: true
      },
      select: {
        id: true,
        title: true,
        resolvedAt: true
      }
    });

    if (markets.length === 0) {
      return createErrorResponse({
        ...API_ERRORS.NOT_FOUND,
        message: 'No resolved markets found with the provided IDs'
      });
    }

    const notFoundIds = targetMarketIds.filter(id => !markets.find(m => m.id === id));
    if (notFoundIds.length > 0) {
      console.warn(`⚠️ [ADMIN-NFT-RETRY] Markets not found or not resolved: ${notFoundIds.join(', ')}`);
    }

    const results = [];
    let totalProcessedUsers = 0;
    let totalBonusDistributed = 0;
    let totalErrors = 0;

    for (const market of markets) {
      console.log(`🔄 [ADMIN-NFT-RETRY] Processing market: ${market.title} (${market.id})`);
      
      try {
        const result = await applyNFTBonuses(market.id);
        
        results.push({
          marketId: market.id,
          marketTitle: market.title,
          success: true,
          processedUsers: result.processedUsers,
          totalBonusDistributed: result.totalBonusDistributed,
          failedUsers: result.failedUsers || 0
        });

        totalProcessedUsers += result.processedUsers;
        totalBonusDistributed += result.totalBonusDistributed;
        
        console.log(`✅ [ADMIN-NFT-RETRY] Market ${market.id}: ${result.processedUsers} users, ${result.totalBonusDistributed} points distributed`);
        
      } catch (error) {
        totalErrors++;
        
        results.push({
          marketId: market.id,
          marketTitle: market.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        console.error(`❌ [ADMIN-NFT-RETRY] Market ${market.id} failed:`, error);
      }

      if (markets.indexOf(market) < markets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const response = {
      message: 'NFT rewards retry completed',
      summary: {
        totalMarkets: markets.length,
        successfulMarkets: results.filter(r => r.success).length,
        failedMarkets: totalErrors,
        totalProcessedUsers,
        totalBonusDistributed
      },
      results: results,
      timestamp: new Date().toISOString()
    };

    console.log(`🎯 [ADMIN-NFT-RETRY] Process completed:`, response.summary);

    return createSuccessResponse(response);

  } catch (error) {
    console.error('❌ [ADMIN-NFT-RETRY] Retry process failed:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('marketId');

    if (!marketId) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'marketId parameter is required'
      });
    }

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      select: {
        id: true,
        title: true,
        isResolved: true,
        resolvedAt: true,
        resolvedOutcome: true
      }
    });

    if (!market) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

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

    const nftBonusTransactions = await prisma.pointsTransaction.findMany({
      where: {
        AND: [
          {
            metadata: {
              path: ['marketId'],
              equals: marketId
            }
          },
          {
            metadata: {
              path: ['isNFTBonus'],
              equals: true
            }
          }
        ]
      },
      select: {
        userId: true,
        amount: true,
        createdAt: true,
        metadata: true
      }
    });

    const analysis = {
      market: {
        id: market.id,
        title: market.title,
        isResolved: market.isResolved,
        resolvedAt: market.resolvedAt,
        resolvedOutcome: market.resolvedOutcome
      },
      stats: {
        totalWinners: winRecords.length,
        nftBonusesApplied: nftBonusTransactions.length,
        pendingNFTBonuses: winRecords.length - nftBonusTransactions.length
      },
      winners: winRecords.map(record => ({
        userId: record.userId,
        userAddress: record.user.address,
        winAmount: record.winAmount,
        hasNFTBonus: nftBonusTransactions.some(tx => tx.userId === record.userId)
      }))
    };

    return createSuccessResponse(analysis);

  } catch (error) {
    console.error('❌ [ADMIN-NFT-RETRY] Status check failed:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}