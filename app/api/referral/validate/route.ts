import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareCode = searchParams.get('code');

    if (!shareCode) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Share code is required'
      });
    }

    const referral = await prisma.betReferral.findUnique({
      where: { shareCode },
      include: {
        market: {
          select: {
            id: true,
            title: true,
            isResolved: true,
            closeDate: true,
          }
        },
        referrer: {
          select: {
            address: true,
          }
        }
      },
    });

    if (!referral) {
      return createErrorResponse({
        ...API_ERRORS.NOT_FOUND,
        message: 'Invalid share code'
      });
    }

    if (referral.market.isResolved) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'This market has already been resolved'
      });
    }

    if (new Date() >= referral.market.closeDate) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'This market is closed for betting'
      });
    }

    return createSuccessResponse({
      isValid: true,
      marketId: referral.market.id,
      marketTitle: referral.market.title,
      referrerAddress: referral.referrer.address,
      shareCode,
    });

  } catch (error) {
    console.error('Referral validation error:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}