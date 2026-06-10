import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// SMS provider configuration — set these in Supabase Dashboard > Edge Functions > send-otp > Env Vars
const SMS_PROVIDER = Deno.env.get('SMS_PROVIDER') || 'twilio';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
const TWILIO_FROM = Deno.env.get('TWILIO_FROM') || '';
const SMSA_API_KEY = Deno.env.get('SMSA_API_KEY') || '';
const SMSA_SENDER = Deno.env.get('SMSA_SENDER') || '';
const UNIFONIC_API_KEY = Deno.env.get('UNIFONIC_API_KEY') || '';
const UNIFONIC_SENDER = Deno.env.get('UNIFONIC_SENDER') || '';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendViaTwilio(phone: string, code: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const body = new URLSearchParams({
    To: phone,
    From: TWILIO_FROM,
    Body: `رمز التحقق الخاص بك في أسواق ثراء الشرق ون هو: ${code}`,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error: ${text}`);
  }
}

async function sendViaSMSA(phone: string, code: string): Promise<void> {
  const res = await fetch('https://api.smsa.net/api/sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SMSA_API_KEY}` },
    body: JSON.stringify({
      mobile: phone,
      message: `رمز التحقق الخاص بك في أسواق ثراء الشرق ون هو: ${code}`,
      sender: SMSA_SENDER || 'Thara',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SMSA error: ${text}`);
  }
}

async function sendViaUnifonic(phone: string, code: string): Promise<void> {
  const res = await fetch('https://api.unifonic.com/rest/Messages/Send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      AppSid: UNIFONIC_API_KEY,
      Recipient: phone,
      Body: `رمز التحقق الخاص بك في أسواق ثراء الشرق ون هو: ${code}`,
      Sender: UNIFONIC_SENDER || 'Thara',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Unifonic error: ${text}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const { phone } = await req.json();
    if (!phone) {
      return new Response(JSON.stringify({ error: 'رقم الجوال مطلوب' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const code = generateCode();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Store OTP with 5-minute expiry
    const { error: dbError } = await supabase.from('otp_codes').upsert({
      phone,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      verified: false,
    }, { onConflict: 'phone' });
    if (dbError) throw dbError;

    // Send SMS via configured provider
    switch (SMS_PROVIDER) {
      case 'twilio':
        await sendViaTwilio(phone, code);
        break;
      case 'smsa':
        await sendViaSMSA(phone, code);
        break;
      case 'unifonic':
        await sendViaUnifonic(phone, code);
        break;
      default:
        throw new Error(`Unknown SMS provider: ${SMS_PROVIDER}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
