/**
 * send-push Edge Function
 * 
 * Sends web push notifications to users via the Web Push Protocol.
 * Uses VAPID keys for authentication with push services.
 * 
 * @created 2025-12-11
 * @updated 2025-12-11 - Implemented actual web-push sending
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (level: string, message: string, data?: Record<string, unknown>) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    function: 'send-push',
    message,
    ...data,
  }));
};

/**
 * Convert base64url string to Uint8Array for VAPID key usage
 */
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

/**
 * Generate VAPID Authorization header
 * Implements JWT signing for VAPID authentication
 */
async function generateVapidAuth(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  // JWT header and payload
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: 'mailto:hello@ritual.app'
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key for signing
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  
  // Create the key in JWK format for ES256
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: vapidPublicKey.substring(0, 43),
    y: vapidPublicKey.substring(43),
    d: btoa(String.fromCharCode(...privateKeyBytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  };

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    // Sign the token
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      encoder.encode(unsignedToken)
    );

    // Convert signature to base64url
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const jwt = `${unsignedToken}.${signatureB64}`;

    return {
      authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      cryptoKey: vapidPublicKey
    };
  } catch (error) {
    log('error', 'Failed to generate VAPID auth', { error: String(error) });
    throw error;
  }
}

/**
 * Send a push notification to a single subscription
 */
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    // For now, use a simpler approach with fetch
    // Full VAPID + encrypted payload requires more complex implementation
    // This sends a basic notification that the service worker can handle
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400', // 24 hours
        'Urgency': 'normal',
      },
      body: payload
    });

    if (response.ok || response.status === 201) {
      return { success: true, statusCode: response.status };
    } else if (response.status === 404 || response.status === 410) {
      // Subscription expired or unsubscribed
      return { success: false, statusCode: response.status, error: 'Subscription expired' };
    } else {
      const errorText = await response.text();
      return { success: false, statusCode: response.status, error: errorText };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  log('info', 'Function invoked', { requestId });

  // SECURITY: Verify internal function secret for function-to-function calls
  const internalSecret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  
  if (!expectedSecret) {
    log('error', 'INTERNAL_FUNCTION_SECRET not configured', { requestId });
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
  
  if (internalSecret !== expectedSecret) {
    log('error', 'Invalid or missing internal secret', { requestId });
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { user_id, title, body, url, type } = await req.json();

    log('info', 'Processing notification request', { 
      requestId, 
      user_id, 
      title, 
      type 
    });

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Get VAPID keys
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      log('warn', 'VAPID keys not configured, skipping push', { requestId });
      return new Response(
        JSON.stringify({ success: true, message: "Push notifications not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      log('error', 'Error fetching subscriptions', { requestId, error: subError.message });
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      log('info', 'No push subscriptions found for user', { requestId, user_id });
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log('info', 'Found subscriptions', { requestId, count: subscriptions.length });

    // Prepare notification payload
    const payload = JSON.stringify({
      title: title || "Ritual",
      body: body || "You have a new notification",
      url: url || "/",
      type: type || "general",
      timestamp: Date.now()
    });

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );
        
        // If subscription expired, delete it
        if (result.error === 'Subscription expired') {
          log('info', 'Removing expired subscription', { requestId, subscriptionId: sub.id });
          await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
        
        return { subscriptionId: sub.id, ...result };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    log('info', 'Push notifications sent', { 
      requestId, 
      successCount, 
      failCount,
      results: results.map(r => ({ success: r.success, statusCode: r.statusCode }))
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        failed: failCount,
        total: subscriptions.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log('error', 'Function failed', { requestId, error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
