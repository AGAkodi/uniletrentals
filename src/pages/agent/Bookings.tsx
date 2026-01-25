import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check, X, Clock, Trash2, RefreshCw } from 'lucide-react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

interface Booking {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  property: { id: string; title: string; images: string[] | null };
  user: { id: string; full_name: string; email: string; phone: string | null };
}

function RescheduleDialog({ booking, onReschedule }: { booking: Booking; onReschedule: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date(booking.scheduled_date));
  const [time, setTime] = useState(booking.scheduled_time);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReschedule = async () => {
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('bookings')
      .update({
        scheduled_date: format(date, 'yyyy-MM-dd'),
        scheduled_time: time,
      })
      .eq('id', booking.id);

    // Notify student
    await supabase.from('notifications').insert({
      user_id: booking.user.id,
      title: 'Booking Rescheduled',
      message: `Your inspection for "${booking.property.title}" has been rescheduled to ${format(date, 'PPP')} at ${time}`,
      type: 'booking',
      link: '/student/bookings'
    });

    setIsSubmitting(false);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to reschedule.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Rescheduled', description: 'Booking has been rescheduled.' });
    setOpen(false);
    onReschedule();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-3 w-3 mr-1" />
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[300px] p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm">Reschedule Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            disabled={(d) => d < new Date()}
            className={cn("rounded-md border text-xs pointer-events-auto")}
            classNames={{
              months: "flex flex-col",
              month: "space-y-2",
              caption: "flex justify-center pt-1 relative items-center text-xs",
              caption_label: "text-xs font-medium",
              nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
              table: "w-full border-collapse",
              head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[0.65rem]",
              row: "flex w-full mt-1",
              cell: "text-center text-xs p-0 relative",
              day: "h-7 w-7 p-0 font-normal text-xs",
              day_selected: "bg-primary text-primary-foreground",
            }}
          />
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger className="h-8 text-xs">
              <Clock className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((slot) => (
                <SelectItem key={slot} value={slot} className="text-xs">{slot}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleReschedule} disabled={isSubmitting} size="sm" className="w-full">
            {isSubmitting ? 'Saving...' : 'Confirm Reschedule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AgentBookingsContent() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const { data: bookings, mutate, error: bookingsError } = useSWR<Booking[]>(
    profile?.id ? `agent-all-bookings-${profile.id}` : null,
    async () => {
      console.log('[AgentBookings] Fetching bookings for agent_id:', profile!.id);
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*, property:properties(id, title, images), user:profiles!bookings_user_id_fkey(id, full_name, email, phone)')
        .eq('agent_id', profile!.id)
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        console.error('[AgentBookings] Error fetching bookings:', error);
      }
      console.log('[AgentBookings] Bookings found:', data?.length || 0, data);
      
      return data as Booking[];
    }
  );

  // Debug log
  if (bookingsError) {
    console.error('[AgentBookings] SWR error:', bookingsError);
  }

  const updateStatus = async (bookingId: string, status: 'pending' | 'confirmed' | 'cancelled' | 'completed', userId: string, propertyTitle: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update booking.', variant: 'destructive' });
      return;
    }

    // Notify student
    const messages: Record<string, string> = {
      confirmed: `Your inspection for "${propertyTitle}" has been confirmed!`,
      cancelled: `Your inspection for "${propertyTitle}" has been cancelled by the agent.`,
      completed: `Your inspection for "${propertyTitle}" has been marked as completed.`
    };

    await supabase.from('notifications').insert({
      user_id: userId,
      title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: messages[status],
      type: 'booking',
      link: '/student/bookings'
    });

    toast({ title: 'Updated', description: `Booking ${status}.` });
    mutate();
  };

  const deleteBooking = async (bookingId: string, userId: string, propertyTitle: string) => {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete booking.', variant: 'destructive' });
      return;
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Booking Removed',
      message: `The inspection for "${propertyTitle}" has been removed after completion.`,
      type: 'booking'
    });

    toast({ title: 'Deleted', description: 'Booking removed.' });
    mutate();
  };

  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
  const completedBookings = bookings?.filter(b => b.status === 'completed' || b.status === 'cancelled') || [];

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div className="flex items-start justify-between p-4 rounded-lg bg-secondary/50 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
          <img 
            src={booking.property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'} 
            alt={booking.property.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{booking.property.title}</p>
          <p className="text-sm text-muted-foreground">{booking.user.full_name}</p>
          <p className="text-xs text-muted-foreground">{booking.user.phone || booking.user.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <CalendarIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">{format(new Date(booking.scheduled_date), 'PPP')} at {booking.scheduled_time}</span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 shrink-0">
        {booking.status === 'pending' && (
          <>
            <Button size="sm" onClick={() => updateStatus(booking.id, 'confirmed', booking.user.id, booking.property.title)}>
              <Check className="h-3 w-3 mr-1" />
              Confirm
            </Button>
            <RescheduleDialog booking={booking} onReschedule={() => mutate()} />
            <Button variant="destructive" size="sm" onClick={() => updateStatus(booking.id, 'cancelled', booking.user.id, booking.property.title)}>
              <X className="h-3 w-3 mr-1" />
              Decline
            </Button>
          </>
        )}
        {booking.status === 'confirmed' && (
          <>
            <Button size="sm" onClick={() => updateStatus(booking.id, 'completed', booking.user.id, booking.property.title)}>
              <Check className="h-3 w-3 mr-1" />
              Complete
            </Button>
            <RescheduleDialog booking={booking} onReschedule={() => mutate()} />
          </>
        )}
        {(booking.status === 'completed' || booking.status === 'cancelled') && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete booking?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove this booking record.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteBooking(booking.id, booking.user.id, booking.property.title)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      <main className="pt-8 px-6 md:px-8 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Manage Bookings</h1>

          {/* Pending */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Pending Requests ({pendingBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingBookings.length > 0 ? (
                <div className="space-y-3">
                  {pendingBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No pending requests</p>
              )}
            </CardContent>
          </Card>

          {/* Confirmed */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-accent" />
                Confirmed ({confirmedBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {confirmedBookings.length > 0 ? (
                <div className="space-y-3">
                  {confirmedBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No confirmed bookings</p>
              )}
            </CardContent>
          </Card>

          {/* Completed/Cancelled */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                Past Bookings ({completedBookings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedBookings.length > 0 ? (
                <div className="space-y-3">
                  {completedBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No past bookings</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function AgentBookings() {
  return (
    <ProtectedRoute allowedRoles={['agent']}>
      <AgentBookingsContent />
    </ProtectedRoute>
  );
}
