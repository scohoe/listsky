'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BskyAgent, ComAtprotoServerDefs } from '@atproto/api';
import { getAgent, loginWithBsky as apiLogin, getCurrentSession as apiGetCurrentSession, logout as apiLogout } from './atproto';

interface UserSession {
  did: string;
  handle: string;
  email?: string;
  accessJwt: string;
  refreshJwt: string;
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
      // Store session in localStorage for persistence
      if (currentSession && typeof window !== 'undefined') {
        localStorage.setItem('bsky_session', JSON.stringify(currentSession));
      }
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
    // Clear session from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bsky_session');
    }
    setIsLoading(false);
  };

  const resumeSession = async (): Promise<UserSession | null> => {
    setIsLoading(true);
    try {
      // First try to get session from localStorage
      if (typeof window !== 'undefined') {
        const storedSession = localStorage.getItem('bsky_session');
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            // Try to resume the stored session with the agent
            const agent = getAgent();
            const resumeResult = await agent.resumeSession(parsedSession);
            if (resumeResult.success && agent.session) {
              setSession(agent.session as UserSession);
              // Update localStorage with fresh session data
              localStorage.setItem('bsky_session', JSON.stringify(agent.session));
              setIsLoading(false);
              return agent.session as UserSession;
            } else {
              // Session is invalid, remove from storage
              localStorage.removeItem('bsky_session');
            }
          } catch (parseError) {
            console.error('Failed to parse stored session:', parseError);
            localStorage.removeItem('bsky_session');
          }
        }
      }
      
      // Fallback to checking current session
      const activeSession = await apiGetCurrentSession();
      if (activeSession) {
        setSession(activeSession as UserSession);
        // Store the session for future use
        if (typeof window !== 'undefined') {
          localStorage.setItem('bsky_session', JSON.stringify(activeSession));
        }
        setIsLoading(false);
        return activeSession as UserSession;
      }
      
      setSession(null);
      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('Failed to resume session:', error);
      setSession(null);
      // Clear potentially corrupted session data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bsky_session');
      }
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