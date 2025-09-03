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
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Intentando login con:', formData.email);
      // Intentar login primero
      let { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      
      console.log('Resultado del login:', { data, error });

      // Si el usuario no existe y es work@thenookmadrid.com, crearlo usando edge function
      if (error && formData.email === 'work@thenookmadrid.com') {
        const { data: createResponse, error: createError } = await supabase.functions.invoke('create-admin-user', {
          body: {
            email: formData.email,
            password: formData.password
          }
        });

        if (createError || !createResponse?.success) {
          toast({
            title: "Error creando usuario",
            description: createError?.message || createResponse?.error || "No se pudo crear el usuario",
            variant: "destructive",
          });
          return;
        }

        // Intentar login de nuevo después de crear el usuario
        const loginResult = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        data = loginResult.data;
        error = loginResult.error;
      }

      if (error || !data.user) {
        toast({
          title: "Error de autenticación",
          description: error?.message || "Credenciales incorrectas",
          variant: "destructive",
        });
        return;
      }

      // Buscar el perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile) {
        toast({
          title: "Error de autenticación",
          description: "Perfil de usuario no encontrado",
          variant: "destructive",
        });
        return;
      }

      // Verificar que tenga permisos (admin o employee)
      if (profile.role !== 'admin' && profile.role !== 'employee') {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para acceder al panel",
          variant: "destructive",
        });
        return;
      }

      // Guardar sesión en localStorage
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

  const handleMagicLink = async () => {
    if (!formData.email) {
      toast({
        title: "Email requerido",
        description: "Introduce tu email para acceso directo",
        variant: "destructive",
      });
      return;
    }

    setMagicLinkLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/panel-gestion-nook-madrid-2024`,
        },
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
        title: "Magic Link enviado",
        description: "Revisa tu correo y haz clic en el enlace para acceder",
      });
      setShowMagicLink(true);
    } catch (error) {
      console.error("Error sending magic link:", error);
      toast({
        title: "Error del sistema",
        description: "No se pudo enviar el enlace. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setMagicLinkLoading(false);
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

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={resetLoading}
                  onClick={handlePasswordReset}
                >
                  {resetLoading ? "Enviando..." : "Olvidé mi contraseña"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={magicLinkLoading}
                  onClick={handleMagicLink}
                >
                  {magicLinkLoading ? "Enviando..." : "Acceso directo"}
                </Button>
              </div>

              {showMagicLink && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    📧 Te hemos enviado un enlace de acceso directo a <strong>{formData.email}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Revisa tu bandeja de entrada y spam. El enlace te dará acceso directo al panel.
                  </p>
                </div>
              )}
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
    </div>
  );
};

export default AdminLogin;