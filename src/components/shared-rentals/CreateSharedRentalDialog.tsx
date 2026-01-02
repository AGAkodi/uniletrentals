import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Property } from '@/types/database';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const formSchema = z.object({
  gender_preference: z.enum(['male', 'female', 'any'], {
    required_error: 'Please select a gender preference',
  }),
  religion_preference: z.enum(['any', 'christian', 'muslim', 'other'], {
    required_error: 'Please select a religion preference',
  }),
  total_rent: z.number().min(1, 'Total rent is required'),
  rent_split: z.number().min(1, 'Rent split is required'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  move_in_date: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateSharedRentalDialogProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSharedRentalDialog({
  property,
  open,
  onOpenChange,
  onSuccess,
}: CreateSharedRentalDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender_preference: 'any',
      religion_preference: 'any',
      total_rent: property.price,
      rent_split: Math.round(property.price / 2),
      description: '',
    },
  });

  const totalRent = form.watch('total_rent');

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error('You must be logged in to create a shared rental');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('shared_rentals').insert({
        property_id: property.id,
        host_student_id: user.id,
        gender_preference: values.gender_preference,
        religion_preference: values.religion_preference,
        total_rent: values.total_rent,
        rent_split: values.rent_split,
        description: values.description || null,
        move_in_date: values.move_in_date ? format(values.move_in_date, 'yyyy-MM-dd') : null,
      });

      if (error) throw error;

      toast.success('Shared rental listing created successfully!');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating shared rental:', error);
      toast.error(error.message || 'Failed to create shared rental');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: property.currency || 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Shared Rental Listing</DialogTitle>
          <DialogDescription>
            Share "{property.title}" with potential roommates. Set your preferences below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="gender_preference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Roommate Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="religion_preference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Religion</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select religion preference" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="christian">Christian</SelectItem>
                      <SelectItem value="muslim">Muslim</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="total_rent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Rent Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter total rent"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Current listing price: {formatPrice(property.price)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rent_split"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rent Split (Per Person)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter rent per person"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    {totalRent > 0 && field.value > 0 && (
                      <>
                        {formatPrice(totalRent)} ÷ {formatPrice(field.value)} = ~{Math.round(totalRent / field.value)} people
                      </>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roommate Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Looking for quiet, clean, non-smoker, student only..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe your ideal roommate (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="move_in_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Move-in Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Shared Rental
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
