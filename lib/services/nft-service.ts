import { APP_CONFIG } from '../config';

export interface NFTOwnership {
  collection: string;
  name: string;
  multiplier: number;
  hasNFTs: boolean;
  tokenCount?: number;
}

export interface UserNFTData {
  address: string;
  collections: NFTOwnership[];
  totalMultiplier: number;
  lastChecked: Date;
}

const nftCache = new Map<string, { data: UserNFTData; expiry: number }>();


export async function checkNFTOwnership(userAddress: string): Promise<UserNFTData> {
  const cacheKey = userAddress.toLowerCase();
  const cached = nftCache.get(cacheKey);
  
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const collections = await Promise.allSettled(
    Object.entries(APP_CONFIG.NFT.COLLECTIONS).map(async ([key, config]) => {
      try {
        const hasNFTs = await Promise.race([
          checkSingleCollection(userAddress, config.address, config.method),
          new Promise<number>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout after 5s')), 5000)
          )
        ]);
        
        return {
          collection: key,
          name: config.name,
          multiplier: config.multiplier,
          hasNFTs: hasNFTs > 0,
          tokenCount: hasNFTs
        };
      } catch (error) {
        console.warn(`Failed to check NFT collection ${config.name} (${config.address}):`, error instanceof Error ? error.message : error);
        
        if (config.method === 'tokensOfOwner') {
          try {
            const hasNFTs = await Promise.race([
              checkSingleCollection(userAddress, config.address, 'balanceOf'),
              new Promise<number>((_, reject) => 
                setTimeout(() => reject(new Error('Fallback timeout after 3s')), 3000)
              )
            ]);
            
            return {
              collection: key,
              name: config.name,
              multiplier: config.multiplier,
              hasNFTs: hasNFTs > 0,
              tokenCount: hasNFTs
            };
          } catch (fallbackError) {
            console.warn(`Fallback also failed for ${config.name}:`, fallbackError instanceof Error ? fallbackError.message : fallbackError);
          }
        }
        
        return {
          collection: key,
          name: config.name,
          multiplier: config.multiplier,
          hasNFTs: false,
          tokenCount: 0
        };
      }
    })
  );

  const validCollections = collections.map((result, index) => {
    const [key, config] = Object.entries(APP_CONFIG.NFT.COLLECTIONS)[index];
    
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`Collection ${config.name} check failed completely:`, result.reason);
      return {
        collection: key,
        name: config.name,
        multiplier: config.multiplier,
        hasNFTs: false,
        tokenCount: 0
      };
    }
  });

  const totalMultiplier = validCollections
    .filter(c => c.hasNFTs)
    .reduce((acc, c) => acc * c.multiplier, 1);

  const userData: UserNFTData = {
    address: userAddress,
    collections: validCollections,
    totalMultiplier,
    lastChecked: new Date()
  };

  const expiryTime = Date.now() + (APP_CONFIG.NFT.CACHE_DURATION_MINUTES * 60 * 1000);
  nftCache.set(cacheKey, { data: userData, expiry: expiryTime });

  return userData;
}

