import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { setActiveBadge, removeActiveBadge } from '@/lib/services/badge-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return createErrorResponse({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        status: 401
      });
    }

    const body = await request.json();
    const { badgeId } = body;

    if (!badgeId) {
      await removeActiveBadge(session.user.id);
      
      return createSuccessResponse({
        message: 'Active badge removed successfully'
      });
    }

    await setActiveBadge(session.user.id, badgeId);
    
    return createSuccessResponse({
      message: 'Active badge set successfully',
      activeBadgeId: badgeId
    });
  } catch (error) {
    console.error('Error setting active badge:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return createErrorResponse({
        code: 'NOT_FOUND',
        message: 'Badge not found or unauthorized',
        status: 404
      });
    }
    
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to set active badge',
      status: 500
    });
  }
}