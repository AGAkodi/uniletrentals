import { Link } from 'react-router-dom';
import { 
  Building2, Plus, Calendar, BarChart3, 
  FileCheck, CheckCircle, Clock, Eye, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar, SidebarItem } from '@/components/dashboard/DashboardSidebar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { Property } from '@/types/database';

const agentNavItems: SidebarItem[] = [
  { icon: User, label: 'Profile', href: '/agent/profile' },
  { icon: Building2, label: 'My Listings', href: '/agent/listings' },
  { icon: Plus, label: 'Add Property', href: '/agent/add-property' },
  { icon: Calendar, label: 'Bookings', href: '/agent/bookings' },
  { icon: BarChart3, label: 'Analytics', href: '/agent/analytics' },
];

export default function AgentDashboard() {
  const { profile } = useAuth();

  const { data: properties } = useSWR<Property[]>(
    profile?.id ? `agent-properties-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', profile!.id)
        .order('created_at', { ascending: false });
      return data as Property[];
    }
  );

  const { data: verification } = useSWR(
    profile?.id ? `agent-verification-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('agent_verifications')
        .select('*')
        .eq('user_id', profile!.id)
        .maybeSingle();
      return data;
    }
  );

  const { data: bookings } = useSWR(
    profile?.id ? `agent-bookings-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, property:properties(*), user:profiles!bookings_user_id_fkey(*)')
        .eq('agent_id', profile!.id)
        .order('scheduled_date', { ascending: true })
        .limit(5);
      return data;
    }
  );

  const approvedCount = properties?.filter(p => p.status === 'approved').length || 0;
  const pendingCount = properties?.filter(p => p.status === 'pending').length || 0;
  const totalViews = properties?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
  const isVerified = verification?.verification_status === 'approved';

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <DashboardSidebar 
        items={agentNavItems}
        userInfo={{
          name: profile?.full_name || 'Agent',
          subtitle: isVerified ? 'Verified Agent' : 'Pending Verification',
          avatarUrl: profile?.avatar_url || undefined,
        }}
        extraContent={
          verification?.agent_id && (
            <p className="mt-2 text-xs text-muted-foreground font-mono">{verification.agent_id}</p>
          )
        }
      />

      <main className="pt-8 px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Agent Dashboard</h1>
            <Button asChild>
              <Link to="/agent/add-property">
                <Plus className="h-5 w-5 mr-2" />
                Add Property
              </Link>
            </Button>
          </div>

          {/* Verification Alert */}
          {!isVerified && (
            <Card className="mb-6 border-warning bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Account Pending Verification</p>
                    <p className="text-sm text-muted-foreground">
                      Upload your verification documents to get approved and list properties.
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <Link to="/agent/verification">Upload Documents</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{approvedCount}</p>
                    <p className="text-sm text-muted-foreground">Active Listings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="text-sm text-muted-foreground">Pending Approval</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalViews}</p>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{bookings?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Listings */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Your Listings</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/agent/listings">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {properties && properties.length > 0 ? (
                <div className="space-y-4">
                  {properties.slice(0, 5).map((property) => (
                    <div key={property.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted">
                          <img 
                            src={property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'} 
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold">{property.title}</p>
                          <p className="text-sm text-muted-foreground">{property.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">₦{property.price.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{property.views_count} views</p>
                        </div>
                        <span className={`status-${property.status}`}>{property.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                  <p className="text-muted-foreground mb-4">Start by adding your first property listing.</p>
                  <Button asChild>
                    <Link to="/agent/add-property">
                      <Plus className="h-5 w-5 mr-2" />
                      Add Property
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Booking Requests</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/agent/bookings">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {bookings && bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking: any) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                      <div>
                        <p className="font-semibold">{booking.property?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.user?.full_name} • {new Date(booking.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`status-${booking.status}`}>{booking.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No booking requests yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
