import { NextResponse } from 'next/server';
import { ApiResponse, ApiError } from './api-types';

export function createSuccessResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message
  });
}

export function createErrorResponse(error: ApiError): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error: error.message
  }, { status: error.status });
}

export const API_ERRORS = {
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Authentication required', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'Insufficient permissions', status: 403 },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found', status: 404 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Invalid input parameters', status: 400 },
  INSUFFICIENT_BALANCE: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance', status: 400 },
  MARKET_CLOSED: { code: 'MARKET_CLOSED', message: 'Market is closed', status: 400 },
  DAILY_CLAIM_COOLDOWN: { code: 'DAILY_CLAIM_COOLDOWN', message: 'Must wait 24 hours between claims', status: 400 },
  BETA_ACCESS_DENIED: { code: 'BETA_ACCESS_DENIED', message: 'Beta access restricted', status: 403 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'Internal server error', status: 500 }
} as const;

export function createCustomErrorResponse(message: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error: message
  }, { status });
}