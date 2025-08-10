import { BskyAgent, BlobRef } from '@atproto/api';
import { getAgent } from './atproto';

// Types for marketplace operations
export interface MarketplaceListing {
  title: string;
  description: string;
  price: string;
  category: string;
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  location: {
    zipCode: string;
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  images?: File[];
  tags?: string[];
  status?: 'active' | 'sold' | 'expired' | 'draft';
  allowMessages?: boolean;
  expiresAt?: string;
}

export interface ListingRecord extends Omit<MarketplaceListing, 'images'> {
  images?: BlobRef[];
  createdAt: string;
  updatedAt?: string;
  viewCount?: number;
  featured?: boolean;
  crossPostedTo?: string[];
}

export interface ListingView {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle?: string;
    displayName?: string;
    avatar?: string;
  };
  record: ListingRecord;
  indexedAt: string;
  distance?: number;
}

export interface SearchFilters {
  category?: string;
  location?: string;
  radius?: number;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  tags?: string[];
  hasImages?: boolean;
  postedSince?: string;
}

export interface SearchOptions {
  limit?: number;
  cursor?: string;
  sortBy?: 'relevance' | 'createdAt' | 'price' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

// Configuration for marketplace vs legacy mode
interface MarketplaceConfig {
  useCustomRecords: boolean;
  enableCrossPosting: boolean;
  appViewEndpoint?: string;
}

// Default configuration - can be overridden via environment variables
const config: MarketplaceConfig = {
  useCustomRecords: process.env.NEXT_PUBLIC_USE_CUSTOM_RECORDS === 'true',
  enableCrossPosting: process.env.NEXT_PUBLIC_ENABLE_CROSS_POSTING !== 'false',
  appViewEndpoint: process.env.NEXT_PUBLIC_MARKETPLACE_APPVIEW_URL || '/.netlify/functions',
};

/**
 * Create a new marketplace listing as a custom record
 */
export async function createMarketplaceListing(
  listing: MarketplaceListing,
  options: { crossPost?: boolean; crossPostText?: string } = {}
): Promise<{ uri: string; cid: string; crossPostUri?: string }> {
  const agent = await getAgent();
  
  if (!agent) {
    throw new Error('No authenticated agent available');
  }

  // Upload images to AT Protocol if provided
  let processedImages: BlobRef[] = [];
  if (listing.images && listing.images.length > 0) {
    try {
      processedImages = await Promise.all(
        listing.images.map(async (image) => {
          // Convert File to Uint8Array
          const arrayBuffer = await image.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const response = await agent.uploadBlob(uint8Array, {
            encoding: image.type || 'image/jpeg',
          });
          return response.data.blob;
        })
      );
    } catch (error) {
      console.warn('Failed to upload images:', error);
      // Continue without images if upload fails
    }
  }

  // Prepare the listing record
  const record: ListingRecord = {
    ...listing,
    images: processedImages,
    createdAt: new Date().toISOString(),
    status: listing.status || 'active',
    allowMessages: listing.allowMessages !== false,
    viewCount: 0,
    featured: false,
    crossPostedTo: [],
  };

  try {
    // Create the custom record in user's PDS
    const response = await agent.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'com.marketplace.listing',
      record,
    });

    const listingUri = response.data.uri;
    const listingCid = response.data.cid;

    console.log('Created marketplace listing:', { uri: listingUri, cid: listingCid });

    // Add user to known marketplace users cache (WhiteWind-style)
    if (agent.session?.did) {
      addKnownMarketplaceUser(agent.session.did);
    }

