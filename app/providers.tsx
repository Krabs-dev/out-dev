'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { RainbowKitSiweNextAuthProvider, GetSiweMessageOptions } from '@rainbow-me/rainbowkit-siwe-next-auth'
import { SessionProvider } from 'next-auth/react'
import { config } from '../lib/wagmi'
import { useEffect, useState } from 'react'
import { UserDataProvider } from '@/contexts/user-data-context'
import { DrawerProvider } from '@/contexts/drawer-context'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
})

const getSiweMessageOptions: GetSiweMessageOptions = () => {
  return {
    statement: 'Connectez-vous à PredictMarket',
    domain: window.location.host,
    uri: window.location.origin,
  };
};

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-panel-bg flex items-center justify-center">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-main-cta rounded-full animate-spin" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-highlight-glow rounded-full animate-spin" style={{ animationDelay: '0.3s', animationDuration: '1.5s' }} />
      </div>
    </div>
  }

  if (!config) {
    return (
      <SessionProvider refetchInterval={0}>
        <div>{children}</div>
      </SessionProvider>
    )
  }

  return (
    <WagmiProvider config={config}>
      <SessionProvider refetchInterval={0}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitSiweNextAuthProvider getSiweMessageOptions={getSiweMessageOptions}>
            <RainbowKitProvider>
              <DrawerProvider>
                <UserDataProvider>
                  {children}
                </UserDataProvider>
              </DrawerProvider>
            </RainbowKitProvider>
          </RainbowKitSiweNextAuthProvider>
        </QueryClientProvider>
      </SessionProvider>
    </WagmiProvider>
  )
}