import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { APP_CONFIG } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - APP_CONFIG.WINS.TIMEFRAME_DAYS);

    const biggestWins = await prisma.winRecord.findMany({
      where: {
        createdAt: {
          gte: oneWeekAgo,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            address: true,
          },
        },
      },
      orderBy: { winAmount: 'desc' },
      take: limit,
    });

    const formattedWins = biggestWins.map((win) => ({
      id: win.id,
      userId: win.userId,
      userAddress: win.user.address,
      marketId: win.marketId,
      winAmount: win.winAmount,
      betAmount: win.betAmount,
      multiplier: win.winAmount / win.betAmount,
      createdAt: win.createdAt,
    }));

    return createSuccessResponse(formattedWins);
  } catch (error) {
    console.error('Error fetching biggest wins:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}