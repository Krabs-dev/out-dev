'use client';

import { createContext, useContext, useCallback, useRef, useState } from 'react';

interface UserData {
  points: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
  } | null;
}

interface ClaimStatus {
  canClaim: boolean;
  nextClaimIn: number;
  userPoints: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
  } | null;
}

interface UserDataContextType {
  userData: UserData | null;
  claimStatus: ClaimStatus | null;
  refreshUserData: () => void;
  setRefreshFunction: (fn: () => void) => void;
  isLoading: boolean;
  triggerRefresh: () => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | null>(null);

export const useUserDataRefresh = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserDataRefresh must be used within a UserDataProvider');
  }
  return context;
};

interface UserDataProviderProps {
  children: React.ReactNode;
}

export const UserDataProvider = ({ children }: UserDataProviderProps) => {
  const refreshFunctionRef = useRef<(() => void) | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const triggerRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pointsResponse, claimResponse] = await Promise.all([
        fetch('/api/points'),
        fetch('/api/daily-claim')
      ]);

      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json();
        setUserData(pointsData.data);
      }

      if (claimResponse.ok) {
        const claimData = await claimResponse.json();
        setClaimStatus(claimData.data);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUserData = useCallback(() => {
    if (refreshFunctionRef.current) {
      refreshFunctionRef.current();
    }
    triggerRefresh();
  }, [triggerRefresh]);

  const setRefreshFunction = useCallback((fn: () => void) => {
    refreshFunctionRef.current = fn;
  }, []);

  return (
    <UserDataContext.Provider value={{ 
      userData, 
      claimStatus, 
      refreshUserData, 
      setRefreshFunction, 
      isLoading,
      triggerRefresh 
    }}>
      {children}
    </UserDataContext.Provider>
  );
};