'use client';

import LoadingSpinner from '@/components/ui/loading-spinner';
import { useClientMount } from '@/lib/hooks/useClientMount';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { ModernConnectWallet } from '@/components/modern-connect-wallet';
import { useUserDataRefresh } from '@/contexts/user-data-context';
import { formatAddress } from '@/lib/utils/format';
import { useNFTData } from '@/lib/hooks/useNFTData';
import { NFTBadges } from '@/components/nft-badges';
import { AchievementBadges } from '@/components/achievement-badges';
import { UserBadgeData } from '@/lib/services/badge-service';
import { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Trophy, 
  Gift,
  Clock,
  TrendingUp,
  Target,
  Activity,
  Wallet,
  Star,
  Zap
} from 'lucide-react';

interface UserData {
  points: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
  } | null;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    createdAt: string;
  }>;
}

interface LeaderboardData {
  currentUser: {
    rank: number;
  } | null;
}

interface ClaimStatus {
  canClaim: boolean;
  nextClaimIn: number;
  userPoints: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
  } | null;
}

interface BettingStats {
  totalBets: number;
  winRate: number;
  roi: number;
  totalPoints: number;
  totalSpent: number;
  totalSpentResolved: number;
  totalWon: number;
  activeBets: number;
  resolvedBets: number;
}

