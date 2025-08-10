import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServices, usePackages } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


const currency = (cents?: number) => typeof cents === 'number' ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(cents/100) : "-";

export default function AdminPricingPromos() {
  const { services, refetch: refetchServices } = useServices();
  const { packages, refetch: refetchPackages } = usePackages();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Precios y Promos | The Nook Madrid";
  }, []);

  // Servicios - edición rápida de precio/estado
  const [serviceEdits, setServiceEdits] = useState<Record<string, { price_cents: number; active: boolean }>>({});

  const handleServiceChange = (id: string, field: 'price_cents'|'active', value: any) => {
    setServiceEdits((prev) => ({
      ...prev,
      [id]: { price_cents: prev[id]?.price_cents ?? 0, active: prev[id]?.active ?? true, [field]: value }
    }));
  };

  const saveService = async (id: string) => {
    const patch = serviceEdits[id];
    if (!patch) return;
    const { error } = await (supabase as any).from('services').update(patch).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el servicio', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'Servicio actualizado' });
      setServiceEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
      refetchServices();
    }
  };

  // Bonos (paquetes) - edición de precio/sesiones/estado + alta
  const [packageEdits, setPackageEdits] = useState<Record<string, { price_cents: number; sessions_count: number; active: boolean }>>({});
  const [newPackage, setNewPackage] = useState<{ name: string; service_id?: string; sessions_count: number; price_cents: number; active: boolean }>({
    name: '',
    service_id: undefined,
    sessions_count: 5,
    price_cents: 0,
    active: true
  });

  const handlePackageChange = (id: string, field: 'price_cents'|'sessions_count'|'active', value: any) => {
    setPackageEdits((prev) => ({
      ...prev,
      [id]: {
        price_cents: prev[id]?.price_cents ?? packages.find(p=>p.id===id)?.price_cents ?? 0,
        sessions_count: prev[id]?.sessions_count ?? packages.find(p=>p.id===id)?.sessions_count ?? 1,
        active: prev[id]?.active ?? packages.find(p=>p.id===id)?.active ?? true,
        [field]: value
      }
    }));
  };

  const savePackage = async (id: string) => {
    const patch = packageEdits[id];
    if (!patch) return;
    const { error } = await (supabase as any).from('packages').update(patch).eq('id', id);
    if (error) {
      toast({ title:'Error', description:'No se pudo actualizar el bono', variant:'destructive' });
    } else {
      toast({ title:'Guardado', description:'Bono actualizado' });
      setPackageEdits((prev)=>{ const n={...prev}; delete n[id]; return n; });
      refetchPackages();
    }
  };

  const createPackage = async () => {
    if (!newPackage.name || newPackage.sessions_count <= 0) {
      toast({ title:'Campos requeridos', description:'Nombre y sesiones > 0', variant:'destructive' });
      return;
    }
    const { error } = await (supabase as any).from('packages').insert({
      name: newPackage.name,
      service_id: newPackage.service_id || null,
      sessions_count: newPackage.sessions_count,
      price_cents: newPackage.price_cents,
      active: newPackage.active
    });
    if (error) {
      toast({ title:'Error', description:'No se pudo crear el bono', variant:'destructive' });
    } else {
      toast({ title:'Creado', description:'Bono creado' });
      setNewPackage({ name:'', service_id: undefined, sessions_count:5, price_cents:0, active:true });
      refetchPackages();
    }
  };

  // Promociones - CRUD mínimo
  const [promo, setPromo] = useState({ name: '', type: 'percentage', value: 10, applies_to: 'all', target_id: '' as string | undefined });
  const [promos, setPromos] = useState<any[]>([]);

  const fetchPromos = async () => {
    const { data } = await (supabase as any).from('promotions').select('*').order('created_at', { ascending: false });
    setPromos(data || []);
  };
  useEffect(() => { fetchPromos(); }, []);

  const createPromo = async () => {
    if (!promo.name) return;
    const { error } = await (supabase as any).from('promotions').insert({
      name: promo.name,
      type: promo.type,
      value: promo.value,
      applies_to: promo.applies_to,
      target_id: promo.target_id || null,
      is_active: true
    });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la promoción', variant: 'destructive' });
    } else {
      toast({ title: 'Creada', description: 'Promoción creada' });
      setPromo({ name: '', type: 'percentage', value: 10, applies_to: 'all', target_id: undefined });
      fetchPromos();
    }
  };

  const togglePromo = async (id: string, is_active: boolean) => {
    const { error } = await (supabase as any).from('promotions').update({ is_active }).eq('id', id);
    if (!error) fetchPromos();
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Precios y Promos</h1>
        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="packages">Bonos</TabsTrigger>
            <TabsTrigger value="promotions">Promociones</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Servicios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map((s) => {
                    const edit = serviceEdits[s.id] || { price_cents: s.price_cents, active: s.active };
                    return (
                      <div key={s.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.type} · {s.duration_minutes} min</div>
                          </div>
                          <div className="text-sm font-semibold">{currency(s.price_cents)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <Label>Precio (céntimos)</Label>
                            <Input type="number" value={edit.price_cents} onChange={(e) => handleServiceChange(s.id, 'price_cents', parseInt(e.target.value || '0', 10))} />
                          </div>
                          <div>
                            <Label>Estado</Label>
                            <Select value={String(edit.active)} onValueChange={(v) => handleServiceChange(s.id, 'active', v === 'true')}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Activo</SelectItem>
                                <SelectItem value="false">Inactivo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <Button size="sm" onClick={() => saveService(s.id)}>Guardar</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bonos (paquetes) - precios y sesiones</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {packages.map((p) => {
                  const edit = packageEdits[p.id] || { price_cents: p.price_cents, sessions_count: p.sessions_count, active: p.active };
                  return (
                    <div key={p.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.services?.name ? `Servicio: ${p.services?.name} · ` : ''}{edit.sessions_count} sesiones</div>
                        </div>
                        <div className="text-sm font-semibold">{currency(edit.price_cents)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-end">
                        <div>
                          <Label>Precio (céntimos)</Label>
                          <Input type="number" value={edit.price_cents} onChange={(e) => handlePackageChange(p.id, 'price_cents', parseInt(e.target.value || '0', 10))} />
                        </div>
                        <div>
                          <Label>Sesiones</Label>
                          <Input type="number" value={edit.sessions_count} onChange={(e) => handlePackageChange(p.id, 'sessions_count', parseInt(e.target.value || '0', 10))} />
                        </div>
                        <div>
                          <Label>Estado</Label>
                          <Select value={String(edit.active)} onValueChange={(v) => handlePackageChange(p.id, 'active', v === 'true')}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Activo</SelectItem>
                              <SelectItem value="false">Inactivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <Button size="sm" onClick={() => savePackage(p.id)}>Guardar</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crear nuevo bono</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label>Nombre</Label>
                  <Input value={newPackage.name} onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Servicio (opcional)</Label>
                  <Select value={newPackage.service_id || ''} onValueChange={(v) => setNewPackage({ ...newPackage, service_id: v || undefined })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona servicio" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin servicio</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sesiones</Label>
                  <Input type="number" value={newPackage.sessions_count} onChange={(e) => setNewPackage({ ...newPackage, sessions_count: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div>
                  <Label>Precio (céntimos)</Label>
                  <Input type="number" value={newPackage.price_cents} onChange={(e) => setNewPackage({ ...newPackage, price_cents: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={String(newPackage.active)} onValueChange={(v) => setNewPackage({ ...newPackage, active: v === 'true' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-6 flex justify-end">
                  <Button onClick={createPackage}>Crear</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotions" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Nueva promoción</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2">
                  <Label>Nombre</Label>
                  <Input value={promo.name} onChange={(e) => setPromo({ ...promo, name: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={promo.type} onValueChange={(v) => setPromo({ ...promo, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">% Porcentaje</SelectItem>
                      <SelectItem value="fixed_amount">Importe fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input type="number" value={promo.value} onChange={(e) => setPromo({ ...promo, value: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div>
                  <Label>Aplica a</Label>
                  <Select value={promo.applies_to} onValueChange={(v) => setPromo({ ...promo, applies_to: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo</SelectItem>
                      <SelectItem value="service">Servicio</SelectItem>
                      <SelectItem value="package">Bono</SelectItem>
                      <SelectItem value="gift_card">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Target (opcional, ID)</Label>
                  <Input placeholder="UUID" value={promo.target_id || ''} onChange={(e) => setPromo({ ...promo, target_id: e.target.value || undefined })} />
                </div>
                <div className="md:col-span-6 flex justify-end">
                  <Button onClick={createPromo}>Crear</Button>
                </div>
            </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Promociones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {promos.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Sin promociones</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {promos.map((p) => (
                      <div key={p.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.type} · valor: {p.value} · {p.applies_to}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => togglePromo(p.id, !p.is_active)}>{p.is_active ? 'Desactivar' : 'Activar'}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