async function checkSingleCollection(
  userAddress: string, 
  contractAddress: string, 
  method: string
): Promise<number> {
  const rpcUrl = APP_CONFIG.NFT.RPC_URL;
  
  let callData: string;
  if (method === 'tokensOfOwner') {
    callData = `0x8462151c${userAddress.slice(2).padStart(64, '0')}`;
  } else if (method === 'balanceOf') {
    callData = `0x70a08231${userAddress.slice(2).padStart(64, '0')}`;
  } else {
    throw new Error(`Unsupported method: ${method}`);
  }

  const requestBody = {
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [
      {
        to: contractAddress,
        data: callData
      },
      'latest'
    ],
    id: 1
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);
  
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      console.error(`RPC error for ${contractAddress}:`, result.error);
      throw new Error(`RPC error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    if (!result.result || result.result === '0x') {
      return 0;
    }

    if (method === 'balanceOf') {
      const balance = parseInt(result.result, 16);
      return balance;
    } else {
      const data = result.result.slice(2);
      
      if (data.length < 128) { // Need at least 128 chars for offset + length
        return 0;
      }
      
      const arrayLength = parseInt(data.slice(64, 128), 16);
      
      if (arrayLength > 1000) {
        console.warn(`Suspicious array length ${arrayLength} for ${contractAddress}, might be invalid data`);
        return 0;
      }
      
      return arrayLength;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`RPC call timeout after 4s for ${contractAddress}`);
    }
    throw error;
  }
}

export function calculateNFTMultipliedPayout(
  basePayout: number,
  nftData: UserNFTData
): number {
  if (nftData.totalMultiplier <= 1) {
    return basePayout;
  }

  return Math.floor(basePayout * nftData.totalMultiplier);
}

export function getOwnedCollections(nftData: UserNFTData): NFTOwnership[] {
  return nftData.collections.filter(c => c.hasNFTs);
}

export function clearNFTCache(userAddress?: string): void {
  if (userAddress) {
    nftCache.delete(userAddress.toLowerCase());
  } else {
    nftCache.clear();
  }
}

export interface BetaAccessValidation {
  hasAccess: boolean;
  reason?: string;
  oilyTokens?: number;
  whitelistTokenIds?: number[];
}

export async function validateBetaAccess(userAddress: string): Promise<BetaAccessValidation> {
  if (!APP_CONFIG.BETA_RESTRICTION.ENABLED) {
    return { hasAccess: true };
  }

  try {
    const nftData = await checkNFTOwnership(userAddress);
    const oilyCollection = nftData.collections.find(c => c.collection === 'OILY');
    
    if (!oilyCollection || !oilyCollection.hasNFTs) {
      return {
        hasAccess: false,
        reason: 'Beta access requires owning at least 10 Oily NFTs or Legendary Oily',
        oilyTokens: 0
      };
    }

    const oilyTokenCount = oilyCollection.tokenCount || 0;
    
    if (oilyTokenCount >= APP_CONFIG.BETA_RESTRICTION.OILY_MIN_TOKENS) {
      return {
        hasAccess: true,
        oilyTokens: oilyTokenCount
      };
    }

    const ownedTokenIds = await getOilyTokenIds(userAddress);
    const whitelistMatches = ownedTokenIds.filter(tokenId => 
      (APP_CONFIG.BETA_RESTRICTION.WHITELIST_TOKEN_IDS as readonly number[]).includes(tokenId)
    );

    if (whitelistMatches.length > 0) {
      return {
        hasAccess: true,
        oilyTokens: oilyTokenCount,
        whitelistTokenIds: whitelistMatches
      };
    }

    return {
      hasAccess: false,
      reason: `Beta access requires owning at least ${APP_CONFIG.BETA_RESTRICTION.OILY_MIN_TOKENS} Oily NFTs or Legendary Oily. You have ${oilyTokenCount} Oily NFTs.`,
      oilyTokens: oilyTokenCount
    };

  } catch (error) {
    console.error('Error validating beta access:', error);
    return {
      hasAccess: false,
      reason: 'Unable to verify NFT ownership. Please try again later.'
    };
  }
}

async function getOilyTokenIds(userAddress: string): Promise<number[]> {
  const oilyConfig = APP_CONFIG.NFT.COLLECTIONS.OILY;
  const rpcUrl = APP_CONFIG.NFT.RPC_URL;
  
  const callData = `0x8462151c${userAddress.slice(2).padStart(64, '0')}`;
  
  const requestBody = {
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [
      {
        to: oilyConfig.address,
        data: callData
      },
      'latest'
    ],
    id: 1
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`RPC call failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error || !result.result || result.result === '0x') {
      return [];
    }

    const data = result.result.slice(2);
    
    if (data.length < 128) {
      return [];
    }
    
    const arrayLength = parseInt(data.slice(64, 128), 16);
    
    if (arrayLength === 0 || arrayLength > 1000) {
      return [];
    }
    
    const tokenIds: number[] = [];
    for (let i = 0; i < arrayLength; i++) {
      const tokenIdHex = data.slice(128 + (i * 64), 128 + ((i + 1) * 64));
      const tokenId = parseInt(tokenIdHex, 16);
      tokenIds.push(tokenId);
    }
    
    return tokenIds;
    
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Error fetching Oily token IDs:', error);
    return [];
  }
}