    // Notify AppView for indexing (if configured)
    if (config.appViewEndpoint) {
      try {
        const profile = await agent.getProfile({ actor: agent.session?.did || '' });
        
        await fetch(`${config.appViewEndpoint}/com-marketplace-notifyNewListing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uri: listingUri,
            listing: record,
            author: {
              did: agent.session?.did,
              handle: profile.data.handle,
              displayName: profile.data.displayName,
              avatar: profile.data.avatar,
            },
            crossPost: options.crossPost,
            crossPostText: options.crossPostText,
          }),
        });
      } catch (error) {
        console.warn('Failed to notify AppView:', error);
        // Don't fail the entire operation if AppView notification fails
      }
    }

    // Create cross-post to Bluesky if enabled and requested
    let crossPostUri: string | undefined;
    if (config.enableCrossPosting && options.crossPost) {
      try {
        crossPostUri = await createCrossPost(listing, listingUri, options.crossPostText);
        
        // Update the listing record with cross-post URI
        if (crossPostUri) {
          await agent.com.atproto.repo.putRecord({
            repo: agent.session?.did || '',
            collection: 'com.marketplace.listing',
            rkey: listingUri.split('/').pop() || '',
            record: {
              ...record,
              crossPostedTo: [crossPostUri],
            },
          });
        }
      } catch (error) {
        console.warn('Failed to create cross-post:', error);
        // Don't fail the entire operation if cross-posting fails
      }
    }

    return {
      uri: listingUri,
      cid: listingCid,
      crossPostUri,
    };
  } catch (error) {
    console.error('Failed to create marketplace listing:', error);
    throw new Error('Failed to create listing. Please try again.');
  }
}

/**
 * Update an existing marketplace listing
 */
export async function updateMarketplaceListing(
  uri: string,
  updates: Partial<MarketplaceListing>
): Promise<{ uri: string; cid: string }> {
  const agent = await getAgent();
  
  if (!agent) {
    throw new Error('No authenticated agent available');
  }

  try {
    // Get the current record
    const rkey = uri.split('/').pop() || '';
    const currentRecord = await agent.com.atproto.repo.getRecord({
      repo: agent.session?.did || '',
      collection: 'com.marketplace.listing',
      rkey,
    });

    // Process images if provided in updates
    let processedImages: BlobRef[] | undefined;
    if (updates.images && updates.images.length > 0) {
      try {
        processedImages = await Promise.all(
          updates.images.map(async (image) => {
            // Convert File to Uint8Array
            const arrayBuffer = await image.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            const response = await agent.uploadBlob(uint8Array, {
              encoding: image.type || 'image/jpeg',
            });
            return response.data.blob;
          })
        );
      } catch (error) {
        console.warn('Failed to upload images:', error);
        // Keep existing images if upload fails
        processedImages = (currentRecord.data.value as ListingRecord).images;
      }
    }

    // Merge updates with current record
    const updatedRecord: ListingRecord = {
      ...currentRecord.data.value as ListingRecord,
      ...updates,
      images: processedImages || (currentRecord.data.value as ListingRecord).images,
      updatedAt: new Date().toISOString(),
    };
    
    // Remove the images from updates to avoid type conflicts
    const { images: _, ...updatesWithoutImages } = updates;
    Object.assign(updatedRecord, updatesWithoutImages);

    // Update the record
    const response = await agent.com.atproto.repo.putRecord({
      repo: agent.session?.did || '',
      collection: 'com.marketplace.listing',
      rkey,
      record: updatedRecord,
    });

    console.log('Updated marketplace listing:', { uri: response.data.uri, cid: response.data.cid });

    return {
      uri: response.data.uri,
      cid: response.data.cid,
    };
  } catch (error) {
    console.error('Failed to update marketplace listing:', error);
    throw new Error('Failed to update listing. Please try again.');
  }
}

/**
 * Delete a marketplace listing
 */
export async function deleteMarketplaceListing(uri: string): Promise<void> {
  const agent = await getAgent();
  
  if (!agent) {
    throw new Error('No authenticated agent available');
  }

  try {
    const rkey = uri.split('/').pop() || '';
    
    await agent.com.atproto.repo.deleteRecord({
      repo: agent.session?.did || '',
      collection: 'com.marketplace.listing',
      rkey,
    });

    console.log('Deleted marketplace listing:', uri);
  } catch (error) {
    console.error('Failed to delete marketplace listing:', error);
    throw new Error('Failed to delete listing. Please try again.');
  }
}

// Known marketplace users caching (WhiteWind-style)
const KNOWN_MARKETPLACE_USERS_KEY = 'marketplace_known_users';

/**
 * Add a user to the known marketplace users cache
 */
export function addKnownMarketplaceUser(did: string): void {
  const known = getKnownMarketplaceUsers();
  if (!known.includes(did)) {
    known.push(did);
    try {
      localStorage.setItem(KNOWN_MARKETPLACE_USERS_KEY, JSON.stringify(known));
    } catch (error) {
      console.warn('Failed to update known users cache:', error);
    }
  }
}

/**
 * Get the list of known marketplace users
 */
export function getKnownMarketplaceUsers(): string[] {
  try {
    const stored = localStorage.getItem(KNOWN_MARKETPLACE_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load known users cache:', error);
    return [];
  }
}

/**
 * Get listings from multiple known users (WhiteWind-style aggregation)
 */
export async function getAllListingsFromKnownUsers(userDids: string[]): Promise<ListingView[]> {
  const allListings: ListingView[] = [];
  
  // Always include current user if authenticated
  const agent = await getAgent();
  if (agent?.session?.did && !userDids.includes(agent.session.did)) {
    userDids = [agent.session.did, ...userDids];
  }
  
  // If no known users, return empty array
  if (userDids.length === 0) {
    console.log('No known marketplace users found');
    return [];
  }
  
  console.log(`Fetching listings from ${userDids.length} known users`);
  
  for (const did of userDids) {
    try {
      const userListings = await getUserListings(did);
      allListings.push(...userListings.listings);
      console.log(`Fetched ${userListings.listings.length} listings from ${did}`);
    } catch (error) {
      console.warn(`Failed to fetch listings for ${did}:`, error);
      // Continue with other users even if one fails
    }
  }
  
  // Sort by creation date (newest first)
  return allListings.sort((a, b) => 
    new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime()
  );
}

/**
 * Apply client-side filters to listings
 */
function applyClientSideFilters(listings: ListingView[], filters: SearchFilters): ListingView[] {
  return listings.filter((listing) => {
    const record = listing.record;
    
    // Category filter
    if (filters.category && record.category !== filters.category) {
      return false;
    }
    
    // Condition filter
    if (filters.condition && filters.condition.length > 0) {
      if (!record.condition || !filters.condition.includes(record.condition)) {
        return false;
      }
    }
    
    // Price filters
    if (filters.minPrice !== undefined) {
      const price = parseFloat(record.price.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price < filters.minPrice) {
        return false;
      }
    }
    
    if (filters.maxPrice !== undefined) {
      const price = parseFloat(record.price.replace(/[^\d.]/g, ''));
      if (isNaN(price) || price > filters.maxPrice) {
        return false;
      }
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const recordTags = record.tags || [];
      const hasMatchingTag = filters.tags.some(tag => 
        recordTags.some(recordTag => 
          recordTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasMatchingTag) {
        return false;
      }
    }
    
    // Images filter
    if (filters.hasImages !== undefined) {
      const hasImages = record.images && record.images.length > 0;
      if (filters.hasImages !== hasImages) {
        return false;
      }
    }
    
    // Posted since filter
    if (filters.postedSince) {
      const postedDate = new Date(record.createdAt);
      const sinceDate = new Date(filters.postedSince);
      if (postedDate < sinceDate) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Apply sorting to listings
 */
function applySorting(
  listings: ListingView[], 
  sortBy: 'relevance' | 'createdAt' | 'price' | 'distance', 
  sortOrder: 'asc' | 'desc'
): ListingView[] {
  return [...listings].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'createdAt':
        comparison = new Date(a.record.createdAt).getTime() - new Date(b.record.createdAt).getTime();
        break;
      case 'price':
        const priceA = parseFloat(a.record.price.replace(/[^\d.]/g, '')) || 0;
        const priceB = parseFloat(b.record.price.replace(/[^\d.]/g, '')) || 0;
        comparison = priceA - priceB;
        break;
      case 'distance':
        // Use distance if available, otherwise sort by creation date
        if (a.distance !== undefined && b.distance !== undefined) {
          comparison = a.distance - b.distance;
        } else {
          comparison = new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime();
        }
        break;
      case 'relevance':
      default:
        // For relevance, sort by creation date as fallback
        comparison = new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime();
        break;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

/**
 * Get user's marketplace listings (Enhanced WhiteWind-style)
 */
export async function getUserListings(
  did?: string,
  options: { limit?: number; cursor?: string } = {}
): Promise<{ listings: ListingView[]; cursor?: string }> {
  const agent = await getAgent();
  
  if (!agent) {
    throw new Error('No authenticated agent available');
  }

  const targetDid = did || agent.session?.did;
  if (!targetDid) {
    throw new Error('No user DID available');
  }

  try {
    // Always query PDS directly (WhiteWind-style approach)
    console.log(`Fetching listings directly from PDS for user: ${targetDid}`);
    
    const response = await agent.com.atproto.repo.listRecords({
      repo: targetDid,
      collection: 'com.marketplace.listing',
      limit: options.limit || 100, // Reasonable limit like WhiteWind
      cursor: options.cursor,
    });

    // Fetch user profile for better display
    let userProfile;
    try {
      userProfile = await agent.getProfile({ actor: targetDid });
    } catch (profileError) {
      console.warn(`Failed to fetch profile for ${targetDid}:`, profileError);
    }

    const listings: ListingView[] = response.data.records
      .filter((record) => {
        // Filter out invalid or expired listings
        const listingRecord = record.value as ListingRecord;
        if (listingRecord.status === 'expired' || listingRecord.status === 'draft') {
          return false;
        }
        
        // Check if listing has expired
        if (listingRecord.expiresAt) {
          const expiryDate = new Date(listingRecord.expiresAt);
          if (expiryDate < new Date()) {
            return false;
          }
        }
        
        return true;
      })
      .map((record) => ({
        uri: record.uri,
        cid: record.cid,
        author: {
          did: targetDid,
          handle: userProfile?.data.handle,
          displayName: userProfile?.data.displayName,
          avatar: userProfile?.data.avatar,
        },
        record: record.value as ListingRecord,
        indexedAt: (record.value as ListingRecord).createdAt || new Date().toISOString(),
      }));

    // Add this user to known marketplace users if they have listings
    if (listings.length > 0) {
      addKnownMarketplaceUser(targetDid);
    }

    console.log(`Found ${listings.length} active listings for user ${targetDid}`);

    return {
      listings,
      cursor: response.data.cursor,
    };
  } catch (error) {
    console.error(`Failed to get listings for user ${targetDid}:`, error);
    
    // If this is not the current user, don't throw - just return empty results
    if (targetDid !== agent.session?.did) {
      console.warn(`Returning empty results for user ${targetDid} due to error`);
      return {
        listings: [],
        cursor: undefined,
      };
    }
    
    throw new Error('Failed to load your listings. Please try again.');
  }
}

/**
 * Get all listings for browsing
 */
export async function getAllListings(
  filters: SearchFilters = {},
  options: SearchOptions = {}
): Promise<{ listings: ListingView[]; total: number; cursor?: string }> {
  // If AppView is available, use it
  if (config.appViewEndpoint) {
    try {
      const searchParams = new URLSearchParams();
      
      // Add filters
      if (filters.category) searchParams.set('category', filters.category);
      if (filters.location) searchParams.set('location', filters.location);
      if (filters.radius) searchParams.set('radius', filters.radius.toString());
      if (filters.minPrice) searchParams.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) searchParams.set('maxPrice', filters.maxPrice.toString());
      if (filters.condition) {
        filters.condition.forEach(c => searchParams.append('condition', c));
      }
      if (filters.tags) {
        filters.tags.forEach(t => searchParams.append('tags', t));
      }
      if (filters.hasImages !== undefined) {
        searchParams.set('hasImages', filters.hasImages.toString());
      }
      if (filters.postedSince) searchParams.set('postedSince', filters.postedSince);
      
      // Add options
      if (options.limit) searchParams.set('limit', options.limit.toString());
      if (options.cursor) searchParams.set('cursor', options.cursor);
      if (options.sortBy) searchParams.set('sortBy', options.sortBy);
      if (options.sortOrder) searchParams.set('sortOrder', options.sortOrder);

      const response = await fetch(
        `${config.appViewEndpoint}/com-marketplace-getAllListings?${searchParams}`
      );

      if (response.ok) {
        const data = await response.json();
        return {
          listings: data.listings || [],
          total: data.total || 0,
          cursor: data.cursor,
        };
      }
    } catch (error) {
      console.warn('AppView failed, falling back to direct PDS queries:', error);
    }
  }
  
  // Fallback: WhiteWind-style direct PDS queries from known users
  console.log('Using WhiteWind-style fallback: querying known marketplace users directly');
  
  try {
    // Get listings from known marketplace users
    const knownUsers = getKnownMarketplaceUsers();
    const allListings = await getAllListingsFromKnownUsers(knownUsers);
    
    // Apply client-side filtering
    const filtered = applyClientSideFilters(allListings, filters);
    
    // Apply sorting
    const sorted = applySorting(filtered, options.sortBy || 'createdAt', options.sortOrder || 'desc');
    
    // Apply pagination
    const limit = options.limit || 20;
    const startIndex = options.cursor ? parseInt(options.cursor) : 0;
    const paginatedListings = sorted.slice(startIndex, startIndex + limit);
    
    const nextCursor = startIndex + limit < sorted.length ? (startIndex + limit).toString() : undefined;
    
    return {
      listings: paginatedListings,
      total: sorted.length,
      cursor: nextCursor,
    };
  } catch (error) {
    console.error('Fallback PDS queries failed:', error);
    
    // Last resort: return user's own listings if authenticated
    try {
      const agent = await getAgent();
      if (agent?.session?.did) {
        const userListings = await getUserListings(agent.session.did, options);
        return {
          listings: userListings.listings,
          total: userListings.listings.length,
          cursor: userListings.cursor,
        };
      }
    } catch (userError) {
      console.error('Failed to get user listings as fallback:', userError);
    }
    
    // Final fallback: empty results
    return {
      listings: [],
      total: 0,
    };
  }
}

/**
 * Search marketplace listings
 */
export async function searchListings(
  query: string,
  filters: SearchFilters = {},
  options: SearchOptions = {}
): Promise<{ listings: ListingView[]; total: number; cursor?: string }> {
  // If AppView is available, use it for search
  if (config.appViewEndpoint) {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('q', query);
      
      // Add filters
      if (filters.category) searchParams.set('category', filters.category);
      if (filters.location) searchParams.set('location', filters.location);
      if (filters.radius) searchParams.set('radius', filters.radius.toString());
      if (filters.minPrice) searchParams.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) searchParams.set('maxPrice', filters.maxPrice.toString());
      if (filters.condition) {
        filters.condition.forEach(c => searchParams.append('condition', c));
      }
      if (filters.tags) {
        filters.tags.forEach(t => searchParams.append('tags', t));
      }
      if (filters.hasImages !== undefined) {
        searchParams.set('hasImages', filters.hasImages.toString());
      }
      if (filters.postedSince) searchParams.set('postedSince', filters.postedSince);
      
      // Add options
      if (options.limit) searchParams.set('limit', options.limit.toString());
      if (options.cursor) searchParams.set('cursor', options.cursor);
      if (options.sortBy) searchParams.set('sortBy', options.sortBy);
      if (options.sortOrder) searchParams.set('sortOrder', options.sortOrder);

      const response = await fetch(
        `${config.appViewEndpoint}/com-marketplace-searchListings?${searchParams}`
      );

      if (response.ok) {
        const data = await response.json();
        return {
          listings: data.listings || [],
          total: data.total || 0,
          cursor: data.cursor,
        };
      }
    } catch (error) {
      console.warn('AppView search failed, falling back to direct PDS query:', error);
    }
  }

  // Fallback: Basic search using direct PDS queries
  // This is limited but provides basic functionality
  console.warn('AppView not configured, using limited search functionality');
  
  const { listings } = await getUserListings(undefined, {
    limit: options.limit,
    cursor: options.cursor,
  });

  // Basic client-side filtering
  const filtered = listings.filter((listing) => {
    const record = listing.record;
    
    // Text search
    if (query) {
      const searchText = `${record.title} ${record.description} ${record.tags?.join(' ') || ''}`.toLowerCase();
      if (!searchText.includes(query.toLowerCase())) {
        return false;
      }
    }

    // Category filter
    if (filters.category && record.category !== filters.category) {
      return false;
    }

    // Condition filter
    if (filters.condition && filters.condition.length > 0) {
      if (!record.condition || !filters.condition.includes(record.condition)) {
        return false;
      }
    }

    return true;
  });

  return {
    listings: filtered,
    total: filtered.length,
  };
}

/**
 * Create a cross-post to Bluesky with link to marketplace listing
 */
async function createCrossPost(
  listing: MarketplaceListing,
  listingUri: string,
  customText?: string
): Promise<string | undefined> {
  const agent = await getAgent();
  
  if (!agent) {
    return undefined;
  }

  try {
    // Generate cross-post text
    const marketplaceUrl = `${window.location.origin}/listings/${encodeURIComponent(listingUri)}`;
    const defaultText = `🏪 New listing: ${listing.title}\n\n${listing.price} • ${listing.category}\n\nView full details: ${marketplaceUrl}`;
    const postText = customText || defaultText;

    // Create the Bluesky post
    const response = await agent.post({
      text: postText.slice(0, 300), // Ensure we don't exceed Bluesky's limit
      createdAt: new Date().toISOString(),
    });

    console.log('Created cross-post:', response.uri);
    return response.uri;
  } catch (error) {
    console.error('Failed to create cross-post:', error);
    return undefined;
  }
}

/**
 * Notify AppView of new listing for indexing
 */
async function notifyAppViewOfNewListing(
  listingUri: string,
  options: { crossPost?: boolean; crossPostText?: string } = {}
): Promise<void> {
  if (!config.appViewEndpoint) {
    return;
  }

  try {
    const response = await fetch(`${config.appViewEndpoint}/xrpc/com.marketplace.notifyNewListing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        listingUri,
        crossPost: options.crossPost,
        crossPostText: options.crossPostText,
      }),
    });

    if (!response.ok) {
      throw new Error(`AppView notification failed: ${response.statusText}`);
    }

    console.log('Successfully notified AppView of new listing');
  } catch (error) {
    console.error('Failed to notify AppView:', error);
    throw error;
  }
}

