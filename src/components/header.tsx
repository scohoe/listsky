import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { UserNav } from '@/components/user-nav';

export default function Header() {
  // In a real implementation, we would check for user session here
  const isLoggedIn = false;

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl">Bluesky Listings</Link>
          <nav className="hidden md:flex gap-6">
            <Link href="/listings" className="text-sm font-medium transition-colors hover:text-primary">
              Browse
            </Link>
            <Link href="/categories" className="text-sm font-medium transition-colors hover:text-primary">
              Categories
            </Link>
            <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
              About
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/listings/create">Create Listing</Link>
              </Button>
              <UserNav />
            </>
          ) : (
            <Button asChild>
              <Link href="/auth/login">Sign in with Bluesky</Link>
            </Button>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}