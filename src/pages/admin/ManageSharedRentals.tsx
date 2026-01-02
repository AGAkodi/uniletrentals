import { useState } from 'react';
import { Loader2, Users, Trash2, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import useSWR from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { SharedRental } from '@/types/database';
import { Navbar } from '@/components/layout/Navbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Link } from 'react-router-dom';

function ManageSharedRentalsContent() {
  const [removingId, setRemovingId] = useState<string | null>(null);

  const { data: sharedRentals, isLoading, mutate } = useSWR(
    'admin-shared-rentals',
    async () => {
      const { data: rentals } = await supabase
        .from('shared_rentals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!rentals || rentals.length === 0) return [];

      const propertyIds = [...new Set(rentals.map((r) => r.property_id))];
      const hostIds = [...new Set(rentals.map((r) => r.host_student_id))];

      const [{ data: properties }, { data: hosts }] = await Promise.all([
        supabase.from('properties').select('*').in('id', propertyIds),
        supabase.from('profiles').select('*').in('id', hostIds),
      ]);

      const propertyMap = new Map(properties?.map((p) => [p.id, p]) || []);
      const hostMap = new Map(hosts?.map((h) => [h.id, h]) || []);

      return rentals.map((rental) => ({
        ...rental,
        property: propertyMap.get(rental.property_id),
        host_student: hostMap.get(rental.host_student_id),
      })) as SharedRental[];
    }
  );

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const { error } = await supabase
        .from('shared_rentals')
        .update({ status: 'archived' })
        .eq('id', id);

      if (error) throw error;

      toast.success('Shared rental removed');
      mutate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove');
    } finally {
      setRemovingId(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGenderBadge = (pref: string) => {
    switch (pref) {
      case 'male':
        return <Badge variant="secondary">Male Only</Badge>;
      case 'female':
        return <Badge variant="secondary">Female Only</Badge>;
      default:
        return <Badge variant="outline">Any Gender</Badge>;
    }
  };

  const activeRentals = sharedRentals?.filter((r) => r.status === 'active') || [];
  const archivedRentals = sharedRentals?.filter((r) => r.status === 'archived') || [];

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      <main className="pt-8 px-6 md:px-8 lg:px-12 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Manage Shared Rentals</h1>
              <p className="text-muted-foreground">
                View and manage all shared rental listings
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Active Rentals */}
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Active Listings ({activeRentals.length})
                </h2>
                {activeRentals.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Host Student</TableHead>
                          <TableHead>Rent Split</TableHead>
                          <TableHead>Gender Pref</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeRentals.map((rental) => (
                          <TableRow key={rental.id}>
                            <TableCell>
                              <Link
                                to={`/property/${rental.property_id}`}
                                className="font-medium hover:text-primary"
                              >
                                {rental.property?.title || 'Unknown Property'}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={rental.host_student?.avatar_url || ''} />
                                  <AvatarFallback>
                                    {getInitials(rental.host_student?.full_name || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {rental.host_student?.full_name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {rental.host_student?.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{formatPrice(rental.rent_split)}</TableCell>
                            <TableCell>{getGenderBadge(rental.gender_preference)}</TableCell>
                            <TableCell>
                              {format(new Date(rental.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" variant="outline" asChild>
                                  <Link to={`/property/${rental.property_id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Listing?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will archive the shared rental listing. The host
                                        student will no longer be able to receive interests.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRemove(rental.id)}
                                        disabled={removingId === rental.id}
                                      >
                                        {removingId === rental.id && (
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        )}
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-8 text-center">
                    No active shared rental listings.
                  </p>
                )}
              </div>

              {/* Archived Rentals */}
              {archivedRentals.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    Archived Listings ({archivedRentals.length})
                  </h2>
                  <div className="border rounded-lg overflow-hidden opacity-75">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Host Student</TableHead>
                          <TableHead>Rent Split</TableHead>
                          <TableHead>Archived</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedRentals.map((rental) => (
                          <TableRow key={rental.id}>
                            <TableCell>{rental.property?.title || 'Unknown'}</TableCell>
                            <TableCell>{rental.host_student?.full_name || 'Unknown'}</TableCell>
                            <TableCell>{formatPrice(rental.rent_split)}</TableCell>
                            <TableCell>
                              {format(new Date(rental.updated_at), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ManageSharedRentals() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <ManageSharedRentalsContent />
    </ProtectedRoute>
  );
}
