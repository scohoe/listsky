'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BskyAgent, ComAtprotoRepoGetRecord } from '@atproto/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAgent, getCurrentSession } from '@/lib/atproto';

// Define the structure for our listing record based on the Lexicon schema
interface ListingRecord {
  $type: 'app.bsky.feed.listing';
  title: string;
  description: string;
  price?: string;
  category?: string;
  location?: string;
  createdAt: string;
  // images?: any[]; // Add image handling later
}

interface ListingDetails {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: ListingRecord;
  indexedAt: string;
}

export default function ListingDetailPage() {
  const params = useParams();
  const encodedUri = params.uri as string;
  const [listing, setListing] = useState<ListingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!encodedUri) return;

    const uri = decodeURIComponent(encodedUri);
    // Basic validation: at://did:plc:repo/collection/tid
    if (!uri || !uri.startsWith('at://') || uri.split('/').length !== 5) {
      setError('Invalid listing URI format.');
      setIsLoading(false);
      return;
    }

    const fetchListingDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const agent = getAgent();
        // No session needed for public read

        // Extract repo and rkey from URI
        const parts = uri.replace('at://', '').split('/');
        const repo = parts[0];
        const collection = parts[1];
        const rkey = parts[2];

        if (collection !== 'app.bsky.feed.listing') {
           setError('URI does not point to a listing record.');
           setIsLoading(false);
           return;
        }

        const response = await agent.com.atproto.repo.getRecord({
          repo: repo,
          collection: collection,
          rkey: rkey,
        });

        if (response.success && response.data.value.$type === 'app.bsky.feed.listing') {
          // Fetch author profile for more details
          const profileRes = await agent.getProfile({ actor: repo });
          
          setListing({
            uri: response.data.uri,
            cid: response.data.cid,
            author: {
              did: profileRes.data.did,
              handle: profileRes.data.handle,
              displayName: profileRes.data.displayName,
              avatar: profileRes.data.avatar,
            },
            record: response.data.value as ListingRecord,
            indexedAt: '', // getRecord doesn't provide indexedAt, might need getPostThread or similar if needed
          });
        } else {
          setError('Listing not found or invalid type.');
        }
      } catch (err) {
        console.error('Error fetching listing details:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListingDetails();
  }, [encodedUri]);

  if (isLoading) {
    return <div className="container mx-auto px-4 py-12 text-center">Loading listing details...</div>;
  }

  if (error) {
    return <div className="container mx-auto px-4 py-12 text-center text-red-500">Error: {error}</div>;
  }

  if (!listing) {
    return <div className="container mx-auto px-4 py-12 text-center">Listing not found.</div>;
  }

  // Placeholder image
  const imageUrl = `/placeholder.svg?width=800&height=600&query=${encodeURIComponent(listing.record.category || 'listing')}`;

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-4xl mx-auto overflow-hidden">
        <div className="md:flex">
          <div className="md:flex-shrink-0 md:w-1/2">
            <img 
              src={imageUrl} 
              alt={listing.record.title}
              className="object-cover w-full h-64 md:h-full"
            />
          </div>
          <div className="p-8 flex flex-col justify-between md:w-1/2">
            <div>
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-3xl">{listing.record.title}</CardTitle>
                <CardDescription className="text-lg">
                  <span className="font-bold text-primary mr-4">{listing.record.price || 'Price not listed'}</span>
                  <span className="text-muted-foreground">{listing.record.location || 'Location not specified'}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 space-y-4">
                <p className="text-base">{listing.record.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {listing.record.category && (
                    <span className="text-sm px-3 py-1 bg-secondary rounded-full">{listing.record.category}</span>
                  )}
                  <span className="text-sm text-muted-foreground">Posted on {new Date(listing.record.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </div>
            <CardFooter className="px-0 pb-0 mt-6 border-t pt-4">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  {listing.author.avatar && <img src={listing.author.avatar} alt={listing.author.handle} className="w-8 h-8 rounded-full" />}
                  <Link href={`https://bsky.app/profile/${listing.author.handle}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
                    {listing.author.displayName || `@${listing.author.handle}`}
                  </Link>
                </div>
                <Button variant="outline" asChild>
                  <Link href={`https://bsky.app/profile/${listing.author.did}/post/${listing.uri.split('/').pop()}`} target="_blank" rel="noopener noreferrer">
                    View on Bluesky
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>
      <div className="text-center mt-8">
        <Button variant="link" asChild>
           <Link href="/listings">← Back to Listings</Link>
        </Button>
      </div>
    </div>
  );
}