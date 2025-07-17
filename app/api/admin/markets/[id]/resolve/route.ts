import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { resolveParimutuelMarket, applyNFTBonuses } from '@/lib/services/parimutuel-service';

interface ResolveMarketRequest {
  outcome: boolean;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id: marketId } = await params;

    const body: ResolveMarketRequest = await request.json();
    const { outcome } = body;

    if (typeof outcome !== 'boolean') {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Outcome must be a boolean (true for YES wins, false for NO wins)'
      });
    }

    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return createErrorResponse({
        ...API_ERRORS.NOT_FOUND,
        message: 'Market not found'
      });
    }

    if (market.isResolved) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: `Market is already resolved with outcome: ${market.resolvedOutcome ? 'YES' : 'NO'} at ${market.resolvedAt?.toISOString()} by ${market.resolvedBy || 'AUTO_RESOLVE'}`
      });
    }

    console.log(`👨‍💼 [ADMIN-RESOLVE] Admin ${session.address} resolving market ${marketId} with outcome: ${outcome ? 'YES' : 'NO'}`);
    
    try {
      const result = await resolveParimutuelMarket(marketId, outcome);
      
      await prisma.market.update({
        where: { 
          id: marketId,
          isResolved: true
        },
        data: {
          resolvedBy: session.address,
        },
      });
      
      console.log(`✅ [ADMIN-RESOLVE] Market ${marketId} successfully resolved by admin ${session.address}`);
      
      applyNFTBonuses(marketId).catch(error => {
        console.error(`Background NFT bonus application failed for market ${marketId}:`, error);
      });

      return createSuccessResponse({
        success: true,
        market: {
          id: marketId,
          title: market.title,
          isResolved: true,
          resolvedOutcome: outcome,
          resolvedBy: session.address,
        },
        distribution: {
          resolvedBets: result.resolvedBets,
          totalPayout: result.totalPayout,
          winningBets: result.winningBets,
          losingBets: result.losingBets,
        },
        message: "Market resolved successfully. NFT bonuses are being applied in the background.",
      });
      
    } catch (error) {
      console.error(`❌ [ADMIN-RESOLVE] Failed to resolve market ${marketId} by admin ${session.address}:`, error);
      
      if (error instanceof Error && error.message.includes('already resolved')) {
        return createErrorResponse({
          ...API_ERRORS.VALIDATION_ERROR,
          message: 'Market was resolved by another process while this request was being processed. Please refresh and try again.'
        });
      }
      
      throw error;
    }

  } catch (error) {
    console.error('Error resolving market:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}