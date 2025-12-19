import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, DollarSign, Bed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function HeroSearch() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (bedrooms) params.set('bedrooms', bedrooms);
    
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-background rounded-2xl shadow-xl p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Location */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="City, university, or address"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Max Price */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Max Price
            </label>
            <Select value={maxPrice} onValueChange={setMaxPrice}>
              <SelectTrigger>
                <DollarSign className="h-4 w-4 text-muted-foreground mr-2" />
                <SelectValue placeholder="Any" />
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

          {/* Bedrooms */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Bedrooms
            </label>
            <Select value={bedrooms} onValueChange={setBedrooms}>
              <SelectTrigger>
                <Bed className="h-4 w-4 text-muted-foreground mr-2" />
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="hero"
          className="w-full mt-4"
          onClick={handleSearch}
        >
          <Search className="h-5 w-5" />
          Search Properties
        </Button>
      </div>
    </div>
  );
}
