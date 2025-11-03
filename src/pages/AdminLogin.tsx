import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff } from "lucide-react";

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Intentar login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError || !authData?.user) {
        toast({
          title: "Error de autenticación",
          description: authError?.message || "Credenciales incorrectas",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Esperar brevemente para que la sesión se propague
      await new Promise(resolve => setTimeout(resolve, 300));

      // Buscar el perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        toast({
          title: "Error",
          description: "No se encontró el perfil del usuario",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verificar que sea staff activo
      if (!profile.is_staff || !profile.is_active) {
        await supabase.auth.signOut();
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder al panel",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Guardar sesión en localStorage para compatibilidad
      const userSession = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
        loginTime: Date.now()
      };

      localStorage.setItem('nook_user_session', JSON.stringify(userSession));

      toast({
        title: "✅ Acceso concedido",
        description: `Bienvenido ${profile.role === 'admin' ? 'Administrador' : 'Empleado'}`,
      });

      // Redirigir al panel
      navigate("/panel-gestion-nook-madrid-2024");
      
    } catch (error) {
      console.error("Error durante login:", error);
      toast({
        title: "Error del sistema",
        description: "Ocurrió un error. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      // Garantiza que el botón nunca quede bloqueado
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      toast({
        title: "Email requerido",
        description: "Introduce tu email para restablecer la contraseña",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/admin-login`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Email enviado",
        description: "Revisa tu correo para restablecer la contraseña",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error del sistema",
        description: "No se pudo enviar el email. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Panel de Administración</CardTitle>
          <CardDescription>
            Accede al sistema de gestión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder=""
                required
              />
            </div>
            
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verificando..." : "Iniciar Sesión"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resetLoading}
                onClick={handlePasswordReset}
              >
                {resetLoading ? "Enviando..." : "¿Olvidaste tu contraseña?"}
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground"
            >
              Volver a la página principal
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Dev force access removed as requested */}
    </div>
  );
};

export default AdminLogin;
