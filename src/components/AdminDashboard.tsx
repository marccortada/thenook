
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Bell, 
  FileText, 
  BarChart3,
  Calendar,
  Users,
  Package,
  Gift,
  Percent,
  Euro,
  Home
} from 'lucide-react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import Analytics from '@/components/Analytics';
import ReservationSystem from '@/components/ReservationSystem';
import ClientManagement from '@/components/ClientManagement';
import GiftCardManagement from '@/components/GiftCardManagement';
import PackageManagement from '@/components/PackageManagement';
import InternalCodesManagement from '@/components/InternalCodesManagement';
import HappyHourManagement from '@/components/HappyHourManagement';
import AdminPricingPromos from '@/pages/AdminPricingPromos';
import NotificationDashboard from '@/components/NotificationDashboard';
import ReportsCenter from '@/components/ReportsCenter';
import AdminSettings from '@/pages/AdminSettings';

interface SidebarItemProps {
  icon: React.ComponentType<any>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, isActive, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg
      ${isActive 
        ? 'bg-primary text-primary-foreground' 
        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      }
    `}
  >
    <Icon className="h-5 w-5" />
    <span className="font-medium">{label}</span>
    {badge && badge > 0 && (
      <Badge variant="destructive" className="ml-auto">
        {badge}
      </Badge>
    )}
  </button>
);

// Componente unificado para Bonos y Tarjetas Regalo
const BonusAndGiftCards = () => {
  const [activeTab, setActiveTab] = useState<'packages' | 'giftcards'>('packages');
  
  return (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <Button 
          variant={activeTab === 'packages' ? 'default' : 'outline'}
          onClick={() => setActiveTab('packages')}
        >
          <Package className="mr-2 h-4 w-4" />
          Bonos y Paquetes
        </Button>
        <Button 
          variant={activeTab === 'giftcards' ? 'default' : 'outline'}
          onClick={() => setActiveTab('giftcards')}
        >
          <Gift className="mr-2 h-4 w-4" />
          Tarjetas Regalo
        </Button>
      </div>
      
      {activeTab === 'packages' ? <PackageManagement /> : <GiftCardManagement />}
    </div>
  );
};

// Componente unificado para Códigos y Promociones
const CodesAndPromotions = () => {
  const [activeTab, setActiveTab] = useState<'codes' | 'promotions'>('codes');
  
  return (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <Button 
          variant={activeTab === 'codes' ? 'default' : 'outline'}
          onClick={() => setActiveTab('codes')}
        >
          <Percent className="mr-2 h-4 w-4" />
          Códigos Promocionales
        </Button>
        <Button 
          variant={activeTab === 'promotions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('promotions')}
        >
          <Percent className="mr-2 h-4 w-4" />
          Happy Hours
        </Button>
      </div>
      
      {activeTab === 'codes' ? <InternalCodesManagement /> : <HappyHourManagement />}
    </div>
  );
};

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('analytics');
  const { user } = useSimpleAuth();

  const sidebarItems = [
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: BarChart3,
      component: Analytics 
    },
    { 
      id: 'reservas', 
      label: 'Reservas', 
      icon: Calendar,
      component: ReservationSystem 
    },
    { 
      id: 'clientes', 
      label: 'Clientes', 
      icon: Users,
      component: ClientManagement 
    },
    { 
      id: 'bonos-tarjetas', 
      label: 'Bonos y Tarjetas Regalo', 
      icon: Gift,
      component: BonusAndGiftCards 
    },
    { 
      id: 'codigos-promociones', 
      label: 'Códigos y Promociones', 
      icon: Percent,
      component: CodesAndPromotions 
    },
    { 
      id: 'precios-promociones', 
      label: 'Gestión de Precios y Promociones', 
      icon: Euro,
      component: AdminPricingPromos 
    },
    { 
      id: 'notificaciones', 
      label: 'Centro de Notificaciones', 
      icon: Bell,
      component: NotificationDashboard 
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FileText,
      component: ReportsCenter 
    },
    { 
      id: 'configuracion', 
      label: 'Configuración del Sistema', 
      icon: Settings,
      component: AdminSettings 
    }
  ];

  const ActiveComponent = sidebarItems.find(item => item.id === activeSection)?.component || Analytics;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-primary">Panel de Admin</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.name}
          </p>
        </div>
        
        <nav className="p-4 space-y-2">
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeSection === item.id}
              onClick={() => setActiveSection(item.id)}
            />
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
