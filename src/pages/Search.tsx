import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { useProperties } from '@/hooks/useProperties';
import { SearchFilters } from '@/types/database';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>({
    location: searchParams.get('location') || '',
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    bedrooms: searchParams.get('bedrooms') ? Number(searchParams.get('bedrooms')) : undefined,
  });
  const [tempLocation, setTempLocation] = useState(filters.location || '');
  
  const { data: properties, isLoading } = useProperties(filters);

  const handleSearch = () => {
    const newFilters = { ...filters, location: tempLocation };
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    if (tempLocation) params.set('location', tempLocation);
    if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
    if (filters.bedrooms) params.set('bedrooms', String(filters.bedrooms));
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({});
    setTempLocation('');
    setSearchParams({});
  };

  const hasActiveFilters = filters.location || filters.maxPrice || filters.bedrooms;

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">Max Price (per year)</label>
        <Select 
          value={filters.maxPrice?.toString() || ''} 
          onValueChange={(v) => setFilters({ ...filters, maxPrice: v ? Number(v) : undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100000">₦100,000</SelectItem>
            <SelectItem value="200000">₦200,000</SelectItem>
            <SelectItem value="300000">₦300,000</SelectItem>
            <SelectItem value="500000">₦500,000</SelectItem>
            <SelectItem value="1000000">₦1,000,000</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Bedrooms</label>
        <Select 
          value={filters.bedrooms?.toString() || ''} 
          onValueChange={(v) => setFilters({ ...filters, bedrooms: v ? Number(v) : undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1+ bedroom</SelectItem>
            <SelectItem value="2">2+ bedrooms</SelectItem>
            <SelectItem value="3">3+ bedrooms</SelectItem>
            <SelectItem value="4">4+ bedrooms</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button className="w-full" onClick={handleSearch}>
        Apply Filters
      </Button>

      {hasActiveFilters && (
        <Button variant="ghost" className="w-full" onClick={clearFilters}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="bg-secondary/50 py-6 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by city, university, or address..."
                value={tempLocation}
                onChange={(e) => setTempLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-12 text-base"
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex gap-3">
              <Select 
                value={filters.maxPrice?.toString() || ''} 
                onValueChange={(v) => {
                  const newFilters = { ...filters, maxPrice: v ? Number(v) : undefined };
                  setFilters(newFilters);
                }}
              >
                <SelectTrigger className="w-[150px] h-12">
                  <SelectValue placeholder="Max Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100000">₦100,000</SelectItem>
                  <SelectItem value="200000">₦200,000</SelectItem>
                  <SelectItem value="300000">₦300,000</SelectItem>
                  <SelectItem value="500000">₦500,000</SelectItem>
                  <SelectItem value="1000000">₦1,000,000</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.bedrooms?.toString() || ''} 
                onValueChange={(v) => {
                  const newFilters = { ...filters, bedrooms: v ? Number(v) : undefined };
                  setFilters(newFilters);
                }}
              >
                <SelectTrigger className="w-[130px] h-12">
                  <SelectValue placeholder="Beds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1+ bed</SelectItem>
                  <SelectItem value="2">2+ beds</SelectItem>
                  <SelectItem value="3">3+ beds</SelectItem>
                  <SelectItem value="4">4+ beds</SelectItem>
                </SelectContent>
              </Select>

              <Button size="lg" onClick={handleSearch}>
                <SearchIcon className="h-5 w-5 mr-2" />
                Search
              </Button>
            </div>

            {/* Mobile Filter Button */}
            <div className="flex md:hidden gap-3">
              <Button className="flex-1" onClick={handleSearch}>
                <SearchIcon className="h-5 w-5 mr-2" />
                Search
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <SlidersHorizontal className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.location && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                  Location: {filters.location}
                  <button onClick={() => { setFilters({ ...filters, location: '' }); setTempLocation(''); }}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.maxPrice && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                  Max: ₦{filters.maxPrice.toLocaleString()}
                  <button onClick={() => setFilters({ ...filters, maxPrice: undefined })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.bedrooms && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                  {filters.bedrooms}+ beds
                  <button onClick={() => setFilters({ ...filters, bedrooms: undefined })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {properties?.length || 0} Properties Found
          </h1>
        </div>

        <PropertyGrid properties={properties || []} isLoading={isLoading} />
      </div>
    </Layout>
  );
}
