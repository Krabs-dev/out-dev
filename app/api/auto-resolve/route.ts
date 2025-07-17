import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, createCustomErrorResponse, API_ERRORS } from '@/lib/api-response';
import { autoResolveService } from '@/lib/services/auto-resolve-service';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const triggeredBy = request.headers.get('x-triggered-by') || 'unknown';
    const isInternalCall = triggeredBy === 'markets-page';
    
    console.log(`🚀 [AUTO-RESOLVE-API] Starting auto-resolve process (triggered by: ${triggeredBy}, internal: ${isInternalCall})...`);
    
    if (!isInternalCall) {
      const { requireAdmin } = await import('@/lib/api-middleware');
      await requireAdmin();
    }

    const results = await autoResolveService.checkAndResolveMarkets();
    
    const duration = Date.now() - startTime;
    const resolvedCount = results.filter(r => r.resolved).length;
    const errorCount = results.filter(r => r.error).length;
    
    console.log(`🎯 [AUTO-RESOLVE-API] Process completed in ${duration}ms - Resolved: ${resolvedCount}, Errors: ${errorCount} (triggered by: ${triggeredBy})`);
    
    return createSuccessResponse({
      message: 'Auto-resolve process completed successfully',
      executionTime: duration,
      totalChecked: results.length,
      resolved: resolvedCount,
      errors: errorCount,
      results: results,
      triggeredBy: triggeredBy,
      isInternalCall: isInternalCall,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 [AUTO-RESOLVE-API] Process failed after ${duration}ms:`, error);
    
    return createCustomErrorResponse(
      error instanceof Error ? error.message : 'Auto-resolve process failed',
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return GET(request);
    
  } catch (error) {
    console.error('Error in manual auto-resolve trigger:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}