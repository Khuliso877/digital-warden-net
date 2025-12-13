import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const { userId, userName, userEmail, message, location }: PanicAlertRequest = await req.json();
    
    console.log(`Processing panic alert for user: ${userId}`);

    // Fetch trusted contacts for the user
    const { data: contacts, error: contactsError } = await supabase
      .from("trusted_contacts")
      .select("*")
      .eq("user_id", userId)
      .eq("notify_on_high_threat", true);

    if (contactsError) {
      console.error("Error fetching contacts:", contactsError);
      throw new Error("Failed to fetch trusted contacts");
    }

    if (!contacts || contacts.length === 0) {
      console.log("No trusted contacts found");
      return new Response(
        JSON.stringify({ success: false, message: "No trusted contacts configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${contacts.length} trusted contacts`);

    const timestamp = new Date().toLocaleString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      dateStyle: "full",
      timeStyle: "short",
    });

    // Send email to each contact with an email address
    const emailPromises = contacts
      .filter((contact) => contact.email)
      .map((contact) => {
        console.log(`Sending alert to: ${contact.email}`);
        return resend.emails.send({
          from: "GuardianNet AI <onboarding@resend.dev>",
          to: [contact.email],
          subject: "🚨 URGENT: Safety Alert from GuardianNet AI",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY SAFETY ALERT</h1>
              </div>
              <div style="background-color: #fef2f2; padding: 20px; border: 1px solid #fecaca;">
                <p style="font-size: 16px; color: #991b1b; margin: 0 0 15px 0;">
                  <strong>${userName || "A GuardianNet user"}</strong> has activated their panic button and may need immediate assistance.
                </p>
                <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p style="margin: 5px 0;"><strong>Time:</strong> ${timestamp}</p>
                  <p style="margin: 5px 0;"><strong>Contact Email:</strong> ${userEmail}</p>
                  ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ""}
                  ${message ? `<p style="margin: 5px 0;"><strong>Message:</strong> ${message}</p>` : ""}
                </div>
                <div style="background-color: #fef9c3; padding: 15px; border-radius: 8px; border: 1px solid #fde047;">
                  <p style="margin: 0; color: #854d0e; font-weight: bold;">What to do:</p>
                  <ul style="color: #854d0e; margin: 10px 0; padding-left: 20px;">
                    <li>Try to contact ${userName || "them"} immediately</li>
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
      });

    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    console.log(`Emails sent: ${successCount} success, ${failedCount} failed`);

    // Log failed sends
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to send to contact ${index}:`, result.reason);
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Alert sent to ${successCount} contacts`,
        successCount,
        failedCount,
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
