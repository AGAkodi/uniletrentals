import { useState, useMemo } from 'react';
import { 
  Eye, Calendar, Phone, TrendingUp, Building2, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgentLayout } from '@/components/agent/AgentLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import useSWR from 'swr';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

type TimeFilter = '7d' | '30d' | '90d' | '365d';

export default function AgentAnalytics() {
  const { profile } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');

  const getDateRange = (filter: TimeFilter) => {
    const now = new Date();
    const days = filter === '7d' ? 7 : filter === '30d' ? 30 : filter === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now, days };
  };

  const { startDate, days } = getDateRange(timeFilter);

  // Fetch properties
  const { data: properties } = useSWR(
    profile?.id ? `agent-analytics-properties-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', profile!.id);
      return data || [];
    }
  );

  // Fetch bookings with date filter
  const { data: bookings } = useSWR(
    profile?.id ? `agent-analytics-bookings-${profile.id}-${timeFilter}` : null,
    async () => {
      const { data } = await supabase
        .from('bookings')
        .select('*, property:properties(title)')
        .eq('agent_id', profile!.id)
        .gte('created_at', startDate.toISOString());
      return data || [];
    }
  );

  // Calculate stats
  const stats = useMemo(() => {
    const totalViews = properties?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0;
    const totalContactClicks = properties?.reduce((sum, p) => sum + (p.contact_clicks || 0), 0) || 0;
    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
    const activeListings = properties?.filter(p => p.status === 'approved').length || 0;

    return {
      totalViews,
      totalContactClicks,
      totalBookings,
      confirmedBookings,
      activeListings,
      conversionRate: totalViews > 0 ? ((totalBookings / totalViews) * 100).toFixed(1) : '0',
    };
  }, [properties, bookings]);

  // Property performance data
  const propertyPerformance = useMemo(() => {
    return properties?.slice(0, 5).map(p => ({
      name: p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
      views: p.views_count || 0,
      contacts: p.contact_clicks || 0,
    })) || [];
  }, [properties]);

  // Booking status distribution
  const bookingStatusData = useMemo(() => {
    const statusCounts = bookings?.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return [
      { name: 'Pending', value: statusCounts['pending'] || 0, color: 'hsl(44, 100%, 48%)' },
      { name: 'Confirmed', value: statusCounts['confirmed'] || 0, color: 'hsl(147, 50%, 47%)' },
      { name: 'Completed', value: statusCounts['completed'] || 0, color: 'hsl(182, 56%, 42%)' },
      { name: 'Cancelled', value: statusCounts['cancelled'] || 0, color: 'hsl(7, 74%, 57%)' },
    ].filter(item => item.value > 0);
  }, [bookings]);

  // Daily bookings trend (mock data based on actual bookings)
  const dailyTrend = useMemo(() => {
    const trendData = [];
    for (let i = Math.min(days, 14); i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayBookings = bookings?.filter(b => 
        b.created_at?.startsWith(dateStr)
      ).length || 0;
      
      trendData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bookings: dayBookings,
      });
    }
    return trendData;
  }, [bookings, days]);

  return (
    <AgentLayout title="Analytics">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Time Filter */}
        <div className="flex justify-end">
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalContactClicks}</p>
                  <p className="text-xs text-muted-foreground">Contact Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.confirmedBookings}</p>
                  <p className="text-xs text-muted-foreground">Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeListings}</p>
                  <p className="text-xs text-muted-foreground">Active Listings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Booking Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {bookingStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {bookingStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No booking data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Property Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Property Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {propertyPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={propertyPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={150}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="contacts" fill="hsl(var(--accent))" name="Contact Clicks" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No property data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AgentLayout>
  );
}
