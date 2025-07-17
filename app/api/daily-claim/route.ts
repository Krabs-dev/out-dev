import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';
import { validateDailyClaimSecurity, logSecurityEvent } from '@/lib/security';
import { isAuthenticated } from '@/lib/auth';
import { APP_CONFIG } from '@/lib/config';
import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import { validateBetaAccess } from '@/lib/services/nft-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isAuthenticated(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userAddress = session.address;
    const now = new Date();
    
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const betaValidation = await validateBetaAccess(userAddress);
    if (!betaValidation.hasAccess) {
      return NextResponse.json(
        { 
          error: 'Beta access required',
          message: betaValidation.reason || 'Beta access required'
        },
        { status: 403 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { address: userAddress },
      include: {
        userPoints: true
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address: userAddress,
          userPoints: {
            create: {
              balance: 0,
              totalEarned: 0,
              totalSpent: 0
            }
          }
        },
        include: {
          userPoints: true
        }
      });
    }

    const lastClaim = await prisma.dailyClaim.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (lastClaim) {
      const timeSinceLastClaim = now.getTime() - lastClaim.createdAt.getTime();
      const twentyFourHours = APP_CONFIG.DAILY_CLAIM.COOLDOWN_HOURS * 60 * 60 * 1000;
      
      if (timeSinceLastClaim < twentyFourHours) {
        await logSecurityEvent(user.id, 'PREMATURE_CLAIM_ATTEMPT', {
          address: userAddress,
          lastClaimAt: lastClaim.createdAt.toISOString(),
          timeSinceLastClaim,
          requiredWait: twentyFourHours
        });
        
        const timeLeft = twentyFourHours - timeSinceLastClaim;
        return NextResponse.json(
          { 
            error: 'Must wait 24 hours between claims',
            timeLeft,
            canClaimAt: new Date(lastClaim.createdAt.getTime() + twentyFourHours).toISOString()
          },
          { status: 400 }
        );
      }
    }

    const securityCheck = await validateDailyClaimSecurity(user.id, userAddress);
    if (!securityCheck.isValid) {
      await logSecurityEvent(user.id, 'CLAIM_SECURITY_VIOLATION', {
        address: userAddress,
        reason: securityCheck.reason,
        ip: clientIP
      });
      
      return NextResponse.json(
        { error: 'Security check failed' },
        { status: 403 }
      );
    }

    const baseAmount = APP_CONFIG.DAILY_CLAIM.BASE_AMOUNT;
    const totalAmount = baseAmount;

    await prisma.$transaction(async (tx) => {
      const claim = await tx.dailyClaim.create({
        data: {
          userId: user!.id,
          claimDate: now,
          baseAmount,
          totalAmount,
          ipAddress: clientIP,
          userAgent
        }
      });

      if (!user!.userPoints) {
        await tx.userPoints.create({
          data: {
            userId: user!.id,
            balance: totalAmount,
            totalEarned: totalAmount,
            totalSpent: 0
          }
        });
      } else {
        await tx.userPoints.update({
          where: { userId: user!.id },
          data: {
            balance: { increment: totalAmount },
            totalEarned: { increment: totalAmount }
          }
        });
      }

      await tx.pointsTransaction.create({
        data: {
          userId: user!.id,
          type: 'DAILY_CLAIM',
          amount: baseAmount,
          description: 'Daily claim reward',
          metadata: {
            claimId: claim.id,
            ip: clientIP
          }
        }
      });

      return claim;
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userPoints: true
      }
    });

    const response = {
      claim: {
        baseAmount,
        totalAmount
      },
      userPoints: updatedUser?.userPoints
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Daily claim error:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!isAuthenticated(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const betaValidation = await validateBetaAccess(session.address);
    if (!betaValidation.hasAccess) {
      return NextResponse.json(
        { 
          error: 'Beta access required',
          message: betaValidation.reason || 'Beta access required'
        },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { address: session.address },
      include: {
        userPoints: true
      }
    });

    if (!user) {
      return NextResponse.json({
        canClaim: true,
        nextClaimIn: 0,
        userPoints: null
      });
    }

    const lastClaim = await prisma.dailyClaim.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    let canClaim = true;
    let nextClaimIn = 0;

    if (lastClaim) {
      const now = new Date();
      const timeSinceLastClaim = now.getTime() - lastClaim.createdAt.getTime();
      const twentyFourHours = APP_CONFIG.DAILY_CLAIM.COOLDOWN_HOURS * 60 * 60 * 1000;
      
      if (timeSinceLastClaim < twentyFourHours) {
        canClaim = false;
        nextClaimIn = twentyFourHours - timeSinceLastClaim;
      }
    }

    const response = {
      canClaim,
      nextClaimIn,
      userPoints: user.userPoints
    };

    return createSuccessResponse(response);

  } catch (error) {
    console.error('Daily claim status error:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}