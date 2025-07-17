import prisma from './prisma';

export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean;
  error?: string;
  latency?: number;
}> {
  const startTime = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    const latency = Date.now() - startTime;
    
    return {
      isHealthy: true,
      latency
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return {
      isHealthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
      latency: Date.now() - startTime
    };
  }
}

export async function testDatabaseConnection(retries = 3, delay = 1000): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const health = await checkDatabaseHealth();
      
      if (health.isHealthy) {
        console.log(`Database connection successful on attempt ${i + 1}, latency: ${health.latency}ms`);
        return true;
      }
      
      console.warn(`Database connection failed on attempt ${i + 1}: ${health.error}`);
      
      if (i < retries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return false;
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
        if (lastError.message.includes('UNIQUE constraint') || 
          lastError.message.includes('FOREIGN KEY constraint')) {
        throw lastError;
      }
      
      console.warn(`Operation failed on attempt ${attempt}/${maxRetries}:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}