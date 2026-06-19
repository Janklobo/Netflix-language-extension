import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const GOOGLE_TRANSLATE_API_KEY = Deno.env.get('GOOGLE_TRANSLATE_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a client that uses the caller's JWT for auth verification.
    // This lets Supabase Auth validate the token server-side, supporting
    // both legacy HS256 and the newer ECC P-256 asymmetric signing keys.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text, sourceLang, targetLang } = (await req.json()) as {
      text: string;
      sourceLang: string;
      targetLang: string;
    };

    if (!text || !sourceLang || !targetLang) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Google Cloud Translation API v2
    const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;
    const translateResp = await fetch(translateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!translateResp.ok) {
      const errText = await translateResp.text();
      console.error('Google Translate error:', errText);
      return new Response(JSON.stringify({ error: 'Translation service error' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const translateData = (await translateResp.json()) as {
      data: { translations: Array<{ translatedText: string }> };
    };

    const translatedText = translateData.data.translations[0]?.translatedText ?? '';

    return new Response(JSON.stringify({ translatedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
