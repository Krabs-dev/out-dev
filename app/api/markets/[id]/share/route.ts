import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuthWithUserId } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { nanoid } from 'nanoid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;
    const session = await requireAuthWithUserId();
    const userId = session.user.id;

    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

    if (market.isResolved) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Cannot share a resolved market'
      });
    }

    const existingReferral = await prisma.betReferral.findFirst({
      where: {
        referrerId: userId,
        marketId: marketId,
      },
    });

    if (existingReferral) {
      const shareUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/markets?ref=${existingReferral.shareCode}`;
      
      return createSuccessResponse({
        shareCode: existingReferral.shareCode,
        shareUrl,
        createdAt: existingReferral.createdAt,
        usageCount: existingReferral.usageCount,
        totalCommission: existingReferral.totalCommission,
      });
    }

    const shareCode = nanoid(10);

    const referral = await prisma.betReferral.create({
      data: {
        referrerId: userId,
        marketId,
        shareCode,
      },
    });

    const shareUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/markets?ref=${shareCode}`;

    return createSuccessResponse({
      shareCode,
      shareUrl,
      createdAt: referral.createdAt,
      usageCount: 0,
      totalCommission: 0,
    });

  } catch (error) {
    console.error('Share generation error:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}