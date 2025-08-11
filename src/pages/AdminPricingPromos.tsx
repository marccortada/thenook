import { useEffect, useMemo, useRef, useState } from "react";
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


import HappyHourManagement from "@/components/HappyHourManagement";

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
  // Agrupar servicios por nombre (normalizado) y duración para evitar duplicados entre centros
  const uniqueServices = useMemo(() => {
    const map = new Map<string, { ids: string[]; name: string; type: any; duration_minutes: number; price_cents: number; allActive: boolean }>();
    services.forEach((s: any) => {
      const key = `${(s.name || '').trim().toLowerCase()}|${s.duration_minutes}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          ids: [s.id],
          name: s.name,
          type: s.type,
          duration_minutes: s.duration_minutes,
          price_cents: s.price_cents,
          allActive: !!s.active,
        });
      } else {
        existing.ids.push(s.id);
        existing.price_cents = Math.min(existing.price_cents, s.price_cents);
        existing.allActive = existing.allActive && !!s.active;
      }
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [services]);

  const saveService = async (groupKey: string, ids: string[]) => {
    const patch = serviceEdits[groupKey];
    if (!patch) return;
    const { error } = await (supabase as any).from('services').update(patch).in('id', ids);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el servicio', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'Servicio actualizado en todos los centros' });
      setServiceEdits((prev) => { const n = { ...prev }; delete n[groupKey]; return n; });
      refetchServices();
    }
  };
  // Bonos (paquetes) - edición de precio/sesiones/estado + alta (agrupados sin duplicados entre centros)
  const [packageEdits, setPackageEdits] = useState<Record<string, { price_cents: number; sessions_count: number; active: boolean }>>({});
  const [newPackage, setNewPackage] = useState<{ name: string; service_id?: string; sessions_count: number; price_cents: number; active: boolean }>({
    name: '',
    service_id: undefined,
    sessions_count: 5,
    price_cents: 0,
    active: true
  });

  const uniquePackages = useMemo(() => {
    const map = new Map<string, { ids: string[]; name: string; sessions_count: number; price_cents: number; allActive: boolean; service_name?: string }>();
    packages.forEach((p: any) => {
      const key = `${(p.name || '').trim().toLowerCase()}|${p.sessions_count}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          ids: [p.id],
          name: p.name,
          sessions_count: p.sessions_count,
          price_cents: p.price_cents,
          allActive: !!p.active,
          service_name: p.services?.name
        });
      } else {
        existing.ids.push(p.id);
        existing.price_cents = Math.min(existing.price_cents, p.price_cents);
        existing.allActive = existing.allActive && !!p.active;
        if (!existing.service_name && p.services?.name) existing.service_name = p.services.name;
      }
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [packages]);

  const handlePackageChange = (groupKey: string, field: 'price_cents'|'sessions_count'|'active', value: any) => {
    const current = uniquePackages.find((g) => g.key === groupKey);
    setPackageEdits((prev) => ({
      ...prev,
      [groupKey]: {
        price_cents: prev[groupKey]?.price_cents ?? (current?.price_cents ?? 0),
        sessions_count: prev[groupKey]?.sessions_count ?? (current?.sessions_count ?? 1),
        active: prev[groupKey]?.active ?? (current?.allActive ?? true),
        [field]: value
      }
    }));
  };

  const savePackage = async (groupKey: string, ids: string[]) => {
    const patch = packageEdits[groupKey];
    if (!patch) return;
    const { error } = await (supabase as any).from('packages').update({
      price_cents: patch.price_cents,
      sessions_count: patch.sessions_count,
      active: patch.active
    }).in('id', ids);
    if (error) {
      toast({ title:'Error', description:'No se pudo actualizar el bono', variant:'destructive' });
    } else {
      toast({ title:'Guardado', description:'Bono actualizado en todos los centros' });
      setPackageEdits((prev)=>{ const n={...prev}; delete n[groupKey]; return n; });
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

  // Tarjetas regalo - opciones de importes (sin duplicados)
  const [giftOptions, setGiftOptions] = useState<any[]>([]);
  const [giftEdits, setGiftEdits] = useState<Record<string, { name: string; amount_cents: number; is_active: boolean }>>({});
  const [newGift, setNewGift] = useState<{ name: string; amount_cents: number; is_active: boolean }>({
    name: '',
    amount_cents: 0,
    is_active: true,
  });
  const [giftDenoms, setGiftDenoms] = useState<{ amount_cents: number; count: number }[]>([]);
  const seededRef = useRef(false);

  const fetchGiftOptions = async () => {
    const { data, error } = await (supabase as any)
      .from('gift_card_options')
      .select('*')
      .order('amount_cents', { ascending: true });
    if (!error) setGiftOptions(data || []);
  };

  const fetchGiftDenoms = async () => {
    const { data, error } = await (supabase as any)
      .from('gift_cards')
      .select('initial_balance_cents, status');
    if (!error) {
      const map = new Map<number, { amount_cents: number; count: number }>();
      (data || []).forEach((row: any) => {
        const amt = row.initial_balance_cents as number;
        const prev = map.get(amt);
        if (!prev) map.set(amt, { amount_cents: amt, count: 1 });
        else prev.count += 1;
      });
      const list = Array.from(map.values()).sort((a, b) => a.amount_cents - b.amount_cents);
      setGiftDenoms(list);
    }
  };
  
  useEffect(() => {
    fetchGiftOptions();
    fetchGiftDenoms();
  }, []);
  
  // Catálogo oficial de tarjetas (vinculado con inicio)
  const CATALOG_GIFT_ITEMS: { name: string; amount_cents: number }[] = [
    { name: 'Piernas Cansadas', amount_cents: 4500 },
    { name: 'Masaje Descontracturante 55 minutos', amount_cents: 6000 },
    { name: 'Reflexología Podal', amount_cents: 6000 },
    { name: 'Shiatsu', amount_cents: 6000 },
    { name: 'Masaje para Embarazada 50 minutos', amount_cents: 6000 },
    { name: 'Masaje Relajante 55 minutos', amount_cents: 6000 },
    { name: 'Masaje Deportivo 50 minutos', amount_cents: 6000 },
    { name: 'Masaje con Piedras Calientes', amount_cents: 6500 },
    { name: 'Bambuterapia Masaje con Cañas de Bambú', amount_cents: 6500 },
    { name: 'Ritual Romántico Individual', amount_cents: 7000 },
    { name: 'Ritual Energizante Individual', amount_cents: 7000 },
    { name: 'Drenaje Linfático 75 minutos', amount_cents: 7500 },
    { name: 'Antiestrés The Nook', amount_cents: 8000 },
    { name: 'Masaje para Embarazada 75 minutos', amount_cents: 8000 },
    { name: 'Masaje Descontracturante 75 minutos', amount_cents: 8000 },
    { name: 'Masaje dos Personas 45 minutos', amount_cents: 9000 },
    { name: 'Ritual del Kobido Individual', amount_cents: 9000 },
    { name: 'Masaje 90 minutos', amount_cents: 9000 },
    { name: 'Ritual Sakura Individual', amount_cents: 10000 },
    { name: 'Masaje dos Personas 55 minutos', amount_cents: 11000 },
    { name: 'Masaje a Cuatro Manos 50 minutos', amount_cents: 11000 },
    { name: 'Masaje Relajante Extra Largo 110 minutos', amount_cents: 11500 },
    { name: 'Bambuterapia Masaje con Cañas de Bambú para dos Personas', amount_cents: 12000 },
    { name: 'Masaje con Piedras Calientes para dos personas', amount_cents: 12000 },
    { name: 'Ritual Beauty Individual', amount_cents: 12500 },
    { name: 'Ritual Energizante para dos Personas', amount_cents: 13000 },
    { name: 'Ritual Romántico para dos Personas', amount_cents: 13000 },
    { name: 'Masaje dos Personas 75 minutos', amount_cents: 14000 },
    { name: 'Masaje a Cuatro Manos 80 minutos', amount_cents: 16000 },
    { name: 'Ritual del Kobido para dos Personas', amount_cents: 17000 },
    { name: 'Masaje dos Personas 110 minutos', amount_cents: 19000 },
    { name: 'Ritual Sakura para dos Personas', amount_cents: 19000 },
    { name: 'Ritual Beauty para dos Personas', amount_cents: 23000 },
    { name: 'BONO 5 masajes para Embarazada', amount_cents: 26400 },
    { name: 'BONO 5 masajes Reductor Anticelulítico', amount_cents: 26400 },
    { name: 'BONO 5 masajes 55 minutos', amount_cents: 26400 },
    { name: 'BONO 5 masajes 75 minutos', amount_cents: 35500 },
    { name: 'BONO 5 masajes dos Personas 45 minutos', amount_cents: 39600 },
    { name: 'BONO 10 masajes 55 minutos', amount_cents: 51000 },
    { name: 'BONO 10 masajes Reductor Anticelulítico', amount_cents: 51000 },
    { name: 'BONO 10 masajes para Embarazada', amount_cents: 51000 },
    { name: 'BONO 5 masajes dos Personas 75 minutos', amount_cents: 61500 },
  ];

  const seedCatalogGiftOptions = async () => {
    const { data: existing } = await (supabase as any)
      .from('gift_card_options')
      .select('id, name');
    const existingNames = new Set((existing || []).map((e: any) => (e.name || '').trim().toLowerCase()));

    const toInsert = CATALOG_GIFT_ITEMS
      .filter((i) => !existingNames.has(i.name.trim().toLowerCase()))
      .map((i) => ({ name: i.name, amount_cents: i.amount_cents, is_active: true }));

    if (toInsert.length === 0) {
      toast({ title: 'Catálogo actualizado', description: 'Ya están todas las opciones.' });
      return;
    }
    const { error } = await (supabase as any).from('gift_card_options').insert(toInsert);
    if (error) {
      toast({ title: 'Error', description: 'No se pudieron crear las tarjetas', variant: 'destructive' });
    } else {
      toast({ title: 'Listo', description: `Añadidas ${toInsert.length} tarjetas` });
      fetchGiftOptions();
    }
  };

  useEffect(() => {
    if (!seededRef.current && giftOptions.length === 0) {
      seededRef.current = true;
      seedCatalogGiftOptions();
    }
  }, [giftOptions]);

  const handleGiftChange = (id: string, field: 'name'|'amount_cents'|'is_active', value: any) => {
    const current = giftOptions.find((o: any) => o.id === id);
    setGiftEdits((prev) => ({
      ...prev,
      [id]: {
        name: prev[id]?.name ?? (current?.name ?? ''),
        amount_cents: prev[id]?.amount_cents ?? (current?.amount_cents ?? 0),
        is_active: prev[id]?.is_active ?? (current?.is_active ?? true),
        [field]: value,
      },
    }));
  };

  const saveGift = async (id: string) => {
    const patch = giftEdits[id];
    if (!patch) return;
    const { error } = await (supabase as any).from('gift_card_options').update(patch).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar la opción', variant: 'destructive' });
    } else {
      toast({ title: 'Guardado', description: 'Opción actualizada' });
      setGiftEdits((prev) => { const n = { ...prev }; delete n[id]; return n; });
      fetchGiftOptions();
    }
  };

  const createGift = async () => {
    if (!newGift.name || newGift.amount_cents <= 0) {
      toast({ title: 'Campos requeridos', description: 'Nombre y cantidad > 0', variant: 'destructive' });
      return;
    }
    const { error } = await (supabase as any).from('gift_card_options').insert(newGift);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo crear la opción (¿duplicada?)', variant: 'destructive' });
    } else {
      toast({ title: 'Creada', description: 'Opción de tarjeta creada' });
      setNewGift({ name: '', amount_cents: 0, is_active: true });
      fetchGiftOptions();
    }
  };
  const deleteGift = async (id: string) => {
    const { error } = await (supabase as any).from('gift_card_options').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    } else {
      toast({ title: 'Eliminada', description: 'Opción eliminada' });
      fetchGiftOptions();
    }
  };

  const importGiftOptions = async () => {
    const existing = new Set((giftOptions || []).map((o: any) => o.amount_cents));
    const toInsert = giftDenoms
      .filter((d) => !existing.has(d.amount_cents))
      .map((d) => ({
        name: `Tarjeta ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(d.amount_cents / 100)}`,
        amount_cents: d.amount_cents,
        is_active: true,
      }));

    if (toInsert.length === 0) {
      toast({ title: 'Nada que importar', description: 'Ya existen todas las opciones' });
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
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Precios y Promos</h1>
        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">Servicios</TabsTrigger>
            <TabsTrigger value="packages">Bonos</TabsTrigger>
            <TabsTrigger value="giftcards">Tarjetas regalo</TabsTrigger>
            <TabsTrigger value="promotions">Promociones</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Servicios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uniqueServices.map((g) => {
                    const edit = serviceEdits[g.key] || { price_cents: g.price_cents, active: g.allActive };
                    return (
                      <div key={g.key} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{g.name}</div>
                            <div className="text-xs text-muted-foreground">{g.type} · {g.duration_minutes} min</div>
                          </div>
                          <div className="text-sm font-semibold">{currency(edit.price_cents)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <Label>Precio (céntimos)</Label>
                            <Input type="number" value={edit.price_cents} onChange={(e) => handleServiceChange(g.key, 'price_cents', parseInt(e.target.value || '0', 10))} />
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

          <TabsContent value="packages" className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bonos (paquetes) - precios y sesiones</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {uniquePackages.map((g) => {
                  const edit = packageEdits[g.key] || { price_cents: g.price_cents, sessions_count: g.sessions_count, active: g.allActive };
                  return (
                    <div key={g.key} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{g.name}</div>
                          <div className="text-xs text-muted-foreground">{g.service_name ? `Servicio: ${g.service_name} · ` : ''}{edit.sessions_count} sesiones</div>
                        </div>
                        <div className="text-sm font-semibold">{currency(edit.price_cents)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 items-end">
                        <div>
                          <Label>Precio (céntimos)</Label>
                          <Input type="number" value={edit.price_cents} onChange={(e) => handlePackageChange(g.key, 'price_cents', parseInt(e.target.value || '0', 10))} />
                        </div>
                        <div>
                          <Label>Sesiones</Label>
                          <Input type="number" value={edit.sessions_count} onChange={(e) => handlePackageChange(g.key, 'sessions_count', parseInt(e.target.value || '0', 10))} />
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
                        <div className="col-span-2 flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">Se actualizará en todos los centros</div>
                          <Button size="sm" onClick={() => savePackage(g.key, g.ids)}>Guardar</Button>
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
                  <Select value={newPackage.service_id ?? 'none'} onValueChange={(v) => setNewPackage({ ...newPackage, service_id: v === 'none' ? undefined : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona servicio" /></SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      <SelectItem value="none">Sin servicio</SelectItem>
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
                     <SelectContent className="z-50 bg-background">
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

          <TabsContent value="giftcards" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Tarjetas regalo - opciones disponibles</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={seedCatalogGiftOptions}>Añadir faltantes</Button>
                  {giftOptions.length === 0 && (
                    giftDenoms.length > 0 ? (
                      <Button size="sm" variant="outline" onClick={importGiftOptions}>Crear desde existentes</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={seedCatalogGiftOptions}>Cargar sugerencias</Button>
                    )
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {giftOptions.length > 0 ? (
                  giftOptions.map((o: any) => {
                    const edit = giftEdits[o.id] || { name: o.name, amount_cents: o.amount_cents, is_active: o.is_active };
                    return (
                      <div key={o.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{edit.name}</div>
                          <div className="text-sm font-semibold">{currency(edit.amount_cents)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 items-end">
                          <div>
                            <Label>Nombre</Label>
                            <Input value={edit.name} onChange={(e) => handleGiftChange(o.id, 'name', e.target.value)} />
                          </div>
                          <div>
                            <Label>Importe (céntimos)</Label>
                            <Input type="number" value={edit.amount_cents} onChange={(e) => handleGiftChange(o.id, 'amount_cents', parseInt(e.target.value || '0', 10))} />
                          </div>
                          <div>
                            <Label>Estado</Label>
                            <Select value={String(edit.is_active)} onValueChange={(v) => handleGiftChange(o.id, 'is_active', v === 'true')}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent className="z-50 bg-background">
                                <SelectItem value="true">Activo</SelectItem>
                                <SelectItem value="false">Inactivo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2 flex justify-between">
                            <Button variant="outline" size="sm" onClick={() => deleteGift(o.id)}>Eliminar</Button>
                            <Button size="sm" onClick={() => saveGift(o.id)}>Guardar</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : giftDenoms.length > 0 ? (
                  giftDenoms.map((d) => (
                    <div key={d.amount_cents} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Tarjeta regalo</div>
                          <div className="text-xs text-muted-foreground">{d.count} en base de datos</div>
                        </div>
                        <div className="text-sm font-semibold">{currency(d.amount_cents)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">Sin opciones disponibles</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crear nueva opción</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-3">
                  <Label>Nombre</Label>
                  <Input value={newGift.name} onChange={(e) => setNewGift({ ...newGift, name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Importe (céntimos)</Label>
                  <Input type="number" value={newGift.amount_cents} onChange={(e) => setNewGift({ ...newGift, amount_cents: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={String(newGift.is_active)} onValueChange={(v) => setNewGift({ ...newGift, is_active: v === 'true' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-6 flex justify-end">
                  <Button onClick={createGift}>Crear</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotions" className="mt-6 space-y-4">
            <HappyHourManagement />
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
                     <SelectContent className="z-50 bg-background">
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
                     <SelectContent className="z-50 bg-background">
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
