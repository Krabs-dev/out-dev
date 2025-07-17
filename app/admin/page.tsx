'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MarketCategory, PriceDirection } from '@prisma/client';
import { formatDateTime } from '@/lib/utils/format';

interface AdminMarket {
  id: string;
  title: string;
  description: string;
  category: string;
  closeDate: string;
  resolveDate?: string;
  isResolved: boolean;
  resolvedOutcome?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  maxBetAmount: number;
  totalVolume: number;
  yesPercentage: number;
  participants: number;
  totalBets: number;
  createdAt: string;
  imageUrl?: string;
}

interface UserBetWithPayout {
  userId: string;
  userAddress: string;
  outcome: boolean;
  pointsWagered: number;
  potentialPayout: number;
  profit: number;
}

interface UserActualPayout {
  userId: string;
  userAddress: string;
  outcome: boolean;
  pointsWagered: number;
  actualPayout: number;
  profit: number;
  nftBonus?: number;
  nftMultiplier?: number;
  isWinner: boolean;
}

interface ActualResolutionData {
  outcome: boolean;
  resolvedAt: string;
  resolvedBy: string;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  totalPool: number;
  winningPool: number;
  losingPool: number;
  totalBasePayout: number;
  totalNFTBonus: number;
  totalActualPayout: number;
  userPayouts: UserActualPayout[];
}

