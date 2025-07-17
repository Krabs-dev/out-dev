'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, CheckCircle, DollarSign, TrendingUp, Zap, Target, ArrowUp, ArrowDown, Clock, Info, HelpCircle, BookOpen, Share2, Copy, Check, AlertTriangle, Gift, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUserDataRefresh } from '@/contexts/user-data-context';
import { useAuth } from '@/lib/hooks/useAuth';
import { useDrawer } from '@/contexts/drawer-context';
import { ModernConnectWallet } from '@/components/modern-connect-wallet';

interface ParimutuelInfo {
  marketId: string;
  odds: {
    yesOdds: number;
    noOdds: number;
    yesPercentage: number;
    noPercentage: number;
    totalPool: number;
    yesPool: number;
    noPool: number;
  };
  userBet?: {
    outcome: boolean;
    pointsWagered: number;
    potentialPayout: number;
  };
  recentBets: Array<{
    id: string;
    outcome: boolean;
    pointsWagered: number;
    userAddress: string;
    createdAt: string;
  }>;
}


interface ModernBetDrawerProps {
  bet: {
    id: string;
    title: string;
    image: string;
    description: string;
    sourceUrl?: string;
    timeRemaining: string;
    isClosed: boolean;
  };
  onClose: () => void;
  onBetPlaced?: () => void;
  referralCode?: string;
}

type BetState = 'idle' | 'loading' | 'success' | 'error';

