'use client';

import { useState, useEffect } from 'react';
import { useAgent } from '@/lib/agent';
import { AppBskyFeedDefs } from '@atproto/api';
import Card from '@/components/card';
import ListingFilters from '@/components/listing-filters';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/ui/use-toast';
import { GeoError, GeoErrorType } from '@/lib/geo-utils';

// Import MapView with no SSR to avoid hydration issues
const MapView = dynamic(() => import('@/components/map-view'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full flex items-center justify-center bg-gray-100">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  ),
});

// Define the interface for a listing post
interface ListingPost extends AppBskyFeedDefs.FeedViewPost {
  record: {
    text: string;
    $type: string;
    langs?: string[];
    createdAt: string;
    listing?: {
      title: string;
      description: string;
      price: number;
      category?: string;
      location?: {
        zipCode: string;
        address?: string;
      };
      tags?: string[];
      images?: string[];
    };
  };
}

export default function ListingsPage() {
  const agent = useAgent();
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingPost[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<GeoError | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Filter state
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    location: '',
    radius: '',
  });

  // Fetch listings
  useEffect(() => {
    fetchListings();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (!listings.length) return;

    const applyFilters = async () => {
      try {
        let filtered = [...listings];

        // Filter by category
        if (filters.category) {
          filtered = filtered.filter(
            (post) => post.record.listing?.category === filters.category
          );
        }

        // Filter by price range
        if (filters.minPrice) {
          const minPrice = parseFloat(filters.minPrice);
          filtered = filtered.filter(
            (post) => (post.record.listing?.price || 0) >= minPrice
          );
        }

        if (filters.maxPrice) {
          const maxPrice = parseFloat(filters.maxPrice);
          filtered = filtered.filter(
            (post) => (post.record.listing?.price || 0) <= maxPrice
          );
        }

        // Filter by location/radius
        if (filters.location && filters.radius) {
          try {
            // Dynamically import geolocation utilities to avoid SSR issues
            const { getZipCodeCoordinates, getDistanceFromLatLng } = await import('@/lib/geo-utils');

            const radiusMiles = parseFloat(filters.radius);
            const centerZipCode = filters.location;

            // Get coordinates for the center ZIP code
            const centerCoords = await getZipCodeCoordinates(centerZipCode);

            if (centerCoords) {
              // Filter listings by distance
              const filteredByDistance = [];
              for (const post of filtered) {
                const listingZipCode = post.record.listing?.location?.zipCode;
                if (!listingZipCode) continue;

                // Try to get coordinates for this listing
                try {
                  // For performance, we'll use a simple string comparison first
                  // If the ZIP codes match exactly, it's definitely within the radius
                  if (listingZipCode === centerZipCode) {
                    filteredByDistance.push(post);
                    continue;
                  }

                  // Otherwise, calculate the distance
                  const listingCoords = await getZipCodeCoordinates(listingZipCode);
                  if (!listingCoords) continue;

                  // Calculate distance between the two points
                  const distance = getDistanceFromLatLng(
                    centerCoords.lat,
                    centerCoords.lng,
                    listingCoords.lat,
                    listingCoords.lng,
                    true // Return distance in miles
                  );

                  if (distance <= radiusMiles) {
                    filteredByDistance.push(post);
                  }
                } catch (error) {
                  console.error('Error calculating distance for listing:', error);
                  // Fall back to simple string matching if we can't calculate distance
                  if (listingZipCode.startsWith(centerZipCode.substring(0, 3))) {
                    filteredByDistance.push(post);
                  }
                }
              }
              filtered = filteredByDistance;
            }
          } catch (error) {
            console.error('Error filtering by location:', error);
            // Handle geolocation errors
            if (error instanceof GeoError) {
              setGeoError(error);
              
              // Show appropriate error message based on error type
              switch (error.type) {
                case GeoErrorType.INVALID_ZIPCODE:
                  toast({
                    variant: "destructive",
                    title: "Invalid ZIP Code",
                    description: `${filters.location} is not a valid ZIP code.`
                  });
                  break;
                case GeoErrorType.NETWORK_ERROR:
                  toast({
                    variant: "destructive",
                    title: "Network Error",
                    description: "Network error while filtering by location. Using basic filtering instead."
                  });
                  break;
                case GeoErrorType.API_ERROR:
                  toast({
                    variant: "destructive",
                    title: "Service Error",
                    description: "Error with location service. Using basic filtering instead."
                  });
                  break;
                default:
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Error filtering by location. Using basic filtering instead."
                  });
              }
              
              // Fall back to simple string matching
              filtered = filtered.filter((post) => {
                const listingZipCode = post.record.listing?.location?.zipCode;
                return listingZipCode && listingZipCode.startsWith(filters.location.substring(0, 3));
              });
            }
          }
        }

        setFilteredListings(filtered);
      } catch (error) {
        console.error('Error applying filters:', error);
        toast({
          variant: "destructive",
          title: "Filter Error",
          description: "Error applying filters. Please try again."
        });
      }
    };

    applyFilters();
  }, [listings, filters]);

  // Handle filter changes from the ListingFilters component
  const handleFilterChange = (filterName: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }));
    
    // Reset geo error when changing location filter
    if (filterName === 'location') {
      setGeoError(null);
    }
    
    // Default to list view when filters change
    if (geoError && viewMode === 'map') {
      setViewMode('list');
    }
  };

  // Fetch listings from the Bluesky API
  const fetchListings = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!agent.session) {
        setError('Please log in to view listings');
        setLoading(false);
        return;
      }

      // Get the timeline
      const response = await agent.getTimeline({ limit: 100 });

      // Filter posts that have the listing schema
      const listingPosts = response.data.feed.filter(
        (post) =>
          post.reason?.$type !== 'app.bsky.feed.defs#reasonRepost' &&
          (post.post.record as any).$type === 'app.bsky.feed.post' &&
          (post.post.record as any).listing
      ) as ListingPost[];

      setListings(listingPosts);
      setFilteredListings(listingPosts);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Map listings to the format expected by MapView
  const mapListings = filteredListings.map((post) => {
    const listing = post.record.listing;
    if (!listing) return null;

    // Extract coordinates if available (will be added by the geolocation service)
    let coordinates;
    try {
      // In a real app, you would store coordinates with the listing
      // For this demo, we'll use a placeholder
      if (listing.location?.zipCode) {
        // This would normally come from your database or API
        // Here we're just creating a placeholder
        coordinates = { lat: 0, lng: 0 }; // Will be populated by MapView component
      }
    } catch (error) {
      console.error('Error processing coordinates:', error);
    }

    return {
      id: post.post.uri,
      uri: post.post.uri,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      category: listing.category || 'Uncategorized',
      location: {
        zipCode: listing.location?.zipCode || '',
        address: listing.location?.address,
        coordinates
      }
    };
  }).filter(Boolean);

  // Handle view mode toggle
  const toggleViewMode = (mode: 'list' | 'map') => {
    // If there's a geo error, don't allow switching to map view
    if (mode === 'map' && geoError) {
      toast({
        variant: "destructive",
        title: "Map Unavailable",
        description: "Map view is currently unavailable due to location service issues"
      });
      return;
    }
    setViewMode(mode);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <ListingFilters
        onFilterChange={handleFilterChange}
        filters={filters}
        geoError={geoError !== null}
        isLoading={loading}
      />

      <div className="flex justify-between items-center mb-6 mt-8">
        <h1 className="text-2xl font-bold">Browse Listings</h1>
        <div className="flex space-x-2">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => toggleViewMode('list')}
              className="rounded-md"
            >
              List View
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => toggleViewMode('map')}
              className="rounded-md"
              disabled={geoError !== null}
            >
              Map View
            </Button>
          </div>
          <Button asChild>
            <Link href="/listings/new">Create Listing</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-500">{error}</p>
          {error === 'Please log in to view listings' && (
            <Button asChild className="mt-4">
              <Link href="/auth/login">Log In</Link>
            </Button>
          )}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="text-center py-10">
          <p>No listings match your filters.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setFilters({
                category: '',
                minPrice: '',
                maxPrice: '',
                location: '',
                radius: '',
              });
              setGeoError(null);
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          {viewMode === 'map' ? (
            <MapView
              listings={mapListings}
              centerZipCode={filters.location || undefined}
              radius={filters.radius ? parseFloat(filters.radius) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((post) => (
                <Card
                  key={post.post.uri}
                  uri={post.post.uri}
                  title={post.record.listing?.title || 'Untitled Listing'}
                  price={post.record.listing?.price}
                  description={post.record.listing?.description || ''}
                  category={post.record.listing?.category}
                  author={{
                    did: post.post.author.did,
                    handle: post.post.author.handle,
                    displayName: post.post.author.displayName,
                    avatar: post.post.author.avatar,
                  }}
                  createdAt={post.post.indexedAt}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}