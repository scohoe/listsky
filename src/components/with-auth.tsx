'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import React, { ComponentType, useEffect } from 'react';

// Define a type for the props that will be passed to the wrapped component
interface WithAuthProps {}

export function withAuth<P extends WithAuthProps>(WrappedComponent: ComponentType<P>) {
  const ComponentWithAuth = (props: P) => {
    const { session, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !session) {
        router.replace('/auth/login'); // Use replace to avoid adding to history stack
      }
    }, [session, isLoading, router]);

    if (isLoading) {
      // You can render a loading spinner or a placeholder here
      return (
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p> {/* Replace with a proper loading component if available */}
        </div>
      );
    }

    if (!session) {
      // This case should ideally be handled by the redirect, 
      // but as a fallback, render null or a message.
      // Or, the redirect might happen before this renders.
      return null; 
    }

    // If session exists, render the wrapped component with its props
    return <WrappedComponent {...props} />;
  };

  // Set a display name for easier debugging
  ComponentWithAuth.displayName = `WithAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithAuth;
}