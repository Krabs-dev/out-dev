import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { autoResolveService } from '@/lib/services/auto-resolve-service';
import { coingeckoService } from '@/lib/services/coingecko-service';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { marketId } = body;

    if (!marketId) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Market ID is required'
      });
    }

    const priceStatus = await autoResolveService.getMarketPriceStatus(marketId);
    
    let currentPrice = null;
    if (priceStatus.coingeckoId) {
      try {
        currentPrice = await coingeckoService.getCoinPrice(priceStatus.coingeckoId);
      } catch (error) {
        console.error('Error fetching current price:', error);
      }
    }

    return createSuccessResponse({
      marketId,
      priceStatus,
      currentPrice,
      message: 'Price status retrieved successfully'
    });

  } catch (error) {
    console.error('Error testing auto-resolve:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}

export async function GET() {
  try {
    await requireAdmin();

    const results = await autoResolveService.checkAndResolveMarkets();
    
    const resolvedCount = results.filter(r => r.resolved).length;
    const errorCount = results.filter(r => r.error).length;
    
    return createSuccessResponse({
      message: 'Manual auto-resolution check completed',
      totalChecked: results.length,
      resolved: resolvedCount,
      errors: errorCount,
      results: results
    });

  } catch (error) {
    console.error('Error in manual auto-resolve check:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}