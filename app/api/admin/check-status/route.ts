import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { isAdminDB } from '@/lib/admin-config';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';

export async function GET() {
  try {
    console.log('🔍 Admin check-status API called');
    
    const session = await getServerSession(authOptions);
    console.log('📋 Session:', session?.address ? `Address: ${session.address}` : 'No session');
    
    if (!session?.address) {
      console.log('❌ No session address');
      return createErrorResponse(API_ERRORS.UNAUTHORIZED);
    }

    console.log('🔍 Checking admin status for:', session.address);
    const isAdmin = await isAdminDB(session.address);
    console.log('📊 Admin check result:', isAdmin);
    
    if (!isAdmin) {
      console.log('❌ User is not admin');
      return createErrorResponse({
        ...API_ERRORS.UNAUTHORIZED,
        message: 'Admin access required',
        status: 403
      });
    }

    console.log('✅ User is admin, returning success');
    return createSuccessResponse({
      isAdmin: true,
      address: session.address
    });

  } catch (error) {
    console.error('Error checking admin status:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}