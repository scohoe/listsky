import { BskyAgent } from '@atproto/api';

// Create a singleton instance of the BskyAgent
let agent: BskyAgent | null = null;

export function getAgent() {
  if (!agent) {
    agent = new BskyAgent({
      service: 'https://bsky.social',
    });
  }
  return agent;
}

export async function loginWithBsky(identifier: string, password: string) {
  try {
    const agent = getAgent();
    const result = await agent.login({ identifier, password });
    return { success: true, data: result };
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error during login' 
    };
  }
}

export async function getCurrentSession() {
  const agent = getAgent();
  if (!agent.session) return null;
  
  try {
    // Verify the session is still valid
    const { success } = await agent.resumeSession(agent.session);
    if (!success) return null;
    
    return agent.session;
  } catch {
    return null;
  }
}

export async function getProfile(did: string) {
  try {
    const agent = getAgent();
    const { data } = await agent.getProfile({ actor: did });
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function logout() {
  const agent = getAgent();
  if (agent.session) {
    agent.session = undefined;
  }
}

export async function searchPosts(query: string) {
  try {
    const agent = getAgent();
    const result = await agent.app.bsky.feed.searchPosts({ q: query });
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during search'
    };
  }
}