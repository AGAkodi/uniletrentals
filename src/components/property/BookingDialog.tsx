import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BookingDialogProps {
  propertyId: string;
  agentId: string;
  propertyTitle: string;
  onBookingComplete: () => void;
  children: React.ReactNode;
}

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

export function BookingDialog({ propertyId, agentId, propertyTitle, onBookingComplete, children }: BookingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBook = async () => {
    if (!user) {
      toast({ title: 'Please login', description: 'You need to be logged in to book.', variant: 'destructive' });
      return;
    }

    if (!date || !time) {
      toast({ title: 'Select date & time', description: 'Please select both date and time.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    // Create booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        property_id: propertyId,
        agent_id: agentId,
        scheduled_date: format(date, 'yyyy-MM-dd'),
        scheduled_time: time,
        status: 'pending'
      });

    if (bookingError) {
      setIsSubmitting(false);
      toast({ title: 'Error', description: 'Failed to book. Please try again.', variant: 'destructive' });
      return;
    }

    // Send notification to agent
    await supabase
      .from('notifications')
      .insert({
        user_id: agentId,
        title: 'New Booking Request',
        message: `Someone booked an inspection for "${propertyTitle}" on ${format(date, 'PPP')} at ${time}`,
        type: 'booking',
        link: '/agent/dashboard'
      });

    setIsSubmitting(false);
    setOpen(false);
    toast({ title: 'Booked!', description: 'Inspection scheduled. You can now contact the agent.' });
    onBookingComplete();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[280px] p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm">Book Inspection</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Select a date</p>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) => d < new Date()}
              className={cn("rounded-md border text-xs pointer-events-auto")}
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "flex justify-center pt-1 relative items-center text-xs",
                caption_label: "text-xs font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100",
                table: "w-full border-collapse",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-7 font-normal text-[0.65rem]",
                row: "flex w-full mt-1",
                cell: "text-center text-xs p-0 relative",
                day: "h-7 w-7 p-0 font-normal text-xs",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
              }}
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Select time</p>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger className="h-8 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Pick time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot} className="text-xs">
                    {slot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleBook} 
            disabled={isSubmitting || !date || !time}
            size="sm"
            className="w-full"
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
