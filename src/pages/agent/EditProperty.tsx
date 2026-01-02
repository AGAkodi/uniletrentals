import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { 
  Home, ImagePlus, MapPin, Bed, Bath, DollarSign, 
  X, Loader2, ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { AgentLayout } from '@/components/agent/AgentLayout';
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
});

export default function EditProperty() {
  const { id } = useParams<{ id: string }>();
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
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch property data
  const { data: property, isLoading } = useSWR(
    id ? `property-edit-${id}` : null,
    async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  );

  // Populate form when property loads
  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title,
        description: property.description || '',
        price: property.price.toString(),
        address: property.address,
        city: property.city,
        state: property.state || '',
        bedrooms: property.bedrooms || 1,
        bathrooms: property.bathrooms || 1,
        latitude: property.latitude?.toString() || '',
        longitude: property.longitude?.toString() || '',
      });
      setSelectedAmenities(property.amenities || []);
      setExistingImages(property.images || []);
    }
  }, [property]);

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
    const totalImages = existingImages.length + newImages.length + files.length;
    
    if (totalImages > 10) {
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

    setNewImages(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of newImages) {
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

    if (!profile || !id) return;

    const validationData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
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

    const totalImages = existingImages.length + newImages.length;
    if (totalImages === 0) {
      toast({ title: 'Please keep at least one image', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // Upload new images
      const newImageUrls = await uploadImages();
      const allImages = [...existingImages, ...newImageUrls];

      // Update property
      const { error } = await supabase
        .from('properties')
        .update({
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
          images: allImages,
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Property updated successfully!' });
      navigate('/agent/listings');
    } catch (error: any) {
      toast({ 
        title: 'Failed to update property', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AgentLayout title="Edit Property">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AgentLayout>
    );
  }

  if (!property) {
    return (
      <AgentLayout title="Edit Property">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Property not found</p>
          <Button onClick={() => navigate('/agent/listings')} className="mt-4">
            Back to Listings
          </Button>
        </div>
      </AgentLayout>
    );
  }

  return (
    <AgentLayout title="Edit Property">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/agent/listings')}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Listings
        </Button>

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
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleChange}
                      className="pl-10"
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
                    value={formData.state}
                    onChange={handleChange}
                  />
                  {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
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
                  <Button
                    key={amenity}
                    type="button"
                    variant={selectedAmenities.includes(amenity) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleAmenity(amenity)}
                  >
                    {amenity}
                  </Button>
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
            <CardContent className="space-y-4">
              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div>
                  <Label className="mb-2 block">Current Images</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {existingImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Property ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images */}
              {newImagePreviews.length > 0 && (
                <div>
                  <Label className="mb-2 block">New Images</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {newImagePreviews.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`New ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <div>
                <input
                  type="file"
                  id="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('images')?.click()}
                  disabled={existingImages.length + newImages.length >= 10}
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Add Images ({existingImages.length + newImages.length}/10)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/agent/listings')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </AgentLayout>
  );
}