/**
 * Get listings from AppView service
 */
async function getListingsFromAppView(
  params: { author?: string; limit?: number; cursor?: string } = {}
): Promise<{ listings: ListingView[]; cursor?: string }> {
  if (!config.appViewEndpoint) {
    throw new Error('AppView endpoint not configured');
  }

  try {
    const searchParams = new URLSearchParams();
    if (params.author) searchParams.set('author', params.author);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.cursor) searchParams.set('cursor', params.cursor);

    const response = await fetch(
      `${config.appViewEndpoint}/xrpc/com.marketplace.getListings?${searchParams}`
    );

    if (!response.ok) {
      throw new Error(`AppView request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      listings: data.listings || [],
      cursor: data.cursor,
    };
  } catch (error) {
    console.error('Failed to get listings from AppView:', error);
    throw error;
  }
}

/**
 * Search listings from AppView service
 */
async function searchListingsFromAppView(
  query: string,
  filters: SearchFilters = {},
  options: SearchOptions = {}
): Promise<{ listings: ListingView[]; total: number; cursor?: string }> {
  if (!config.appViewEndpoint) {
    throw new Error('AppView endpoint not configured');
  }

  try {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    
    // Add filters
    if (filters.category) searchParams.set('category', filters.category);
    if (filters.location) searchParams.set('location', filters.location);
    if (filters.radius) searchParams.set('radius', filters.radius.toString());
    if (filters.minPrice) searchParams.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) searchParams.set('maxPrice', filters.maxPrice.toString());
    if (filters.condition) {
      filters.condition.forEach(c => searchParams.append('condition', c));
    }
    if (filters.tags) {
      filters.tags.forEach(t => searchParams.append('tags', t));
    }
    if (filters.hasImages !== undefined) {
      searchParams.set('hasImages', filters.hasImages.toString());
    }
    if (filters.postedSince) searchParams.set('postedSince', filters.postedSince);
    
    // Add options
    if (options.limit) searchParams.set('limit', options.limit.toString());
    if (options.cursor) searchParams.set('cursor', options.cursor);
    if (options.sortBy) searchParams.set('sortBy', options.sortBy);
    if (options.sortOrder) searchParams.set('sortOrder', options.sortOrder);

    const response = await fetch(
      `${config.appViewEndpoint}/xrpc/com.marketplace.searchListings?${searchParams}`
    );

    if (!response.ok) {
      throw new Error(`AppView search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      listings: data.listings || [],
      total: data.total || 0,
      cursor: data.cursor,
    };
  } catch (error) {
    console.error('Failed to search listings from AppView:', error);
    throw error;
  }
}

// Export configuration for use in components
export { config as marketplaceConfig };