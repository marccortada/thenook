import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'employee' | 'client';
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  last_login: string;
}

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔐 useSupabaseAuth: Inicializando auth listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state change:', { event, hasSession: !!session, userId: session?.user?.id });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('🔐 Usuario detectado, fetching profile...');
          // Defer profile fetch to avoid auth deadlock
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
          }, 0);
        } else {
          console.log('🔐 No hay usuario, limpiando profile');
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    console.log('🔐 Checking existing session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 Existing session:', { hasSession: !!session, userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('🔐 Fetching profile for user:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('🔐 Profile query result:', { data, error });

      if (error) {
        console.error('🔐 Error fetching profile:', error);
        return;
      }

      setProfile(data);
      console.log('🔐 Profile set:', data);
    } catch (error) {
      console.error('🔐 Error fetching profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting sign in for:', email);
    
    // TEMPORAL: Usar el sistema anterior mientras debuggeamos
    try {
      // Buscar el perfil del usuario por email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      console.log('🔐 Profile lookup:', { profile, profileError });

      if (profileError || !profile) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar contraseña (hardcodeadas por ahora)
      let isValidPassword = false;
      if (email === 'admin@thenookmadrid.com' && password === 'Gnerai123') {
        isValidPassword = true;
      } else if (email === 'work@thenookmadrid.com' && password === 'worker1234') {
        isValidPassword = true;
      }

      if (!isValidPassword) {
        throw new Error('Contraseña incorrecta');
      }

      // Verificar que sea admin o employee
      if (profile.role !== 'admin' && profile.role !== 'employee') {
        throw new Error('No tienes permisos para acceder al panel de gestión');
      }

      // Simular sesión exitosa
      setProfile(profile);
      setUser({ id: profile.id, email: profile.email } as any);
      setSession({ user: { id: profile.id, email: profile.email } } as any);

      console.log('🔐 Manual sign in successful');

      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente.",
      });

      return { data: { user: profile }, error: null };
    } catch (error: any) {
      console.error('🔐 Sign in error:', error);
      toast({
        title: "Error de autenticación",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    console.log('🔐 Signing out...');
    try {
      setUser(null);
      setSession(null);
      setProfile(null);

      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente.",
      });

      window.location.href = '/admin-login';
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al cerrar sesión",
        variant: "destructive",
      });
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isEmployee = profile?.role === 'employee';
  const isAuthenticated = !!profile && (profile.role === 'admin' || profile.role === 'employee');

  console.log('🔐 Current auth state:', { 
    hasUser: !!user, 
    hasProfile: !!profile, 
    isAuthenticated, 
    role: profile?.role,
    loading 
  });

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    isAdmin,
    isEmployee,
    isAuthenticated,
  };
};