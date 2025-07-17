import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-middleware';

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalAutoResolveMarkets,
      autoResolvedMarkets,
      pendingAutoResolveMarkets,
      failedAutoResolveMarkets,
      recentAutoResolvedMarkets
    ] = await Promise.all([
      prisma.market.count({
        where: {
          autoResolve: true
        }
      }),

      prisma.market.count({
        where: {
          autoResolve: true,
          isResolved: true,
          resolvedBy: 'AUTO_RESOLVE_COINGECKO'
        }
      }),

      prisma.market.count({
        where: {
          autoResolve: true,
          isResolved: false,
          closeDate: {
            lte: new Date()
          }
        }
      }),

      prisma.market.count({
        where: {
          autoResolve: true,
          isResolved: false,
          closeDate: {
            lte: new Date(Date.now() - 60 * 60 * 1000)
          }
        }
      }),

      prisma.market.findMany({
        where: {
          autoResolve: true,
          isResolved: true,
          resolvedBy: 'AUTO_RESOLVE_COINGECKO',
          resolvedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          title: true,
          resolvedAt: true,
          resolvedOutcome: true,
          lastCheckedPrice: true,
          targetPrice: true,
          priceDirection: true,
          coingeckoId: true,
          sourceUrl: true
        },
        orderBy: {
          resolvedAt: 'desc'
        },
        take: 10
      })
    ]);

    const cryptoStats = await prisma.market.groupBy({
      by: ['coingeckoId'],
      where: {
        autoResolve: true,
        coingeckoId: {
          not: null
        }
      },
      _count: {
        _all: true
      }
    });

    const cryptoStatsWithNames = cryptoStats.map((stat) => {
      return {
        coingeckoId: stat.coingeckoId,
        totalMarkets: stat._count?._all || 0,
        totalVolume: 0,
      };
    });

    const successRate = totalAutoResolveMarkets > 0 
      ? (autoResolvedMarkets / totalAutoResolveMarkets) * 100 
      : 0;

    const stats = {
      overview: {
        totalAutoResolveMarkets,
        autoResolvedMarkets,
        pendingAutoResolveMarkets,
        failedAutoResolveMarkets,
        successRate: Math.round(successRate * 100) / 100
      },
      recentActivity: recentAutoResolvedMarkets,
      cryptoBreakdown: cryptoStatsWithNames.sort((a, b) => b.totalMarkets - a.totalMarkets),
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching auto-resolve stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auto-resolve statistics' },
      { status: 500 }
    );
  }
}