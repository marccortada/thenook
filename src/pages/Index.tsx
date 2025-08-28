import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Users } from "lucide-react";

import AdminDashboard from "@/components/AdminDashboard";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useNavigate } from "react-router-dom";
import PublicLandingPage from "@/pages/PublicLandingPage";
import AppLogo from "@/components/AppLogo";

const Index = () => {
  const { user, isAdmin, isEmployee, isAuthenticated, loading } = useSimpleAuth();
  const navigate = useNavigate();

  // Mostrar página pública si no está autenticado y no está cargando
  if (!loading && !isAuthenticated) {
    return <PublicLandingPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-2 sm:px-0">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground">Verificando sesión...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si está autenticado, mostrar directamente el panel de administración
  if (isAuthenticated && (isAdmin || isEmployee)) {
    return <AdminDashboard />;
  }

  // Fallback: redirigir a login si no hay autenticación válida
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acceso Requerido</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Necesitas iniciar sesión para acceder a la plataforma.
          </p>
          <Button onClick={() => navigate("/admin-login")} className="w-full">
            Ir al Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;