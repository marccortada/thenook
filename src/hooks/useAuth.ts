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

        if (error) {
          console.error('Error fetching profile:', error);
          if (error.code === 'PGRST116') {
            // Si no encuentra el perfil, creamos uno básico
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{
                  user_id: userId,
                  email: currentUser.email || '',
                  role: 'client'
                }])
                .select()
                .single();
              
              if (!createError && mounted) {
                setProfile(newProfile);
              }
            }
          }
          return;
        }

        if (mounted) {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

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

  const isAdmin = () => profile?.role === 'admin';
  const isEmployee = () => profile?.role === 'employee';
  const isClient = () => profile?.role === 'client';

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