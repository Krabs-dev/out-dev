'use client';

import { useState, useEffect } from 'react';
import { useClientMount } from '@/lib/hooks/useClientMount';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ModernConnectWallet } from '@/components/modern-connect-wallet';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUserDataRefresh } from '@/contexts/user-data-context';
import { useDrawer } from '@/contexts/drawer-context';
import { usePathname } from 'next/navigation';
import { 
  Gift,
  Trophy,
  Sparkles,
  Home
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';


const ModernHeader = () => {
  const hasMounted = useClientMount();
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState<string>('');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const { address, isFullyAuthenticated } = useAuth();
  const { userData, claimStatus, setRefreshFunction, refreshUserData, triggerRefresh } = useUserDataRefresh();
  const pathname = usePathname();
  const { isDrawerOpen } = useDrawer();


  useEffect(() => {
    if (isFullyAuthenticated) {
      triggerRefresh();
    }
  }, [isFullyAuthenticated, triggerRefresh]);

  useEffect(() => {
    const refreshFunction = () => {
      if (isFullyAuthenticated) {
        triggerRefresh();
      }
    };
    setRefreshFunction(refreshFunction);
  }, [setRefreshFunction, triggerRefresh, isFullyAuthenticated]);

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
            setIsHeaderVisible(true);
            setLastScrollY(currentScrollY);
            ticking = false;
            return;
          }
          
          const isScrollingDown = currentScrollY > lastScrollY + 20;
          const isScrollingUp = currentScrollY < lastScrollY - 20;
          
          if (isScrollingDown && currentScrollY > 100) {
            setIsHeaderVisible(false);
          } else if (isScrollingUp) {
            setIsHeaderVisible(true);
          }
          
          const timeout = setTimeout(() => {
            setIsHeaderVisible(true);
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
        setIsHeaderVisible(true);
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
  }, [hasMounted, lastScrollY]);

  useEffect(() => {
    if (!claimStatus?.nextClaimIn) return;

    const claimTime = Date.now() + claimStatus.nextClaimIn;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = claimTime - now;
      
      if (remaining <= 0) {
        setTimeUntilNextClaim('Ready!');
        triggerRefresh();
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

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!hasMounted) {
    return (
      <header className={`fixed top-0 right-0 left-0 md:left-16 bg-gradient-to-r from-panel-bg/80 to-panel-bg/60 backdrop-blur-xl border-b border-border-input z-40 transition-all duration-300 ease-out ${
        (isHeaderVisible && !isDrawerOpen) ? 'translate-y-0' : '-translate-y-full md:translate-y-0'
      }`}>
        <div className="flex items-center justify-between h-16 px-6">
          <div className="md:hidden">
            <h1 className="text-xl font-bold bg-gradient-to-r from-main-cta to-highlight-glow bg-clip-text text-transparent">
              PredictMarket
            </h1>
          </div>
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-white opacity-90">
              Welcome to the Future of Predictions
            </h2>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="h-10 w-24 bg-accent-bg/50 rounded-xl animate-pulse"></div>
            <div className="h-10 w-32 bg-accent-bg/50 rounded-xl animate-pulse"></div>
          </div>
          <div className="md:hidden">
            <div className="h-12 w-36 bg-gradient-to-r from-accent-bg/50 to-accent-bg/30 rounded-xl animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`fixed top-0 right-0 left-0 md:left-16 bg-gradient-to-r from-panel-bg/80 to-panel-bg/60 backdrop-blur-xl border-b border-border-input z-40 transition-all duration-300 ease-out ${
      (isHeaderVisible && !isDrawerOpen) ? 'translate-y-0' : '-translate-y-full md:translate-y-0'
    }`}>
      <div className="flex items-center justify-between h-16 px-6">
        <div className="md:hidden">
          <h1 className="text-xl font-bold bg-gradient-to-r from-main-cta to-highlight-glow bg-clip-text text-transparent">
            PredictMarket
          </h1>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          {pathname !== '/markets' && pathname !== '/welcome' && pathname !== '/' && (
            <Link href="/markets">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-accent-bg/50 transition-all duration-300 hover:scale-105"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
          )}
          <h2 className="text-lg font-semibold text-white opacity-90">
            Welcome to the Future of Predictions
          </h2>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          {isFullyAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative h-10 w-10 rounded-full transition-all duration-300 hover:scale-110",
                    claimStatus?.canClaim 
                      ? "text-highlight-glow hover:bg-highlight-glow/10 animate-pulse [animation-duration:3s]" 
                      : "text-gray-400 hover:text-white hover:bg-accent-bg/50"
                  )}
                >
                  <Gift className="w-5 h-5" />
                  {claimStatus?.canClaim && (
                    <>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-main-cta to-highlight-glow rounded-full animate-ping [animation-duration:2s]" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-main-cta to-highlight-glow rounded-full" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-panel-bg border-border-input rounded-xl shadow-2xl">
                <DropdownMenuLabel className="text-white font-semibold px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-highlight-glow" />
                    <span>Daily Rewards</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border-input" />
                <DropdownMenuItem 
                  onClick={handleClaimDailyPoints}
                  disabled={!claimStatus?.canClaim || isClaimingDaily}
                  className="text-gray-300 hover:text-white hover:bg-accent-bg/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mx-2 rounded-lg transition-all duration-200"
                >
                  <Gift className="w-4 h-4 mr-3" />
                  <div className="flex flex-col">
                    <span>{isClaimingDaily ? 'Claiming...' : claimStatus?.canClaim ? 'Claim 1000 Points' : 'Already Claimed'}</span>
                    {!claimStatus?.canClaim && timeUntilNextClaim && (
                      <span className="text-xs text-gray-500">Next: {timeUntilNextClaim}</span>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-accent-bg/50 mx-2 rounded-lg">
                  <Link href="/profile">
                    <Trophy className="w-4 h-4 mr-3" />
                    View Rewards History
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isFullyAuthenticated && (
            <div className="bg-gradient-to-r from-accent-bg/50 to-accent-bg/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-border-input/50 min-w-[120px] transition-all duration-300 hover:scale-105">
              <div className="text-center">
                <div className="text-xs text-gray-400 font-medium">Points</div>
                {userData?.points ? (
                  <div className="text-sm font-bold bg-gradient-to-r from-highlight-glow to-main-cta bg-clip-text text-transparent">
                    {userData.points.balance.toLocaleString()}
                  </div>
                ) : (
                  <div className="text-sm font-bold text-gray-500">...</div>
                )}
              </div>
            </div>
          )}

          <div className="transition-all duration-300 hover:scale-105">
            <ModernConnectWallet />
          </div>

          {isFullyAuthenticated && address && (
            <Link href="/profile">
              <Avatar className="w-10 h-10 cursor-pointer ring-2 ring-main-cta/20 hover:ring-main-cta/60 transition-all duration-300 hover:scale-110">
                <AvatarImage src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`} />
                <AvatarFallback className="bg-gradient-to-br from-accent-bg to-accent-bg/80 text-white text-xs">
                  {formatAddress(address).slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
        </div>

        <div className="md:hidden">
          <ModernConnectWallet />
        </div>
      </div>
    </header>
  );
};

export default ModernHeader;