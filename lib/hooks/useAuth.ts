'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export type AuthState = 
  | 'disconnected'
  | 'connecting'
  | 'connected-unsigned'
  | 'signing'
  | 'authenticated'
  | 'session-expired'
  | 'network-mismatch'
  | 'loading';

export interface AuthStatus {
  state: AuthState;
  isFullyAuthenticated: boolean;
  isWalletConnected: boolean;
  hasValidSession: boolean;
  address: string | null;
  chainId: number | null;
  error: string | null;
  canRetry: boolean;
}

export interface AuthActions {
  connectWallet: () => void;
  requireAuth: () => Promise<boolean>;
  refreshSession: () => void;
  disconnect: () => void;
}

const EXPECTED_CHAIN_ID = 999;

export function useAuth(): AuthStatus & AuthActions {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionCheckTimeout, setSessionCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const { address, isConnected, isConnecting, chain } = useAccount();
  const { data: session, status: sessionStatus } = useSession();
  const { openConnectModal } = useConnectModal();


  useEffect(() => {
    const determineAuthState = () => {
      if (!isConnected || !address) {
        setAuthState(isConnecting ? 'connecting' : 'disconnected');
        setError(null);
        return;
      }

      if (chain && chain.id !== EXPECTED_CHAIN_ID) {
        setAuthState('network-mismatch');
        setError(`Please switch to HyperEVM network (Chain ID: ${EXPECTED_CHAIN_ID})`);
        return;
      }

      if (sessionStatus === 'loading') {
        setAuthState('loading');
        setError(null);
        return;
      }

      if (!session?.address) {
        setAuthState('connected-unsigned');
        setError(null);
        return;
      }

      if (session.address.toLowerCase() !== address.toLowerCase()) {
        setAuthState('session-expired');
        setError('Address mismatch. Please reconnect.');
        return;
      }

      setAuthState('authenticated');
      setError(null);
    };

    determineAuthState();
  }, [
    isConnected, 
    isConnecting, 
    address, 
    chain, 
    session?.address, 
    sessionStatus
  ]);

  useEffect(() => {
    if (authState === 'authenticated' && address && session?.address) {
      const checkSession = async () => {
        try {
          const response = await fetch('/api/points', { method: 'HEAD' });
          if (response.status === 401) {
            setAuthState('session-expired');
            setError('Session expired. Please reconnect.');
          }
        } catch {
        }
      };

      if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
        setSessionCheckTimeout(null);
      }

      const timeout = setTimeout(checkSession, 5 * 60 * 1000);
      setSessionCheckTimeout(timeout);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [authState, address, session?.address]);

  const connectWallet = useCallback(() => {
    if (openConnectModal) {
      openConnectModal();
    }
  }, [openConnectModal]);

  const requireAuth = useCallback(async (): Promise<boolean> => {
    if (authState === 'authenticated') {
      return true;
    }

    if (authState === 'disconnected' || authState === 'connecting') {
      connectWallet();
      return false;
    }

    if (authState === 'connected-unsigned' || authState === 'signing') {
      return false;
    }

    if (authState === 'session-expired') {
      window.location.reload();
      return false;
    }

    if (authState === 'network-mismatch') {
      return false;
    }

    return false;
  }, [authState, connectWallet]);

  const refreshSession = useCallback(async () => {
    if (address && session?.address) {
      try {
        const response = await fetch('/api/points', { method: 'HEAD' });
        if (response.status === 401) {
          setAuthState('session-expired');
          setError('Session expired. Please reconnect.');
        }
      } catch {
      }
    }
  }, [address, session?.address]);

  const disconnect = useCallback(() => {
    setAuthState('disconnected');
    setError(null);
    if (sessionCheckTimeout) {
      clearTimeout(sessionCheckTimeout);
      setSessionCheckTimeout(null);
    }
  }, [sessionCheckTimeout]);

  const isFullyAuthenticated = authState === 'authenticated';
  const isWalletConnected = isConnected && !!address;
  const hasValidSession = !!session?.address && session.address.toLowerCase() === address?.toLowerCase();
  const canRetry = ['session-expired', 'connected-unsigned'].includes(authState);

  return {
    state: authState,
    isFullyAuthenticated,
    isWalletConnected,
    hasValidSession,
    address: address || null,
    chainId: chain?.id || null,
    error,
    canRetry,
    connectWallet,
    requireAuth,
    refreshSession,
    disconnect,
  };
}