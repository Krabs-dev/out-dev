import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');

    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    const trends = await prisma.marketTrend.findMany({
      where: {
        marketId: id,
        timestamp: {
          gte: startTime,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    return createSuccessResponse(trends);
  } catch (error) {
    console.error('Error fetching market trends:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}