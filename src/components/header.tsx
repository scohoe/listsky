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
      <Link href="/listings" className="text-sm font-medium transition-all duration-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 relative group">
        <span className="relative z-10">Browse</span>
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
      </Link>
      {isLoggedIn && (
        <Link href="/listings/my" className="text-sm font-medium transition-all duration-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 relative group">
          <span className="relative z-10">My Listings</span>
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
        </Link>
      )}
      <Link href="/about" className="text-sm font-medium transition-all duration-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 relative group">
        <span className="relative z-10">About</span>
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 dark:bg-blue-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></span>
      </Link>
      {isLoggedIn && (
        <Link href="/listings/new" className="text-sm font-medium transition-all duration-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105 md:hidden">
          Create Listing
        </Link>
      )}
      {isLoggedIn && (
         <Button variant="ghost" onClick={handleLogout} className="text-sm font-medium transition-all duration-200 hover:text-red-600 dark:hover:text-red-400 md:hidden">
           <LogOut className="mr-2 h-4 w-4" /> Logout
         </Button>
      )}
    </>
  );

  if (isLoading) {
    return (
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Bluesky Listings
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-8 w-20 bg-muted rounded-md animate-pulse"></div>
            <ModeToggle />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-200">
            Bluesky Listings
          </Link>
          <nav className="hidden md:flex gap-8">
            <NavLinks />
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mobile Navigation */} 
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors duration-200">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur border shadow-lg">
                <DropdownMenuGroup className="flex flex-col gap-1 p-2">
                  <NavLinks />
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Desktop Navigation Actions */} 
          {isLoggedIn ? (
            <>
              <Button asChild variant="default" className="hidden md:flex bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
                <Link href="/listings/new">Create Listing</Link>
              </Button>
              <UserNav />
            </>
          ) : (
            <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200">
              <Link href="/auth/login">Sign in with Bluesky</Link>
            </Button>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}