interface ResolutionPreview {
  outcome: boolean;
  totalBets: number;
  winningBets: number;
  losingBets: number;
  totalPool: number;
  winningPool: number;
  losingPool: number;
  totalPayout: number;
  userPayouts: UserBetWithPayout[];
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isAdmin: isAdminUser, loading: adminLoading, error: adminError } = useAdminAuth();
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [previewData, setPreviewData] = useState<{[marketId: string]: {yesPreview: ResolutionPreview, noPreview: ResolutionPreview}} | null>(null);
  const [actualPayoutData, setActualPayoutData] = useState<{[marketId: string]: ActualResolutionData} | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [showActualPayouts, setShowActualPayouts] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [loadingActualPayouts, setLoadingActualPayouts] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'payout' | 'bet' | 'profit'>('payout');
  const [showOnlyTopN, setShowOnlyTopN] = useState<number | null>(null);
  
  const [editingMarket, setEditingMarket] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    imageUrl: ''
  });

  const [newMarket, setNewMarket] = useState({
    title: '',
    description: '',
    category: MarketCategory.OTHER as MarketCategory,
    closeDate: '',
    maxBetAmount: 50000,
    imageUrl: '',
    sourceUrl: '',
    autoResolve: false,
    coingeckoId: '',
    targetPrice: '',
    priceDirection: PriceDirection.ABOVE as PriceDirection,
  });

  const [coinSearchQuery, setCoinSearchQuery] = useState('');
  const [coinSearchResults, setCoinSearchResults] = useState<Array<{id: string, symbol: string, name: string}>>([]);
  const [loadingCoins, setLoadingCoins] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<{id: string, symbol: string, name: string} | null>(null);

  const [admins, setAdmins] = useState<Array<{id: string, address: string, createdAt: string, createdBy: string | null, isActive: boolean}>>([]);
  const [showAdminSection, setShowAdminSection] = useState(false);
  const [newAdminAddress, setNewAdminAddress] = useState('');

  const [showAutoResolveStats, setShowAutoResolveStats] = useState(false);
  const [autoResolveStats, setAutoResolveStats] = useState<{
    overview: {
      totalAutoResolveMarkets: number;
      autoResolvedMarkets: number;
      pendingAutoResolveMarkets: number;
      failedAutoResolveMarkets: number;
      successRate: number;
    };
    recentActivity: Array<{
      id: string;
      title: string;
      resolvedAt: string;
      resolvedOutcome: boolean;
      lastCheckedPrice: number;
      targetPrice: number;
      priceDirection: string;
      sourceUrl?: string;
    }>;
    cryptoBreakdown: Array<{
      coingeckoId: string;
      totalMarkets: number;
      totalVolume: number;
    }>;
    lastUpdated: string;
  } | null>(null);
  const [loadingAutoResolveStats, setLoadingAutoResolveStats] = useState(false);

  const fetchMarkets = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/markets?includeResolved=${includeResolved}`);
      if (response.ok) {
        const data = await response.json();
        setMarkets(data.data);
      } else {
        toast.error('Failed to fetch markets');
      }
    } catch {
      toast.error('Error fetching markets');
    } finally {
      setLoading(false);
    }
  }, [includeResolved]);

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/admins');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.data);
      } else {
        toast.error('Failed to fetch admins');
      }
    } catch {
      toast.error('Error fetching admins');
    }
  }, []);

  const searchCoins = async (query: string) => {
    if (query.length < 2) {
      setCoinSearchResults([]);
      return;
    }

    setLoadingCoins(true);
    try {
      const response = await fetch(`/api/admin/coingecko/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setCoinSearchResults(data.data);
      } else {
        toast.error('Failed to search coins');
      }
    } catch {
      toast.error('Error searching coins');
    } finally {
      setLoadingCoins(false);
    }
  };

  const selectCoin = (coin: {id: string, symbol: string, name: string}) => {
    setSelectedCoin(coin);
    setNewMarket({ ...newMarket, coingeckoId: coin.id });
    setCoinSearchQuery(`${coin.name} (${coin.symbol.toUpperCase()})`);
    setCoinSearchResults([]);
  };

  useEffect(() => {
    if (status === 'loading' || adminLoading) return;

    if (!session?.address || !isAdminUser) {
      router.push('/');
      return;
    }

    fetchMarkets();
    fetchAdmins();
  }, [fetchMarkets, fetchAdmins, session, status, router, isAdminUser, adminLoading]);

  const createMarket = async () => {
    try {
      if (newMarket.autoResolve) {
        if (!newMarket.coingeckoId) {
          toast.error('Please select a cryptocurrency for auto-resolve');
          return;
        }
        if (!newMarket.targetPrice || parseFloat(newMarket.targetPrice) <= 0) {
          toast.error('Please enter a valid target price');
          return;
        }
      }

      const marketData = {
        ...newMarket,
        targetPrice: newMarket.targetPrice ? parseFloat(newMarket.targetPrice) : null,
      };

      const response = await fetch('/api/admin/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(marketData),
      });

      if (response.ok) {
        toast.success('Market created successfully');
        setShowCreateForm(false);
        setNewMarket({
          title: '',
          description: '',
          category: MarketCategory.OTHER as MarketCategory,
          closeDate: '',
          maxBetAmount: 50000,
          imageUrl: '',
          sourceUrl: '',
          autoResolve: false,
          coingeckoId: '',
          targetPrice: '',
          priceDirection: PriceDirection.ABOVE as PriceDirection,
        });
        setCoinSearchQuery('');
        setSelectedCoin(null);
        setCoinSearchResults([]);
        fetchMarkets();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create market');
      }
    } catch {
      toast.error('Error creating market');
    }
  };

  const fetchAutoResolveStats = async () => {
    setLoadingAutoResolveStats(true);
    try {
      const response = await fetch('/api/admin/auto-resolve/stats');
      if (response.ok) {
        const data = await response.json();
        setAutoResolveStats(data);
      } else {
        toast.error('Failed to fetch auto-resolve stats');
      }
    } catch {
      toast.error('Error fetching auto-resolve stats');
    } finally {
      setLoadingAutoResolveStats(false);
    }
  };

  const resolveMarket = async (marketId: string, outcome: boolean) => {
    try {
      const response = await fetch(`/api/admin/markets/${marketId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Market resolved! ${result.data.distribution.winningBetsCount} winners received ${result.data.distribution.distributedWinnings} total points`);
        fetchMarkets();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to resolve market');
      }
    } catch {
      toast.error('Error resolving market');
    }
  };

  const closeMarket = async (marketId: string) => {
    try {
      const response = await fetch(`/api/admin/markets/${marketId}/close`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast.success('Market closed successfully');
        fetchMarkets();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to close market');
      }
    } catch {
      toast.error('Error closing market');
    }
  };

  const fetchResolutionPreview = async (marketId: string) => {
    try {
      setLoadingPreview(marketId);
      const response = await fetch(`/api/admin/markets/${marketId}/preview-resolution`);
      
      if (response.ok) {
        const data = await response.json();
        setPreviewData(prev => ({
          ...prev,
          [marketId]: data.data
        }));
        setShowPreview(marketId);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to fetch preview');
      }
    } catch {
      toast.error('Error fetching preview');
    } finally {
      setLoadingPreview(null);
    }
  };

  const fetchActualPayouts = async (marketId: string) => {
    try {
      setLoadingActualPayouts(marketId);
      const response = await fetch(`/api/admin/markets/${marketId}/actual-payouts`);
      
      if (response.ok) {
        const data = await response.json();
        setActualPayoutData(prev => ({
          ...prev,
          [marketId]: data.data
        }));
        setShowActualPayouts(marketId);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to fetch actual payouts');
      }
    } catch {
      toast.error('Error fetching actual payouts');
    } finally {
      setLoadingActualPayouts(null);
    }
  };

  const addAdmin = async () => {
    if (!newAdminAddress.trim()) {
      toast.error('Please enter a valid address');
      return;
    }

    try {
      const response = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: newAdminAddress.trim() }),
      });

      if (response.ok) {
        toast.success('Admin added successfully');
        setNewAdminAddress('');
        fetchAdmins();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add admin');
      }
    } catch {
      toast.error('Error adding admin');
    }
  };

  const removeAdmin = async (address: string) => {
    if (address.toLowerCase() === session?.address?.toLowerCase()) {
      toast.error('Cannot remove yourself as admin');
      return;
    }

    try {
      const response = await fetch(`/api/admin/admins/${address}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Admin removed successfully');
        fetchAdmins();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to remove admin');
      }
    } catch {
      toast.error('Error removing admin');
    }
  };

  const startEditMarket = (market: AdminMarket) => {
    setEditingMarket(market.id);
    setEditForm({
      description: market.description,
      imageUrl: market.imageUrl || ''
    });
  };

  const cancelEditMarket = () => {
    setEditingMarket(null);
    setEditForm({
      description: '',
      imageUrl: ''
    });
  };

  const saveEditMarket = async (marketId: string) => {
    try {
      const response = await fetch(`/api/admin/markets/${marketId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          imageUrl: editForm.imageUrl
        }),
      });

      if (response.ok) {
        toast.success('Market updated successfully');
        setEditingMarket(null);
        setEditForm({
          description: '',
          imageUrl: ''
        });
        fetchMarkets();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update market');
      }
    } catch {
      toast.error('Error updating market');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const sortUserPayouts = (payouts: UserBetWithPayout[], sortType: 'payout' | 'bet' | 'profit') => {
    return [...payouts].sort((a, b) => {
      switch (sortType) {
        case 'payout':
          return b.potentialPayout - a.potentialPayout;
        case 'bet':
          return b.pointsWagered - a.pointsWagered;
        case 'profit':
          return b.profit - a.profit;
        default:
          return b.potentialPayout - a.potentialPayout;
      }
    });
  };

  const sortActualPayouts = (payouts: UserActualPayout[], sortType: 'payout' | 'bet' | 'profit') => {
    return [...payouts].sort((a, b) => {
      switch (sortType) {
        case 'payout':
          return b.actualPayout - a.actualPayout;
        case 'bet':
          return b.pointsWagered - a.pointsWagered;
        case 'profit':
          return b.profit - a.profit;
        default:
          return b.actualPayout - a.actualPayout;
      }
    });
  };

  const getDisplayedPayouts = (payouts: UserBetWithPayout[]) => {
    const sorted = sortUserPayouts(payouts, sortBy);
    return showOnlyTopN ? sorted.slice(0, showOnlyTopN) : sorted;
  };

  const getDisplayedActualPayouts = (payouts: UserActualPayout[]) => {
    const sorted = sortActualPayouts(payouts, sortBy);
    return showOnlyTopN ? sorted.slice(0, showOnlyTopN) : sorted;
  };


  const isMarketClosed = (closeDate: string) => {
    return new Date(closeDate) <= new Date();
  };

  if (status === 'loading' || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (adminError) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-white text-xl">Error: {adminError}</div>
      </div>
    );
  }

  if (!session?.address || !isAdminUser) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-white text-xl">Access Denied</div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-white">Loading markets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-green-600 hover:bg-green-700"
          >
            {showCreateForm ? 'Cancel' : 'Create Market'}
          </Button>
          <Button
            variant={includeResolved ? 'default' : 'outline'}
            onClick={() => setIncludeResolved(!includeResolved)}
          >
            {includeResolved ? 'Hide Resolved' : 'Show Resolved'}
          </Button>
          <Button
            variant={showAdminSection ? 'default' : 'outline'}
            onClick={() => setShowAdminSection(!showAdminSection)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {showAdminSection ? 'Hide Admins' : 'Manage Admins'}
          </Button>
          <Button
            variant={showAutoResolveStats ? 'default' : 'outline'}
            onClick={() => {
              setShowAutoResolveStats(!showAutoResolveStats);
              if (!showAutoResolveStats && !autoResolveStats) {
                fetchAutoResolveStats();
              }
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showAutoResolveStats ? 'Hide Auto-Resolve Stats' : 'Auto-Resolve Stats'}
          </Button>
        </div>
        <div className="text-white">
          Total Markets: {markets.length} | Admins: {admins.length}
        </div>
      </div>

      {showCreateForm && (
        <Card className="p-6 bg-black/20 border-gray-600">
          <h3 className="text-xl font-bold text-white mb-4">Create New Market</h3>
          <div className="grid gap-4">
            <div>
              <label className="block text-white mb-2">Title</label>
              <Input
                value={newMarket.title}
                onChange={(e) => setNewMarket({ ...newMarket, title: e.target.value })}
                placeholder="Market title"
                className="bg-black/30 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-white mb-2">Description</label>
              <textarea
                value={newMarket.description}
                onChange={(e) => setNewMarket({ ...newMarket, description: e.target.value })}
                placeholder="Market description"
                className="w-full p-2 bg-black/30 border border-gray-600 rounded text-white"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white mb-2">Category</label>
                <select
                  value={newMarket.category}
                  onChange={(e) => setNewMarket({ ...newMarket, category: e.target.value as MarketCategory })}
                  className="w-full p-2 bg-black/30 border border-gray-600 rounded text-white"
                >
                  {Object.values(MarketCategory).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white mb-2">Max Bet Amount</label>
                <Input
                  type="number"
                  value={newMarket.maxBetAmount}
                  onChange={(e) => setNewMarket({ ...newMarket, maxBetAmount: parseInt(e.target.value) })}
                  min={1000}
                  max={500000}
                  className="bg-black/30 border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white mb-2">Close Date</label>
                <Input
                  type="datetime-local"
                  value={newMarket.closeDate}
                  onChange={(e) => setNewMarket({ ...newMarket, closeDate: e.target.value })}
                  className="bg-black/30 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-white mb-2">Image URL (optional)</label>
                <Input
                  value={newMarket.imageUrl}
                  onChange={(e) => setNewMarket({ ...newMarket, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-black/30 border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-white mb-2">Source URL (optional)</label>
              <Input
                value={newMarket.sourceUrl}
                onChange={(e) => setNewMarket({ ...newMarket, sourceUrl: e.target.value })}
                placeholder="https://... (source for resolution)"
                className="bg-black/30 border-gray-600 text-white"
              />
              <p className="text-gray-400 text-sm mt-1">
                URL of the source that will be used to resolve this market (e.g. official website, API, etc.)
              </p>
            </div>

            <div className="border-t border-gray-600 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="autoResolve"
                  checked={newMarket.autoResolve}
                  onChange={(e) => setNewMarket({ ...newMarket, autoResolve: e.target.checked })}
                  className="rounded border-gray-600 bg-black/30"
                />
                <label htmlFor="autoResolve" className="text-white font-semibold">
                  Auto-resolve via CoinGecko
                </label>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Automatically resolve this market based on cryptocurrency price from CoinGecko
              </p>

              {newMarket.autoResolve && (
                <div className="space-y-4 bg-black/20 p-4 rounded border border-gray-700">
                  <div>
                    <label className="block text-white mb-2">Cryptocurrency *</label>
                    <div className="relative">
                      <Input
                        value={coinSearchQuery}
                        onChange={(e) => {
                          setCoinSearchQuery(e.target.value);
                          searchCoins(e.target.value);
                        }}
                        placeholder="Search for cryptocurrency (e.g. Bitcoin, Ethereum)"
                        className="bg-black/30 border-gray-600 text-white"
                      />
                      {loadingCoins && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    
                    {coinSearchResults.length > 0 && (
                      <div className="mt-1 bg-black/40 border border-gray-600 rounded max-h-40 overflow-y-auto">
                        {coinSearchResults.map((coin) => (
                          <button
                            key={coin.id}
                            onClick={() => selectCoin(coin)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-700/50 text-white border-b border-gray-700 last:border-b-0"
                          >
                            <div className="font-medium">{coin.name}</div>
                            <div className="text-sm text-gray-400">{coin.symbol.toUpperCase()} • {coin.id}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedCoin && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
                        <span>✓ Selected: {selectedCoin.name} ({selectedCoin.symbol.toUpperCase()})</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white mb-2">Target Price (USD) *</label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={newMarket.targetPrice}
                        onChange={(e) => setNewMarket({ ...newMarket, targetPrice: e.target.value })}
                        placeholder="0.00"
                        className="bg-black/30 border-gray-600 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white mb-2">Price Direction *</label>
                      <select
                        value={newMarket.priceDirection}
                        onChange={(e) => setNewMarket({ ...newMarket, priceDirection: e.target.value as PriceDirection })}
                        className="w-full p-2 bg-black/30 border border-gray-600 rounded text-white"
                      >
                        <option value={PriceDirection.ABOVE}>Will be ABOVE target price</option>
                        <option value={PriceDirection.BELOW}>Will be BELOW target price</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 bg-blue-900/20 border border-blue-500/30 rounded p-3">
                    <strong>How it works:</strong> When this market closes, it will automatically check the current price of {selectedCoin?.name || 'the selected cryptocurrency'} on CoinGecko. 
                    If the price is {newMarket.priceDirection === PriceDirection.ABOVE ? 'above' : 'below'} ${newMarket.targetPrice || 'the target price'}, 
                    the market will resolve to <strong>YES</strong>. Otherwise, it will resolve to <strong>NO</strong>.
                  </div>
                </div>
              )}
            </div>
            <Button onClick={createMarket} className="bg-green-600 hover:bg-green-700">
              Create Market
            </Button>
          </div>
        </Card>
      )}

      {showAdminSection && (
        <Card className="p-6 bg-black/20 border-gray-600">
          <h3 className="text-xl font-bold text-white mb-4">Admin Management</h3>
          
          <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <h4 className="text-lg font-semibold text-white mb-3">Add New Admin</h4>
            <div className="flex gap-3">
              <Input
                value={newAdminAddress}
                onChange={(e) => setNewAdminAddress(e.target.value)}
                placeholder="0x... (Ethereum address)"
                className="bg-black/30 border-gray-600 text-white flex-1"
              />
              <Button
                onClick={addAdmin}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Add Admin
              </Button>
            </div>
            <p className="text-gray-400 text-sm mt-2">
              Enter the Ethereum address of the user you want to make an admin
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Current Admins ({admins.length})</h4>
            <div className="space-y-2">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 bg-accent-bg/30 border border-border-input/30 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-white font-medium">
                        {formatAddress(admin.address)}
                      </div>
                      {admin.address.toLowerCase() === session?.address?.toLowerCase() && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                      <Badge variant={admin.isActive ? 'default' : 'destructive'} className="text-xs">
                        {admin.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Added: {new Date(admin.createdAt).toLocaleDateString()}
                      {admin.createdBy && admin.createdBy !== 'SYSTEM_MIGRATION' && (
                        <span> by {formatAddress(admin.createdBy)}</span>
                      )}
                      {admin.createdBy === 'SYSTEM_MIGRATION' && (
                        <span> (System Migration)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {admin.address.toLowerCase() !== session?.address?.toLowerCase() && admin.isActive && (
                      <Button
                        onClick={() => removeAdmin(admin.address)}
                        variant="destructive"
                        size="sm"
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-300 border-red-500/40"
                      >
                        Remove
                      </Button>
                    )}
                    {admin.address.toLowerCase() === session?.address?.toLowerCase() && (
                      <span className="text-sm text-gray-500 italic">Cannot remove yourself</span>
                    )}
                  </div>
                </div>
              ))}
              
              {admins.length === 0 && (
                <div className="text-center text-gray-400 py-4">
                  No admins found
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {showAutoResolveStats && (
        <Card className="p-6 bg-black/20 border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Auto-Resolve Statistics</h3>
            <Button
              onClick={fetchAutoResolveStats}
              disabled={loadingAutoResolveStats}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {loadingAutoResolveStats ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {loadingAutoResolveStats ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : autoResolveStats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-300">{autoResolveStats.overview.totalAutoResolveMarkets}</div>
                  <div className="text-sm text-gray-400">Total Auto-Resolve Markets</div>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-300">{autoResolveStats.overview.autoResolvedMarkets}</div>
                  <div className="text-sm text-gray-400">Successfully Resolved</div>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-300">{autoResolveStats.overview.pendingAutoResolveMarkets}</div>
                  <div className="text-sm text-gray-400">Pending Resolution</div>
                </div>
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-300">{autoResolveStats.overview.failedAutoResolveMarkets}</div>
                  <div className="text-sm text-gray-400">Failed/Overdue</div>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-300">{autoResolveStats.overview.successRate}%</div>
                  <div className="text-sm text-gray-400">Success Rate</div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Recent Auto-Resolved Markets</h4>
                {autoResolveStats.recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {autoResolveStats.recentActivity.map((market) => (
                      <div
                        key={market.id}
                        className="flex items-center justify-between p-3 bg-accent-bg/30 border border-border-input/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-white font-medium">{market.title}</div>
                          <div className="text-sm text-gray-400">
                            Resolved: {formatDateTime(market.resolvedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={market.resolvedOutcome ? 'default' : 'destructive'} className="text-xs">
                            {market.resolvedOutcome ? 'YES' : 'NO'}
                          </Badge>
                          <div className="text-sm text-gray-400">
                            ${market.lastCheckedPrice?.toFixed(4)} / ${market.targetPrice} ({market.priceDirection})
                          </div>
                          {market.sourceUrl && (
                            <a
                              href={market.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    No recent auto-resolved markets in the last 24 hours
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">Breakdown by Cryptocurrency</h4>
                {autoResolveStats.cryptoBreakdown.length > 0 ? (
                  <div className="space-y-2">
                    {autoResolveStats.cryptoBreakdown.map((crypto) => (
                      <div
                        key={crypto.coingeckoId}
                        className="flex items-center justify-between p-3 bg-accent-bg/30 border border-border-input/30 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-white font-medium capitalize">{crypto.coingeckoId}</div>
                          <div className="text-sm text-gray-400">CoinGecko ID</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-white font-semibold">{crypto.totalMarkets}</div>
                            <div className="text-xs text-gray-400">Markets</div>
                          </div>
                          <div className="text-center">
                            <div className="text-white font-semibold">{crypto.totalVolume.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Total Volume</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-4">
                    No cryptocurrency data available
                  </div>
                )}
              </div>

              <div className="text-center text-sm text-gray-400">
                Last updated: {formatDateTime(autoResolveStats.lastUpdated)}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              Click &quot;Refresh&quot; to load auto-resolve statistics
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-4">
        {markets.map((market) => (
          <Card key={market.id} className="p-6 bg-black/20 border-gray-600">
            {editingMarket === market.id ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-white">{market.title}</h3>
                  <Badge variant="outline" className="bg-yellow-600/20 text-yellow-300 border-yellow-500/40">
                    EDITING
                  </Badge>
                </div>
                
                <div>
                  <label className="block text-white mb-2 font-semibold">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full p-3 bg-black/30 border border-gray-600 rounded text-white resize-y min-h-[100px]"
                    placeholder="Market description"
                  />
                  <div className="text-sm text-gray-400 mt-1">
                    {editForm.description.length}/1000 characters
                  </div>
                </div>
                
                <div>
                  <label className="block text-white mb-2 font-semibold">Image URL</label>
                  <Input
                    value={editForm.imageUrl}
                    onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg (optional)"
                    className="bg-black/30 border-gray-600 text-white"
                  />
                  {editForm.imageUrl && (
                    <div className="mt-2">
                      <img 
                        src={editForm.imageUrl} 
                        alt="Preview" 
                        className="w-32 h-20 object-cover rounded border border-gray-600"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-gray-600">
                  <Button
                    onClick={() => saveEditMarket(market.id)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={editForm.description.trim().length < 10}
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={cancelEditMarket}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-white">{market.title}</h3>
                    <Badge variant={market.isResolved ? 'default' : 'secondary'}>
                      {market.category}
                    </Badge>
                    {market.isResolved && (
                      <Badge variant={market.resolvedOutcome ? 'default' : 'destructive'}>
                        {market.resolvedOutcome ? 'YES Won' : 'NO Won'}
                      </Badge>
                    )}
                    {isMarketClosed(market.closeDate) && !market.isResolved && (
                      <Badge variant="outline">CLOSED</Badge>
                    )}
                  </div>
                  <p className="text-gray-300 mb-2">{market.description}</p>
                  {market.imageUrl && (
                    <div className="mb-2">
                      <img 
                        src={market.imageUrl} 
                        alt={market.title} 
                        className="w-32 h-20 object-cover rounded border border-gray-600"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                    <div>Close Date: {formatDateTime(market.closeDate)}</div>
                    <div>Volume: {market.totalVolume.toLocaleString()} points</div>
                    <div>Participants: {market.participants}</div>
                    <div>YES: {market.yesPercentage}%</div>
                  </div>
                  {market.isResolved && (
                    <div className="mt-2 text-sm text-gray-400">
                      <div>Resolved: {formatDateTime(market.resolvedAt!)}</div>
                      <div>By: {market.resolvedBy}</div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => startEditMarket(market)}
                    variant="outline"
                    size="sm"
                    className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300 border-yellow-500/40"
                  >
                    Edit
                  </Button>
                  {!market.isResolved && isMarketClosed(market.closeDate) && (
                    <>
                      <Button
                        onClick={() => fetchResolutionPreview(market.id)}
                        disabled={loadingPreview === market.id}
                        variant="outline"
                        size="sm"
                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border-blue-500/40"
                      >
                        {loadingPreview === market.id ? 'Loading...' : 'Preview Payouts'}
                      </Button>
                      <Button
                        onClick={() => resolveMarket(market.id, true)}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        Resolve YES
                      </Button>
                      <Button
                        onClick={() => resolveMarket(market.id, false)}
                        className="bg-red-600 hover:bg-red-700"
                        size="sm"
                      >
                        Resolve NO
                      </Button>
                    </>
                  )}
                  {market.isResolved && (
                    <Button
                      onClick={() => fetchActualPayouts(market.id)}
                      disabled={loadingActualPayouts === market.id}
                      variant="outline"
                      size="sm"
                      className="bg-green-600/20 hover:bg-green-600/40 text-green-300 border-green-500/40"
                    >
                      {loadingActualPayouts === market.id ? 'Loading...' : 'View Actual Payouts'}
                    </Button>
                  )}
                  {!market.isResolved && !isMarketClosed(market.closeDate) && (
                    <Button
                      onClick={() => closeMarket(market.id)}
                      variant="outline"
                      size="sm"
                    >
                      Close Market
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {markets.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No markets found. Create your first market!
        </div>
      )}

      {showPreview && previewData?.[showPreview] && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-panel-bg via-panel-bg to-accent-bg/30 rounded-2xl border border-border-input/50 max-w-7xl w-full max-h-[95vh] overflow-hidden">
            <div className="p-6 border-b border-border-input/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Resolution Preview</h2>
                <Button
                  onClick={() => setShowPreview(null)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              <p className="text-gray-300 mb-4">
                Market: {markets.find(m => m.id === showPreview)?.title}
              </p>
              
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-300">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'payout' | 'bet' | 'profit')}
                    className="px-3 py-1 bg-accent-bg border border-border-input/30 rounded text-white text-sm"
                  >
                    <option value="payout">Payout Amount</option>
                    <option value="bet">Bet Amount</option>
                    <option value="profit">Profit</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-300">Show:</label>
                  <select
                    value={showOnlyTopN || 'all'}
                    onChange={(e) => setShowOnlyTopN(e.target.value === 'all' ? null : parseInt(e.target.value))}
                    className="px-3 py-1 bg-accent-bg border border-border-input/30 rounded text-white text-sm"
                  >
                    <option value="all">All Users</option>
                    <option value="10">Top 10</option>
                    <option value="25">Top 25</option>
                    <option value="50">Top 50</option>
                    <option value="100">Top 100</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-400">
                  Total participants: {previewData[showPreview].yesPreview.totalBets}
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">YES</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">If YES Wins</h3>
                  </div>
                  
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-gray-300">
                        <span className="block text-green-300 font-semibold">Winners:</span>
                        {previewData[showPreview].yesPreview.winningBets} users
                      </div>
                      <div className="text-gray-300">
                        <span className="block text-red-300 font-semibold">Losers:</span>
                        {previewData[showPreview].yesPreview.losingBets} users
                      </div>
                      <div className="text-gray-300">
                        <span className="block text-yellow-300 font-semibold">Total Payout:</span>
                        {previewData[showPreview].yesPreview.totalPayout.toLocaleString()} pts
                      </div>
                      <div className="text-gray-300">
                        <span className="block text-blue-300 font-semibold">Total Pool:</span>
                        {previewData[showPreview].yesPreview.totalPool.toLocaleString()} pts
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold text-white">Winner Payouts</h4>
                      <span className="text-sm text-green-300">
                        {getDisplayedPayouts(previewData[showPreview].yesPreview.userPayouts).length} 
                        {showOnlyTopN && previewData[showPreview].yesPreview.userPayouts.length > showOnlyTopN 
                          ? ` of ${previewData[showPreview].yesPreview.userPayouts.length}` 
                          : ''} users
                      </span>
                    </div>
                    
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-accent-bg/20 rounded-lg text-xs font-semibold text-gray-400 border border-border-input/20">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">User</div>
                      <div className="col-span-2 text-right">Bet</div>
                      <div className="col-span-3 text-right">Payout</div>
                      <div className="col-span-2 text-right">Profit</div>
                    </div>
                    
                        <div className="max-h-96 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                      {getDisplayedPayouts(previewData[showPreview].yesPreview.userPayouts).map((payout) => (
                        <div key={payout.userId} className="grid grid-cols-12 gap-2 px-3 py-2 bg-accent-bg/30 border border-border-input/30 rounded-lg hover:bg-accent-bg/50 transition-colors">
                          <div className="col-span-1 text-gray-400 text-sm font-medium">
                            {sortUserPayouts(previewData[showPreview].yesPreview.userPayouts, sortBy).findIndex(p => p.userId === payout.userId) + 1}
                          </div>
                          <div className="col-span-4">
                            <span className="text-gray-300 text-sm font-medium">{formatAddress(payout.userAddress)}</span>
                          </div>
                          <div className="col-span-2 text-right text-sm text-gray-400">
                            {payout.pointsWagered.toLocaleString()} pts
                          </div>
                          <div className="col-span-3 text-right">
                            <div className="text-green-400 font-bold text-sm">{payout.potentialPayout.toLocaleString()} pts</div>
                          </div>
                          <div className="col-span-2 text-right">
                            <div className="text-green-300 text-sm">+{payout.profit.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {showOnlyTopN && previewData[showPreview].yesPreview.userPayouts.length > showOnlyTopN && (
                      <div className="text-center text-sm text-gray-400 mt-2 p-2 bg-accent-bg/20 rounded">
                        Showing top {showOnlyTopN} users. Set &quot;Show&quot; to &quot;All Users&quot; to see everyone.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">NO</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">If NO Wins</h3>
                  </div>
                  
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-gray-300">
                        <span className="block text-green-300 font-semibold">Winners:</span>
                        {previewData[showPreview].noPreview.winningBets} users
                      </div>
                      <div className="text-gray-300">
                        <span className="block text-red-300 font-semibold">Losers:</span>
                        {previewData[showPreview].noPreview.losingBets} users
                      </div>
                      <div className="text-gray-300">
                        <span className="block text-yellow-300 font-semibold">Total Payout:</span>
                        {previewData[showPreview].noPreview.totalPayout.toLocaleString()} pts
                      </div>
                      <div className="text-gray-300">
                        <span className="block text-blue-300 font-semibold">Total Pool:</span>
                        {previewData[showPreview].noPreview.totalPool.toLocaleString()} pts
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold text-white">Winner Payouts</h4>
                      <span className="text-sm text-green-300">
                        {getDisplayedPayouts(previewData[showPreview].noPreview.userPayouts).length} 
                        {showOnlyTopN && previewData[showPreview].noPreview.userPayouts.length > showOnlyTopN 
                          ? ` of ${previewData[showPreview].noPreview.userPayouts.length}` 
                          : ''} users
                      </span>
                    </div>
                    
                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-accent-bg/20 rounded-lg text-xs font-semibold text-gray-400 border border-border-input/20">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">User</div>
                      <div className="col-span-2 text-right">Bet</div>
                      <div className="col-span-3 text-right">Payout</div>
                      <div className="col-span-2 text-right">Profit</div>
                    </div>
                    
                        <div className="max-h-96 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                      {getDisplayedPayouts(previewData[showPreview].noPreview.userPayouts).map((payout) => (
                        <div key={payout.userId} className="grid grid-cols-12 gap-2 px-3 py-2 bg-accent-bg/30 border border-border-input/30 rounded-lg hover:bg-accent-bg/50 transition-colors">
                          <div className="col-span-1 text-gray-400 text-sm font-medium">
                            {sortUserPayouts(previewData[showPreview].noPreview.userPayouts, sortBy).findIndex(p => p.userId === payout.userId) + 1}
                          </div>
                          <div className="col-span-4">
                            <span className="text-gray-300 text-sm font-medium">{formatAddress(payout.userAddress)}</span>
                          </div>
                          <div className="col-span-2 text-right text-sm text-gray-400">
                            {payout.pointsWagered.toLocaleString()} pts
                          </div>
                          <div className="col-span-3 text-right">
                            <div className="text-green-400 font-bold text-sm">{payout.potentialPayout.toLocaleString()} pts</div>
                          </div>
                          <div className="col-span-2 text-right">
                            <div className="text-green-300 text-sm">+{payout.profit.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {showOnlyTopN && previewData[showPreview].noPreview.userPayouts.length > showOnlyTopN && (
                      <div className="text-center text-sm text-gray-400 mt-2 p-2 bg-accent-bg/20 rounded">
                        Showing top {showOnlyTopN} users. Set &quot;Show&quot; to &quot;All Users&quot; to see everyone.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border-input/30">
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => {
                      setShowPreview(null);
                      resolveMarket(showPreview!, true);
                    }}
                    className="bg-green-600 hover:bg-green-700 px-8"
                  >
                    Resolve as YES
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPreview(null);
                      resolveMarket(showPreview!, false);
                    }}
                    className="bg-red-600 hover:bg-red-700 px-8"
                  >
                    Resolve as NO
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showActualPayouts && actualPayoutData?.[showActualPayouts] && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-panel-bg via-panel-bg to-accent-bg/30 rounded-2xl border border-border-input/50 max-w-7xl w-full max-h-[95vh] overflow-hidden">
            <div className="p-6 border-b border-border-input/30">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Actual Payouts - Resolved Market</h2>
                <Button
                  onClick={() => setShowActualPayouts(null)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </Button>
              </div>
              <p className="text-gray-300 mb-4">
                Market: {markets.find(m => m.id === showActualPayouts)?.title}
              </p>
              
              <div className="mb-4 p-4 bg-accent-bg/30 rounded-lg border border-border-input/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-gray-400">Resolved:</span>
                    <span className="text-white font-semibold">
                      {actualPayoutData[showActualPayouts].outcome ? 'YES' : 'NO'} Won
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400">Resolved At:</span>
                    <span className="text-white font-semibold">
                      {formatDateTime(actualPayoutData[showActualPayouts].resolvedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400">Resolved By:</span>
                    <span className="text-white font-semibold">
                      {actualPayoutData[showActualPayouts].resolvedBy}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400">Winners/Total:</span>
                    <span className="text-white font-semibold">
                      {actualPayoutData[showActualPayouts].winningBets}/{actualPayoutData[showActualPayouts].totalBets} users
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-green-300 font-semibold">Total Pool:</span>
                    <span className="text-white">{actualPayoutData[showActualPayouts].totalPool.toLocaleString()} pts</span>
                  </div>
                  <div>
                    <span className="block text-blue-300 font-semibold">Base Payouts:</span>
                    <span className="text-white">{actualPayoutData[showActualPayouts].totalBasePayout.toLocaleString()} pts</span>
                  </div>
                  <div>
                    <span className="block text-purple-300 font-semibold">NFT Bonuses:</span>
                    <span className="text-white">{actualPayoutData[showActualPayouts].totalNFTBonus.toLocaleString()} pts</span>
                  </div>
                  <div>
                    <span className="block text-yellow-300 font-semibold">Total Paid:</span>
                    <span className="text-white font-bold">{actualPayoutData[showActualPayouts].totalActualPayout.toLocaleString()} pts</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-300">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'payout' | 'bet' | 'profit')}
                    className="px-3 py-1 bg-accent-bg border border-border-input/30 rounded text-white text-sm"
                  >
                    <option value="payout">Payout Amount</option>
                    <option value="bet">Bet Amount</option>
                    <option value="profit">Profit</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-300">Show:</label>
                  <select
                    value={showOnlyTopN || 'all'}
                    onChange={(e) => setShowOnlyTopN(e.target.value === 'all' ? null : parseInt(e.target.value))}
                    className="px-3 py-1 bg-accent-bg border border-border-input/30 rounded text-white text-sm"
                  >
                    <option value="all">All Users</option>
                    <option value="10">Top 10</option>
                    <option value="25">Top 25</option>
                    <option value="50">Top 50</option>
                    <option value="100">Top 100</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-400">
                  Total participants: {actualPayoutData[showActualPayouts].userPayouts.length}
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-semibold text-white">User Payouts</h4>
                  <span className="text-sm text-green-300">
                    {getDisplayedActualPayouts(actualPayoutData[showActualPayouts].userPayouts).length} 
                    {showOnlyTopN && actualPayoutData[showActualPayouts].userPayouts.length > showOnlyTopN 
                      ? ` of ${actualPayoutData[showActualPayouts].userPayouts.length}` 
                      : ''} users
                  </span>
                </div>
                
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-accent-bg/20 rounded-lg text-xs font-semibold text-gray-400 border border-border-input/20">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">User</div>
                  <div className="col-span-1 text-center">Side</div>
                  <div className="col-span-2 text-right">Bet</div>
                  <div className="col-span-2 text-right">Payout</div>
                  <div className="col-span-2 text-right">Profit</div>
                  <div className="col-span-1 text-center">NFT</div>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                  {getDisplayedActualPayouts(actualPayoutData[showActualPayouts].userPayouts).map((payout, index) => (
                    <div key={payout.userId} className={`grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      payout.isWinner 
                        ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' 
                        : 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                    }`}>
                      <div className="col-span-1 text-gray-400 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="col-span-3">
                        <span className="text-gray-300 text-sm font-medium">{formatAddress(payout.userAddress)}</span>
                      </div>
                      <div className="col-span-1 text-center">
                        <Badge variant={payout.outcome ? 'default' : 'destructive'} className="text-xs">
                          {payout.outcome ? 'YES' : 'NO'}
                        </Badge>
                      </div>
                      <div className="col-span-2 text-right text-sm text-gray-400">
                        {payout.pointsWagered.toLocaleString()} pts
                      </div>
                      <div className="col-span-2 text-right">
                        {payout.isWinner ? (
                          <div className="text-green-400 font-bold text-sm">{payout.actualPayout.toLocaleString()} pts</div>
                        ) : (
                          <div className="text-red-400 text-sm">0 pts</div>
                        )}
                      </div>
                      <div className="col-span-2 text-right">
                        {payout.isWinner ? (
                          <div className="text-green-300 text-sm">+{payout.profit.toLocaleString()}</div>
                        ) : (
                          <div className="text-red-300 text-sm">-{payout.pointsWagered.toLocaleString()}</div>
                        )}
                      </div>
                      <div className="col-span-1 text-center">
                        {payout.nftMultiplier && payout.nftMultiplier > 1 ? (
                          <div className="text-purple-400 text-xs font-bold" title={`NFT Bonus: +${payout.nftBonus?.toLocaleString() || 0} pts`}>
                            {payout.nftMultiplier.toFixed(1)}x
                          </div>
                        ) : (
                          <div className="text-gray-600 text-xs">-</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {showOnlyTopN && actualPayoutData[showActualPayouts].userPayouts.length > showOnlyTopN && (
                  <div className="text-center text-sm text-gray-400 mt-2 p-2 bg-accent-bg/20 rounded">
                    Showing top {showOnlyTopN} users. Set &quot;Show&quot; to &quot;All Users&quot; to see everyone.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}