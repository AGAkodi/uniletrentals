
import { supabase } from "@/integrations/supabase/client";

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

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
    if (!RESEND_API_KEY) {
        console.error("VITE_RESEND_API_KEY is missing");
        return { success: false, error: "Missing API Key" };
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
    }

    try {
        // 1. Log attempt
        const { data: logEntry } = await supabase
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

        // 2. Send via Resend REST API
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: "UNILET Support <support@uniletrentals.com>",
                to: [payload.to],
                subject: subject,
                html: htmlContent
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send email');
        }

        // 3. Update log success
        if (logEntry) {
            await supabase
                .from('email_logs')
                .update({ status: 'sent' })
                .eq('id', logEntry.id);
        }

        return { success: true, data };

    } catch (error: any) {
        console.error("Error sending email:", error);

        // Update log error
        // Note: In a real app we'd keep the log ID in state to update it, 
        // but here we just log to console if initial insert failed or let it stay as 'sending' if update failed.
        // Ideally we would query the logEntry again if we had it.

        return { success: false, error: error.message };
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
     <a href="https://unilet.lovable.app/agent/dashboard" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Go to Dashboard</a>
   </div>
   ` : `
   <p>You can now:</p>
   <ul style="padding-left: 20px;">
     <li style="margin-bottom: 10px;">🔍 Search for your perfect accommodation</li>
     <li style="margin-bottom: 10px;">❤️ Save your favorite listings</li>
     <li style="margin-bottom: 10px;">💬 Contact agents directly</li>
   </ul>
   <div style="text-align: center; margin-top: 30px;">
     <a href="https://unilet.lovable.app/student/dashboard" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Start Exploring</a>
   </div>
   `}
 `;
    return getBaseHtml(content, title, color);
}

function getVerificationApprovedTemplate(name: string, agentId?: string) {
    const color = '#10b981';
    const title = "Verification Approved!";
    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>Great news! Your agent verification has been approved. You are now a verified agent on UNILET.</p>
   
   <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; text-align: center;">
     <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Agent ID</p>
     <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: ${color}; font-family: monospace;">${agentId || 'N/A'}</p>
   </div>
   
   <div style="text-align: center; margin-top: 30px;">
     <a href="https://unilet.lovable.app/agent" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Go to Dashboard</a>
   </div>
 `;
    return getBaseHtml(content, title, color);
}

function getVerificationRejectedTemplate(name: string, reason?: string) {
    const color = '#ef4444';
    const title = "Verification Update";
    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>Unfortunately, your agent verification could not be approved at this time.</p>
   
   <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid ${color}; margin: 20px 0;">
     <p style="margin: 0; font-weight: 600; color: #991b1b;">Reason for Rejection:</p>
     <p style="margin: 10px 0 0 0; color: #7f1d1d;">${reason || 'Please upload clearer documents.'}</p>
   </div>
   
   <div style="text-align: center; margin-top: 30px;">
     <a href="https://unilet.lovable.app/agent/verification" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Resubmit Documents</a>
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
    const content = `
   <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
   <p>Good news! Your account suspension has been lifted.</p>
   <p>You now have full access to your agent dashboard and listings.</p>
   
   <div style="text-align: center; margin-top: 30px;">
     <a href="https://unilet.lovable.app/agent" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Go to Dashboard</a>
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
    const content = `
     <p style="font-size: 18px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
     <p>Congratulations! Your listing <strong>${listingTitle || 'Properties'}</strong> has been approved and is now live on UNILET.</p>
     
     <p>Students can now view your property and contact you for bookings.</p>
     
     <div style="text-align: center; margin-top: 30px;">
       <a href="https://unilet.lovable.app/agent/listings" style="background: ${color}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Manage Listings</a>
     </div>
   `;
    return getBaseHtml(content, title, color);
}
