import { useState, useEffect } from 'react';

interface UserSession {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  name: string;
  loginTime: number;
}

export const useSimpleAuth = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión en localStorage
    const checkSession = () => {
      try {
        const sessionData = localStorage.getItem('nook_user_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          
          // Verificar que la sesión no sea muy antigua (24 horas)
          const sessionAge = Date.now() - session.loginTime;
          const maxAge = 24 * 60 * 60 * 1000; // 24 horas
          
          if (sessionAge < maxAge) {
            setUser(session);
          } else {
            // Sesión expirada
            localStorage.removeItem('nook_user_session');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem('nook_user_session');
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const signOut = () => {
    localStorage.removeItem('nook_user_session');
    setUser(null);
    window.location.href = '/admin-login';
  };

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isAuthenticated = !!user;

  return {
    user,
    loading,
    signOut,
    isAdmin,
    isEmployee,
    isAuthenticated,
  };
};