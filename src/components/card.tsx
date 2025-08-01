'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card as UICard, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Author {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface CardProps {
  uri: string;
  title: string;
  price?: number;
  description: string;
  category?: string;
  author: Author;
  createdAt: string;
}

export default function Card({
  uri,
  title,
  price,
  description,
  category,
  author,
  createdAt,
}: CardProps) {
  // Extract the record ID from the URI
  const recordId = uri.split('/').pop();
  const authorId = author.did.split('/').pop();
  const listingUrl = `/listings/${authorId}/${recordId}`;
  
  return (
    <UICard className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">
              <Link href={listingUrl} className="hover:underline">
                {title}
              </Link>
            </CardTitle>
            {category && (
              <Badge variant="secondary" className="mt-1">
                {category}
              </Badge>
            )}
          </div>
          {price !== undefined && (
            <div className="text-lg font-bold">${price.toLocaleString()}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="line-clamp-3">{description}</CardDescription>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-1">
          <span>by</span>
          <span className="font-medium">{author.displayName || author.handle}</span>
        </div>
        <div>{formatDistanceToNow(new Date(createdAt))} ago</div>
      </CardFooter>
    </UICard>
  );
}