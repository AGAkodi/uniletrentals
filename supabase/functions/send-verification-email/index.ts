import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  name: string;
  status: 'approved' | 'rejected';
  agentId?: string;
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ message: "Email service not configured, notification skipped" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resend = new Resend(resendApiKey);
    const { email, name, status, agentId, rejectionReason }: VerificationEmailRequest = await req.json();

    console.log(`Sending verification email to ${email} with status: ${status}`);

    let subject: string;
    let htmlContent: string;

    if (status === 'approved') {
      subject = "🎉 Verification Successful - Welcome to UNILET!";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Verification Approved!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
            <p>Great news! Your agent verification has been approved. You are now a verified agent on UNILET.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Agent ID</p>
              <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #10b981; font-family: monospace;">${agentId || 'N/A'}</p>
            </div>
            
            <h3 style="color: #1f2937; margin-top: 30px;">What you can do now:</h3>
            <ul style="padding-left: 20px;">
              <li style="margin-bottom: 10px;">📝 Add property listings</li>
              <li style="margin-bottom: 10px;">📅 Manage booking requests</li>
              <li style="margin-bottom: 10px;">💬 Connect with students</li>
              <li style="margin-bottom: 10px;">📊 Track your property views</li>
            </ul>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://unilet.lovable.app/agent" style="background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Go to Dashboard</a>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              Thank you for joining UNILET. We're excited to have you on board!
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            This email was sent by UNILET. Please do not reply to this email.
          </p>
        </body>
        </html>
      `;
    } else {
      subject = "Verification Update - Action Required";
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Verification Update</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
            <p>Unfortunately, your agent verification could not be approved at this time.</p>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; font-weight: 600; color: #92400e;">Reason for Rejection:</p>
              <p style="margin: 10px 0 0 0; color: #78350f;">${rejectionReason || 'Please upload clearer documents and try again.'}</p>
            </div>
            
            <h3 style="color: #1f2937; margin-top: 30px;">What to do next:</h3>
            <ul style="padding-left: 20px;">
              <li style="margin-bottom: 10px;">Review the rejection reason above</li>
              <li style="margin-bottom: 10px;">Prepare clearer or corrected documents</li>
              <li style="margin-bottom: 10px;">Resubmit your verification documents</li>
            </ul>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://unilet.lovable.app/agent/verification" style="background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Resubmit Documents</a>
            </div>
            
            <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
              If you have questions, please contact our support team.
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
            This email was sent by UNILET. Please do not reply to this email.
          </p>
        </body>
        </html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "UNILET <onboarding@resend.dev>",
      to: [email],
      subject: subject,
      html: htmlContent,
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
    console.error("Error in send-verification-email function:", error);
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
