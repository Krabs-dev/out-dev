'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/loading-spinner';
import AnimatedBackground from '@/components/layout/animated-background';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatPoints, formatLeaderboardDate } from '@/lib/utils/format';
import { BadgeType, BadgeTier, MarketCategory } from '@prisma/client';
import { getBadgeTitle, getTierColor } from '@/lib/services/badge-service';
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp, 
  Users,
  Crown,
  Flame,
  TrendingDown,
  Rocket,
  Droplet,
  Target,
  BarChart3
} from 'lucide-react';

interface LeaderboardUser {
  rank: number;
  address: string;
  username: string;
  avatar: string;
  points: number;
  totalEarned: number;
  totalClaims: number;
  claimRate: string;
  trend: 'up' | 'down';
  lastActive: string;
  activeBadge?: {
    badgeType: string;
    tier?: string;
    category?: string;
  } | null;
}

interface LeaderboardData {
  leaderboard: LeaderboardUser[];
  currentUser: LeaderboardUser | null;
  totalUsers: number;
}

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  show: boolean;
}

function Tooltip({ children, content, show }: TooltipProps) {
  return (
    <div className="relative">
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl px-4 py-3 shadow-2xl border border-gray-600/50 backdrop-blur-sm max-w-sm min-w-[200px]">
            {content}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
}

const getTierDisplayName = (tier: BadgeTier) => {
  switch (tier) {
    case BadgeTier.BRONZE:
      return 'Bronze';
    case BadgeTier.SILVER:
      return 'Silver';
    case BadgeTier.GOLD:
      return 'Gold';
    case BadgeTier.PLATINUM:
      return 'Platinum';
    default:
      return '';
  }
};

const formatBadgeValue = (badgeType: BadgeType, tier: BadgeTier | null): string => {
  if (!tier) return '';
  
  const tierThresholds = {
    BRONZE: 100,
    SILVER: 1000,
    GOLD: 10000,
    PLATINUM: 100000
  };
  
  const threshold = tierThresholds[tier];
  
  switch (badgeType) {
    case BadgeType.GAINS_TIER:
      return `${threshold.toLocaleString()}+ points won`;
    case BadgeType.LOSSES_TIER:
      return `${threshold.toLocaleString()}+ points lost`;
    case BadgeType.VOLUME_TIER_CATEGORY:
      return `${threshold.toLocaleString()}+ volume`;
    default:
      return '';
  }
};

const getBadgeDescription = (badgeType: BadgeType, tier: BadgeTier | null, category: MarketCategory | null): string => {
  switch (badgeType) {
    case BadgeType.BETA_TESTER:
      return 'Early supporter who joined before August 1st, 2024';
    case BadgeType.OILY_OWNER:
      return 'Proud owner of Oily NFT collection';
    case BadgeType.FIRST_BET:
      return 'Placed your first prediction bet';
    case BadgeType.GAINS_TIER:
      return `Achieved ${getTierDisplayName(tier!)} tier in total winnings`;
    case BadgeType.LOSSES_TIER:
      return `Reached ${getTierDisplayName(tier!)} tier in total losses`;
    case BadgeType.VOLUME_TIER_CATEGORY:
      return `Achieved ${getTierDisplayName(tier!)} tier volume in ${getCategoryDisplayName(category!)}`;
    default:
      return 'Achievement unlocked';
  }
};

const getBadgeIcon = (badgeType: BadgeType) => {
  switch (badgeType) {
    case BadgeType.BETA_TESTER:
      return Rocket;
    case BadgeType.OILY_OWNER:
      return Droplet;
    case BadgeType.FIRST_BET:
      return Target;
    case BadgeType.GAINS_TIER:
      return TrendingUp;
    case BadgeType.LOSSES_TIER:
      return TrendingDown;
    case BadgeType.VOLUME_TIER_CATEGORY:
      return BarChart3;
    default:
      return Award;
  }
};

const getBadgeTypeColor = (badgeType: BadgeType): string => {
  switch (badgeType) {
    case BadgeType.BETA_TESTER:
      return 'from-[#9333ea] via-[#c084fc] to-[#7c3aed]';
    case BadgeType.OILY_OWNER:
      return 'from-[#ea580c] via-[#fb923c] to-[#dc2626]';
    case BadgeType.FIRST_BET:
      return 'from-[#0ea5e9] via-[#38bdf8] to-[#0369a1]';
    case BadgeType.GAINS_TIER:
      return 'from-[#059669] via-[#34d399] to-[#047857]';
    case BadgeType.LOSSES_TIER:
      return 'from-[#dc2626] via-[#f87171] to-[#b91c1c]';
    case BadgeType.VOLUME_TIER_CATEGORY:
      return 'from-[#7c3aed] via-[#a78bfa] to-[#6d28d9]';
    default:
      return 'from-[#6b7280] to-[#4b5563]';
  }
};

const getCategoryDisplayName = (category: MarketCategory): string => {
  switch (category) {
    case MarketCategory.CRYPTO:
      return 'Crypto';
    case MarketCategory.SPORTS:
      return 'Sports';
    case MarketCategory.MEMECOINS:
      return 'Memecoins';
    case MarketCategory.TECHNOLOGY:
      return 'Technology';
    case MarketCategory.POLITICS:
      return 'Politics';
    case MarketCategory.OTHER:
      return 'Other';
    default:
      return category;
  }
};

interface BadgeWithTooltipProps {
  badgeType: BadgeType;
  tier?: BadgeTier | null;
  category?: MarketCategory | null;
  size?: 'sm' | 'md' | 'lg';
}

function BadgeWithTooltip({ badgeType, tier, category, size = 'md' }: BadgeWithTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const badgeTitle = getBadgeTitle({
    id: '',
    badgeType,
    tier,
    category,
    isActive: true,
    unlockedAt: new Date(),
    value: undefined,
    metadata: undefined
  });
  
  const BadgeIcon = getBadgeIcon(badgeType);
  const baseColor = getBadgeTypeColor(badgeType);
  const tierColor = tier ? getTierColor(tier) : baseColor;
  const badgeDescription = getBadgeDescription(badgeType, tier || null, category || null);
  const badgeValue = formatBadgeValue(badgeType, tier || null);
  
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const tooltipContent = (
    <div className="text-center space-y-2">
      <div className="text-base font-bold text-white">{badgeTitle}</div>
      <div className="text-sm text-gray-300 leading-relaxed">{badgeDescription}</div>
      
      {tier && (
        <div className="flex items-center justify-center space-x-2 text-sm">
          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${tierColor}`} />
          <span className="font-semibold text-white">{getTierDisplayName(tier)} Tier</span>
          {category && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-gray-300">{getCategoryDisplayName(category)}</span>
            </>
          )}
        </div>
      )}
      
      {badgeValue && (
        <div className="bg-gray-800/50 rounded-lg px-3 py-2">
          <div className="text-sm font-mono text-gray-200">{badgeValue}</div>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} show={isHovered}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative inline-flex items-center justify-center rounded-full
          bg-gradient-to-br ${tierColor} text-white shadow-lg
          ${sizeClasses[size]} hover:scale-110 transition-transform duration-200
          before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-black/20 before:opacity-80
          after:absolute after:inset-0 after:rounded-full after:bg-gradient-to-t after:from-transparent after:via-white/10 after:to-white/30 after:opacity-60
        `}
      >
        <BadgeIcon className={`relative z-10 ${iconSizes[size]} drop-shadow-lg filter brightness-110`} />
        
        <div className="absolute inset-0 rounded-full border border-white/20 shadow-inner" />
      </div>
    </Tooltip>
  );
}

const LeaderboardContent = () => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const { address } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsAnimating(true);
        const response = await fetch('/api/leaderboard');
        if (response.ok) {
          const result = await response.json();
          setTimeout(() => {
            setData(result.data);
            setIsAnimating(false);
          }, 300);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setIsAnimating(false);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number, size: string = 'w-5 h-5') => {
    if (rank === 1) return <Trophy className={`${size} text-yellow-400 drop-shadow-lg`} />;
    if (rank === 2) return <Medal className={`${size} text-gray-300 drop-shadow-lg`} />;
    if (rank === 3) return <Award className={`${size} text-amber-500 drop-shadow-lg`} />;
    return <span className="text-gray-400 font-bold text-lg">#{rank}</span>;
  };




  const renderSimplePodium = () => {
    if (!data || data.leaderboard.length === 0) return null;

    const top3 = data.leaderboard.slice(0, 3);
    if (top3.length === 0) return null;

    return (
      <Card className="bg-gradient-to-br from-panel-bg to-accent-bg/30 border-border-input overflow-hidden mb-8">
        <div className="p-6 border-b border-border-input bg-gradient-to-r from-accent-bg/50 to-transparent">
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <Crown className="w-6 h-6 text-yellow-400" />
            Top 3 Champions
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            The elite performers leading the board
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((user, index) => (
              <div 
                key={user.address}
                className={`relative group ${
                  index === 0 ? 'sm:order-2' : index === 1 ? 'sm:order-1' : 'sm:order-3'
                }`}
              >
                <Card className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                  user.rank === 1 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/30' 
                    : user.rank === 2 
                    ? 'bg-gradient-to-br from-gray-300/20 to-gray-400/10 border-gray-300/30'
                    : 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30'
                } ${
                  user.address === address ? 'ring-2 ring-main-cta' : ''
                }`}>
                  <div className="p-4 text-center">
                    <div className="flex justify-center mb-3">
                      {getRankIcon(user.rank, 'w-8 h-8')}
                    </div>
                    
                    <div className="relative mb-3">
                      <Avatar className={`w-16 h-16 mx-auto border-2 ${
                        user.rank === 1 ? 'border-yellow-400' : 
                        user.rank === 2 ? 'border-gray-300' : 
                        'border-amber-500'
                      }`}>
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-main-cta to-secondary-cta text-white font-bold">
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {user.address === address && (
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2">
                          <Badge className="bg-main-cta text-white text-xs sm:text-xs font-bold px-1 py-0.5 sm:px-2 sm:py-1 shadow-lg">
                            YOU
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h4 className="font-bold text-white text-sm truncate">
                        {user.username}
                      </h4>
                      {user.activeBadge && (
                        <BadgeWithTooltip 
                          badgeType={user.activeBadge.badgeType as BadgeType}
                          tier={user.activeBadge.tier as BadgeTier}
                          category={user.activeBadge.category as MarketCategory}
                          size="sm"
                        />
                      )}
                    </div>
                    
                    <div className="text-2xl font-black bg-gradient-to-r from-highlight-glow to-yellow-400 bg-clip-text text-transparent mb-2">
                      {formatPoints(user.points)}
                    </div>
                    
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-gray-400">Claims</div>
                        <div className="text-white font-semibold">{user.totalClaims}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Rate</div>
                        <div className="text-white font-semibold">{user.claimRate}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  };

  const renderLeaderboardTable = () => {
    if (!data || data.leaderboard.length === 0) return null;

    return (
      <Card className="bg-gradient-to-br from-panel-bg to-accent-bg/30 border-border-input overflow-hidden">
        <div className="p-6 border-b border-border-input bg-gradient-to-r from-accent-bg/50 to-transparent">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-main-cta" />
            Complete Rankings
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            All {data.leaderboard.length} champions ranked by points
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-input bg-accent-bg/20">
                <th className="text-left text-gray-400 p-4 font-semibold">Rank</th>
                <th className="text-left text-gray-400 p-4 font-semibold">User</th>
                <th className="text-right text-gray-400 p-4 font-semibold">Points</th>
                <th className="text-right text-gray-400 p-4 font-semibold hidden sm:table-cell">Claims</th>
                <th className="text-right text-gray-400 p-4 font-semibold hidden md:table-cell">Rate</th>
                <th className="text-center text-gray-400 p-4 font-semibold hidden lg:table-cell">Last Active</th>
                <th className="text-center text-gray-400 p-4 font-semibold hidden sm:table-cell">Trend</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((user) => (
                <tr 
                  key={user.address} 
                  className={`border-b border-border-input/30 hover:bg-accent-bg/30 transition-all duration-200 group ${
                    user.address === address ? 'bg-main-cta/10 border-main-cta/30' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center">
                      {getRankIcon(user.rank)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-semibold mb-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="truncate">{user.username}</span>
                              {user.activeBadge && (
                                <BadgeWithTooltip 
                                  badgeType={user.activeBadge.badgeType as BadgeType}
                                  tier={user.activeBadge.tier as BadgeTier}
                                  category={user.activeBadge.category as MarketCategory}
                                  size="sm"
                                />
                              )}
                            </div>
                            {user.address === address && (
                              <Badge className="bg-main-cta text-white text-xs font-bold px-2 py-0.5 shrink-0">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-highlight-glow font-bold text-lg">
                      {formatPoints(user.points)}
                    </div>
                  </td>
                  <td className="p-4 text-right text-white font-medium hidden sm:table-cell">
                    {user.totalClaims}
                  </td>
                  <td className="p-4 text-right text-white font-medium hidden md:table-cell">
                    {user.claimRate}
                  </td>
                  <td className="p-4 text-center text-gray-400 text-sm hidden lg:table-cell">
                    {formatLeaderboardDate(user.lastActive)}
                  </td>
                  <td className="p-4 text-center hidden sm:table-cell">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto ${
                      user.trend === 'up' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {user.trend === 'up' ? 
                        <TrendingUp className="w-3 h-3 text-white" /> : 
                        <TrendingDown className="w-3 h-3 text-white" />
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="md:ml-16 pt-16 md:pt-16 min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-panel-bg relative overflow-hidden">
        <AnimatedBackground />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8 relative z-10">
          <div className="flex items-center justify-center min-h-96">
            <LoadingSpinner 
              size="lg" 
              message="Loading Champions" 
              subtitle="Fetching the elite performers..."
            />
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="md:ml-16 pt-16 md:pt-16 min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-panel-bg">
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No Data Available</h3>
            <p className="text-gray-400">Failed to load leaderboard. Please try again later.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="md:ml-16 pt-16 md:pt-16 min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-panel-bg relative overflow-hidden">
      <AnimatedBackground />

      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8 relative z-10">
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-500/10 rounded-3xl blur-xl" />
            
            <div className="relative bg-gradient-to-r from-panel-bg/80 to-accent-bg/40 backdrop-blur-sm rounded-2xl border border-border-input/50 p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="relative">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-xl">
                        <Crown className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-panel-bg animate-pulse flex items-center justify-center">
                        <Flame className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                        Leaderboard
                      </h1>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 text-sm font-medium">Live Rankings</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {data.totalUsers.toLocaleString()} champions competing
                    </span>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>

        {data.currentUser && (
          <div className="mb-8">
            <Card className={`bg-gradient-to-r from-main-cta/10 to-secondary-cta/10 border-2 border-main-cta/50 p-4 sm:p-6 relative overflow-hidden group hover:shadow-2xl transition-all duration-500 ${
              isAnimating ? 'animate-pulse' : ''
            }`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-main-cta/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <div className="relative z-10">
                <div className="block md:hidden space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-main-cta to-secondary-cta rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-lg">
                        #{data.currentUser.rank}
                      </div>
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-yellow-500 text-black font-bold shadow-lg text-xs px-1.5 py-0.5">
                          YOU
                        </Badge>
                      </div>
                    </div>
                    
                    <Avatar className="w-12 h-12 border-3 border-main-cta shadow-lg">
                      <AvatarImage src={data.currentUser.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-main-cta to-secondary-cta text-white text-sm font-bold">
                        {data.currentUser.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white truncate">
                          {data.currentUser.username}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          data.currentUser.trend === 'up' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {data.currentUser.trend === 'up' ? 
                            <TrendingUp className="w-2.5 h-2.5 text-white" /> : 
                            <TrendingDown className="w-2.5 h-2.5 text-white" />
                          }
                        </div>
                        <span className={`text-xs font-medium ${
                          data.currentUser.trend === 'up' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {data.currentUser.trend === 'up' ? 'Rising' : 'Falling'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center bg-accent-bg/20 rounded-xl p-3">
                    <div className="text-2xl font-black bg-gradient-to-r from-highlight-glow to-yellow-400 bg-clip-text text-transparent">
                      {formatPoints(data.currentUser.points)}
                      <span className="text-sm text-gray-400 ml-1">points</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-accent-bg/20 rounded-lg p-3 text-center">
                      <div className="text-gray-400 text-xs mb-1">Claims</div>
                      <div className="text-white font-bold text-lg">{data.currentUser.totalClaims}</div>
                    </div>
                    <div className="bg-accent-bg/20 rounded-lg p-3 text-center">
                      <div className="text-gray-400 text-xs mb-1">Rate</div>
                      <div className="text-white font-bold text-lg">{data.currentUser.claimRate}</div>
                    </div>
                  </div>
                  
                </div>

                <div className="hidden md:flex items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-r from-main-cta to-secondary-cta rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-xl">
                        #{data.currentUser.rank}
                      </div>
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-yellow-500 text-black font-bold shadow-lg animate-bounce">
                          YOU
                        </Badge>
                      </div>
                    </div>
                    
                    <Avatar className="w-16 h-16 border-4 border-main-cta shadow-xl">
                      <AvatarImage src={data.currentUser.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-main-cta to-secondary-cta text-white text-xl font-bold">
                        {data.currentUser.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold text-white">
                          {data.currentUser.username}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          data.currentUser.trend === 'up' ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {data.currentUser.trend === 'up' ? 
                            <TrendingUp className="w-3 h-3 text-white" /> : 
                            <TrendingDown className="w-3 h-3 text-white" />
                          }
                        </div>
                        <span className={`text-sm font-medium ${
                          data.currentUser.trend === 'up' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {data.currentUser.trend === 'up' ? 'Rising' : 'Falling'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center bg-accent-bg/20 rounded-xl p-4">
                      <div className="text-3xl font-black bg-gradient-to-r from-highlight-glow to-yellow-400 bg-clip-text text-transparent mb-1">
                        {formatPoints(data.currentUser.points)}
                      </div>
                      <div className="text-gray-400 text-sm">Points</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-accent-bg/20 rounded-lg p-3">
                        <div className="text-white font-bold text-lg">{data.currentUser.totalClaims}</div>
                        <div className="text-gray-400 text-xs">Claims</div>
                      </div>
                      <div className="text-center bg-accent-bg/20 rounded-lg p-3">
                        <div className="text-white font-bold text-lg">{data.currentUser.claimRate}</div>
                        <div className="text-gray-400 text-xs">Rate</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {data.leaderboard.length > 0 ? (
          <div className="space-y-8">
            {renderSimplePodium()}
            {renderLeaderboardTable()}
          </div>
        ) : (
          <Card className="bg-gradient-to-br from-panel-bg to-accent-bg/30 border-border-input p-12 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold text-white mb-2">No Champions Yet</h3>
            <p className="text-gray-400">Be the first to start claiming daily points and climb the ranks!</p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default LeaderboardContent;