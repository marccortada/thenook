import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  name: string;
}

export const useSimpleAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for user data
    const userData = localStorage.getItem('nook_user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('nook_user');
      }
    }
    setLoading(false);
  }, []);

  const signOut = () => {
    localStorage.removeItem('nook_user');
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