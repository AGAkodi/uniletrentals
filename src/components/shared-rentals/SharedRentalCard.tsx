import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Users, Calendar, Trash2, Loader2, CheckCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { SharedRental, Profile } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StudentProfilePopup } from './StudentProfilePopup';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SharedRentalCardProps {
  sharedRental: SharedRental;
  isOwner?: boolean;
  hasExpressedInterest?: boolean;
  onRefresh: () => void;
}

export function SharedRentalCard({
  sharedRental,
  isOwner = false,
  hasExpressedInterest = false,
  onRefresh,
}: SharedRentalCardProps) {
  const { user } = useAuth();
  const [isInteresting, setIsInteresting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const property = sharedRental.property;
  const hostStudent = sharedRental.host_student;

  if (!property) return null;

  const imageUrl = property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: property.currency || 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getGenderLabel = (preference: string) => {
    switch (preference) {
      case 'male':
        return 'Male Only';
      case 'female':
        return 'Female Only';
      default:
        return 'Any Gender';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleExpressInterest = async () => {
    if (!user) {
      toast.error('Please log in to express interest');
      return;
    }

    setIsInteresting(true);
    try {
      const { error } = await supabase.from('shared_rental_interests').insert({
        shared_rental_id: sharedRental.id,
        interested_student_id: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already expressed interest in this listing');
        } else {
          throw error;
        }
      } else {
        toast.success('Interest expressed! The host will be notified.');
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error expressing interest:', error);
      toast.error(error.message || 'Failed to express interest');
    } finally {
      setIsInteresting(false);
    }
  };

  const handleRemoveListing = async () => {
    setIsRemoving(true);
    try {
      const { error } = await supabase
        .from('shared_rentals')
        .update({ status: 'archived' })
        .eq('id', sharedRental.id);

      if (error) throw error;

      toast.success('Shared rental listing removed');
      onRefresh();
    } catch (error: any) {
      console.error('Error removing shared rental:', error);
      toast.error(error.message || 'Failed to remove listing');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleContactViaWhatsApp = () => {
    if (!hostStudent?.phone) {
      toast.error('Host student phone number not available');
      return;
    }
    const phone = hostStudent.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hi! I'm interested in your shared rental listing for "${property.title}".`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
      <Link to={`/property/${property.id}`}>
        <div className="relative aspect-[4/3]">
          <img
            src={imageUrl}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <Badge className="absolute top-3 left-3 bg-primary">
            Shared Rental
          </Badge>
          <Badge className="absolute top-3 right-3 bg-secondary text-secondary-foreground">
            {getGenderLabel(sharedRental.gender_preference)}
          </Badge>
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link to={`/property/${property.id}`}>
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {property.title}
            </h3>
          </Link>
          {property.agent && (
            <Badge variant="outline" className="shrink-0 text-xs">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              Verified Agent
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="line-clamp-1">{property.city}</span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Rent Split</p>
            <p className="font-bold text-lg text-primary">
              {formatPrice(sharedRental.rent_split)}
              <span className="text-sm text-muted-foreground font-normal">/person</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Rent</p>
            <p className="font-semibold">{formatPrice(sharedRental.total_rent)}</p>
          </div>
        </div>

        {sharedRental.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            "{sharedRental.description}"
          </p>
        )}

        {sharedRental.move_in_date && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <Calendar className="h-4 w-4" />
            <span>Move-in: {format(new Date(sharedRental.move_in_date), 'MMM d, yyyy')}</span>
          </div>
        )}

        {hostStudent && (
          <div className="flex items-center gap-3 py-3 border-t">
            <StudentProfilePopup student={hostStudent}>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={hostStudent.avatar_url || ''} alt={hostStudent.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(hostStudent.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium">{hostStudent.full_name}</p>
                  <p className="text-xs text-muted-foreground">Host Student</p>
                </div>
              </button>
            </StudentProfilePopup>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {isOwner ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full" disabled={isRemoving}>
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remove Listing
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Shared Rental?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your shared rental listing. The original property listing will remain unchanged.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemoveListing}>
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : hasExpressedInterest ? (
            <Button variant="outline" className="w-full" onClick={handleContactViaWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Host
            </Button>
          ) : (
            <Button className="w-full" onClick={handleExpressInterest} disabled={isInteresting}>
              {isInteresting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Interested
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
