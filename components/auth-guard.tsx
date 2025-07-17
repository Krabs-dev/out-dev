'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/useAuth';
import { ModernConnectWallet } from '@/components/modern-connect-wallet';
import { 
  Wallet, 
  AlertCircle, 
  Loader2, 
  Shield,
  RefreshCw,
  Network
} from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback, 
  requireAuth = true 
}: AuthGuardProps) {
  const { 
    state, 
    isFullyAuthenticated, 
    error, 
    connectWallet,
    canRetry 
  } = useAuth();

  if (!requireAuth) {
    return <>{children}</>;
  }

  if (isFullyAuthenticated) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const getAuthStateContent = () => {
    switch (state) {
      case 'disconnected':
        return {
          icon: <Wallet className="w-12 h-12 text-gray-400" />,
          title: 'Wallet Not Connected',
          description: 'Connect your wallet to access this feature',
          action: (
            <ModernConnectWallet />
          )
        };

      case 'connecting':
        return {
          icon: <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />,
          title: 'Connecting Wallet',
          description: 'Please wait while we connect to your wallet...',
          action: null
        };

      case 'connected-unsigned':
        return {
          icon: <AlertCircle className="w-12 h-12 text-yellow-500 animate-pulse" />,
          title: 'Signature Required',
          description: 'Complete the authentication process',
          action: (
            <Button 
              onClick={connectWallet}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Sign Message
            </Button>
          )
        };

      case 'signing':
        return {
          icon: <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />,
          title: 'Signing Message',
          description: 'Please complete the signature in your wallet...',
          action: null
        };

      case 'session-expired':
        return {
          icon: <RefreshCw className="w-12 h-12 text-orange-500" />,
          title: 'Session Expired',
          description: 'Your session has expired. Please reconnect your wallet.',
          action: (
            <Button 
              onClick={() => window.location.reload()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconnect
            </Button>
          )
        };

      case 'network-mismatch':
        return {
          icon: <Network className="w-12 h-12 text-red-500" />,
          title: 'Wrong Network',
          description: 'Please switch to HyperEVM network (Chain ID: 999)',
          action: (
            <Button 
              onClick={connectWallet}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Network className="w-4 h-4 mr-2" />
              Switch Network
            </Button>
          )
        };

      case 'loading':
      default:
        return {
          icon: <Loader2 className="w-12 h-12 text-gray-500 animate-spin" />,
          title: 'Loading',
          description: 'Checking authentication status...',
          action: null
        };
    }
  };

  const content = getAuthStateContent();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full p-8 text-center bg-panel-bg border-border-input">
        <div className="flex flex-col items-center space-y-6">
          {content.icon}
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              {content.title}
            </h2>
            <p className="text-gray-400 text-sm">
              {content.description}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {content.action && (
            <div className="pt-4">
              {content.action}
            </div>
          )}

          {canRetry && !content.action && (
            <Button 
              variant="outline" 
              onClick={connectWallet}
              className="text-yellow-400 border-yellow-400 hover:bg-yellow-400 hover:text-black"
            >
              Try Again
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}