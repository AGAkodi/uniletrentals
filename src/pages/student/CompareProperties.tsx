import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, X, Plus, MapPin, Loader2, User, Home, Heart, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar, SidebarItem } from '@/components/dashboard/DashboardSidebar';
import { Property } from '@/types/database';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

const studentNavItems: SidebarItem[] = [
  { icon: User, label: 'Profile', href: '/student/profile' },
  { icon: Home, label: 'Browse Listings', href: '/dashboard' },
  { icon: Heart, label: 'Saved Properties', href: '/student/saved' },
  { icon: Users, label: 'Shared Rental Space', href: '/student/shared' },
  { icon: GitCompare, label: 'Compare Listings', href: '/student/compare' },
  { icon: FileText, label: 'Blog', href: '/student/blog' },
];

export default function CompareProperties() {
  const { profile } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  // Fetch saved properties to compare from
  const { data: savedProperties, isLoading } = useSWR(
    profile?.id ? `compare-saved-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('saved_properties')
        .select(`
          *,
          property:properties(*, agent:profiles!properties_agent_id_fkey(*))
        `)
        .eq('user_id', profile!.id);
      return data?.map(sp => sp.property).filter(Boolean) as Property[];
    }
  );

  const selectedProperties = savedProperties?.filter(p => selectedIds.includes(p.id)) || [];

  const formatPrice = (price: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const addToCompare = (id: string) => {
    if (selectedIds.length < 2 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
    setShowSelector(false);
  };

  const removeFromCompare = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
  };

  const clearComparison = () => {
    setSelectedIds([]);
  };

  const compareFields = [
    { label: 'Price', key: 'price', format: (p: Property) => formatPrice(p.price, p.currency || 'NGN') + '/year' },
    { label: 'Location', key: 'location', format: (p: Property) => `${p.city}${p.state ? `, ${p.state}` : ''}` },
    { label: 'Bedrooms', key: 'bedrooms', format: (p: Property) => p.bedrooms || 1 },
    { label: 'Bathrooms', key: 'bathrooms', format: (p: Property) => p.bathrooms || 1 },
    { label: 'Address', key: 'address', format: (p: Property) => p.address },
    { label: 'Amenities', key: 'amenities', format: (p: Property) => p.amenities?.length || 0 },
    { label: 'Agent Verified', key: 'verified', format: (p: Property) => p.agent ? 'Yes' : 'No' },
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <DashboardSidebar 
        items={studentNavItems}
        userInfo={{
          name: profile?.full_name || 'Student',
          subtitle: 'Student Account',
          avatarUrl: profile?.avatar_url || undefined,
        }}
      />

      <main className="pt-8 px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <GitCompare className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Compare Properties</h1>
            </div>
            {selectedIds.length > 0 && (
              <Button variant="outline" onClick={clearComparison}>
                Clear All
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Selection Slots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[0, 1].map((slot) => {
                  const property = selectedProperties[slot];
                  
                  if (property) {
                    const imageUrl = property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';
                    
                    return (
                      <Card key={slot} className="relative overflow-hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/80"
                          onClick={() => removeFromCompare(property.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="aspect-video">
                          <img 
                            src={imageUrl} 
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg mb-1">{property.title}</h3>
                          <div className="flex items-center gap-1 text-muted-foreground text-sm">
                            <MapPin className="h-4 w-4" />
                            <span>{property.city}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Card 
                      key={slot} 
                      className="border-dashed cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setShowSelector(true)}
                    >
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Select a property to compare</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Choose from your saved properties
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Comparison Table */}
              {selectedProperties.length === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Side-by-Side Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Feature</th>
                            <th className="text-left py-3 px-4 font-semibold">{selectedProperties[0].title}</th>
                            <th className="text-left py-3 px-4 font-semibold">{selectedProperties[1].title}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {compareFields.map((field) => {
                            const val1 = field.format(selectedProperties[0]);
                            const val2 = field.format(selectedProperties[1]);
                            const highlight = field.key === 'price' && val1 !== val2;
                            
                            return (
                              <tr key={field.key} className="border-b last:border-0">
                                <td className="py-3 px-4 font-medium text-muted-foreground">{field.label}</td>
                                <td className={`py-3 px-4 ${highlight && Number(selectedProperties[0].price) < Number(selectedProperties[1].price) ? 'text-accent font-semibold' : ''}`}>
                                  {val1}
                                </td>
                                <td className={`py-3 px-4 ${highlight && Number(selectedProperties[1].price) < Number(selectedProperties[0].price) ? 'text-accent font-semibold' : ''}`}>
                                  {val2}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Property Selector Modal */}
              {showSelector && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Select a Property</CardTitle>
                      <Button variant="ghost" size="icon" onClick={() => setShowSelector(false)}>
                        <X className="h-5 w-5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="overflow-y-auto max-h-[60vh]">
                      {savedProperties && savedProperties.length > 0 ? (
                        <div className="space-y-3">
                          {savedProperties
                            .filter(p => !selectedIds.includes(p.id))
                            .map((property) => {
                              const imageUrl = property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200';
                              
                              return (
                                <button
                                  key={property.id}
                                  onClick={() => addToCompare(property.id)}
                                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                                >
                                  <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0">
                                    <img 
                                      src={imageUrl} 
                                      alt={property.title}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{property.title}</p>
                                    <p className="text-sm text-muted-foreground">{property.city}</p>
                                    <p className="text-sm font-medium text-primary">
                                      {formatPrice(property.price, property.currency || 'NGN')}
                                    </p>
                                  </div>
                                  <Plus className="h-5 w-5 text-muted-foreground" />
                                </button>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No saved properties to compare</p>
                          <Button asChild className="mt-4">
                            <Link to="/search">Browse Properties</Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Empty State */}
              {selectedProperties.length === 0 && !showSelector && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Select 2 properties from your saved list to compare them side by side.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
