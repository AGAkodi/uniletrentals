import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { useFeaturedProperties } from '@/hooks/useProperties';

export function FeaturedListings() {
  const { data: properties, isLoading } = useFeaturedProperties();

  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2 font-display">Featured Listings</h2>
            <p className="text-muted-foreground leading-relaxed">Handpicked verified properties for students</p>
          </div>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link to="/search">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <PropertyGrid 
          properties={properties || []} 
          isLoading={isLoading} 
        />

        <div className="mt-8 text-center md:hidden">
          <Button variant="outline" asChild>
            <Link to="/search">
              View All Properties
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
