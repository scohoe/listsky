'use client';

import { useState, useEffect } from 'react';
import { useAgent } from '@/lib/agent';
import { getAllListings, ListingView } from '@/lib/marketplace-api';
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

// Use the ListingView interface from marketplace-api

export default function ListingsPage() {
  const agent = useAgent();
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingView[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingView[]>([]);
  const [total, setTotal] = useState(0);
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
            (listing) => listing.record.category === filters.category
          );
        }

        // Filter by price range
        if (filters.minPrice) {
          const minPrice = parseFloat(filters.minPrice);
          filtered = filtered.filter(
            (listing) => parseFloat(listing.record.price || '0') >= minPrice
          );
        }

        if (filters.maxPrice) {
          const maxPrice = parseFloat(filters.maxPrice);
          filtered = filtered.filter(
            (listing) => parseFloat(listing.record.price || '0') <= maxPrice
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
              for (const listing of filtered) {
                const listingZipCode = listing.record.location?.zipCode;
                if (!listingZipCode) continue;

                // Try to get coordinates for this listing
                try {
                  // For performance, we'll use a simple string comparison first
                  // If the ZIP codes match exactly, it's definitely within the radius
                  if (listingZipCode === centerZipCode) {
                    filteredByDistance.push(listing);
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
                    filteredByDistance.push(listing);
                  }
                } catch (error) {
                  console.error('Error calculating distance for listing:', error);
                  // Fall back to simple string matching if we can't calculate distance
                  if (listingZipCode.startsWith(centerZipCode.substring(0, 3))) {
                    filteredByDistance.push(listing);
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
              filtered = filtered.filter((listing) => {
                const listingZipCode = listing.record.location?.zipCode;
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

  // Fetch listings from the marketplace API
  const fetchListings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get listings from the marketplace AppView (no authentication required for browsing)
      const response = await getAllListings({}, { limit: 100 });

      setListings(response.listings);
      setFilteredListings(response.listings);
      setTotal(response.total);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Map listings to the format expected by MapView
  const mapListings = filteredListings.map((listing) => {
    if (!listing.record) return null;

    // Extract coordinates if available (will be added by the geolocation service)
    let coordinates;
    try {
      // In a real app, you would store coordinates with the listing
      // For this demo, we'll use a placeholder
      if (listing.record.location?.zipCode) {
        // This would normally come from your database or API
        // Here we're just creating a placeholder
        coordinates = { lat: 0, lng: 0 }; // Will be populated by MapView component
      }
    } catch (error) {
      console.error('Error processing coordinates:', error);
    }

    return {
      id: listing.uri,
      uri: listing.uri,
      title: listing.record.title,
      description: listing.record.description,
      price: parseFloat(listing.record.price || '0'),
      category: listing.record.category || 'Uncategorized',
      location: {
        zipCode: listing.record.location?.zipCode || '',
        address: listing.record.location?.address,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 -mx-4 lg:-mx-6 xl:-mx-8 -my-6">
      <div className="py-8 px-4">
        <ListingFilters
          onFilterChange={handleFilterChange}
          filters={filters}
          geoError={geoError !== null}
          isLoading={loading}
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 mt-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Browse Listings
            </h1>
            <p className="text-gray-600 mt-2">Discover amazing items from the Bluesky community</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-1 flex shadow-lg border border-gray-200">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleViewMode('list')}
                className={`rounded-lg transition-all duration-200 ${
                  viewMode === 'list' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                    : 'hover:bg-gray-100'
                }`}
              >
                List View
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => toggleViewMode('map')}
                className={`rounded-lg transition-all duration-200 ${
                  viewMode === 'map' 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                    : 'hover:bg-gray-100'
                }`}
                disabled={geoError !== null}
              >
                Map View
              </Button>
            </div>
            <Button 
              asChild 
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Link href="/listings/new">Create Listing</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600 font-medium">Loading amazing listings...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto">
              <p className="text-red-600 font-medium mb-4">{error}</p>
              <Button 
                onClick={fetchListings}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
            <div className="max-w-md mx-auto">
              <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No listings found</h3>
              <p className="text-gray-600 mb-6">No listings match your current filters. Try adjusting your search criteria.</p>
              <Button
                variant="outline"
                className="border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
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
                Clear All Filters
              </Button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'map' ? (
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <MapView
                  listings={mapListings}
                  centerZipCode={filters.location || undefined}
                  radius={filters.radius ? parseFloat(filters.radius) : undefined}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredListings.map((listing) => (
                  <Card
                    key={listing.uri}
                    uri={listing.uri}
                    title={listing.record.title || 'Untitled Listing'}
                    price={parseFloat(listing.record.price || '0')}
                    description={listing.record.description || ''}
                    category={listing.record.category}
                    author={listing.author}
                    createdAt={listing.record.createdAt}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}