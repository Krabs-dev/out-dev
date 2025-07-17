import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth-config';
import { isAuthenticated } from './auth';
import { isAdminDB } from './admin-config';
import { API_ERRORS, createErrorResponse } from './api-response';
import { PaginationParams, ApiError } from './api-types';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!isAuthenticated(session)) {
    throw API_ERRORS.UNAUTHORIZED;
  }
  
  return session;
}

export async function requireAuthWithUserId() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw API_ERRORS.UNAUTHORIZED;
  }
  
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  
  if (!(await isAdminDB(session.address))) {
    throw {
      ...API_ERRORS.UNAUTHORIZED,
      message: 'Admin access required',
      status: 403
    };
  }
  
  return session;
}

export function parsePaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
  
  return { limit, offset };
}

export function validateRequired(value: unknown, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw {
      ...API_ERRORS.VALIDATION_ERROR,
      message: `${fieldName} is required`
    };
  }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (isNaN(value) || value <= 0) {
    throw {
      ...API_ERRORS.VALIDATION_ERROR,
      message: `${fieldName} must be a positive number`
    };
  }
}

export function validateBoolean(value: unknown, fieldName: string): void {
  if (typeof value !== 'boolean') {
    throw {
      ...API_ERRORS.VALIDATION_ERROR,
      message: `${fieldName} must be a boolean`
    };
  }
}

export async function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<T> {
  try {
    return await handler();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && 'message' in error && 'status' in error) {
      throw createErrorResponse(error as ApiError);
    }
    
    console.error('Unhandled API error:', error);
    throw createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}