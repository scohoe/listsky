'use client';

import React, { useEffect, useState } from 'react';
import { BskyAgent, ComAtprotoRepoListRecords } from '@atproto/api';
import { CodeProject } from '@/components/code-project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getAgent } from '@/lib/atproto';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import ListingFilters from '@/components/listing-filters';

// Define FilterOptions interface to match ListingFilters component
interface FilterOptions {
  category: string;
  minPrice: string;
  maxPrice: string;
  location: string;
  radius: string;
}

interface ListingPostRecord {
  title: string;
  description: string;
  price?: string;
  category?: string;
  location?: {
    zipCode: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  tags?: string[];
  // images are part of the main post embed
  createdAt: string; 
}

interface EmbeddedImage {
  alt: string;
  image: {
    $type: 'blob';
    ref: { $link: string };
    mimeType: string;
    size: number;
  };
}

interface PostWithListing {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  text: string; // The main text of the post
  listingData: ListingPostRecord;
  embed?: {
    $type: 'app.bsky.embed.images';
    images: EmbeddedImage[];
  } | {
    $type: 'app.bsky.embed.record';
    record: any; // Could be a record with media, etc.
  } | {
    $type: 'app.bsky.embed.external';
    external: any;
  };
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  indexedAt: string;
  createdAt: string; // This is from the post itself, listingData.createdAt is from our custom schema
}

const ListingsPage = () => {
  const [listings, setListings] = useState<PostWithListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({ category: '', minPrice: '', maxPrice: '', location: '', radius: '' });

  const fetchListings = async (currentCursor?: string, filters: FilterOptions = activeFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const agent = getAgent(); // No auth needed for public feeds generally
      // We need to list records from many users, so we can't use listRecords on a single repo.
      // Instead, we'd typically use a feed generator or search service that indexes these custom posts.
      // For this example, we'll simulate by fetching recent posts from a known user or a broader feed if possible.
      // A real app would use a custom feed (AppView service) or a search API that understands 'app.bsky.feed.listing'.

      // Placeholder: Fetching a generic timeline and filtering client-side.
      // This is NOT efficient for production but demonstrates the concept.
      // A proper solution involves a custom feed generator or a PDS that supports querying custom record types.
      // In a real app, 'filters' would be passed to the API call.
      // For example: agent.app.bsky.feed.getFeedGenerator({ feed: 'at://did:plc:xyz/app.bsky.feed.generator/custom-listings', cursor: currentCursor, limit: 25, filterParams: filters })
      console.log('Fetching with filters:', filters); // Log filters for now
      const response = await agent.getTimeline({ limit: 25, cursor: currentCursor });

      if (!response.success) {
        throw new Error('Failed to fetch timeline.');
      }

      const fetchedPosts: PostWithListing[] = [];
      let filteredFeed = response.data.feed;

      // CLIENT-SIDE FILTERING (Placeholder - should be server-side)
      if (filters.category) {
        filteredFeed = filteredFeed.filter(item => {
          const listingData = (item.post.record as any)['app.bsky.feed.listing'];
          return listingData?.category?.toLowerCase() === filters.category.toLowerCase();
        });
      }
      if (filters.location) {
        // Basic ZIP code matching. Radius filtering is complex and needs geolocation data + calculations.
        // This is a very simplified placeholder.
        filteredFeed = filteredFeed.filter(item => {
          const listingData = (item.post.record as any)['app.bsky.feed.listing'];
          return listingData?.location?.zipCode === filters.location;
        });
      }
      if (filters.minPrice || filters.maxPrice) {
        filteredFeed = filteredFeed.filter(item => {
          const listingData = (item.post.record as any)['app.bsky.feed.listing'];
          const price = parseFloat(listingData?.price?.replace(/[^\d.]/g, '') || '0');
          const minPrice = filters.minPrice ? parseFloat(filters.minPrice) : 0;
          const maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) : Infinity;
          return price >= minPrice && price <= maxPrice;
        });
      }
      // Radius filtering is omitted here due to complexity of client-side implementation (needs geo data for listings and user).

      for (const item of filteredFeed) {
        const post = item.post;
        const customListingData = (post.record as any)['app.bsky.feed.listing'];

        if (customListingData && typeof customListingData === 'object') {
          fetchedPosts.push({
            uri: post.uri,
            cid: post.cid,
            author: post.author,
            text: (post.record as any).text || '',
            listingData: {
              ...customListingData,
              createdAt: customListingData.createdAt || post.indexedAt,
            },
            embed: post.embed as any,
            replyCount: post.replyCount,
            repostCount: post.repostCount,
            likeCount: post.likeCount,
            indexedAt: post.indexedAt,
            createdAt: (post.record as any).createdAt,
          });
        }
      }
      
      setListings(prev => currentCursor ? [...prev, ...fetchedPosts] : fetchedPosts);
      setCursor(response.data.cursor);

    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial listings without specific filters, or with default/persisted filters
    fetchListings(undefined, activeFilters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]); // Re-fetch when activeFilters change

