import { Link } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { Property } from '@/types/database';

export default function SavedProperties() {
  const { profile } = useAuth();

  const { data: savedProperties, isLoading } = useSWR(
    profile?.id ? `saved-properties-${profile.id}` : null,
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
            <h1 className="text-3xl font-bold">Saved Properties</h1>
            <p className="text-muted-foreground">Properties you've saved while browsing</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your saved properties...</p>
          </div>
        ) : savedProperties && savedProperties.length > 0 ? (
          <PropertyGrid properties={savedProperties} />
        ) : (
          <div className="text-center py-16 bg-background rounded-2xl border">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">No saved properties yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start browsing listings and click the heart icon to save properties you're interested in.
            </p>
            <Button asChild>
              <Link to="/browse">Browse Listings</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
