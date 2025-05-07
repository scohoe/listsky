import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Bluesky Listings</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          A Craigslist-like platform built on the AT Protocol for Bluesky users.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Button asChild size="lg">
            <Link href="/auth/login">Sign in with Bluesky</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/listings">Browse Listings</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        <Card>
          <CardHeader>
            <CardTitle>Create Listings</CardTitle>
            <CardDescription>Share items, services, or opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create detailed listings with images, descriptions, and contact information.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connect with Bluesky</CardTitle>
            <CardDescription>Use your existing Bluesky account</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Seamlessly authenticate with your Bluesky credentials and manage your listings.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Discover Locally</CardTitle>
            <CardDescription>Find what you need nearby</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Browse listings by location, category, or search for specific items.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Built on the AT Protocol</h2>
        <p className="max-w-2xl mx-auto text-muted-foreground">
          Leveraging the decentralized AT Protocol to create a more open, user-controlled marketplace experience.
        </p>
      </div>
    </div>
  );
}