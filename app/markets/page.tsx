'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useClientMount } from '@/lib/hooks/useClientMount';
import PageLayout from '@/components/layout/page-layout';
import LoadingSpinner from '@/components/ui/loading-spinner';
import CategoryFilter from '@/components/markets/category-filter';
import SortingDropdown from '@/components/markets/sorting-dropdown';
import BetCard from '@/components/markets/bet-card';
import ModernBetDrawer from '@/components/markets/modern-bet-drawer';
import BiggestWinsSection from '@/components/markets/biggest-wins-section';
import { formatVolume, formatTimeRemaining, isMarketClosed } from '@/lib/utils/format';
import { toast } from 'sonner';

interface Market {
  id: string;
  title: string;
  description: string;
  image: string | null;
  sourceUrl?: string;
  category: string;
  closeDate: string;
  maxBetAmount: number;
  volume: number;
  currentPrice: number;
  participants: number;
  totalBets: number;
  yesPool: number;
  noPool: number;
  createdAt: string;
}

export default function MarketsPage() {
  const hasMounted = useClientMount();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('Ending Soon');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Market | null>(null);
  const [referralData, setReferralData] = useState<{
    marketId: string;
    marketTitle: string;
    referrerAddress: string;
    shareCode: string;
  } | null>(null);
  const [hasAutoOpenedReferral, setHasAutoOpenedReferral] = useState(false);

  const fetchMarkets = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsFiltering(true);
      }
      
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }
      params.append('sort', selectedSort);
      
      const response = await fetch(`/api/markets?${params}`);
      if (response.ok) {
        const data = await response.json();
        
        if (!isInitialLoad) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        setMarkets(data.data);
      }
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setIsFiltering(false);
      }
    }
  }, [selectedCategory, selectedSort]);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      fetch(`/api/referral/validate?code=${refCode}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setReferralData({
              marketId: data.data.marketId,
              marketTitle: data.data.marketTitle,
              referrerAddress: data.data.referrerAddress,
              shareCode: data.data.shareCode,
            });
            
            toast.success(
              `You're viewing a shared market from ${data.data.referrerAddress.slice(0, 6)}...${data.data.referrerAddress.slice(-4)}!`,
              {
                description: 'If you win a bet on this market, they will earn 10% commission.',
                duration: 5000
              }
            );
          } else {
            toast.error('Invalid or expired share link');
          }
        })
        .catch(() => {
          toast.error('Failed to validate share link');
        });
    }

    fetchMarkets(true);
  }, []);

  useEffect(() => {
    if (referralData && markets.length > 0 && !hasAutoOpenedReferral) {
      const targetMarket = markets.find(m => m.id === referralData.marketId);
      if (targetMarket) {
        setSelectedBet(targetMarket);
        setHasAutoOpenedReferral(true);
      }
    }
  }, [referralData, markets, hasAutoOpenedReferral]);

  useEffect(() => {
    if (!loading) {
      fetchMarkets(false);
    }
  }, [selectedCategory, selectedSort]);

  if (!hasMounted) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size="md" />
        </div>
      </PageLayout>
    );
  }


  return (
    <PageLayout>
      <BiggestWinsSection />
      
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-main-cta/5 via-transparent to-highlight-glow/5 rounded-3xl blur-xl" />
            
            <div className="relative bg-gradient-to-r from-panel-bg/80 to-accent-bg/40 backdrop-blur-sm rounded-2xl border border-border-input/50 p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="relative">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-main-cta to-highlight-glow rounded-xl flex items-center justify-center">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <div className="w-4 h-4 bg-white rounded-sm animate-pulse" />
                        </div>
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-panel-bg animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent group-hover:from-main-cta group-hover:to-highlight-glow transition-all duration-500">
                        Active Markets
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 text-sm font-medium">Live Trading</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">Discover trending predictions</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <SortingDropdown value={selectedSort} onChange={setSelectedSort} />
                </div>
              </div>
            </div>
          </div>

          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onCategoryChange={setSelectedCategory} 
          />

          {loading ? (
            <div className="h-64">
              <LoadingSpinner 
                size="md" 
                message="Loading amazing markets..." 
                subtitle="Fetching the latest predictions"
                className="h-full"
              />
            </div>
          ) : (
            <div className="relative">
              {isFiltering && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                  <div className="bg-panel-bg/90 backdrop-blur-md rounded-xl p-4 border border-border-input/50">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-gray-600 border-t-main-cta rounded-full animate-spin" />
                      <span className="text-white font-medium">Updating markets...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-300 ${
                isFiltering ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
              }`}>
                {markets.map((market, index) => (
                  <div 
                    key={market.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <BetCard 
                      id={market.id}
                      title={market.title}
                      description={market.description}
                      image={market.image || 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=200&fit=crop'}
                      sourceUrl={market.sourceUrl}
                      category={market.category}
                      timeRemaining={formatTimeRemaining(market.closeDate)}
                      volume={formatVolume(market.volume)}
                      currentPrice={market.currentPrice}
                      totalBets={market.totalBets}
                      isClosed={isMarketClosed(market.closeDate)}
                      onViewBet={() => setSelectedBet(market)} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedBet && (
            <ModernBetDrawer 
              bet={{
                id: selectedBet.id,
                title: selectedBet.title,
                image: selectedBet.image || 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=200&fit=crop',
                description: selectedBet.description,
                sourceUrl: selectedBet.sourceUrl,
                timeRemaining: formatTimeRemaining(selectedBet.closeDate),
                isClosed: isMarketClosed(selectedBet.closeDate),
              }}
              onClose={() => setSelectedBet(null)}
              onBetPlaced={() => {
                fetchMarkets();
              }}
              referralCode={referralData?.shareCode}
            />
          )}
        </main>
    </PageLayout>
  );
}