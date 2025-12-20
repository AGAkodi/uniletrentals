import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Navbar } from '@/components/layout/Navbar';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { useProperties } from '@/hooks/useProperties';

export default function BrowseListings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [bedrooms, setBedrooms] = useState(searchParams.get('bedrooms') || '');

  const { data: properties, isLoading } = useProperties({
    location: searchParams.get('location') || undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    bedrooms: searchParams.get('bedrooms') ? Number(searchParams.get('bedrooms')) : undefined,
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (bedrooms) params.set('bedrooms', bedrooms);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setLocation('');
    setMaxPrice('');
    setBedrooms('');
    setSearchParams(new URLSearchParams());
  };

  const activeFilters = [
    searchParams.get('location') && `Location: ${searchParams.get('location')}`,
    searchParams.get('maxPrice') && `Max: ₦${Number(searchParams.get('maxPrice')).toLocaleString()}`,
    searchParams.get('bedrooms') && `${searchParams.get('bedrooms')} Bedroom${Number(searchParams.get('bedrooms')) > 1 ? 's' : ''}`,
  ].filter(Boolean);

  const FilterContent = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Max Price (Yearly)</label>
        <Select value={maxPrice} onValueChange={setMaxPrice}>
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
        <Select value={bedrooms} onValueChange={setBedrooms}>
          <SelectTrigger>
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Bedroom</SelectItem>
            <SelectItem value="2">2 Bedrooms</SelectItem>
            <SelectItem value="3">3 Bedrooms</SelectItem>
            <SelectItem value="4">4+ Bedrooms</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-4">
        <Button onClick={handleSearch} className="flex-1">Apply Filters</Button>
        <Button variant="outline" onClick={clearFilters}>Clear</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Browse Listings</h1>
            <p className="text-muted-foreground">Find your perfect student accommodation</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-background rounded-2xl border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by location, university, or area..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-3">
              <Select value={maxPrice} onValueChange={setMaxPrice}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Max Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100000">₦100,000</SelectItem>
                  <SelectItem value="200000">₦200,000</SelectItem>
                  <SelectItem value="300000">₦300,000</SelectItem>
                  <SelectItem value="500000">₦500,000</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={bedrooms} onValueChange={setBedrooms}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Bedroom</SelectItem>
                  <SelectItem value="2">2 Bedrooms</SelectItem>
                  <SelectItem value="3">3 Bedrooms</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={handleSearch}>Search</Button>
            </div>

            {/* Mobile Filter Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
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
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {activeFilters.map((filter, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {filter}
                <X className="h-3 w-3 cursor-pointer" onClick={clearFilters} />
              </Badge>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="mb-4">
          <p className="text-muted-foreground">
            {isLoading ? 'Loading...' : `${properties?.length || 0} properties found`}
          </p>
        </div>

        {properties && properties.length > 0 ? (
          <PropertyGrid properties={properties} />
        ) : !isLoading ? (
          <div className="text-center py-16 bg-background rounded-2xl border">
            <Search className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">No properties found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or search for a different location.
            </p>
            <Button onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
