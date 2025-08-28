
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Bell, 
  FileText, 
  TrendingUp,
  Calendar,
  Users,
  Package,
  Euro,
  ChevronLeft,
  Home
} from 'lucide-react';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import ControlCenter from '@/components/ControlCenter';
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

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('control');
  const { user } = useSimpleAuth();

  const sidebarItems = [
    { 
      id: 'control', 
      label: 'Centro de Control', 
      icon: Home,
      component: ControlCenter 
    },
    { 
      id: 'pricing', 
      label: 'Precios y Promos', 
      icon: TrendingUp,
      component: AdminPricingPromos 
    },
    { 
      id: 'notifications', 
      label: 'Notificaciones', 
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
      id: 'settings', 
      label: 'Configuración', 
      icon: Settings,
      component: AdminSettings 
    }
  ];

  const ActiveComponent = sidebarItems.find(item => item.id === activeSection)?.component || ControlCenter;

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
