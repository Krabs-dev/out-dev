'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useAdminAuth(): AdminAuthState {
  const { data: session, status } = useSession();
  const [authState, setAuthState] = useState<AdminAuthState>({
    isAdmin: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status === 'loading') {
        return;
      }

      if (!session?.address) {
        setAuthState({
          isAdmin: false,
          loading: false,
          error: null
        });
        return;
      }

      try {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        console.log('🔍 Checking admin status for address:', session.address);
        
        const response = await fetch('/api/admin/check-status');
        
        console.log('📡 Admin check response:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Admin check success:', data);
          setAuthState({
            isAdmin: data.data.isAdmin,
            loading: false,
            error: null
          });
        } else if (response.status === 403 || response.status === 401) {
          console.log('❌ Admin check: Access denied (403/401)');
          const errorText = await response.text();
          console.log('📄 Error response:', errorText);
          setAuthState({
            isAdmin: false,
            loading: false,
            error: null
          });
        } else {
          console.error('Admin status check failed:', response.status);
          setAuthState({
            isAdmin: false,
            loading: false,
            error: `Failed to check admin status (${response.status})`
          });
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setAuthState({
          isAdmin: false,
          loading: false,
          error: 'Network error while checking admin status'
        });
      }
    };

    checkAdminStatus();
  }, [session, status]);

  return authState;
}