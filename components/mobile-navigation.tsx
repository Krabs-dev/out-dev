'use client';

import { useState, useEffect, useCallback } from 'react';
import { useClientMount } from '@/lib/hooks/useClientMount';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUserDataRefresh } from '@/contexts/user-data-context';
import { useDrawer } from '@/contexts/drawer-context';
import { 
  User, 
  Trophy, 
  ArrowUpDown,
  Gift,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
  points: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
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

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MobileNavigation = () => {
  const hasMounted = useClientMount();
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const pathname = usePathname();
  const { toast } = useToast();
  const { isFullyAuthenticated } = useAuth();
  const { setRefreshFunction, refreshUserData } = useUserDataRefresh();
  const { isDrawerOpen } = useDrawer();

  const navItems: NavItem[] = [
    { path: '/', label: 'Markets', icon: ArrowUpDown },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

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

  useEffect(() => {
    if (isFullyAuthenticated) {
      fetchUserData();
      fetchClaimStatus();
    } else {
      setUserData(null);
      setClaimStatus(null);
    }
  }, [isFullyAuthenticated]);

  useEffect(() => {
    const refreshFunction = () => {
      fetchUserData();
      fetchClaimStatus();
    };
    setRefreshFunction(refreshFunction);
  }, [setRefreshFunction]);

  useEffect(() => {
    if (!hasMounted) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (window.innerWidth >= 768) {
            ticking = false;
            return;
          }

          const mainContent = document.querySelector('[data-scroll-area]') as HTMLElement;
          const currentScrollY = mainContent ? mainContent.scrollTop : window.scrollY;
          
          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }
          
          if (currentScrollY <= 50) {
            setIsVisible(true);
            setLastScrollY(currentScrollY);
            ticking = false;
            return;
          }
          
          const isScrollingDown = currentScrollY > lastScrollY + 20;
          const isScrollingUp = currentScrollY < lastScrollY - 20;
          
          if (isScrollingDown && currentScrollY > 100) {
            setIsVisible(false);
          } else if (isScrollingUp) {
            setIsVisible(true);
          }
          
          const timeout = setTimeout(() => {
            setIsVisible(true);
          }, 3000);
          
          setHideTimeout(timeout);
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleTouchStart = () => {
      if (window.innerWidth < 768) {
        setIsVisible(true);
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          setHideTimeout(null);
        }
      }
    };

    const mainContent = document.querySelector('[data-scroll-area]');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      
      if (mainContent) {
        mainContent.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
      
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [hasMounted, lastScrollY, hideTimeout]);

  useEffect(() => {
    if (!claimStatus?.nextClaimIn) return;

    const claimTime = Date.now() + claimStatus.nextClaimIn;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = claimTime - now;
      
      if (remaining <= 0) {
        setTimeUntilNextClaim('Ready!');
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
  }, [claimStatus]);

  const handleClaimDailyPoints = async () => {
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


  if (!hasMounted) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-panel-bg to-panel-bg/95 backdrop-blur-xl border-t border-border-input z-40 md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          <div className="h-12 w-12 bg-accent-bg/50 rounded-xl animate-pulse" />
          <div className="h-12 w-12 bg-accent-bg/50 rounded-xl animate-pulse" />
          <div className="h-12 w-12 bg-accent-bg/50 rounded-xl animate-pulse" />
          <div className="h-12 w-12 bg-accent-bg/50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bottom Tab Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-gradient-to-t from-panel-bg to-panel-bg/95 backdrop-blur-xl border-t border-border-input z-40 md:hidden transition-all duration-300 ease-out",
        (isVisible && !isDrawerOpen) ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-12 w-12 rounded-xl transition-all duration-300 relative",
                    isActive 
                      ? 'bg-gradient-to-br from-main-cta/20 to-main-cta/10 text-main-cta border border-main-cta/30 scale-110' 
                      : 'text-gray-400 hover:text-white hover:bg-accent-bg/50 hover:scale-105'
                  )}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-main-cta rounded-full animate-pulse" />
                  )}
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "scale-110"
                  )} />
                </Button>
              </Link>
            );
          })}
          
          {/* Menu/Drawer Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuDrawerOpen(true)}
            className="h-12 w-12 rounded-xl text-gray-400 hover:text-white hover:bg-accent-bg/50 hover:scale-105 transition-all duration-300"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Drawer Backdrop */}
      {isMenuDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setIsMenuDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-gradient-to-t from-panel-bg to-panel-bg/95 backdrop-blur-xl border-t border-border-input rounded-t-3xl z-50 md:hidden transition-all duration-300 ease-out",
        isMenuDrawerOpen ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Drawer Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-input">
          <h3 className="text-lg font-semibold text-white">Menu</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuDrawerOpen(false)}
            className="h-8 w-8 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Connection Prompt for Disconnected Users */}
          {!isFullyAuthenticated && (
            <div className="bg-gradient-to-r from-main-cta/10 to-highlight-glow/10 border border-main-cta/30 rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-main-cta/20 to-highlight-glow/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Gift className="w-8 h-8 text-main-cta" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Connect to Start Betting</h3>
              <p className="text-gray-300 text-sm mb-4">
                Join the prediction market and start earning rewards! Connect your wallet to claim daily points and place bets.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-main-cta rounded-full"></div>
                    <span>1000 daily points</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-highlight-glow rounded-full"></div>
                    <span>Live betting</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Points Balance */}
          {isFullyAuthenticated && (
            <div className="bg-gradient-to-r from-highlight-glow/10 to-main-cta/10 border border-highlight-glow/20 rounded-2xl p-4">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Available Points</div>
                {userData?.points ? (
                  <div className="text-2xl font-bold bg-gradient-to-r from-highlight-glow to-main-cta bg-clip-text text-transparent">
                    {userData.points.balance.toLocaleString()}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-gray-500">Loading...</div>
                )}
              </div>
            </div>
          )}

          {/* Daily Claim */}
          {isFullyAuthenticated && (
            <div className="space-y-3">
              <h4 className="text-white font-medium">Daily Rewards</h4>
              <Button 
                onClick={handleClaimDailyPoints}
                disabled={!claimStatus?.canClaim || isClaimingDaily}
                className="w-full bg-gradient-to-r from-highlight-glow/20 to-main-cta/20 hover:from-highlight-glow/30 hover:to-main-cta/30 text-white border border-highlight-glow/30 rounded-xl h-14 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                variant="outline"
              >
                <Gift className="w-5 h-5 mr-3" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">
                    {isClaimingDaily ? 'Claiming...' : claimStatus?.canClaim ? 'Claim 1000 Points' : 'Already Claimed'}
                  </span>
                  {!claimStatus?.canClaim && timeUntilNextClaim && (
                    <span className="text-xs text-gray-400">Next: {timeUntilNextClaim}</span>
                  )}
                </div>
              </Button>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default MobileNavigation;