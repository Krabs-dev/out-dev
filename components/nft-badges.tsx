'use client';

import { Badge } from '@/components/ui/badge';
import { NFTOwnership } from '@/lib/services/nft-service';
import { Star, Sparkles } from 'lucide-react';

interface NFTBadgesProps {
  collections: NFTOwnership[];
  className?: string;
}

const getCollectionEmoji = (collectionName: string) => {
  switch (collectionName.toLowerCase()) {
    case 'oily': return '🛢️';
    case 'hypio': return '🎯';
    case 'pip & friends': return '🐾';
    case 'lqnians': return '👾';
    case 'hypers': return '⚡';
    default: return '🎨';
  }
};

const getCollectionGradient = (collectionName: string) => {
  switch (collectionName.toLowerCase()) {
    case 'oily': return 'from-amber-500 to-orange-600';
    case 'hypio': return 'from-blue-500 to-cyan-600';
    case 'pip & friends': return 'from-pink-500 to-purple-600';
    case 'lqnians': return 'from-green-500 to-emerald-600';
    case 'hypers': return 'from-yellow-500 to-red-600';
    default: return 'from-gray-500 to-gray-600';
  }
};

export function NFTBadges({ collections, className = '' }: NFTBadgesProps) {
  const ownedCollections = collections.filter(c => c.hasNFTs);

  if (ownedCollections.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="text-gray-400 text-sm bg-dark-bg/30 rounded-lg p-4">
          <Star className="w-6 h-6 text-gray-500 mx-auto mb-2" />
          No NFT collections detected
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2 text-sm font-medium text-highlight-glow">
        <Sparkles className="w-4 h-4" />
        <span>NFT Multiplier Boost</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {ownedCollections.map((collection) => (
          <Badge
            key={collection.collection}
            className={`
              bg-gradient-to-r ${getCollectionGradient(collection.name)} 
              text-white border-0 hover:scale-105 transition-all duration-300
              shadow-lg hover:shadow-xl
              flex items-center space-x-1 px-3 py-1
            `}
          >
            <span className="text-sm">{getCollectionEmoji(collection.name)}</span>
            <span className="font-medium">{collection.name}</span>
            <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded ml-1">
              {collection.multiplier}x
            </span>
          </Badge>
        ))}
      </div>
      
      {ownedCollections.length > 1 && (
        <div className="text-xs text-gray-400 bg-dark-bg/20 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span>Total Multiplier:</span>
            <span className="text-highlight-glow font-bold">
              {ownedCollections.reduce((acc, c) => acc * c.multiplier, 1).toFixed(2)}x
            </span>
          </div>
        </div>
      )}
    </div>
  );
}