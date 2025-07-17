import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getUserBadges, calculateAndAssignBadges } from '@/lib/services/badge-service';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return createErrorResponse({
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
        status: 401
      });
    }

    const badges = await getUserBadges(session.user.id);
    
    return createSuccessResponse({
      badges,
      total: badges.length
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch badges',
      status: 500
    });
  }
}

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
    const { action } = body;

    if (action === 'recalculate') {
      const newBadges = await calculateAndAssignBadges(session.user.id);
      const allBadges = await getUserBadges(session.user.id);
      
      return createSuccessResponse({
        badges: allBadges,
        newBadges,
        total: allBadges.length
      });
    }

    return createErrorResponse({
      code: 'INVALID_ACTION',
      message: 'Invalid action',
      status: 400
    });
  } catch (error) {
    console.error('Error processing badges action:', error);
    return createErrorResponse({
      code: 'INTERNAL_ERROR',
      message: 'Failed to process action',
      status: 500
    });
  }
}