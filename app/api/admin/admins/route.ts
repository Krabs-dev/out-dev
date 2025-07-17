import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { requireAdmin } from '@/lib/api-middleware';
import { AdminService } from '@/lib/admin-config';

export async function GET() {
  try {
    await requireAdmin();
    
    const admins = await AdminService.getAllAdmins();
    
    return createSuccessResponse(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { address } = await request.json();
    
    if (!address || typeof address !== 'string') {
      return createErrorResponse({
        ...API_ERRORS.VALIDATION_ERROR,
        message: 'Valid address is required'
      });
    }
    
    
    const newAdmin = await AdminService.addAdmin(address, session.address);
    
    return createSuccessResponse({
      admin: newAdmin,
      message: 'Admin configured successfully'
    });
  } catch (error) {
    console.error('Error adding admin:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('already an active admin')) {
        return createErrorResponse({
          ...API_ERRORS.VALIDATION_ERROR,
          message: error.message
        });
      }
    }
    
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}