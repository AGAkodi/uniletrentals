
import { supabase } from "@/integrations/supabase/client";
import { getAppUrl } from "./redirect";

/**
 * Check if the current user is an admin
 * This ensures only admins can send emails
 */
async function checkAdminAccess(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        return profile?.role === 'admin';
    } catch (error) {
        console.error('Error checking admin access:', error);
        return false;
    }
}

// Helper to get base URL for email links
// Uses production URL for emails (since they're sent from client but should link to production)
function getBaseUrl(): string {
    // For emails, prioritize production URL to ensure links work for all users
    // Check if we have an explicit production URL set
    if (import.meta.env.VITE_PRODUCTION_URL) {
        return import.meta.env.VITE_PRODUCTION_URL;
    }
    
    // Fallback: try to get current app URL, but prefer production
    const currentUrl = getAppUrl();
    if (currentUrl && !currentUrl.includes('localhost') && !currentUrl.includes('127.0.0.1')) {
        return currentUrl;
    }
    
    // Default to production domain
    return 'https://uniletrentals.com';
}

export type EmailType = 'welcome' | 'verification' | 'suspension' | 'report' | 'listing_approved';

export interface EmailPayload {
    to: string;
    name: string;
    type: EmailType;
    role?: string;
    status?: string;
    agentId?: string;
    rejectionReason?: string;
    reason?: string;
    endDate?: string;
    resolution?: string;
    listingTitle?: string;
}

export const sendEmail = async (payload: EmailPayload) => {
    // SECURITY: Only admins can send emails
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
        console.error("Unauthorized: Only admins can send emails");
        return { success: false, error: "Unauthorized: Admin access required" };
    }

    let subject = "";
    let htmlContent = "";

    switch (payload.type) {
        case 'welcome':
            subject = "Welcome to UNILET! 🎉";
            htmlContent = getWelcomeTemplate(payload.name, payload.role);
            break;
        case 'verification':
            if (payload.status === 'approved') {
                subject = "🎉 Verification Successful - Welcome to UNILET!";
                htmlContent = getVerificationApprovedTemplate(payload.name, payload.agentId);
            } else if (payload.status === 'rejected') {
                subject = "Verification Update - Action Required";
                htmlContent = getVerificationRejectedTemplate(payload.name, payload.rejectionReason);
            }
            break;
        case 'suspension':
            if (payload.status === 'suspended') {
                subject = "⚠️ Account Suspended - UNILET";
                htmlContent = getSuspensionTemplate(payload.name, payload.reason, payload.endDate);
            } else if (payload.status === 'lifted') {
                subject = "✅ Account Suspension Lifted - UNILET";
                htmlContent = getSuspensionLiftedTemplate(payload.name);
            }
            break;
        case 'report':
            subject = "Report Resolved - UNILET";
            htmlContent = getReportResolvedTemplate(payload.name, payload.resolution);
            break;
        case 'listing_approved':
            subject = "🏠 Listing Approved - UNILET";
            htmlContent = getListingApprovedTemplate(payload.name, payload.listingTitle);
            break;
        default:
            console.warn(`Unknown email type: ${payload.type}`);
            return { success: false, error: "Unknown email type" };
    }

    if (!subject || !htmlContent) {
        console.warn("Email subject or content is empty");
        return { success: false, error: "Email content not generated" };
    }

    let logEntryId: string | null = null;

    try {
        // 1. Log attempt (optional - don't fail if table doesn't exist)
        try {
            const { data: logEntry, error: logError } = await supabase
                .from('email_logs')
                .insert({
                    recipient: payload.to,
                    subject: subject,
                    template_type: payload.type,
                    status: 'sending',
                    metadata: payload
                })
                .select()
                .single();

            if (!logError && logEntry) {
                logEntryId = logEntry.id;
            }
        } catch (logErr) {
            // Email logs table might not exist - that's okay, continue
            console.warn("Could not log email attempt:", logErr);
        }

        // 2. Send via Supabase Edge Function (server-side to avoid CORS)
        const fromEmail = import.meta.env.VITE_RESEND_FROM_EMAIL || "UNILET <onboarding@resend.dev>";
        const functionName = import.meta.env.VITE_EDGE_FUNCTION_NAME || 'super-function';
        
        console.log('Sending email via Supabase Edge Function...', { to: payload.to, subject, functionName });

        // Get current user ID (already verified as admin in checkAdminAccess)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Not authenticated');
        }

        // Call Edge Function with API key (bypasses Supabase JWT validation)
        const apiKey = import.meta.env.VITE_EMAIL_API_KEY;
        
        if (!apiKey) {
            throw new Error('VITE_EMAIL_API_KEY not set in environment variables');
        }
        
        console.log('Using API key:', apiKey ? '***' + apiKey.slice(-4) : 'NOT SET');
        
        // Use fetch directly to avoid Supabase's JWT validation
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
        
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
                from: fromEmail,
                to: payload.to,
                subject: subject,
                html: htmlContent,
                userId: user.id,
                apiKey: apiKey
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data || !data.id) {
            throw new Error('Failed to send email - no response from email service');
        }

        console.log('Email sent successfully:', data.id);

        // 3. Update log success (optional)
        if (logEntryId) {
            try {
                await supabase
                    .from('email_logs')
                    .update({ status: 'sent' })
                    .eq('id', logEntryId);
            } catch (updateErr) {
                console.warn("Could not update email log:", updateErr);
            }
        }

        return { success: true, data };

    } catch (error: any) {
        console.error("Error sending email:", error);

        // Update log error (optional)
        if (logEntryId) {
            try {
                await supabase
                    .from('email_logs')
                    .update({ 
                        status: 'failed',
                        error_message: error.message 
                    })
                    .eq('id', logEntryId);
            } catch (updateErr) {
                console.warn("Could not update email log with error:", updateErr);
            }
        }

        return { success: false, error: error.message || "Failed to send email" };
    }
};

