import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Building2, 
  Clock, 
  Users, 
  MapPin,
  Shield, 
  Palette,
  Package,
  Percent,
  Hash,
  BarChart3,
  Database
} from "lucide-react";

import InternalCodesManagement from "@/components/InternalCodesManagement";
import PackageManagement from "@/components/PackageManagement";
import GiftCardManagement from "@/components/GiftCardManagement";
import { useToast } from "@/hooks/use-toast";
import { useWorkingHours } from "@/hooks/useWorkingHours";
import { supabase } from "@/integrations/supabase/client";

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();
  const { workingHours, updateWorkingHours, saveWorkingHours, loading } = useWorkingHours();

  const [generalSettings, setGeneralSettings] = useState({
    businessName: "",
    phone: "",
    email: "",
    website: "",
    whatsapp: "+34 622 36 09 22",
    taxId: "",
    currency: "EUR",
    timezone: "Europe/Madrid"
  });
  const [loadingGeneral, setLoadingGeneral] = useState(false);



  // Load general settings from database
  const loadGeneralSettings = async () => {
    try {
      setLoadingGeneral(true);
      const { data, error } = await supabase
        .from('centers')
        .select('name, phone, email, whatsapp')
        .eq('active', true)
        .limit(1);

      if (error) {
        console.error('Error loading general settings:', error);
        return;
      }

      if (data && data.length > 0) {
        const centerData = data[0];
        setGeneralSettings(prev => ({
          ...prev,
          businessName: centerData?.name || "",
          phone: centerData?.phone || "",
          email: centerData?.email || "",
          whatsapp: (centerData as any)?.whatsapp || "+34 622 36 09 22"
        }));
      }
    } catch (error) {
      console.error('Error loading general settings:', error);
    } finally {
      setLoadingGeneral(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoadingGeneral(true);
      
      const { error } = await supabase
        .from('centers')
        .update({
          name: generalSettings.businessName,
          phone: generalSettings.phone,
          email: generalSettings.email,
          whatsapp: generalSettings.whatsapp,
          updated_at: new Date().toISOString()
        })
        .eq('active', true);

      if (error) {
        console.error('Error saving general settings:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar la configuración general",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Configuración guardada",
        description: "La configuración general ha sido actualizada correctamente",
      });
    } catch (error) {
      console.error('Error saving general settings:', error);
      toast({
        title: "Error", 
        description: "No se pudo guardar la configuración general",
        variant: "destructive"
      });
    } finally {
      setLoadingGeneral(false);
    }
  };

  const handleSaveWorkingHours = async () => {
    const success = await saveWorkingHours(workingHours);
    if (success) {
      toast({
        title: "Horarios guardados",
        description: "Los horarios de trabajo se han actualizado en todo el sistema",
      });
    }
  };

  const daysOfWeek = [
    { key: "monday", label: "Lunes" },
    { key: "tuesday", label: "Martes" },
    { key: "wednesday", label: "Miércoles" },
    { key: "thursday", label: "Jueves" },
    { key: "friday", label: "Viernes" },
    { key: "saturday", label: "Sábado" },
    { key: "sunday", label: "Domingo" }
  ];

  // Load data on component mount
  useEffect(() => {
    loadGeneralSettings();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Configuración del Sistema - The Nook Madrid
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Configuración del Sistema</h1>
            <p className="text-muted-foreground text-xs sm:text-sm lg:text-base mt-1">
              Gestiona todos los aspectos de tu negocio desde un solo lugar
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile Tab Selector */}
          <div className="lg:hidden mb-4">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full p-3 border rounded-lg bg-background text-sm font-medium shadow-sm"
            >
              <option value="general">🏢 General</option>
              <option value="codes">🏷️ Códigos</option>
              
            </select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden lg:grid w-full grid-cols-2 h-auto mb-6">
            <TabsTrigger value="general" className="flex items-center gap-2 p-3">
              <Building2 className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2 p-3">
              <Hash className="h-4 w-4" />
              <span>Códigos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 sm:space-y-6">
            <Card className="shadow-sm border-2">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Información General del Negocio
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Configura los datos básicos de tu centro
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-sm font-medium">Nombre del Negocio</Label>
                    <Input
                      id="businessName"
                      value={generalSettings.businessName}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, businessName: e.target.value }))}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Teléfono</Label>
                    <Input
                      id="phone"
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={generalSettings.whatsapp}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="h-10 sm:h-11"
                      placeholder="+34 622 36 09 22"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium">Sitio Web</Label>
                    <Input
                      id="website"
                      value={generalSettings.website}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, website: e.target.value }))}
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSaveSettings} 
                  className="w-full sm:w-auto"
                  disabled={loadingGeneral}
                >
                  {loadingGeneral ? "Guardando..." : "Guardar Configuración General"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-2">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  Horarios de Atención
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Configura los horarios de trabajo por día de la semana
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {daysOfWeek.map((day) => (
                  <div key={day.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3 sm:gap-2 bg-accent/10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="font-medium w-16 sm:w-20 text-sm sm:text-base">{day.label}</span>
                      <Switch
                        checked={!workingHours[day.key as keyof typeof workingHours].closed}
                        onCheckedChange={(checked) => 
                          updateWorkingHours(day.key as keyof typeof workingHours, { closed: !checked })
                        }
                      />
                    </div>
                    {!workingHours[day.key as keyof typeof workingHours].closed && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={workingHours[day.key as keyof typeof workingHours].open}
                          onChange={(e) => 
                            updateWorkingHours(day.key as keyof typeof workingHours, { open: e.target.value })
                          }
                          className="w-20 sm:w-24 h-9 text-sm"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={workingHours[day.key as keyof typeof workingHours].close}
                          onChange={(e) => 
                            updateWorkingHours(day.key as keyof typeof workingHours, { close: e.target.value })
                          }
                          className="w-20 sm:w-24 h-9 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button 
                  onClick={handleSaveWorkingHours} 
                  className="w-full sm:w-auto mt-4"
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar Horarios"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-2">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                  Ubicaciones de los Centros
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Mapas de las dos ubicaciones de The Nook Madrid
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Centro Zurbarán */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h4 className="font-medium text-sm sm:text-base">Centro Zurbarán</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid
                    </p>
                    <div className="rounded-lg overflow-hidden border">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3036.5489!2d-3.6917!3d40.4296!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd4228849b1e5263%3A0x7e1b9e3f8b3c1234!2sC.%20de%20Zurbar%C3%A1n%2C%2010%2C%20Chamber%C3%AD%2C%2028010%20Madrid!5e0!3m2!1sen!2ses!4v1234567890"
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a 
                        href="https://maps.google.com/?q=C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <MapPin className="mr-2 h-3 w-3" />
                        Abrir en Google Maps
                      </a>
                    </Button>
                  </div>

                  {/* Centro Concha Espina */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <h4 className="font-medium text-sm sm:text-base">Centro Concha Espina</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      C. del Príncipe de Vergara, 204 duplicado posterior, local 10, 28002 Madrid
                    </p>
                    <div className="rounded-lg overflow-hidden border">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3036.364!2d-3.6736659!3d40.4347875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDI2JzA1LjIiTiAzwrA0MCcyNS4yIlc!5e0!3m2!1sen!2ses!4v1646123456789!5m2!1sen!2ses&q=C.+del+Príncipe+de+Vergara,+204+duplicado+posterior,+local+10,+28002+Madrid"
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      ></iframe>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a 
                        href="https://maps.google.com/?q=Centro+de+masajes+Madrid+Concha+Espina+The+Nook,+C.+del+Príncipe+de+Vergara,+204+duplicado+posterior,+local+10,+28002+Madrid" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <MapPin className="mr-2 h-3 w-3" />
                        Abrir en Google Maps
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-4 sm:space-y-6">
            <InternalCodesManagement />
          </TabsContent>

          <TabsContent value="gifts" className="space-y-4 sm:space-y-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Esta sección está disponible en el menú principal de administración.</p>
            </div>
          </TabsContent>


        </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;