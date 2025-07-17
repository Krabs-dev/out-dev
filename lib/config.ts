export const APP_CONFIG = {
  BETA_RESTRICTION: {
    ENABLED: process.env.NEXT_PUBLIC_BETA_RESTRICTION_ENABLED === 'true',
    OILY_MIN_TOKENS: 10,
    WHITELIST_TOKEN_IDS: [153, 103, 785, 113, 131, 15, 176, 222, 231, 239, 243, 254, 258, 287, 300, 317, 435, 444, 447, 473, 54, 572, 599, 608, 617, 635, 699, 704, 726, 730, 770, 802, 804, 812, 82, 827, 840, 841, 87, 879, 896, 897, 915, 940, 950, 102, 993, 111] as const
  },
  DAILY_CLAIM: {
    BASE_AMOUNT: 1000,
    COOLDOWN_HOURS: 24
  },
  PAGINATION: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100
  },
  MARKET: {
    RECENT_BETS_LIMIT: 10,
    TREND_HOURS: 24
  },
  LEADERBOARD: {
    TOP_USERS_LIMIT: 50,
    BADGES: {
      VETERAN_CLAIMS: 30,
      DAILY_PLAYER_CLAIMS: 7,
      DAILY_PLAYER_RATE: 80,
      HIGH_SCORER_POINTS: 50000,
      NEWCOMER_DAYS: 7
    }
  },
  WINS: {
    TIMEFRAME_DAYS: 7
  },
  NFT: {
    RPC_URL: 'https://rpc.hyperliquid.xyz/evm',
    CACHE_DURATION_MINUTES: 30,
    COLLECTIONS: {
      OILY: {
        name: 'Oily',
        address: '0xb293ccdD10FeB4ADc4a6B7298196C4aa61cAC33a',
        method: 'tokensOfOwner',
        multiplier: 1.15
      },
      HYPIO: {
        name: 'Hypio',
        address: '0x63eb9d77D083cA10C304E28d5191321977fd0Bfb',
        method: 'tokensOfOwner',
        multiplier: 1.05
      },
      PIP_FRIENDS: {
        name: 'Pip & Friends',
        address: '0xbc4a26ba78ce05E8bCbF069Bbb87FB3E1dAC8DF8',
        method: 'balanceOf',
        multiplier: 1.05
      },
      LQNIANS: {
        name: 'LQnians',
        address: '0xfD43e36a9D4002C54a84DAB089a2EdE92ffB5C60',
        method: 'balanceOf',
        multiplier: 1.05
      },
      HYPERS: {
        name: 'Hypers',
        address: '0x9Be117D27f8037F6f549903C899e96E5755e96db',
        method: 'balanceOf',
        multiplier: 1.05
      }
    }
  }
} as const;