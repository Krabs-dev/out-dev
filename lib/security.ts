import { headers } from 'next/headers';
import prisma from '@/lib/prisma';

export interface SecurityCheck {
  isValid: boolean;
  reason?: string;
}

export async function validateDailyClaimSecurity(
  userId: string,
  userAddress: string
): Promise<SecurityCheck> {
  try {
    const headersList = await headers();
    const clientIP = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown';

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const claimsFromIP = await prisma.dailyClaim.findMany({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo
        },
        ipAddress: clientIP,
        NOT: {
          userId: userId
        }
      }
    });

    if (claimsFromIP.length >= 3) {
      return {
        isValid: false,
        reason: 'Too many claims from this IP address in the last 24 hours'
      };
    }

    const recentClaims = await prisma.dailyClaim.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (recentClaims.length >= 2) {
      const timeDiffs = recentClaims.slice(0, -1).map((claim, index) => {
        const nextClaim = recentClaims[index + 1];
        return new Date(claim.createdAt).getTime() - new Date(nextClaim.createdAt).getTime();
      });

      const suspiciousTimings = timeDiffs.filter(diff => diff < 60 * 1000);
      if (suspiciousTimings.length >= 2) {
        return {
          isValid: false,
          reason: 'Suspicious timing pattern detected'
        };
      }
    }

    if (recentClaims.length > 0) {
      const differentIPs = new Set(recentClaims.map(claim => claim.ipAddress));
      const differentUAs = new Set(recentClaims.map(claim => claim.userAgent));

      if (differentIPs.size > 5 || differentUAs.size > 3) {
        await logSecurityEvent(userId, 'POTENTIAL_ACCOUNT_SHARING', {
          ipCount: differentIPs.size,
          uaCount: differentUAs.size,
          address: userAddress
        });
      }
    }

    return { isValid: true };

  } catch (error) {
    console.error('Security validation error:', error);
    return { isValid: true };
  }
}

export async function logSecurityEvent(
  userId: string,
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Security Event [${eventType}]:`, {
        userId,
        timestamp: new Date().toISOString(),
        ...details
      });
    }
    
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

export function sanitizeUserInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .replace(/['"]/g, '')
    .trim()
    .slice(0, 1000);
}

export async function validatePointsBalance(
  userId: string,
  requiredPoints: number
): Promise<SecurityCheck> {
  try {
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId }
    });

    if (!userPoints || userPoints.balance < requiredPoints) {
      return {
        isValid: false,
        reason: 'Insufficient points balance'
      };
    }

    return { isValid: true };

  } catch (error) {
    console.error('Points validation error:', error);
    return {
      isValid: false,
      reason: 'Balance validation failed'
    };
  }
}