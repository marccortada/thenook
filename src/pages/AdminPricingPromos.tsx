import { useEffect, useMemo, useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { useServices, usePackages, useCenters } from "@/hooks/useDatabase";
import { useTreatmentGroups } from "@/hooks/useTreatmentGroups";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Edit, X, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";


import PromotionsManagement from "@/components/PromotionsManagement";
import PriceDisplay from "@/components/PriceDisplay";
import { ImageUploadCropper } from "@/components/ImageUploadCropper";
import InlineSelect from "@/components/InlineSelect";


const currency = (euros?: number) => typeof euros === 'number' ? new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(euros) : "-";

export default function AdminPricingPromos() {
  const { services, refetch: refetchServices } = useServices();
  const { packages, refetch: refetchPackages } = usePackages();
  const { centers } = useCenters();
  const { treatmentGroups } = useTreatmentGroups();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const selectPopoverProps = {
    position: "popper" as const,
    side: "bottom" as const,
    align: "start" as const,
    sideOffset: 8,
    collisionPadding: 20,
    className: "z-[120] min-w-[var(--radix-select-trigger-width)] rounded-2xl border border-border/60 bg-popover px-2 py-2 shadow-xl"
  };

  const nativeSelectClass =
    "flex h-12 w-full rounded-2xl border border-border/60 bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 text-sm font-semibold text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

  useEffect(() => {
    document.title = "Precios y Promos | The Nook Madrid";
  }, []);

  // Estado para colapsar/expandir secciones
  const [isServicesCollapsed, setIsServicesCollapsed] = useState(false);

  // Servicios - edición rápida de precio/estado/descuento/visibilidad online
  const [serviceEdits, setServiceEdits] = useState<Record<string, { price_euros: number; active: boolean; has_discount: boolean; discount_price_euros: number; show_online: boolean }>>({});

  const handleServiceChange = (id: string, field: 'price_euros'|'active'|'has_discount'|'discount_price_euros'|'show_online', value: any) => {
    setServiceEdits((prev) => ({
      ...prev,
      [id]: { 
        price_euros: prev[id]?.price_euros ?? 0, 
        active: prev[id]?.active ?? true, 
        has_discount: prev[id]?.has_discount ?? false,
        discount_price_euros: prev[id]?.discount_price_euros ?? 0,
        show_online: prev[id]?.show_online ?? true,
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
    center_id: '',
    has_discount: false,
    discount_price_cents: 0,
  show_online: true
});
const [editingService, setEditingService] = useState<any>(null);
const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });

const [newPackage, setNewPackage] = useState({
  name: '',
  service_id: '',
  sessions_count: 1,
  price_euros: 0,
  center_id: 'all',
  discount_price_euros: 0,
  description: '',
});
const [isCreatingPackage, setIsCreatingPackage] = useState(false);

  const serviceTypes = [
    { value: 'massage' as const, label: 'Masaje' },
    { value: 'treatment' as const, label: 'Tratamiento' },
    { value: 'package' as const, label: 'Paquete' }
  ];

  // Group services using the same logic as client reservation selector
  const groupedServices = useMemo(() => {
    const groups = {
      'masajes-individuales': {
        id: 'masajes-individuales',
        name: 'Masajes Individuales',
        color: '#3B82F6',
        services: [] as any[],
      },
      'masajes-pareja': {
        id: 'masajes-pareja',
        name: 'Masajes para Dos',
        color: '#10B981',
        services: [] as any[],
      },
      'masajes-cuatro-manos': {
        id: 'masajes-cuatro-manos',
        name: 'Masajes a Cuatro Manos',
        color: '#F59E0B',
        services: [] as any[],
      },
      'rituales': {
        id: 'rituales',
        name: 'Rituales Individuales',
        color: '#8B5CF6',
        services: [] as any[],
      },
      'rituales-pareja': {
        id: 'rituales-pareja',
        name: 'Rituales para Dos',
        color: '#EC4899',
        services: [] as any[],
      }
    };

    console.log('AdminPricingPromos classification debug:');
    console.log('Total services:', services.length);
    
    services.forEach(service => {
      const name = service.name.toLowerCase();
      const description = (service.description || '').toLowerCase();
      const isRitualService = name.includes('ritual') || description.includes('ritual');
      const isDuoService = name.includes('dos personas') || name.includes('pareja') || name.includes('para dos') || name.includes('2 personas') || name.includes('duo') || name.includes('two') || description.includes('dos personas') || description.includes('pareja') || description.includes('para dos');
      
      console.log(`AdminPricingPromos - Service "${service.name}": isRitual=${isRitualService}, isDuo=${isDuoService}, name="${name}", description="${description}"`);
      
      if (name.includes('cuatro manos')) {
        console.log(`-> Clasificando "${service.name}" como cuatro manos`);
        groups['masajes-cuatro-manos'].services.push(service);
      } else if (isRitualService && isDuoService) {
        console.log(`-> Clasificando "${service.name}" como ritual para dos`);
        groups['rituales-pareja'].services.push(service);
      } else if (isDuoService) {
        console.log(`-> Clasificando "${service.name}" como masaje para dos`);
        groups['masajes-pareja'].services.push(service);
      } else if (isRitualService && !isDuoService) {
        console.log(`-> Clasificando "${service.name}" como ritual individual`);
        groups['rituales'].services.push(service);
      } else {
        console.log(`-> Clasificando "${service.name}" como masaje individual`);
        groups['masajes-individuales'].services.push(service);
      }
    });

    const result = Object.values(groups).filter(group => group.services.length > 0);
    console.log('AdminPricingPromos - Final groups result:', result.map(g => ({ name: g.name, services: g.services.length })));
    
    return result;
  }, [services]);

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
        has_discount: newService.has_discount,
        discount_price_cents: newService.discount_price_cents,
        show_online: newService.show_online,
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
          center_id: '',
          has_discount: false,
          discount_price_cents: 0,
          show_online: true
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
        center_id: editingService.center_id,
        active: editingService.active,
        has_discount: editingService.has_discount || false,
        discount_price_cents: editingService.discount_price_cents || 0,
        show_online: editingService.show_online ?? true
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
    console.log('Delete service called with ID:', serviceId);
    
    // First check what packages are using this service
    const { data: relatedPackages, error: packagesError } = await supabase
      .from('packages')
      .select('id, name')
      .eq('service_id', serviceId);
    
    if (packagesError) {
      toast({ title: 'Error', description: 'Error verificando paquetes relacionados', variant: 'destructive' });
      return;
    }
    
    if (relatedPackages && relatedPackages.length > 0) {
      const packageNames = relatedPackages.map(p => p.name).join(', ');
      const confirmMessage = `Este servicio está siendo usado en ${relatedPackages.length} paquete(s): ${packageNames}.\n\n¿Quieres eliminar TODOS los paquetes y el servicio? Esta acción no se puede deshacer.`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
      
      // Delete packages first
      const { error: deletePackagesError } = await supabase
        .from('packages')
        .delete()
        .eq('service_id', serviceId);
        
      if (deletePackagesError) {
        toast({ title: 'Error', description: 'Error eliminando paquetes relacionados', variant: 'destructive' });
        return;
      }
    } else {
      if (!confirm('¿Estás seguro de que quieres eliminar este servicio? Esta acción no se puede deshacer.')) {
        return;
      }
    }

    try {
      console.log('Attempting to delete service:', serviceId);
      const { error } = await supabase.from('services').delete().eq('id', serviceId);

      if (error) {
        console.error('Supabase delete error:', error);
        toast({ title: 'Error', description: `No se pudo eliminar el servicio: ${error.message}`, variant: 'destructive' });
      } else {
        console.log('Service deleted successfully');
        const message = relatedPackages && relatedPackages.length > 0 
          ? `Servicio y ${relatedPackages.length} paquete(s) eliminados exitosamente`
          : 'Servicio eliminado exitosamente';
        toast({ title: 'Eliminado', description: message });
        refetchServices();
        refetchPackages();
      }
    } catch (err) {
      console.error('Error deleting service:', err);
      toast({ title: 'Error', description: 'Error inesperado al eliminar el servicio', variant: 'destructive' });
    }
  };

  // Agrupar servicios por nombre (normalizado) y duración para evitar duplicados entre centros
  const uniqueServices = useMemo(() => {
    const map = new Map<string, { key: string; ids: string[]; name: string; type: any; duration_minutes: number; price_euros: number; allActive: boolean; hasDiscount: boolean; discountPriceEuros: number }>();
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
          discountPriceEuros: (s.discount_price_cents || 0) / 100,
        });
      } else {
        existing.ids.push(s.id);
        existing.allActive = existing.allActive && !!s.active;
        existing.hasDiscount = existing.hasDiscount && !!s.has_discount;
        existing.discountPriceEuros = (s.discount_price_cents || 0) / 100;
      }
    });
    return Array.from(map.values());
  }, [services]);

  const saveService = async (key: string, ids: string[]) => {
    const edit = serviceEdits[key];
    if (!edit) return;

    const priceCents = Math.round(edit.price_euros * 100);
    const discountPriceCents = Math.round(edit.discount_price_euros * 100);
    for (const id of ids) {
      await supabase.from('services').update({ 
        price_cents: priceCents, 
        active: edit.active,
        has_discount: edit.has_discount,
        discount_price_cents: discountPriceCents,
        show_online: edit.show_online
      }).eq('id', id);
    }
    toast({ title: 'Guardado', description: 'Servicio actualizado en todos los centros' });
    delete serviceEdits[key];
    setServiceEdits({...serviceEdits});
    refetchServices();
  };

  // Bonos (paquetes) - edición de precio/sesiones/estado/visibilidad online + alta (agrupados sin duplicados entre centros)
  const [packageEdits, setPackageEdits] = useState<Record<string, { price_euros: number; sessions_count: number; active: boolean; has_discount: boolean; discount_price_euros: number; show_online: boolean }>>({});
  const handlePackageChange = (id: string, field: 'price_euros'|'sessions_count'|'active'|'has_discount'|'discount_price_euros'|'show_online', value: any) => {
    setPackageEdits((prev) => ({
      ...prev,
      [id]: { 
        price_euros: prev[id]?.price_euros ?? 0, 
        sessions_count: prev[id]?.sessions_count ?? 1, 
        active: prev[id]?.active ?? true, 
        has_discount: prev[id]?.has_discount ?? false,
        discount_price_euros: prev[id]?.discount_price_euros ?? 0,
        show_online: prev[id]?.show_online ?? true,
        [field]: value
      }
    }));
  };

  const uniquePackages = useMemo(() => {
    const map = new Map<string, { key: string; ids: string[]; name: string; service_name?: string; sessions_count: number; price_euros: number; allActive: boolean; hasDiscount: boolean; discountPriceEuros: number }>();
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
          hasDiscount: !!p.has_discount,
          discountPriceEuros: (p.discount_price_cents || 0) / 100,
        });
      } else {
        existing.ids.push(p.id);
        existing.allActive = existing.allActive && !!p.active;
        existing.hasDiscount = existing.hasDiscount && !!p.has_discount;
        existing.discountPriceEuros = (p.discount_price_cents || 0) / 100;
      }
    });
    return Array.from(map.values());
  }, [packages]);

  const savePackage = async (key: string, ids: string[]) => {
    const edit = packageEdits[key];
    if (!edit) return;

    const priceCents = Math.round(edit.price_euros * 100);
    const discountPriceCents = Math.round(edit.discount_price_euros * 100);
    for (const id of ids) {
      await supabase.from('packages').update({ 
        price_cents: priceCents, 
        sessions_count: edit.sessions_count,
        active: edit.active,
        has_discount: edit.has_discount,
        discount_price_cents: discountPriceCents,
        show_online: edit.show_online
      }).eq('id', id);
    }
    toast({ title: 'Guardado', description: 'Bono actualizado en todos los centros' });
    delete packageEdits[key];
    setPackageEdits({ ...packageEdits });
    refetchPackages();
  };

  const isPackageFormValid =
    newPackage.name.trim().length > 0 &&
    newPackage.sessions_count > 0 &&
    newPackage.price_euros > 0;

  const handleCreatePackage = async () => {
    if (!isPackageFormValid || isCreatingPackage) return;

    setIsCreatingPackage(true);
    try {
      const hasDiscount = newPackage.discount_price_euros > 0;
      const { error } = await supabase.from('packages').insert({
        name: newPackage.name.trim(),
        service_id: newPackage.service_id || null,
        center_id: newPackage.center_id === 'all' ? null : newPackage.center_id,
        sessions_count: newPackage.sessions_count,
        price_cents: Math.round(newPackage.price_euros * 100),
        description: newPackage.description ? newPackage.description.trim() : null,
        active: true,
        has_discount: hasDiscount,
        discount_price_cents: hasDiscount ? Math.round(newPackage.discount_price_euros * 100) : 0,
        show_online: true,
      });

      if (error) {
        throw error;
      }

      toast({ title: 'Bono creado', description: 'Se creó el nuevo bono correctamente.' });
      setNewPackage({
        name: '',
        service_id: '',
        sessions_count: 1,
        price_euros: 0,
        center_id: 'all',
        discount_price_euros: 0,
        description: '',
      });
      refetchPackages();
    } catch (err: any) {
      console.error('Error creating package:', err);
      toast({
        title: 'Error al crear bono',
        description: err?.message || 'No se pudo crear el bono. Inténtalo nuevamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingPackage(false);
    }
  };

  // Tarjetas regalo - opciones de importes (sin duplicados) con visibilidad online
  const [giftOptions, setGiftOptions] = useState<any[]>([]);
  const [giftEdits, setGiftEdits] = useState<Record<string, { amount_euros: number; active: boolean; show_online: boolean }>>({});
  const [newGiftCard, setNewGiftCard] = useState({
    name: '',
    description: '',
    amount_euros: 0,
    active: true,
    show_online: true,
    image: null as File | null,
    imageCrop: null as { x: number; y: number; width: number; height: number } | null
  });
  const giftDenoms = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300];

  const fetchGiftOptions = async () => {
    const { data } = await supabase.from('gift_card_options').select('*').order('amount_cents');
    setGiftOptions(data || []);
  };

  useEffect(() => {
    fetchGiftOptions();
  }, []);

  const handleGiftChange = (id: string, field: 'amount_euros'|'active'|'show_online', value: any) => {
    setGiftEdits((prev) => ({
      ...prev,
      [id]: { amount_euros: prev[id]?.amount_euros ?? 0, active: prev[id]?.active ?? true, show_online: prev[id]?.show_online ?? true, [field]: value }
    }));
  };

  const saveGiftOption = async (id: string) => {
    const edit = giftEdits[id];
    if (!edit) return;

    const amountCents = Math.round(edit.amount_euros * 100);
    await supabase.from('gift_card_options').update({ amount_cents: amountCents, is_active: edit.active, show_online: edit.show_online }).eq('id', id);
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

  const createGiftCardOption = async () => {
    console.log('Creating gift card option with data:', newGiftCard);
    
    if (!newGiftCard.name || !newGiftCard.amount_euros) {
      toast({ title: 'Campos requeridos', description: 'Nombre e importe son obligatorios', variant: 'destructive' });
      return;
    }

    try {
      let imageUrl = null;

      // Upload image to Supabase storage if provided
      if (newGiftCard.image) {
        console.log('Uploading image:', newGiftCard.image);
        const fileExt = newGiftCard.image.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gift-cards')
          .upload(fileName, newGiftCard.image, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          toast({ title: 'Error', description: `No se pudo subir la imagen: ${uploadError.message}`, variant: 'destructive' });
          return;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('gift-cards')
          .getPublicUrl(uploadData.path);
        
        imageUrl = publicUrl;
        console.log('Image uploaded successfully, URL:', imageUrl);
      }
      
      const insertData = {
        name: newGiftCard.name,
        description: newGiftCard.description || null,
        image_url: imageUrl,
        amount_cents: Math.round(newGiftCard.amount_euros * 100),
        is_active: newGiftCard.active,
        show_online: newGiftCard.show_online
      };
      
      console.log('Inserting gift card option:', insertData);
      
      const { data, error } = await supabase.from('gift_card_options').insert(insertData).select();

      if (error) {
        console.error('Database error:', error);
        toast({ title: 'Error', description: `No se pudo crear la opción: ${error.message}`, variant: 'destructive' });
      } else {
        console.log('Gift card option created successfully:', data);
        toast({ title: 'Creada', description: 'Opción de tarjeta regalo creada exitosamente' });
        setNewGiftCard({
          name: '',
          description: '',
          amount_euros: 0,
          active: true,
          show_online: true,
          image: null,
          imageCrop: null
        });
        fetchGiftOptions();
      }
    } catch (error) {
      console.error('Error creating gift card option:', error);
      toast({ title: 'Error', description: `Error inesperado al crear la opción: ${error}`, variant: 'destructive' });
    }
  };

  const handleGiftCardImageSelect = (file: File, cropData?: { x: number; y: number; width: number; height: number }) => {
    setNewGiftCard(prev => ({
      ...prev,
      image: file,
      imageCrop: cropData || null
    }));
  };

  const deleteAllGiftOptions = async () => {
    try {
      const { data, error } = await supabase.from('gift_card_options').select('id');
      if (error) throw error;
      const ids = (data || []).map((d: any) => d.id);
      if (!ids.length) {
        toast({ title: 'Sin opciones', description: 'No hay opciones para eliminar' });
        return;
      }
      const { error: delError } = await supabase.from('gift_card_options').delete().in('id', ids);
      if (delError) throw delError;
      toast({ title: 'Eliminadas', description: 'Se eliminaron todas las opciones de tarjetas regalo' });
      fetchGiftOptions();
    } catch (err: any) {
      console.error('Error deleting all gift options:', err);
      toast({ title: 'Error', description: err?.message || 'No se pudieron eliminar las opciones', variant: 'destructive' });
    }
  };

  const handleDeleteAllGiftOptions = async () => {
    if (!confirm('¿Seguro que deseas eliminar TODAS las opciones de tarjetas regalo?')) return;
    await deleteAllGiftOptions();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">
            Precios y Promos - The Nook Madrid
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="manage-services">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4 gap-1 h-auto p-1">
            <TabsTrigger value="manage-services" className="text-xs sm:text-sm px-2 py-2">Gestión</TabsTrigger>
            <TabsTrigger value="packages" className="text-xs sm:text-sm px-2 py-2">Bonos</TabsTrigger>
            <TabsTrigger value="giftcards" className="text-xs sm:text-sm px-2 py-2">Tarjetas</TabsTrigger>
            <TabsTrigger value="promotions" className="text-xs sm:text-sm px-2 py-2">Promos</TabsTrigger>
            
          </TabsList>

          <TabsContent value="manage-services" className="mt-6 space-y-4">
            {/* Todos los servicios en una sola vista */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Todos los Servicios</CardTitle>
                    <div className="text-sm text-muted-foreground">{services.length} servicios</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsServicesCollapsed(!isServicesCollapsed)}
                    className="h-8 w-8 p-0"
                  >
                    {isServicesCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {!isServicesCollapsed && (
              <CardContent>
                <Accordion type="multiple" className="w-full space-y-4">
                  {groupedServices.map((group) => (
                    <AccordionItem key={group.id} value={group.id} className="border rounded-lg">
                      <AccordionTrigger className="px-3 py-2 sm:px-4 sm:py-3 hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="text-lg font-semibold">{group.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({group.services.length} servicios)
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.services.map((service: any) => (
                            <div key={service.id} className="border rounded-lg p-4 service-card">
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
                                         discount_price_cents: service.discount_price_cents || 0
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Obtener la tarjeta del servicio (parent del botón)
                                    const serviceCard = e.currentTarget.closest('.service-card') as HTMLElement;
                                    if (!serviceCard) return;
                                    
                                    const cardRect = serviceCard.getBoundingClientRect();
                                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                                    const windowHeight = window.innerHeight;
                                    const windowWidth = window.innerWidth;
                                    
                                    // Dimensiones del modal responsive
                                    const modalWidth = Math.min(isMobile ? 350 : 1000, windowWidth - 40);
                                    const modalHeight = Math.min(isMobile ? windowHeight - 40 : 700, windowHeight - 80);
                                    
                                    // Calcular posición
                                    let top = cardRect.top + scrollTop - 50; // Un poco arriba de la tarjeta
                                    let left = (windowWidth - modalWidth) / 2; // Centrado horizontalmente
                                    
                                    // Ajustar verticalmente para que esté siempre visible
                                    const viewportTop = scrollTop + 20;
                                    const viewportBottom = scrollTop + windowHeight - 20;
                                    
                                    if (top < viewportTop) {
                                      top = viewportTop;
                                    } else if (top + modalHeight > viewportBottom) {
                                      top = viewportBottom - modalHeight;
                                    }
                                    
                                    // Asegurar que no se salga horizontalmente
                                    if (left < 20) left = 20;
                                    if (left + modalWidth > windowWidth - 20) left = windowWidth - modalWidth - 20;
                                    
                                    console.log('Service edit modal position:', { top, left, cardTop: cardRect.top, scrollTop });
                                    
                                    setModalPosition({ top, left });
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
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteService(service.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
              )}
            </Card>

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
                       <SelectContent position="popper" side="bottom" align="center" sideOffset={2} collisionPadding={8} sticky="always" className="z-[9999] bg-popover border shadow-md min-w-[var(--radix-select-trigger-width)]">
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
                       <SelectContent
                         position="popper"
                         side="bottom"
                         align="start"
                         sideOffset={4}
                         avoidCollisions={true}
                         collisionPadding={20}
                         className="z-[100] min-w-[170px] rounded-2xl border border-border/60 bg-white px-2 py-2 shadow-xl"
                       >
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
                      <SelectContent position="item-aligned">
                        <SelectItem value="true">Activo</SelectItem>
                        <SelectItem value="false">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <input 
                        type="checkbox" 
                        id="new-has-discount"
                        checked={newService.has_discount}
                        onChange={(e) => setNewService({ ...newService, has_discount: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="new-has-discount" className="text-sm">Aplicar descuento</Label>
                    </div>
                    {newService.has_discount && (
                      <div>
                        <Label className="text-sm">Precio con descuento (€)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={(newService.discount_price_cents / 100).toFixed(2)}
                          onChange={(e) => setNewService({ ...newService, discount_price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                          min="0"
                          className="text-sm"
                        />
                      </div>
                    )}
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
                <div className="flex gap-2 justify-end mt-4">
                  <Button onClick={createService} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Crear Servicio
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Modal/Form para editar servicio */}
            {editingService && (
              <>
                {/* Overlay */}
                <div 
                  className="fixed inset-0 bg-black/50 z-40"
                  onClick={() => setEditingService(null)}
                />
                
                {/* Modal */}
                <div 
                  className="fixed z-50 bg-white rounded-lg shadow-2xl border"
                  style={{
                    top: `${modalPosition.top}px`,
                    left: `${modalPosition.left}px`,
                    width: `${isMobile ? Math.min(350, window.innerWidth - 20) : Math.min(1000, window.innerWidth - 40)}px`,
                    maxHeight: `${isMobile ? window.innerHeight - 40 : Math.min(700, window.innerHeight - 80)}px`,
                    overflowY: 'auto'
                  }}
                >
                  <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between ${isMobile ? 'mb-4' : 'mb-6'}`}>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Edit className={`text-primary ${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
                        <h3 className={`font-semibold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                          Editando: {editingService.name}
                        </h3>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingService(null)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-3 sm:space-y-4">
                      <div className={`gap-3 ${isMobile ? 'grid grid-cols-1 space-y-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                        <div>
                          <Label htmlFor="edit-service-name" className={isMobile ? 'text-xs' : ''}>Nombre *</Label>
                          <Input
                            id="edit-service-name"
                            value={editingService.name}
                            onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                            className={isMobile ? 'text-sm' : ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-service-type" className={isMobile ? 'text-xs' : ''}>Tipo</Label>
                          <select
                            id="edit-service-type"
                            value={editingService.type}
                            onChange={(e) => setEditingService({ ...editingService, type: e.target.value })}
                            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isMobile ? 'text-sm' : 'text-sm'}`}
                          >
                            {serviceTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="edit-service-duration" className={isMobile ? 'text-xs' : ''}>Duración (min) *</Label>
                          <Input
                            id="edit-service-duration"
                            type="number"
                            value={editingService.duration_minutes}
                            onChange={(e) => setEditingService({ ...editingService, duration_minutes: parseInt(e.target.value || '0') })}
                            min="1"
                            step="5"
                            className={isMobile ? 'text-sm' : ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-service-price" className={isMobile ? 'text-xs' : ''}>Precio (€) *</Label>
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
                            className={isMobile ? 'text-sm' : ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-service-status" className={isMobile ? 'text-xs' : ''}>Estado</Label>
                          <select
                            id="edit-service-status"
                            value={editingService.active ? 'true' : 'false'}
                            onChange={(e) => {
                              console.log('Estado changed to:', e.target.value);
                              setEditingService({ ...editingService, active: e.target.value === 'true' });
                            }}
                            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isMobile ? 'text-sm' : 'text-sm'}`}
                          >
                            <option value="true">Activo</option>
                            <option value="false">Inactivo</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="edit-service-center" className={isMobile ? 'text-xs' : ''}>Centro</Label>
                          <select
                            id="edit-service-center"
                            value={editingService.center_id || 'all'}
                            onChange={(e) => {
                              console.log('Centro changed to:', e.target.value);
                              setEditingService({ 
                                ...editingService, 
                                center_id: e.target.value === 'all' ? null : e.target.value 
                              });
                            }}
                            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isMobile ? 'text-sm' : 'text-sm'}`}
                          >
                            <option value="all">Ambos centros</option>
                            {centers.map((center) => (
                              <option key={center.id} value={center.id}>
                                {center.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className={isMobile ? '' : 'col-span-2'}>
                          <div className="flex items-center space-x-2 mb-2">
                            <input 
                              type="checkbox" 
                              id="edit-has-discount"
                              checked={editingService.has_discount || false}
                              onChange={(e) => setEditingService({ ...editingService, has_discount: e.target.checked })}
                              className="rounded"
                            />
                            <Label htmlFor="edit-has-discount" className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Aplicar descuento</Label>
                          </div>
                          {editingService.has_discount && (
                            <div>
                              <Label className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Precio con descuento (€)</Label>
                              <Input 
                                type="text" 
                                placeholder="Escribe el precio: 85,50"
                                defaultValue=""
                                onBlur={(e) => {
                                  if (e.target.value) {
                                    const value = e.target.value.replace(',', '.');
                                    const numValue = parseFloat(value);
                                    if (!isNaN(numValue) && numValue > 0) {
                                      setEditingService({ ...editingService, discount_price_cents: Math.round(numValue * 100) });
                                    }
                                  }
                                }}
                                className={`${isMobile ? 'text-xs' : 'text-sm'}`}
                              />
                            </div>
                          )}
                        </div>
                        <div className={isMobile ? '' : 'md:col-span-2 lg:col-span-3'}>
                          <Label htmlFor="edit-service-description" className={isMobile ? 'text-xs' : ''}>Descripción</Label>
                          <Textarea
                            id="edit-service-description"
                            value={editingService.description || ''}
                            onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                            rows={isMobile ? 2 : 3}
                            className={isMobile ? 'text-sm' : ''}
                          />
                        </div>
                      </div>
                      <div className={`flex gap-2 mt-4 ${isMobile ? 'flex-col' : 'justify-end'}`}>
                        <Button 
                          variant="outline" 
                          onClick={() => setEditingService(null)}
                          size={isMobile ? "sm" : "default"}
                          className={isMobile ? 'flex-1' : ''}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={updateService} 
                          className={`flex items-center gap-2 ${isMobile ? 'flex-1' : ''}`}
                          size={isMobile ? "sm" : "default"}
                        >
                          <Edit className="h-4 w-4" />
                          <span className={isMobile ? 'text-xs' : ''}>Actualizar Servicio</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
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
                        value={newPackage.name}
                        onChange={(e) =>
                          setNewPackage(prev => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="package-service">Servicio</Label>
                      <select
                        id="package-service"
                        className={nativeSelectClass}
                        value={newPackage.service_id}
                        onChange={(e) =>
                          setNewPackage(prev => ({ ...prev, service_id: e.target.value }))
                        }
                      >
                        <option value="">Todos los servicios</option>
                        {services.map((service: any) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="package-sessions">Sesiones *</Label>
                      <Input
                        id="package-sessions"
                        type="number"
                        min="1"
                        value={newPackage.sessions_count}
                        onChange={(e) =>
                          setNewPackage(prev => ({
                            ...prev,
                            sessions_count: Math.max(1, parseInt(e.target.value || '1', 10)),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="package-price">Precio (€) *</Label>
                      <Input
                        id="package-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          Number.isFinite(newPackage.price_euros)
                            ? newPackage.price_euros
                            : ''
                        }
                        onChange={(e) =>
                          setNewPackage(prev => ({
                            ...prev,
                            price_euros: Math.max(0, parseFloat(e.target.value || '0')),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="package-center">Centro</Label>
                      <select
                        id="package-center"
                        className={nativeSelectClass}
                        value={newPackage.center_id}
                        onChange={(e) =>
                          setNewPackage(prev => ({ ...prev, center_id: e.target.value }))
                        }
                      >
                        <option value="all">Todos los centros</option>
                        {centers.map((center) => (
                          <option key={center.id} value={center.id}>
                            {center.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="package-discount">Descuento (€)</Label>
                      <Input
                        id="package-discount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={
                          Number.isFinite(newPackage.discount_price_euros)
                            ? newPackage.discount_price_euros
                            : ''
                        }
                        onChange={(e) =>
                          setNewPackage(prev => ({
                            ...prev,
                            discount_price_euros: Math.max(0, parseFloat(e.target.value || '0')),
                          }))
                        }
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="package-description">Descripción</Label>
                      <Input
                        id="package-description"
                        placeholder="Descripción opcional del bono..."
                        value={newPackage.description}
                        onChange={(e) =>
                          setNewPackage(prev => ({ ...prev, description: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={handleCreatePackage}
                      disabled={!isPackageFormValid || isCreatingPackage}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {isCreatingPackage ? 'Creando...' : 'Crear Bono'}
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
                       const edit = packageEdits[g.key] || { 
                         price_euros: g.price_euros, 
                         sessions_count: g.sessions_count, 
                         active: g.allActive,
                         has_discount: g.hasDiscount,
                         discount_price_euros: g.discountPriceEuros,
                         show_online: true  // Default value
                       };
                      const finalPrice = edit.has_discount ? edit.discount_price_euros : edit.price_euros;
                      return (
                        <div key={g.key} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="font-medium">{g.name}</div>
                              <div className="text-xs text-muted-foreground">{g.service_name ? `Servicio: ${g.service_name} · ` : ''}{edit.sessions_count} sesiones</div>
                            </div>
                            <div className="text-right">
                              {edit.has_discount ? (
                                <div>
                                  <div className="text-xs text-muted-foreground line-through">{currency(edit.price_euros)}</div>
                                  <div className="text-sm font-semibold text-primary">{currency(finalPrice)}</div>
                                </div>
                              ) : (
                                <div className="text-sm font-semibold">{currency(finalPrice)}</div>
                              )}
                            </div>
                          </div>
                           <div className="grid grid-cols-3 gap-2 items-end">
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
                               <InlineSelect
                                 value={String(edit.active)}
                                 onChange={(v) => handlePackageChange(g.key, 'active', v === 'true')}
                                 options={[
                                   { label: 'Activo', value: 'true' },
                                   { label: 'Inactivo', value: 'false' }
                                 ]}
                               />
                             </div>
                             <div>
                               <Label>Mostrar Online</Label>
                               <InlineSelect
                                 value={String(edit.show_online)}
                                 onChange={(v) => handlePackageChange(g.key, 'show_online', v === 'true')}
                                 options={[
                                   { label: 'Sí', value: 'true' },
                                   { label: 'No', value: 'false' }
                                 ]}
                               />
                             </div>
                            
                             {edit.show_online && (
                               <div className="col-span-3 mt-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                                 <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                   <Settings className="h-4 w-4" />
                                   <span>Visibilidad online</span>
                                 </div>
                                 <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                   <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                                     <span>Estado online</span>
                                     <span className="font-medium text-green-600">Visible</span>
                                   </div>
                                   <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                                     <span>Disponible para compra</span>
                                     <span className="font-medium text-blue-600">Habilitado</span>
                                   </div>
                                 </div>
                                 <p className="mt-3 text-xs text-muted-foreground">
                                   Este bono aparecerá en la tienda online y estará disponible para comprar.
                                 </p>
                               </div>
                             )}
                             
                             <div className="col-span-2 flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id={`discount-${g.key}`}
                                checked={edit.has_discount}
                                onChange={(e) => handlePackageChange(g.key, 'has_discount', e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor={`discount-${g.key}`} className="text-sm">Descuento</Label>
                            </div>
                            {edit.has_discount && (
                               <div className="col-span-3">
                                <Label className="text-sm">Precio con descuento (€)</Label>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  value={edit.discount_price_euros}
                                  onChange={(e) => handlePackageChange(g.key, 'discount_price_euros', parseFloat(e.target.value || '0'))}
                                  min="0"
                                  className="text-sm"
                                />
                              </div>
                            )}
                            <div className="col-span-3 flex justify-end">
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
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <div>
                       <Label htmlFor="giftcard-name">Nombre *</Label>
                       <Input
                         id="giftcard-name"
                         placeholder="Ej: Tarjeta 50€"
                         value={newGiftCard.name}
                         onChange={(e) => setNewGiftCard(prev => ({ ...prev, name: e.target.value }))}
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
                         value={newGiftCard.amount_euros || ''}
                         onChange={(e) => setNewGiftCard(prev => ({ ...prev, amount_euros: parseFloat(e.target.value) || 0 }))}
                       />
                     </div>
                      <div>
                        <Label htmlFor="giftcard-status">Estado</Label>
                        <InlineSelect
                          value={String(newGiftCard.active)}
                          onChange={(v) => setNewGiftCard(prev => ({ ...prev, active: v === 'true' }))}
                          options={[{ label: 'Activo', value: 'true' }, { label: 'Inactivo', value: 'false' }]}
                        />
                      </div>
                      <div>
                        <Label htmlFor="giftcard-show-online">Mostrar Online</Label>
                        <InlineSelect
                          value={String(newGiftCard.show_online)}
                          onChange={(v) => setNewGiftCard(prev => ({ ...prev, show_online: v === 'true' }))}
                          options={[{ label: 'Sí', value: 'true' }, { label: 'No', value: 'false' }]}
                        />
                      </div>
                    </div>
                    
                    {newGiftCard.show_online && (
                      <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Settings className="h-4 w-4" />
                          <span>Vista previa online</span>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                          <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                            <span>Estado online</span>
                            <span className="font-medium text-green-600">Visible</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                            <span>Disponible para compra</span>
                            <span className="font-medium text-blue-600">Habilitado</span>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Esta tarjeta regalo aparecerá en la tienda online inmediatamente después de crearla.
                        </p>
                      </div>
                    )}
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <Label htmlFor="giftcard-description">Descripción</Label>
                      <Textarea
                        id="giftcard-description"
                        placeholder="Descripción de la tarjeta regalo..."
                        value={newGiftCard.description}
                        onChange={(e) => setNewGiftCard(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div>
                      <ImageUploadCropper
                        label="Imagen de la tarjeta regalo (opcional)"
                        onImageSelect={handleGiftCardImageSelect}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button onClick={createGiftCardOption} className="flex items-center gap-2">
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
                    <span className="text-sm text-muted-foreground">{giftOptions.length} opciones</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteAllGiftOptions}
                    >
                      Eliminar todas
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {giftOptions.map((opt) => {
                      const edit = giftEdits[opt.id] || { amount_euros: opt.amount_cents / 100, active: opt.is_active, show_online: opt.show_online ?? true };
                      return (
                        <div key={opt.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{opt.name}</div>
                            <div className="text-sm font-semibold">{currency(edit.amount_euros)}</div>
                          </div>
                          {opt.image_url && (
                            <div className="mb-2">
                              <img src={opt.image_url} alt={opt.name} className="w-full h-20 object-cover rounded" />
                            </div>
                          )}
                           <div className="grid grid-cols-3 gap-2 items-end">
                             <div>
                               <Label>Importe (€)</Label>
                               <Input type="number" step="0.01" value={edit.amount_euros} onChange={(e) => handleGiftChange(opt.id, 'amount_euros', parseFloat(e.target.value || '0'))} />
                             </div>
                             <div>
                               <Label>Estado</Label>
                               <InlineSelect
                                 value={String(edit.active)}
                                 onChange={(v) => handleGiftChange(opt.id, 'active', v === 'true')}
                                 options={[{ label: 'Activo', value: 'true' }, { label: 'Inactivo', value: 'false' }]}
                               />
                             </div>
                             <div>
                               <Label>Mostrar Online</Label>
                               <InlineSelect
                                 value={String(edit.show_online)}
                                 onChange={(v) => handleGiftChange(opt.id, 'show_online', v === 'true')}
                                 options={[{ label: 'Sí', value: 'true' }, { label: 'No', value: 'false' }]}
                               />
                             </div>
                            
                             {edit.show_online && (
                               <div className="col-span-3 mt-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                                 <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                   <Settings className="h-4 w-4" />
                                   <span>Visibilidad online</span>
                                 </div>
                                 <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                   <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                                     <span>Estado online</span>
                                     <span className="font-medium text-green-600">Visible</span>
                                   </div>
                                   <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                                     <span>Disponible para compra</span>
                                     <span className="font-medium text-blue-600">Habilitado</span>
                                   </div>
                                 </div>
                                 <p className="mt-3 text-xs text-muted-foreground">
                                   Esta tarjeta regalo aparece en la tienda online y puede comprarse desde la web.
                                 </p>
                               </div>
                             )}
                             
                             <div className="col-span-3 mb-2">
                              <input 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                id={`image-upload-${opt.id}`}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      console.log('Uploading image for gift card:', opt.id);
                                      const fileExt = file.name.split('.').pop();
                                      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                                      
                                      const { data: uploadData, error: uploadError } = await supabase.storage
                                        .from('gift-cards')
                                        .upload(fileName, file, { cacheControl: '3600', upsert: false });

                                      if (uploadError) {
                                        console.error('Upload error:', uploadError);
                                        throw uploadError;
                                      }

                                      console.log('Upload successful:', uploadData);
                                      const { data: { publicUrl } } = supabase.storage
                                        .from('gift-cards')
                                        .getPublicUrl(uploadData.path);
                                      
                                      console.log('Public URL:', publicUrl);
                                      const { error: updateError } = await supabase.from('gift_card_options')
                                        .update({ image_url: publicUrl })
                                        .eq('id', opt.id);

                                      if (updateError) {
                                        console.error('Update error:', updateError);
                                        throw updateError;
                                      }

                                      console.log('Image URL updated successfully');
                                      toast({ title: 'Imagen actualizada', description: 'La imagen se ha subido correctamente' });
                                      fetchGiftOptions();
                                    } catch (error) {
                                      console.error('Error uploading image:', error);
                                      toast({ title: 'Error', description: 'No se pudo subir la imagen', variant: 'destructive' });
                                    }
                                  }
                                }}
                              />
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  const input = document.getElementById(`image-upload-${opt.id}`) as HTMLInputElement;
                                  input?.click();
                                }}
                                className="w-full"
                              >
                                {opt.image_url ? 'Cambiar imagen' : 'Subir imagen'}
                              </Button>
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

        </Tabs>
        </div>
      </main>
    </div>
  );
}
