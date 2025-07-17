import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { MarketCategory, PriceDirection } from '@prisma/client';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { autoResolveService } from '@/lib/services/auto-resolve-service';

interface CreateMarketRequest {
  title: string;
  description: string;
  category: MarketCategory;
  closeDate: string;
  maxBetAmount?: number;
  imageUrl?: string;
  sourceUrl?: string;
  autoResolve?: boolean;
  coingeckoId?: string;
  targetPrice?: number;
  priceDirection?: PriceDirection;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body: CreateMarketRequest = await request.json();
    const { 
      title, 
      description, 
      category, 
      closeDate, 
      maxBetAmount = 50000, 
      imageUrl, 
      sourceUrl,
      autoResolve = false,
      coingeckoId,
      targetPrice,
      priceDirection
    } = body;

    if (!title || !description || !category || !closeDate) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Title, description, category, and closeDate are required'
      });
    }

    const parsedCloseDate = new Date(closeDate);
    if (isNaN(parsedCloseDate.getTime()) || parsedCloseDate <= new Date()) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Close date must be a valid future date'
      });
    }

    if (!Object.values(MarketCategory).includes(category)) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Invalid category'
      });
    }

    if (maxBetAmount < 1000 || maxBetAmount > 500000) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Max bet amount must be between 1,000 and 500,000 points'
      });
    }

    if (autoResolve) {
      if (!coingeckoId || !targetPrice || !priceDirection) {
        return createErrorResponse({
          ...API_ERRORS.VALIDATION_ERROR,
          message: 'CoinGecko ID, target price, and price direction are required for auto-resolve'
        });
      }

      if (targetPrice <= 0) {
        return createErrorResponse({
          ...API_ERRORS.VALIDATION_ERROR,
          message: 'Target price must be greater than 0'
        });
      }

      if (!Object.values(PriceDirection).includes(priceDirection)) {
        return createErrorResponse({
          ...API_ERRORS.VALIDATION_ERROR,
          message: 'Invalid price direction'
        });
      }

      const validation = await autoResolveService.validateAutoResolveConfig(
        coingeckoId,
        targetPrice,
        priceDirection
      );

      if (!validation.isValid) {
        return createErrorResponse({
          ...API_ERRORS.VALIDATION_ERROR,
          message: validation.error || 'Invalid auto-resolve configuration'
        });
      }
    }

    const market = await prisma.market.create({
      data: {
        title,
        description,
        category,
        closeDate: parsedCloseDate,
        maxBetAmount,
        imageUrl: imageUrl || null,
        sourceUrl: sourceUrl || null,
        autoResolve,
        coingeckoId: autoResolve ? coingeckoId : null,
        targetPrice: autoResolve ? targetPrice : null,
        priceDirection: autoResolve ? priceDirection : null,
      },
      include: {
        marketStats: true,
      },
    });

    return createSuccessResponse({
      id: market.id,
      title: market.title,
      description: market.description,
      category: market.category,
      closeDate: market.closeDate,
      maxBetAmount: market.maxBetAmount,
      imageUrl: market.imageUrl,
      sourceUrl: market.sourceUrl,
      autoResolve: market.autoResolve,
      coingeckoId: market.coingeckoId,
      targetPrice: market.targetPrice,
      priceDirection: market.priceDirection,
      createdAt: market.createdAt,
    });

  } catch (error) {
    console.error('Error creating market:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('includeResolved') === 'true';
    const category = searchParams.get('category') as MarketCategory | null;

    const whereClause = {
      ...(category && { category }),
      ...(includeResolved ? {} : { isResolved: false }),
    };

    const markets = await prisma.market.findMany({
      where: whereClause,
      include: {
        marketStats: true,
        _count: {
          select: { parimutuelBets: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedMarkets = markets.map(market => ({
      id: market.id,
      title: market.title,
      description: market.description,
      category: market.category,
      closeDate: market.closeDate,
      resolveDate: market.resolveDate,
      isResolved: market.isResolved,
      resolvedOutcome: market.resolvedOutcome,
      resolvedBy: market.resolvedBy,
      resolvedAt: market.resolvedAt,
      maxBetAmount: market.maxBetAmount,
      totalVolume: market.marketStats?.totalVolume || 0,
      currentPrice: Math.round((market.marketStats?.currentPrice || 0.5) * 100),
      participants: market.marketStats?.participants || 0,
      totalBets: market._count.parimutuelBets,
      createdAt: market.createdAt,
      imageUrl: market.imageUrl,
      sourceUrl: market.sourceUrl,
    }));

    return createSuccessResponse(formattedMarkets);

  } catch (error) {
    console.error('Error fetching admin markets:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}