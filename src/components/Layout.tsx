import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Home, Settings, Users } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Layout = ({ children, activeTab = "home", onTabChange }: LayoutProps) => {
  const navItems = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "reservations", label: "Reservas", icon: Calendar },
    { id: "employees", label: "Empleados", icon: Users },
    { id: "settings", label: "Configuración", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary">The Nook</h1>
              <span className="text-sm text-muted-foreground">Sistema de Reservas</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className="flex items-center space-x-2 rounded-none"
                  onClick={() => onTabChange?.(item.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;