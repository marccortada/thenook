import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: 'admin' | 'employee' | 'client';
  created_at: string;
  updated_at: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!mounted) return;

        if (error && error.code === 'PGRST116') {
          // Si no encuentra el perfil, creamos uno básico
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser && mounted) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert([{
                user_id: userId,
                email: currentUser.email || '',
                role: 'admin' // Temporal para testing
              }])
              .select()
              .single();
            
            if (newProfile && mounted) {
              setProfile(newProfile);
            }
          }
        } else if (data && mounted) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    // Solo configurar el listener una vez
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        setSession(session);
        setLoading(false);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isEmployee = profile?.role === 'employee';
  const isClient = profile?.role === 'client';

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    isAdmin,
    isEmployee,
    isClient,
    isAuthenticated: !!user,
  };
};