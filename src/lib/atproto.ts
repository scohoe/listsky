import { BskyAgent } from '@atproto/api';
import { atom } from 'jotai';

// Create a singleton BskyAgent instance
let agentInstance: BskyAgent | null = null;

// Jotai atom for the agent
export const agentAtom = atom<BskyAgent | null>(null);

// Configuration for marketplace features
interface MarketplaceAgentConfig {
  enableCustomRecords: boolean;
  marketplaceNamespace: string;
  appViewEndpoint?: string;
}

const marketplaceConfig: MarketplaceAgentConfig = {
  enableCustomRecords: process.env.NEXT_PUBLIC_USE_CUSTOM_RECORDS === 'true',
  marketplaceNamespace: 'com.marketplace',
  appViewEndpoint: process.env.NEXT_PUBLIC_MARKETPLACE_APPVIEW_URL,
};

// Initialize marketplace features
async function initializeMarketplaceFeatures(agent: BskyAgent) {
  try {
    console.log('Initializing marketplace features...');
    
    // Verify that the user's PDS supports custom records
    if (agent.session?.did) {
      // Check if marketplace collection exists, create if needed
      await ensureMarketplaceCollection(agent);
    }
    
    console.log('Marketplace features initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize marketplace features:', error);
    // Don't fail the entire login process if marketplace features fail
  }
}

// Ensure marketplace collection exists in user's repo
async function ensureMarketplaceCollection(agent: BskyAgent) {
  try {
    // Try to list records from the marketplace collection
    // If it doesn't exist, this will create it implicitly when we create the first record
    await agent.com.atproto.repo.listRecords({
      repo: agent.session?.did || '',
      collection: `${marketplaceConfig.marketplaceNamespace}.listing`,
      limit: 1,
    });
    
    console.log('Marketplace collection verified');
  } catch (error) {
    // Collection doesn't exist yet, which is fine
    console.log('Marketplace collection will be created on first listing');
  }
}

// Custom record operations for marketplace
export async function createCustomRecord(
  collection: string,
  record: any,
  rkey?: string
): Promise<{ uri: string; cid: string }> {
  const agent = await getAgent();
  if (!agent || !agent.session?.did) {
    throw new Error('No authenticated session available');
  }

  try {
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session.did,
      collection,
      record,
      rkey,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  } catch (error) {
    console.error('Failed to create custom record:', error);
    throw error;
  }
}

export async function updateCustomRecord(
  collection: string,
  rkey: string,
  record: any
): Promise<{ uri: string; cid: string }> {
  const agent = await getAgent();
  if (!agent || !agent.session?.did) {
    throw new Error('No authenticated session available');
  }

  try {
    const response = await agent.com.atproto.repo.putRecord({
      repo: agent.session.did,
      collection,
      rkey,
      record,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  } catch (error) {
    console.error('Failed to update custom record:', error);
    throw error;
  }
}

export async function deleteCustomRecord(
  collection: string,
  rkey: string
): Promise<void> {
  const agent = await getAgent();
  if (!agent || !agent.session?.did) {
    throw new Error('No authenticated session available');
  }

  try {
    await agent.com.atproto.repo.deleteRecord({
      repo: agent.session.did,
      collection,
      rkey,
    });
  } catch (error) {
    console.error('Failed to delete custom record:', error);
    throw error;
  }
}

export async function getCustomRecord(
  repo: string,
  collection: string,
  rkey: string
): Promise<any> {
  const agent = await getAgent();
  if (!agent) {
    throw new Error('No agent available');
  }

  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey,
    });

    return response.data.value;
  } catch (error) {
    console.error('Failed to get custom record:', error);
    throw error;
  }
}

export async function listCustomRecords(
  repo: string,
  collection: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ records: any[]; cursor?: string }> {
  const agent = await getAgent();
  if (!agent) {
    throw new Error('No agent available');
  }

  try {
    const response = await agent.com.atproto.repo.listRecords({
      repo,
      collection,
      limit: options.limit || 25,
      cursor: options.cursor,
    });

    return {
      records: response.data.records,
      cursor: response.data.cursor,
    };
  } catch (error) {
    console.error('Failed to list custom records:', error);
    throw error;
  }
}

export async function getAgent(): Promise<BskyAgent | null> {
  if (!agentInstance) {
    agentInstance = new BskyAgent({
      service: 'https://bsky.social',
    });

    // Try to resume session if available
    if (typeof localStorage !== 'undefined') {
      const savedSession = localStorage.getItem('bsky-session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          await agentInstance.resumeSession(session);
          console.log('Session resumed successfully');
          
          // Initialize marketplace features if enabled
          if (marketplaceConfig.enableCustomRecords) {
            await initializeMarketplaceFeatures(agentInstance);
          }
        } catch (error) {
          console.error('Failed to resume session:', error);
          localStorage.removeItem('bsky-session');
          agentInstance = null;
          return null;
        }
      }
    }
  }

  return agentInstance;
}

export async function loginWithBsky(identifier: string, password: string): Promise<boolean> {
  try {
    const agent = new BskyAgent({
      service: 'https://bsky.social',
    });

    const response = await agent.login({
      identifier,
      password,
    });

    if (response.success) {
      agentInstance = agent;
      
      // Save session to localStorage
      if (agent.session && typeof localStorage !== 'undefined') {
        localStorage.setItem('bsky-session', JSON.stringify(agent.session));
      }
      
      // Initialize marketplace features if enabled
      if (marketplaceConfig.enableCustomRecords) {
        await initializeMarketplaceFeatures(agent);
      }
      
      console.log('Login successful');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Login failed:', error);
    return false;
  }
}

export async function getCurrentSession() {
  const agent = await getAgent();
  if (!agent || !agent.session) return null;
  
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
    const agent = await getAgent();
    if (!agent) return null;
    const { data } = await agent.getProfile({ actor: did });
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function logout() {
  const agent = await getAgent();
  if (agent && agent.session) {
    agent.session = undefined;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('bsky-session');
    }
  }
  agentInstance = null;
}

export async function searchPosts(query: string) {
  try {
    const agent = await getAgent();
    if (!agent) {
      return {
        success: false,
        error: 'Agent not available'
      };
    }
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

// Test connection to AT Protocol services
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const agent = await getAgent();
    if (!agent) {
      return { success: false, error: 'No agent available' };
    }

    // Test basic connectivity
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.describeServer');
    if (!response.ok) {
      return { success: false, error: 'Failed to connect to AT Protocol server' };
    }

    // Test session validity if logged in
    if (agent.session) {
      try {
        await agent.getProfile({ actor: agent.session.did });
      } catch (error) {
        return { success: false, error: 'Session is invalid or expired' };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
}

// Export marketplace configuration
export { marketplaceConfig };