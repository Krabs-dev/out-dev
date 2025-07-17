import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip authentication for GET requests on public endpoints
  const isPublicRead = request.method === 'GET' && (
    pathname.startsWith('/api/markets') && !pathname.includes('/bet-parimutuel') ||
    pathname === '/api/leaderboard' ||
    pathname === '/api/biggest-wins' ||
    pathname === '/api/most-engaged'
  );

  if (isPublicRead) {
    return NextResponse.next();
  }

  // Get authentication token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Check if authentication is required
  const requiresAuth = 
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/api/user') ||
    pathname.includes('/bet-parimutuel') ||
    pathname === '/api/daily-claim' ||
    pathname === '/api/points';

  if (requiresAuth && !token?.address) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check admin access for admin routes - defer to API route handlers
  // Admin verification is now handled in each API route using requireAdmin()
  // This avoids Prisma issues in Edge Runtime middleware

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/api/user/:path*',
    '/api/markets/:path*/bet-parimutuel',
    '/api/daily-claim',
    '/api/points',
    '/api/markets/:path*',
    '/api/leaderboard',
    '/api/biggest-wins',
    '/api/most-engaged'
  ]
};