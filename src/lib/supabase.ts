import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors when env vars aren't available
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      // Return a mock client during build time
      // This will be replaced with the real client at runtime
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

// Export as a getter to ensure lazy initialization
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof ReturnType<typeof createClient>];
  }
});

