import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings,
  Euro,
  Bell,
  FileText,
  Home,
  Building2,
  Calendar,
  Users,
  Package,
  QrCode,
  Gift
} from 'lucide-react';
import AppLogo from './AppLogo';
import AdminPricingPromos from '../pages/AdminPricingPromos';
import NotificationCenter from './NotificationCenter';
import ReportsCenter from './ReportsCenter';
import AdminSettings from '../pages/AdminSettings';
import ControlCenter from './ControlCenter';

interface AdminDashboardProps {
  onBackToMain: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToMain }) => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    {
      id: 'overview',
      title: 'Panel Principal',
      icon: Home,
      description: 'Vista general del sistema'
    },
    {
      id: 'control',
      title: 'Centro de Control',
      icon: Building2,
      description: 'Gestión de centros, horarios y personal'
    },
    {
      id: 'pricing',
      title: 'Precios y Promos',
      icon: Euro,
      description: 'Gestión de precios y promociones'
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      icon: Bell,
      description: 'Centro de notificaciones y alertas'
    },
    {
      id: 'reports',
      title: 'Reportes',
      icon: FileText,
      description: 'Informes y análisis'
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: Settings,
      description: 'Configuración del sistema'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.slice(1).map((section) => {
                const Icon = section.icon;
                return (
                  <Card key={section.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-primary" />
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {section.description}
                      </p>
                      <Button 
                        onClick={() => setActiveSection(section.id)}
                        className="w-full"
                      >
                        Acceder
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      case 'control':
        return <ControlCenter />;
      case 'pricing':
        return <AdminPricingPromos />;
      case 'notifications':
        return <NotificationCenter />;
      case 'reports':
        return <ReportsCenter />;
      case 'settings':
        return <AdminSettings />;
      default:
        return null;
    }
  };

  const currentSection = sections.find(s => s.id === activeSection);
  const CurrentIcon = currentSection?.icon || Home;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AppLogo className="h-8 w-auto" />
              <div className="hidden sm:block h-6 w-px bg-border" />
              <h1 className="hidden sm:block text-lg font-semibold">Administración</h1>
            </div>
            <Button 
              variant="outline" 
              onClick={onBackToMain}
              className="flex items-center gap-2"
            >
              ← Volver al Panel Principal
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 space-y-2">
            <div className="bg-white rounded-lg border p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <Button
                    key={section.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full justify-start gap-3 ${isActive ? '' : 'text-muted-foreground'}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{section.title}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <CurrentIcon className="h-5 w-5" />
                  {currentSection?.title}
                </CardTitle>
                {currentSection?.description && (
                  <p className="text-sm text-muted-foreground">
                    {currentSection.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {renderContent()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;