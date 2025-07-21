import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Calendar, Settings, Menu, Home, BarChart3, Bell, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import ChatBot from "@/components/ChatBot";
import NotificationCenter from "@/components/NotificationCenter";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, profile, signOut, isAdmin, isAuthenticated } = useAuth();
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
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || "?";
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email || "Usuario";
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
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  The Nook Madrid
                </span>
              </Button>
              
              {/* Menú de navegación principal */}
              {isAuthenticated && (
                <>
                  {isMobile ? (
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Menu className="h-4 w-4 mr-2" />
                          Menú
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-64">
                        <div className="flex flex-col space-y-4 mt-8">
                          <Button 
                            variant="ghost" 
                            className="justify-start" 
                            onClick={() => {
                              navigate("/");
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Home className="mr-2 h-4 w-4" />
                            <span>Inicio</span>
                          </Button>
                          {isAdmin() && (
                            <>
                              <Button 
                                variant="ghost" 
                                className="justify-start"
                                onClick={() => {
                                  navigate("/reports");
                                  setMobileMenuOpen(false);
                                }}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Centro de Reportes</span>
                              </Button>
                              <Button 
                                variant="ghost" 
                                className="justify-start"
                                onClick={() => {
                                  navigate("/notifications");
                                  setMobileMenuOpen(false);
                                }}
                              >
                                <Bell className="mr-2 h-4 w-4" />
                                <span>Notificaciones</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Menu className="h-4 w-4 mr-2" />
                          Menú
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48">
                        <DropdownMenuItem onClick={() => navigate("/")}>
                          <Home className="mr-2 h-4 w-4" />
                          <span>Inicio</span>
                        </DropdownMenuItem>
                        {isAdmin() && (
                          <>
                            <DropdownMenuItem onClick={() => navigate("/reports")}>
                              <FileText className="mr-2 h-4 w-4" />
                              <span>Centro de Reportes</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate("/notifications")}>
                              <Bell className="mr-2 h-4 w-4" />
                              <span>Notificaciones</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated && <NotificationCenter />}
              {isAuthenticated ? (
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
                        {profile?.role && (
                          <div className="pt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {profile.role === 'admin' ? 'Administrador' : 
                               profile.role === 'employee' ? 'Empleado' : 'Cliente'}
                            </span>
                          </div>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>Mis reservas</span>
                    </DropdownMenuItem>
                    {isAdmin() && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/reports")}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Centro de Reportes</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/notifications")}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Notificaciones</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="default"
                  onClick={() => navigate("/auth")}
                  className="flex items-center space-x-2"
                >
                  <User className="h-4 w-4" />
                  <span>Iniciar sesión</span>
                </Button>
              )}
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