const ProfileContent = () => {
  const hasMounted = useClientMount();
  const { toast } = useToast();
  const { address, isFullyAuthenticated } = useAuth();
  const { refreshUserData } = useUserDataRefresh();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [bettingStats, setBettingStats] = useState<BettingStats | null>(null);
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [badges, setBadges] = useState<UserBadgeData[]>([]);
  const [activeBadgeId, setActiveBadgeId] = useState<string | null>(null);
  const [isLoadingBadges, setIsLoadingBadges] = useState(false);
  const { nftData, isLoading: isLoadingNFT } = useNFTData(address || undefined);

  const fetchUserData = useCallback(async () => {
    if (!isFullyAuthenticated) return;
    
    try {
      const response = await fetch('/api/points');
      if (response.ok) {
        const data = await response.json();
        setUserData(data.data);
      }
    } catch {
    }
  }, [isFullyAuthenticated]);

  const fetchClaimStatus = useCallback(async () => {
    if (!isFullyAuthenticated) return;
    
    try {
      const response = await fetch('/api/daily-claim');
      if (response.ok) {
        const data = await response.json();
        setClaimStatus(data.data);
      }
    } catch {
    }
  }, [isFullyAuthenticated]);

  const fetchLeaderboardData = useCallback(async () => {
    if (!isFullyAuthenticated) return;
    
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data.data);
      }
    } catch {
    }
  }, [isFullyAuthenticated]);

  const fetchBettingStats = useCallback(async () => {
    if (!isFullyAuthenticated) return;
    
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setBettingStats(data.data);
      }
    } catch {
    }
  }, [isFullyAuthenticated]);

  const fetchBadges = useCallback(async () => {
    if (!isFullyAuthenticated) return;
    
    try {
      const response = await fetch('/api/user/badges');
      if (response.ok) {
        const data = await response.json();
        setBadges(data.data.badges);
        
        const activeBadge = data.data.badges.find((badge: UserBadgeData) => badge.isActive);
        setActiveBadgeId(activeBadge?.id || null);
      }
    } catch {
    }
  }, [isFullyAuthenticated]);

  useEffect(() => {
    if (isFullyAuthenticated) {
      fetchUserData();
      fetchClaimStatus();
      fetchLeaderboardData();
      fetchBettingStats();
      fetchBadges();
    }
  }, [isFullyAuthenticated, fetchUserData, fetchClaimStatus, fetchLeaderboardData, fetchBettingStats, fetchBadges]);

  useEffect(() => {
    if (hasMounted) {
      setIsVisible(true);
    }
  }, [hasMounted]);

  useEffect(() => {
    if (!claimStatus?.nextClaimIn) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = claimStatus.nextClaimIn - (now - Date.now());
      
      if (remaining <= 0) {
        setTimeUntilNextClaim('Ready to claim!');
        fetchClaimStatus();
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      setTimeUntilNextClaim(`${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [claimStatus, fetchClaimStatus]);

  const handleClaimDaily = async () => {
    if (!claimStatus?.canClaim || isClaimingDaily) return;

    setIsClaimingDaily(true);
    try {
      const response = await fetch('/api/daily-claim', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Daily Reward Claimed!",
          description: `You received ${data.data.claim.totalAmount.toLocaleString()} points`,
        });
        
        refreshUserData();
        fetchClaimStatus();
      } else {
        toast({
          title: "Claim Failed",
          description: data.error || "Unable to claim daily reward",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "Claim Failed",
        description: "Network error, please try again",
        variant: "destructive"
      });
    } finally {
      setIsClaimingDaily(false);
    }
  };

  const handleBadgeSelect = async (badgeId: string | null) => {
    if (isLoadingBadges) return;
    
    setIsLoadingBadges(true);
    try {
      const response = await fetch('/api/user/badges/set-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ badgeId }),
      });

      if (response.ok) {
        setActiveBadgeId(badgeId);
        toast({
          title: badgeId ? "Badge activated!" : "Badge deactivated",
          description: badgeId ? "Your badge is now displayed on the leaderboard" : "Badge removed from display",
        });
      } else {
        toast({
          title: "Failed to update badge",
          description: "Please try again later",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "Failed to update badge",
        description: "Network error, please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoadingBadges(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DAILY_CLAIM': return <Gift className="w-4 h-4 text-main-cta" />;
      case 'REFERRAL_BONUS': return <Star className="w-4 h-4 text-highlight-glow" />;
      case 'BET_PLACED': return <Target className="w-4 h-4 text-soft-destructive" />;
      case 'BET_WON': return <Trophy className="w-4 h-4 text-main-cta" />;
      case 'BET_LOST': return <Activity className="w-4 h-4 text-gray-400" />;
      default: return <Zap className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="relative z-10">
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">

          {!isFullyAuthenticated && (
            <div className={`text-center py-12 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className={`bg-gradient-to-br from-panel-bg/80 to-accent-bg/50 backdrop-blur-xl border border-main-cta/20 rounded-2xl p-8 max-w-md mx-auto hover-lift transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="w-20 h-20 bg-gradient-to-r from-main-cta/20 to-highlight-glow/20 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse-glow">
                  <User className="w-10 h-10 text-main-cta" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
                <p className="text-gray-400 mb-6">Sign in to unlock your profile and start your prediction journey</p>
                <ModernConnectWallet />
              </div>
            </div>
          )}

          {isFullyAuthenticated && address && (
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                  <Card className={`bg-gradient-to-br from-panel-bg/80 to-accent-bg/50 backdrop-blur-xl border-main-cta/20 p-8 text-center hover-lift transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'} group`}>
                    <div className="relative mb-6">
                      <div className="w-24 h-24 bg-gradient-to-r from-main-cta to-highlight-glow rounded-full mx-auto flex items-center justify-center animate-pulse-glow">
                        <User className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-highlight-glow to-main-cta rounded-full flex items-center justify-center group-hover:animate-bounce">
                        <span className="text-dark-bg font-bold text-sm">✓</span>
                      </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">{formatAddress(address)}</h2>
                    <p className="text-gray-400 mb-6">Connected Wallet</p>
                    
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-between p-3 bg-dark-bg/50 rounded-lg">
                        <span className="text-gray-300 flex items-center space-x-2">
                          <Wallet className="w-4 h-4" />
                          <span>Address</span>
                        </span>
                        <span className="text-main-cta font-mono text-sm">{formatAddress(address)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-dark-bg/50 rounded-lg">
                        <span className="text-gray-300 flex items-center space-x-2">
                          <Trophy className="w-4 h-4" />
                          <span>Rank</span>
                        </span>
                        <span className="text-highlight-glow font-bold">
                          #{leaderboardData?.currentUser?.rank || '--'}
                        </span>
                      </div>
                    </div>


                    <div className="border-t border-border-input/50 pt-6 mt-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-center space-x-2">
                        <Star className="w-5 h-5 text-highlight-glow" />
                        <span>NFT Collections</span>
                      </h3>
                      {isLoadingNFT ? (
                        <div className="text-center py-4">
                          <div className="w-6 h-6 border-2 border-main-cta border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <div className="text-sm text-gray-400">Checking NFT collections...</div>
                        </div>
                      ) : (
                        <NFTBadges collections={nftData?.collections || []} />
                      )}
                    </div>

                    <div className="border-t border-border-input/50 pt-6 mt-6">
                      <AchievementBadges 
                        badges={badges}
                        activeBadgeId={activeBadgeId || undefined}
                        onBadgeSelect={handleBadgeSelect}
                        showSelector={true}
                      />
                      {isLoadingBadges && (
                        <div className="text-center py-2">
                          <div className="w-4 h-4 border-2 border-main-cta border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className={`bg-gradient-to-br from-main-cta/20 to-secondary-cta/10 border-main-cta/30 p-6 hover-lift transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-gradient-to-r from-main-cta/30 to-highlight-glow/30 rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce-in">
                        <Gift className="w-8 h-8 text-main-cta" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Daily Reward</h3>
                      <p className="text-gray-300">Claim your daily bonus!</p>
                    </div>
                    
                    <div className="text-center mb-6">
                      <div className="text-4xl font-black text-transparent bg-gradient-to-r from-main-cta to-highlight-glow bg-clip-text mb-2">
                        +1,000
                      </div>
                      <p className="text-gray-300">Points per claim</p>
                    </div>

                    <Button 
                      onClick={handleClaimDaily}
                      disabled={!claimStatus?.canClaim || isClaimingDaily}
                      className="w-full bg-gradient-to-r from-main-cta to-secondary-cta hover:from-main-cta/80 hover:to-secondary-cta/80 text-white font-semibold py-4 rounded-lg disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
                    >
                      {isClaimingDaily ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Claiming...</span>
                        </div>
                      ) : claimStatus?.canClaim ? 'Claim Now' : 'Already Claimed'}
                    </Button>
                    
                    <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mt-4">
                      <Clock className="w-4 h-4" />
                      <span>
                        {claimStatus?.canClaim ? 'Available now!' : `Resets in ${timeUntilNextClaim}`}
                      </span>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <Card className={`bg-gradient-to-br from-panel-bg/80 to-accent-bg/50 backdrop-blur-xl border-border-input p-8 hover-lift transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-main-cta/20 to-highlight-glow/20 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-main-cta" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Betting Performance</h3>
                        <p className="text-gray-400">Your detailed trading statistics</p>
                      </div>
                    </div>
                    
                    {bettingStats?.activeBets && bettingStats.activeBets > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-2 text-yellow-400">
                          <Activity className="w-4 h-4" />
                          <span className="text-sm">
                            You have {bettingStats.activeBets} active bet{bettingStats.activeBets > 1 ? 's' : ''} pending resolution
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-dark-bg/50 p-4 rounded-lg text-center hover:bg-dark-bg/70 transition-colors">
                        <div className="text-3xl font-bold text-main-cta mb-1">
                          {bettingStats?.totalBets ?? 0}
                        </div>
                        <div className="text-sm text-gray-400">Total Bets</div>
                      </div>
                      
                      <div className="bg-dark-bg/50 p-4 rounded-lg text-center hover:bg-dark-bg/70 transition-colors">
                        <div className="text-3xl font-bold text-highlight-glow mb-1">
                          {bettingStats?.winRate ? `${bettingStats.winRate}%` : '0%'}
                        </div>
                        <div className="text-sm text-gray-400">Win Rate</div>
                      </div>
                      
                      <div className="bg-dark-bg/50 p-4 rounded-lg text-center hover:bg-dark-bg/70 transition-colors">
                        <div className={`text-3xl font-bold mb-1 ${bettingStats?.roi && bettingStats.roi > 0 ? 'text-main-cta' : 'text-soft-destructive'}`}>
                          {bettingStats?.roi !== undefined ? 
                            `${bettingStats.roi > 0 ? '+' : ''}${bettingStats.roi}%` : 
                            '0%'
                          }
                        </div>
                        <div className="text-sm text-gray-400">ROI</div>
                      </div>
                      
                      <div className="bg-dark-bg/50 p-4 rounded-lg text-center hover:bg-dark-bg/70 transition-colors">
                        <div className="text-3xl font-bold text-secondary-cta mb-1">
                          {bettingStats?.totalWon ? bettingStats.totalWon.toLocaleString() : '0'}
                        </div>
                        <div className="text-sm text-gray-400">Total Won</div>
                      </div>
                      
                      <div className="bg-dark-bg/50 p-4 rounded-lg text-center hover:bg-dark-bg/70 transition-colors">
                        <div className="text-3xl font-bold text-purple-400 mb-1">
                          {bettingStats?.activeBets ?? 0}
                        </div>
                        <div className="text-sm text-gray-400">Active Bets</div>
                      </div>
                      
                      <div className="bg-dark-bg/50 p-4 rounded-lg text-center hover:bg-dark-bg/70 transition-colors">
                        <div className="text-3xl font-bold text-gray-400 mb-1">
                          {bettingStats?.resolvedBets ?? 0}
                        </div>
                        <div className="text-sm text-gray-400">Resolved</div>
                      </div>
                    </div>
                  </Card>

                  <Card className={`bg-gradient-to-br from-panel-bg/80 to-accent-bg/50 backdrop-blur-xl border-border-input p-8 hover-lift transition-all duration-700 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-highlight-glow/20 to-main-cta/20 rounded-full flex items-center justify-center">
                        <Activity className="w-5 h-5 text-highlight-glow" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">Recent Activity</h3>
                        <p className="text-gray-400">Your latest transactions</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-hide">
                      {userData?.recentTransactions && userData.recentTransactions.length > 0 ? (
                        userData.recentTransactions.map((transaction, index) => (
                          <div 
                            key={transaction.id} 
                            className={`flex items-center justify-between p-4 bg-dark-bg/30 rounded-lg hover:bg-dark-bg/50 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                            style={{ transitionDelay: `${800 + index * 100}ms` }}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-dark-bg/50 rounded-full flex items-center justify-center">
                                {getTransactionIcon(transaction.type)}
                              </div>
                              <div>
                                <div className="text-white font-medium">
                                  {transaction.type === 'DAILY_CLAIM' ? 'Daily Claim' :
                                   transaction.type === 'REFERRAL_BONUS' ? 'Referral Bonus' :
                                   transaction.type === 'BET_PLACED' ? 'Bet Placed' :
                                   transaction.type === 'BET_WON' ? 'Bet Won' :
                                   transaction.type === 'BET_LOST' ? 'Bet Lost' :
                                   'Transaction'}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {transaction.description || new Date(transaction.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className={`font-bold text-lg ${
                              transaction.amount > 0 ? 'text-main-cta' : 'text-soft-destructive'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-dark-bg/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <Activity className="w-8 h-8 text-gray-500" />
                          </div>
                          <div className="text-gray-400 text-lg">No recent activity</div>
                          <div className="text-gray-500 text-sm mt-2">Start claiming daily rewards and betting to see your activity!</div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
    </div>
  );
};

export default ProfileContent;