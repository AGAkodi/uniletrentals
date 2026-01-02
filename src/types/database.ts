export type UserRole = 'student' | 'agent' | 'admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type ListingStatus = 'pending' | 'approved' | 'rejected';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  student_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentVerification {
  id: string;
  user_id: string;
  company_name: string | null;
  government_id_url: string | null;
  proof_of_ownership_url: string | null;
  office_address: string | null;
  passport_photo_url: string | null;
  agent_id: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  agent_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  address: string;
  city: string;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  whatsapp_number: string | null;
  status: ListingStatus;
  views_count: number;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  agent?: Profile;
  agent_verification?: AgentVerification;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property?: Property;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  search_query: Record<string, unknown>;
  name: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  property_id: string;
  agent_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  property?: Property;
  agent?: Profile;
  user?: Profile;
}

export interface Review {
  id: string;
  user_id: string;
  agent_id: string;
  property_id: string | null;
  rating: number;
  comment: string | null;
  is_moderated: boolean;
  created_at: string;
  updated_at: string;
  user?: Profile;
  agent?: Profile;
  property?: Property;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_agent_id: string | null;
  reported_property_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author_id: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface SearchFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
}

export type GenderPreference = 'male' | 'female' | 'any';

export interface SharedRental {
  id: string;
  property_id: string;
  host_student_id: string;
  gender_preference: GenderPreference;
  total_rent: number;
  rent_split: number;
  description: string | null;
  move_in_date: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  property?: Property;
  host_student?: Profile;
}

export interface SharedRentalInterest {
  id: string;
  shared_rental_id: string;
  interested_student_id: string;
  created_at: string;
  interested_student?: Profile;
}
