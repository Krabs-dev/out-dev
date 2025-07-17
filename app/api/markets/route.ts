import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { MarketCategory } from '@prisma/client';
import { parsePaginationParams } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { 
  buildMarketOrderBy, 
  sortMarketsByControversy, 
  sortMarketsByEndingTime,
  formatMarketResponse 
} from '@/lib/services/market-service';
import { MarketResponse } from '@/lib/api-types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as MarketCategory | null;
    const sort = searchParams.get('sort') || 'Most Popular';
    const { limit, offset } = parsePaginationParams(request);

    triggerBackgroundAutoResolve().catch(error => {
      console.warn('Background auto-resolve trigger failed (non-blocking):', error.message);
    });

    const whereClause = {
      isResolved: false,
      ...(category && { category }),
    };

    const orderBy = buildMarketOrderBy(sort);
    const needsSpecialSorting = ['Most Controversial', 'Ending Soon'].includes(sort);

    let markets = await prisma.market.findMany({
      where: whereClause,
      include: {
        marketStats: true,
        _count: {
          select: { parimutuelBets: true }
        }
      },
      orderBy: needsSpecialSorting ? undefined : orderBy,
      take: needsSpecialSorting ? undefined : limit,
      skip: needsSpecialSorting ? undefined : offset,
    });

    if (sort === 'Most Controversial') {
      markets = sortMarketsByControversy(markets).slice(offset, offset + limit);
    }

    if (sort === 'Ending Soon') {
      markets = sortMarketsByEndingTime(markets).slice(offset, offset + limit);
    }

    const formattedMarkets: MarketResponse[] = markets.map(formatMarketResponse);

    return createSuccessResponse(formattedMarkets);
  } catch (error) {
    console.error('Error fetching markets:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}

async function triggerBackgroundAutoResolve(): Promise<void> {
  try {
    const lock = await prisma.autoResolveLock.findUnique({
      where: { id: 'auto_resolve_lock' }
    });

    const now = new Date();
    const shouldTrigger = !lock?.lastBackgroundRun || 
                         (now.getTime() - lock.lastBackgroundRun.getTime()) >= (lock?.backgroundInterval || 300000);

    if (!shouldTrigger) {
      return;
    }

    console.log('🚀 [BACKGROUND-TRIGGER] Triggering auto-resolve in background...');

    await prisma.autoResolveLock.upsert({
      where: { id: 'auto_resolve_lock' },
      create: {
        id: 'auto_resolve_lock',
        lastBackgroundRun: now,
        backgroundInterval: 300000
      },
      update: {
        lastBackgroundRun: now
      }
    });

    fetch(new URL('/api/auto-resolve', process.env.NEXTAUTH_URL || 'http://localhost:3000'), {
      method: 'GET',
      headers: {
        'User-Agent': 'Background-AutoResolve-Trigger/1.0',
        'X-Triggered-By': 'markets-page'
      }
    }).catch(error => {
      console.error('🔥 [BACKGROUND-TRIGGER] Auto-resolve call failed:', error.message);
    });

    console.log('✅ [BACKGROUND-TRIGGER] Auto-resolve triggered successfully');

  } catch (error) {
    console.error('💥 [BACKGROUND-TRIGGER] Failed to trigger background auto-resolve:', error);
    throw error;
  }
}

