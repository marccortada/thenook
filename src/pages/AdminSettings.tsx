import { useState } from "react";
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
  CreditCard, 
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
import AppLogo from "@/components/AppLogo";
import { useToast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();

  const [generalSettings, setGeneralSettings] = useState({
    businessName: "The Nook Madrid",
    address: "Calle Ejemplo 123, Madrid",
    phone: "+34 123 456 789",
    email: "info@thenookmadrid.com",
    website: "https://thenookmadrid.com",
    taxId: "B12345678",
    currency: "EUR",
    timezone: "Europe/Madrid",
    workingHours: {
      monday: { open: "10:00", close: "22:00", closed: false },
      tuesday: { open: "10:00", close: "22:00", closed: false },
      wednesday: { open: "10:00", close: "22:00", closed: false },
      thursday: { open: "10:00", close: "22:00", closed: false },
      friday: { open: "10:00", close: "22:00", closed: false },
      saturday: { open: "10:00", close: "22:00", closed: false },
      sunday: { open: "10:00", close: "22:00", closed: false }
    }
  });

  const [paymentSettings, setPaymentSettings] = useState({
    acceptCash: true,
    acceptCard: true,
    acceptTransfer: true,
    depositRequired: true,
    depositPercentage: 50,
    cancellationHours: 24,
    noShowFee: 50
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    reminderHours: 24,
    autoConfirmation: true,
    marketingEmails: false
  });

  const handleSaveSettings = (section: string) => {
    toast({
      title: "Configuración guardada",
      description: `La configuración de ${section} ha sido actualizada correctamente`,
    });
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <AppLogo className="h-8 w-auto" />
            <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
          </div>
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
              <option value="gifts">🎁 Bonos y Tarjetas</option>
              <option value="payments">💳 Pagos</option>
              <option value="notifications">🔔 Notificaciones</option>
            </select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden lg:grid w-full grid-cols-5 h-auto mb-6">
            <TabsTrigger value="general" className="flex items-center gap-2 p-3">
              <Building2 className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2 p-3">
              <Hash className="h-4 w-4" />
              <span>Códigos</span>
            </TabsTrigger>
            <TabsTrigger value="gifts" className="flex items-center gap-2 p-3">
              <Package className="h-4 w-4" />
              <span>Bonos y Tarjetas</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2 p-3">
              <CreditCard className="h-4 w-4" />
              <span>Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 p-3">
              <Settings className="h-4 w-4" />
              <span>Notificaciones</span>
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
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Dirección</Label>
                  <Textarea
                    id="address"
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, address: e.target.value }))}
                    className="min-h-[80px] sm:min-h-[100px]"
                  />
                </div>
                <Button onClick={() => handleSaveSettings("general")} className="w-full sm:w-auto">
                  Guardar Configuración General
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
                        checked={!generalSettings.workingHours[day.key as keyof typeof generalSettings.workingHours].closed}
                        onCheckedChange={(checked) => 
                          setGeneralSettings(prev => ({
                            ...prev,
                            workingHours: {
                              ...prev.workingHours,
                              [day.key]: { ...prev.workingHours[day.key as keyof typeof prev.workingHours], closed: !checked }
                            }
                          }))
                        }
                      />
                    </div>
                    {!generalSettings.workingHours[day.key as keyof typeof generalSettings.workingHours].closed && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={generalSettings.workingHours[day.key as keyof typeof generalSettings.workingHours].open}
                          onChange={(e) => 
                            setGeneralSettings(prev => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day.key]: { ...prev.workingHours[day.key as keyof typeof prev.workingHours], open: e.target.value }
                              }
                            }))
                          }
                          className="w-20 sm:w-24 h-9 text-sm"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="time"
                          value={generalSettings.workingHours[day.key as keyof typeof generalSettings.workingHours].close}
                          onChange={(e) => 
                            setGeneralSettings(prev => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                [day.key]: { ...prev.workingHours[day.key as keyof typeof prev.workingHours], close: e.target.value }
                              }
                            }))
                          }
                          className="w-20 sm:w-24 h-9 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={() => handleSaveSettings("horarios")} className="w-full sm:w-auto mt-4">
                  Guardar Horarios
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-4 sm:space-y-6">
            <InternalCodesManagement />
          </TabsContent>

          <TabsContent value="gifts" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm border-2">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                    Gestión de Bonos
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Administra los bonos y paquetes de sesiones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => window.open('/admin/bonos', '_blank')}
                    className="w-full"
                  >
                    Ir a Gestión de Bonos
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-2">
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                    Gestión de Tarjetas Regalo
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Administra las tarjetas regalo y su saldo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => window.open('/admin/tarjetas-regalo', '_blank')}
                    className="w-full"
                  >
                    Ir a Gestión de Tarjetas Regalo
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4 sm:space-y-6">
            <Card className="shadow-sm border-2">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  Configuración de Pagos
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Gestiona los métodos de pago y políticas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Aceptar pagos en efectivo</Label>
                    <Switch
                      checked={paymentSettings.acceptCash}
                      onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, acceptCash: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Aceptar pagos con tarjeta</Label>
                    <Switch
                      checked={paymentSettings.acceptCard}
                      onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, acceptCard: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Aceptar transferencias</Label>
                    <Switch
                      checked={paymentSettings.acceptTransfer}
                      onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, acceptTransfer: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Requiere depósito para reservas</Label>
                    <Switch
                      checked={paymentSettings.depositRequired}
                      onCheckedChange={(checked) => setPaymentSettings(prev => ({ ...prev, depositRequired: checked }))}
                    />
                  </div>
                </div>

                {paymentSettings.depositRequired && (
                  <div>
                    <Label htmlFor="depositPercentage">Porcentaje de depósito (%)</Label>
                    <Input
                      id="depositPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={paymentSettings.depositPercentage}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, depositPercentage: parseInt(e.target.value) }))}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="cancellationHours">Horas mínimas para cancelación gratuita</Label>
                  <Input
                    id="cancellationHours"
                    type="number"
                    min="0"
                    value={paymentSettings.cancellationHours}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, cancellationHours: parseInt(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label htmlFor="noShowFee">Tarifa por no presentarse (€)</Label>
                  <Input
                    id="noShowFee"
                    type="number"
                    min="0"
                    value={paymentSettings.noShowFee}
                    onChange={(e) => setPaymentSettings(prev => ({ ...prev, noShowFee: parseFloat(e.target.value) }))}
                  />
                </div>

                <Button onClick={() => handleSaveSettings("pagos")}>
                  Guardar Configuración de Pagos
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
            <Card className="shadow-sm border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración de Notificaciones
                </CardTitle>
                <CardDescription>
                  Configura cómo y cuándo enviar notificaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Notificaciones por email</Label>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Notificaciones por SMS</Label>
                    <Switch
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Confirmación automática</Label>
                    <Switch
                      checked={notificationSettings.autoConfirmation}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, autoConfirmation: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Emails de marketing</Label>
                    <Switch
                      checked={notificationSettings.marketingEmails}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, marketingEmails: checked }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reminderHours">Horas antes para recordatorio</Label>
                  <Input
                    id="reminderHours"
                    type="number"
                    min="1"
                    max="168"
                    value={notificationSettings.reminderHours}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, reminderHours: parseInt(e.target.value) }))}
                  />
                </div>

                <Button onClick={() => handleSaveSettings("notificaciones")}>
                  Guardar Configuración de Notificaciones
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;