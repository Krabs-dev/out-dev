'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Layers, Bitcoin, Trophy, Smile, Cpu, Vote, MoreHorizontal, Sparkles } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

interface CategoryCount {
  category: string;
  count: number;
}

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  
  const baseCategories = [
    { value: 'All', label: 'All', icon: Layers },
    { value: 'CRYPTO', label: 'Crypto', icon: Bitcoin },
    { value: 'SPORTS', label: 'Sports', icon: Trophy },
    { value: 'MEMECOINS', label: 'Memecoins', icon: Smile },
    { value: 'TECHNOLOGY', label: 'Technology', icon: Cpu },
    { value: 'POLITICS', label: 'Politics', icon: Vote },
    { value: 'OTHER', label: 'Other', icon: MoreHorizontal }
  ];

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  const fetchCategoryCounts = async () => {
    try {
      const response = await fetch('/api/markets/categories');
      if (response.ok) {
        const data = await response.json();
        setCategoryCounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching category counts:', error);
    }
  };

  const getCategoryCount = (categoryValue: string): number | null => {
    const count = categoryCounts.find(c => c.category === categoryValue);
    return count ? count.count : null;
  };

  const categories = baseCategories.map(cat => ({
    ...cat,
    count: getCategoryCount(cat.value)
  })).filter(cat => {
    if (cat.value === 'All') return true;
    return cat.count !== null && cat.count > 0;
  });

  const handleCategoryClick = (categoryValue: string) => {
    onCategoryChange(categoryValue);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">Categories</h3>
        </div>
        <div className="h-px bg-gradient-to-r from-border-input/50 to-transparent flex-1" />
      </div>

      <div className="flex sm:hidden overflow-x-auto gap-3 pb-4 scrollbar-hide">
        <div className="flex gap-3 min-w-max px-1">
          {categories.map((category, index) => (
            <Button
              key={category.value}
              onClick={() => handleCategoryClick(category.value)}
              variant="outline"
              className={`relative group overflow-hidden transform-gpu will-change-transform contain-layout border ${
                selectedCategory === category.value
                  ? 'bg-gradient-to-r from-main-cta to-highlight-glow text-white shadow-lg shadow-main-cta/30 brightness-110 border-main-cta/50'
                  : 'bg-accent-bg/30 border-border-input/50 text-gray-300 hover:text-white hover:bg-accent-bg/60 hover:border-main-cta/30 hover:brightness-105 hover:-translate-y-0.5'
              } transition-all duration-300 min-h-[48px] px-4 py-2 text-sm font-semibold whitespace-nowrap flex-shrink-0 backdrop-blur-sm backface-hidden`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {selectedCategory === category.value && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent animate-shimmer" />
              )}
              
              <category.icon className={`w-4 h-4 mr-2 transition-transform duration-300 ${
                selectedCategory === category.value ? 'group-hover:animate-pulse' : 'group-hover:rotate-3'
              }`} />
              
              <span className="relative z-10">{category.label}</span>
              
              {category.count !== null && category.count > 0 && (
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                  selectedCategory === category.value
                    ? 'bg-white/20 text-white group-hover:animate-pulse'
                    : 'bg-main-cta/20 text-main-cta group-hover:bg-main-cta/30'
                }`}>
                  {category.count}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:flex xl:flex-wrap gap-3">
        {categories.map((category, index) => (
          <Button
            key={category.value}
            onClick={() => handleCategoryClick(category.value)}
            variant="outline"
            className={`relative group overflow-hidden animate-fade-in-up transform-gpu will-change-transform contain-layout border ${
              selectedCategory === category.value
                ? 'bg-gradient-to-r from-main-cta to-highlight-glow text-white shadow-xl shadow-main-cta/40 brightness-110 border-main-cta/50'
                : 'bg-gradient-to-r from-accent-bg/30 to-panel-bg/30 border-border-input/50 text-gray-300 hover:text-white hover:bg-accent-bg/60 hover:border-main-cta/40 hover:brightness-105 hover:-translate-y-0.5 hover:shadow-lg'
            } transition-all duration-300 min-h-[52px] px-5 py-3 text-sm font-semibold backdrop-blur-sm xl:flex-shrink-0 backface-hidden`}
            style={{ animationDelay: `${index * 75}ms` }}
          >
            {selectedCategory === category.value && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 group-hover:animate-pulse" />
            )}
            
            <div className={`absolute inset-0 bg-gradient-to-r from-main-cta/0 via-main-cta/10 to-highlight-glow/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
              selectedCategory === category.value ? 'opacity-100' : ''
            }`} />
            
            <div className="relative z-10 flex items-center gap-2">
              <category.icon className={`w-4 h-4 transition-all duration-300 ${
                selectedCategory === category.value 
                  ? 'group-hover:animate-pulse' 
                  : 'group-hover:rotate-3'
              }`} />
              
              <span>{category.label}</span>
              
              {category.count !== null && category.count > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                  selectedCategory === category.value
                    ? 'bg-white/20 text-white group-hover:animate-bounce'
                    : 'bg-main-cta/20 text-main-cta group-hover:bg-main-cta/30 group-hover:brightness-110'
                }`}>
                  {category.count}
                </span>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}