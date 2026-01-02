import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, Plus, Eye, Edit, Trash2, MoreHorizontal,
  Search, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Property } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import useSWR, { mutate } from 'swr';

export default function AgentListings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  const { data: properties, isLoading } = useSWR<Property[]>(
    profile?.id ? `agent-all-properties-${profile.id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('agent_id', profile!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Property[];
    }
  );

  const filteredProperties = properties?.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (!propertyToDelete) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyToDelete.id);

      if (error) throw error;

      toast({ title: 'Property deleted successfully' });
      mutate(`agent-all-properties-${profile?.id}`);
    } catch (error: any) {
      toast({ 
        title: 'Failed to delete property', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    }
  };

  const approvedCount = properties?.filter(p => p.status === 'approved').length || 0;
  const pendingCount = properties?.filter(p => p.status === 'pending').length || 0;
  const rejectedCount = properties?.filter(p => p.status === 'rejected').length || 0;

  return (
    <AgentLayout title="My Listings">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Listings</p>
              <p className="text-2xl font-bold">{properties?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-success">{approvedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link to="/agent/add-property">
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Link>
            </Button>
          </div>
        </div>

        {/* Listings */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-24 bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : filteredProperties && filteredProperties.length > 0 ? (
          <div className="space-y-4">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="h-32 sm:h-auto sm:w-40 flex-shrink-0">
                      <img
                        src={property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{property.title}</h3>
                          <p className="text-sm text-muted-foreground">{property.address}, {property.city}</p>
                          <p className="text-lg font-bold mt-1">₦{property.price.toLocaleString()}/year</p>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{property.bedrooms} bed</span>
                            <span>{property.bathrooms} bath</span>
                            <span>{property.views_count || 0} views</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className={`status-${property.status}`}>{property.status}</span>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/property/${property.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/agent/edit-property/${property.id}`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setPropertyToDelete(property);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Start by adding your first property listing'}
              </p>
              <Button asChild>
                <Link to="/agent/add-property">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Property
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Property</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{propertyToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AgentLayout>
  );
}
