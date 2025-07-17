import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

interface EditMarketRequest {
  imageUrl?: string;
  description?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    
    const { id: marketId } = await params;
    const body: EditMarketRequest = await request.json();
    const { imageUrl, description } = body;

    if (imageUrl === undefined && description === undefined) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'At least one field (imageUrl or description) must be provided'
      });
    }

    const existingMarket = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!existingMarket) {
      return createErrorResponse(API_ERRORS.NOT_FOUND);
    }

    const updateData: { imageUrl?: string | null; description?: string } = {};
    
    if (imageUrl !== undefined) {
      if (imageUrl && imageUrl.trim() !== '') {
        try {
          new URL(imageUrl);
        } catch {
          return createErrorResponse({
            ...API_ERRORS.VALIDATION_ERROR,
            message: 'Invalid image URL format'
          });
        }
      }
      updateData.imageUrl = imageUrl.trim() || null;
    }
    
    if (description !== undefined) {
      if (description.trim().length < 10) {
        return createErrorResponse({
          ...API_ERRORS.VALIDATION_ERROR,
          message: 'Description must be at least 10 characters long'
        });
      }
      if (description.trim().length > 1000) {
        return createErrorResponse({
          ...API_ERRORS.VALIDATION_ERROR,
          message: 'Description must be less than 1000 characters'
        });
      }
      updateData.description = description.trim();
    }

    const updatedMarket = await prisma.market.update({
      where: { id: marketId },
      data: updateData,
      include: {
        marketStats: true,
      },
    });

    return createSuccessResponse({
      id: updatedMarket.id,
      title: updatedMarket.title,
      description: updatedMarket.description,
      imageUrl: updatedMarket.imageUrl,
      category: updatedMarket.category,
      closeDate: updatedMarket.closeDate,
      isResolved: updatedMarket.isResolved,
      maxBetAmount: updatedMarket.maxBetAmount,
      totalVolume: updatedMarket.marketStats?.totalVolume || 0,
      participants: updatedMarket.marketStats?.participants || 0,
      updatedAt: updatedMarket.updatedAt,
    });

  } catch (error) {
    console.error('Error editing market:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}