'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAtom } from 'jotai'
import { agentAtom } from '@/lib/atproto'
import { AtUri } from '@atproto/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

// This should match the structure in your lexicon and new listing page
interface ListingEditableFields {
  title: string
  description: string
  price: string
  category: string
  location: string
  images: { alt: string; url: string }[]
  allowDirectMessage: boolean
}

interface ListingPostRecord extends ListingEditableFields {
  $type: string
  createdAt: string
}

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const [agent] = useAtom(agentAtom)
  const [listing, setListing] = useState<ListingEditableFields | null>(null)
  const [initialListingData, setInitialListingData] = useState<ListingPostRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uri = typeof params.uri === 'string' ? decodeURIComponent(params.uri) : ''

  useEffect(() => {
    if (!agent || !uri) {
      if (!agent) router.push('/auth/login')
      return
    }

    const fetchListing = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const atUri = new AtUri(uri)
        const response = await agent.api.com.atproto.repo.getRecord({
          repo: atUri.hostname,
          collection: atUri.collection,
          rkey: atUri.rkey,
        })

        if (response.success && response.data.value) {
          const record = response.data.value as ListingPostRecord
          // Ensure the logged-in user is the author
          if (agent.session?.did !== atUri.hostname) {
            setError('You are not authorized to edit this listing.')
            router.push(`/listings/${encodeURIComponent(uri)}`)
            return
          }
          setInitialListingData(record)
          setListing({
            title: record.title || '',
            description: record.description || '',
            price: record.price || '',
            category: record.category || '',
            location: record.location || '',
            images: record.images || [],
            allowDirectMessage: record.allowDirectMessage || false,
          })
        } else {
          setError('Failed to fetch listing data.')
        }
      } catch (err) {
        console.error('Error fetching listing:', err)
        setError('An error occurred while fetching the listing.')
      }
      setIsLoading(false)
    }

    fetchListing()
  }, [agent, uri, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (listing) {
      setListing({
        ...listing,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      })
    }
  }

  const handleImageChange = (index: number, field: 'url' | 'alt', value: string) => {
    if (listing) {
      const newImages = [...listing.images]
      newImages[index] = { ...newImages[index], [field]: value }
      setListing({ ...listing, images: newImages })
    }
  }

  const addImageField = () => {
    if (listing) {
      setListing({ ...listing, images: [...listing.images, { alt: '', url: '' }] })
    }
  }

  const removeImageField = (index: number) => {
    if (listing) {
      setListing({ ...listing, images: listing.images.filter((_, i) => i !== index) })
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!agent || !listing || !initialListingData || !uri) {
      setError('Cannot submit: Missing required data.')
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      const atUri = new AtUri(uri)
      const recordToPut = {
        ...initialListingData,
        ...listing,
        price: String(listing.price),
      }

      await agent.api.com.atproto.repo.putRecord({
        repo: agent.session!.did!,
        collection: atUri.collection,
        rkey: atUri.rkey,
        record: recordToPut,
      })

      router.push(`/listings/${encodeURIComponent(uri)}`)
    } catch (err) {
      console.error('Error updating listing:', err)
      setError('Failed to update listing. Please try again.')
    }
    setIsSubmitting(false)
  }

  if (isLoading) return <div className="container mx-auto p-4">Loading editor...</div>
  if (error) return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>
  if (!listing) return <div className="container mx-auto p-4">Listing data not found or not authorized.</div>

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Listing</CardTitle>
          <CardDescription>Update the details of your listing.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" value={listing.title} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" value={listing.description} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" name="price" type="text" value={listing.price} onChange={handleChange} required placeholder="e.g., 25.00 or 'Free'" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" value={listing.category} onChange={handleChange} required placeholder="e.g., Electronics, Furniture" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location (e.g., ZIP Code or City)</Label>
              <Input id="location" name="location" value={listing.location} onChange={handleChange} required />
            </div>
            
            <div className="space-y-4">
              <Label>Images</Label>
              {listing.images.map((image, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  <Input 
                    placeholder="Image URL" 
                    value={image.url} 
                    onChange={(e) => handleImageChange(index, 'url', e.target.value)} 
                    className="flex-grow"
                  />
                  <Input 
                    placeholder="Alt Text" 
                    value={image.alt} 
                    onChange={(e) => handleImageChange(index, 'alt', e.target.value)} 
                    className="flex-grow"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeImageField(index)}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addImageField}>Add Image URL</Button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="allowDirectMessage" 
                name="allowDirectMessage" 
                checked={listing.allowDirectMessage} 
                onCheckedChange={(checked) => {
                  if (listing) {
                    setListing({ ...listing, allowDirectMessage: !!checked })
                  }
                }}
              />
              <Label htmlFor="allowDirectMessage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Allow direct messages for this listing
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || isLoading} className="w-full">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}