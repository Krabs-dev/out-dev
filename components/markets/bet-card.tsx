'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Zap, Target, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface BetCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  sourceUrl?: string;
  category: string;
  timeRemaining: string;
  volume: string;
  currentPrice: number;
  totalBets: number;
  isClosed: boolean;
  onViewBet: (id: string) => void;
}

export default function BetCard({
  id,
  title,
  description,
  image,
  sourceUrl,
  category,
  timeRemaining,
  volume,
  currentPrice = 0.5,
  totalBets,
  isClosed,
  onViewBet,
}: BetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const priceDirection = currentPrice > 0.5 ? 'up' : 'down';
  const priceChange = Math.abs((currentPrice - 0.5) * 100);
  return (
    <Card 
      className={`relative group bg-gradient-to-br from-panel-bg/90 to-accent-bg/30 border border-border-input/50 overflow-hidden backdrop-blur-sm transition-all duration-500 ease-out ${
        isClosed 
          ? 'opacity-60 cursor-not-allowed grayscale' 
          : 'hover:border-main-cta/40 hover:shadow-2xl hover:shadow-main-cta/20 hover:-translate-y-2 hover:scale-[1.02] cursor-pointer'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-main-cta/0 via-main-cta/5 to-highlight-glow/0 transition-opacity duration-500 ${
        isHovered && !isClosed ? 'opacity-100' : 'opacity-0'
      }`} />
      <div className={`absolute top-4 right-4 w-2 h-2 bg-main-cta rounded-full transition-all duration-700 ${
        isHovered && !isClosed ? 'opacity-100 animate-bounce' : 'opacity-0'
      }`} style={{ animationDelay: '0ms' }} />
      <div className={`absolute top-8 right-8 w-1 h-1 bg-highlight-glow rounded-full transition-all duration-700 ${
        isHovered && !isClosed ? 'opacity-60 animate-bounce' : 'opacity-0'
      }`} style={{ animationDelay: '200ms' }} />
      <div className="h-32 relative overflow-hidden rounded-t-xl">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
        <img 
          src={image} 
          alt={title}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
            !isClosed && isHovered ? 'scale-110 rotate-1' : 'scale-100'
          }`}
        />
        <div className={`absolute inset-0 bg-gradient-to-br from-main-cta/20 to-highlight-glow/20 transition-opacity duration-500 ${
          isHovered && !isClosed ? 'opacity-100' : 'opacity-0'
        }`} />
        
        {isClosed && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg animate-pulse">
              MARKET CLOSED
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3 z-20 flex gap-2">
          <Badge className={`bg-gradient-to-r from-main-cta to-main-cta/80 text-white border-none text-xs px-3 py-1.5 font-semibold backdrop-blur-sm transition-all duration-300 ${
            isHovered ? 'scale-110 shadow-lg' : ''
          }`}>
            {category}
          </Badge>
          {sourceUrl && (
            <Badge className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white border-none text-xs px-2 py-1.5 font-semibold backdrop-blur-sm transition-all duration-300 ${
              isHovered ? 'scale-110 shadow-lg' : ''
            }`}>
              <ExternalLink className="w-3 h-3" />
            </Badge>
          )}
        </div>
        <div className="absolute top-3 right-3 z-20">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs rounded-xl backdrop-blur-md font-medium border transition-all duration-300 ${
            isClosed 
              ? 'bg-red-600/90 border-red-500/50' 
              : 'bg-black/40 border-white/20 hover:bg-black/60'
          } ${isHovered ? 'scale-105' : ''}`}>
            <Clock className={`w-3 h-3 ${
              !isClosed ? 'animate-pulse' : ''
            }`} />
            {timeRemaining}
          </div>
        </div>
        {!isClosed && (
          <div className="absolute bottom-3 right-3 z-20">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-md transition-all duration-300 ${
              priceDirection === 'up' 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-purple-500/20 border border-purple-500/30'
            } ${isHovered ? 'scale-110' : ''}`}>
              {priceDirection === 'up' ? (
                <ArrowUp className="w-3 h-3 text-green-400" />
              ) : (
                <ArrowDown className="w-3 h-3 text-purple-400" />
              )}
              <span className={`text-xs font-bold ${
                priceDirection === 'up' ? 'text-green-400' : 'text-purple-400'
              }`}>
                {priceChange.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>
      
      <div className="relative p-6">
        <div className="block sm:hidden">
          <div className="mb-4">
            <h3 className={`text-white font-bold text-xl mb-2 line-clamp-2 leading-tight transition-colors duration-300 ${
              isHovered ? 'text-main-cta' : ''
            }`}>
              {title}
            </h3>
            <p className="text-gray-400 text-sm line-clamp-1">{description}</p>
          </div>
          <div className="relative mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentPrice > 0.5 ? 'bg-green-400 animate-pulse' : 'bg-purple-400 animate-pulse'
                }`} />
                <span className="text-white font-semibold">Market Sentiment</span>
              </div>
              <div className={`text-sm font-bold ${
                currentPrice > 0.5 ? 'text-green-400' : 'text-purple-400'
              }`}>
                {currentPrice > 0.5 ? 'Bullish' : 'Bearish'}
              </div>
            </div>
            
            <div className="relative bg-accent-bg/50 rounded-2xl p-4 backdrop-blur-sm border border-border-input/30">
              <div className="flex items-center justify-between mb-2">
                <div className="text-center flex-1">
                  <div className={`text-2xl font-black transition-all duration-300 ${
                    isHovered ? 'text-green-300' : 'text-green-400'
                  }`}>
                    {(currentPrice * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 font-medium">YES</div>
                </div>
                <div className="text-center flex-1">
                  <div className={`text-2xl font-black transition-all duration-300 ${
                    isHovered ? 'text-purple-300' : 'text-purple-400'
                  }`}>
                    {((1 - currentPrice) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 font-medium">NO</div>
                </div>
              </div>
              
              <div className="relative h-2 bg-accent-bg rounded-full mt-3 overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700 ease-out ${
                    isHovered ? 'shadow-lg shadow-green-400/50' : ''
                  }`}
                  style={{ width: `${currentPrice * 100}%` }}
                />
                <div 
                  className={`absolute right-0 top-0 h-full bg-gradient-to-l from-purple-500 to-purple-400 rounded-full transition-all duration-700 ease-out ${
                    isHovered ? 'shadow-lg shadow-purple-400/50' : ''
                  }`}
                  style={{ width: `${(1 - currentPrice) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={() => onViewBet(id)}
            disabled={isClosed}
            size="lg"
            className={`w-full font-bold text-base transition-all duration-500 relative overflow-hidden group ${
              isClosed 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-main-cta to-highlight-glow hover:from-highlight-glow hover:to-main-cta text-white shadow-lg hover:shadow-2xl hover:shadow-main-cta/40 hover:scale-105'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {!isClosed && <Target className="w-4 h-4" />}
              {isClosed ? 'Market Closed' : 'Place Bet'}
            </span>
            {!isClosed && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
          </Button>
        </div>

        <div className="hidden sm:block space-y-6">
          <div>
            <h3 className={`text-white font-bold text-2xl mb-3 line-clamp-2 leading-tight transition-all duration-300 ${
              isHovered ? 'text-main-cta scale-105' : ''
            }`}>
              {title}
            </h3>
            <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="relative">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  currentPrice > 0.5 ? 'bg-green-400' : 'bg-purple-400'
                }`} />
                <span className="text-sm text-gray-300 font-medium">Market Sentiment</span>
              </div>
              <div className={`text-sm font-bold px-2 py-1 rounded-lg ${
                currentPrice > 0.5 
                  ? 'text-green-400 bg-green-400/10' 
                  : 'text-purple-400 bg-purple-400/10'
              }`}>
                {currentPrice > 0.5 ? 'Bullish' : 'Bearish'}
              </div>
            </div>
            
            <div className="relative bg-gradient-to-r from-accent-bg/50 to-panel-bg/50 rounded-2xl p-4 backdrop-blur-sm border border-border-input/30">
              <div className="flex justify-between items-end mb-3">
                <div className="text-center">
                  <div className={`text-3xl font-black transition-all duration-500 ${
                    isHovered ? 'text-green-300 scale-110' : 'text-green-400'
                  }`}>
                    {(currentPrice * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 font-semibold">YES</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-black transition-all duration-500 ${
                    isHovered ? 'text-purple-300 scale-110' : 'text-purple-400'
                  }`}>
                    {((1 - currentPrice) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 font-semibold">NO</div>
                </div>
              </div>
              
              <div className="relative h-3 bg-accent-bg/70 rounded-2xl overflow-hidden">
                <div 
                  className={`absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 via-green-400 to-green-300 rounded-2xl transition-all duration-1000 ease-out ${
                    isHovered ? 'shadow-lg shadow-green-400/60' : ''
                  }`}
                  style={{ width: `${currentPrice * 100}%` }}
                />
                <div 
                  className={`absolute right-0 top-0 h-full bg-gradient-to-l from-purple-500 via-purple-400 to-purple-300 rounded-2xl transition-all duration-1000 ease-out ${
                    isHovered ? 'shadow-lg shadow-purple-400/60' : ''
                  }`}
                  style={{ width: `${(1 - currentPrice) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-accent-bg/20 rounded-xl border border-border-input/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-blue-400">
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold">{totalBets} Traders</span>
            </div>
            <div className="flex items-center gap-2 text-yellow-400">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">{volume}</span>
            </div>
          </div>

          <Button 
            onClick={() => onViewBet(id)}
            disabled={isClosed}
            size="lg"
            className={`w-full font-bold text-base transition-all duration-500 relative overflow-hidden group ${
              isClosed 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-main-cta to-highlight-glow hover:from-highlight-glow hover:to-main-cta text-white shadow-xl hover:shadow-2xl hover:shadow-main-cta/50 hover:scale-105'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {!isClosed && <Target className="w-5 h-5" />}
              {isClosed ? 'Market Closed' : 'View & Trade'}
            </span>
            {!isClosed && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}