'use client';

import { Trophy, Star, Check, Award, Target, TrendingUp, TrendingDown, BarChart3, Rocket, Droplet } from 'lucide-react';
import { UserBadgeData, getBadgeTitle, getTierColor } from '@/lib/services/badge-service';
import { BadgeType, BadgeTier } from '@prisma/client';
import { useState } from 'react';

interface AchievementBadgesProps {
  badges: UserBadgeData[];
  activeBadgeId?: string;
  onBadgeSelect?: (badgeId: string | null) => void;
  showSelector?: boolean;
  className?: string;
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

const formatBadgeValue = (badge: UserBadgeData): string => {
  if (!badge.tier) return '';
  
  const tierThresholds = {
    BRONZE: 100,
    SILVER: 1000,
    GOLD: 10000,
    PLATINUM: 100000
  };
  
  const threshold = tierThresholds[badge.tier];
  
  switch (badge.badgeType) {
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

const getBadgeDescription = (badge: UserBadgeData): string => {
  switch (badge.badgeType) {
    case BadgeType.BETA_TESTER:
      return 'Early supporter who joined before August 1st, 2024';
    case BadgeType.OILY_OWNER:
      return 'Proud owner of Oily NFT collection';
    case BadgeType.FIRST_BET:
      return 'Placed your first prediction bet';
    case BadgeType.GAINS_TIER:
      return `Achieved ${getTierDisplayName(badge.tier!)} tier in total winnings`;
    case BadgeType.LOSSES_TIER:
      return `Reached ${getTierDisplayName(badge.tier!)} tier in total losses`;
    case BadgeType.VOLUME_TIER_CATEGORY:
      return `Achieved ${getTierDisplayName(badge.tier!)} tier volume in ${getCategoryDisplayName(badge.category!)}`;
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

const getCategoryDisplayName = (category: string): string => {
  switch (category) {
    case 'CRYPTO':
      return 'Crypto';
    case 'SPORTS':
      return 'Sports';
    case 'MEMECOINS':
      return 'Memecoins';
    case 'TECHNOLOGY':
      return 'Technology';
    case 'POLITICS':
      return 'Politics';
    case 'OTHER':
      return 'Other';
    default:
      return category;
  }
};

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

export function AchievementBadges({ 
  badges, 
  activeBadgeId, 
  onBadgeSelect, 
  showSelector = false,
  className = ''
}: AchievementBadgesProps) {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  const handleBadgeClick = (badgeId: string) => {
    if (!showSelector || !onBadgeSelect) return;
    
    if (badgeId === activeBadgeId) {
      onBadgeSelect(null);
    } else {
      onBadgeSelect(badgeId);
    }
  };

  if (badges.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-gray-300" />
          </div>
          <h4 className="font-medium text-white mb-1">No Achievements Yet</h4>
          <p className="text-sm text-gray-400">Start betting to unlock badges!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Achievements</h3>
            <p className="text-xs text-gray-400">{badges.length} earned</p>
          </div>
        </div>
        {showSelector && (
          <div className="text-xs text-gray-400 flex items-center space-x-1">
            <Star className="w-3 h-3" />
            <span>Click to display</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => {
          const isActive = badge.id === activeBadgeId;
          const isHovered = hoveredBadge === badge.id;
          const badgeTitle = getBadgeTitle(badge);
          const BadgeIcon = getBadgeIcon(badge.badgeType);
          const baseColor = getBadgeTypeColor(badge.badgeType);
          const tierColor = badge.tier ? getTierColor(badge.tier) : baseColor;
          const badgeDescription = getBadgeDescription(badge);
          const badgeValue = formatBadgeValue(badge);
          
          const tooltipContent = (
            <div className="text-center space-y-2">
              <div className="text-base font-bold text-white">{badgeTitle}</div>
              <div className="text-sm text-gray-300 leading-relaxed">{badgeDescription}</div>
              
              {badge.tier && (
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${tierColor}`} />
                  <span className="font-semibold text-white">{getTierDisplayName(badge.tier)} Tier</span>
                  {badge.category && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-300">{getCategoryDisplayName(badge.category)}</span>
                    </>
                  )}
                </div>
              )}
              
              {badgeValue && (
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                  <div className="text-sm font-mono text-gray-200">{badgeValue}</div>
                </div>
              )}
              
              <div className="text-xs text-gray-400 pt-1 border-t border-gray-700/50">
                Unlocked on {new Date(badge.unlockedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          );
          
          return (
            <Tooltip key={badge.id} content={tooltipContent} show={isHovered}>
              <div
                onClick={() => handleBadgeClick(badge.id)}
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
                className={`
                  relative w-12 h-12 rounded-full transition-all duration-300 
                  bg-gradient-to-br ${tierColor} shadow-xl
                  ${isActive 
                    ? 'ring-2 ring-[#ffd700] ring-offset-2 ring-offset-gray-900 scale-110 shadow-[0_0_20px_rgba(255,215,0,0.5)]' 
                    : 'hover:scale-110 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                  }
                  ${showSelector ? 'cursor-pointer' : ''}
                  flex items-center justify-center group
                  before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-black/20 before:opacity-80
                  after:absolute after:inset-0 after:rounded-full after:bg-gradient-to-t after:from-transparent after:via-white/10 after:to-white/30 after:opacity-60
                `}
              >
                <BadgeIcon className="relative z-10 w-5 h-5 text-white drop-shadow-lg group-hover:scale-110 transition-transform filter brightness-110" />
                
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-[#ffd700] to-[#ffed4e] rounded-full border-2 border-gray-900 flex items-center justify-center shadow-lg">
                    <Check className="w-2 h-2 text-gray-900" />
                  </div>
                )}
                
                <div className="absolute inset-0 rounded-full border border-white/20 shadow-inner" />
                
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform rotate-45" />
              </div>
            </Tooltip>
          );
        })}
      </div>
      
      {showSelector && activeBadgeId && (
        <div className="text-center pt-2">
          <button
            onClick={() => onBadgeSelect?.(null)}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors px-3 py-1 rounded-full border border-gray-600/50 hover:border-gray-500/50"
          >
            Remove display badge
          </button>
        </div>
      )}
    </div>
  );
}

interface ActiveBadgeDisplayProps {
  badge: UserBadgeData;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function ActiveBadgeDisplay({ 
  badge, 
  size = 'md',
  showTooltip = true 
}: ActiveBadgeDisplayProps) {
  const badgeTitle = getBadgeTitle(badge);
  const BadgeIcon = getBadgeIcon(badge.badgeType);
  const baseColor = getBadgeTypeColor(badge.badgeType);
  const tierColor = badge.tier ? getTierColor(badge.tier) : baseColor;
  
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

  return (
    <div
      className={`
        relative inline-flex items-center justify-center rounded-full
        bg-gradient-to-br ${tierColor} text-white shadow-lg
        ${sizeClasses[size]} hover:scale-110 transition-transform duration-200
        before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/30 before:via-transparent before:to-black/20 before:opacity-80
        after:absolute after:inset-0 after:rounded-full after:bg-gradient-to-t after:from-transparent after:via-white/10 after:to-white/30 after:opacity-60
      `}
      title={showTooltip ? badgeTitle : undefined}
    >
      <BadgeIcon className={`relative z-10 ${iconSizes[size]} drop-shadow-lg filter brightness-110`} />
      
      {/* Metallic rim effect */}
      <div className="absolute inset-0 rounded-full border border-white/20 shadow-inner" />
    </div>
  );
}