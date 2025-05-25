'use client';

import React from 'react';
import { withAuth } from '@/components/with-auth';
import { CodeProject } from '@/components/code-project'; // Assuming CodeProject is a general wrapper
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function MyListingsPage() {
  return (
    <CodeProject id="my-listings">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            My Listings
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage your active and past listings.
          </p>
        </header>

        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground mb-6">
            You haven&apos;t created any listings yet.
          </p>
          <Button asChild size="lg">
            <Link href="/listings/new">Create New Listing</Link>
          </Button>
        </div>

        {/* Placeholder for future listing display logic */}
        {/* 
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[].map((listing) => (
            <div key={listing.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
              <h3 className="text-lg font-semibold">{listing.title}</h3>
              <p className="text-sm text-muted-foreground">{listing.category}</p>
              <p className="text-sm">{listing.price}</p>
              <Button variant="outline" size="sm" className="mt-2">View Details</Button>
            </div>
          ))}
        </div>
        */}
      </div>
    </CodeProject>
  );
}

export default withAuth(MyListingsPage);