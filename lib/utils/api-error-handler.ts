import { NextResponse } from 'next/server';
import { createErrorResponse, API_ERRORS } from '@/lib/api-response';

export const handleApiError = (error: unknown, context: string) => {
  console.error(`Error ${context}:`, error);
  return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
};

export const withErrorHandler = <T extends unknown[], R>(
  handler: (...args: T) => Promise<R>,
  context: string
) => {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
};

export const safeApiHandler = async <T>(
  handler: () => Promise<T>,
  context: string
): Promise<T | NextResponse> => {
  try {
    return await handler();
  } catch (error) {
    return handleApiError(error, context);
  }
};

export const executeWithErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error ${errorContext}:`, error);
    throw error;
  }
};