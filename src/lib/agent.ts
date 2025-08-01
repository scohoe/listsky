'use client';

import { useAuth } from './auth-context';

/**
 * A hook to access the BskyAgent instance from the auth context.
 * This provides a convenient way to access the agent in components
 * without having to use the full auth context.
 */
export function useAgent() {
  const { agent } = useAuth();
  return agent;
}