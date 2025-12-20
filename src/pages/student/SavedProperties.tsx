import { Link } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar, SidebarItem } from '@/components/dashboard/DashboardSidebar';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { Property } from '@/types/database';
import { 
  Home, Calendar, Users, GitCompare, LogOut 
} from 'lucide-react';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

const studentNavItems: SidebarItem[] = [
  { icon: Home, label: 'Browse Listings', href: '/dashboard' },
  { icon: Heart, label: 'Saved Properties', href: '/student/saved' },
  { icon: Calendar, label: 'My Bookings', href: '/student/bookings' },
  { icon: Users, label: 'Shared Rentals', href: '/student/shared' },
  { icon: GitCompare, label: 'Compare Properties', href: '/student/compare' },
];

export default function SavedProperties() {
  const { profile } = useAuth();

  const { data: savedProperties, isLoading, mutate } = useSWR(
    profile?.id ? `saved-properties-full-${profile.id}` : null,
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

  const handleUnsave = async (propertyId: string) => {
    if (!profile?.id) return;
    
    await supabase
      .from('saved_properties')
      .delete()
      .eq('user_id', profile.id)
      .eq('property_id', propertyId);
    
    mutate();
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
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Saved Properties</h1>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : savedProperties && savedProperties.length > 0 ? (
            <PropertyGrid 
              properties={savedProperties} 
              savedProperties={savedProperties.map(p => p.id)}
              onSave={handleUnsave}
            />
          ) : (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No saved properties yet</h3>
              <p className="text-muted-foreground mb-6">
                Start browsing and save properties you like by clicking the heart icon!
              </p>
              <Button asChild>
                <Link to="/search">Browse Properties</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
