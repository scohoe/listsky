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

export default function ListingFilters({ 
  onFilterChange,
  filters, 
  geoError, 
  isLoading 
}: ListingFiltersProps) {
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
    <form onSubmit={handleSubmit} className="p-6 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-800">Filter Listings</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Category Filter */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            <span className="text-blue-600">📂</span> Category
          </Label>
          <Select 
            value={filters.category} 
            onValueChange={(value) => handleSelectChange('category', value)} 
            disabled={isLoading}
          >
            <SelectTrigger id="category" className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200">
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
          <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            <span className="text-green-600">💰</span> Price Range
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Select 
              value={filters.minPrice} 
              onValueChange={(value) => handleSelectChange('minPrice', value)}
              disabled={isLoading}
            >
              <SelectTrigger id="minPrice" className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200">
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
              <SelectTrigger id="maxPrice" className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200">
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="location" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <span className="text-purple-600">📍</span> ZIP Code
            </Label>
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
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="location"
              name="location"
              type="text"
              placeholder="e.g., 90210"
              value={filters.location}
              onChange={handleInputChange}
              className={`pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 ${
                (geoError || zipCodeHasError) ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
              }`}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Radius Filter */}
        <div className="space-y-2">
          <Label htmlFor="radius" className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            <span className="text-orange-600">🎯</span> Radius
          </Label>
          <Select 
            value={filters.radius} 
            onValueChange={(value) => handleSelectChange('radius', value)}
            disabled={isLoading || !filters.location || zipCodeHasError}
          >
            <SelectTrigger 
              id="radius" 
              className={`border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200 ${
                (isLoading || !filters.location || zipCodeHasError) ? 'opacity-50' : ''
              }`}
            >
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

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {Object.values(filters).filter(Boolean).length > 0 && (
            <span>Active filters: {Object.values(filters).filter(Boolean).length}</span>
          )}
        </div>
        <div className="flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            onClick={() => {
              onFilterChange('category', '');
              onFilterChange('minPrice', '');
              onFilterChange('maxPrice', '');
              onFilterChange('location', '');
              onFilterChange('radius', '');
            }}
            disabled={isLoading}
          >
            Clear All
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <ListFilter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </div>
    </form>
  );
}