import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { requireAdmin } from '@/lib/api-middleware';
import { AdminService } from '@/lib/admin-config';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const session = await requireAdmin();
    const params = await context.params;
    const { address } = params;
    
    if (address.toLowerCase() === session.address.toLowerCase()) {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Cannot remove yourself as admin'
      });
    }
    
    await AdminService.removeAdmin(address);
    
    return createSuccessResponse({
      message: 'Admin removed successfully'
    });
  } catch (error) {
    console.error('Error removing admin:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    await requireAdmin();
    const params = await context.params;
    const { address } = params;
    const { action } = await request.json();
    
    if (action === 'reactivate') {
      await AdminService.reactivateAdmin(address);
      return createSuccessResponse({
        message: 'Admin reactivated successfully'
      });
    }
    
    return createErrorResponse({
      ...API_ERRORS.VALIDATION_ERROR,
      message: 'Invalid action'
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}