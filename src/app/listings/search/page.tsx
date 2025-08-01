'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { AppBskyFeedDefs } from '@atproto/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getAgent, searchPosts } from '@/lib/atproto';

// Predefined categories for listings
const CATEGORIES = [
  'All Categories',
  'Electronics',
  'Furniture',
  'Clothing',
  'Vehicles',
  'Housing',
  'Services',
  'Jobs',
  'Free Stuff',
  'Other'
];

// The actual listing data is within record
interface ListingPost extends AppBskyFeedDefs.PostView {
  record: {
    $type: 'app.bsky.feed.listing';
    title: string;
    description: string;
    price?: string;
    category?: string;
    location?: string;
    createdAt: string;
  };
}

interface SearchFilters {
  keywords: string;
  category: string;
  priceMin: number;
  priceMax: number;
  location: string;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialKeywords = searchParams.get('q') || '';
  
  const [filters, setFilters] = useState<SearchFilters>({
    keywords: initialKeywords,
    category: 'All Categories',
    priceMin: 0,
    priceMax: 5000,
    location: '',
  });
  
  const [listings, setListings] = useState<ListingPost[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ ...prev, category: value }));
  };

  // Handle price range changes
  const handlePriceRangeChange = (values: number[]) => {
    setPriceRange([values[0], values[1]]);
    setFilters(prev => ({
      ...prev,
      priceMin: values[0],
      priceMax: values[1]
    }));
  };

  // Apply search
  const handleSearch = () => {
    // Update URL with search parameters for shareable links
    const params = new URLSearchParams();
    if (filters.keywords) params.set('q', filters.keywords);
    if (filters.category !== 'All Categories') params.set('category', filters.category);
    if (filters.location) params.set('location', filters.location);
    if (filters.priceMin > 0) params.set('min', filters.priceMin.toString());
    if (filters.priceMax < 5000) params.set('max', filters.priceMax.toString());
    
    router.push(`/listings/search?${params.toString()}`);
  };

  // Fetch listings
  useEffect(() => {
    const fetchListings = async () => {
      if (!initialKeywords) {
        setListings([]);
        setFilteredListings([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await searchPosts(initialKeywords);

        if (result.success && result.data) {
          // Filter for posts that match our listing schema NSID
          const listingPosts = result.data.posts.filter(
            (item) =>
              (item.record as any)?.$type === 'app.bsky.feed.listing'
          ) as unknown as ListingPost[];
          setListings(listingPosts);
        } else {
          setError(result.error || 'Failed to fetch listings.');
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching listings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [initialKeywords]); // Re-fetch when keywords change

  // Apply filters to listings
  useEffect(() => {
    if (listings.length === 0) return;
    
    let filtered = [...listings];
    
    // Filter by category
    if (filters.category !== 'All Categories') {
      filtered = filtered.filter(item => 
        item.record.category?.toLowerCase() === filters.category.toLowerCase()
      );
    }
    
    // Filter by price range
    if (filters.priceMin > 0 || filters.priceMax < 5000) {
      filtered = filtered.filter(item => {
        // Extract numeric value from price string (e.g., "$100" -> 100)
        const priceStr = item.record.price || '';
        const priceMatch = priceStr.match(/\$?(\d+)/);
        if (!priceMatch) return false;
        
        const price = parseInt(priceMatch[1]);
        return price >= filters.priceMin && price <= filters.priceMax;
      });
    }
    
    // Filter by location
    if (filters.location) {
      filtered = filtered.filter(item => 
        item.record.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    // Filter by keywords in title or description
    if (filters.keywords) {
      const keywords = filters.keywords.toLowerCase();
      filtered = filtered.filter(item => 
        item.record.title.toLowerCase().includes(keywords) ||
        item.record.description.toLowerCase().includes(keywords)
      );
    }
    
    setFilteredListings(filtered);
  }, [listings, filters]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search Listings</h1>
      
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                name="keywords"
                placeholder="Search titles and descriptions"
                value={filters.keywords}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={filters.category} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="City, State, or Region"
                value={filters.location}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Price Range</Label>
                <span className="text-sm text-muted-foreground">
                  ${priceRange[0]} - ${priceRange[1]}
                </span>
              </div>
              <Slider
                defaultValue={[0, 5000]}
                min={0}
                max={5000}
                step={50}
                value={[filters.priceMin, filters.priceMax]}
                onValueChange={handlePriceRangeChange}
                className="py-4"
              />
            </div>
          </div>
          
          <Button onClick={handleSearch} className="w-full mt-2">
            Search Listings
          </Button>
        </CardContent>
      </Card>
      
      {isLoading && <p className="text-center text-muted-foreground my-4">Searching listings...</p>}
      
      {error && (
        <div className="text-center my-8 p-6 border rounded-lg">
          <p className="text-red-500 mb-4">{error}</p>
          {error.includes('log in') && (
            <Button asChild>
              <Link href="/auth/login">Sign in with Bluesky</Link>
            </Button>
          )}
        </div>
      )}
      
      {!isLoading && !error && listings.length === 0 && (
        <p className="text-center text-muted-foreground my-4">No listings found.</p>
      )}
      
      {!isLoading && !error && listings.length > 0 && filteredListings.length === 0 && (
        <p className="text-center text-muted-foreground my-4">No listings match your search criteria.</p>
      )}
      
      {!isLoading && !error && filteredListings.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-4">Found {filteredListings.length} listings</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              // Placeholder image - replace with actual image handling later if needed
              const imageUrl = `/placeholder.svg?width=400&height=300&query=${encodeURIComponent(listing.record.category || 'listing')}`;
              return (
                <Card key={listing.uri} className="overflow-hidden flex flex-col h-full">
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={imageUrl} 
                      alt={listing.record.title}
                      className="object-cover w-full h-full transition-transform hover:scale-105"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{listing.record.title}</CardTitle>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">{listing.record.price || 'N/A'}</span>
                      <span className="text-sm text-muted-foreground">{listing.record.location || 'Unknown Location'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-muted-foreground line-clamp-2">{listing.record.description}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {listing.record.category && <span className="text-xs px-2 py-1 bg-secondary rounded-full">{listing.record.category}</span>}
                      <span className="text-xs text-muted-foreground">Posted {new Date(listing.record.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <div className="flex justify-between items-center w-full">
                      <Link href={`https://bsky.app/profile/${listing.author.handle}`} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                        @{listing.author.handle}
                      </Link>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/listings/${encodeURIComponent(listing.uri)}`}>View Details</Link>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8"><p className="text-center">Loading search...</p></div>}>
      <SearchPageContent />
    </Suspense>
  );
}