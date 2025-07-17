export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface MarketResponse {
  id: string;
  title: string;
  description: string;
  image: string;
  sourceUrl?: string;
  category: string;
  closeDate: Date;
  maxBetAmount: number;
  volume: number;
  currentPrice: number;
  participants: number;
  totalBets: number;
  yesPool: number;
  noPool: number;
  createdAt: Date;
}

export interface UserBadge {
  type: 'Veteran' | 'Daily Player' | 'High Scorer' | 'Newcomer';
}

export interface LeaderboardUser {
  rank: number;
  address: string;
  username: string;
  avatar: string;
  points: number;
  totalEarned: number;
  totalClaims: number;
  claimRate: string;
  badges: string[];
  trend: 'up' | 'down';
  lastActive: string;
  activeBadge?: {
    badgeType: string;
    tier?: string;
    category?: string;
  } | null;
}