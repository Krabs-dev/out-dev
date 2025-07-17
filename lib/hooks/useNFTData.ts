import { useState, useEffect, useCallback } from 'react';
import { UserNFTData, checkNFTOwnership } from '@/lib/services/nft-service';

export function useNFTData(address: string | undefined) {
  const [nftData, setNftData] = useState<UserNFTData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTData = useCallback(async () => {
    if (!address) {
      setNftData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await checkNFTOwnership(address);
      setNftData(data);
    } catch (err) {
      console.error('Error fetching NFT data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch NFT data');
      setNftData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchNFTData();
  }, [fetchNFTData]);

  return {
    nftData,
    isLoading,
    error,
    refetch: fetchNFTData
  };
}