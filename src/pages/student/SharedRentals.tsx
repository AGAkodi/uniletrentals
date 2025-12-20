import { Link } from 'react-router-dom';
import { Users, MapPin, Bed, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar, SidebarItem } from '@/components/dashboard/DashboardSidebar';
import { Home, Heart, Calendar, GitCompare } from 'lucide-react';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

const studentNavItems: SidebarItem[] = [
  { icon: Home, label: 'Browse Listings', href: '/dashboard' },
  { icon: Heart, label: 'Saved Properties', href: '/student/saved' },
  { icon: Calendar, label: 'My Bookings', href: '/student/bookings' },
  { icon: Users, label: 'Shared Rentals', href: '/student/shared' },
  { icon: GitCompare, label: 'Compare Properties', href: '/student/compare' },
];

export default function SharedRentals() {
  const { profile } = useAuth();

  // For now, fetch properties that could be shared (multi-bedroom)
  const { data: sharedListings, isLoading } = useSWR(
    'shared-rentals',
    async () => {
      const { data } = await supabase
        .from('properties')
        .select(`*, agent:profiles!properties_agent_id_fkey(*)`)
        .eq('status', 'approved')
        .gte('bedrooms', 2)
        .order('created_at', { ascending: false })
        .limit(12);
      return data;
    }
  );

  const formatPrice = (price: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <DashboardSidebar 
        items={studentNavItems}
        userInfo={{
          name: profile?.full_name || 'Student',
          subtitle: 'Student Account',
          avatarContent: profile?.full_name?.charAt(0) || 'S'
        }}
      />

      <main className="pt-8 px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Shared Rentals</h1>
          </div>
          
          <p className="text-muted-foreground mb-8">
            Find apartments perfect for sharing with roommates. These listings have multiple bedrooms and are ideal for students looking to split costs.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sharedListings && sharedListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedListings.map((property: any) => {
                const imageUrl = property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800';
                const pricePerRoom = Math.round(property.price / property.bedrooms);

                return (
                  <Card key={property.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                    <Link to={`/property/${property.id}`}>
                      <div className="relative aspect-[4/3]">
                        <img 
                          src={imageUrl} 
                          alt={property.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <Badge className="absolute top-3 left-3 bg-primary">
                          {property.bedrooms} Rooms Available
                        </Badge>
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <Link to={`/property/${property.id}`}>
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                          {property.title}
                        </h3>
                      </Link>
                      
                      <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="line-clamp-1">{property.city}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Price per room</p>
                          <p className="font-bold text-lg text-primary">
                            {formatPrice(pricePerRoom, property.currency)}
                            <span className="text-sm text-muted-foreground font-normal">/year</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Bed className="h-4 w-4" />
                          <span>{property.bedrooms} bed</span>
                        </div>
                      </div>

                      <Button className="w-full mt-4" variant="outline" asChild>
                        <Link to={`/property/${property.id}`}>View Details</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No shared rentals available</h3>
              <p className="text-muted-foreground mb-6">
                Check back soon for apartments perfect for sharing with roommates.
              </p>
              <Button asChild>
                <Link to="/search">Browse All Properties</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
