import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: {
        getItem: (key: string) => {
          try {
            const item = localStorage.getItem(key);
            return item;
          } catch (error) {
            console.error('Error getting item from storage:', error);
            return null;
          }
        },
        setItem: (key: string, value: string) => {
          try {
            localStorage.setItem(key, value);
          } catch (error) {
            console.error('Error setting item in storage:', error);
          }
        },
        removeItem: (key: string) => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            console.error('Error removing item from storage:', error);
          }
        }
      },
      storageKey: 'cocolive-auth-token',
      debug: false
    }
  }
);

// Les fonctions de session sont maintenant gérées par le sessionWatchdog
// Voir src/lib/sessionWatchdog.ts et src/lib/supabaseWrapper.ts