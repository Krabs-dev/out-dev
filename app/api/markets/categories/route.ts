import { createSuccessResponse, createErrorResponse, API_ERRORS } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const categoryCounts = await prisma.market.groupBy({
      by: ['category'],
      where: {
        isResolved: false,
      },
      _count: {
        id: true,
      },
    });

    const total = await prisma.market.count({
      where: {
        isResolved: false,
      },
    });

    const formattedCounts = [
      { category: 'All', count: total },
      ...categoryCounts.map(item => ({
        category: item.category,
        count: item._count.id,
      })),
    ];

    return createSuccessResponse(formattedCounts);
  } catch (error) {
    console.error('Error fetching category counts:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR);
  }
}