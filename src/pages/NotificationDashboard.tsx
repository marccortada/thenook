import React from 'react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
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
      <Layout>
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
      </Layout>
    </ProtectedRoute>
  );
};

export default NotificationDashboardPage;