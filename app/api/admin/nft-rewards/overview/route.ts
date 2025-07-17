import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    console.log(`📊 [NFT-OVERVIEW] Getting NFT rewards overview for last ${days} days...`);

    const recentMarkets = await prisma.market.findMany({
      where: {
        isResolved: true,
        resolvedAt: {
          gte: cutoffDate
        }
      },
      select: {
        id: true,
        title: true,
        resolvedAt: true,
        resolvedOutcome: true,
        resolvedBy: true
      },
      orderBy: {
        resolvedAt: 'desc'
      }
    });

    console.log(`📊 [NFT-OVERVIEW] Found ${recentMarkets.length} resolved markets in last ${days} days`);

    const overview = [];
    let totalMarkets = 0;
    let marketsWithIssues = 0;
    let totalPendingRewards = 0;

    for (const market of recentMarkets) {
      totalMarkets++;

      const winRecords = await prisma.winRecord.findMany({
        where: { marketId: market.id }
      });

      if (winRecords.length === 0) {
        overview.push({
          marketId: market.id,
          marketTitle: market.title,
          resolvedAt: market.resolvedAt,
          resolvedOutcome: market.resolvedOutcome,
          resolvedBy: market.resolvedBy,
          totalWinners: 0,
          nftBonusesApplied: 0,
          pendingNFTBonuses: 0,
          status: 'no_winners'
        });
        continue;
      }

      const nftBonusTransactions = await prisma.pointsTransaction.findMany({
        where: {
          AND: [
            {
              metadata: {
                path: ['marketId'],
                equals: market.id
              }
            },
            {
              metadata: {
                path: ['isNFTBonus'],
                equals: true
              }
            }
          ]
        }
      });

      const totalWinners = winRecords.length;
      const nftBonusesApplied = nftBonusTransactions.length;
      const pendingNFTBonuses = totalWinners - nftBonusesApplied;

      if (pendingNFTBonuses > 0) {
        marketsWithIssues++;
        totalPendingRewards += pendingNFTBonuses;
      }

      let status = 'complete';
      if (pendingNFTBonuses > 0) {
        status = 'pending';
      } else if (totalWinners === 0) {
        status = 'no_winners';
      }

      overview.push({
        marketId: market.id,
        marketTitle: market.title,
        resolvedAt: market.resolvedAt,
        resolvedOutcome: market.resolvedOutcome,
        resolvedBy: market.resolvedBy,
        totalWinners,
        nftBonusesApplied,
        pendingNFTBonuses,
        status
      });
    }

    const stats = {
      totalMarkets,
      marketsWithIssues,
      marketsComplete: totalMarkets - marketsWithIssues,
      totalPendingRewards,
      periodDays: days,
      generatedAt: new Date().toISOString()
    };

    const recommendations: string[] = [];

    if (marketsWithIssues > 0) {
      recommendations.push(
        `${marketsWithIssues} market(s) have pending NFT rewards that need attention`
      );
      recommendations.push(
        `Run: node scripts/check-missing-nft-rewards.js --fix to automatically resolve issues`
      );
    }

    if (totalPendingRewards > 50) {
      recommendations.push(
        `High number of pending rewards (${totalPendingRewards}). Consider checking the NFT service configuration.`
      );
    }

    const response = {
      stats,
      markets: overview,
      recommendations
    };

    console.log(`📊 [NFT-OVERVIEW] Overview generated: ${totalMarkets} markets, ${marketsWithIssues} with issues`);

    return createSuccessResponse(response);

  } catch (error) {
    console.error('❌ [NFT-OVERVIEW] Overview generation failed:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}