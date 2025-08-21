import React from 'react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import ProtectedRoute from '@/components/ProtectedRoute';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import NotificationCenter from '@/components/NotificationCenter';
import NotificationDashboard from '@/components/NotificationDashboard';
import NotificationAutomation from '@/components/NotificationAutomation';

const NotificationDashboardPage = () => {
  const { user, loading } = useSimpleAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Centro de Notificaciones - The Nook Madrid
            </h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="automation">Automatización</TabsTrigger>
              <TabsTrigger value="center">Centro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="space-y-6">
              <NotificationDashboard />
            </TabsContent>
            
            <TabsContent value="automation" className="space-y-6">
              <NotificationAutomation />
            </TabsContent>
            
            <TabsContent value="center" className="space-y-6">
              <NotificationCenter />
            </TabsContent>
          </Tabs>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default NotificationDashboardPage;