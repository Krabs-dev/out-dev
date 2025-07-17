import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { hyperEVM } from './chains'

function getWagmiConfig() {
  return getDefaultConfig({
    appName: 'PredictMarket',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [hyperEVM],
    transports: {
      [hyperEVM.id]: http('https://rpc.hyperliquid.xyz/evm'),
    },
    ssr: true,
  })
}

export const config = typeof window !== 'undefined' ? getWagmiConfig() : null