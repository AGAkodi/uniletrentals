import { Link } from 'react-router-dom';
import { Calendar, ArrowLeft, Building2, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/layout/Navbar';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';

export default function MyBookings() {
  const { profile } = useAuth();

  const { data: bookings, isLoading } = useSWR(
    profile?.id ? `all-bookings-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`*, property:properties(*), agent:profiles!bookings_agent_id_fkey(*)`)
        .eq('user_id', profile!.id)
        .order('scheduled_date', { ascending: false });
      return data;
    }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-primary/10 text-primary';
      case 'pending': return 'bg-accent/10 text-accent';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground">Properties you've applied to book or inspect</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your bookings...</p>
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="grid gap-4">
            {bookings.map((booking: any) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="h-24 w-24 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-10 w-10 text-primary" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-semibold">{booking.property?.title}</h3>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{booking.property?.address}, {booking.property?.city}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{new Date(booking.scheduled_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{booking.scheduled_time}</span>
                        </div>
                      </div>
                      
                      {booking.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Notes: {booking.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" asChild>
                        <Link to={`/property/${booking.property_id}`}>View Property</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-background rounded-2xl border">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Browse listings and book inspections to view properties in person.
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
