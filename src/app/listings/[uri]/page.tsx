'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BskyAgent, ComAtprotoRepoGetRecord, BlobRef } from '@atproto/api';
import { CodeProject } from '@/components/code-project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getAgent } from '@/lib/atproto';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ExternalLink, MapPin, Tag, DollarSign, CalendarDays, MessageSquare, ListFilter } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ListingRecord, ListingView } from '@/lib/marketplace-api';

// Using the proper marketplace interfaces from the API
// ListingRecord and ListingView are imported from marketplace-api.ts

const ListingDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { session, agent } = useAuth();
  const [listing, setListing] = useState<ListingView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // The URI from the route will be URL encoded. We need to decode it.
  // However, AT URIs typically don't have characters that need encoding in path segments.
  // Example: at://did:plc:xxxx/app.bsky.feed.post/3kxyz123
  // The last segment is the record key (rkey).
  // We need to reconstruct the full AT URI if only part of it is passed.
  // For this example, we assume `params.uri` is the full AT URI of the post.
  // If it's just the rkey, we'd need the author's DID and collection too.
  // The browse page link should provide the full URI: `/profile/${item.author.handle}/post/${item.uri.split('/').pop()}`
  // This means params.uri is actually the rkey. We need author's handle from the path too.
  // Let's adjust the route to be /listings/[authorHandle]/[rkey]/page.tsx for clarity
  // For now, assuming params.uri is the full AT URI for simplicity, but this needs to be robust.
  // The browse page currently links to /profile/[handle]/post/[rkey]
  // We should make a dedicated listing view: /listings/[authorDid]/[rkey]
  // Or even better /listings/[atUri]
  // Let's assume `params.uri` is the *encoded* full AT URI.

  const atUri = params.uri ? decodeURIComponent(params.uri as string) : null;

  useEffect(() => {
    if (!atUri) {
      setError('Listing URI is missing.');
      setIsLoading(false);
      return;
    }

    const fetchPostDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const agent = await getAgent();
        // A full AT URI looks like: at://{did}/{collection}/{rkey}
        // We need to parse this to use com.atproto.repo.getRecord
        const parts = atUri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
        if (!parts) {
          throw new Error('Invalid AT URI format.');
        }
        const [, repo, collection, rkey] = parts;

        const response = await agent.com.atproto.repo.getRecord({ repo, collection, rkey });
        
        if (!response.success || !response.data.value) {
          throw new Error('Failed to fetch listing details or listing not found.');
        }

        // Attempt to get author profile for better display
        let authorProfile: any = { did: repo, handle: repo, displayName: repo, avatar: null }; // Fallback
        try {
            const profileRes = await agent.getProfile({ actor: repo });
            if (profileRes.success) {
                authorProfile = profileRes.data as any;
            }
        } catch (profileError) {
            console.warn('Could not fetch author profile:', profileError);
        }

        const recordValue = response.data.value as ListingRecord;
        
        // Validate that this is actually a listing record
        if (!recordValue.title || !recordValue.description) {
            throw new Error('This record does not appear to be a valid listing.');
        }

        // Check if listing is active
        if (recordValue.status && recordValue.status !== 'active') {
            throw new Error(`This listing is ${recordValue.status} and no longer available.`);
        }

        // Check if listing has expired
        if (recordValue.expiresAt) {
            const expiryDate = new Date(recordValue.expiresAt);
            if (expiryDate < new Date()) {
                throw new Error('This listing has expired.');
            }
        }

        setListing({
            uri: response.data.uri,
            cid: response.data.cid as string,
            author: {
                did: repo,
                handle: authorProfile.handle,
                displayName: authorProfile.displayName || authorProfile.handle,
                avatar: authorProfile.avatar,
            },
            record: recordValue,
            indexedAt: recordValue.createdAt,
        });

      } catch (err) {
        console.error('Error fetching post details:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostDetails();
  }, [atUri]);

  const getImageUrl = (imageBlob: BlobRef, authorDid: string): string => {
    return `https://cdn.bsky.app/img/feed_fullsize/plain/${authorDid}/${imageBlob.ref}@jpeg`;
  };

  const handleNextImage = () => {
    if (listing?.record.images && listing.record.images.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % listing.record.images.length);
    }
  };

  const handlePrevImage = () => {
    if (listing?.record.images && listing.record.images.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex - 1 + listing.record.images.length) % listing.record.images.length);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex justify-center items-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-lg font-medium text-gray-700">Loading listing details...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait while we fetch the information</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-white">⚠️</span>
            </div>
          </div>
          <Alert variant="destructive" className="bg-red-50 border-red-200 shadow-lg">
            <AlertTitle className="text-red-800">Error Loading Listing</AlertTitle>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <Button 
              onClick={() => router.back()} 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!listing || !listing.record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl text-white">🔍</span>
            </div>
          </div>
          <Alert className="bg-gray-50 border-gray-200 shadow-lg">
            <AlertTitle className="text-gray-800">Listing Not Found</AlertTitle>
            <AlertDescription className="text-gray-600">The listing you are looking for does not exist or is not a valid listing.</AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button 
              onClick={() => router.back()} 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const listingRecord = listing.record;
  const images = listingRecord.images || [];

  return (
    <CodeProject id="listing-detail-page">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-5xl">
          <Button 
            onClick={() => router.back()} 
            variant="outline" 
            className="mb-8 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Listings
          </Button>

          <Card className="overflow-hidden bg-white/90 backdrop-blur-sm border border-gray-200 shadow-2xl">
          <CardHeader className="p-0">
            {images.length > 0 && (
              <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200">
                <img 
                  src={getImageUrl(images[currentImageIndex], listing.author.did)}
                  alt={`Image for ${listingRecord.title}`}
                  className="object-contain w-full h-full rounded-t-lg"
                  onError={(e) => { e.currentTarget.src = `/placeholder.svg?width=600&height=400&query=${encodeURIComponent(listingRecord.title)}`; }}
                />
                {images.length > 1 && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/95 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-200"
                      onClick={handlePrevImage}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/95 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-200"
                      onClick={handleNextImage}
                    >
                      <ArrowLeft className="h-5 w-5 rotate-180" />
                    </Button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 bg-black/20 backdrop-blur-sm rounded-full px-3 py-2">
                        {images.map((_, index) => (
                            <button 
                                key={index} 
                                onClick={() => setCurrentImageIndex(index)}
                                className={`h-3 w-3 rounded-full transition-all duration-200 ${index === currentImageIndex ? 'bg-white shadow-lg' : 'bg-white/50 hover:bg-white/70'}`}
                                aria-label={`View image ${index + 1}`}
                            />
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
                <div className="flex-1">
                    <CardTitle className="text-4xl font-bold tracking-tight mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {listingRecord.title}
                    </CardTitle>
                    {listingRecord.price && (
                        <div className="inline-flex items-center bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-2 rounded-full shadow-lg">
                            <DollarSign className="h-5 w-5 mr-2" /> 
                            <span className="text-xl font-semibold">{listingRecord.price}</span>
                        </div>
                    )}
                </div>
                <div className="mt-4 md:mt-0 md:text-right">
                    <Link href={`/profile/${listing.author.handle}`} className="flex items-center justify-end group">
                        <div className="mr-4 text-right">
                            <p className="font-semibold text-lg group-hover:text-blue-600 transition-colors">{listing.author.displayName || listing.author.handle}</p>
                            <p className="text-sm text-gray-500">@{listing.author.handle}</p>
                        </div>
                        <Avatar className="h-14 w-14 group-hover:ring-4 group-hover:ring-blue-200 transition-all duration-200 shadow-lg">
                            <AvatarImage src={listing.author.avatar} alt={listing.author.handle} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                              {(listing.author.displayName || listing.author.handle || 'U').substring(0,2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className="mt-2 flex items-center justify-end text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-1">
                        <CalendarDays className="h-4 w-4 mr-2" /> 
                        Posted: {new Date(listingRecord.createdAt).toLocaleDateString()}
                    </div>
                </div>
            </div>

            {listingRecord.description && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
                  <span className="text-blue-600 mr-2">📝</span> Description
                </h3>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {listingRecord.description.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {listingRecord.category && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mr-3">
                                <ListFilter className="h-4 w-4 text-white"/>
                            </div>
                            <p className="text-sm font-medium text-gray-600">Category</p>
                        </div>
                        <p className="font-semibold text-lg text-gray-800">{listingRecord.category}</p>
                    </div>
                )}
                {listingRecord.condition && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                                <Tag className="h-4 w-4 text-white"/>
                            </div>
                            <p className="text-sm font-medium text-gray-600">Condition</p>
                        </div>
                        <p className="font-semibold text-lg text-gray-800 capitalize">{listingRecord.condition}</p>
                    </div>
                )}
                {listingRecord.location?.zipCode && (
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center mb-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mr-3">
                                <MapPin className="h-4 w-4 text-white"/>
                            </div>
                            <p className="text-sm font-medium text-gray-600">Location</p>
                        </div>
                        <p className="font-semibold text-lg text-gray-800">
                          {listingRecord.location.zipCode}{listingRecord.location.address ? `, ${listingRecord.location.address}` : ''}
                        </p>
                    </div>
                )}
            </div>

            {listingRecord.tags && listingRecord.tags.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 flex items-center text-gray-800">
                  <span className="text-orange-600 mr-2">🏷️</span> Tags
                </h3>
                <div className="flex flex-wrap gap-3">
                  {listingRecord.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-purple-100 transition-all duration-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-8 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="text-sm text-gray-600 flex items-center bg-white rounded-lg px-4 py-2 shadow-sm">
              <CalendarDays className="h-4 w-4 mr-2 text-blue-600" /> 
              Posted on {new Date(listingRecord.createdAt).toLocaleDateString()}
            </div>
            <div className="flex gap-3">
              {agent.session?.did !== listing.author.did && (
                listingRecord.allowMessages ? (
                  <Link 
                    href={`https://bsky.app/messages/${listing.author.did}?text=${encodeURIComponent(`Regarding your listing: "${listingRecord.title}" (${listing.uri})`)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    passHref
                  >
                    <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                      <MessageSquare className="mr-2 h-4 w-4" /> Direct Message Seller
                    </Button>
                  </Link>
                ) : (
                  <Link 
                    href={`https://bsky.app/profile/${listing.author.handle}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    passHref
                  >
                    <Button variant="outline" className="border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md">
                      <ExternalLink className="mr-2 h-4 w-4" /> View Seller Profile
                    </Button>
                  </Link>
                )
              )}
              {agent.session?.did === listing.author.did && (
                  <Link href={`/listings/${encodeURIComponent(listing.uri)}/edit`} passHref>
                      <Button 
                        variant="outline" 
                        className="border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        Edit Listing
                      </Button>
                  </Link>
              )}
              {/* Placeholder for future actions like 'Save' or 'Report' */}
            </div>
          </CardFooter>
          </Card>
        </div>
      </div>
    </CodeProject>
  );
};

export default ListingDetailPage;

// Helper icon component (example, if not already available)
// const ListFilter = (props: React.SVGProps<SVGSVGElement>) => (
//   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
//     <path d="M3 6h18M7 12h10M10 18h4"/>
//   </svg>
// );