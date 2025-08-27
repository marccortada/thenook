import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Calendar, 
  Bell, 
  Users, 
  Settings,
  Zap,
  Target,
  Brain,
  Euro,
  Package2,
  FileText,
  QrCode,
  Gift,
  ExternalLink
} from 'lucide-react';
import CenterManagement from './CenterManagement';
import AdvancedScheduleManagement from './AdvancedScheduleManagement';
import NotificationCenter from './NotificationCenter';
import EmployeeManagement from './EmployeeManagement';
import AdminPricingPromos from '../pages/AdminPricingPromos';
import AdminSettings from '../pages/AdminSettings';
import ReportsCenter from '../pages/ReportsCenter';
import RedeemCode from '../pages/RedeemCode';
import GiftCardImageGenerator from './GiftCardImageGenerator';
import LogoUpload from './LogoUpload';

const ControlCenter = () => {
  const [activeTab, setActiveTab] = useState('centers');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Centro de Control</h1>
        <p className="text-muted-foreground">
          Gestión centralizada de centros, horarios, personal y automatizaciones inteligentes
        </p>
      </div>

      {/* Intelligence Note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Configuración para IA</h3>
              <p className="text-sm text-blue-700">
                Los turnos, disponibilidad y ausencias configurados aquí serán utilizados por la IA para 
                optimizar las reservas, sugerir horarios disponibles y gestionar automatizaciones inteligentes.
                Una configuración precisa mejora significativamente la eficiencia del sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-9">
          <TabsTrigger value="centers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Centros</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <Euro className="w-4 h-4" />
            <span className="hidden sm:inline">Precios</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Reportes</span>
          </TabsTrigger>
          <TabsTrigger value="giftcards" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span className="hidden sm:inline">Tarjetas</span>
          </TabsTrigger>
          <TabsTrigger value="redeem" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Canjear</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configuración</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="centers" className="space-y-6">
          <CenterManagement />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <AdvancedScheduleManagement />
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
          <EmployeeManagement />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationCenter />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Gestión de Precios y Promociones
                <Button 
                  onClick={() => window.open('/panel-gestion-nook-madrid-2024/precios-promos', '_blank')}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Panel Externo
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Accede al panel completo de gestión de precios y promociones con todas las funcionalidades avanzadas.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Panel Integrado</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Funcionalidades básicas dentro del Centro de Control
                    </p>
                    <AdminPricingPromos />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Panel Completo</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Acceso completo a todas las funcionalidades avanzadas
                    </p>
                    <Button 
                      onClick={() => window.open('/panel-gestion-nook-madrid-2024/precios-promos', '_blank')}
                      className="w-full flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ir al Panel Completo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsCenter />
        </TabsContent>

        <TabsContent value="giftcards" className="space-y-6">
          <GiftCardImageGenerator />
        </TabsContent>

        <TabsContent value="redeem" className="space-y-6">
          <RedeemCode />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <LogoUpload />
          <AdminSettings />
        </TabsContent>
      </Tabs>

      {/* Bottom Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-green-600" />
              Configuración Óptima
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Asegúrate de configurar horarios específicos por centro y empleado para maximizar la precisión de la IA.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              Automatización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Las notificaciones y turnos configurados permiten automatizar recordatorios y optimizar la ocupación.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              Configuración Granular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Cada centro puede tener horarios únicos y personal especializado para servicios específicos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ControlCenter;