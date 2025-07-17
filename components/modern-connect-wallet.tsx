'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Wallet, AlertCircle, Loader2, CheckCircle, Shield } from 'lucide-react'
import { useClientMountWithLoader } from '@/lib/hooks/useClientMount'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'

export function ModernConnectWallet() {
  const { mounted, loader } = useClientMountWithLoader(
    <div className="h-12 w-36 bg-gradient-to-r from-accent-bg/50 to-accent-bg/30 rounded-xl animate-pulse" />
  )

  const { 
    state, 
    address, 
    error, 
    connectWallet, 
    isFullyAuthenticated
  } = useAuth()

  if (!mounted) {
    return loader
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  if (isFullyAuthenticated) {
    return (
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          mounted: rainbowMounted,
        }) => {
          const ready = rainbowMounted

          if (!ready) {
            return (
              <div className="h-12 w-36 bg-gradient-to-r from-accent-bg/50 to-accent-bg/30 rounded-xl animate-pulse" />
            )
          }

          if (chain?.unsupported) {
            return (
              <Button 
                onClick={openChainModal}
                className="h-12 px-6 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/20"
              >
                <AlertCircle className="w-4 h-4 mr-3" />
                <div className="flex flex-col items-start">
                  <span className="text-xs opacity-80">Wrong</span>
                  <span className="text-sm font-semibold">Network</span>
                </div>
              </Button>
            )
          }

          return (
            <Button
              onClick={openAccountModal}
              className="h-12 px-6 bg-gradient-to-r from-emerald-500/20 to-main-cta/20 hover:from-emerald-500/30 hover:to-main-cta/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20 group"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <CheckCircle className="w-5 h-5" />
                  <div className="absolute inset-0 bg-emerald-400 rounded-full opacity-20 animate-ping group-hover:animate-none" />
                </div>
                <span className="text-sm font-semibold">
                  {account?.displayName || (address ? formatAddress(address) : 'Wallet')}
                </span>
              </div>
            </Button>
          )
        }}
      </ConnectButton.Custom>
    )
  }

  const getButtonContent = () => {
    switch (state) {
      case 'disconnected':
        return {
          icon: <Wallet className="w-5 h-5" />,
          title: 'Connect',
          subtitle: 'Wallet',
          gradient: 'from-main-cta/20 to-highlight-glow/20 hover:from-main-cta/30 hover:to-highlight-glow/30',
          border: 'border-main-cta/30',
          text: 'text-main-cta hover:text-highlight-glow',
          shadow: 'hover:shadow-main-cta/20',
          onClick: connectWallet,
          disabled: false,
          pulse: false
        }

      case 'connecting':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          title: 'Connecting',
          subtitle: 'Please wait...',
          gradient: 'from-blue-500/20 to-purple-500/20',
          border: 'border-blue-500/30',
          text: 'text-blue-400',
          shadow: 'hover:shadow-blue-500/20',
          onClick: undefined,
          disabled: true,
          pulse: true
        }

      case 'connected-unsigned':
        return {
          icon: <Shield className="w-5 h-5" />,
          title: 'Sign',
          subtitle: 'Message',
          gradient: 'from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400 hover:text-yellow-300',
          shadow: 'hover:shadow-yellow-500/20',
          onClick: connectWallet,
          disabled: false,
          pulse: true
        }

      case 'signing':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          title: 'Signing',
          subtitle: 'In wallet...',
          gradient: 'from-yellow-500/20 to-orange-500/20',
          border: 'border-yellow-500/30',
          text: 'text-yellow-400',
          shadow: 'hover:shadow-yellow-500/20',
          onClick: undefined,
          disabled: true,
          pulse: true
        }

      case 'session-expired':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          title: 'Reconnect',
          subtitle: 'Session expired',
          gradient: 'from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30',
          border: 'border-orange-500/30',
          text: 'text-orange-400 hover:text-orange-300',
          shadow: 'hover:shadow-orange-500/20',
          onClick: () => window.location.reload(),
          disabled: false,
          pulse: false
        }

      case 'network-mismatch':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          title: 'Wrong',
          subtitle: 'Network',
          gradient: 'from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30',
          border: 'border-red-500/30',
          text: 'text-red-400 hover:text-red-300',
          shadow: 'hover:shadow-red-500/20',
          onClick: connectWallet,
          disabled: false,
          pulse: false
        }

      case 'loading':
      default:
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          title: 'Loading',
          subtitle: 'Please wait...',
          gradient: 'from-gray-500/20 to-gray-600/20',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          shadow: 'hover:shadow-gray-500/20',
          onClick: undefined,
          disabled: true,
          pulse: false
        }
    }
  }

  const buttonConfig = getButtonContent()

  return (
    <div className="flex flex-col items-end space-y-2">
      <Button
        onClick={buttonConfig.onClick}
        disabled={buttonConfig.disabled}
        className={cn(
          "h-12 px-6 bg-gradient-to-r border rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg group relative overflow-hidden",
          buttonConfig.gradient,
          buttonConfig.border,
          buttonConfig.text,
          buttonConfig.shadow,
          buttonConfig.pulse && "animate-pulse-glow"
        )}
        title={error || undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        
        <div className="flex items-center space-x-3 relative z-10">
          <div className="relative">
            {buttonConfig.icon}
            {buttonConfig.pulse && (
              <div className="absolute inset-0 bg-current rounded-full opacity-20 animate-ping" />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs opacity-80 font-medium">{buttonConfig.title}</span>
            <span className="text-sm font-semibold">{buttonConfig.subtitle}</span>
          </div>
        </div>
      </Button>
      
      {error && state !== 'authenticated' && (
        <div className="text-xs text-red-400 max-w-[200px] text-right bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 backdrop-blur-sm">
          {error}
        </div>
      )}
    </div>
  )
}