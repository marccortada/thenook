import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireEmployee?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requireAdmin = false, 
  requireEmployee = false 
}: ProtectedRouteProps) => {
  const { isAuthenticated, loading, isAdmin, isEmployee } = useSimpleAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !isAuthenticated) {
        navigate('/admin-login');
        return;
      }
      
      if (requireAdmin && !isAdmin) {
        navigate('/admin-login');
        return;
      }
      
      if (requireEmployee && !isEmployee && !isAdmin) {
        navigate('/admin-login');
        return;
      }
    }
  }, [loading, isAuthenticated, isAdmin, isEmployee, navigate, requireAuth, requireAdmin, requireEmployee]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acceso denegado</h2>
          <p className="text-muted-foreground">No tienes permisos de administrador para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  if (requireEmployee && !isEmployee && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acceso denegado</h2>
          <p className="text-muted-foreground">No tienes permisos de empleado para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;