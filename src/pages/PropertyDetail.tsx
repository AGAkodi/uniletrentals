import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  MapPin, Bed, Bath, Heart, Share2, Flag, CheckCircle, 
  Star, MessageCircle, Calendar, ChevronLeft, ChevronRight, ExternalLink
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProperty } from '@/hooks/useProperties';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading } = useProperty(id || '');
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [currentImage, setCurrentImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: property?.currency || 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleWhatsApp = () => {
    if (!property?.whatsapp_number) return;
    const phone = property.whatsapp_number.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi! I found your listing "${property.title}" on UNILET and I'm interested in learning more.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const handleMaps = () => {
    if (!property?.latitude || !property?.longitude) return;
    window.open(`https://www.google.com/maps?q=${property.latitude},${property.longitude}`, '_blank');
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Please login', description: 'You need to be logged in to save properties.', variant: 'destructive' });
      return;
    }
    
    if (isSaved) {
      await supabase.from('saved_properties').delete().eq('user_id', user.id).eq('property_id', property?.id);
      setIsSaved(false);
      toast({ title: 'Removed', description: 'Property removed from saved list.' });
    } else {
      await supabase.from('saved_properties').insert({ user_id: user.id, property_id: property?.id });
      setIsSaved(true);
      toast({ title: 'Saved!', description: 'Property added to your saved list.' });
    }
  };

  const images = property?.images?.length ? property.images : [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=60'
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="w-full h-[400px] rounded-xl mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Property Not Found</h1>
          <p className="text-muted-foreground mb-6">The property you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link to="/search">Browse Properties</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/search">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Search
          </Link>
        </Button>

        {/* Image Gallery */}
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <div className="aspect-[16/9] md:aspect-[21/9]">
            <img
              src={images[currentImage]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
          
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`h-2 w-2 rounded-full transition-colors ${i === currentImage ? 'bg-background' : 'bg-background/50'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button size="icon" variant="secondary" onClick={handleSave}>
              <Heart className={`h-5 w-5 ${isSaved ? 'fill-destructive text-destructive' : ''}`} />
            </Button>
            <Button size="icon" variant="secondary">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="secondary">
              <Flag className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title & Price */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="status-approved">Available</span>
                <span className="verified-badge">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{property.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="h-5 w-5" />
                <span>{property.address}, {property.city}{property.state ? `, ${property.state}` : ''}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{formatPrice(property.price)}</span>
                <span className="text-muted-foreground">/year</span>
              </div>
            </div>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>Property Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bed className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{property.bedrooms}</p>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bath className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{property.bathrooms}</p>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                    </div>
                  </div>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-secondary text-sm">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {property.description || 'No description available for this property.'}
                </p>
              </CardContent>
            </Card>

            {/* Map */}
            {property.latitude && property.longitude && (
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="aspect-video rounded-lg bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={handleMaps}
                  >
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Click to open in Google Maps</p>
                      <Button variant="link" className="mt-2">
                        View on Map <ExternalLink className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Contact Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={property.agent?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {property.agent?.full_name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{property.agent?.full_name || 'Agent'}</p>
                    <div className="flex items-center gap-1 text-sm text-accent">
                      <CheckCircle className="h-4 w-4" />
                      <span>Verified Agent</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-warning text-warning" />
                  ))}
                  <span className="text-sm text-muted-foreground">(5.0)</span>
                </div>

                <Button 
                  variant="whatsapp" 
                  className="w-full" 
                  size="lg"
                  onClick={handleWhatsApp}
                  disabled={!property.whatsapp_number}
                >
                  <MessageCircle className="h-5 w-5" />
                  Contact on WhatsApp
                </Button>

                <Button variant="outline" className="w-full" size="lg">
                  <Calendar className="h-5 w-5" />
                  Book Inspection
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
