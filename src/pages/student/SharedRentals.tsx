import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, MapPin, Loader2, Plus, CheckCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { Property, SharedRental } from '@/types/database';
import { CreateSharedRentalDialog } from '@/components/shared-rentals/CreateSharedRentalDialog';
import { SharedRentalCard } from '@/components/shared-rentals/SharedRentalCard';

export default function SharedRentals() {
  const { user, profile } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch all approved properties for creating shared rentals
  const { data: approvedProperties, isLoading: isLoadingProperties } = useSWR(
    'approved-properties-for-sharing',
    async () => {
      const { data } = await supabase
        .from('properties')
        .select(`*, agent:profiles!properties_agent_id_fkey(*)`)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      return data as Property[];
    }
  );

  // Fetch active shared rentals
  const { data: sharedRentals, isLoading: isLoadingShared, mutate: refreshSharedRentals } = useSWR(
    'active-shared-rentals',
    async () => {
      const { data: rentals } = await supabase
        .from('shared_rentals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (!rentals || rentals.length === 0) return [];

      // Fetch properties and host students separately
      const propertyIds = [...new Set(rentals.map((r) => r.property_id))];
      const hostIds = [...new Set(rentals.map((r) => r.host_student_id))];

      const [{ data: properties }, { data: hosts }] = await Promise.all([
        supabase
          .from('properties')
          .select(`*, agent:profiles!properties_agent_id_fkey(*)`)
          .in('id', propertyIds),
        supabase.from('profiles').select('*').in('id', hostIds),
      ]);

      const propertyMap = new Map(properties?.map((p) => [p.id, p]) || []);
      const hostMap = new Map(hosts?.map((h) => [h.id, h]) || []);

      return rentals.map((rental) => ({
        ...rental,
        property: propertyMap.get(rental.property_id),
        host_student: hostMap.get(rental.host_student_id),
      })) as SharedRental[];
    }
  );

  // Fetch user's interests
  const { data: userInterests } = useSWR(
    user ? `user-interests-${user.id}` : null,
    async () => {
      const { data } = await supabase
        .from('shared_rental_interests')
        .select('shared_rental_id')
        .eq('interested_student_id', user!.id);
      return data?.map((i) => i.shared_rental_id) || [];
    }
  );

  // Fetch user's own shared rentals
  const { data: mySharedRentals, mutate: refreshMySharedRentals } = useSWR(
    user ? `my-shared-rentals-${user.id}` : null,
    async () => {
      const { data: rentals } = await supabase
        .from('shared_rentals')
        .select('*')
        .eq('host_student_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (!rentals || rentals.length === 0) return [];

      // Fetch properties separately
      const propertyIds = [...new Set(rentals.map((r) => r.property_id))];
      const { data: properties } = await supabase
        .from('properties')
        .select(`*, agent:profiles!properties_agent_id_fkey(*)`)
        .in('id', propertyIds);

      const propertyMap = new Map(properties?.map((p) => [p.id, p]) || []);

      // Get host profile (current user)
      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      return rentals.map((rental) => ({
        ...rental,
        property: propertyMap.get(rental.property_id),
        host_student: hostProfile,
      })) as SharedRental[];
    }
  );

  const formatPrice = (price: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleCreateSharedRental = (property: Property) => {
    setSelectedProperty(property);
    setShowCreateDialog(true);
  };

  const handleRefresh = () => {
    refreshSharedRentals();
    refreshMySharedRentals();
  };

  const isLoading = isLoadingProperties || isLoadingShared;

  // Filter out properties that user has already created shared rentals for
  const mySharedPropertyIds = mySharedRentals?.map((sr) => sr.property_id) || [];
  const availableProperties = approvedProperties?.filter(
    (p) => !mySharedPropertyIds.includes(p.id)
  );

  // Filter out user's own shared rentals from the browse list
  const otherSharedRentals = sharedRentals?.filter(
    (sr) => sr.host_student_id !== user?.id
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="pt-8 px-6 md:px-8 lg:px-12 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Shared Rental Space</h1>
                <p className="text-muted-foreground">
                  Find roommates or share your rental with other students
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="browse" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="browse">Browse Shared</TabsTrigger>
              <TabsTrigger value="create">Create Listing</TabsTrigger>
              <TabsTrigger value="my-listings">My Listings</TabsTrigger>
            </TabsList>

            {/* Browse Shared Rentals */}
            <TabsContent value="browse" className="space-y-6">
              <p className="text-muted-foreground">
                Browse shared rental listings from other verified students.
              </p>

              {isLoadingShared ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : otherSharedRentals && otherSharedRentals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherSharedRentals.map((sharedRental) => (
                    <SharedRentalCard
                      key={sharedRental.id}
                      sharedRental={sharedRental}
                      hasExpressedInterest={userInterests?.includes(sharedRental.id)}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No shared rentals available</h3>
                  <p className="text-muted-foreground mb-6">
                    Be the first to create a shared rental listing!
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Create Shared Rental */}
            <TabsContent value="create" className="space-y-6">
              <p className="text-muted-foreground">
                Select an approved property listing to create a shared rental. Only verified agent listings can be shared.
              </p>

              {isLoadingProperties ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : availableProperties && availableProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableProperties.map((property) => {
                    const imageUrl =
                      property.images?.[0] ||
                      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800';

                    return (
                      <Card
                        key={property.id}
                        className="overflow-hidden group hover:shadow-lg transition-shadow"
                      >
                        <Link to={`/property/${property.id}`}>
                          <div className="relative aspect-[4/3]">
                            <img
                              src={imageUrl}
                              alt={property.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {property.agent && (
                              <Badge className="absolute top-3 left-3 bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified Agent
                              </Badge>
                            )}
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

                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Price</p>
                              <p className="font-bold text-lg text-primary">
                                {formatPrice(property.price, property.currency)}
                              </p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <Home className="h-4 w-4 inline mr-1" />
                              {property.bedrooms} bed · {property.bathrooms} bath
                            </div>
                          </div>

                          <Button
                            className="w-full"
                            onClick={() => handleCreateSharedRental(property)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Shared Rental
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No properties available</h3>
                  <p className="text-muted-foreground mb-6">
                    No approved properties available for sharing at the moment.
                  </p>
                  <Button asChild>
                    <Link to="/search">Browse Properties</Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* My Listings */}
            <TabsContent value="my-listings" className="space-y-6">
              <p className="text-muted-foreground">
                Manage your shared rental listings. Remove listings once you've found roommates.
              </p>

              {mySharedRentals && mySharedRentals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mySharedRentals.map((sharedRental) => (
                    <SharedRentalCard
                      key={sharedRental.id}
                      sharedRental={sharedRental}
                      isOwner
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No shared rentals yet</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't created any shared rental listings.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {selectedProperty && (
        <CreateSharedRentalDialog
          property={selectedProperty}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
