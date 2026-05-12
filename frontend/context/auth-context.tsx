"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  organization_id: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // On mount, check for tokens in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('oricalo_user');
    const token = localStorage.getItem('oricalo_access_token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }

    const data = await res.json();
    // Access token is returned in data.access_token
    // In a real app, we'd store the refresh token in an httpOnly cookie,
    // but for this MVP we'll use localStorage for simplicity in the demo.
    localStorage.setItem('oricalo_access_token', data.access_token);
    localStorage.setItem('oricalo_refresh_token', data.refresh_token);
    
    // Also fetch user profile or decode token
    // For now, let's assume the backend returns basic user info or we decode it
    const decoded = JSON.parse(atob(data.access_token.split('.')[1]));
    const userObj = {
      id: parseInt(decoded.sub),
      email: decoded.email,
      role: decoded.role,
      full_name: decoded.full_name || 'Demo User',
      organization_id: decoded.organization_id || 1,
    };
    
    setUser(userObj);
    localStorage.setItem('oricalo_user', JSON.stringify(userObj));
    router.push('/overview');
  };

  const logout = useCallback(() => {
    localStorage.removeItem('oricalo_access_token');
    localStorage.removeItem('oricalo_refresh_token');
    localStorage.removeItem('oricalo_user');
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
