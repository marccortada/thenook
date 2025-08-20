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
import Layout from "@/components/Layout";
import InventoryManagement from "@/components/InventoryManagement";
import HappyHourManagement from "@/components/HappyHourManagement";
import InternalCodesManagement from "@/components/InternalCodesManagement";
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
      monday: { open: "09:00", close: "21:00", closed: false },
      tuesday: { open: "09:00", close: "21:00", closed: false },
      wednesday: { open: "09:00", close: "21:00", closed: false },
      thursday: { open: "09:00", close: "21:00", closed: false },
      friday: { open: "09:00", close: "21:00", closed: false },
      saturday: { open: "10:00", close: "20:00", closed: false },
      sunday: { open: "10:00", close: "18:00", closed: false }
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
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
            <p className="text-muted-foreground">
              Gestiona todos los aspectos de tu negocio desde un solo lugar
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Inventario</span>
            </TabsTrigger>
            <TabsTrigger value="happy-hours" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">Happy Hours</span>
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Códigos</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Notific.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Información General del Negocio
                </CardTitle>
                <CardDescription>
                  Configura los datos básicos de tu centro
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Nombre del Negocio</Label>
                    <Input
                      id="businessName"
                      value={generalSettings.businessName}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, businessName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Sitio Web</Label>
                    <Input
                      id="website"
                      value={generalSettings.website}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea
                    id="address"
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <Button onClick={() => handleSaveSettings("general")}>
                  Guardar Configuración General
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Horarios de Atención
                </CardTitle>
                <CardDescription>
                  Configura los horarios de trabajo por día de la semana
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {daysOfWeek.map((day) => (
                  <div key={day.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-medium w-20">{day.label}</span>
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
                          className="w-24"
                        />
                        <span>-</span>
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
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={() => handleSaveSettings("horarios")}>
                  Guardar Horarios
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="happy-hours">
            <HappyHourManagement />
          </TabsContent>

          <TabsContent value="codes">
            <InternalCodesManagement />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Configuración de Pagos
                </CardTitle>
                <CardDescription>
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

          <TabsContent value="notifications" className="space-y-6">
            <Card>
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
    </Layout>
  );
};

export default AdminSettings;