import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // First try to find existing user in auth
    const { data: users } = await supabase.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === "adebayo.okonkwo@unilodge.ng");
    
    let agentId = existingUser?.id;

    if (!agentId) {
      // Create a sample agent user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: "adebayo.okonkwo@unilodge.ng",
        password: "SampleAgent123!",
        email_confirm: true,
        user_metadata: {
          full_name: "Adebayo Okonkwo",
          phone: "+234 803 456 7890",
          role: "agent",
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      agentId = authUser?.user?.id;
    }

    if (!agentId) {
      throw new Error("Could not create or find agent user");
    }

    console.log("Using agent ID:", agentId);
    
    // Ensure profile exists with agent role
    await supabase.from("profiles").upsert({
      id: agentId,
      full_name: "Adebayo Okonkwo",
      email: "adebayo.okonkwo@unilodge.ng",
      phone: "+234 803 456 7890",
      role: "agent",
    });
    
    // Ensure user_roles entry exists
    await supabase.from("user_roles").upsert({
      user_id: agentId,
      role: "agent",
    }, { onConflict: "user_id" });

    // Create agent verification record
    const { error: verifyError } = await supabase.from("agent_verifications").upsert({
      user_id: agentId,
      company_name: "Okonkwo Properties Ltd",
      office_address: "15 Admiralty Way, Lekki Phase 1, Lagos",
      verification_status: "approved",
    }, { onConflict: "user_id" });

    // Insert 5 sample properties
    const properties = [
      {
        agent_id: agentId,
        title: "Modern 3-Bedroom Apartment in Lekki Phase 1",
        description: "Beautifully designed 3-bedroom apartment in a serene environment. Features modern finishes, spacious living areas, and 24/7 security. Perfect for young professionals and families.",
        address: "15 Admiralty Way, Lekki Phase 1",
        city: "Lagos",
        state: "Lagos",
        price: 3500000,
        currency: "NGN",
        bedrooms: 3,
        bathrooms: 3,
        amenities: ["24/7 Security", "Swimming Pool", "Gym", "Parking Space", "Power Backup", "Water Supply", "Fitted Kitchen", "Air Conditioning"],
        images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"],
        status: "approved",
        whatsapp_number: "+234 803 456 7890",
      },
      {
        agent_id: agentId,
        title: "Luxury 4-Bedroom Penthouse on Victoria Island",
        description: "Exquisite penthouse offering panoramic views of the Lagos lagoon. Premium finishes throughout, smart home features, and exclusive amenities. The epitome of luxury living.",
        address: "25 Adeola Odeku Street, Victoria Island",
        city: "Lagos",
        state: "Lagos",
        price: 8500000,
        currency: "NGN",
        bedrooms: 4,
        bathrooms: 4,
        amenities: ["Smart Home", "Rooftop Terrace", "Private Elevator", "24/7 Security", "Concierge", "Gym", "Swimming Pool", "Underground Parking", "Generator", "Borehole"],
        images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"],
        status: "approved",
        whatsapp_number: "+234 803 456 7890",
      },
      {
        agent_id: agentId,
        title: "Spacious 3-Bedroom Terrace Duplex in Asokoro",
        description: "Well-maintained terrace duplex in the prestigious Asokoro district. Close to embassies and government offices. Ideal for diplomats and executives seeking comfort and security.",
        address: "8 Gana Street, Asokoro",
        city: "Abuja",
        state: "FCT",
        price: 4200000,
        currency: "NGN",
        bedrooms: 3,
        bathrooms: 4,
        amenities: ["24/7 Security", "CCTV", "Parking Space", "Generator", "Borehole", "Fitted Kitchen", "Boys Quarter", "Garden"],
        images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"],
        status: "approved",
        whatsapp_number: "+234 803 456 7890",
      },
      {
        agent_id: agentId,
        title: "Executive 5-Bedroom Mansion in Maitama",
        description: "Grand mansion in Abuja's most exclusive neighborhood. Features include a home cinema, wine cellar, staff quarters, and beautifully landscaped gardens. For the discerning tenant.",
        address: "12 Panama Street, Maitama",
        city: "Abuja",
        state: "FCT",
        price: 12000000,
        currency: "NGN",
        bedrooms: 5,
        bathrooms: 6,
        amenities: ["Home Cinema", "Wine Cellar", "Swimming Pool", "Tennis Court", "Staff Quarters", "24/7 Security", "CCTV", "Smart Home", "Landscaped Garden", "Generator", "Borehole", "4-Car Garage"],
        images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800", "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800"],
        status: "approved",
        whatsapp_number: "+234 803 456 7890",
      },
      {
        agent_id: agentId,
        title: "Cozy 2-Bedroom Serviced Apartment in GRA",
        description: "Fully furnished serviced apartment in Port Harcourt's GRA. All utilities included. Perfect for expatriates and business travelers. Flexible lease terms available.",
        address: "5 Ada George Road, GRA Phase 2",
        city: "Port Harcourt",
        state: "Rivers",
        price: 1800000,
        currency: "NGN",
        bedrooms: 2,
        bathrooms: 2,
        amenities: ["Fully Furnished", "All Bills Included", "24/7 Power", "Security", "Cleaning Service", "WiFi", "Air Conditioning", "Parking", "Fitted Kitchen"],
        images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800", "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800"],
        status: "approved",
        whatsapp_number: "+234 803 456 7890",
      },
    ];

    const { data: insertedProperties, error: propertiesError } = await supabase
      .from("properties")
      .insert(properties)
      .select();

    if (propertiesError) {
      throw propertiesError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sample data seeded successfully",
        agent_id: agentId,
        properties_count: insertedProperties?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Seed error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
