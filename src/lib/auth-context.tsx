'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BskyAgent, ComAtprotoServerDefs } from '@atproto/api';
import { getAgent, loginWithBsky as apiLogin, getCurrentSession as apiGetCurrentSession, logout as apiLogout } from './atproto';

interface UserSession extends ComAtprotoServerDefs.Session {
  // Add any custom fields you might want to store alongside the session
}

interface AuthContextType {
  agent: BskyAgent;
  session: UserSession | null;
  isLoading: boolean;
  login: (identifier: string, appPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resumeSession: () => Promise<UserSession | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const agentInstance = getAgent();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true to check for session

  const login = async (identifier: string, appPassword: string) => {
    setIsLoading(true);
    const result = await apiLogin(identifier, appPassword);
    if (result.success && result.data) {
      const currentSession = await apiGetCurrentSession();
      setSession(currentSession as UserSession);
      // TODO: Store session securely (e.g., in an HttpOnly cookie via an API route)
      setIsLoading(false);
      return { success: true };
    } else {
      setIsLoading(false);
      return { success: false, error: result.error };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await apiLogout();
    setSession(null);
    // TODO: Clear session from secure storage (e.g., cookie via an API route)
    setIsLoading(false);
  };

  const resumeSession = async (): Promise<UserSession | null> => {
    setIsLoading(true);
    try {
      const activeSession = await apiGetCurrentSession();
      if (activeSession) {
        setSession(activeSession as UserSession);
        setIsLoading(false);
        return activeSession as UserSession;
      }
      setSession(null);
      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('Failed to resume session:', error);
      setSession(null);
      setIsLoading(false);
      return null;
    }
  };

  useEffect(() => {
    resumeSession();
  }, []);

  return (
    <AuthContext.Provider value={{ agent: agentInstance, session, isLoading, login, logout, resumeSession }}>
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