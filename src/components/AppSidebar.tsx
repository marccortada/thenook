import { 
  Home, 
  Calendar, 
  Gift, 
  CreditCard, 
  Settings, 
  Bell, 
  BarChart3, 
  Package, 
  Shield,
  LogIn,
  MapPin
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useTranslation();
  const { user, isAdmin, isEmployee } = useSimpleAuth();

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path);
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  // Public navigation items
  const publicItems = [
    { title: "Inicio", url: "/", icon: Home },
    { title: t('book_appointment'), url: "/client-reservation", icon: Calendar },
    { title: t('buy_voucher'), url: "/comprar-bono", icon: Gift },
    { title: t('gift_cards'), url: "/tarjetas-regalo", icon: CreditCard },
  ];

  // Admin navigation items
  const adminItems = [
    { title: "Panel Admin", url: "/panel-gestion-nook-madrid-2024", icon: BarChart3 },
    { title: "Notificaciones", url: "/panel-gestion-nook-madrid-2024/notifications", icon: Bell },
    { title: "Reportes", url: "/panel-gestion-nook-madrid-2024/reports", icon: BarChart3 },
    { title: "Gestión Bonos", url: "/bonos", icon: Package },
    { title: "Precios/Promos", url: "/panel-gestion-nook-madrid-2024/precios-promos", icon: Settings },
    { title: "Configuración", url: "/panel-gestion-nook-madrid-2024/configuracion", icon: Settings },
  ];

  // Employee items
  const employeeItems = [
    { title: "Canjear Código", url: "/panel-gestion-nook-madrid-2024/canjear", icon: Package },
  ];

  return (
    <Sidebar
      className={open ? "w-64" : "w-14"}
      collapsible="icon"
    >
      <SidebarContent>
        {/* Public Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {open && "Navegación Pública"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {publicItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin/Employee Navigation */}
        {(isAdmin || isEmployee) && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {open && "Panel de Gestión"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isAdmin && adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                
                {isEmployee && !isAdmin && employeeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Login Section */}
        {!user && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin-login" className={getNavCls}>
                      <LogIn className="h-4 w-4" />
                      {open && <span>Admin Login</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}