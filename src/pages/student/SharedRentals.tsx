import { Link } from 'react-router-dom';
import { Users, ArrowLeft, Search, MapPin, Bed, Bath } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/layout/Navbar';

export default function SharedRentals() {
  // Demo data for shared rental spaces
  const sharedSpaces = [
    {
      id: 1,
      title: "Shared 3-Bedroom Apartment near UNILAG",
      location: "Akoka, Lagos",
      price: 150000,
      roomsAvailable: 2,
      totalRooms: 3,
      amenities: ["WiFi", "Kitchen", "Security"],
      currentTenants: 1,
    },
    {
      id: 2,
      title: "Student Housing - Room Available",
      location: "Ife, Osun State",
      price: 80000,
      roomsAvailable: 1,
      totalRooms: 4,
      amenities: ["Water", "Electricity", "Study Area"],
      currentTenants: 3,
    },
    {
      id: 3,
      title: "Shared Flat for Female Students",
      location: "Nsukka, Enugu",
      price: 100000,
      roomsAvailable: 2,
      totalRooms: 2,
      amenities: ["Furnished", "Security", "Generator"],
      currentTenants: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Shared Rental Spaces</h1>
            <p className="text-muted-foreground">Find roommates and share accommodation costs</p>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-background rounded-2xl border p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search by location or university..." 
                className="pl-10"
              />
            </div>
            <Button>Search</Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Share & Save</h3>
              <p className="text-sm text-muted-foreground">
                Sharing accommodation can reduce your rent by up to 50%! Connect with verified students 
                looking for roommates near your university.
              </p>
            </div>
          </div>
        </div>

        {/* Shared Spaces Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sharedSpaces.map((space) => (
            <Card key={space.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-40 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <Users className="h-16 w-16 text-primary/40" />
              </div>
              <CardContent className="p-5">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{space.title}</h3>
                
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>{space.location}</span>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Bed className="h-4 w-4 text-primary" />
                    <span>{space.roomsAvailable} room(s) available</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {space.amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <span className="text-lg font-bold text-primary">₦{space.price.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                  <Button size="sm">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center bg-background rounded-2xl border p-8">
          <h3 className="text-xl font-semibold mb-2">Looking for a roommate?</h3>
          <p className="text-muted-foreground mb-6">
            Post your listing and connect with students looking to share accommodation.
          </p>
          <Button>Post a Shared Space</Button>
        </div>
      </div>
    </div>
  );
}
