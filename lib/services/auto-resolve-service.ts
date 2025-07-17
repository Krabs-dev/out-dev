import prisma from '../prisma';
import { coingeckoService } from './coingecko-service';
import { resolveParimutuelMarket, applyNFTBonuses } from './parimutuel-service';
import { withDatabaseRetry } from '../db-health';
import { PriceDirection } from '@prisma/client';

export interface AutoResolveResult {
  marketId: string;
  resolved: boolean;
  outcome?: boolean;
  currentPrice?: number;
  targetPrice?: number;
  error?: string;
}

export class AutoResolveService {
  private static instance: AutoResolveService;
  private readonly lockTimeout = 4 * 60 * 1000;
  private readonly instanceId = `vercel_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  public static getInstance(): AutoResolveService {
    if (!AutoResolveService.instance) {
      AutoResolveService.instance = new AutoResolveService();
    }
    return AutoResolveService.instance;
  }

  private async acquireLock(): Promise<boolean> {
    const lockStartTime = Date.now();
    const lockUntil = new Date(Date.now() + this.lockTimeout);
    
    console.log(`🔐 [AUTO-RESOLVE-LOCK] Instance ${this.instanceId} attempting to acquire lock...`);
    
    try {
      try {
        await prisma.autoResolveLock.create({
          data: {
            id: 'auto_resolve_lock',
            isLocked: true,
            lockedAt: new Date(),
            lockedBy: this.instanceId,
            lockedUntil: lockUntil
          }
        });
        
        const lockDuration = Date.now() - lockStartTime;
        console.log(`✅ [AUTO-RESOLVE-LOCK] Lock acquired by creating new record in ${lockDuration}ms`);
        return true;
        
      } catch {
        console.log(`🔄 [AUTO-RESOLVE-LOCK] Lock exists, attempting atomic acquisition...`);
        
        const updateResult = await prisma.autoResolveLock.updateMany({
          where: {
            id: 'auto_resolve_lock',
            OR: [
              { isLocked: false },
              { lockedUntil: { lt: new Date() } }
            ]
          },
          data: {
            isLocked: true,
            lockedAt: new Date(),
            lockedBy: this.instanceId,
            lockedUntil: lockUntil
          }
        });
        
        const lockDuration = Date.now() - lockStartTime;
        
        if (updateResult.count > 0) {
          console.log(`✅ [AUTO-RESOLVE-LOCK] Lock acquired atomically in ${lockDuration}ms`);
          return true;
        } else {
          const currentLock = await prisma.autoResolveLock.findUnique({
            where: { id: 'auto_resolve_lock' }
          });
          
          if (currentLock) {
            const timeRemaining = currentLock.lockedUntil ? 
              Math.max(0, currentLock.lockedUntil.getTime() - Date.now()) : 0;
            
            console.log(`⏳ [AUTO-RESOLVE-LOCK] Lock held by ${currentLock.lockedBy}, ${timeRemaining}ms remaining`);
          }
          
          console.log(`❌ [AUTO-RESOLVE-LOCK] Failed to acquire lock in ${lockDuration}ms`);
          return false;
        }
      }
    } catch (error) {
      const lockDuration = Date.now() - lockStartTime;
      console.error(`💥 [AUTO-RESOLVE-LOCK] Error acquiring lock after ${lockDuration}ms:`, error);
      return false;
    }
  }

  private async releaseLock(): Promise<void> {
    const releaseStartTime = Date.now();
    
    try {
      console.log(`🔓 [AUTO-RESOLVE-LOCK] Instance ${this.instanceId} releasing lock...`);
      
      const updateResult = await prisma.autoResolveLock.updateMany({
        where: {
          id: 'auto_resolve_lock',
          lockedBy: this.instanceId
        },
        data: {
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
          lockedUntil: null
        }
      });
      
      const releaseDuration = Date.now() - releaseStartTime;
      
      if (updateResult.count > 0) {
        console.log(`✅ [AUTO-RESOLVE-LOCK] Lock released successfully in ${releaseDuration}ms`);
      } else {
        console.warn(`⚠️ [AUTO-RESOLVE-LOCK] Lock was not owned by this instance (${releaseDuration}ms)`);
      }
    } catch (error) {
      const releaseDuration = Date.now() - releaseStartTime;
      console.error(`💥 [AUTO-RESOLVE-LOCK] Error releasing lock after ${releaseDuration}ms:`, error);
    }
  }

  async checkAndResolveMarkets(): Promise<AutoResolveResult[]> {
    const startTime = Date.now();
    
    console.log(`🚀 [AUTO-RESOLVE] Instance ${this.instanceId} starting optimized auto-resolve process...`);
    
    // Tenter d'acquérir le verrou global
    const lockAcquired = await this.acquireLock();
    
    if (!lockAcquired) {
      console.log(`⏸️ [AUTO-RESOLVE] Instance ${this.instanceId} skipping - another instance is running auto-resolve`);
      return []; // Retourner un tableau vide, pas d'erreur
    }
    
    try {
        console.log('🔍 [AUTO-RESOLVE] Fetching markets eligible for auto-resolution...');
        console.log('🔍 [AUTO-RESOLVE] Only processing markets closed at least 10 minutes ago to ensure data availability');
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const marketsToCheck = await withDatabaseRetry(() => 
          prisma.market.findMany({
            where: {
              autoResolve: true,
              isResolved: false,
              closeDate: {
                lte: tenMinutesAgo
              },
              coingeckoId: {
                not: null
              },
              targetPrice: {
                not: null
              },
              priceDirection: {
                not: null
              }
            },
            select: {
              id: true,
              title: true,
              coingeckoId: true,
              targetPrice: true,
              priceDirection: true,
              lastCheckedPrice: true,
              closeDate: true
            }
          })
        )

        console.log(`📊 [AUTO-RESOLVE] Found ${marketsToCheck.length} markets to auto-resolve`);
        
        if (marketsToCheck.length === 0) {
          console.log('✅ [AUTO-RESOLVE] No markets to resolve. Process completed.');
          return [];
        }

        const CONCURRENT_LIMIT = 3;
        const results: AutoResolveResult[] = [];
        
        for (let i = 0; i < marketsToCheck.length; i += CONCURRENT_LIMIT) {
          const batch = marketsToCheck.slice(i, i + CONCURRENT_LIMIT);
          console.log(`🔄 [AUTO-RESOLVE] Processing batch ${Math.floor(i/CONCURRENT_LIMIT) + 1}/${Math.ceil(marketsToCheck.length/CONCURRENT_LIMIT)} (${batch.length} markets)`);
          
          const batchResults = await Promise.allSettled(
            batch.map(market => this.checkAndResolveMarket(market))
          );
          
          batchResults.forEach((result, index) => {
            const market = batch[index];
            if (result.status === 'fulfilled') {
              results.push(result.value);
              if (result.value.resolved) {
                console.log(`✅ [AUTO-RESOLVE] Market resolved: ${market.title} -> ${result.value.outcome ? 'YES' : 'NO'}`);
              } else if (result.value.error) {
                console.log(`❌ [AUTO-RESOLVE] Market failed: ${market.title} -> ${result.value.error}`);
              } else {
                console.log(`⏳ [AUTO-RESOLVE] Market not ready: ${market.title}`);
              }
            } else {
              console.error(`💥 [AUTO-RESOLVE] Market processing failed: ${market.title}`, result.reason);
              results.push({
                marketId: market.id,
                resolved: false,
                error: result.reason instanceof Error ? result.reason.message : 'Processing failed'
              });
            }
          });
          
          if (i + CONCURRENT_LIMIT < marketsToCheck.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const duration = Date.now() - startTime;
        const resolvedCount = results.filter(r => r.resolved).length;
        const errorCount = results.filter(r => r.error).length;
        
        console.log(`🎯 [AUTO-RESOLVE] Process completed in ${duration}ms:`);
        console.log(`   - Total markets: ${results.length}`);
        console.log(`   - Resolved: ${resolvedCount}`);
        console.log(`   - Errors: ${errorCount}`);
        console.log(`   - Not ready: ${results.length - resolvedCount - errorCount}`);

        const resolvedMarkets = results.filter(r => r.resolved).map(r => r.marketId);
        if (resolvedMarkets.length > 0) {
          console.log(`🎁 [AUTO-RESOLVE] Starting NFT bonus application for ${resolvedMarkets.length} resolved markets...`);
          
          const elapsedTime = Date.now() - startTime;
          const remainingTime = this.lockTimeout - elapsedTime;
          
          if (remainingTime < 60000) {
            console.warn(`⚠️ [AUTO-RESOLVE] Insufficient time remaining (${remainingTime}ms) for NFT bonus application. Skipping NFT rewards.`);
            console.warn(`💡 [AUTO-RESOLVE] NFT bonuses can be applied manually later or in the next auto-resolve cycle.`);
          } else {
            try {
              console.log(`⏰ [AUTO-RESOLVE] Time remaining for NFT processing: ${remainingTime}ms`);
              await this.applyNFTBonusesForMultipleMarkets(resolvedMarkets);
              console.log(`✅ [AUTO-RESOLVE] NFT bonus application completed successfully for ${resolvedMarkets.length} markets`);
            } catch (error) {
              console.error(`❌ [AUTO-RESOLVE] NFT bonus application failed:`, error);
            }
          }
        }

        return results;
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`💥 [AUTO-RESOLVE] Process failed after ${duration}ms:`, error);
        throw new Error('Failed to check markets for auto-resolution');
    } finally {
        await this.releaseLock();
    }
  }

  private async checkAndResolveMarket(market: {
    id: string;
    title: string;
    coingeckoId: string | null;
    targetPrice: number | null;
    priceDirection: PriceDirection | null;
    lastCheckedPrice: number | null;
    closeDate: Date;
  }): Promise<AutoResolveResult> {
    const marketStartTime = Date.now();
    
    try {
      console.log(`📋 [MARKET-${market.id}] Starting resolution for: ${market.title}`);
      console.log(`📋 [MARKET-${market.id}] Config: CoinGecko=${market.coingeckoId}, Target=${market.targetPrice}, Direction=${market.priceDirection}`);
      
      if (!market.coingeckoId || !market.targetPrice || !market.priceDirection) {
        console.error(`❌ [MARKET-${market.id}] Missing configuration - CoinGecko: ${market.coingeckoId}, Target: ${market.targetPrice}, Direction: ${market.priceDirection}`);
        return {
          marketId: market.id,
          resolved: false,
          error: 'Missing auto-resolve configuration'
        };
      }

      console.log(`💰 [MARKET-${market.id}] Fetching price at close time: ${market.closeDate.toISOString()}`);
      const priceStartTime = Date.now();
      
      console.log(`🔄 [MARKET-${market.id}] Starting withDatabaseRetry for CoinGecko API call...`);
      const priceAtClose = await withDatabaseRetry(
        () => {
          const retryStartTime = Date.now();
          console.log(`🌐 [MARKET-${market.id}] Executing CoinGecko API call (retry)...`);
          return coingeckoService.getCoinPriceAtCloseTime(market.coingeckoId!, market.closeDate)
            .then(price => {
              const retryDuration = Date.now() - retryStartTime;
              console.log(`✅ [MARKET-${market.id}] Retry call completed in ${retryDuration}ms with price: $${price}`);
              return price;
            })
            .catch(error => {
              const retryDuration = Date.now() - retryStartTime;
              console.error(`❌ [MARKET-${market.id}] Retry call failed after ${retryDuration}ms:`, error.message);
              throw error;
            });
        },
        2,
        2000
      );
      
      const priceDuration = Date.now() - priceStartTime;
      console.log(`💰 [MARKET-${market.id}] Final price fetched in ${priceDuration}ms: $${priceAtClose}`);
      
      console.log(`💾 [MARKET-${market.id}] Updating price in database...`);
      const dbUpdateStartTime = Date.now();
      await prisma.market.update({
        where: { id: market.id },
        data: {
          lastCheckedPrice: priceAtClose,
          lastPriceCheckAt: new Date()
        }
      });
      const dbUpdateDuration = Date.now() - dbUpdateStartTime;
      console.log(`💾 [MARKET-${market.id}] Price updated in database in ${dbUpdateDuration}ms`);

      console.log(`🎯 [MARKET-${market.id}] Determining outcome...`);
      console.log(`🎯 [MARKET-${market.id}] Price at close: $${priceAtClose}`);
      console.log(`🎯 [MARKET-${market.id}] Target price: $${market.targetPrice}`);
      console.log(`🎯 [MARKET-${market.id}] Direction: ${market.priceDirection}`);
      
      let outcome: boolean;
      let shouldResolve = false;

      if (market.priceDirection === PriceDirection.ABOVE) {
        outcome = priceAtClose >= market.targetPrice;
        shouldResolve = true;
        console.log(`🎯 [MARKET-${market.id}] ABOVE condition: ${priceAtClose} >= ${market.targetPrice} = ${outcome}`);
      } else if (market.priceDirection === PriceDirection.BELOW) {
        outcome = priceAtClose <= market.targetPrice;
        shouldResolve = true;
        console.log(`🎯 [MARKET-${market.id}] BELOW condition: ${priceAtClose} <= ${market.targetPrice} = ${outcome}`);
      } else {
        console.error(`❌ [MARKET-${market.id}] Invalid price direction: ${market.priceDirection}`);
        return {
          marketId: market.id,
          resolved: false,
          currentPrice: priceAtClose,
          targetPrice: market.targetPrice,
          error: 'Invalid price direction'
        };
      }

      if (shouldResolve) {
        console.log(`🏁 [MARKET-${market.id}] Resolving market with outcome: ${outcome ? 'YES' : 'NO'}`);
        
        console.log(`🏁 [MARKET-${market.id}] Calling resolveParimutuelMarket...`);
        const resolveStartTime = Date.now();
        const resolveResult = await resolveParimutuelMarket(market.id, outcome);
        const resolveDuration = Date.now() - resolveStartTime;
        console.log(`🏁 [MARKET-${market.id}] Parimutuel resolution completed in ${resolveDuration}ms`);
        console.log(`🏁 [MARKET-${market.id}] Resolution stats:`, {
          resolvedBets: resolveResult.resolvedBets,
          winningBets: resolveResult.winningBets,
          losingBets: resolveResult.losingBets,
          totalPayout: resolveResult.totalPayout
        });
        
        console.log(`💾 [MARKET-${market.id}] Updating market status to resolved...`);
        const finalUpdateStartTime = Date.now();
        await prisma.market.update({
          where: { id: market.id },
          data: {
            isResolved: true,
            resolvedOutcome: outcome,
            resolvedBy: 'AUTO_RESOLVE_COINGECKO',
            resolvedAt: new Date(),
            sourceUrl: `https://www.coingecko.com/en/coins/${market.coingeckoId}`
          }
        });
        const finalUpdateDuration = Date.now() - finalUpdateStartTime;
        console.log(`💾 [MARKET-${market.id}] Market status updated to resolved in ${finalUpdateDuration}ms`);


        const totalDuration = Date.now() - marketStartTime;
        console.log(`✅ [MARKET-${market.id}] Auto-resolved successfully in ${totalDuration}ms: ${outcome ? 'YES' : 'NO'} - Price: $${priceAtClose} vs Target: $${market.targetPrice}`);

        return {
          marketId: market.id,
          resolved: true,
          outcome,
          currentPrice: priceAtClose,
          targetPrice: market.targetPrice
        };
      }

      const totalDuration = Date.now() - marketStartTime;
      console.log(`⏳ [MARKET-${market.id}] Market not ready for resolution (processed in ${totalDuration}ms)`);
      
      return {
        marketId: market.id,
        resolved: false,
        currentPrice: priceAtClose,
        targetPrice: market.targetPrice
      };

    } catch (error) {
      const totalDuration = Date.now() - marketStartTime;
      console.error(`💥 [MARKET-${market.id}] Resolution failed after ${totalDuration}ms:`, error);
      
      return {
        marketId: market.id,
        resolved: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validateAutoResolveConfig(
    coingeckoId: string,
    targetPrice: number,
    priceDirection: PriceDirection
  ): Promise<{ isValid: boolean; error?: string; currentPrice?: number }> {
    console.log(`🔍 [VALIDATION] Validating auto-resolve config for ${coingeckoId}`);
    console.log(`🔍 [VALIDATION] Target price: $${targetPrice}, Direction: ${priceDirection}`);
    
    try {
      console.log(`💰 [VALIDATION] Fetching current price for ${coingeckoId}...`);
      const currentPrice = await coingeckoService.getCoinPrice(coingeckoId);
      console.log(`💰 [VALIDATION] Current price fetched: $${currentPrice}`);
      
      if (targetPrice <= 0) {
        console.error(`❌ [VALIDATION] Invalid target price: ${targetPrice}`);
        return { isValid: false, error: 'Target price must be greater than 0' };
      }

      if (!Object.values(PriceDirection).includes(priceDirection)) {
        console.error(`❌ [VALIDATION] Invalid price direction: ${priceDirection}`);
        return { isValid: false, error: 'Invalid price direction' };
      }

      console.log(`✅ [VALIDATION] Configuration is valid for ${coingeckoId}`);
      return { 
        isValid: true, 
        currentPrice 
      };
    } catch (error) {
      console.error(`❌ [VALIDATION] Validation failed for ${coingeckoId}:`, error);
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Failed to validate coin' 
      };
    }
  }

  async getMarketPriceStatus(marketId: string): Promise<{
    currentPrice?: number;
    targetPrice?: number;
    priceDirection?: PriceDirection;
    lastChecked?: Date;
    coingeckoId?: string;
  }> {
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      select: {
        coingeckoId: true,
        targetPrice: true,
        priceDirection: true,
        lastCheckedPrice: true,
        lastPriceCheckAt: true
      }
    });

    if (!market) {
      throw new Error('Market not found');
    }

    return {
      currentPrice: market.lastCheckedPrice || undefined,
      targetPrice: market.targetPrice || undefined,
      priceDirection: market.priceDirection || undefined,
      lastChecked: market.lastPriceCheckAt || undefined,
      coingeckoId: market.coingeckoId || undefined
    };
  }

  private async applyNFTBonusesForMultipleMarkets(marketIds: string[]): Promise<void> {
    const startTime = Date.now();
    console.log(`🎁 [NFT-BATCH] Starting NFT bonus application for ${marketIds.length} markets...`);
    
    try {
      const MARKET_BATCH_SIZE = 2;
      
      for (let i = 0; i < marketIds.length; i += MARKET_BATCH_SIZE) {
        const batch = marketIds.slice(i, i + MARKET_BATCH_SIZE);
        console.log(`🎁 [NFT-BATCH] Processing market batch ${Math.floor(i/MARKET_BATCH_SIZE) + 1}/${Math.ceil(marketIds.length/MARKET_BATCH_SIZE)}`);
        
        const batchResults = await Promise.allSettled(
          batch.map(marketId => applyNFTBonuses(marketId))
        );
        
        batchResults.forEach((result, index) => {
          const marketId = batch[index];
          if (result.status === 'fulfilled') {
            console.log(`✅ [NFT-BATCH] Market ${marketId}: ${result.value.processedUsers} users processed, ${result.value.totalBonusDistributed} bonus points distributed`);
          } else {
            console.error(`❌ [NFT-BATCH] Market ${marketId} failed:`, result.reason);
          }
        });
        
        if (i + MARKET_BATCH_SIZE < marketIds.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`🎁 [NFT-BATCH] Completed NFT bonus application for ${marketIds.length} markets in ${duration}ms`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`💥 [NFT-BATCH] NFT bonus batch processing failed after ${duration}ms:`, error);
    }
  }
}

export const autoResolveService = AutoResolveService.getInstance();