  const handleFilterChange = (filterName: string, value: string) => {
    const newFilters = { ...activeFilters, [filterName]: value };
    setActiveFilters(newFilters);
    setListings([]); // Clear current listings
    setCursor(undefined); // Reset cursor
    // fetchListings will be called by the useEffect due to activeFilters change
  };

  const getImageUrl = (imageBlob: EmbeddedImage, authorDid: string): string => {
    // Construct image URL using Bluesky's CDN
    // The format is typically: https://cdn.bsky.app/img/{type}/plain/{did}/{cid}@{extension}
    // We'll use feed_thumbnail for card view for performance, or feed_fullsize for detail view.
    if (imageBlob?.image?.ref?.$link && authorDid) {
      return `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${imageBlob.image.ref.$link}@jpeg`;
    }
    // Fallback placeholder if essential parts are missing
    return `/placeholder.svg?width=300&height=200&query=${encodeURIComponent(imageBlob?.alt || 'listing image')}`;
  };

  if (isLoading && listings.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg">Loading listings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <CodeProject id="listings-browse">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Browse Listings</h1>
          <Link href="/listings/new" passHref>
            <Button>Create New Listing</Button>
          </Link>
        </div>

        <div className="mb-8">
          <ListingFilters 
            onFilterChange={handleFilterChange} 
            filters={activeFilters}
            isLoading={isLoading && listings.length === 0} 
          />
        </div>

        {listings.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <img src="/placeholder.svg?width=200&height=200&query=no+listings" alt="No listings found" className="mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Listings Found</h2>
            <p className="text-muted-foreground mb-4">Be the first to create one!</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {listings.map((item) => (
            <Card key={item.uri} className="flex flex-col">
              <CardHeader>
                {item.embed && item.embed.$type === 'app.bsky.embed.images' && item.embed.images.length > 0 && (
                  <div className="aspect-video relative overflow-hidden rounded-t-md -mx-6 -mt-6 mb-4">
                    <img 
                      src={getImageUrl(item.embed.images[0], item.author.did)}
                      alt={item.embed.images[0].alt || item.listingData.title}
                      className="object-cover w-full h-full"
                      onError={(e) => { 
                        // Fallback to a generic placeholder if CDN image fails
                        e.currentTarget.src = `/placeholder.svg?width=300&height=200&query=${encodeURIComponent(item.listingData.title || 'listing')}`;
                      }}
                    />
                  </div>
                )}
                <CardTitle className="text-xl leading-tight hover:text-primary transition-colors">
                  <Link href={`/listings/${encodeURIComponent(item.uri)}`}>{item.listingData.title}</Link>
                </CardTitle>
                {item.listingData.price && (
                  <p className="text-lg font-semibold text-primary">{item.listingData.price}</p>
                )}
                <CardDescription className="text-xs">
                  Posted by <Link href={`/profile/${item.author.handle}`} className="hover:underline">{item.author.displayName || item.author.handle}</Link>
                  {' · '} {new Date(item.listingData.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.listingData.description}
                </p>
                {item.listingData.category && (
                  <p className="text-xs mt-2">Category: <span className="font-medium">{item.listingData.category}</span></p>
                )}
                {item.listingData.location?.zipCode && (
                  <p className="text-xs">Location: <span className="font-medium">{item.listingData.location.zipCode}</span></p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/listings/${encodeURIComponent(item.uri)}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        {cursor && listings.length > 0 && (
          <div className="mt-8 text-center">
            <Button onClick={() => fetchListings(cursor)} disabled={isLoading} variant="secondary">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading More...</> : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </CodeProject>
  );
};

export default ListingsPage;