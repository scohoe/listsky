'use client';

import React, { useState, ChangeEvent, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { withAuth } from '@/components/with-auth';
import { CodeProject } from '@/components/code-project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getAgent, testConnection, marketplaceConfig } from '@/lib/atproto';
import { createMarketplaceListing, MarketplaceListing } from '@/lib/marketplace-api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Upload, AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ListingFormData {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor' | '';
  location: {
    zipCode: string;
    address: string;
    city: string;
    state: string;
  };
  tags: string; // Comma-separated tags
  allowMessages: boolean;
  crossPost: boolean;
  crossPostText: string;
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
    condition: '',
    location: {
      zipCode: '',
      address: '',
      city: '',
      state: '',
    },
    tags: '',
    allowMessages: true,
    crossPost: true,
    crossPostText: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); 
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => `${prev}\n${new Date().toLocaleTimeString()}: ${info}`);
    console.log(info);
  };

  const testConnectionHandler = async () => {
    try {
      console.log('=== TESTING CONNECTION ===');
      const agent = await getAgent();
      console.log('Agent:', !!agent);
      console.log('Agent session:', !!agent.session);
      console.log('Session DID:', agent.session?.did);
      console.log('Session handle:', agent.session?.handle);
      
      if (!agent.session) {
        addDebugInfo('❌ No agent session found');
        return;
      }
      
      // Test a simple API call
      const profile = await agent.getProfile({ actor: agent.session.did });
      console.log('Profile test result:', profile);
      
      addDebugInfo(`✅ Connection OK - DID: ${agent.session.did}, Handle: ${agent.session.handle}`);
      
      toast({
        title: 'Connection Test',
        description: 'Agent session is working correctly!',
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      addDebugInfo(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as object,
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    
    if (!formData.location.zipCode.trim()) {
      toast({ title: 'Error', description: 'Please enter a ZIP code.', variant: 'destructive' });
      return;
    }
    
    // Validate zip code format
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (formData.location.zipCode && !zipRegex.test(formData.location.zipCode)) {
      toast({ title: 'Error', description: 'Zip code must be in format: 12345 or 12345-6789', variant: 'destructive' });
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
      // Test connection first
      console.log('Testing connection to AT Protocol...');
      const connectionTest = await testConnection();
      if (!connectionTest.success) {
        throw new Error(`Connection failed: ${connectionTest.error}`);
      }
      console.log('✓ Connection test passed');
      
      // Get authenticated agent
      const agent = await getAgent();
      if (!agent) {
        throw new Error('No authenticated agent available. Please log in.');
      }
      
      if (!agent.session) {
        throw new Error('No active session. Please log in again.');
      }
      console.log(`✓ Agent authenticated as ${agent.session.handle}`);
      
      // Prepare marketplace listing data
      console.log('Preparing marketplace listing...');
      const marketplaceListing: MarketplaceListing = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        condition: formData.condition || undefined,
        location: {
          zipCode: formData.location.zipCode,
          address: formData.location.address || undefined,
          city: formData.location.city || undefined,
          state: formData.location.state || undefined,
        },
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag).length > 0 ? 
              formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : undefined,
        images: selectedFiles && selectedFiles.length > 0 ? Array.from(selectedFiles) : undefined,
        allowMessages: formData.allowMessages,
        status: 'active',
      };
      
      // Create marketplace listing using the new API
      console.log('Creating marketplace listing...');
      const result = await createMarketplaceListing(marketplaceListing, {
        crossPost: formData.crossPost,
        crossPostText: formData.crossPostText || undefined,
      });
      
      console.log(`✓ Marketplace listing created: ${result.uri}`);
      
      if (result.crossPostUri) {
        console.log(`✓ Cross-posted to Bluesky: ${result.crossPostUri}`);
      }
      
      toast({
        title: marketplaceConfig.enableCustomRecords
          ? 'Marketplace listing created successfully!'
          : 'Listing posted to Bluesky successfully!',
        description: 'Your listing has been successfully posted.',
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: '',
        location: {
          zipCode: '',
          address: '',
          city: '',
          state: '',
        },
        tags: '',
        allowMessages: true,
        crossPost: true,
        crossPostText: '',
      });
      setSelectedFiles(null);
      setImagePreviews([]);
      setSelectedImages([]);
      
      console.log('Navigating to /listings');
      router.push('/listings');
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

  // This function is no longer needed as we're using the marketplace API
  // const createListingProcess = async (agent: any) => { ... }

  return (
    <CodeProject id="new-listing-form">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 -mx-4 lg:-mx-6 xl:-mx-8 -my-6">
        <div className="max-w-3xl mx-auto py-8 px-4 md:px-6">
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
                  <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                    <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="sports">Sports & Recreation</SelectItem>
                      <SelectItem value="home">Home & Garden</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-yellow-600">⭐</span> Condition
                </Label>
                <Select value={formData.condition} onValueChange={(value) => handleSelectChange('condition', value)}>
                  <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="like-new">Like New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-4 p-4 bg-gray-50/50 rounded-xl border border-gray-200">
                <legend className="text-sm font-semibold text-gray-700 flex items-center gap-2 px-2">
                  <span className="text-red-600">📍</span> Location
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location.zipCode" className="text-sm font-medium text-gray-600">ZIP Code</Label>
                    <Input 
                      id="location.zipCode" 
                      name="location.zipCode" 
                      value={formData.location.zipCode} 
                      onChange={handleChange} 
                      required 
                      maxLength={10}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder="12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location.address" className="text-sm font-medium text-gray-600">Address / General Area (Optional)</Label>
                    <Input 
                      id="location.address" 
                      name="location.address" 
                      value={formData.location.address} 
                      onChange={handleChange} 
                      maxLength={200}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder="Downtown, Near park, etc."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location.city" className="text-sm font-medium text-gray-600">City (Optional)</Label>
                    <Input 
                      id="location.city" 
                      name="location.city" 
                      value={formData.location.city} 
                      onChange={handleChange} 
                      maxLength={100}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder="City name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location.state" className="text-sm font-medium text-gray-600">State (Optional)</Label>
                    <Input 
                      id="location.state" 
                      name="location.state" 
                      value={formData.location.state} 
                      onChange={handleChange} 
                      maxLength={2}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                      placeholder="CA"
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
                        <button
                          type="button"
                          onClick={() => {
                            const newImages = selectedImages.filter((_, i) => i !== index);
                            const newPreviews = imagePreviews.filter((_, i) => i !== index);
                            setSelectedImages(newImages);
                            setImagePreviews(newPreviews);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-blue-50/50 rounded-xl border border-blue-200">
                  <Checkbox 
                    id="allowMessages" 
                    name="allowMessages" 
                    checked={formData.allowMessages} 
                    onCheckedChange={(checked) => setFormData(prev => ({...prev, allowMessages: !!checked}))}
                    className="border-blue-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                  />
                  <Label htmlFor="allowMessages" className="text-sm font-medium text-gray-700 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-blue-600">💬</span>
                      Allow direct messages for this listing
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-green-50/50 rounded-xl border border-green-200">
                  <Checkbox 
                    id="crossPost" 
                    name="crossPost" 
                    checked={formData.crossPost} 
                    onCheckedChange={(checked) => setFormData(prev => ({...prev, crossPost: !!checked}))}
                    className="border-green-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <Label htmlFor="crossPost" className="text-sm font-medium text-gray-700 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <span className="text-green-600">🔄</span>
                      Also post to Bluesky feed
                    </span>
                  </Label>
                </div>
                {formData.crossPost && (
                  <div className="space-y-2">
                    <Label htmlFor="crossPostText" className="text-sm font-medium text-gray-600">Custom Bluesky post text (optional)</Label>
                    <Textarea 
                      id="crossPostText" 
                      name="crossPostText" 
                      value={formData.crossPostText} 
                      onChange={handleChange} 
                      rows={3} 
                      maxLength={300}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                      placeholder="Custom text for your Bluesky post (leave empty for auto-generated)"
                    />
                  </div>
                )}
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