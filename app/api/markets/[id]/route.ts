import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { findMarketWithStats, getMarketTrends, formatTimeRemaining } from '@/lib/services/market-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const market = await findMarketWithStats(id);
    if (!market) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

    const trends = await getMarketTrends(id);
    const timeRemaining = market.closeDate.getTime() - Date.now();
    const timeRemainingFormatted = formatTimeRemaining(timeRemaining);

    const formattedMarket = {
      id: market.id,
      title: market.title,
      description: market.description,
      image: market.imageUrl,
      category: market.category,
      closeDate: market.closeDate,
      resolveDate: market.resolveDate,
      isResolved: market.isResolved,
      resolvedOutcome: market.resolvedOutcome,
      maxBetAmount: market.maxBetAmount,
      timeRemaining: timeRemainingFormatted,
      volume: market.marketStats?.totalVolume || 0,
      yesPool: market.marketStats?.yesPool || 0,
      noPool: market.marketStats?.noPool || 0,
      totalPool: market.marketStats?.totalPool || 0,
      currentPrice: market.marketStats?.currentPrice || 0.5,
      participants: market.marketStats?.participants || 0,
      trends: trends.reverse(),
      createdAt: market.createdAt,
      updatedAt: market.updatedAt,
    };

    return createSuccessResponse(formattedMarket);
  } catch (error) {
    console.error('Error fetching market:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}