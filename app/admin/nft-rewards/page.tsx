'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface Market {
  id: string;
  title: string;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedOutcome: boolean | null;
}

interface NFTRewardsStatus {
  market: Market;
  stats: {
    totalWinners: number;
    nftBonusesApplied: number;
    pendingNFTBonuses: number;
  };
  winners: Array<{
    userId: string;
    userAddress: string;
    winAmount: number;
    hasNFTBonus: boolean;
  }>;
}

export default function NFTRewardsPage() {
  const [marketId, setMarketId] = useState('');
  const [status, setStatus] = useState<NFTRewardsStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const checkNFTRewards = async () => {
    if (!marketId.trim()) {
      toast.error('Please enter a market ID');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/nft-rewards/retry?marketId=${marketId}`);
      const data = await response.json();

      if (response.ok) {
        setStatus(data.data);
        toast.success('NFT rewards status loaded');
      } else {
        toast.error(data.message || 'Failed to check NFT rewards');
        setStatus(null);
      }
    } catch {
      toast.error('Failed to check NFT rewards');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const retryNFTRewards = async () => {
    if (!marketId.trim()) {
      toast.error('Please enter a market ID');
      return;
    }

    setRetrying(true);
    try {
      const response = await fetch('/api/admin/nft-rewards/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ marketId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`NFT rewards applied: ${data.data.summary.totalProcessedUsers} users, ${data.data.summary.totalBonusDistributed} points`);
        
        await checkNFTRewards();
      } else {
        toast.error(data.message || 'Failed to retry NFT rewards');
      }
    } catch {
      toast.error('Failed to retry NFT rewards');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">NFT Rewards Management</h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Check NFT Rewards Status</h2>
          
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="Enter Market ID"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            />
            <button
              onClick={checkNFTRewards}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Checking...' : 'Check Status'}
            </button>
          </div>

          {status && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Status for: {status.market.title}</h3>
                <button
                  onClick={retryNFTRewards}
                  disabled={retrying || status.stats.pendingNFTBonuses === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {retrying ? 'Retrying...' : 'Retry NFT Rewards'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Winners</div>
                  <div className="text-2xl font-bold text-blue-900">{status.stats.totalWinners}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">NFT Bonuses Applied</div>
                  <div className="text-2xl font-bold text-green-900">{status.stats.nftBonusesApplied}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">Pending NFT Bonuses</div>
                  <div className="text-2xl font-bold text-yellow-900">{status.stats.pendingNFTBonuses}</div>
                </div>
              </div>

              {status.stats.pendingNFTBonuses > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-yellow-800 mb-2">⚠️ Pending NFT Rewards Found</h4>
                  <p className="text-yellow-700 text-sm">
                    {status.stats.pendingNFTBonuses} winner(s) haven&apos;t received their NFT bonus yet. 
                    Click &quot;Retry NFT Rewards&quot; to process them.
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Winners Details</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Win Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">NFT Bonus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {status.winners.map((winner, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm font-mono text-gray-900">
                            {winner.userAddress.slice(0, 6)}...{winner.userAddress.slice(-4)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{winner.winAmount.toLocaleString()} points</td>
                          <td className="px-4 py-2 text-sm">
                            {winner.hasNFTBonus ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✅ Applied
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                ⏳ Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Use</h2>
            <div className="space-y-3 text-sm text-gray-700">
            <div>
              <strong>1. Check Status:</strong> Enter a market ID to see NFT rewards status for that market.
            </div>
            <div>
              <strong>2. Retry Rewards:</strong> If there are pending NFT bonuses, click &quot;Retry NFT Rewards&quot; to process them.
            </div>
            <div>
              <strong>3. Bulk Operations:</strong> For multiple markets, use the scripts:
              <div className="mt-2 bg-gray-100 p-3 rounded font-mono text-xs">
                # Check all markets for missing NFT rewards<br/>
                node scripts/check-missing-nft-rewards.js<br/><br/>
                # Check and auto-fix issues<br/>
                node scripts/check-missing-nft-rewards.js --fix
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}