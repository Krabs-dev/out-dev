export interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
}

export interface CoinGeckoPrice {
  id: string;
  current_price: number;
  last_updated: string;
}

export interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
    last_updated_at: number;
  };
}

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

export class CoinGeckoService {
  private static instance: CoinGeckoService;
  private readonly apiKey: string | undefined;
  
  constructor() {
    this.apiKey = process.env.COINGECKO_API_KEY;
    
    if (this.apiKey) {
      console.log('Using CoinGecko Pro API key');
    } else {
      console.warn('No CoinGecko API key found. Using public API (rate limited)');
    }
  }
  
  public static getInstance(): CoinGeckoService {
    if (!CoinGeckoService.instance) {
      CoinGeckoService.instance = new CoinGeckoService();
    }
    return CoinGeckoService.instance;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'accept': 'application/json'
    };
    
    if (this.apiKey) {
      headers['x-cg-demo-api-key'] = this.apiKey;
    }
    
    return headers;
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> {
    let lastError: Error;
    const fetchStartTime = Date.now();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      try {
        console.log(`🌐 [COINGECKO] API call (attempt ${attempt}/${maxRetries}): ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`⏰ [COINGECKO] Timeout after 10s for attempt ${attempt}/${maxRetries}: ${url}`);
          controller.abort();
        }, 10000);
        
        const fetchTime = Date.now();
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.getHeaders(),
            ...options.headers
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const fetchDuration = Date.now() - fetchTime;
        const attemptDuration = Date.now() - attemptStartTime;
        
        console.log(`📡 [COINGECKO] Fetch completed in ${fetchDuration}ms (attempt ${attempt} total: ${attemptDuration}ms)`);
        
        if (response.ok) {
          const totalDuration = Date.now() - fetchStartTime;
          console.log(`✅ [COINGECKO] Request successful after ${totalDuration}ms (${attempt} attempts)`);
          return response;
        }
        
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
          
          console.warn(`⚠️ [COINGECKO] HTTP ${response.status} on attempt ${attempt}/${maxRetries}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        const errorText = await response.text().catch(() => 'No response body');
        console.error(`❌ [COINGECKO] HTTP ${response.status} ${response.statusText} for URL: ${url}`);
        console.error(`❌ [COINGECKO] Response body:`, errorText);
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
        
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime;
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        console.error(`💥 [COINGECKO] Error on attempt ${attempt}/${maxRetries} after ${attemptDuration}ms:`, lastError.message);
        
        if (error instanceof TypeError && error.message.includes('fetch failed')) {
          console.warn(`🌐 [COINGECKO] Network error detected:`, error.message);
          
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`🔄 [COINGECKO] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        if (lastError.name === 'AbortError') {
          console.error(`⏰ [COINGECKO] Request aborted after timeout on attempt ${attempt}/${maxRetries}`);
          if (attempt < maxRetries) {
            console.log(`🔄 [COINGECKO] Retrying aborted request...`);
            continue;
          }
        }
        
        const totalDuration = Date.now() - fetchStartTime;
        console.error(`💥 [COINGECKO] Final error after ${totalDuration}ms (${attempt} attempts):`, lastError.message);
        throw lastError;
      }
    }
    
    const totalDuration = Date.now() - fetchStartTime;
    console.error(`💥 [COINGECKO] All ${maxRetries} attempts failed after ${totalDuration}ms`);
    throw lastError!;
  }

  async getAllCoins(): Promise<CoinGeckoCoin[]> {
    try {
      const response = await this.fetchWithRetry(`${COINGECKO_BASE_URL}/coins/list`, {
        next: { revalidate: 300 }
      });

      const coins: CoinGeckoCoin[] = await response.json();
      return coins.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching coins from CoinGecko:', error);
      throw new Error('Failed to fetch coin list from CoinGecko');
    }
  }

  async getCoinPrice(coinId: string): Promise<number> {
    try {
      const response = await this.fetchWithRetry(
        `${COINGECKO_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=usd&include_last_updated_at=true`
      );

      const data: CoinGeckoPriceResponse = await response.json();
      
      if (!data[coinId]) {
        throw new Error(`Coin ${coinId} not found in CoinGecko response`);
      }

      return data[coinId].usd;
    } catch (error) {
      console.error(`Error fetching price for ${coinId}:`, error);
      throw new Error(`Failed to fetch price for ${coinId}`);
    }
  }


  async searchCoins(query: string, limit: number = 10): Promise<CoinGeckoCoin[]> {
    try {
      const allCoins = await this.getAllCoins();
      const lowerQuery = query.toLowerCase();
      
      const matchingCoins = allCoins
        .filter(coin => 
          coin.name.toLowerCase().includes(lowerQuery) || 
          coin.symbol.toLowerCase().includes(lowerQuery) ||
          coin.id.toLowerCase().includes(lowerQuery)
        );

      const sortedResults = matchingCoins.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const aSymbol = a.symbol.toLowerCase();
        const aId = a.id.toLowerCase();
        const bName = b.name.toLowerCase();
        const bSymbol = b.symbol.toLowerCase();
        const bId = b.id.toLowerCase();

        const aExactMatch = aName === lowerQuery || aSymbol === lowerQuery || aId === lowerQuery;
        const bExactMatch = bName === lowerQuery || bSymbol === lowerQuery || bId === lowerQuery;
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        const aNameMatch = aName === lowerQuery;
        const bNameMatch = bName === lowerQuery;
        const aSymbolMatch = aSymbol === lowerQuery;
        const bSymbolMatch = bSymbol === lowerQuery;
        const aIdMatch = aId === lowerQuery;
        const bIdMatch = bId === lowerQuery;

        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        if (aSymbolMatch && !bSymbolMatch) return -1;
        if (!aSymbolMatch && bSymbolMatch) return 1;
        if (aIdMatch && !bIdMatch) return -1;
        if (!aIdMatch && bIdMatch) return 1;

        const aNameStarts = aName.startsWith(lowerQuery);
        const bNameStarts = bName.startsWith(lowerQuery);
        const aSymbolStarts = aSymbol.startsWith(lowerQuery);
        const bSymbolStarts = bSymbol.startsWith(lowerQuery);

        if (aNameStarts && !bNameStarts) return -1;
        if (!aNameStarts && bNameStarts) return 1;
        if (aSymbolStarts && !bSymbolStarts) return -1;
        if (!aSymbolStarts && bSymbolStarts) return 1;

        return aName.localeCompare(bName);
      });

      return sortedResults.slice(0, limit);
    } catch (error) {
      console.error('Error searching coins:', error);
      throw new Error('Failed to search coins');
    }
  }

  async getCoinPriceAtCloseTime(coinId: string, closeDate: Date): Promise<number> {
    const functionStartTime = Date.now();
    console.log(`📈 [COINGECKO] Starting getCoinPriceAtCloseTime for ${coinId} at ${closeDate.toISOString()}`);
    
    const windowMs = 10 * 60 * 1000;
    const fromTimestamp = Math.floor((closeDate.getTime() - windowMs) / 1000);
    const toTimestamp = Math.floor((closeDate.getTime() + windowMs) / 1000);
    
    const fromDate = new Date(fromTimestamp * 1000);
    const toDate = new Date(toTimestamp * 1000);
    console.log(`📅 [COINGECKO] Query range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
    console.log(`🔢 [COINGECKO] Timestamps: from=${fromTimestamp}, to=${toTimestamp}`);

    const apiCallStartTime = Date.now();
    const response = await this.fetchWithRetry(
      `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`
    );
    const apiCallDuration = Date.now() - apiCallStartTime;
    console.log(`📡 [COINGECKO] API call completed in ${apiCallDuration}ms`);

    const parseStartTime = Date.now();
    const data = await response.json();
    const parseDuration = Date.now() - parseStartTime;
    console.log(`📊 [COINGECKO] JSON parsing completed in ${parseDuration}ms`);
    console.log(`📊 [COINGECKO] Response data points: ${data.prices?.length || 0}`);
    
    if (!data.prices || data.prices.length === 0) {
      const functionDuration = Date.now() - functionStartTime;
      console.error(`❌ [COINGECKO] No price data found after ${functionDuration}ms`);
      throw new Error(`No price data found for ${coinId} around ${closeDate.toISOString()}`);
    }

    const processingStartTime = Date.now();
    const targetTime = closeDate.getTime();
    let closestPrice = data.prices[0];
    let minDiff = Math.abs(data.prices[0][0] - targetTime);

    for (const [timestamp, price] of data.prices) {
      const diff = Math.abs(timestamp - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestPrice = [timestamp, price];
      }
    }
    const processingDuration = Date.now() - processingStartTime;
    console.log(`🔍 [COINGECKO] Price processing completed in ${processingDuration}ms`);

    const actualTime = new Date(closestPrice[0]);
    const diffMinutes = minDiff / (1000 * 60);
    const functionDuration = Date.now() - functionStartTime;
    
    console.log(`💰 [COINGECKO] Price found for ${coinId} (total: ${functionDuration}ms):`);
    console.log(`   - Target time: ${closeDate.toISOString()}`);
    console.log(`   - Actual time: ${actualTime.toISOString()}`);
    console.log(`   - Difference: ${diffMinutes.toFixed(1)} minutes`);
    console.log(`   - Price: $${closestPrice[1]}`);

    return closestPrice[1];
  }

  async getCoinHistoricalPriceDaily(coinId: string, date: Date): Promise<number> {
    try {
      const formattedDate = date.toLocaleDateString('en-GB');
      
      const response = await this.fetchWithRetry(
        `${COINGECKO_BASE_URL}/coins/${coinId}/history?date=${formattedDate}`
      );


      const data = await response.json();
      
      if (!data.market_data?.current_price?.usd) {
        throw new Error(`No USD price found in historical data for ${coinId}`);
      }

      console.log(`Historical daily price for ${coinId} on ${formattedDate}: $${data.market_data.current_price.usd}`);
      return data.market_data.current_price.usd;

    } catch (error) {
      console.error(`Error fetching historical daily price for ${coinId}:`, error);
      throw new Error(`Failed to fetch historical price for ${coinId} on ${date.toDateString()}`);
    }
  }
}

export const coingeckoService = CoinGeckoService.getInstance();