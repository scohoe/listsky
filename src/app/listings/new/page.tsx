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
  const [debugInfo, setDebugInfo] = useState<string>('');

  const testConnection = async () => {
    try {
      console.log('=== TESTING CONNECTION ===');
      const agent = getAgent();
      console.log('Agent:', !!agent);
      console.log('Agent session:', !!agent.session);
      console.log('Session DID:', agent.session?.did);
      console.log('Session handle:', agent.session?.handle);
      
      if (!agent.session) {
        setDebugInfo('❌ No agent session found');
        return;
      }
      
      // Test a simple API call
      const profile = await agent.getProfile({ actor: agent.session.did });
      console.log('Profile test result:', profile);
      
      setDebugInfo(`✅ Connection OK - DID: ${agent.session.did}, Handle: ${agent.session.handle}`);
      
      toast({
        title: 'Connection Test',
        description: 'Agent session is working correctly!',
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      setDebugInfo(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Connection Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

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
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form data:', formData);
    console.log('Selected files:', selectedFiles?.length || 0);
    console.log('Session:', session);
    
    // Basic form validation
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Please enter a title for your listing.', variant: 'destructive' });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({ title: 'Error', description: 'Please enter a description for your listing.', variant: 'destructive' });
      return;
    }
    
    if (!formData.zipCode.trim()) {
      toast({ title: 'Error', description: 'Please enter a ZIP code.', variant: 'destructive' });
      return;
    }
    
    if (!session) {
      console.error('No session found');
      toast({ title: 'Error', description: 'You must be logged in to create a listing.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    console.log('Setting isSubmitting to true');
    
    // Show immediate feedback to user
    toast({
      title: 'Creating Listing...',
      description: 'Please wait while we process your listing.',
    });

    try {
      const agent = getAgent();
      console.log('Agent obtained:', !!agent);
      console.log('Agent session:', !!agent.session);
      
      if (!agent.session) {
        throw new Error('Agent session not found. Please try logging in again.');
      }

      console.log('Starting listing creation process...');
      
      // Add timeout wrapper for the entire process
      const createListingWithTimeout = async () => {
        return Promise.race([
          createListingProcess(agent),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Listing creation timed out after 60 seconds')), 60000)
          )
        ]);
      };

      const result = await createListingWithTimeout();
      console.log('Listing creation completed successfully:', result);

      toast({
        title: 'Listing Created!',
        description: 'Your listing has been successfully posted.',
      });
      console.log('Navigating to /listings/my');
      router.push('/listings/my');
    } catch (error) {
      console.error('=== ERROR CREATING LISTING ===');
      console.error('Error details:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      let errorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Add more specific error handling
        if (error.message.includes('timeout')) {
          errorMessage = 'The request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('session')) {
          errorMessage = 'Session expired. Please log in again.';
        }
      }
      
      toast({
        title: 'Error Creating Listing',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      console.log('Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const createListingProcess = async (agent: any) => {
    console.log('=== STARTING LISTING CREATION PROCESS ===');
    console.log('Agent DID:', agent.session?.did);
    console.log('Agent handle:', agent.session?.handle);

    // Get coordinates for the ZIP code
    let coordinates = null;
    try {
      console.log('Step 1: Getting coordinates for ZIP code:', formData.zipCode);
      // Import the getZipCodeCoordinates function
      const { getZipCodeCoordinates } = await import('@/lib/geo-utils');
      coordinates = await Promise.race([
        getZipCodeCoordinates(formData.zipCode),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Geocoding timeout')), 10000)
        )
      ]);
      console.log('Step 1 completed - Coordinates obtained:', coordinates);
    } catch (error) {
      console.error('Step 1 failed - Error getting coordinates for ZIP code:', error);
      // Continue without coordinates - they're optional
    }

    console.log('Step 2: Starting image upload process');
    const uploadedImageBlobs: { alt: string; image: { $type: string; ref: { $link: string }; mimeType: string; size: number } }[] = [];
    if (selectedFiles) {
      console.log('Step 2: Uploading', selectedFiles.length, 'images...');
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`Step 2.${i + 1}: Uploading image ${i + 1}/${selectedFiles.length}:`, file.name, file.size, 'bytes');
        
        try {
          console.log(`Step 2.${i + 1}: Converting file to array buffer...`);
          const arrayBuffer = await file.arrayBuffer();
          console.log(`Step 2.${i + 1}: Array buffer created, size:`, arrayBuffer.byteLength);
          
          console.log(`Step 2.${i + 1}: Starting blob upload to AT Protocol...`);
          // Add timeout for individual image uploads
          const uploadPromise = agent.com.atproto.repo.uploadBlob(
            new Uint8Array(arrayBuffer), 
            { encoding: file.type }
          );
          
          const response = await Promise.race([
            uploadPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Image upload timeout for ${file.name}`)), 30000)
            )
          ]);
          
          console.log(`Step 2.${i + 1}: Upload response received:`, response);
          
          if (response.success) {
            console.log(`Step 2.${i + 1}: Image uploaded successfully:`, response.data.blob.ref);
            uploadedImageBlobs.push({ 
              alt: formData.title || 'Listing image', 
              image: { 
                $type: 'blob',
                ref: { $link: response.data.blob.ref.toString() }, 
                mimeType: response.data.blob.mimeType, 
                size: response.data.blob.size 
              }
            });
          } else {
            throw new Error(`Image upload failed for ${file.name}: ${JSON.stringify(response)}`);
          }
        } catch (uploadError) {
          console.error(`Step 2.${i + 1}: Failed to upload image ${file.name}:`, uploadError);
          throw new Error(`Failed to upload image ${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }
      console.log('Step 2 completed: All images uploaded successfully');
    } else {
      console.log('Step 2: No images to upload');
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

    console.log('Step 3: Creating record with data:', JSON.stringify(finalRecord, null, 2));
    
    try {
      console.log('Step 3: Preparing createRecord call...');
      console.log('Step 3: Repository DID:', agent.session.did);
      console.log('Step 3: Collection:', 'app.bsky.feed.post');
      
      // Add timeout for record creation
      const createRecordPromise = agent.com.atproto.repo.createRecord({
        repo: agent.session.did,
        collection: 'app.bsky.feed.post', 
        record: finalRecord,
      });
      
      console.log('Step 3: createRecord promise created, waiting for response...');
      
      const result = await Promise.race([
        createRecordPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Record creation timeout after 30 seconds')), 30000)
        )
      ]);
      
      console.log('Step 3 completed: Record created successfully:', result);
      return result;
    } catch (recordError) {
      console.error('Step 3 failed: Error creating record:', recordError);
      throw recordError;
    }
  };

  return (
    <CodeProject id="new-listing-form">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto py-8 px-4 md:px-6 max-w-3xl">
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-xl">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl text-white">📝</span>
              </div>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Create New Listing
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 mt-2">
                Share your item or service with the Bluesky community
              </CardDescription>
              {debugInfo && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg text-sm font-mono">
                  {debugInfo}
                </div>
              )}
              <div className="mt-4">
                <Button 
                  type="button" 
                  onClick={testConnection}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  🔧 Test Connection
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-blue-600">✨</span> Title
                </Label>
                <Input 
                  id="title" 
                  name="title" 
                  value={formData.title} 
                  onChange={handleChange} 
                  required 
                  maxLength={300}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 text-lg"
                  placeholder="What are you listing?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-green-600">📄</span> Description
                </Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  required 
                  rows={5} 
                  maxLength={3000}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                  placeholder="Describe your item or service in detail..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-emerald-600">💰</span> Price
                  </Label>
                  <Input 
                    id="price" 
                    name="price" 
                    value={formData.price} 
                    onChange={handleChange} 
                    placeholder="e.g., $100, Free, Negotiable" 
                    maxLength={50}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="text-purple-600">🏷️</span> Category
                  </Label>
                  <Input 
                    id="category" 
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange} 
                    placeholder="e.g., Electronics, Furniture" 
                    maxLength={100}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                  />
                </div>
              </div>
              <fieldset className="space-y-4 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
                <legend className="text-sm font-semibold text-gray-700 flex items-center gap-2 px-2">
                  <span className="text-red-600">📍</span> Location
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-sm font-medium text-gray-600">ZIP Code</Label>
                    <Input 
                      id="zipCode" 
                      name="zipCode" 
                      value={formData.zipCode} 
                      onChange={handleChange} 
                      required 
                      maxLength={10}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder="12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium text-gray-600">Address / General Area (Optional)</Label>
                    <Input 
                      id="address" 
                      name="address" 
                      value={formData.address} 
                      onChange={handleChange} 
                      maxLength={200}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder="Downtown, Near park, etc."
                    />
                  </div>
                </div>
              </fieldset>
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-orange-600">🏷️</span> Tags (comma-separated)
                </Label>
                <Input 
                  id="tags" 
                  name="tags" 
                  value={formData.tags} 
                  onChange={handleChange} 
                  placeholder="e.g., vintage, handmade, local, urgent"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                />
                <p className="text-xs text-gray-500">Add relevant tags to help people find your listing</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="images" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-pink-600">📸</span> Images (up to 4)
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors duration-200">
                  <Input 
                    id="images" 
                    name="images" 
                    type="file" 
                    multiple 
                    accept="image/jpeg,image/png,image/gif,image/webp" 
                    onChange={handleFileChange}
                    className="border-0 p-0 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-2">Upload clear, well-lit photos of your item</p>
                </div>
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {imagePreviews.map((src, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={src} 
                          alt={`Preview ${index + 1}`} 
                          className="rounded-xl object-cover h-24 w-full border-2 border-gray-200 group-hover:border-blue-300 transition-all duration-200" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all duration-200" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 p-4 bg-blue-50/50 rounded-xl border border-blue-200">
                <Checkbox 
                  id="allowDirectMessage" 
                  name="allowDirectMessage" 
                  checked={formData.allowDirectMessage} 
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, allowDirectMessage: !!checked}))}
                  className="border-blue-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                />
                <Label htmlFor="allowDirectMessage" className="text-sm font-medium text-gray-700 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <span className="text-blue-600">💬</span>
                    Allow direct messages for this listing
                  </span>
                </Label>
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Listing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>✨</span>
                    Create Listing
                  </span>
                )}
              </Button>
            </form>
            </CardContent>
            <CardFooter className="px-8 pb-8">
              <div className="w-full text-center">
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  <span className="font-medium">📋 Note:</span> By submitting, you agree to our terms and conditions. Your listing will be visible to the Bluesky community.
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </CodeProject>
  );
};

export default withAuth(NewListingPage);