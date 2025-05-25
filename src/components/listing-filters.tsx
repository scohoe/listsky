'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, MapPin, Filter, ListFilter } from 'lucide-react'; // Added ListFilter for better icon

interface ListingFiltersProps {
  onFilterChange: (filters: Filters) => void;
  initialCategories?: string[];
  isLoading?: boolean; // To disable form during loading
}

export interface Filters {
  keyword: string;
  category: string;
  zipCode: string;
  radius: string; 
}

const DEFAULT_CATEGORIES = [
  'All Categories',
  'Electronics',
  'Furniture',
  'Clothing & Accessories',
  'Vehicles',
  'Housing & Real Estate',
  'Home & Garden',
  'Services',
  'Jobs',
  'Community',
  'Pets',
  'For Free',
  'Wanted',
  'Other',
];

const SEARCH_RADII = [
  { value: '', label: 'Any Distance' },
  { value: '5', label: '5 miles' },
  { value: '10', label: '10 miles' },
  { value: '25', label: '25 miles' },
  { value: '50', label: '50 miles' },
  { value: '100', label: '100 miles' },
];

export const ListingFilters: React.FC<ListingFiltersProps> = ({ onFilterChange, initialCategories, isLoading }) => {
  const [filters, setFilters] = useState<Filters>({
    keyword: '',
    category: '',
    zipCode: '',
    radius: '',
  });

  const categoriesToUse = initialCategories && initialCategories.length > 0 ? ['All Categories', ...initialCategories] : DEFAULT_CATEGORIES;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value === 'All Categories' ? '' : value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onFilterChange(filters);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 bg-card border rounded-lg shadow-sm space-y-4 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-end">
      <div className="md:col-span-4">
        <Label htmlFor="keyword" className="text-sm font-medium">Keyword</Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="keyword"
            name="keyword"
            type="search"
            placeholder="Search titles, descriptions..."
            value={filters.keyword}
            onChange={handleChange}
            className="pl-10"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="md:col-span-3">
        <Label htmlFor="category" className="text-sm font-medium">Category</Label>
        <Select name="category" value={filters.category || 'All Categories'} onValueChange={(value) => handleSelectChange('category', value)} disabled={isLoading}>
          <SelectTrigger id="category" className="mt-1">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            {categoriesToUse.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="zipCode" className="text-sm font-medium">ZIP Code</Label>
        <div className="relative mt-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="zipCode"
            name="zipCode"
            type="text"
            placeholder="e.g., 90210"
            value={filters.zipCode}
            onChange={handleChange}
            className="pl-10"
            pattern="^[0-9]{5}(?:-[0-9]{4})?$" // More specific US ZIP code pattern
            title="Enter a 5-digit or 9-digit ZIP code."
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <Label htmlFor="radius" className="text-sm font-medium">Radius</Label>
        <Select name="radius" value={filters.radius} onValueChange={(value) => handleSelectChange('radius', value)} disabled={isLoading}>
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

      <div className="md:col-span-1">
        <Button type="submit" className="w-full mt-1 md:mt-0" disabled={isLoading}>
          <ListFilter className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">Filter</span>
        </Button>
      </div>
    </form>
  );
};