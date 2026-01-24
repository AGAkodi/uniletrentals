import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { sendEmail } from './email';
import { getAuthRedirectUrl, getOAuthCallbackUrl, getEmailRedirectUrl } from './redirect';

// Helper function to get dashboard route based on role
export function getDashboardRoute(role: UserRole | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'agent':
      return '/agent/dashboard';
    case 'student':
    default:
      return '/student/dashboard';
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: Record<string, unknown>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: UserRole }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isRole: (role: UserRole) => boolean;
  refreshProfile: (updatedProfile?: Partial<Profile>) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id, true);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, true);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, isInitialLoad = false) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        if (import.meta.env.DEV && isInitialLoad) {
          console.log('Fetched profile:', data.email, 'role:', data.role);
        }
        setProfile(data as Profile);
      } else if (error) {
        console.error('Error fetching profile:', error);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  const signUp = async (email: string, password: string, metadata: Record<string, unknown>) => {
    // Determine redirect URL based on role
    // Agents should go to verification page after email verification
    // Students should go to complete profile
    const role = metadata.role as string;
    let redirectPath = '/';
    
    if (role === 'agent') {
      redirectPath = '/agent/verification';
    } else if (role === 'student') {
      redirectPath = '/auth/complete-student-profile';
    }
    
    // Automatically uses correct URL for localhost or production
    const redirectUrl = getEmailRedirectUrl(redirectPath);
    
    // Debug logging in development
    if (import.meta.env.DEV) {
      console.log('[Auth] Email redirect URL:', redirectUrl);
      console.log('[Auth] Role:', role, 'Redirect path:', redirectPath);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata,
      },
    });

    // Note: Supabase automatically sends verification email when signUp is called
    // The email contains a link that redirects to emailRedirectTo after verification

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error | null };
    }

    // Fetch the user's profile to get their role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile on login:', profileError);
      }

      console.log('Login successful, user role:', profileData?.role);
      // Fetch fresh profile to get permissions
      if (user.id) {
        await fetchProfile(user.id, false);
      }
      return { error: null, role: profileData?.role as UserRole | undefined };
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    // Automatically uses correct URL for localhost or production
    const redirectUrl = getOAuthCallbackUrl();
    
    // Debug logging in development
    if (import.meta.env.DEV) {
      console.log('[Auth] OAuth redirect URL:', redirectUrl);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const isRole = (role: UserRole) => {
    return profile?.role === role;
  };

  const updateProfile = (updates: Partial<Profile>) => {
    if (profile) {
      setProfile({ ...profile, ...updates } as Profile);
    }
  };

  const refreshProfile = async (updatedProfile?: Partial<Profile>) => {
    // If updated profile data is provided, update immediately (optimistic update)
    if (updatedProfile && profile) {
      setProfile({ ...profile, ...updatedProfile } as Profile);
    }
    
    // Then fetch fresh data from database in the background (non-blocking)
    if (user?.id) {
      // Don't await - let it run in background for better UX
      fetchProfile(user.id, false).catch(err => {
        console.error('Background profile refresh failed:', err);
        // If background refresh fails, we still have the optimistic update
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      isRole,
      refreshProfile,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
