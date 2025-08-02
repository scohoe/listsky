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
    <UICard className="h-full flex flex-col bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors duration-200">
              <Link href={listingUrl} className="hover:underline decoration-2 underline-offset-2">
                {title}
              </Link>
            </CardTitle>
            {category && (
              <Badge 
                variant="secondary" 
                className="mt-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200 hover:from-blue-200 hover:to-purple-200 transition-all duration-200"
              >
                {category}
              </Badge>
            )}
          </div>
          {price !== undefined && (
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent ml-4">
              ${price.toLocaleString()}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <CardDescription className="line-clamp-3 text-gray-600 leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
      <CardFooter className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {(author.displayName || author.handle).charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">by</span>
            <span className="font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200">
              {author.displayName || author.handle}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
          {formatDistanceToNow(new Date(createdAt))} ago
        </div>
      </CardFooter>
    </UICard>
  );
}