// --- Templates ---

function getBaseHtml(content: string, title: string, color: string = '#10b981') {
    return `
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="utf-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
   </head>
   <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
     <div style="background: ${color}; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
       <h1 style="color: white; margin: 0; font-size: 28px;">${title}</h1>
     </div>
     <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
       ${content}
       <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
         Thank you for choosing UNILET.
       </p>
     </div>
     <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
       This email was sent by UNILET. Please do not reply to this email.
     </p>
   </body>
   </html>
 `;
}

function getWelcomeTemplate(name: string, role?: string) {
    const isAgent = role === 'agent';
    const color = '#3b82f6';
    const title = "Welcome to UNILET!";
    const baseUrl = getBaseUrl();

    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>Welcome to UNILET! We're thrilled to have you join our community.</p>
   
   ${isAgent ? `
   <p>As a verified agent, you'll be able to:</p>
   <ul style="padding-left: 20px;">
     <li style="margin-bottom: 10px;">🏠 List and manage properties</li>
     <li style="margin-bottom: 10px;">🤝 Connect with students</li>
     <li style="margin-bottom: 10px;">📈 Track your business growth</li>
   </ul>
   <div style="text-align: center; margin-top: 30px;">
     <a href="${baseUrl}/agent/dashboard" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Go to Dashboard</a>
   </div>
   ` : `
   <p>You can now:</p>
   <ul style="padding-left: 20px;">
     <li style="margin-bottom: 10px;">🔍 Search for your perfect accommodation</li>
     <li style="margin-bottom: 10px;">❤️ Save your favorite listings</li>
     <li style="margin-bottom: 10px;">💬 Contact agents directly</li>
   </ul>
   <div style="text-align: center; margin-top: 30px;">
     <a href="${baseUrl}/student/dashboard" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Start Exploring</a>
   </div>
   `}
 `;
    return getBaseHtml(content, title, color);
}

function getVerificationApprovedTemplate(name: string, agentId?: string) {
    const color = '#10b981';
    const title = "Verification Approved!";
    const baseUrl = getBaseUrl();
    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>Great news! Your agent verification has been approved. You are now a verified agent on UNILET.</p>
   
   <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; text-align: center;">
     <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Agent ID</p>
     <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: ${color}; font-family: monospace;">${agentId || 'N/A'}</p>
   </div>
   
   <div style="text-align: center; margin-top: 30px;">
     <a href="${baseUrl}/agent" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Go to Dashboard</a>
   </div>
 `;
    return getBaseHtml(content, title, color);
}

