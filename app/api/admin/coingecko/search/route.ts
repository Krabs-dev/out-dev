import { NextRequest } from 'next/server';
import { requireAuthWithUserId } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { isAdminDB } from '@/lib/admin-config';
import { coingeckoService } from '@/lib/services/coingecko-service';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthWithUserId();
    
    if (!(await isAdminDB(session.user.address))) {
      return createErrorResponse(API_ERRORS.FORBIDDEN);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return createSuccessResponse([]);
    }

    const coins = await coingeckoService.searchCoins(query, 10);
    
    return createSuccessResponse(coins);
  } catch (error) {
    console.error('Error searching coins:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}