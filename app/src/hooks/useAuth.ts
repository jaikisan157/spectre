import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from '@/types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const TOKEN_KEY = 'shadowchat_auth_token';

interface AuthState {
  isLoggedIn: boolean;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isLoggedIn: false,
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    loading: true,
  });

  // Check session on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setAuthState({
              isLoggedIn: true,
              user: data.user,
              token,
              loading: false,
            });
          } else {
            localStorage.removeItem(TOKEN_KEY);
            setAuthState({ isLoggedIn: false, user: null, token: null, loading: false });
          }
        })
        .catch(() => {
          // Server might be down, keep token but mark as not verified
          setAuthState({ isLoggedIn: false, user: null, token: null, loading: false });
        });
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const register = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setAuthState({
          isLoggedIn: true,
          user: data.user,
          token: data.token,
          loading: false,
        });
        return { success: true };
      }

      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Cannot connect to server. Is it running?' };
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setAuthState({
          isLoggedIn: true,
          user: data.user,
          token: data.token,
          loading: false,
        });
        return { success: true };
      }

      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Cannot connect to server. Is it running?' };
    }
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setAuthState({ isLoggedIn: false, user: null, token: null, loading: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.user) {
        setAuthState(prev => ({ ...prev, user: data.user }));
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Purchase premium
  const purchasePremium = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { success: false, error: 'Not logged in' };

    try {
      const res = await fetch(`${API_URL}/api/checkout/premium`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (data.success && data.url) {
        // If demo mode, navigate and auto-verify
        if (data.demo) {
          const verifyRes = await fetch(`${API_URL}/api/payment/verify?session_id=${data.sessionId}`);
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            await refreshUser();
            return { success: true };
          }
        } else {
          // Real Stripe — redirect to checkout
          window.location.href = data.url;
        }
        return { success: true };
      }

      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Payment service unavailable' };
    }
  }, [refreshUser]);

  // Purchase unban
  const purchaseUnban = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { success: false, error: 'Not logged in' };

    try {
      const res = await fetch(`${API_URL}/api/checkout/unban`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (data.success && data.url) {
        if (data.demo) {
          const verifyRes = await fetch(`${API_URL}/api/payment/verify?session_id=${data.sessionId}`);
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            await refreshUser();
            return { success: true };
          }
        } else {
          window.location.href = data.url;
        }
        return { success: true };
      }

      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'Payment service unavailable' };
    }
  }, [refreshUser]);

  return {
    ...authState,
    register,
    login,
    logout,
    refreshUser,
    purchasePremium,
    purchaseUnban,
  };
}
