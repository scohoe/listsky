'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ListingFilters, { FilterOptions } from '@/components/listing-filters';
import { useState, useEffect } from 'react';
import { getAgent, getCurrentSession } from '@/lib/atproto';
import { AppBskyFeedDefs, BskyAgent } from '@atproto/api';

// Use the FeedViewPost structure which includes the post and author details
// The actual listing data is within post.record
interface ListingPost extends AppBskyFeedDefs.FeedViewPost {
  post: AppBskyFeedDefs.PostView & {
    record: {
      // Define the expected structure based on our lexicon
      $type: 'app.bsky.feed.listing';
      title: string;
      description: string;
      price?: string;
      createdAt: string;
      category?: string;
      location?: string;
      // images?: any[]; // Add later
    }
  }
}

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingPost[]>([]);
  const [filteredListings, setFilteredListings] = useState<ListingPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({  
    category: 'All Categories',
    priceMin: 0,
    priceMax: 5000,
    location: '',
    keywords: ''
  });

  // Apply filters to listings
  useEffect(() => {
    if (listings.length === 0) return;
    
    let filtered = [...listings];
    
    // Filter by category
    if (filters.category !== 'All Categories') {
      filtered = filtered.filter(item => 
        item.post.record.category?.toLowerCase() === filters.category.toLowerCase()
      );
    }
    
    // Filter by price range
    if (filters.priceMin > 0 || filters.priceMax < 5000) {
      filtered = filtered.filter(item => {
        // Extract numeric value from price string (e.g., "$100" -> 100)
        const priceStr = item.post.record.price || '';
        const priceMatch = priceStr.match(/\$?(\d+)/);
        if (!priceMatch) return false;
        
        const price = parseInt(priceMatch[1]);
        return price >= filters.priceMin && price <= filters.priceMax;
      });
    }
    
    // Filter by location
    if (filters.location) {
      filtered = filtered.filter(item => 
        item.post.record.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    // Filter by keywords in title or description
    if (filters.keywords) {
      const keywords = filters.keywords.toLowerCase();
      filtered = filtered.filter(item => 
        item.post.record.title.toLowerCase().includes(keywords) ||
        item.post.record.description.toLowerCase().includes(keywords)
      );
    }
    
    setFilteredListings(filtered);
  }, [listings, filters]);
  
  // Handle filter changes from the ListingFilters component
  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };
  
  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true);
      setError(null);
      setListings([]); // Clear previous listings

      try {
        const agent = getAgent();
        const session = await getCurrentSession();

        if (!session) {
          // For a public browse page, we might fetch a general feed or popular listings
          // For now, we'll show a friendly message and a login button
          setError('Please log in to view and create listings');
          setIsLoading(false);
          return;
        } else {
           // Fetch the feed for the current user if session exists
           const response = await agent.app.bsky.feed.getAuthorFeed({
             actor: session.did,
             limit: 50, // Adjust limit as needed
           });

           if (response.success) {
             // Filter for posts that match our listing schema NSID
             const listingPosts = response.data.feed.filter(
               (item): item is ListingPost =>
                 AppBskyFeedDefs.isFeedViewPost(item) &&
                 item.post.record?.$type === 'app.bsky.feed.listing'
             );
             setListings(listingPosts);
           } else {
             setError('Failed to fetch listings.');
           }
        }

      } catch (err) {
        console.error('Error fetching listings:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching listings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, []); // Re-run if needed based on auth state changes (add dependency later)
  
  // Initialize filtered listings with all listings when listings change
  useEffect(() => {
    setFilteredListings(listings);
  }, [listings]);

  // Mock listings (remove or comment out after implementing fetch)
  /* const mockListings = [
    {
      id: '1',
      title: 'Vintage Bicycle',
      description: 'Well-maintained vintage road bike from the 1980s. Perfect working condition.',
      price: '$250',
      location: 'Brooklyn, NY',
      category: 'Bicycles',
      createdAt: '2023-11-15',
      author: {
        did: 'did:plc:abcdefg',
        handle: 'seller.bsky.social',
      },
      image: '/placeholder.svg?width=400&height=300&query=bicycle'
    },
    {
      id: '2',
      title: 'iPhone 13 Pro - Excellent Condition',
      description: 'iPhone 13 Pro 128GB in excellent condition. Includes original box and accessories.',
      price: '$650',
      location: 'San Francisco, CA',
      category: 'Electronics',
      createdAt: '2023-11-14',
      author: {
        did: 'did:plc:hijklmn',
        handle: 'techseller.bsky.social',
      },
      image: '/placeholder.svg?width=400&height=300&query=iphone'
    },
    {
      id: '3',
      title: 'Modern Coffee Table',
      description: 'Sleek modern coffee table with glass top and wooden legs. Barely used.',
      price: '$120',
      location: 'Austin, TX',
      category: 'Furniture',
      createdAt: '2023-11-13',
      author: {
        did: 'did:plc:opqrstu',
        handle: 'homeseller.bsky.social',
      },
      image: '/placeholder.svg?width=400&height=300&query=table'
    },
    {
      id: '4',
      title: 'Web Development Services',
      description: 'Professional web development services. Specializing in React, Next.js, and Node.',
      price: '$75/hr',
      location: 'Remote',
      category: 'Services',
      createdAt: '2023-11-12',
      author: {
        did: 'did:plc:vwxyz',
        handle: 'developer.bsky.social',
      },
      image: '/placeholder.svg?width=400&height=300&query=coding'
    },
    {
      id: '5',
      title: 'Mountain Bike - Trek',
      description: 'Trek mountain bike in great condition. Recently serviced with new brakes and tires.',
      price: '$400',
      location: 'Denver, CO',
      category: 'Bicycles',
      createdAt: '2023-11-11',
      author: {
        did: 'did:plc:123456',
        handle: 'bikerider.bsky.social',
      },
      image: '/placeholder.svg?width=400&height=300&query=mountain+bike'
    },
    {
      id: '6',
      title: 'Apartment for Rent - 2BR',
      description: 'Spacious 2-bedroom apartment available for rent. Utilities included, pet-friendly.',
      price: '$1,800/mo',
      location: 'Chicago, IL',
      category: 'Housing',
      createdAt: '2023-11-10',
      author: {
        did: 'did:plc:789012',
        handle: 'landlord.bsky.social',
      },
      image: '/placeholder.svg?width=400&height=300&query=apartment'
    },
  ]; */

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="w-full md:w-1/4 sticky top-20">
          <ListingFilters onFilterChange={handleFilterChange} />
        </div>
        
        <div className="w-full md:w-3/4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Browse Listings</h1>
            <Button asChild>
              <Link href="/listings/new">Create Listing</Link>
            </Button>
          </div>
          
          {isLoading && <p className="text-center text-muted-foreground my-4">Loading listings...</p>}
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
            <p className="text-center text-muted-foreground my-4">No listings found matching 'app.bsky.feed.listing' in this feed.</p>
          )}
          {!isLoading && !error && listings.length > 0 && filteredListings.length === 0 && (
            <p className="text-center text-muted-foreground my-4">No listings match the current filters.</p>
          )}
          {!isLoading && !error && filteredListings.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredListings.map(({ post }) => {
                // Placeholder image - replace with actual image handling later if needed
                const imageUrl = `/placeholder.svg?width=400&height=300&query=${encodeURIComponent(post.record.category || 'listing')}`;
                return (
                  <Card key={post.uri} className="overflow-hidden flex flex-col h-full">
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={post.record.title}
                        className="object-cover w-full h-full transition-transform hover:scale-105"
                      />
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{post.record.title}</CardTitle>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">{post.record.price || 'N/A'}</span>
                        <span className="text-sm text-muted-foreground">{post.record.location || 'Unknown Location'}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-muted-foreground line-clamp-2">{post.record.description}</p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {post.record.category && <span className="text-xs px-2 py-1 bg-secondary rounded-full">{post.record.category}</span>}
                        <span className="text-xs text-muted-foreground">Posted {new Date(post.record.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      <div className="flex justify-between items-center w-full">
                         <Link href={`https://bsky.app/profile/${post.author.handle}`} target="_blank" rel="noopener noreferrer" className="text-sm hover:underline">
                           @{post.author.handle}
                         </Link>
                        {/* Link to the detailed view page */}
                         <Button variant="outline" size="sm" asChild>
                           <Link href={`/listings/${encodeURIComponent(post.uri)}`}>View Details</Link>
                         </Button>
                      </div>
                    </CardFooter>
                  </Card>
                )}
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}