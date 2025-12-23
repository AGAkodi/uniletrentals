import { Calendar, Building2, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/30',
  confirmed: 'bg-primary/10 text-primary border-primary/30',
  completed: 'bg-accent/10 text-accent border-accent/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function MyBookings() {
  const { profile } = useAuth();

  const { data: bookings, isLoading } = useSWR(
    profile?.id ? `all-bookings-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          *,
          property:properties(*),
          agent:profiles!bookings_agent_id_fkey(*)
        `)
        .eq('user_id', profile!.id)
        .order('scheduled_date', { ascending: false });
      return data;
    }
  );

  const activeBookings = bookings?.filter(b => ['pending', 'confirmed'].includes(b.status || '')) || [];
  const pastBookings = bookings?.filter(b => ['completed', 'cancelled'].includes(b.status || '')) || [];

  const BookingCard = ({ booking }: { booking: any }) => {
    const imageUrl = booking.property?.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';
    const whatsappNumber = booking.property?.whatsapp_number || booking.agent?.phone;

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-40 h-32 sm:h-auto">
              <img 
                src={imageUrl} 
                alt={booking.property?.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{booking.property?.title}</h3>
                  <p className="text-sm text-muted-foreground">{booking.property?.address}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border capitalize ${statusColors[booking.status || 'pending']}`}>
                  {booking.status}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(booking.scheduled_date).toLocaleDateString()}</span>
                </div>
                <span>at {booking.scheduled_time}</span>
              </div>

              {whatsappNumber && (
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Agent
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="pt-8 px-6 md:px-8 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">My Bookings</h1>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="active" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="active">
                  Active ({activeBookings.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past ({pastBookings.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                {activeBookings.length > 0 ? (
                  activeBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No active bookings</h3>
                    <p className="text-muted-foreground">Book an inspection to view properties in person!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {pastBookings.length > 0 ? (
                  pastBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No past bookings</h3>
                    <p className="text-muted-foreground">Your completed bookings will appear here.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}
