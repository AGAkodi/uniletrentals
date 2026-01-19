import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import {
  Home, ImagePlus, MapPin, Bed, Bath, DollarSign,
  X, Plus, ChevronLeft, Loader2, AlertTriangle, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import useSWR from 'swr';

const AMENITIES_OPTIONS = [
  'WiFi', 'Air Conditioning', 'Parking', 'Security', 'Water Supply',
  'Electricity (24/7)', 'Generator', 'Furnished', 'Kitchen', 'Bathroom',
  'Wardrobe', 'Study Desk', 'Balcony', 'Laundry', 'CCTV'
];

const propertySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
  price: z.number().min(1000, 'Price must be at least ₦1,000'),
  address: z.string().min(10, 'Please provide a complete address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  bedrooms: z.number().min(0).max(10),
  bathrooms: z.number().min(0).max(10),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

interface VerificationData {
  verification_status: 'pending' | 'approved' | 'rejected';
  agent_id: string | null;
}

export default function AddProperty() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    address: '',
    city: '',
    state: '',
    bedrooms: 1,
    bathrooms: 1,
    latitude: '',
    longitude: '',
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check verification status
  const { data: verification, isLoading: verificationLoading } = useSWR<VerificationData | null>(
    profile?.id ? `agent-verification-check-${profile.id}` : null,
    async () => {
      const { data } = await supabase
        .from('agent_verifications')
        .select('verification_status, agent_id')
        .eq('user_id', profile!.id)
        .maybeSingle();
      return data as VerificationData | null;
    }
  );

  const isVerified = verification?.verification_status === 'approved';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNumberChange = (name: string, value: number) => {
    setFormData({ ...formData, [name]: value });
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      toast({ title: 'Maximum 10 images allowed', variant: 'destructive' });
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Only image files are allowed', variant: 'destructive' });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Image must be less than 5MB', variant: 'destructive' });
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!profile) {
      toast({ title: 'Please sign in to add a property', variant: 'destructive' });
      return;
    }

    // Double check verification status
    if (!isVerified) {
      toast({
        title: 'Account not verified',
        description: 'You need to be verified before adding properties.',
        variant: 'destructive'
      });
      return;
    }

    const validationData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
    };

    const result = propertySchema.safeParse(validationData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (images.length === 0) {
      toast({ title: 'Please upload at least one image', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Upload images first
      const imageUrls = await uploadImages();

      // Create property - auto-approve for verified agents
      const { error } = await supabase.from('properties').insert({
        agent_id: profile.id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        address: formData.address,
        city: formData.city,
        state: formData.state,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        amenities: selectedAmenities,
        images: imageUrls,
        whatsapp_number: profile.phone,
        status: 'approved', // Auto-approve for verified agents
        approved_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Property listed successfully!',
        description: 'Your listing is now live and visible to students.'
      });
      navigate('/agent/dashboard');
    } catch (error: any) {
      toast({
        title: 'Failed to create property',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (verificationLoading) {
    return (
      <div className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show verification required message if not verified
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Navbar />

        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/agent/dashboard')}
            className="mb-6"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card className="border-warning bg-warning/5">
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Account Pending Verification</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You need to complete the verification process before you can add property listings.
                This helps us maintain trust and prevent fraudulent listings.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to="/agent/verification">
                    <Shield className="h-5 w-5 mr-2" />
                    Complete Verification
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/agent/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/agent/dashboard')}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Home className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Add New Property</h1>
            <p className="text-muted-foreground">Fill in the details to list your property</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Property Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Spacious 2-Bedroom Apartment Near UNILAG"
                  value={formData.title}
                  onChange={handleChange}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe your property in detail..."
                  value={formData.description}
                  onChange={handleChange}
                  className="min-h-[120px]"
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₦/year)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₦</span>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="250000"
                      value={formData.price}
                      onChange={handleChange}
                      className="pl-8"
                    />
                  </div>
                  {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleNumberChange('bedrooms', Math.max(0, formData.bedrooms - 1))}
                    >
                      -
                    </Button>
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 bg-secondary rounded-lg">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">{formData.bedrooms}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleNumberChange('bedrooms', Math.min(10, formData.bedrooms + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bathrooms</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleNumberChange('bathrooms', Math.max(0, formData.bathrooms - 1))}
                    >
                      -
                    </Button>
                    <div className="flex-1 flex items-center justify-center gap-2 py-2 bg-secondary rounded-lg">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">{formData.bathrooms}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleNumberChange('bathrooms', Math.min(10, formData.bathrooms + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Full Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="123 University Road, Near Main Gate"
                  value={formData.address}
                  onChange={handleChange}
                />
                {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Lagos"
                    value={formData.city}
                    onChange={handleChange}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    placeholder="Lagos State"
                    value={formData.state}
                    onChange={handleChange}
                  />
                  {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude (optional)</Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    type="number"
                    step="any"
                    placeholder="6.5244"
                    value={formData.latitude}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get from Google Maps: Right-click → "What's here?"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude (optional)</Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    type="number"
                    step="any"
                    placeholder="3.3792"
                    value={formData.longitude}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {AMENITIES_OPTIONS.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedAmenities.includes(amenity)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5" />
                Property Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 h-8 w-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {images.length < 10 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Add Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Upload up to 10 images. First image will be the cover photo.
              </p>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading & Creating...
              </>
            ) : (
              'Submit Property for Approval'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
