'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { withAuth } from '@/components/with-auth';
import { CodeProject } from '@/components/code-project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox'; // Added Checkbox
import { useToast } from '@/components/ui/use-toast';
import { getAgent } from '@/lib/atproto';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ListingFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  zipCode: string;
  address: string;
  tags: string; // Comma-separated tags
  // images will be handled separately
  allowDirectMessage: boolean;
}

const NewListingPage = () => {
  const { session } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState<ListingFormData>({
    title: '',
    description: '',
    price: '',
    category: '',
    zipCode: '',
    address: '',
    tags: '',
    allowDirectMessage: false,
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (e.target.files.length > 4) {
        toast({
          title: 'Too many images',
          description: 'You can upload a maximum of 4 images.',
          variant: 'destructive',
        });
        e.target.value = ''; // Clear the input
        setSelectedFiles(null);
        setImagePreviews([]);
        return;
      }
      setSelectedFiles(e.target.files);
      const previews = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setImagePreviews(previews);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) {
      toast({ title: 'Error', description: 'You must be logged in to create a listing.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    try {
      const agent = getAgent();
      if (!agent.session) {
        throw new Error('Agent session not found. Please try logging in again.');
      }

      // Get coordinates for the ZIP code
      let coordinates = null;
      try {
        // Import the getZipCodeCoordinates function
        const { getZipCodeCoordinates } = await import('@/lib/geo-utils');
        coordinates = await getZipCodeCoordinates(formData.zipCode);
      } catch (error) {
        console.error('Error getting coordinates for ZIP code:', error);
        // Continue without coordinates - they're optional
      }

      const uploadedImageBlobs: { alt: string; image: { $type: string; ref: { $link: string }; mimeType: string; size: number } }[] = [];
      if (selectedFiles) {
        for (const file of Array.from(selectedFiles)) {
          const response = await agent.com.atproto.repo.uploadBlob(new Uint8Array(await file.arrayBuffer()), {
            encoding: file.type,
          });
          if (response.success) {
            uploadedImageBlobs.push({ 
              alt: formData.title || 'Listing image', 
              image: { 
                $type: 'blob', // Correctly identify as a blob reference
                ref: { $link: response.data.blob.ref.toString() }, 
                mimeType: response.data.blob.mimeType, 
                size: response.data.blob.size 
              }
            });
          } else {
            throw new Error('Image upload failed.');
          }
        }
      }

      const recordToCreate = {
        // $type: 'app.bsky.feed.listing', // This is the type of our custom record data
        title: formData.title,
        description: formData.description,
        price: formData.price || undefined,
        category: formData.category || undefined,
        location: {
          zipCode: formData.zipCode,
          address: formData.address || undefined,
          // Add latitude and longitude if available
          ...(coordinates ? {
            latitude: coordinates.lat,
            longitude: coordinates.lng
          } : {})
        },
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag).length > 0 ? 
              formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : undefined,
        // images: uploadedImageBlobs.length > 0 ? uploadedImageBlobs : undefined, // This structure is for Lexicon definition, not direct post
        createdAt: new Date().toISOString(),
      };
      
      // Construct the main post record for app.bsky.feed.post
      const postRecord: any = {
        $type: 'app.bsky.feed.post',
        text: `${formData.title}${formData.price ? ` - ${formData.price}` : ''}`.substring(0, 300),
        createdAt: new Date().toISOString(),
        // Embed our custom listing data
        embed: uploadedImageBlobs.length > 0 ? {
          $type: 'app.bsky.embed.images',
          images: uploadedImageBlobs
        } : undefined,
        // Custom fields are typically added via a record embed or by defining facets for rich text.
        // For fully custom data like our listing, we should embed a record of our custom type.
        // However, the Bluesky SDK/API might have specific ways it expects custom data to be structured
        // within a standard app.bsky.feed.post. 
        // A common pattern is to put custom data into an 'embed' object of type 'app.bsky.embed.record'.
        // Let's refine this: we'll create the listing-specific data as a separate record if needed,
        // or add custom properties to the post if the PDS allows (less standard).
        // For now, we'll add our custom fields directly to the post record, prefixed to avoid collision,
        // and also include the 'app.bsky.feed.listing' type information.
        // This is a simplification; a robust solution would use a proper embed.
        'app.bsky.feed.listing': recordToCreate, // Embed our custom data under its NSID key
        langs: ['en'] // Optional: specify language
      };

      // If there are images, the primary embed should be images, and our custom data can be a facet or other field.
      // Let's adjust: if images exist, they are the primary embed. Our custom data is added as a top-level key.
      // This is still a bit of a hybrid approach. The most 'correct' way for complex custom data is often
      // to create a separate record of type 'app.bsky.feed.listing' and then create an 'app.bsky.feed.post'
      // that embeds a link to that listing record using 'app.bsky.embed.record'.
      // This requires two separate record creation steps.

      // Simpler approach for now: Make the post itself the listing, using our custom type as the $type of the record.
      // This means the collection will be 'app.bsky.feed.post' but the record's $type will be 'app.bsky.feed.listing'.
      // This is not standard and might not be processed by all clients.
      // The most compatible way is to create an app.bsky.feed.post and embed your custom data.

      // Let's try the 'app.bsky.feed.post' with an embed for our custom record.
      // This requires creating the listing record first, then embedding it.
      // For simplicity in this step, we'll create a single post record that includes our listing data directly.
      // This is a common pattern for simpler custom posts.

      const finalRecord = {
        $type: 'app.bsky.feed.post', // It's a standard post
        text: `${formData.title}${formData.price ? ` - ${formData.price}` : ''}`.substring(0, 300),
        createdAt: new Date().toISOString(),
        embed: uploadedImageBlobs.length > 0 ? {
          $type: 'app.bsky.embed.images',
          images: uploadedImageBlobs
        } : undefined,
        // Here we add our custom listing data. This is a common way to extend posts.
        // The key 'app.bsky.feed.listing' acts as a namespace for our custom fields.
        'app.bsky.feed.listing': {
            title: formData.title,
            description: formData.description,
            price: formData.price || undefined,
            category: formData.category || undefined,
            location: {
              zipCode: formData.zipCode,
              address: formData.address || undefined,
            },
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag).length > 0 ? 
                  formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : undefined,
            // images are handled by the main embed if present
            allowDirectMessage: formData.allowDirectMessage,
        },
        langs: ['en'],
      };

      await agent.com.atproto.repo.createRecord({
        repo: session.did,
        collection: 'app.bsky.feed.post', 
        record: finalRecord,
      });

      toast({
        title: 'Listing Created!',
        description: 'Your listing has been successfully posted.',
      });
      router.push('/listings/my');
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: 'Error Creating Listing',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CodeProject id="new-listing-form">
      <div className="container mx-auto py-8 px-4 md:px-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight">Create New Listing</CardTitle>
            <CardDescription>Fill out the details below to post your item or service.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} required maxLength={300} />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={5} maxLength={3000} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" name="price" value={formData.price} onChange={handleChange} placeholder="e.g., $100, Free, Negotiable" maxLength={50} />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" name="category" value={formData.category} onChange={handleChange} placeholder="e.g., Electronics, Furniture" maxLength={100} />
                </div>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Location</legend>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input id="zipCode" name="zipCode" value={formData.zipCode} onChange={handleChange} required maxLength={10} />
                </div>
                <div>
                  <Label htmlFor="address">Address / General Area (Optional)</Label>
                  <Input id="address" name="address" value={formData.address} onChange={handleChange} maxLength={200} />
                </div>
              </fieldset>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., vintage, handmade, local" />
              </div>
              <div>
                <Label htmlFor="images">Images (up to 4)</Label>
                <Input id="images" name="images" type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} />
                {imagePreviews.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {imagePreviews.map((src, index) => (
                      <img key={index} src={src} alt={`Preview ${index + 1}`} className="rounded-md object-cover h-24 w-full" />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="allowDirectMessage" name="allowDirectMessage" checked={formData.allowDirectMessage} onCheckedChange={(checked) => setFormData(prev => ({...prev, allowDirectMessage: !!checked}))} />
                <Label htmlFor="allowDirectMessage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Allow direct messages for this listing
                </Label>
              </div>
              {/* Placeholder for potential AI integration for description/tags */}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Create Listing'}
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              By submitting, you agree to our terms and conditions (not yet implemented).
            </p>
          </CardFooter>
        </Card>
      </div>
    </CodeProject>
  );
};

export default withAuth(NewListingPage);