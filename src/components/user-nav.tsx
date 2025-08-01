"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
// import { getAgent, getCurrentSession, logout, getProfile } from "@/lib/atproto"; // No longer directly used for session/logout
import { getProfile } from "@/lib/atproto"; // Still used for profile fetching
import { useAuth } from "@/lib/auth-context"; // Import useAuth

interface UserProfile {
  name: string;
  handle: string;
  image: string;
}

export function UserNav() {
  const { session, agent, logout: contextLogout, isLoading: authIsLoading } = useAuth(); // Use AuthContext
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (agent?.session?.did) {
        setIsProfileLoading(true);
        try {
          const profile = await getProfile(agent.session.did);
          if (profile) {
            setUserProfile({
              name: profile.displayName || profile.handle,
              handle: profile.handle,
              image: profile.avatar || `/placeholder.svg?width=32&height=32&query=${encodeURIComponent(profile.handle)}`
            });
          } else {
            // Fallback if profile fetch fails but session exists
            setUserProfile({
              name: agent.session.handle || 'User', // Use handle from session as fallback name
              handle: agent.session.handle || 'unknown',
              image: `/placeholder.svg?width=32&height=32&query=${encodeURIComponent(agent.session.handle || 'user')}`
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback if profile fetch errors
          setUserProfile({
            name: agent.session.handle || 'User',
            handle: agent.session.handle || 'unknown',
            image: `/placeholder.svg?width=32&height=32&query=${encodeURIComponent(agent.session.handle || 'user')}`
          });
        } finally {
          setIsProfileLoading(false);
        }
      } else if (!authIsLoading) { // Only set loading to false if auth is also done loading
        setUserProfile(null); // No session, no profile
        setIsProfileLoading(false);
      }
    };
    
    if (!authIsLoading) { // Fetch profile only when auth state is resolved
        fetchUserProfile();
    }

  }, [session, authIsLoading]); // Depend on session and authIsLoading
  
  const handleSignOut = async () => {
    try {
      await contextLogout(); // Use logout from AuthContext
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
      router.push('/');
      // router.refresh(); // AuthProvider will trigger re-renders, refresh might be redundant
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Display loading state or nothing if auth is loading or no session
  if (authIsLoading || !session) {
    // Optionally, return a skeleton or null if no user is logged in
    // For now, returning null if no session, or a small loading indicator
    return authIsLoading ? <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div> : null;
  }

  // If session exists but profile is still loading
  if (isProfileLoading) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{(agent?.session?.handle || 'U').charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  // If profile loading failed or no profile data, but session exists
  if (!userProfile) {
     // This case should ideally be handled by the fallback in useEffect
     // but as a safeguard:
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarImage src={`/placeholder.svg?width=32&height=32&query=${encodeURIComponent(agent?.session?.handle || 'user')}`} alt={agent?.session?.handle || 'User'} />
          <AvatarFallback>{(agent?.session?.handle || 'U').charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile.image} alt={userProfile.name} />
            <AvatarFallback>{userProfile.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userProfile.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              @{userProfile.handle}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            {/* TODO: Make profile link dynamic based on user handle/DID */}
            <Link href={`/profile/${userProfile.handle}`}>Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/listings/my">My Listings</Link>
          </DropdownMenuItem>
          {/* <DropdownMenuItem asChild>
            <Link href="/messages">Messages</Link>
          </DropdownMenuItem> */}
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}