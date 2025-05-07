'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BskyAgent } from '@atproto/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
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

export default function NewListingPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const agent = getAgent();
    const session = await getCurrentSession();

    if (!session) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to create a listing.',
        variant: 'destructive',
      });
      router.push('/auth/login');
      setIsLoading(false);
      return;
    }

    const listingRecord: ListingRecord = {
      $type: 'app.bsky.feed.listing',
      title,
      description,
      createdAt: new Date().toISOString(),
      ...(price && { price }),
      ...(category && { category }),
      ...(location && { location }),
    };

    try {
      await agent.post({
        repo: session.did,
        collection: 'app.bsky.feed.listing', // Use the NSID defined in lexicon
        record: listingRecord,
      });

      toast({
        title: 'Listing Created',
        description: 'Your listing has been successfully posted.',
      });
      router.push('/listings'); // Redirect to listings page after creation
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: 'Error Creating Listing',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Listing</CardTitle>
          <CardDescription>Fill in the details for your listing.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Used Bicycle for Sale"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your item, service, or opportunity..."
                required
                rows={5}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (Optional)</Label>
                <Input
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g., $100, Free, OBO"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., For Sale, Housing, Services"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., San Francisco, CA"
              />
            </div>
            {/* Add image upload later */}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Listing...' : 'Create Listing'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}