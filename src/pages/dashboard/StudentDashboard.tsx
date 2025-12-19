import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Home, Heart, Search, Calendar, Bell, User, LogOut, 
  Star, Flag, ChevronRight, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { Property } from '@/types/database';

const navItems = [
  { icon: Home, label: 'Overview', href: '/dashboard' },
  { icon: Heart, label: 'Saved Properties', href: '/dashboard/saved' },
  { icon: Search, label: 'Saved Searches', href: '/dashboard/searches' },
  { icon: Calendar, label: 'My Bookings', href: '/dashboard/bookings' },
  { icon: Star, label: 'My Reviews', href: '/dashboard/reviews' },
  { icon: Bell, label: 'Notifications', href: '/dashboard/notifications' },
];

export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: savedProperties } = useSWR(
    profile?.id ? `saved-properties-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('saved_properties')
        .select(`
          *,
          property:properties(*, agent:profiles!properties_agent_id_fkey(*))
        `)
        .eq('user_id', profile!.id)
        .limit(6);
      return data?.map(sp => sp.property).filter(Boolean) as Property[];
    }
  );

  const { data: bookings } = useSWR(
    profile?.id ? `bookings-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`*, property:properties(*), agent:profiles!bookings_agent_id_fkey(*)`)
        .eq('user_id', profile!.id)
        .order('scheduled_date', { ascending: true })
        .limit(5);
      return data;
    }
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 min-h-[calc(100vh-4rem)] bg-background border-r">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-semibold">
                {profile?.full_name?.charAt(0) || 'S'}
              </div>
              <div>
                <p className="font-semibold">{profile?.full_name || 'Student'}</p>
                <p className="text-sm text-muted-foreground">Student Account</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.label.toLowerCase())}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.label.toLowerCase()
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!</h1>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{savedProperties?.length || 0}</p>
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
                      <p className="text-2xl font-bold">{bookings?.length || 0}</p>
                      <p className="text-sm text-muted-foreground">Upcoming Bookings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Star className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Reviews Given</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                      <Search className="h-6 w-6 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">0</p>
                      <p className="text-sm text-muted-foreground">Saved Searches</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Saved Properties */}
            <Card className="mb-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Saved Properties</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/saved">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {savedProperties && savedProperties.length > 0 ? (
                  <PropertyGrid properties={savedProperties.slice(0, 3)} />
                ) : (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No saved properties yet</h3>
                    <p className="text-muted-foreground mb-4">Start browsing and save properties you like!</p>
                    <Button asChild>
                      <Link to="/search">Browse Properties</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Bookings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Upcoming Bookings</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/bookings">
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {bookings && bookings.length > 0 ? (
                  <div className="space-y-4">
                    {bookings.map((booking: any) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{booking.property?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(booking.scheduled_date).toLocaleDateString()} at {booking.scheduled_time}
                            </p>
                          </div>
                        </div>
                        <span className={`status-${booking.status}`}>{booking.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                    <p className="text-muted-foreground">Book an inspection to view properties in person!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
