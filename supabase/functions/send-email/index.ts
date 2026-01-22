import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  from: string;
  to: string;
  subject: string;
  html: string;
  userId: string;  // Required: user ID
  apiKey: string;  // Required: secret API key to bypass Supabase auth
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body FIRST
    const requestBody: EmailRequest = await req.json();
    console.log("Request body received:", { 
      hasUserId: !!requestBody.userId, 
      hasApiKey: !!requestBody.apiKey,
      hasFrom: !!requestBody.from,
      hasTo: !!requestBody.to 
    });

    // Verify API key (bypasses Supabase JWT validation)
    const expectedApiKey = Deno.env.get("EMAIL_API_KEY");
    console.log("API key check:", {
      hasExpectedKey: !!expectedApiKey,
      hasRequestKey: !!requestBody.apiKey,
      keysMatch: requestBody.apiKey === expectedApiKey
    });
    
    if (!expectedApiKey) {
      console.error("EMAIL_API_KEY not set in Edge Function secrets");
      return new Response(
        JSON.stringify({ error: "Server configuration error: API key not set" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (!requestBody.apiKey || requestBody.apiKey !== expectedApiKey) {
      console.error("Invalid API key provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid API key" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get Supabase configuration
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase config:", { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get userId from request body (required - passed from client)
    const userId: string | null = requestBody.userId || null;

    // If userId not in body, return error (we require it to be passed)
    if (!userId) {
      console.error("No userId provided in request body");
      return new Response(
        JSON.stringify({ error: "User ID is required in request body" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use service role to get user details and check admin status
    // Service role bypasses all auth checks
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user by ID using admin API (no JWT validation needed)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: `User not found: ${userError?.message || "Unknown error"}` }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const user = userData.user;

    // Check if user is admin (use service role to bypass RLS)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get Resend API key
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resend = new Resend(resendApiKey);
    // Request body already parsed above
    const { from, to, subject, html } = requestBody;

    if (!from || !to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required email fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending email to ${to} with subject: ${subject}`);

    const emailResponse = await resend.emails.send({
      from: from,
      to: [to],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
