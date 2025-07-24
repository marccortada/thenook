import { useState } from 'react';

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
  // Mock admin user for panel access
  const mockAdmin = {
    id: 'admin',
    email: 'admin@thenookmadrid.com',
    user_metadata: { first_name: 'Admin', last_name: 'Panel' }
  };

  const mockProfile = {
    id: 'admin-profile',
    user_id: 'admin',
    email: 'admin@thenookmadrid.com',
    first_name: 'Admin',
    last_name: 'Panel',
    phone: null,
    role: 'admin' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const signOut = async () => {
    // No-op for mock implementation
  };

  return {
    user: mockAdmin,
    session: { user: mockAdmin },
    profile: mockProfile,
    loading: false,
    signOut,
    isAdmin: true,
    isEmployee: false,
    isClient: false,
    isAuthenticated: true,
  };
};