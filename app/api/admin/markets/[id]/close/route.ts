import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: marketId } = await params;

    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

    if (market.isResolved) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Cannot close a resolved market'
      });
    }

    if (new Date() >= market.closeDate) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Market is already closed'
      });
    }

    const updatedMarket = await prisma.market.update({
      where: { id: marketId },
      data: {
        closeDate: new Date(),
      },
    });

    return createSuccessResponse({
      success: true,
      market: {
        id: updatedMarket.id,
        title: updatedMarket.title,
        closeDate: updatedMarket.closeDate,
        isResolved: updatedMarket.isResolved,
      },
    });

  } catch (error) {
    console.error('Error closing market:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}