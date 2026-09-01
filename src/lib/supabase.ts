import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://ehvyyaelxvksbvgdocmg.supabase.co';
const FALLBACK_KEY = 'sb_publishable_UchZKolZ04Afw6DIvv_htA_awQveJhV';

function getSafeSupabaseConfig(): { url: string; key: string } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  let validUrl = FALLBACK_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    try {
      const parsed = new URL(envUrl.trim());
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        validUrl = envUrl.trim();
      }
    } catch {
      // Use fallback URL if invalid
    }
  }

  let validKey = FALLBACK_KEY;
  if (typeof envKey === 'string' && envKey.trim().length > 0) {
    validKey = envKey.trim();
  }

  return { url: validUrl, key: validKey };
}

const config = getSafeSupabaseConfig();
export const SUPABASE_URL = config.url;
export const SUPABASE_ANON_KEY = config.key;
export const SUPABASE_PROJECT_ID = 'ehvyyaelxvksbvgdocmg';

let client: SupabaseClient;
try {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} catch (err) {
  console.warn('Failed to initialize Supabase client:', err);
  client = createClient(FALLBACK_URL, FALLBACK_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase = client;

