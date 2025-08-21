import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sessionWatchdog, useSessionWatchdog } from '../lib/sessionWatchdog';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  lastActivity: number;
  sessionReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profile: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: any) => Promise<void>;
  initialize: () => Promise<void>;
  updateActivity: () => void;
  checkSessionValidity: () => Promise<boolean>;
  setSessionReady: (ready: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      lastActivity: Date.now(),
      sessionReady: false,

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },

      setSessionReady: (ready: boolean) => {
        set({ sessionReady: ready });
      },

      checkSessionValidity: async () => {
        if (!isSupabaseConfigured) {
          set({ sessionReady: false });
          return false;
        }

        const currentState = get();
        if (currentState.sessionReady && sessionWatchdog.isSessionReady()) {
          return true;
        }

        const isReady = await sessionWatchdog.checkAndRefreshSession();
        set({ sessionReady: isReady });
        return isReady;
      },

  signIn: async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase n\'est pas configuré. Vérifiez vos variables d\'environnement.');
    }

    set({ isLoading: true, sessionReady: false });

    console.log('🔐 Starting sign in process...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error);
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('✅ User signed in successfully:', data.user.id);
        
        // Récupérer le profil utilisateur
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          profile: profile || {
            first_name: '',
            last_name: '',
            phone: '',
            address: '',
            city: '',
            postal_code: '',
            country: '',
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };

        set({ user, lastActivity: Date.now(), sessionReady: true });
        console.log('💾 User data saved to store');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string, profileData: any) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase n\'est pas configuré. Vérifiez vos variables d\'environnement.');
    }

    set({ isLoading: true, sessionReady: false });

    console.log('📝 Starting sign up process...');
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            phone: profileData.phone,
          }
        }
      });

      if (error) {
        console.error('❌ Sign up error:', error);
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('✅ User signed up successfully:', data.user.id);
        
        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          profile: {
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            phone: profileData.phone,
            address: '',
            city: '',
            postal_code: '',
            country: 'France',
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };

        set({ user, lastActivity: Date.now(), sessionReady: true });
        console.log('💾 New user data saved to store');
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    console.log('👋 Starting sign out process...');
    
    set({ sessionReady: false });
    
    if (!isSupabaseConfigured) {
      set({ user: null, lastActivity: 0, sessionReady: false });
      console.log('💾 Local state cleared (Supabase not configured)');
      return;
    }

    try {
      await supabase.auth.signOut();
      console.log('✅ Supabase sign out successful');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Session from session_id claim in JWT does not exist')) {
        console.info('Session already expired or invalid during signOut - this is expected');
      } else {
        console.warn('Error during signOut:', error);
        throw error;
      }
    }
    
    set({ user: null, lastActivity: 0, sessionReady: false });
    
    try {
      localStorage.removeItem('cocolive-auth-token');
      localStorage.removeItem('supabase.auth.token');
      console.log('🧹 Auth tokens cleared from localStorage');
    } catch (error) {
      console.warn('⚠️ Error clearing localStorage:', error);
    }
  },

  updateProfile: async (profileData: any) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase n\'est pas configuré. Vérifiez vos variables d\'environnement.');
    }

    // Attendre que la session soit prête
    const sessionReady = await sessionWatchdog.waitForSession();
    if (!sessionReady) {
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    const { user } = get();
    if (!user) {
      throw new Error('No user logged in');
    }

    set({ isLoading: true });

    console.log('📝 Updating user profile...');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Profile update error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Profile updated successfully');
      
      // Mettre à jour l'état local
      set({
        user: {
          ...user,
          profile: {
            ...user.profile,
            ...profileData,
            updated_at: new Date().toISOString(),
          },
        },
        lastActivity: Date.now(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  initialize: async () => {
    console.log('🚀 Initializing auth store...');
    
    if (!isSupabaseConfigured) {
      console.warn('Supabase not configured. User will remain logged out.');
      set({ isLoading: false, user: null, sessionReady: false });
      return;
    }

    try {
      set({ isLoading: true });
      
      console.log('🔍 Getting current session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session error during initialization:', error);
        
        if (error.message.includes('refresh_token_not_found')) {
          console.warn('Refresh token not found - user needs to log in again');
        } else if (error.message.includes('invalid') || error.message.includes('expired')) {
          console.log('🔄 Attempting to refresh expired session...');
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('❌ Session refresh failed during init:', refreshError);
          } else if (refreshData.session) {
            console.log('✅ Session refreshed during initialization');
            await get().initialize();
            return;
          }
        } else {
          console.error('Error getting session:', error);
        }
        
        set({ isLoading: false, user: null, sessionReady: false });
        return;
      }

      if (session?.user) {
        console.log('✅ Valid session found for user:', session.user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          profile: profile || {
            first_name: '',
            last_name: '',
            phone: '',
            address: '',
            city: '',
            postal_code: '',
            country: '',
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };

        set({ user, isLoading: false, lastActivity: Date.now(), sessionReady: true });
        console.log('💾 User initialized and saved to store');
      } else {
        console.log('ℹ️ No session found during initialization');
        set({ user: null, isLoading: false, sessionReady: false });
      }

      // Écouter les changements d'authentification
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state change:', event);
        get().updateActivity();
        
        if (event === 'SIGNED_OUT' || !session) {
          console.log('👋 User signed out, clearing state');
          set({ user: null, lastActivity: 0, sessionReady: false });
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed successfully');
          set({ lastActivity: Date.now(), sessionReady: true });
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('👋 User signed in, loading profile');
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
          }

          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            profile: profile || {
              first_name: '',
              last_name: '',
              phone: '',
              address: '',
              city: '',
              postal_code: '',
              country: '',
              is_admin: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

          set({ user, lastActivity: Date.now(), sessionReady: true });
          console.log('💾 User signed in and saved to store');
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ user: null, isLoading: false, sessionReady: false });
    }
  },
    }),
    {
      name: 'cocolive-auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        lastActivity: state.lastActivity 
      }),
      merge: (persistedState: any, currentState: any) => {
        console.log('🔄 Merging persisted auth state...');
        
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours (plus tolérant)
        
        if (persistedState?.lastActivity && (now - persistedState.lastActivity) < maxAge) {
          console.log('✅ Restoring user from persisted state');
          return {
            ...currentState,
            user: persistedState.user,
            lastActivity: persistedState.lastActivity,
            sessionReady: true, // Considérer comme prêt si récent
          };
        } else {
          console.log('⚠️ Persisted state too old, starting fresh');
          return { ...currentState, sessionReady: false };
        }
      },
    }
  )
);