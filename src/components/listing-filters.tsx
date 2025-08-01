'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, MapPin, Filter, ListFilter, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ListingFiltersProps {
  onFilterChange: (filterName: string, value: string) => void;
  filters: {
    category: string;
    minPrice: string;
    maxPrice: string;
    location: string;
    radius: string;
  };
  geoError?: boolean;
  isLoading?: boolean;
}

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Clothing & Accessories', label: 'Clothing & Accessories' },
  { value: 'Vehicles', label: 'Vehicles' },
  { value: 'Housing & Real Estate', label: 'Housing & Real Estate' },
  { value: 'Home & Garden', label: 'Home & Garden' },
  { value: 'Services', label: 'Services' },
  { value: 'Jobs', label: 'Jobs' },
  { value: 'Community', label: 'Community' },
  { value: 'Pets', label: 'Pets' },
  { value: 'For Free', label: 'For Free' },
  { value: 'Wanted', label: 'Wanted' },
  { value: 'Other', label: 'Other' },
];

const SEARCH_RADII = [
  { value: '', label: 'Any Distance' },
  { value: '5', label: '5 miles' },
  { value: '10', label: '10 miles' },
  { value: '25', label: '25 miles' },
  { value: '50', label: '50 miles' },
  { value: '100', label: '100 miles' },
];

const PRICE_RANGES = [
  { value: '', label: 'Any Price' },
  { value: '0', label: '$0' },
  { value: '50', label: '$50' },
  { value: '100', label: '$100' },
  { value: '500', label: '$500' },
  { value: '1000', label: '$1,000' },
  { value: '5000', label: '$5,000' },
  { value: '10000', label: '$10,000' },
];

export default function ListingFilters({ onFilterChange, filters, geoError, isLoading }: ListingFiltersProps) {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  const handleSelectChange = (name: string, value: string) => {
    onFilterChange(name, value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Form submission is handled by the parent component
  };

  // Validate ZIP code format
  const isValidZipCode = (zipCode: string): boolean => {
    return /^\d{5}(-\d{4})?$/.test(zipCode);
  };

  const zipCodeHasError = filters.location && !isValidZipCode(filters.location);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card border rounded-lg shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <Label htmlFor="category" className="text-sm font-medium">Category</Label>
          <Select 
            value={filters.category} 
            onValueChange={(value) => handleSelectChange('category', value)} 
            disabled={isLoading}
          >
            <SelectTrigger id="category" className="mt-1">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Price Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select 
              value={filters.minPrice} 
              onValueChange={(value) => handleSelectChange('minPrice', value)}
              disabled={isLoading}
            >
              <SelectTrigger id="minPrice">
                <SelectValue placeholder="Min Price" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((price) => (
                  <SelectItem key={`min-${price.value}`} value={price.value}>{price.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.maxPrice} 
              onValueChange={(value) => handleSelectChange('maxPrice', value)}
              disabled={isLoading}
            >
              <SelectTrigger id="maxPrice">
                <SelectValue placeholder="Max Price" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((price) => (
                  <SelectItem key={`max-${price.value}`} value={price.value}>{price.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Location Filter */}
        <div>
          <div className="flex items-center gap-1">
            <Label htmlFor="location" className="text-sm font-medium">ZIP Code</Label>
            {(geoError || zipCodeHasError) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{zipCodeHasError ? 'Invalid ZIP code format' : 'Location service error'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="relative mt-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="location"
              name="location"
              type="text"
              placeholder="e.g., 90210"
              value={filters.location}
              onChange={handleInputChange}
              className={`pl-10 ${(geoError || zipCodeHasError) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Radius Filter */}
        <div>
          <Label htmlFor="radius" className="text-sm font-medium">Radius</Label>
          <Select 
            value={filters.radius} 
            onValueChange={(value) => handleSelectChange('radius', value)}
            disabled={isLoading || !filters.location || zipCodeHasError}
          >
            <SelectTrigger id="radius" className="mt-1">
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_RADII.map((rad) => (
                <SelectItem key={rad.value} value={rad.value}>{rad.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button 
          type="button" 
          variant="outline" 
          className="mr-2"
          onClick={() => {
            onFilterChange('category', '');
            onFilterChange('minPrice', '');
            onFilterChange('maxPrice', '');
            onFilterChange('location', '');
            onFilterChange('radius', '');
          }}
          disabled={isLoading}
        >
          Clear
        </Button>
        <Button type="submit" disabled={isLoading}>
          <ListFilter className="h-5 w-5 mr-2" />
          Apply Filters
        </Button>
      </div>
    </form>
  );
}