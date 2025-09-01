import { useEffect, useMemo, useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useServices, usePackages, useCenters } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Edit, X } from "lucide-react";

import HappyHourManagement from "@/components/HappyHourManagement";
import PromotionsManagement from "@/components/PromotionsManagement";
import PriceDisplay from "@/components/PriceDisplay";

const currency = (euros?: number) => typeof euros === 'number' ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(euros) : "-";

export default function AdminPricingPromos() {
  const { services, refetch: refetchServices } = useServices();
  const { packages, refetch: refetchPackages } = usePackages();
  const { centers } = useCenters();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Precios y Promos | The Nook Madrid";
  }, []);

  // Servicios - edición rápida de precio/estado/descuento
  const [serviceEdits, setServiceEdits] = useState<Record<string, { price_euros: number; active: boolean; has_discount: boolean; discount_percentage: number }>>({});

  const handleServiceChange = (id: string, field: 'price_euros'|'active'|'has_discount'|'discount_percentage', value: any) => {
    setServiceEdits((prev) => ({
      ...prev,
      [id]: { 
        price_euros: prev[id]?.price_euros ?? 0, 
        active: prev[id]?.active ?? true, 
        has_discount: prev[id]?.has_discount ?? false,
        discount_percentage: prev[id]?.discount_percentage ?? 0,
        [field]: value 
      }
    }));
  };

  // Gestión completa de servicios - CRUD
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    type: 'massage' as const,
    duration_minutes: 60,
    price_cents: 5000,
    active: true,
    center_id: ''
  });
  const [editingService, setEditingService] = useState<any>(null);

  const serviceTypes = [
    { value: 'massage' as const, label: 'Masaje' },
    { value: 'treatment' as const, label: 'Tratamiento' },
    { value: 'package' as const, label: 'Paquete' }
  ];

  const createService = async () => {
    if (!newService.name || !newService.duration_minutes || !newService.price_cents) {
      toast({ title: 'Campos requeridos', description: 'Nombre, duración y precio son obligatorios', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('services').insert({
        name: newService.name,
        description: newService.description || null,
        type: newService.type,
        duration_minutes: newService.duration_minutes,
        price_cents: newService.price_cents,
        active: newService.active,
        has_discount: false,
        discount_percentage: 0,
        center_id: newService.center_id || null
      });

      if (error) {
        toast({ title: 'Error', description: `No se pudo crear el servicio: ${error.message}`, variant: 'destructive' });
      } else {
        toast({ title: 'Creado', description: 'Servicio creado exitosamente' });
        setNewService({
          name: '',
          description: '',
          type: 'massage' as const,
          duration_minutes: 60,
          price_cents: 5000,
          active: true,
          center_id: ''
        });
        refetchServices();
      }
    } catch (err) {
      console.error('Error creating service:', err);
      toast({ title: 'Error', description: 'Error inesperado al crear el servicio', variant: 'destructive' });
    }
  };

  const updateService = async () => {
    if (!editingService) return;

    console.log('Updating service:', editingService);

    try {
      const updateData = {
        name: editingService.name,
        description: editingService.description || null,
        type: editingService.type,
        duration_minutes: editingService.duration_minutes,
        price_cents: editingService.price_cents,
        active: editingService.active,
        has_discount: editingService.has_discount || false,
        discount_percentage: editingService.discount_percentage || 0
      };

      console.log('Update data:', updateData);

      const { error } = await supabase.from('services')
        .update(updateData)
        .eq('id', editingService.id);

      if (error) {
        console.error('Update error:', error);
        toast({ title: 'Error', description: `No se pudo actualizar el servicio: ${error.message}`, variant: 'destructive' });
      } else {
        toast({ title: 'Actualizado', description: 'Servicio actualizado exitosamente' });
        setEditingService(null);
        refetchServices();
      }
    } catch (err) {
      console.error('Error updating service:', err);
      toast({ title: 'Error', description: 'Error inesperado al actualizar el servicio', variant: 'destructive' });
    }
  };

  const deleteService = async (serviceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este servicio? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase.from('services').delete().eq('id', serviceId);

      if (error) {
        toast({ title: 'Error', description: `No se pudo eliminar el servicio: ${error.message}`, variant: 'destructive' });
      } else {
        toast({ title: 'Eliminado', description: 'Servicio eliminado exitosamente' });
        refetchServices();
      }
    } catch (err) {
      console.error('Error deleting service:', err);
      toast({ title: 'Error', description: 'Error inesperado al eliminar el servicio', variant: 'destructive' });
    }
  };

  // Agrupar servicios por nombre (normalizado) y duración para evitar duplicados entre centros
  const uniqueServices = useMemo(() => {
    const map = new Map<string, { key: string; ids: string[]; name: string; type: any; duration_minutes: number; price_euros: number; allActive: boolean; hasDiscount: boolean; discountPercentage: number }>();
    services.forEach((s: any) => {
      const key = `${(s.name || '').trim().toLowerCase()}|${s.duration_minutes}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          ids: [s.id],
          name: s.name,
          type: s.type,
          duration_minutes: s.duration_minutes,
          price_euros: s.price_cents / 100,
          allActive: !!s.active,
          hasDiscount: !!s.has_discount,
          discountPercentage: s.discount_percentage || 0,
        });
      } else {
        existing.ids.push(s.id);
        existing.allActive = existing.allActive && !!s.active;
        existing.hasDiscount = existing.hasDiscount && !!s.has_discount;
        existing.discountPercentage = s.discount_percentage || 0;
      }
    });
    return Array.from(map.values());
  }, [services]);

  const saveService = async (key: string, ids: string[]) => {
    const edit = serviceEdits[key];
    if (!edit) return;

    const priceCents = Math.round(edit.price_euros * 100);
    for (const id of ids) {
      await supabase.from('services').update({ 
        price_cents: priceCents, 
        active: edit.active,
        has_discount: edit.has_discount,
        discount_percentage: edit.discount_percentage
      }).eq('id', id);
    }
    toast({ title: 'Guardado', description: 'Servicio actualizado en todos los centros' });
    delete serviceEdits[key];
    setServiceEdits({...serviceEdits});
    refetchServices();
  };

  // Bonos (paquetes) - edición de precio/sesiones/estado + alta (agrupados sin duplicados entre centros)
  const [packageEdits, setPackageEdits] = useState<Record<string, { price_euros: number; sessions_count: number; active: boolean }>>({});
  const handlePackageChange = (id: string, field: 'price_euros'|'sessions_count'|'active', value: any) => {
    setPackageEdits((prev) => ({
      ...prev,
      [id]: { 
        price_euros: prev[id]?.price_euros ?? 0, 
        sessions_count: prev[id]?.sessions_count ?? 1, 
        active: prev[id]?.active ?? true, 
        [field]: value 
      }
    }));
  };

  const uniquePackages = useMemo(() => {
    const map = new Map<string, { key: string; ids: string[]; name: string; service_name?: string; sessions_count: number; price_euros: number; allActive: boolean }>();
    packages.forEach((p: any) => {
      const key = `${(p.name || '').trim().toLowerCase()}|${p.sessions_count}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          ids: [p.id],
          name: p.name,
          service_name: p.services?.name,
          sessions_count: p.sessions_count,
          price_euros: p.price_cents / 100,
          allActive: !!p.active,
        });
      } else {
        existing.ids.push(p.id);
        existing.allActive = existing.allActive && !!p.active;
      }
    });
    return Array.from(map.values());
  }, [packages]);

  const savePackage = async (key: string, ids: string[]) => {
    const edit = packageEdits[key];
    if (!edit) return;

    const priceCents = Math.round(edit.price_euros * 100);
    for (const id of ids) {
      await supabase.from('packages').update({ 
        price_cents: priceCents, 
        sessions_count: edit.sessions_count,
        active: edit.active 
      }).eq('id', id);
    }
    toast({ title: 'Guardado', description: 'Bono actualizado en todos los centros' });
    delete packageEdits[key];
    setPackageEdits({...packageEdits});
    refetchPackages();
  };

  // Tarjetas regalo - opciones de importes (sin duplicados)
  const [giftOptions, setGiftOptions] = useState<any[]>([]);
  const [giftEdits, setGiftEdits] = useState<Record<string, { amount_euros: number; active: boolean }>>({});
  const giftDenoms = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300];

  const fetchGiftOptions = async () => {
    const { data } = await supabase.from('gift_card_options').select('*').order('amount_cents');
    setGiftOptions(data || []);
  };

  useEffect(() => {
    fetchGiftOptions();
  }, []);

  const handleGiftChange = (id: string, field: 'amount_euros'|'active', value: any) => {
    setGiftEdits((prev) => ({
      ...prev,
      [id]: { amount_euros: prev[id]?.amount_euros ?? 0, active: prev[id]?.active ?? true, [field]: value }
    }));
  };

  const saveGiftOption = async (id: string) => {
    const edit = giftEdits[id];
    if (!edit) return;

    const amountCents = Math.round(edit.amount_euros * 100);
    await supabase.from('gift_card_options').update({ amount_cents: amountCents, is_active: edit.active }).eq('id', id);
    toast({ title: 'Guardado', description: 'Opción de tarjeta regalo actualizada' });
    delete giftEdits[id];
    setGiftEdits({...giftEdits});
    fetchGiftOptions();
  };

  const deleteGiftOption = async (id: string) => {
    if (!confirm('¿Eliminar esta opción de tarjeta regalo?')) return;
    await supabase.from('gift_card_options').delete().eq('id', id);
    toast({ title: 'Eliminado', description: 'Opción eliminada' });
    fetchGiftOptions();
  };

  const seedCatalogGiftOptions = async () => {
    const existing = giftOptions.map(g => g.amount_cents);
    const toInsert = giftDenoms
      .filter(euros => !existing.includes(euros * 100))
      .map(euros => ({ name: `Tarjeta ${euros}€`, amount_cents: euros * 100, is_active: true }));

    if (toInsert.length === 0) {
      toast({ title: 'Ya completo', description: 'Todas las opciones ya existen' });
      return;
    }

    const { error } = await (supabase as any).from('gift_card_options').insert(toInsert);
    if (error) {
      toast({ title: 'Error', description: 'No se pudieron crear opciones', variant: 'destructive' });
    } else {
      toast({ title: 'Importadas', description: `Se crearon ${toInsert.length} opciones` });
      fetchGiftOptions();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Precios y Promos - The Nook Madrid
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Precios y Promos</h1>
        <Tabs defaultValue="services">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
            <TabsTrigger value="services" className="text-xs sm:text-sm px-2 py-2">Servicios</TabsTrigger>
            <TabsTrigger value="manage-services" className="text-xs sm:text-sm px-2 py-2">Gestión</TabsTrigger>
            <TabsTrigger value="packages" className="text-xs sm:text-sm px-2 py-2">Bonos</TabsTrigger>
            <TabsTrigger value="giftcards" className="text-xs sm:text-sm px-2 py-2">Tarjetas</TabsTrigger>
            <TabsTrigger value="promotions" className="text-xs sm:text-sm px-2 py-2">Promos</TabsTrigger>
            <TabsTrigger value="happy-hours" className="text-xs sm:text-sm px-2 py-2">Happy Hours</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Servicios - Edición Rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uniqueServices.map((g) => {
                    const edit = serviceEdits[g.key] || { 
                      price_euros: g.price_euros, 
                      active: g.allActive, 
                      has_discount: g.hasDiscount,
                      discount_percentage: g.discountPercentage
                    };
                    return (
                      <div key={g.key} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{g.name}</div>
                            <div className="text-xs text-muted-foreground">{g.type} · {g.duration_minutes} min</div>
                          </div>
                          <PriceDisplay 
                            originalPrice={edit.price_euros * 100} 
                            className="text-sm font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <Label>Precio (€)</Label>
                            <Input type="number" step="0.01" value={edit.price_euros} onChange={(e) => handleServiceChange(g.key, 'price_euros', parseFloat(e.target.value || '0'))} />
                          </div>
                          <div>
                            <Label>Estado</Label>
                            <Select value={String(edit.active)} onValueChange={(v) => handleServiceChange(g.key, 'active', v === 'true')}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent className="z-50 bg-background">
                                <SelectItem value="true">Activo</SelectItem>
                                <SelectItem value="false">Inactivo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center space-x-2 mb-2">
                              <input 
                                type="checkbox" 
                                id={`discount-${g.key}`}
                                checked={edit.has_discount}
                                onChange={(e) => handleServiceChange(g.key, 'has_discount', e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor={`discount-${g.key}`} className="text-sm">Aplicar descuento</Label>
                            </div>
                            {edit.has_discount && (
                              <div className="mb-2">
                                <Label className="text-sm">Descuento (%)</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  value={edit.discount_percentage}
                                  onChange={(e) => handleServiceChange(g.key, 'discount_percentage', parseInt(e.target.value || '0'))}
                                  className="text-sm"
                                />
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">Se actualizará en todos los centros</div>
                            <Button size="sm" onClick={() => saveService(g.key, g.ids)}>Guardar</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manage-services" className="mt-6 space-y-4">
            {/* Servicios agrupados por tipo con acordeón */}
            <Accordion type="multiple" className="space-y-4">
              {serviceTypes.map(type => {
                const servicesOfType = services.filter((service: any) => service.type === type.value);
                if (servicesOfType.length === 0) return null;
                
                return (
                  <AccordionItem key={type.value} value={type.value} className="border rounded-lg">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-lg font-semibold">{type.label}</span>
                        <span className="text-sm text-muted-foreground mr-4">{servicesOfType.length} servicios</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {servicesOfType.map((service: any) => (
                          <div key={service.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{service.name}</h3>
                                <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                  <span>{service.duration_minutes} min</span>
                                  <span>•</span>
                                   <PriceDisplay 
                                     originalPrice={service.price_cents} 
                                     serviceId={service.id}
                                     centerId={service.center_id}
                                     serviceDiscount={{
                                       has_discount: !!service.has_discount,
                                       discount_percentage: service.discount_percentage || 0
                                     }}
                                     className="text-sm"
                                   />
                                </div>
                                {service.description && (
                                  <p className="text-xs text-muted-foreground mb-2">{service.description}</p>
                                )}
                                <div className="flex items-center gap-2 text-xs">
                                  <span className={`px-2 py-1 rounded ${service.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {service.active ? 'Activo' : 'Inactivo'}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {centers.find(c => c.id === service.center_id)?.name || 'Todos los centros'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  console.log('Editing service:', service);
                                  setEditingService({ ...service });
                                }}
                                className="flex-1"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteService(service.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* Formulario para crear nuevo servicio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Crear Nuevo Servicio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="service-name">Nombre *</Label>
                    <Input
                      id="service-name"
                      value={newService.name}
                      onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                      placeholder="Ej: Masaje Relajante"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service-type">Tipo</Label>
                    <Select
                      value={newService.type}
                      onValueChange={(value: any) => setNewService({ ...newService, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background">
                        {serviceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="service-duration">Duración (min) *</Label>
                    <Input
                      id="service-duration"
                      type="number"
                      value={newService.duration_minutes}
                      onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value || '0') })}
                      min="1"
                      step="5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service-price">Precio (€) *</Label>
                    <Input
                      id="service-price"
                      type="number"
                      step="0.01"
                      value={(newService.price_cents / 100).toFixed(2)}
                      onChange={(e) => setNewService({ ...newService, price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service-center">Centro</Label>
                    <Select
                      value={newService.center_id || 'all'}
                      onValueChange={(value) => setNewService({ ...newService, center_id: value === 'all' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background">
                        <SelectItem value="all">Todos los centros</SelectItem>
                        {centers.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="service-status">Estado</Label>
                    <Select
                      value={String(newService.active)}
                      onValueChange={(value) => setNewService({ ...newService, active: value === 'true' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background">
                        <SelectItem value="true">Activo</SelectItem>
                        <SelectItem value="false">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <Label htmlFor="service-description">Descripción</Label>
                    <Textarea
                      id="service-description"
                      value={newService.description}
                      onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                      placeholder="Descripción opcional del servicio..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={createService} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Crear Servicio
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Modal/Form para editar servicio */}
            {editingService && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      Editando: {editingService.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingService(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-service-name">Nombre *</Label>
                      <Input
                        id="edit-service-name"
                        value={editingService.name}
                        onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-service-type">Tipo</Label>
                      <Select
                        value={editingService.type}
                        onValueChange={(value: any) => setEditingService({ ...editingService, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          {serviceTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-service-duration">Duración (min) *</Label>
                      <Input
                        id="edit-service-duration"
                        type="number"
                        value={editingService.duration_minutes}
                        onChange={(e) => setEditingService({ ...editingService, duration_minutes: parseInt(e.target.value || '0') })}
                        min="1"
                        step="5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-service-price">Precio (€) *</Label>
                      <Input
                        id="edit-service-price"
                        type="number"
                        step="0.01"
                         value={editingService.price_cents ? (editingService.price_cents / 100).toFixed(2) : '0.00'}
                         onChange={(e) => {
                           const value = parseFloat(e.target.value || '0');
                           console.log('Price change:', value);
                           setEditingService({ ...editingService, price_cents: Math.round(value * 100) });
                         }}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-service-status">Estado</Label>
                      <Select
                        value={String(editingService.active)}
                        onValueChange={(value) => setEditingService({ ...editingService, active: value === 'true' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          <SelectItem value="true">Activo</SelectItem>
                          <SelectItem value="false">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <input 
                          type="checkbox" 
                          id="edit-has-discount"
                          checked={editingService.has_discount || false}
                          onChange={(e) => setEditingService({ ...editingService, has_discount: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="edit-has-discount" className="text-sm">Aplicar descuento</Label>
                      </div>
                      {editingService.has_discount && (
                        <div>
                          <Label className="text-sm">Descuento (%)</Label>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={editingService.discount_percentage || 0}
                            onChange={(e) => setEditingService({ ...editingService, discount_percentage: parseInt(e.target.value || '0') })}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <Label htmlFor="edit-service-description">Descripción</Label>
                      <Textarea
                        id="edit-service-description"
                        value={editingService.description || ''}
                        onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setEditingService(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={updateService} className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Actualizar Servicio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="packages" className="mt-6 space-y-4">
            <Accordion type="multiple" className="space-y-4">
              {/* Formulario para crear nuevo bono */}
              <AccordionItem value="create-package" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    <span className="text-lg font-semibold">Crear Nuevo Bono</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="package-name">Nombre del Bono *</Label>
                      <Input
                        id="package-name"
                        placeholder="Ej: Bono 5 Masajes"
                      />
                    </div>
                    <div>
                      <Label htmlFor="package-service">Servicio</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar servicio" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          <SelectItem value="all">Todos los servicios</SelectItem>
                          {services.map((service: any) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="package-sessions">Sesiones *</Label>
                      <Input
                        id="package-sessions"
                        type="number"
                        min="1"
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="package-price">Precio (€) *</Label>
                      <Input
                        id="package-price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="150.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="package-center">Centro</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los centros" />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          <SelectItem value="all">Todos los centros</SelectItem>
                          {centers.map((center) => (
                            <SelectItem key={center.id} value={center.id}>
                              {center.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="package-discount">Descuento (%)</Label>
                      <Input
                        id="package-discount"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="10"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="package-description">Descripción</Label>
                      <Input
                        id="package-description"
                        placeholder="Descripción opcional del bono..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => {
                      // Aquí iría la lógica para crear el bono
                      toast({ title: 'Funcionalidad pendiente', description: 'Crear bono estará disponible próximamente' });
                    }} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Crear Bono
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Bonos existentes */}
              <AccordionItem value="manage-packages" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg font-semibold">Gestionar Bonos Existentes</span>
                    <span className="text-sm text-muted-foreground mr-4">{uniquePackages.length} bonos</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {uniquePackages.map((g) => {
                      const edit = packageEdits[g.key] || { price_euros: g.price_euros, sessions_count: g.sessions_count, active: g.allActive };
                      return (
                        <div key={g.key} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium">{g.name}</div>
                              <div className="text-xs text-muted-foreground">{g.service_name ? `Servicio: ${g.service_name} · ` : ''}{edit.sessions_count} sesiones</div>
                            </div>
                            <div className="text-sm font-semibold">{currency(edit.price_euros)}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 items-end">
                            <div>
                              <Label>Precio (€)</Label>
                              <Input type="number" step="0.01" value={edit.price_euros} onChange={(e) => handlePackageChange(g.key, 'price_euros', parseFloat(e.target.value || '0'))} />
                            </div>
                            <div>
                              <Label>Sesiones</Label>
                              <Input type="number" min="1" value={edit.sessions_count} onChange={(e) => handlePackageChange(g.key, 'sessions_count', parseInt(e.target.value || '1'))} />
                            </div>
                            <div>
                              <Label>Estado</Label>
                              <Select value={String(edit.active)} onValueChange={(v) => handlePackageChange(g.key, 'active', v === 'true')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="z-50 bg-background">
                                  <SelectItem value="true">Activo</SelectItem>
                                  <SelectItem value="false">Inactivo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end">
                              <Button size="sm" onClick={() => savePackage(g.key, g.ids)}>Guardar</Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="giftcards" className="mt-6 space-y-4">
            <Accordion type="multiple" className="space-y-4">
              {/* Crear nuevas opciones de tarjetas regalo */}
              <AccordionItem value="create-giftcard" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      <span className="text-lg font-semibold">Crear Nueva Opción de Tarjeta Regalo</span>
                    </div>
                    <div className="flex items-center gap-2 mr-4">
                      <Button size="sm" variant="ghost" onClick={seedCatalogGiftOptions}>Añadir faltantes</Button>
                      {giftOptions.length === 0 && (
                        giftDenoms.length > 0 ? (
                          <Button size="sm" onClick={seedCatalogGiftOptions}>Importar catálogo</Button>
                        ) : null
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="giftcard-name">Nombre *</Label>
                      <Input
                        id="giftcard-name"
                        placeholder="Ej: Tarjeta 50€"
                      />
                    </div>
                    <div>
                      <Label htmlFor="giftcard-amount">Importe (€) *</Label>
                      <Input
                        id="giftcard-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="50.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="giftcard-status">Estado</Label>
                      <Select defaultValue="true">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background">
                          <SelectItem value="true">Activo</SelectItem>
                          <SelectItem value="false">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => {
                      // Aquí iría la lógica para crear la tarjeta regalo
                      toast({ title: 'Funcionalidad pendiente', description: 'Crear tarjeta regalo estará disponible próximamente' });
                    }} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Crear Opción
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Gestionar tarjetas regalo existentes */}
              <AccordionItem value="manage-giftcards" className="border rounded-lg">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-lg font-semibold">Gestionar Tarjetas Regalo Existentes</span>
                    <span className="text-sm text-muted-foreground mr-4">{giftOptions.length} opciones</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {giftOptions.map((opt) => {
                      const edit = giftEdits[opt.id] || { amount_euros: opt.amount_cents / 100, active: opt.is_active };
                      return (
                        <div key={opt.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{opt.name}</div>
                            <div className="text-sm font-semibold">{currency(edit.amount_euros)}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 items-end">
                            <div>
                              <Label>Importe (€)</Label>
                              <Input type="number" step="0.01" value={edit.amount_euros} onChange={(e) => handleGiftChange(opt.id, 'amount_euros', parseFloat(e.target.value || '0'))} />
                            </div>
                            <div>
                              <Label>Estado</Label>
                              <Select value={String(edit.active)} onValueChange={(v) => handleGiftChange(opt.id, 'active', v === 'true')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent className="z-50 bg-background">
                                  <SelectItem value="true">Activo</SelectItem>
                                  <SelectItem value="false">Inactivo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end">
                              <Button size="sm" onClick={() => saveGiftOption(opt.id)}>Guardar</Button>
                            </div>
                            <div className="flex justify-end">
                              <Button size="sm" variant="destructive" onClick={() => deleteGiftOption(opt.id)}>Eliminar</Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="promotions" className="mt-6">
            <PromotionsManagement />
          </TabsContent>

          <TabsContent value="happy-hours" className="mt-6">
            <HappyHourManagement />
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
}
