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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // Si no encuentra el perfil, creamos uno básico
        if (error.code === 'PGRST116') {
          // Obtener email del usuario actual
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{
              user_id: userId,
              email: currentUser?.email || '',
              role: 'client'
            }])
            .select()
            .single();
          
          if (!createError) {
            setProfile(newProfile);
          }
        }
        return;
      }

      setProfile(data);
      console.log('Profile loaded:', data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

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