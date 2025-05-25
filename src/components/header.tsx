'use client';

// import { useState, useEffect } from 'react'; // No longer needed for session state
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { UserNav } from '@/components/user-nav'; // Assuming this will use AuthContext too
// import { getCurrentSession } from '@/lib/atproto'; // No longer directly used here
import { useAuth } from '@/lib/auth-context'; // Import useAuth
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut } from "lucide-react"; // Added LogOut icon

export default function Header() {
  const { session, isLoading, logout } = useAuth(); // Use session and logout from AuthContext
  const isLoggedIn = !!session;
  // const [username, setUsername] = useState(''); // Handled by session.handle
  
  // useEffect(() => { // This logic is now handled by AuthProvider
  //   const checkSession = async () => {
  //     try {
  //       const sessionData = await getCurrentSession();
  //       setIsLoggedIn(!!sessionData);
  //       if (sessionData) {
  //         setUsername(sessionData.handle);
  //       }
  //     } catch (error) {
  //       console.error('Error checking session:', error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
    
  //   checkSession();
  // }, []);

  const handleLogout = async () => {
    await logout();
    // Router push or other cleanup can happen here if needed, 
    // but AuthContext handles session state update.
  };

  const NavLinks = () => (
    <>
      <Link href="/listings" className="text-sm font-medium transition-colors hover:text-primary">
        Browse
      </Link>
      {/* <Link href="/listings/search" className="text-sm font-medium transition-colors hover:text-primary">
        Search
      </Link> */}
      {isLoggedIn && (
        <Link href="/listings/my" className="text-sm font-medium transition-colors hover:text-primary">
          My Listings
        </Link>
      )}
      <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
        About
      </Link>
      {isLoggedIn && (
        <Link href="/listings/new" className="text-sm font-medium transition-colors hover:text-primary md:hidden">
          Create Listing
        </Link>
      )}
      {isLoggedIn && (
         <Button variant="ghost" onClick={handleLogout} className="text-sm font-medium transition-colors hover:text-primary md:hidden">
           <LogOut className="mr-2 h-4 w-4" /> Logout
         </Button>
      )}
    </>
  );

  if (isLoading) {
    // Optional: render a loading state for the header or a minimal version
    return (
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-bold text-xl">Bluesky Listings</Link>
          <div className="flex items-center gap-4">
            <div className="h-8 w-20 bg-muted rounded-md animate-pulse"></div> {/* Placeholder for buttons */}
            <ModeToggle />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b sticky top-0 bg-background z-10">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl">Bluesky Listings</Link>
          <nav className="hidden md:flex gap-6">
            <NavLinks />
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Mobile Navigation */} 
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup className="flex flex-col gap-1 p-2">
                  <NavLinks />
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Desktop Navigation Actions */} 
          {isLoggedIn ? (
            <>
              <Button asChild variant="ghost" className="hidden md:flex">
                <Link href="/listings/new">Create Listing</Link>
              </Button>
              <UserNav /> {/* This component will also need to use useAuth */}
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