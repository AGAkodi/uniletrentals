import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, X, MapPin, Bed, Bath, Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';

interface CompareProperty {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  image?: string;
}

export default function PropertyComparison() {
  const [selectedProperties, setSelectedProperties] = useState<CompareProperty[]>([
    {
      id: '1',
      title: 'Modern Studio Apartment',
      location: 'Akoka, Lagos',
      price: 250000,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ['WiFi', 'Security', 'Generator', 'Water'],
    },
    {
      id: '2',
      title: '2-Bedroom Flat Near Campus',
      location: 'Yaba, Lagos',
      price: 350000,
      bedrooms: 2,
      bathrooms: 2,
      amenities: ['WiFi', 'Security', 'Parking', 'AC'],
    },
  ]);

  const allAmenities = [...new Set(selectedProperties.flatMap(p => p.amenities))];

  const removeProperty = (id: string) => {
    setSelectedProperties(prev => prev.filter(p => p.id !== id));
  };

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
            <h1 className="text-3xl font-bold">Compare Properties</h1>
            <p className="text-muted-foreground">Compare features of different properties side by side</p>
          </div>
        </div>

        {selectedProperties.length === 0 ? (
          <div className="text-center py-16 bg-background rounded-2xl border">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No properties to compare</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Browse listings and add properties to compare their features.
            </p>
            <Button asChild>
              <Link to="/browse">Browse Listings</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Property Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedProperties.map((property) => (
                <Card key={property.id} className="relative overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/80"
                    onClick={() => removeProperty(property.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <div className="h-32 bg-gradient-to-br from-primary/10 to-accent/10" />
                  
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                      <MapPin className="h-4 w-4" />
                      <span>{property.location}</span>
                    </div>
                    <div className="text-xl font-bold text-primary">
                      ₦{property.price.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/year</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {selectedProperties.length < 3 && (
                <Card className="border-dashed flex items-center justify-center min-h-[250px]">
                  <Button variant="ghost" className="flex flex-col gap-2 h-auto py-8" asChild>
                    <Link to="/browse">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <span>Add Property</span>
                    </Link>
                  </Button>
                </Card>
              )}
            </div>

            {/* Comparison Table */}
            {selectedProperties.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Feature Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Feature</th>
                          {selectedProperties.map((property) => (
                            <th key={property.id} className="text-center py-3 px-4 font-medium">
                              {property.title.slice(0, 20)}...
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4 text-muted-foreground">Price (Yearly)</td>
                          {selectedProperties.map((property) => (
                            <td key={property.id} className="text-center py-3 px-4 font-semibold">
                              ₦{property.price.toLocaleString()}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 text-muted-foreground">Bedrooms</td>
                          {selectedProperties.map((property) => (
                            <td key={property.id} className="text-center py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <Bed className="h-4 w-4" />
                                {property.bedrooms}
                              </div>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <td className="py-3 px-4 text-muted-foreground">Bathrooms</td>
                          {selectedProperties.map((property) => (
                            <td key={property.id} className="text-center py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <Bath className="h-4 w-4" />
                                {property.bathrooms}
                              </div>
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b bg-secondary/30">
                          <td className="py-3 px-4 font-medium" colSpan={selectedProperties.length + 1}>
                            Amenities
                          </td>
                        </tr>
                        {allAmenities.map((amenity) => (
                          <tr key={amenity} className="border-b">
                            <td className="py-3 px-4 text-muted-foreground">{amenity}</td>
                            {selectedProperties.map((property) => (
                              <td key={property.id} className="text-center py-3 px-4">
                                {property.amenities.includes(amenity) ? (
                                  <Check className="h-5 w-5 text-primary mx-auto" />
                                ) : (
                                  <Minus className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
