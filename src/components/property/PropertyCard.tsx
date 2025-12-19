import { Link } from 'react-router-dom';
import { Heart, MapPin, Bed, Bath, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Property } from '@/types/database';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
  isSaved?: boolean;
  onSave?: (id: string) => void;
}

export function PropertyCard({ property, isSaved = false, onSave }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: property.currency || 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const imageUrl = property.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=60';

  return (
    <Card className="group overflow-hidden border-0 shadow-card hover:shadow-card-hover transition-all duration-300">
      <div className="relative">
        <Link to={`/property/${property.id}`}>
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={imageUrl}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        </Link>
        
        {/* Save Button */}
        {onSave && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={(e) => {
              e.preventDefault();
              onSave(property.id);
            }}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isSaved ? "fill-destructive text-destructive" : "text-muted-foreground"
              )}
            />
          </Button>
        )}

        {/* Price Badge */}
        <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-1.5">
          <span className="font-bold text-foreground">{formatPrice(property.price)}</span>
          <span className="text-sm text-muted-foreground">/year</span>
        </div>
      </div>

      <CardContent className="p-4">
        <Link to={`/property/${property.id}`}>
          <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
        </Link>

        <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="line-clamp-1">{property.address}, {property.city}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{property.bedrooms} bed</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{property.bathrooms} bath</span>
            </div>
          </div>

          {property.agent && (
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-accent">Verified</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
