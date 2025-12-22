import { Link } from 'react-router-dom';
import { 
  Home, Heart, Calendar, ChevronRight, Building2, Users, GitCompare, FileText, User, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar, SidebarItem } from '@/components/dashboard/DashboardSidebar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { Property } from '@/types/database';

const studentNavItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard/student' },
  { icon: User, label: 'Profile', href: '/student/profile' },
  { icon: Home, label: 'Browse Listings', href: '/search' },
  { icon: Heart, label: 'Saved Properties', href: '/student/saved' },
  { icon: Users, label: 'Shared Rental Space', href: '/student/shared' },
  { icon: GitCompare, label: 'Compare Listings', href: '/student/compare' },
  { icon: FileText, label: 'Blog', href: '/student/blog' },
];

export default function StudentDashboard() {
  const { profile } = useAuth();

  const { data: featuredProperties } = useSWR<Property[]>(
    'featured-properties',
    async () => {
      const { data } = await supabase
        .from('properties')
        .select('*, agent:profiles!properties_agent_id_fkey(*)')
        .eq('status', 'approved')
        .order('views_count', { ascending: false })
        .limit(6);
      return data as Property[];
    }
  );

  const { data: savedPropertyIds } = useSWR(
    profile?.id ? `saved-ids-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('saved_properties')
        .select('property_id')
        .eq('user_id', profile!.id);
      return data?.map(sp => sp.property_id) || [];
    }
  );

  const { data: bookingsCount } = useSWR(
    profile?.id ? `bookings-count-${profile.id}` : null,
    async () => {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id);
      return count || 0;
    }
  );

  const handleSaveToggle = async (propertyId: string) => {
    if (!profile?.id) return;
    
    const isSaved = savedPropertyIds?.includes(propertyId);
    
    if (isSaved) {
      await supabase
        .from('saved_properties')
        .delete()
        .eq('user_id', profile.id)
        .eq('property_id', propertyId);
    } else {
      await supabase
        .from('saved_properties')
        .insert({ user_id: profile.id, property_id: propertyId });
    }
  };

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
          <h1 className="text-3xl font-bold mb-8">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!
          </h1>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{savedPropertyIds?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Saved Properties</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{bookingsCount}</p>
                    <p className="text-sm text-muted-foreground">My Bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">New</p>
                    <p className="text-sm text-muted-foreground">Shared Rentals</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <GitCompare className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">Compare</p>
                    <p className="text-sm text-muted-foreground">Properties</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Browse Listings */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Browse Listings</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/search">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {featuredProperties && featuredProperties.length > 0 ? (
                <PropertyGrid 
                  properties={featuredProperties} 
                  savedProperties={savedPropertyIds || []}
                  onSave={handleSaveToggle}
                />
              ) : (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No properties available</h3>
                  <p className="text-muted-foreground mb-4">Check back soon for new listings!</p>
                  <Button asChild>
                    <Link to="/search">Search Properties</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