export default function ModernBetDrawer({ bet, onClose, onBetPlaced, referralCode }: ModernBetDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no' | null>(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [betState, setBetState] = useState<BetState>('idle');
  const [parimutuelInfo, setParimutuelInfo] = useState<ParimutuelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showParimutuelInfo, setShowParimutuelInfo] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInsufficientFundsDialog, setShowInsufficientFundsDialog] = useState(false);
  const [claimingDaily, setClaimingDaily] = useState(false);

  const handleShowDescription = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDescriptionExpanded(true);
  }, []);

  const handleHideDescription = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDescriptionExpanded(false);
  }, []);
  const drawerRef = useRef<HTMLDivElement>(null);
  const { userData, claimStatus, refreshUserData } = useUserDataRefresh();
  const userPoints = userData?.points?.balance || 0;
  const canClaimDaily = claimStatus?.canClaim || false;
  const { isFullyAuthenticated } = useAuth();
  const { openDrawer, closeDrawer } = useDrawer();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 100);
    document.body.style.overflow = 'hidden';
    openDrawer();
    
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'unset';
      closeDrawer();
    };
  }, [mounted, openDrawer, closeDrawer]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/markets/${bet.id}/parimutuel-info`);
        
        if (response.ok) {
          const parimutuelData = await response.json();
          setParimutuelInfo(parimutuelData.data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bet.id, isFullyAuthenticated]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 700);
  };

  const handleBetSubmit = async () => {
    if (!isFullyAuthenticated) return;
    
    const existingBet = parimutuelInfo?.userBet;
    const finalOutcome = existingBet ? existingBet.outcome : (selectedSide === 'yes');
    
    if (!existingBet && !selectedSide) {
      setErrorMessage('Please select YES or NO');
      toast.error('Please select YES or NO');
      return;
    }
    
    if (!pointsAmount) {
      setErrorMessage('Please enter an amount');
      toast.error('Please enter an amount');
      return;
    }

    const pointsNumber = parseInt(pointsAmount);
    if (isNaN(pointsNumber) || pointsNumber <= 0) {
      setErrorMessage('Please enter a valid amount of points');
      toast.error('Please enter a valid amount of points');
      return;
    }

    if (pointsNumber > userPoints) {
      setErrorMessage(`Insufficient points. You have ${userPoints} points but need ${pointsNumber} points.`);
      setShowInsufficientFundsDialog(true);
      return;
    }

    setBetState('loading');
    setErrorMessage(null);
    
    try {
      const response = await fetch(`/api/markets/${bet.id}/bet-parimutuel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome: finalOutcome,
          amount: existingBet ? existingBet.pointsWagered + pointsNumber : pointsNumber,
          referralCode
        })
      });

      if (response.ok) {
        setBetState('success');
        const actionText = existingBet ? `Added ${pointsNumber} points to your ${finalOutcome ? 'YES' : 'NO'} bet` : `Bet ${pointsNumber} points on ${finalOutcome ? 'YES' : 'NO'}`;
        toast.success(actionText);
        refreshUserData();
        onBetPlaced?.();
        setTimeout(handleClose, 2000);
      } else {
        const error = await response.json();
        const errorMsg = error.message || error.error || 'Failed to place bet';
        
        if (response.status === 400 && errorMsg.toLowerCase().includes('insufficient')) {
          setErrorMessage(`Insufficient points. You have ${userPoints} points but need ${pointsNumber} points.`);
          setShowInsufficientFundsDialog(true);
        } else if (response.status === 403 && errorMsg.toLowerCase().includes('beta')) {
          setErrorMessage(errorMsg);
          toast.error(errorMsg);
        } else {
          setErrorMessage(errorMsg);
          toast.error(errorMsg);
        }
        setBetState('error');
      }
    } catch {
      const errorMsg = 'Network error. Please try again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      setBetState('error');
    }
  };

  const calculatePotentialPayout = () => {
    if (!parimutuelInfo || !pointsAmount || !selectedSide) return 0;
    
    const amount = parseInt(pointsAmount);
    const outcome = selectedSide === 'yes';
    
    const currentPool = outcome ? parimutuelInfo.odds.yesPool : parimutuelInfo.odds.noPool;
    const newPool = currentPool + amount;
    const totalPool = parimutuelInfo.odds.totalPool + amount;
    
    if (newPool === 0) return amount;
    
    return Math.floor((amount * totalPool) / newPool);
  };

  const calculateDynamicOdds = (outcome: boolean) => {
    if (!parimutuelInfo) return 1;
    
    if (!pointsAmount || pointsAmount === '') {
      return outcome ? parimutuelInfo.odds.yesOdds : parimutuelInfo.odds.noOdds;
    }
    
    const amount = parseInt(pointsAmount);
    if (isNaN(amount) || amount <= 0) {
      return outcome ? parimutuelInfo.odds.yesOdds : parimutuelInfo.odds.noOdds;
    }
    
    const currentPool = outcome ? parimutuelInfo.odds.yesPool : parimutuelInfo.odds.noPool;
    const newPool = currentPool + amount;
    const newTotalPool = parimutuelInfo.odds.totalPool + amount;
    
    if (newPool === 0) return 1;
    
    return newTotalPool / newPool;
  };

  const getQuickAmount = (percentage: number) => {
    return Math.floor(userPoints * percentage);
  };

  const handleShare = async () => {
    if (!isFullyAuthenticated) return;
    
    setIsSharing(true);
    try {
      const response = await fetch(`/api/markets/${bet.id}/share`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.data.shareUrl);
        toast.success('Share link generated!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to generate share link');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleClaimDaily = async () => {
    if (!canClaimDaily || claimingDaily) return;
    
    setClaimingDaily(true);
    try {
      const response = await fetch('/api/daily-claim', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`Claimed ${data.data.claim.totalAmount} daily points!`);
        setShowInsufficientFundsDialog(false);
        setErrorMessage(null);
        refreshUserData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to claim daily points');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setClaimingDaily(false);
    }
  };

  const scrollToPayoutSection = () => {
    setTimeout(() => {
      if (window.innerWidth < 768 && drawerRef.current) {
        const scrollableElement = drawerRef.current.querySelector('.flex-1.overflow-y-auto');
        if (scrollableElement) {
          scrollableElement.scrollTo({
            top: scrollableElement.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    }, 100);
  };

  if (!mounted) return null;

  const drawerContent = (
    <div className={`fixed inset-0 z-[9999] transition-all duration-300 ${
      isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`}>
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <div 
        ref={drawerRef}
        className={`absolute left-0 right-0 bottom-0 md:top-0 md:bottom-0 md:right-0 md:left-[calc(100%-480px)] lg:left-[calc(100%-520px)] md:w-[480px] lg:w-[520px] bg-gradient-to-br from-panel-bg via-panel-bg to-accent-bg/30 md:rounded-tl-3xl md:rounded-bl-3xl rounded-t-3xl border-t md:border-l border-border-input/50 shadow-2xl transition-all duration-700 ease-out max-h-[90vh] md:max-h-full flex flex-col ${
          isOpen 
            ? 'translate-y-0 md:translate-y-0 md:translate-x-0' 
            : 'translate-y-full md:translate-y-0 md:translate-x-full'
        }`}
      >
        <div className="relative p-6 border-b border-border-input/30 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-main-cta/5 to-highlight-glow/5" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-main-cta to-highlight-glow rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Place Your Bet</h2>
              </div>
              
              <button
                onClick={() => setShowParimutuelInfo(!showParimutuelInfo)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-all duration-300 group"
              >
                <BookOpen className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                <span className="text-blue-400 group-hover:text-blue-300 text-sm font-medium">
                  How Parimutuel Betting Works
                </span>
                <HelpCircle className="w-3 h-3 text-blue-400/70 group-hover:text-blue-300" />
              </button>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-accent-bg/50 p-2 z-50"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {showParimutuelInfo && (
            <div className="absolute top-full left-6 right-6 mt-2 bg-gradient-to-br from-blue-900/40 to-purple-900/40 backdrop-blur-md border border-blue-500/30 rounded-xl p-4 z-50 animate-fade-in-up">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-sm mb-2">Parimutuel Betting System</h4>
                  <div className="text-gray-300 text-xs space-y-2">
                    <p>
                      <strong className="text-blue-300">Pool-based betting:</strong> All bets go into shared YES and NO pools.
                    </p>
                    <p>
                      <strong className="text-green-300">Dynamic odds:</strong> Your payout depends on the final pool ratio when the market closes.
                    </p>
                    <p>
                      <strong className="text-yellow-300">Fair distribution:</strong> Winners share the losing side&apos;s pool proportionally to their bet size.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowParimutuelInfo(false)}
                    className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Got it, close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {isDescriptionExpanded && (
            <div className="absolute inset-0 z-50 bg-gradient-to-br from-panel-bg via-panel-bg to-accent-bg/30 flex flex-col">
              <div className="p-6 border-b border-border-input/30 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Market Details</h2>
                  </div>
                  <button
                    onClick={handleHideDescription}
                    className="bg-accent-bg/50 backdrop-blur-sm p-2 rounded-full border border-border-input/30 text-gray-300 hover:text-white hover:bg-accent-bg transition-all duration-300 hover:scale-110"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-white font-bold text-lg mb-4">{bet.title}</h3>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 text-base leading-relaxed whitespace-pre-wrap">
                    {bet.description}
                  </p>
                </div>
                
                <div className="mt-6 pt-4 border-t border-border-input/20">
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Ends {bet.timeRemaining}</span>
                    </div>
                    <Badge className="bg-main-cta/10 text-main-cta border-main-cta/20">
                      Live Trading
                    </Badge>
                  </div>
                  {bet.sourceUrl && (
                    <div className="mt-4 pt-4 border-t border-border-input/20">
                      <div className="flex items-center gap-2 mb-2">
                        <ExternalLink className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Resolution Source</span>
                      </div>
                      <a
                        href={bet.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-500/30 rounded-lg transition-all duration-300 text-blue-300 hover:text-blue-200 text-sm"
                      >
                        <span>View official source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-xs text-gray-500 mt-2">
                        This market will be resolved using this official source
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="relative rounded-2xl">
            <div className="relative h-[200px] rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
              <img 
                src={bet.image} 
                alt={bet.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 right-16 z-20">
                <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">{bet.title}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 px-2 py-1 bg-black/40 rounded-lg backdrop-blur-sm">
                    <Clock className="w-3 h-3 text-white" />
                    <span className="text-white text-xs font-medium">{bet.timeRemaining}</span>
                  </div>
                  <Badge className="bg-main-cta/20 text-main-cta border-main-cta/40">
                    Live
                  </Badge>
                </div>
              </div>
              
              <button
                onClick={handleShowDescription}
                className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-sm p-2 rounded-full border border-white/20 text-white hover:bg-black/60 transition-all duration-300 hover:scale-110"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>


          {isFullyAuthenticated && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                Share This Market
              </h3>
              
              <div className="p-4 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-500/20">
                <p className="text-gray-300 text-sm mb-4">
                  Share this market and earn 10% commission from any winnings of users who bet via your link!
                </p>
                
                {!shareUrl ? (
                  <Button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300"
                  >
                    {isSharing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating Link...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Generate Share Link
                      </div>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-dark-bg/50 rounded-lg border border-border-input/30">
                      <div className="flex-1 text-gray-300 text-sm font-mono truncate">
                        {shareUrl}
                      </div>
                      <Button
                        onClick={handleCopyLink}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 transition-all duration-300"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="text-xs text-gray-400 text-center">
                      Anyone who bets via this link will earn you 10% of their winnings
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isFullyAuthenticated ? (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Connect to Place Bet
              </h3>
              
              <div className="flex flex-col items-center space-y-4 p-6 bg-gradient-to-br from-accent-bg/30 to-panel-bg/30 rounded-2xl border border-border-input/30">
                <div className="text-center space-y-2">
                  <p className="text-gray-300 text-sm">
                    Connect your wallet to start betting on this market
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <ModernConnectWallet />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                {parimutuelInfo?.userBet ? 'Add to Your Bet' : 'Choose Your Side'}
              </h3>
              
              {parimutuelInfo?.userBet && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                  <p className="text-blue-400 text-sm text-center">
                    💡 You have a {parimutuelInfo.userBet.outcome ? 'YES' : 'NO'} bet of {parimutuelInfo.userBet.pointsWagered} points. Enter additional amount to add.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    if (!parimutuelInfo?.userBet) {
                      setSelectedSide('yes');
                      setTimeout(() => {
                        if (window.innerWidth < 768 && drawerRef.current) {
                          const scrollableElement = drawerRef.current.querySelector('.flex-1.overflow-y-auto');
                          if (scrollableElement) {
                            scrollableElement.scrollTo({
                              top: scrollableElement.scrollHeight,
                              behavior: 'smooth'
                            });
                          }
                        }
                      }, 100);
                    }
                  }}
                  disabled={parimutuelInfo?.userBet && !parimutuelInfo.userBet.outcome}
                  variant={(selectedSide === 'yes' || (parimutuelInfo?.userBet?.outcome === true)) ? 'default' : 'outline'}
                  className={`p-6 h-auto flex-col transition-all duration-300 ${
                    (selectedSide === 'yes' || (parimutuelInfo?.userBet?.outcome === true))
                      ? 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30 scale-105'
                      : parimutuelInfo?.userBet
                      ? 'bg-gray-900/20 border-gray-500/30 text-gray-500 cursor-not-allowed'
                      : 'bg-green-900/20 border-green-500/30 text-green-400 hover:bg-green-800/30 hover:scale-105'
                  }`}
                >
                  <ArrowUp className="w-6 h-6 mb-2" />
                  <div className="text-lg font-bold">YES</div>
                  {loading ? (
                    <div className="h-4 w-12 bg-gray-600/30 rounded animate-pulse"></div>
                  ) : parimutuelInfo ? (
                    <div className="text-xs opacity-80">
                      {calculateDynamicOdds(true).toFixed(2)}x odds
                    </div>
                  ) : null}
                </Button>
                
                <Button
                  onClick={() => {
                    if (!parimutuelInfo?.userBet) {
                      setSelectedSide('no');
                      setTimeout(() => {
                        if (window.innerWidth < 768 && drawerRef.current) {
                          const scrollableElement = drawerRef.current.querySelector('.flex-1.overflow-y-auto');
                          if (scrollableElement) {
                            scrollableElement.scrollTo({
                              top: scrollableElement.scrollHeight,
                              behavior: 'smooth'
                            });
                          }
                        }
                      }, 100);
                    }
                  }}
                  disabled={parimutuelInfo?.userBet && parimutuelInfo.userBet.outcome}
                  variant={(selectedSide === 'no' || (parimutuelInfo?.userBet?.outcome === false)) ? 'default' : 'outline'}
                  className={`p-6 h-auto flex-col transition-all duration-300 ${
                    (selectedSide === 'no' || (parimutuelInfo?.userBet?.outcome === false))
                      ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/30 scale-105'
                      : parimutuelInfo?.userBet
                      ? 'bg-gray-900/20 border-gray-500/30 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-900/20 border-purple-500/30 text-purple-400 hover:bg-purple-800/30 hover:scale-105'
                  }`}
                >
                  <ArrowDown className="w-6 h-6 mb-2" />
                  <div className="text-lg font-bold">NO</div>
                  {loading ? (
                    <div className="h-4 w-12 bg-gray-600/30 rounded animate-pulse"></div>
                  ) : parimutuelInfo ? (
                    <div className="text-xs opacity-80">
                      {calculateDynamicOdds(false).toFixed(2)}x odds
                    </div>
                  ) : null}
                </Button>
              </div>
            </div>
          )}

          {(selectedSide || parimutuelInfo?.userBet) && (
            <div className="space-y-4 animate-fade-in-up">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Bet Amount
              </h3>
              
              <div className="relative">
                <Input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder={parimutuelInfo?.userBet ? "Additional points to add..." : "Enter points to bet"}
                  className="text-lg font-semibold bg-accent-bg/50 border-border-input/50 text-white placeholder-gray-400 pr-16"
                  min="1"
                  max={userPoints}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                  pts
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 bg-gray-600/30 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : userPoints > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {[0.25, 0.5, 0.75, 1].map((percentage) => (
                    <Button
                      key={percentage}
                      onClick={() => {
                        setPointsAmount(getQuickAmount(percentage).toString());
                        scrollToPayoutSection();
                      }}
                      variant="outline"
                      size="sm"
                      className="relative overflow-hidden bg-accent-bg/30 border-border-input/30 text-gray-300 hover:bg-accent-bg/60 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-main-cta/20 active:scale-95 active:duration-75 group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-main-cta/0 via-main-cta/30 to-main-cta/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                      <span className="relative z-10 font-semibold">
                        {percentage === 1 ? 'Max' : `${percentage * 100}%`}
                      </span>
                    </Button>
                  ))}
                </div>
              ) : null}

              {errorMessage && (
                <Card className="p-4 bg-gradient-to-r from-purple-900/20 to-purple-800/20 border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 font-medium text-sm">{errorMessage}</span>
                  </div>
                </Card>
              )}

              {showInsufficientFundsDialog && (
                <Card className="p-4 bg-gradient-to-r from-orange-900/20 to-yellow-900/20 border-orange-500/30">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-purple-400" />
                      <span className="text-orange-400 font-medium text-sm">Insufficient Points</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      You need {pointsAmount} points but only have {userPoints} points.
                    </p>
                    {canClaimDaily && (
                      <div className="space-y-2">
                        <p className="text-blue-400 text-sm">
                          💡 You can claim your daily 1000 points!
                        </p>
                        <Button
                          onClick={handleClaimDaily}
                          disabled={claimingDaily}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 rounded-lg transition-all duration-300"
                          size="sm"
                        >
                          {claimingDaily ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Claiming...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Gift className="w-4 h-4" />
                              Claim 1000 Daily Points
                            </div>
                          )}
                        </Button>
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        setShowInsufficientFundsDialog(false);
                        setErrorMessage(null);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Close
                    </Button>
                  </div>
                </Card>
              )}

              {pointsAmount && !errorMessage && (
                <Card className="p-4 bg-gradient-to-r from-highlight-glow/10 to-main-cta/10 border-main-cta/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-highlight-glow" />
                      <span className="text-gray-300 font-medium">Potential Payout</span>
                    </div>
                    <div className="text-highlight-glow font-bold text-lg">
                      {calculatePotentialPayout()} pts
                    </div>
                  </div>
                  <div className="text-gray-400 text-sm mt-1">
                    Profit: {calculatePotentialPayout() - parseInt(pointsAmount || '0')} pts
                  </div>
                </Card>
              )}
            </div>
          )}

        </div>

        <div className="p-6 border-t border-border-input/30 bg-gradient-to-r from-panel-bg to-accent-bg/20 flex-shrink-0">
          <Button
            onClick={handleBetSubmit}
            disabled={(!selectedSide && !parimutuelInfo?.userBet) || !pointsAmount || !isFullyAuthenticated || betState === 'loading'}
            className="w-full bg-gradient-to-r from-main-cta to-highlight-glow hover:from-highlight-glow hover:to-main-cta text-white font-bold text-lg py-4 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-main-cta/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {betState === 'loading' ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Placing Bet...
              </div>
            ) : betState === 'success' ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Bet Placed!
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                {parimutuelInfo?.userBet
                  ? pointsAmount
                    ? `Add ${pointsAmount} pts to ${parimutuelInfo.userBet.outcome ? 'YES' : 'NO'} bet`
                    : `Add to ${parimutuelInfo.userBet.outcome ? 'YES' : 'NO'} bet`
                  : selectedSide && pointsAmount 
                    ? `Bet ${pointsAmount} pts on ${selectedSide.toUpperCase()}`
                    : 'Select Side & Amount'
                }
              </div>
            )}
          </Button>
        </div>
        
        <button
          onClick={handleClose}
          className="md:hidden fixed top-4 right-4 z-[60] bg-purple-600/90 backdrop-blur-sm p-3 rounded-full border border-purple-500/50 text-white shadow-lg hover:bg-purple-700 transition-all duration-300"
          style={{ 
            transform: isOpen ? 'scale(1)' : 'scale(0)',
            opacity: isOpen ? 1 : 0
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}