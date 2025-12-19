import { PropertyCard } from './PropertyCard';
import { Property } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

interface PropertyGridProps {
  properties: Property[];
  isLoading?: boolean;
  savedProperties?: string[];
  onSave?: (id: string) => void;
}

export function PropertyGrid({ properties, isLoading, savedProperties = [], onSave }: PropertyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] rounded-lg" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🏠</div>
        <h3 className="text-xl font-semibold mb-2">No properties found</h3>
        <p className="text-muted-foreground">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isSaved={savedProperties.includes(property.id)}
          onSave={onSave}
        />
      ))}
    </div>
  );
}
