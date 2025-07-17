import { defineChain } from 'viem'

export const hyperEVM = defineChain({
  id: 999,
  name: 'Hyperliquid EVM',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.hyperliquid.xyz/evm'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Purrsec',
      url: 'https://purrsec.com',
    },
  },
})
