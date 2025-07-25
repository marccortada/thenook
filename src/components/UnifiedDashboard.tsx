import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Users,
  Activity,
  Settings,
  Send,
  Plus,
  Clock
} from 'lucide-react';

// Import existing components
import NotificationCenter from './NotificationCenter';
import ReportsCenter from './ReportsCenter';
import AdvancedReports from './AdvancedReports';
import IntelligentAnalytics from './IntelligentAnalytics';
import AdvancedScheduleManagement from './AdvancedScheduleManagement';
import AdvancedCRM from './AdvancedCRM';

const UnifiedDashboard = () => {
  const [activeSection, setActiveSection] = useState('schedule');

  const sections = [
    {
      id: 'schedule',
      title: 'Gestión de Horarios',
      description: 'Turnos, ausencias y disponibilidad del personal',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      components: [
        { id: 'management', title: 'Gestión Avanzada', component: AdvancedScheduleManagement },
      ]
    },
    {
      id: 'notifications',
      title: 'Centro de Notificaciones',
      description: 'Gestiona notificaciones automáticas y comunicaciones',
      icon: Bell,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      components: [
        { id: 'automation', title: 'Automatización', component: NotificationCenter },
      ]
    },
    {
      id: 'reports',
      title: 'Centro de Reportes',
      description: 'Genera y analiza reportes de negocio',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      components: [
        { id: 'basic', title: 'Reportes Básicos', component: ReportsCenter },
        { id: 'advanced', title: 'Reportes Avanzados', component: AdvancedReports },
      ]
    },
    {
      id: 'crm',
      title: 'CRM Avanzado',
      description: 'Gestión completa de relaciones con clientes',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      components: [
        { id: 'profiles', title: 'Perfiles y Fidelización', component: AdvancedCRM },
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics Inteligente',
      description: 'Análisis avanzado con IA',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      components: [
        { id: 'intelligent', title: 'Análisis IA', component: IntelligentAnalytics },
      ]
    }
  ];

  const currentSection = sections.find(s => s.id === activeSection) || sections[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <Card 
                key={section.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isActive ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${section.bgColor}`}>
                      <Icon className={`h-5 w-5 ${section.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-1 flex-wrap">
                    {section.components.map((comp) => (
                      <Badge key={comp.id} variant="outline" className="text-xs">
                        {comp.title}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {currentSection && (
        <Card>
          <CardContent className="pt-6">
            {currentSection.components.length > 1 ? (
              <Tabs defaultValue={currentSection.components[0].id} className="w-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${currentSection.components.length}, 1fr)` }}>
                  {currentSection.components.map((comp) => (
                    <TabsTrigger key={comp.id} value={comp.id}>
                      {comp.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {currentSection.components.map((comp) => {
                  const Component = comp.component;
                  return (
                    <TabsContent key={comp.id} value={comp.id} className="mt-6">
                      <Component />
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : (
              <div className="mt-4">
                {React.createElement(currentSection.components[0].component)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UnifiedDashboard;