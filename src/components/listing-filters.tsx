'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterOptions {
  category: string;
  priceMin: number;
  priceMax: number;
  location: string;
  keywords: string;
}

interface ListingFiltersProps {
  onFilterChange?: (filters: FilterOptions) => void;
}

export default function ListingFilters({ onFilterChange }: ListingFiltersProps = {}) {
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [category, setCategory] = useState('All Categories');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  
  // Categories based on common marketplace categories
  const categories = [
    'All Categories',
    'Electronics',
    'Furniture',
    'Clothing',
    'Vehicles',
    'Housing',
    'Services',
    'Jobs',
    'Community',
    'For Sale',
    'Free Stuff'
  ];

  const handlePriceRangeChange = (value: number[]) => {
    setPriceRange(value);
  };

  const handleApplyFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        category,
        priceMin: priceRange[0],
        priceMax: priceRange[1],
        location,
        keywords
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter Listings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Price Range</Label>
          <div className="pt-4">
            <Slider
              defaultValue={[0, 1000]}
              max={5000}
              step={50}
              value={priceRange}
              onValueChange={handlePriceRangeChange}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input 
                type="number" 
                value={priceRange[0]} 
                onChange={(e) => handlePriceRangeChange([parseInt(e.target.value) || 0, priceRange[1]])}
                className="w-20 h-8" 
              />
            </div>
            <span>to</span>
            <div className="flex items-center space-x-2">
              <span>$</span>
              <Input 
                type="number" 
                value={priceRange[1]} 
                onChange={(e) => handlePriceRangeChange([priceRange[0], parseInt(e.target.value) || 0])}
                className="w-20 h-8" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input 
            id="location" 
            placeholder="City, State, or Zip" 
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords</Label>
          <Input 
            id="keywords" 
            placeholder="Search terms" 
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>

        <div className="pt-2">
          <Button className="w-full" onClick={handleApplyFilters}>Apply Filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}