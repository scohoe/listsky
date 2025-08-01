'use client';

import React, { useEffect, useState } from 'react';
import { withAuth } from '@/components/with-auth';
import { CodeProject } from '@/components/code-project';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useAtom } from 'jotai';
import { agentAtom } from '@/lib/atproto';
import { AtUri } from '@atproto/api';

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

interface MyListing {
  uri: string;
  cid: string;
  text: string;
  listingData: ListingPostRecord;
  embed?: {
    $type: 'app.bsky.embed.images';
    images: EmbeddedImage[];
  } | {
    $type: 'app.bsky.embed.record';
    record: any;
  } | {
    $type: 'app.bsky.embed.external';
    external: any;
  };
  indexedAt: string;
  createdAt: string;
}

function MyListingsPage() {
  const [agent] = useAtom(agentAtom);
  const [listings, setListings] = useState<MyListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Function to get image URL from the embed
  const getImageUrl = (image: EmbeddedImage, did: string) => {
    if (!image || !image.image || !image.image.ref || !image.image.ref.$link) {
      return `/placeholder.svg?width=300&height=200`;
    }
    return `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${image.image.ref.$link}`;
  };

  const fetchMyListings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!agent || !agent.session) {
        setError('Please log in to view your listings');
        setIsLoading(false);
        return;
      }

      // Get the user's repository records
      const response = await agent.api.com.atproto.repo.listRecords({
        repo: agent.session.did,
        collection: 'app.bsky.feed.post',
        limit: 100,
      });

      if (!response.success) {
        throw new Error('Failed to fetch your listings.');
      }

      // Filter posts that have the listing schema
      const myListings: MyListing[] = [];

      for (const record of response.data.records) {
        const value = record.value as any;
        
        // Check if this post contains listing data
        if (value && value.listing) {
          myListings.push({
            uri: record.uri,
            cid: record.cid,
            text: value.text || '',
            listingData: {
              ...value.listing,
              createdAt: value.listing.createdAt || value.createdAt,
            },
            embed: value.embed,
            indexedAt: record.indexedAt,
            createdAt: value.createdAt,
          });
        }
      }

      setListings(myListings);
    } catch (err) {
      console.error('Error fetching your listings:', err);
      setError('Failed to load your listings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteListing = async (uri: string) => {
    if (!agent || !agent.session) {
      setError('Please log in to delete your listing');
      return;
    }

    setIsDeleting(uri);
    try {
      const atUri = new AtUri(uri);
      await agent.api.com.atproto.repo.deleteRecord({
        repo: agent.session.did,
        collection: atUri.collection,
        rkey: atUri.rkey,
      });

      // Remove the deleted listing from the state
      setListings(listings.filter(listing => listing.uri !== uri));
    } catch (err) {
      console.error('Error deleting listing:', err);
      setError('Failed to delete listing. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    if (agent && agent.session) {
      fetchMyListings();
    }
  }, [agent]);

  return (
    <CodeProject id="my-listings">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            My Listings
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage your active and past listings.
          </p>
        </header>

        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your listings...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && listings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-6">
              You haven&apos;t created any listings yet.
            </p>
            <Button asChild size="lg">
              <Link href="/listings/new">Create New Listing</Link>
            </Button>
          </div>
        )}

        {!isLoading && !error && listings.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">
                Showing {listings.length} listing{listings.length !== 1 ? 's' : ''}
              </p>
              <Button asChild>
                <Link href="/listings/new">Create New Listing</Link>
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Card key={listing.uri} className="flex flex-col">
                  <CardHeader>
                    {listing.embed && listing.embed.$type === 'app.bsky.embed.images' && listing.embed.images.length > 0 && (
                      <div className="aspect-video relative overflow-hidden rounded-t-md -mx-6 -mt-6 mb-4">
                        <img 
                          src={getImageUrl(listing.embed.images[0], agent?.session?.did || '')}
                          alt={listing.embed.images[0].alt || listing.listingData.title}
                          className="object-cover w-full h-full"
                          onError={(e) => { 
                            e.currentTarget.src = `/placeholder.svg?width=300&height=200&query=${encodeURIComponent(listing.listingData.title || 'listing')}`;
                          }}
                        />
                      </div>
                    )}
                    <CardTitle className="text-xl leading-tight hover:text-primary transition-colors">
                      <Link href={`/listings/${encodeURIComponent(listing.uri)}`}>{listing.listingData.title}</Link>
                    </CardTitle>
                    {listing.listingData.price && (
                      <p className="text-lg font-semibold text-primary">{listing.listingData.price}</p>
                    )}
                    <CardDescription className="text-xs">
                      Posted on {new Date(listing.listingData.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {listing.listingData.description}
                    </p>
                    {listing.listingData.category && (
                      <p className="text-xs mt-2">Category: <span className="font-medium">{listing.listingData.category}</span></p>
                    )}
                    {listing.listingData.location?.zipCode && (
                      <p className="text-xs">Location: <span className="font-medium">{listing.listingData.location.zipCode}</span></p>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" asChild>
                      <Link href={`/listings/${encodeURIComponent(listing.uri)}`}>View Details</Link>
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/listings/${encodeURIComponent(listing.uri)}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => handleDeleteListing(listing.uri)}
                        disabled={isDeleting === listing.uri}
                      >
                        {isDeleting === listing.uri ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </CodeProject>
  );
}

export default withAuth(MyListingsPage);