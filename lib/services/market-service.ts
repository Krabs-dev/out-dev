import prisma from '../prisma';
import { MarketCategory } from '@prisma/client';
import { APP_CONFIG } from '../config';
import { MarketResponse } from '../api-types';

export interface MarketFilters {
  category?: MarketCategory | null;
  sort: string;
  limit: number;
  offset: number;
}

export function buildMarketOrderBy(sort: string) {
  switch (sort) {
    case 'Most Popular':
      return [
        { marketStats: { totalVolume: 'desc' as const } },
        { marketStats: { participants: 'desc' as const } }
      ];
    case 'Newest':
      return { createdAt: 'desc' as const };
    case 'Ending Soon':
      return { closeDate: 'asc' as const };
    case 'Highest Volume':
      return { marketStats: { totalVolume: 'desc' as const } };
    case 'Most Participants':
      return { marketStats: { participants: 'desc' as const } };
    case 'Most Controversial':
      return { marketStats: { currentPrice: 'asc' as const } };
    default:
      return { marketStats: { totalVolume: 'desc' as const } };
  }
}

export function sortMarketsByControversy<T extends { marketStats?: { currentPrice?: number } | null }>(markets: T[]): T[] {
  return markets
    .filter(market => market.marketStats)
    .sort((a, b) => {
      const aDistance = Math.abs(0.5 - (a.marketStats?.currentPrice || 0.5));
      const bDistance = Math.abs(0.5 - (b.marketStats?.currentPrice || 0.5));
      return aDistance - bDistance;
    });
}

export function sortMarketsByEndingTime<T extends { closeDate: Date }>(markets: T[]): T[] {
  const now = new Date();
  return markets.sort((a, b) => {
    const aIsClosed = new Date(a.closeDate) <= now;
    const bIsClosed = new Date(b.closeDate) <= now;
    
    if (aIsClosed && !bIsClosed) return 1;
    if (!aIsClosed && bIsClosed) return -1;
    
    return new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime();
  });
}

export function formatMarketResponse(market: { id: string; title: string; description: string; imageUrl: string | null; sourceUrl: string | null; category: string; closeDate: Date; maxBetAmount: number; marketStats?: { totalVolume?: number; currentPrice?: number; participants?: number; yesPool?: number; noPool?: number } | null; _count: { parimutuelBets: number }; createdAt: Date }): MarketResponse {
  return {
    id: market.id,
    title: market.title,
    description: market.description,
    image: market.imageUrl || '',
    sourceUrl: market.sourceUrl || undefined,
    category: market.category,
    closeDate: market.closeDate,
    maxBetAmount: market.maxBetAmount,
    volume: market.marketStats?.totalVolume || 0,
    currentPrice: market.marketStats?.currentPrice || 0.5,
    participants: market.marketStats?.participants || 0,
    totalBets: market._count.parimutuelBets,
    yesPool: market.marketStats?.yesPool || 0,
    noPool: market.marketStats?.noPool || 0,
    createdAt: market.createdAt,
  };
}

export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'Closed';
  
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

export async function findMarketWithStats(marketId: string) {
  return await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      marketStats: true,
    },
  });
}

export async function getMarketTrends(marketId: string) {
  return await prisma.marketTrend.findMany({
    where: { marketId },
    orderBy: { timestamp: 'desc' },
    take: APP_CONFIG.MARKET.TREND_HOURS,
  });
}