import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PanicAlertRequest {
  userId: string;
  userName: string;
  userEmail: string;
  message?: string;
  location?: string;
  tier?: number; // Which tier to notify (1, 2, or 3). Defaults to 1.
  alertId?: string; // For tracking escalation
}

interface TrustedContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tier: number;
  notify_on_high_threat: boolean;
}

async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("Twilio credentials not configured, skipping SMS");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: twilioPhoneNumber,
        Body: body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio API error:", errorText);
      return { success: false, error: errorText };
    }

    console.log(`SMS sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { success: false, error: String(error) };
  }
}

async function sendEmailAlert(
  contact: TrustedContact,
  userName: string,
  userEmail: string,
  timestamp: string,
  message?: string,
  location?: string,
  tierInfo?: string
) {
  console.log(`Sending email alert to: ${contact.email}`);
  return resend.emails.send({
    from: "GuardianNet AI <onboarding@resend.dev>",
    to: [contact.email!],
    subject: "🚨 URGENT: Safety Alert from GuardianNet AI",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY SAFETY ALERT</h1>
          ${tierInfo ? `<p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${tierInfo}</p>` : ''}
        </div>
        <div style="background-color: #fef2f2; padding: 20px; border: 1px solid #fecaca;">
          <p style="font-size: 16px; color: #991b1b; margin: 0 0 15px 0;">
            <strong>${userName || "A GuardianNet user"}</strong> has activated their panic button and may need immediate assistance.
          </p>
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Time:</strong> ${timestamp}</p>
            <p style="margin: 5px 0;"><strong>Contact Email:</strong> ${userEmail}</p>
            ${location ? `<p style="margin: 5px 0;"><strong>📍 Location:</strong> <a href="${location}" style="color: #2563eb; text-decoration: underline;">View on Google Maps</a></p>` : ""}
            ${message ? `<p style="margin: 5px 0;"><strong>Message:</strong> ${message}</p>` : ""}
          </div>
          <div style="background-color: #fef9c3; padding: 15px; border-radius: 8px; border: 1px solid #fde047;">
            <p style="margin: 0; color: #854d0e; font-weight: bold;">What to do:</p>
            <ul style="color: #854d0e; margin: 10px 0; padding-left: 20px;">
              <li>Try to contact ${userName || "them"} immediately</li>
              ${location ? `<li>Check their location: <a href="${location}" style="color: #854d0e;">Open Map</a></li>` : ""}
              <li>If you cannot reach them, consider contacting local authorities</li>
              <li>South Africa Emergency: 10111</li>
              <li>GBV Hotline: 0800 150 150</li>
            </ul>
          </div>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            This alert was sent by GuardianNet AI - Protecting digital safety across Africa
          </p>
        </div>
      </div>
    `,
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Panic alert function called");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, userName, userEmail, message, location, tier = 1, alertId }: PanicAlertRequest = await req.json();
    
    console.log(`Processing panic alert for user: ${userId}, tier: ${tier}`);

    // Fetch trusted contacts for the user filtered by tier
    const { data: contacts, error: contactsError } = await supabase
      .from("trusted_contacts")
      .select("*")
      .eq("user_id", userId)
      .eq("notify_on_high_threat", true)
      .eq("tier", tier)
      .order("created_at", { ascending: true });

    if (contactsError) {
      console.error("Error fetching contacts:", contactsError);
      throw new Error("Failed to fetch trusted contacts");
    }

    // Check if there are any contacts in any tier
    const { data: allContacts, error: allContactsError } = await supabase
      .from("trusted_contacts")
      .select("tier")
      .eq("user_id", userId)
      .eq("notify_on_high_threat", true);

    if (allContactsError) {
      console.error("Error fetching all contacts:", allContactsError);
    }

    const hasContactsInAnyTier = allContacts && allContacts.length > 0;
    const nextTiersAvailable = allContacts?.some(c => c.tier > tier) || false;

    if (!contacts || contacts.length === 0) {
      console.log(`No trusted contacts found for tier ${tier}`);
      
      // If this is tier 1 and no contacts at all, return error
      if (tier === 1 && !hasContactsInAnyTier) {
        return new Response(
          JSON.stringify({ success: false, message: "No trusted contacts configured" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      // Otherwise, this tier is just empty - return info about escalation
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No contacts in tier ${tier}`,
          tier,
          nextTiersAvailable,
          emailSuccessCount: 0,
          smsSuccessCount: 0
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${contacts.length} trusted contacts in tier ${tier}`);

    const timestamp = new Date().toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "full",
      timeStyle: "short",
    });

    const tierLabels: Record<number, string> = {
      1: "Immediate Priority Alert",
      2: "Escalated Alert (Tier 2) - No response from primary contacts",
      3: "Critical Escalation (Tier 3) - No response from primary/secondary contacts"
    };

    const tierInfo = tier > 1 ? tierLabels[tier] : undefined;

    // Send email to each contact with an email address
    const emailPromises = contacts
      .filter((contact: TrustedContact) => contact.email)
      .map((contact: TrustedContact) => 
        sendEmailAlert(contact, userName, userEmail, timestamp, message, location, tierInfo)
      );

    // Send SMS to each contact with a phone number
    const tierPrefix = tier > 1 ? `[ESCALATED - Tier ${tier}] ` : "";
    const smsMessage = `${tierPrefix}🚨 EMERGENCY ALERT from GuardianNet AI!\n\n${userName || "A user"} needs help!\n\nTime: ${timestamp}${message ? `\nMessage: ${message}` : ""}${location ? `\n\n📍 Location: ${location}` : ""}\n\nEmergency: 10111 | GBV: 0800 150 150`;

    const smsPromises = contacts
      .filter((contact: TrustedContact) => contact.phone)
      .map((contact: TrustedContact) => {
        console.log(`Sending SMS alert to: ${contact.phone}`);
        return sendSMS(contact.phone!, smsMessage);
      });

    const [emailResults, smsResults] = await Promise.all([
      Promise.allSettled(emailPromises),
      Promise.allSettled(smsPromises),
    ]);

    const emailSuccessCount = emailResults.filter((r) => r.status === "fulfilled").length;
    const emailFailedCount = emailResults.filter((r) => r.status === "rejected").length;
    const smsSuccessCount = smsResults.filter((r) => r.status === "fulfilled" && (r.value as any)?.success).length;
    const smsFailedCount = smsResults.length - smsSuccessCount;

    console.log(`Tier ${tier} - Emails sent: ${emailSuccessCount} success, ${emailFailedCount} failed`);
    console.log(`Tier ${tier} - SMS sent: ${smsSuccessCount} success, ${smsFailedCount} failed`);

    // Log failed sends
    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to send email to contact ${index}:`, result.reason);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Tier ${tier} alert sent to ${emailSuccessCount + smsSuccessCount} contacts`,
        tier,
        nextTiersAvailable,
        emailSuccessCount,
        emailFailedCount,
        smsSuccessCount,
        smsFailedCount,
        alertId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in panic alert function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
