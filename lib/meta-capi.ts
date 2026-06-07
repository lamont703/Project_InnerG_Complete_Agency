import crypto from 'crypto';

/**
 * Normalizes and hashes a string using SHA-256 for Meta CAPI.
 * @param str The string to hash
 * @returns The SHA-256 hashed string or undefined if empty
 */
export function hashData(str?: string | null): string | undefined {
  if (!str) return undefined;
  
  // Normalize string: lowercase and trim whitespace
  const normalized = str.toLowerCase().trim();
  
  // Create SHA-256 hash
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Normalizes and hashes a phone number. Meta requires phone numbers
 * to include the country code without any special characters.
 */
export function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  
  // Keep only digits
  let normalized = phone.replace(/\D/g, '');
  
  // Assuming US context (1) if no country code provided and length is 10
  if (normalized.length === 10) {
    normalized = '1' + normalized;
  }
  
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export interface MetaUserData {
  em?: string; // Hashed Email
  ph?: string; // Hashed Phone
  fn?: string; // Hashed First Name
  ln?: string; // Hashed Last Name
  ct?: string; // Hashed City
  st?: string; // Hashed State
  zp?: string; // Hashed Zip
  country?: string; // Hashed Country
  client_ip_address?: string; // Raw IP Address
  client_user_agent?: string; // Raw User Agent
  fbp?: string; // Raw fbp cookie
  fbc?: string; // Raw fbc cookie
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  [key: string]: any;
}

export interface MetaCAPIEventPayload {
  event_name: string;
  event_time?: number;
  event_id?: string;
  event_source_url?: string;
  action_source?: 'email' | 'website' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  user_data: MetaUserData;
  custom_data?: MetaCustomData;
}

/**
 * Sends an event to the Meta Conversions API.
 * @param payload The formatted event payload
 */
export async function sendMetaConversionEvent(payload: MetaCAPIEventPayload) {
  const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1557622362640803';
  const CAPI_TOKEN = process.env.META_CAPI_TOKEN;

  if (!CAPI_TOKEN) {
    console.warn("META_CAPI_TOKEN is missing. Server event will not be sent.");
    return { success: false, error: 'Missing token' };
  }

  const eventTime = payload.event_time || Math.floor(Date.now() / 1000);

  const requestBody = {
    data: [
      {
        event_name: payload.event_name,
        event_time: eventTime,
        action_source: payload.action_source || 'website',
        event_id: payload.event_id,
        event_source_url: payload.event_source_url,
        user_data: payload.user_data,
        custom_data: payload.custom_data || {},
      }
    ],
    // Useful for EMQ reporting as mentioned in the docs
    // partner_agent: "innerg_custom_integration_v1" 
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v25.0/${PIXEL_ID}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CAPI_TOKEN}`
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Meta CAPI Error Response:", data);
      return { success: false, error: data.error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Meta CAPI Request Failed:", err);
    return { success: false, error: err.message };
  }
}
