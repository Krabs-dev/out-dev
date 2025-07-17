'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Crown, Star, Zap, Flame } from 'lucide-react';
import { formatPoints, formatAddress } from '@/lib/utils/format';

interface BiggestWin {
  id: string;
  userId: string;
  userAddress: string;
  marketId: string;
  winAmount: number;
  betAmount: number;
  multiplier: number;
  createdAt: string;
}

interface EngagedMarket {
  id: string;
  title: string;
  description: string;
  image: string | null;
  category: string;
  participants: number;
  volume: number;
  currentPrice: number;
}

export default function BiggestWinsSection() {
  const [currentView, setCurrentView] = useState<'wins' | 'engaged'>('wins');
  const [biggestWins, setBiggestWins] = useState<BiggestWin[]>([]);
  const [engagedMarkets, setEngagedMarkets] = useState<EngagedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [winsResponse, engagedResponse] = await Promise.all([
        fetch('/api/biggest-wins?limit=4'),
        fetch('/api/most-engaged?limit=4')
      ]);

      if (winsResponse.ok) {
        const winsData = await winsResponse.json();
        setBiggestWins(winsData.data);
      }

      if (engagedResponse.ok) {
        const engagedData = await engagedResponse.json();
        setEngagedMarkets(engagedData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const handleTabChange = (view: 'wins' | 'engaged') => {
    if (view === currentView || isAnimating) return;
    
    setIsAnimating(true);
    setCurrentIndex(0);
    setTimeout(() => {
      setCurrentView(view);
      setTimeout(() => setIsAnimating(false), 50);
    }, 150);
  };

  const getCurrentData = () => {
    return currentView === 'engaged' ? engagedMarkets : biggestWins;
  };

  const handlePrevious = () => {
    if (isTransitioning) return;
    const data = getCurrentData();
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === 0 ? data.length - 1 : prev - 1));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleNext = () => {
    if (isTransitioning) return;
    const data = getCurrentData();
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === data.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-4 h-4 text-yellow-400" />;
      case 1: return <Star className="w-4 h-4 text-gray-300" />;
      case 2: return <Zap className="w-4 h-4 text-orange-400" />;
      default: return null;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      case 1: return 'from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 2: return 'from-orange-400/20 to-orange-500/20 border-orange-400/30';
      default: return 'from-blue-500/20 to-purple-500/20 border-blue-500/30';
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-dark-bg via-panel-bg/50 to-dark-bg border-b border-border-input">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-main-cta/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-highlight-glow/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative container mx-auto px-4 py-2">
        {/* Header avec navigation moderne */}
        <div className="flex flex-col lg:flex-row lg:items-center mb-3 gap-2">
          <div className="flex items-center justify-between lg:justify-start lg:gap-4">
            {/* Navigation tabs modernisée - visible sur mobile à gauche du titre */}
            <div className="flex lg:hidden">
              <div className="relative bg-gradient-to-r from-panel-bg to-accent-bg/50 p-1 rounded-xl border border-border-input backdrop-blur-sm flex flex-col">
                <div 
                  className={`absolute inset-1 top-1 h-[calc(50%-2px)] bg-gradient-to-r ${
                    currentView === 'wins' 
                      ? 'from-yellow-500/30 to-orange-500/30 border-yellow-500/50' 
                      : 'from-blue-500/30 to-purple-500/30 border-blue-500/50'
                  } rounded-xl border transition-all duration-300 ease-out shadow-lg`}
                  style={{
                    transform: currentView === 'wins' ? 'translateY(0%)' : 'translateY(100%)'
                  }}
                />
                
                <button
                  onClick={() => handleTabChange('wins')}
                  className={`relative z-10 flex items-center px-3 py-1.5 text-sm font-semibold transition-all duration-300 rounded-xl ${
                    currentView === 'wins'
                      ? 'text-yellow-400 shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3 h-3 mr-1" />
                  Wins
                </button>
                
                <button
                  onClick={() => handleTabChange('engaged')}
                  className={`relative z-10 flex items-center px-3 py-1.5 text-sm font-semibold transition-all duration-300 rounded-xl ${
                    currentView === 'engaged'
                      ? 'text-blue-400 shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3 h-3 mr-1" />
                  Hot
                </button>
              </div>
            </div>

            {/* Navigation tabs modernisée - cachée sur mobile, visible sur desktop */}
            <div className="hidden lg:flex">
              <div className="relative bg-gradient-to-r from-panel-bg to-accent-bg/50 p-1 rounded-xl border border-border-input backdrop-blur-sm flex flex-col">
                <div 
                  className={`absolute inset-x-1 top-1 h-[calc(50%-2px)] bg-gradient-to-r ${
                    currentView === 'wins' 
                      ? 'from-yellow-500/30 to-orange-500/30 border-yellow-500/50' 
                      : 'from-blue-500/30 to-purple-500/30 border-blue-500/50'
                  } rounded-xl border transition-all duration-300 ease-out shadow-lg`}
                  style={{
                    transform: currentView === 'wins' ? 'translateY(0%)' : 'translateY(100%)'
                  }}
                />
                
                <button
                  onClick={() => handleTabChange('wins')}
                  className={`relative z-10 flex items-center px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-xl ${
                    currentView === 'wins'
                      ? 'text-yellow-400 shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Wins
                </button>
                
                <button
                  onClick={() => handleTabChange('engaged')}
                  className={`relative z-10 flex items-center px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-xl ${
                    currentView === 'engaged'
                      ? 'text-blue-400 shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-4 h-4 mr-2" />
                  Hot
                </button>
              </div>
            </div>
            
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-1">
                {currentView === 'wins' ? (
                  <div className="p-1.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                    <Flame className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  {currentView === 'wins' ? 'Top Wins' : 'Hot Markets'}
                </h2>
              </div>
              <p className="text-gray-400 text-sm">
                {currentView === 'wins' 
                  ? 'Recent big wins' 
                  : 'Popular markets'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Contenu avec animations */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-32 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-main-cta rounded-full animate-spin" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-highlight-glow rounded-full animate-spin" 
                   style={{ animationDelay: '0.3s', animationDuration: '1.5s' }} />
            </div>
            <div className="text-center">
              <div className="text-white font-semibold text-lg mb-2">
                {currentView === 'wins' ? 'Loading legendary wins...' : 'Finding hottest markets...'}
              </div>
              <div className="text-gray-400 text-sm">This won&apos;t take long</div>
            </div>
          </div>
        ) : (
          <div className={`transition-all duration-300 ease-out ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            {/* Mobile Carousel */}
            <div className="block md:hidden">
              <div className="relative">

                {/* Carousel Container */}
                <div 
                  className="overflow-hidden rounded-2xl"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div 
                    className="flex transition-transform duration-300 ease-out"
                    style={{
                      transform: `translateX(-${currentIndex * 100}%)`
                    }}
                  >
                    {getCurrentData().map((item, index) => (
                      <div key={item.id} className="w-full flex-shrink-0 px-1.5">
                        {currentView === 'engaged' ? (
                          <Card className={`group relative overflow-hidden bg-gradient-to-br ${getRankColor(index)} backdrop-blur-sm hover:scale-105 transition-all duration-500 ease-out cursor-pointer border h-full`}>
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            
                            <div className="relative p-3">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="relative">
                                  <div className={`w-8 h-8 rounded-lg border-2 ${
                                    index === 0 ? 'border-blue-400 bg-gradient-to-r from-blue-500/20 to-purple-500/20' :
                                    index === 1 ? 'border-purple-400 bg-gradient-to-r from-purple-500/20 to-pink-500/20' :
                                    'border-cyan-400 bg-gradient-to-r from-cyan-500/20 to-blue-500/20'
                                  } flex items-center justify-center backdrop-blur-sm`}>
                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                  </div>
                                  <div className="absolute -top-1 -right-1">
                                    {getRankIcon(index)}
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between text-sm">
                                    <h3 className="text-white font-semibold truncate group-hover:text-blue-300 transition-colors duration-300">
                                      {(item as EngagedMarket).title}
                                    </h3>
                                    <div className="flex flex-col items-end text-xs ml-2">
                                      <span className="text-highlight-glow font-bold">{formatPoints((item as EngagedMarket).volume)}</span>
                                      <span className="text-gray-400">{(item as EngagedMarket).participants} users</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <Badge className="bg-main-cta/20 text-main-cta border-main-cta/40 text-xs font-semibold">
                                      {(item as EngagedMarket).category}
                                    </Badge>
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full border border-green-500/30">
                                      <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                                      <span className="text-green-300 font-medium text-xs">Live</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ) : (
                          <Card className={`group relative overflow-hidden bg-gradient-to-br ${getRankColor(index)} backdrop-blur-sm hover:scale-105 transition-all duration-500 ease-out cursor-pointer border h-full`}>
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            {/* Badge for all wins */}
                            <div className={`absolute top-0 left-0 right-0 ${
                              index === 0 
                                ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30' 
                                : index === 1 
                                  ? 'bg-gradient-to-r from-gray-400/30 to-gray-500/30'
                                  : 'bg-gradient-to-r from-orange-400/30 to-orange-500/30'
                            } p-1.5 text-center`}>
                              <span className={`${
                                index === 0 ? 'text-yellow-300' : index === 1 ? 'text-gray-300' : 'text-orange-300'
                              } text-[10px] font-bold flex items-center justify-center gap-1`}>
                                {getRankIcon(index)}
                                {index === 0 ? 'LEGENDARY WIN' : index === 1 ? 'EPIC WIN' : 'BIG WIN'}
                              </span>
                            </div>
                            
                            <div className="relative p-3 pt-8">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="relative">
                                  <div className={`w-8 h-8 rounded-full border-2 ${
                                    index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-500/20 to-orange-500/20' :
                                    index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-400/20 to-gray-500/20' :
                                    'border-orange-400 bg-gradient-to-r from-orange-400/20 to-orange-500/20'
                                  } flex items-center justify-center backdrop-blur-sm`}>
                                    <span className="text-white text-xs font-bold">
                                      {formatAddress((item as BiggestWin).userAddress).slice(0, 2)}
                                    </span>
                                  </div>
                                  <div className="absolute -top-1 -right-1">
                                    {getRankIcon(index)}
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0 mt-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-white font-semibold truncate">{formatAddress((item as BiggestWin).userAddress)}</span>
                                    <div className="flex flex-col items-end text-xs ml-3">
                                      <span className="text-highlight-glow font-bold">{formatPoints((item as BiggestWin).winAmount)}</span>
                                      <span className="text-gray-400">{formatPoints((item as BiggestWin).betAmount)}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <Badge className={`${
                                      index === 0 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                                      index === 1 ? 'bg-gray-400/20 text-gray-300 border-gray-400/40' :
                                      'bg-orange-400/20 text-orange-300 border-orange-400/40'
                                    } text-xs font-bold`}>
                                      {(item as BiggestWin).multiplier.toFixed(1)}x
                                    </Badge>
                                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                                      <TrendingUp className="w-3 h-3" />
                                      <span>{getTimeSince((item as BiggestWin).createdAt)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pagination Dots */}
                <div className="flex justify-center mt-3 gap-2">
                  {getCurrentData().map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (!isTransitioning) {
                          setIsTransitioning(true);
                          setCurrentIndex(index);
                          setTimeout(() => setIsTransitioning(false), 300);
                        }
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentIndex 
                          ? currentView === 'wins' 
                            ? 'bg-yellow-400 w-8' 
                            : 'bg-blue-400 w-8'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
              {currentView === 'engaged' ? (
                engagedMarkets.map((market, index) => (
                  <Card 
                    key={market.id} 
                    className={`group relative overflow-hidden bg-gradient-to-br ${getRankColor(index)} backdrop-blur-sm hover:scale-105 transition-all duration-500 ease-out cursor-pointer animate-fade-in-up border`}
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    
                    <div className="relative p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-lg border-2 ${
                            index === 0 ? 'border-blue-400 bg-gradient-to-r from-blue-500/20 to-purple-500/20' :
                            index === 1 ? 'border-purple-400 bg-gradient-to-r from-purple-500/20 to-pink-500/20' :
                            'border-cyan-400 bg-gradient-to-r from-cyan-500/20 to-blue-500/20'
                          } flex items-center justify-center backdrop-blur-sm`}>
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="absolute -top-1 -right-1">
                            {getRankIcon(index)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-white font-bold text-base truncate group-hover:text-blue-300 transition-colors duration-300">
                              {market.title}
                            </h3>
                            <div className="flex flex-col items-end text-sm ml-2">
                              <span className="text-highlight-glow font-bold">{formatPoints(market.volume)}</span>
                              <span className="text-gray-400 text-xs">{market.participants} users</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Badge className="bg-main-cta/20 text-main-cta border-main-cta/40 text-xs font-semibold">
                              {market.category}
                            </Badge>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full border border-green-500/30">
                              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                              <span className="text-green-300 font-medium text-xs">Live</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                biggestWins.map((win, index) => (
                  <Card 
                    key={win.id} 
                    className={`group relative overflow-hidden bg-gradient-to-br ${getRankColor(index)} backdrop-blur-sm hover:scale-105 transition-all duration-500 ease-out cursor-pointer animate-fade-in-up border`}
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Badge for all wins */}
                    <div className={`absolute top-0 left-0 right-0 ${
                      index === 0 
                        ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30' 
                        : index === 1 
                          ? 'bg-gradient-to-r from-gray-400/30 to-gray-500/30'
                          : 'bg-gradient-to-r from-orange-400/30 to-orange-500/30'
                    } p-1.5 text-center`}>
                      <span className={`${
                        index === 0 ? 'text-yellow-300' : index === 1 ? 'text-gray-300' : 'text-orange-300'
                      } text-[10px] font-bold flex items-center justify-center gap-1`}>
                        {getRankIcon(index)}
                        {index === 0 ? 'LEGENDARY WIN' : index === 1 ? 'EPIC WIN' : 'BIG WIN'}
                      </span>
                    </div>
                    
                    <div className="relative p-4 pt-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full border-2 ${
                            index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-500/20 to-orange-500/20' :
                            index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-400/20 to-gray-500/20' :
                            'border-orange-400 bg-gradient-to-r from-orange-400/20 to-orange-500/20'
                          } flex items-center justify-center backdrop-blur-sm`}>
                            <span className="text-white text-sm font-bold">
                              {formatAddress(win.userAddress).slice(0, 2)}
                            </span>
                          </div>
                          <div className="absolute -top-1 -right-1">
                            {getRankIcon(index)}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-white font-bold text-base truncate group-hover:text-yellow-300 transition-colors duration-300">
                              {formatAddress(win.userAddress)}
                            </h3>
                            <div className="flex flex-col items-end text-sm ml-3">
                              <span className="text-highlight-glow font-bold">{formatPoints(win.winAmount)}</span>
                              <span className="text-gray-400 text-xs">{formatPoints(win.betAmount)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <Badge className={`${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                              index === 1 ? 'bg-gray-400/20 text-gray-300 border-gray-400/40' :
                              'bg-orange-400/20 text-orange-300 border-orange-400/40'
                            } text-xs font-bold`}>
                              {win.multiplier.toFixed(1)}x
                            </Badge>
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <TrendingUp className="w-3 h-3" />
                              <span>{getTimeSince(win.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}