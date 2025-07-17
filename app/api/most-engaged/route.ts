import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const mostEngaged = await prisma.market.findMany({
      where: {
        isResolved: false,
      },
      include: {
        marketStats: true,
      },
      orderBy: [
        { marketStats: { participants: 'desc' } },
        { marketStats: { totalVolume: 'desc' } },
      ],
      take: limit,
    });

    const formattedMarkets = mostEngaged.map((market) => ({
      id: market.id,
      title: market.title,
      description: market.description,
      image: market.imageUrl,
      category: market.category,
      participants: market.marketStats?.participants || 0,
      volume: market.marketStats?.totalVolume || 0,
      currentPrice: market.marketStats?.currentPrice || 0.5,
    }));

    return createSuccessResponse(formattedMarkets);
  } catch (error) {
    console.error('Error fetching most engaged markets:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}