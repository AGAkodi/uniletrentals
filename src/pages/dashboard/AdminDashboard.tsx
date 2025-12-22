import { Link } from 'react-router-dom';
import { 
  Users, Building2, Shield, FileCheck, 
  Flag, FileText, CheckCircle, Clock, TrendingUp, User, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import { DashboardSidebar, SidebarItem } from '@/components/dashboard/DashboardSidebar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

export default function AdminDashboard() {
  const { profile } = useAuth();

  const { data: stats } = useSWR('admin-stats', async () => {
    const [profiles, properties, bookings, pendingAgents, pendingListings, reports] = await Promise.all([
      supabase.from('profiles').select('id, role', { count: 'exact' }),
      supabase.from('properties').select('id, status', { count: 'exact' }),
      supabase.from('bookings').select('id', { count: 'exact' }),
      supabase.from('agent_verifications').select('id').eq('verification_status', 'pending'),
      supabase.from('properties').select('id').eq('status', 'pending'),
      supabase.from('reports').select('id').eq('status', 'pending'),
    ]);

    const students = profiles.data?.filter(p => p.role === 'student').length || 0;
    const agents = profiles.data?.filter(p => p.role === 'agent').length || 0;
    const approvedListings = properties.data?.filter(p => p.status === 'approved').length || 0;

    return {
      totalUsers: profiles.count || 0,
      students,
      agents,
      totalListings: properties.count || 0,
      approvedListings,
      totalBookings: bookings.count || 0,
      pendingAgents: pendingAgents.data?.length || 0,
      pendingListings: pendingListings.data?.length || 0,
      pendingReports: reports.data?.length || 0,
    };
  });

  const { data: pendingAgentsList } = useSWR('pending-agents', async () => {
    const { data } = await supabase
      .from('agent_verifications')
      .select('*, user:profiles!agent_verifications_user_id_fkey(*)')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    return data;
  });

  const { data: pendingProperties } = useSWR('pending-properties', async () => {
    const { data } = await supabase
      .from('properties')
      .select('*, agent:profiles!properties_agent_id_fkey(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    return data;
  });

  const adminNavItems: SidebarItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    { icon: User, label: 'Profile', href: '/admin/profile' },
    { icon: Shield, label: 'Agent Review', href: '/admin/verify-agents', badge: stats?.pendingAgents },
    { icon: FileCheck, label: 'Listing Approval', href: '/admin/approve-listings', badge: stats?.pendingListings },
    { icon: Flag, label: 'Disputes', href: '/admin/reports', badge: stats?.pendingReports },
    { icon: FileText, label: 'Create Blog', href: '/admin/blog' },
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <DashboardSidebar 
        items={adminNavItems}
        userInfo={{
          name: profile?.full_name || 'Admin',
          subtitle: 'Administrator',
          avatarUrl: profile?.avatar_url || undefined,
        }}
      />

      <main className="pt-8 px-6 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats?.students || 0} students, {stats?.agents || 0} agents
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Listings</p>
                    <p className="text-3xl font-bold">{stats?.totalListings || 0}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats?.approvedListings || 0} approved
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bookings</p>
                    <p className="text-3xl font-bold">{stats?.totalBookings || 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-info" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Actions</p>
                    <p className="text-3xl font-bold">
                      {(stats?.pendingAgents || 0) + (stats?.pendingListings || 0) + (stats?.pendingReports || 0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending Agent Verifications */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Pending Agent Verifications
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/verify-agents">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {pendingAgentsList && pendingAgentsList.length > 0 ? (
                  <div className="space-y-4">
                    {pendingAgentsList.map((agent: any) => (
                      <div key={agent.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div>
                          <p className="font-semibold">{agent.user?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{agent.company_name || 'Individual Agent'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="accent">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-10 w-10 mx-auto text-accent mb-2" />
                    <p className="text-muted-foreground">No pending verifications</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Property Approvals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Pending Listings
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/approve-listings">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {pendingProperties && pendingProperties.length > 0 ? (
                  <div className="space-y-4">
                    {pendingProperties.map((property: any) => (
                      <div key={property.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'} 
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold">{property.title}</p>
                            <p className="text-sm text-muted-foreground">by {property.agent?.full_name}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="accent">Approve</Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-10 w-10 mx-auto text-accent mb-2" />
                    <p className="text-muted-foreground">No pending listings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
