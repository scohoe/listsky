import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="py-16 max-w-2xl mx-auto">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-6xl font-bold text-muted-foreground mb-4">404</CardTitle>
          <CardTitle className="text-2xl font-bold">Page Not Found</CardTitle>
          <CardDescription className="text-lg">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Don&apos;t worry, you can find what you&apos;re looking for by going back to our homepage or browsing our listings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/">
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/listings">
                Browse Listings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}