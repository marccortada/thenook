import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Calendar, Settings, Menu, Home, BarChart3, Bell, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

import ChatBot from "@/components/ChatBot";
import NotificationBell from "@/components/NotificationBell";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, signOut, isAdmin, isAuthenticated } = useSimpleAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (user?.name) {
      const nameParts = user.name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
      }
    }
    return user?.email?.charAt(0).toUpperCase() || "?";
  };

  const getUserDisplayName = () => {
    return user?.name || user?.email || "Usuario";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-xl font-bold hover:bg-transparent"
              >
                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent font-extrabold tracking-tight">
                  The Nook Madrid
                </span>
              </Button>
              
              {/* Menú de navegación principal - Solo para admins */}
              {isAuthenticated && isAdmin && (
                <>
                  {isMobile ? (
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Menu className="h-4 w-4 mr-2" />
                          Centro de Control
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-64">
                        <div className="flex flex-col space-y-4 mt-8">
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Gestión
                          </div>
                          <Button 
                            variant="ghost" 
                            className="justify-start" 
                            onClick={() => {
                              navigate("/panel-gestion-nook-madrid-2024");
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Home className="mr-2 h-4 w-4" />
                            <span>Panel Admin</span>
                          </Button>
                          
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4">
                            Análisis
                          </div>
                          <Button 
                            variant="ghost" 
                            className="justify-start"
                            onClick={() => {
                              navigate("/panel-gestion-nook-madrid-2024/reports");
                              setMobileMenuOpen(false);
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Centro de Reportes</span>
                          </Button>
                          
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4">
                            Comunicación
                          </div>
                          <Button 
                            variant="ghost" 
                            className="justify-start"
                            onClick={() => {
                              navigate("/panel-gestion-nook-madrid-2024/notifications");
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Bell className="mr-2 h-4 w-4" />
                            <span>Notificaciones</span>
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Menu className="h-4 w-4 mr-2" />
                          Centro de Control
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Gestión
                        </div>
                        <DropdownMenuItem onClick={() => navigate("/panel-gestion-nook-madrid-2024")}>
                          <Home className="mr-2 h-4 w-4" />
                          <span>Panel Admin</span>
                        </DropdownMenuItem>
                        
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Análisis
                        </div>
                        <DropdownMenuItem onClick={() => navigate("/panel-gestion-nook-madrid-2024/reports")}>
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Centro de Reportes</span>
                        </DropdownMenuItem>
                        
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Comunicación
                        </div>
                        <DropdownMenuItem onClick={() => navigate("/panel-gestion-nook-madrid-2024/notifications")}>
                          <Bell className="mr-2 h-4 w-4" />
                          <span>Notificaciones</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
              
              {/* Panel de administración accesible vía URL secreta */}
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated && isAdmin && <NotificationBell />}
              {isAuthenticated && isAdmin ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                        <div className="pt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {user?.role === 'admin' ? 'Administrador' : 'Empleado'}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/panel-gestion-nook-madrid-2024")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Panel Admin</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/panel-gestion-nook-madrid-2024/reports")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Centro de Reportes</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/panel-gestion-nook-madrid-2024/notifications")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Notificaciones</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* ChatBot */}
      <ChatBot />
      
    </div>
  );
};

export default Layout;