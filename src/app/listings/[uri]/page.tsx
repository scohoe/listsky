'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BskyAgent, ComAtprotoRepoGetRecord } from '@atproto/api';
import { CodeProject } from '@/components/code-project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getAgent } from '@/lib/atproto';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, ExternalLink, MapPin, Tag, DollarSign, CalendarDays, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

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
  allowDirectMessage?: boolean;
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

interface FullPostView {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: {
    $type: string;
    text: string;
    createdAt: string;
    langs?: string[];
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
    'app.bsky.feed.listing'?: ListingPostRecord; // Our custom data
  };
  embed?: any; // Duplicates record.embed for convenience sometimes
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  indexedAt: string;
  labels?: any[];
}

const ListingDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { session } = useAuth();
  const [post, setPost] = useState<FullPostView | null>(null);
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
        const agent = getAgent();
        // A full AT URI looks like: at://{did}/{collection}/{rkey}
        // We need to parse this to use com.atproto.repo.getRecord
        const parts = atUri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
        if (!parts) {
          throw new Error('Invalid AT URI format.');
        }
        const [, repo, collection, rkey] = parts;

        const response = await agent.com.atproto.repo.getRecord({ repo, collection, rkey });
        
        if (!response.success || !response.data.value) {
          throw new Error('Failed to fetch post details or post not found.');
        }

        // We need to reconstruct a FullPostView-like object for consistency
        // getRecord returns { uri, cid, value (this is the record) }
        // We're missing author profile, counts, etc. that getPostThread or getPosts would give.
        // For a full view, we might need to make additional calls or use a different endpoint if available.
        // For now, we'll work with what getRecord gives and simulate the rest or leave blank.
        
        // Attempt to get author profile for more details
        let authorProfile = { did: repo, handle: repo }; // Fallback
        try {
            const profileRes = await agent.getProfile({ actor: repo });
            if (profileRes.success) {
                authorProfile = profileRes.data;
            }
        } catch (profileError) {
            console.warn('Could not fetch author profile:', profileError);
        }

        const recordValue = response.data.value as any;
        const listingData = recordValue['app.bsky.feed.listing'];

        if (!listingData) {
            throw new Error('This post does not appear to be a listing.');
        }

        setPost({
            uri: response.data.uri,
            cid: response.data.cid as string,
            author: authorProfile as FullPostView['author'], // Cast needed due to simplified fetch
            record: {
                ...recordValue,
                'app.bsky.feed.listing': listingData,
            },
            // Counts and other fields would ideally come from a richer endpoint like getPostThread
            indexedAt: recordValue.createdAt, // Assuming indexedAt is similar to createdAt for getRecord
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

  const getImageUrl = (imageBlob: EmbeddedImage, authorDid: string): string => {
    return `https://cdn.bsky.app/img/feed_fullsize/plain/${authorDid}/${imageBlob.image.ref.$link}@jpeg`;
  };

  const handleNextImage = () => {
    if (post?.record.embed?.$type === 'app.bsky.embed.images') {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % post.record.embed.images.length);
    }
  };

  const handlePrevImage = () => {
    if (post?.record.embed?.$type === 'app.bsky.embed.images') {
      setCurrentImageIndex((prevIndex) => (prevIndex - 1 + post.record.embed.images.length) % post.record.embed.images.length);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
        <p className="ml-4 text-lg">Loading listing details...</p>
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
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  if (!post || !post.record['app.bsky.feed.listing']) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <Alert>
          <AlertTitle>Listing Not Found</AlertTitle>
          <AlertDescription>The listing you are looking for does not exist or is not a valid listing.</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const listing = post.record['app.bsky.feed.listing']!;
  const images = post.record.embed?.$type === 'app.bsky.embed.images' ? post.record.embed.images : [];

  return (
    <CodeProject id="listing-detail-page">
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl">
        <Button onClick={() => router.back()} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Listings
        </Button>

        <Card className="overflow-hidden">
          <CardHeader className="p-0">
            {images.length > 0 && (
              <div className="relative aspect-video bg-muted">
                <img 
                  src={getImageUrl(images[currentImageIndex], post.author.did)}
                  alt={images[currentImageIndex].alt || listing.title}
                  className="object-contain w-full h-full"
                  onError={(e) => { e.currentTarget.src = `/placeholder.svg?width=600&height=400&query=${encodeURIComponent(listing.title)}`; }}
                />
                {images.length > 1 && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/70 hover:bg-background/90"
                      onClick={handlePrevImage}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/70 hover:bg-background/90"
                      onClick={handleNextImage}
                    >
                      <ArrowLeft className="h-5 w-5 rotate-180" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5">
                        {images.map((_, index) => (
                            <button 
                                key={index} 
                                onClick={() => setCurrentImageIndex(index)}
                                className={`h-2 w-2 rounded-full ${index === currentImageIndex ? 'bg-primary' : 'bg-muted-foreground/50'}`}
                                aria-label={`View image ${index + 1}`}
                            />
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4">
                <div>
                    <CardTitle className="text-3xl font-bold tracking-tight mb-1">{listing.title}</CardTitle>
                    {listing.price && (
                        <p className="text-2xl font-semibold text-primary flex items-center">
                            <DollarSign className="h-6 w-6 mr-2 opacity-70" /> {listing.price}
                        </p>
                    )}
                </div>
                <div className="mt-3 md:mt-0 md:text-right">
                    <Link href={`/profile/${post.author.handle}`} className="flex items-center justify-end group">
                        <div className="mr-3 text-right">
                            <p className="font-semibold group-hover:text-primary transition-colors">{post.author.displayName || post.author.handle}</p>
                            <p className="text-xs text-muted-foreground">@{post.author.handle}</p>
                        </div>
                        <Avatar className="h-12 w-12 group-hover:ring-2 group-hover:ring-primary transition-all">
                            <AvatarImage src={post.author.avatar} alt={post.author.handle} />
                            <AvatarFallback>{(post.author.displayName || post.author.handle).substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end">
                        <CalendarDays className="h-3 w-3 mr-1.5 opacity-70" /> Posted: {new Date(listing.createdAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {listing.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                <h3 className="text-lg font-semibold mb-1">Description</h3>
                <p>{listing.description.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6 text-sm">
                {listing.category && (
                    <div className="flex items-start">
                        <Badge variant="secondary" className="mr-3 mt-0.5"><ListFilter className="h-4 w-4"/></Badge> {/* Assuming ListFilter is an icon */} 
                        <div>
                            <p className="text-muted-foreground">Category</p>
                            <p className="font-medium">{listing.category}</p>
                        </div>
                    </div>
                )}
                {listing.location?.zipCode && (
                    <div className="flex items-start">
                        <Badge variant="secondary" className="mr-3 mt-0.5"><MapPin className="h-4 w-4"/></Badge>
                        <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium">{listing.location.zipCode}{listing.location.address ? `, ${listing.location.address}` : ''}</p>
                        </div>
                    </div>
                )}
            </div>

            {listing.tags && listing.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Tag className="h-5 w-5 mr-2 opacity-70"/> Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="p-6 bg-muted/30 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground flex items-center">
              <CalendarDays className="h-4 w-4 mr-2 opacity-70" /> Posted on {new Date(listing.createdAt).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              {session?.did !== post.author.did && (
                listing.allowDirectMessage ? (
                  <Link 
                    href={`https://bsky.app/messages/${post.author.did}?text=${encodeURIComponent(`Regarding your listing: "${listing.title}" (${post.uri})`)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    passHref
                  >
                    <Button variant="default">
                      <MessageSquare className="mr-2 h-4 w-4" /> Direct Message Seller
                    </Button>
                  </Link>
                ) : (
                  <Link 
                    href={`https://bsky.app/profile/${post.author.handle}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    passHref
                  >
                    <Button variant="outline">
                      <ExternalLink className="mr-2 h-4 w-4" /> View Seller Profile
                    </Button>
                  </Link>
                )
              )}
              {session?.did === post.author.did && (
                  <Link href={`/listings/edit/${encodeURIComponent(post.uri)}`} passHref>
                      <Button variant="outline">Edit Listing</Button>
                  </Link>
              )}
              {/* Placeholder for future actions like 'Save' or 'Report' */}
            </div>
          </CardFooter>
        </Card>
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