'use client';

import React, { useEffect, useState } from 'react';
import { CodeProject } from '@/components/code-project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import ListingFilters from '@/components/listing-filters';
import { getAllListings, searchListings, ListingView, SearchFilters, SearchOptions } from '@/lib/marketplace-api';

// Define FilterOptions interface to match ListingFilters component
interface FilterOptions {
  category: string;
  minPrice: string;
  maxPrice: string;
  location: string;
  radius: string;
}

const ListingsPage = () => {
  const [listings, setListings] = useState<ListingView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({ category: '', minPrice: '', maxPrice: '', location: '', radius: '' });

  const fetchListings = async (currentCursor?: string, filters: FilterOptions = activeFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      // Convert FilterOptions to SearchFilters
      const searchFilters: SearchFilters = {
        category: filters.category || undefined,
        location: filters.location || undefined,
        radius: filters.radius ? parseInt(filters.radius) : undefined,
        minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
      };

      const searchOptions: SearchOptions = {
        limit: 25,
        cursor: currentCursor,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      console.log('Fetching with filters:', searchFilters);
      
      const response = await getAllListings(searchFilters, searchOptions);
      
      setListings(prev => currentCursor ? [...prev, ...response.listings] : response.listings);
      setTotal(response.total);
      setCursor(response.cursor);

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

  const getImageUrl = (listing: ListingView): string => {
    // Get the first image from the listing record
    if (listing.record.images && listing.record.images.length > 0) {
      const imageBlob = listing.record.images[0];
      if (imageBlob?.ref && listing.author.did) {
        return `https://cdn.bsky.app/img/feed_thumbnail/plain/${listing.author.did}/${imageBlob.ref}@jpeg`;
      }
    }
    // Fallback placeholder if no images
    return `/placeholder.svg?width=300&height=200&query=${encodeURIComponent(listing.record.title || 'listing image')}`;
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
          {listings.map((listing) => (
            <Card key={listing.uri} className="flex flex-col">
              <CardHeader>
                {listing.record.images && listing.record.images.length > 0 && (
                  <div className="aspect-video relative overflow-hidden rounded-t-md -mx-6 -mt-6 mb-4">
                    <img 
                      src={getImageUrl(listing)}
                      alt={listing.record.title}
                      className="object-cover w-full h-full"
                      onError={(e) => { 
                        // Fallback to a generic placeholder if CDN image fails
                        e.currentTarget.src = `/placeholder.svg?width=300&height=200&query=${encodeURIComponent(listing.record.title || 'listing')}`;
                      }}
                    />
                  </div>
                )}
                <CardTitle className="text-xl leading-tight hover:text-primary transition-colors">
                  <Link href={`/listings/${encodeURIComponent(listing.uri)}`}>{listing.record.title}</Link>
                </CardTitle>
                {listing.record.price && (
                  <p className="text-lg font-semibold text-primary">{listing.record.price}</p>
                )}
                <CardDescription className="text-xs">
                  Posted by <Link href={`/profile/${listing.author.handle || listing.author.did}`} className="hover:underline">{listing.author.displayName || listing.author.handle || 'Anonymous'}</Link>
                  {' · '} {new Date(listing.record.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {listing.record.description}
                </p>
                {listing.record.category && (
                  <p className="text-xs mt-2">Category: <span className="font-medium">{listing.record.category}</span></p>
                )}
                {listing.record.location?.zipCode && (
                  <p className="text-xs">Location: <span className="font-medium">{listing.record.location.zipCode}</span></p>
                )}
                {listing.record.condition && (
                  <p className="text-xs">Condition: <span className="font-medium">{listing.record.condition}</span></p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/listings/${encodeURIComponent(listing.uri)}`}>View Details</Link>
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