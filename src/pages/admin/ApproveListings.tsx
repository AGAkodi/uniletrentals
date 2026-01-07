import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, Building2, CheckCircle, XCircle, Clock, 
  MapPin, Bed, Bath, Eye, Loader2, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import useSWR, { mutate } from 'swr';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Property } from '@/types/database';

interface PropertyWithAgent extends Omit<Property, 'agent'> {
  agent: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

export default function ApproveListings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithAgent | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [currentImage, setCurrentImage] = useState(0);

  const { data: pendingProperties, isLoading } = useSWR<PropertyWithAgent[]>(
    'all-pending-properties',
    async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*, agent:profiles!properties_agent_id_fkey(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PropertyWithAgent[];
    }
  );

  const handleApprove = async (property: PropertyWithAgent) => {
    if (!profile) return;
    setProcessing(property.id);

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile.id,
        })
        .eq('id', property.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: property.agent_id,
        title: 'Listing Approved!',
        message: `Your property "${property.title}" has been approved and is now visible to students.`,
        type: 'success',
      });

      toast({ title: 'Listing approved!' });
      mutate('all-pending-properties');
      mutate('admin-stats');
      setSelectedProperty(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (property: PropertyWithAgent) => {
    if (!profile) return;
    setProcessing(property.id);

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          status: 'rejected',
        })
        .eq('id', property.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: property.agent_id,
        title: 'Listing Rejected',
        message: feedback || `Your property "${property.title}" was rejected. Please review and resubmit.`,
        type: 'error',
      });

      toast({ title: 'Listing rejected' });
      mutate('all-pending-properties');
      mutate('admin-stats');
      setSelectedProperty(null);
      setFeedback('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const formatPrice = (price: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/admin/dashboard">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Pending Listings</h1>
            <p className="text-muted-foreground">Review and approve property listings</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pendingProperties && pendingProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingProperties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img 
                    src={property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'} 
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-3 left-3 bg-warning text-warning-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Review
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{property.title}</h3>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
                    <MapPin className="h-4 w-4" />
                    {property.city}, {property.state}
                  </div>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <span className="flex items-center gap-1">
                      <Bed className="h-4 w-4" /> {property.bedrooms}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="h-4 w-4" /> {property.bathrooms}
                    </span>
                  </div>
                  <p className="font-bold text-lg text-primary mb-3">
                    {formatPrice(property.price, property.currency)}/year
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    by {property.agent?.full_name}
                  </p>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full"
                        onClick={() => {
                          setSelectedProperty(property);
                          setCurrentImage(0);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review Listing
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Review: {property.title}</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-6 py-4">
                        {/* Image Gallery */}
                        {property.images && property.images.length > 0 && (
                          <div>
                            <div className="aspect-video rounded-lg overflow-hidden mb-2">
                              <img 
                                src={property.images[currentImage]} 
                                alt={`Property ${currentImage + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {property.images.map((img, i) => (
                                <button
                                  key={i}
                                  onClick={() => setCurrentImage(i)}
                                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                                    i === currentImage ? 'border-primary' : 'border-transparent'
                                  }`}
                                >
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Price</p>
                            <p className="font-bold text-xl text-primary">
                              {formatPrice(property.price, property.currency)}/year
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Agent</p>
                            <p className="font-medium">{property.agent?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{property.agent?.email}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Address</p>
                          <p className="font-medium">{property.address}, {property.city}, {property.state}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <Bed className="h-5 w-5 text-muted-foreground" />
                            <span>{property.bedrooms} Bedrooms</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Bath className="h-5 w-5 text-muted-foreground" />
                            <span>{property.bathrooms} Bathrooms</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Description</p>
                          <p>{property.description}</p>
                        </div>

                        {property.amenities && property.amenities.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Amenities</p>
                            <div className="flex flex-wrap gap-2">
                              {property.amenities.map((amenity, i) => (
                                <Badge key={i} variant="secondary">{amenity}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Feedback (optional)</p>
                          <Textarea
                            placeholder="Enter feedback if rejecting or requesting changes..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                          />
                        </div>

                        <div className="flex gap-3">
                          <Button 
                            className="flex-1" 
                            onClick={() => handleApprove(property)}
                            disabled={processing === property.id}
                          >
                            {processing === property.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve Listing
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="flex-1"
                            onClick={() => handleReject(property)}
                            disabled={processing === property.id}
                          >
                            {processing === property.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-accent mb-4" />
              <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending property listings at the moment.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}