function getVerificationRejectedTemplate(name: string, reason?: string) {
    const color = '#ef4444';
    const title = "Verification Update";
    const baseUrl = getBaseUrl();
    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>Unfortunately, your agent verification could not be approved at this time.</p>
   
   <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid ${color}; margin: 20px 0;">
     <p style="margin: 0; font-weight: 600; color: #991b1b;">Reason for Rejection:</p>
     <p style="margin: 10px 0 0 0; color: #7f1d1d;">${reason || 'Please upload clearer documents.'}</p>
   </div>
   
   <div style="text-align: center; margin-top: 30px;">
     <a href="${baseUrl}/agent/verification" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Resubmit Documents</a>
   </div>
 `;
    return getBaseHtml(content, title, color);
}

function getSuspensionTemplate(name: string, reason?: string, endDate?: string) {
    const color = '#ef4444';
    const title = "Account Suspended";
    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>Your agent account has been suspended.</p>
   
   <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid ${color}; margin: 20px 0;">
     <p style="margin: 0; font-weight: 600; color: #991b1b;">Reason:</p>
     <p style="margin: 10px 0 0 0; color: #7f1d1d;">${reason || 'Violation of terms of service.'}</p>
     ${endDate ? `<p style="margin: 10px 0 0 0; color: #7f1d1d; font-weight: 600;">Suspended until: ${endDate === 'Invalid Date' ? 'Indefinitely' : new Date(endDate).toLocaleDateString()}</p>` : ''}
   </div>
   
   <p>If you believe this is a mistake, please contact support.</p>
 `;
    return getBaseHtml(content, title, color);
}

function getSuspensionLiftedTemplate(name: string) {
    const color = '#10b981';
    const title = "Suspension Lifted";
    const baseUrl = getBaseUrl();
    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>Good news! Your account suspension has been lifted.</p>
   <p>You now have full access to your agent dashboard and listings.</p>
   
   <div style="text-align: center; margin-top: 30px;">
     <a href="${baseUrl}/agent" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Go to Dashboard</a>
   </div>
 `;
    return getBaseHtml(content, title, color);
}

function getReportResolvedTemplate(name: string, resolution?: string) {
    const color = '#3b82f6';
    const title = "Report Resolved";
    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>We are writing to let you know that your report has been reviewed and resolved.</p>
   
   <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid ${color}; margin: 20px 0;">
     <p style="margin: 0; font-weight: 600; color: #1e40af;">Resolution Details:</p>
     <p style="margin: 10px 0 0 0; color: #1e3a8a;">${resolution || 'The issue has been addressed.'}</p>
   </div>
   
   <p>Thank you for helping keep the UNILET community safe.</p>
 `;
    return getBaseHtml(content, title, color);
}

function getListingApprovedTemplate(name: string, listingTitle?: string) {
    const color = '#10b981';
    const title = "Listing Approved! 🏠";
    const baseUrl = getBaseUrl();
    const content = `
     <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
     <p>Congratulations! Your listing <strong>${listingTitle || 'Properties'}</strong> has been approved and is now live on UNILET.</p>
     
     <p>Students can now view your property and contact you for bookings.</p>
     
     <div style="text-align: center; margin-top: 30px;">
       <a href="${baseUrl}/agent/listings" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Manage Listings</a>
     </div>
   `;
    return getBaseHtml(content, title, color);
}
