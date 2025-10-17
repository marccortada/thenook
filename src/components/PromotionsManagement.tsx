import { useState, useRef, useEffect } from 'react';
import { usePromotions, CreatePromotionData } from '@/hooks/usePromotions';
import { useCenters, useServices } from '@/hooks/useDatabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppModal from "@/components/ui/app-modal";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Tag, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
];

const PromotionsManagement = () => {
  const { 
    promotions, 
    loading, 
    createPromotion, 
    updatePromotion, 
    deletePromotion, 
    togglePromotionStatus 
  } = usePromotions();
  
  const { centers, refetch: refetchCenters } = useCenters();
  const { services } = useServices();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePromotionData>({
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    applies_to: 'all_services',
    target_id: '',
    start_at: '',
    end_at: '',
    days_of_week: [],
    time_start: '',
    time_end: '',
    is_active: true
  });
  const createTriggerRef = useRef<HTMLButtonElement | null>(null);
  const lastDialogTriggerRef = useRef<HTMLElement | null>(null);
  const [dialogLayout, setDialogLayout] = useState({ top: 0, left: 0, width: 620, maxHeight: 720 });

  const baseSelectClass =
    "flex h-12 w-full rounded-2xl border border-border/60 bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 text-sm font-semibold text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      applies_to: 'all_services',
      target_id: '',
      start_at: '',
      end_at: '',
      days_of_week: [],
      time_start: '',
      time_end: '',
      is_active: true
    });
    setEditingPromotion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromotion) {
        await updatePromotion(editingPromotion, formData);
      } else {
        await createPromotion(formData);
      }
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving promotion:', error);
    }
  };

  const handleEdit = (promotion: any, trigger?: HTMLElement | null) => {
    refetchCenters(); // Refresh centers data to get updated names
    const anchor = trigger || createTriggerRef.current;
    lastDialogTriggerRef.current = anchor;
    updateDialogLayout(anchor || undefined);
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      value: promotion.value,
      applies_to: promotion.applies_to,
      target_id: promotion.target_id || '',
      start_at: promotion.start_at ? promotion.start_at.split('T')[0] : '',
      end_at: promotion.end_at ? promotion.end_at.split('T')[0] : '',
      days_of_week: promotion.days_of_week || [],
      time_start: promotion.time_start || '',
      time_end: promotion.time_end || '',
      is_active: promotion.is_active
    });
    setEditingPromotion(promotion.id);
    setShowCreateDialog(true);
  };

  const handleDaysChange = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week?.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...(prev.days_of_week || []), day]
    }));
  };

  const updateDialogLayout = (trigger?: HTMLElement | null) => {
    if (typeof window === 'undefined') return;

    if (trigger) {
      lastDialogTriggerRef.current = trigger;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const width = Math.min(620, windowWidth - 32);
    const maxHeight = Math.min(720, windowHeight - 32);

    let top = window.scrollY + (windowHeight - maxHeight) / 2;
    let left = (windowWidth - width) / 2;

    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      top = rect.top + window.scrollY - maxHeight / 2 + rect.height / 2;
      left = rect.left + rect.width / 2 - width / 2;
    }

    const minTop = window.scrollY + 16;
    const maxTop = Math.max(minTop, window.scrollY + windowHeight - maxHeight - 16);
    const minLeft = 16;
    const maxLeft = Math.max(minLeft, windowWidth - width - 16);

    setDialogLayout({
      top: Math.max(minTop, Math.min(top, maxTop)),
      left: Math.max(minLeft, Math.min(left, maxLeft)),
      width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!showCreateDialog) return;
    const trigger = lastDialogTriggerRef.current || createTriggerRef.current;
    updateDialogLayout(trigger || undefined);

    const handleReposition = () => updateDialogLayout(trigger || undefined);

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [showCreateDialog]);

  const handleOpenDialog = (trigger?: HTMLElement | null) => {
    resetForm();
    refetchCenters(); // Refresh centers data para obtener nombres actualizados
    lastDialogTriggerRef.current = trigger || createTriggerRef.current;
    updateDialogLayout(trigger || lastDialogTriggerRef.current || undefined);
    setShowCreateDialog(true);
  };

  const formatPromotionValue = (promotion: any) => {
    if (promotion.type === 'percentage') {
      return `${promotion.value}%`;
    } else {
      return `${promotion.value}€`;
    }
  };

  const formatDaysOfWeek = (days: number[]) => {
    if (!days || days.length === 0) return 'Todos los días';
    return days.sort().map(d => DAYS_OF_WEEK[d].label).join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Promociones Automáticas</h2>
          <p className="text-muted-foreground">
            Crea promociones que se aplican automáticamente según horarios, fechas y servicios
          </p>
        </div>
        <Button
          type="button"
          ref={createTriggerRef}
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Promoción
        </Button>

        {showCreateDialog && (
          <AppModal
            open={true}
            onClose={() => {
              setShowCreateDialog(false);
              resetForm();
            }}
            maxWidth={620}
            mobileMaxWidth={360}
            maxHeight={720}
          >
            <div className="flex flex-col h-full">
              <div className="px-6 pt-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">
                  {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
                </h3>
              </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto pr-2 px-6 py-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Descuento Verano"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe cuándo y cómo se aplica esta promoción automáticamente..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Descuento *</Label>
                  <select
                    id="type"
                    className={baseSelectClass}
                    value={formData.type}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, type: e.target.value as CreatePromotionData['type'] }))
                    }
                  >
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed_amount">Cantidad Fija</option>
                    <option value="happy_hour">Happy Hour</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="value">
                    Valor * {formData.type === 'percentage' ? '(%)' : '(€)'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    min="0"
                    max={formData.type === 'percentage' ? 100 : undefined}
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="applies_to">Se Aplica A *</Label>
                  <select
                    id="applies_to"
                    className={baseSelectClass}
                    value={formData.applies_to}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, applies_to: e.target.value as CreatePromotionData['applies_to'], target_id: '' }))
                    }
                  >
                    <option value="all_services">Todos los Servicios</option>
                    <option value="specific_service">Servicio Específico</option>
                    <option value="specific_center">Centro Específico</option>
                  </select>
                </div>
              </div>

              {/* Campo condicional para seleccionar servicio específico */}
              {formData.applies_to === 'specific_service' && (
                <div className="space-y-2">
                  <Label htmlFor="target_service">Servicio Específico *</Label>
                  <select
                    id="target_service"
                    className={baseSelectClass}
                    value={formData.target_id || ''}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, target_id: e.target.value }))
                    }
                  >
                    <option value="" disabled>
                      Seleccionar servicio
                    </option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campo condicional para seleccionar centro específico */}
              {formData.applies_to === 'specific_center' && (
                <div className="space-y-2">
                  <Label htmlFor="target_center">Centro Específico *</Label>
                  <select
                    id="target_center"
                    className={baseSelectClass}
                    value={formData.target_id || ''}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, target_id: e.target.value }))
                    }
                  >
                    <option value="" disabled>
                      Seleccionar centro
                    </option>
                    {centers.map(center => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_at">Fecha de Inicio</Label>
                  <Input
                    id="start_at"
                    type="date"
                    value={formData.start_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_at: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end_at">Fecha de Fin</Label>
                  <Input
                    id="end_at"
                    type="date"
                    value={formData.end_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="time_start">Hora de Inicio</Label>
                  <Input
                    id="time_start"
                    type="time"
                    value={formData.time_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_start: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time_end">Hora de Fin</Label>
                  <Input
                    id="time_end"
                    type="time"
                    value={formData.time_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Días de la Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={formData.days_of_week?.includes(day.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDaysChange(day.value)}
                    >
                      {day.label.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Promoción Activa</Label>
              </div>

              <div className="flex justify-end gap-2 pb-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingPromotion ? 'Actualizar' : 'Crear'} Promoción
                </Button>
              </div>
            </form>
            </div>
          </AppModal>
        )}
      </div>

      <div className="grid gap-4">
        {promotions.map((promotion) => (
          <Card key={promotion.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {promotion.name}
                    <Badge variant={promotion.is_active ? "default" : "secondary"}>
                      {promotion.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </CardTitle>
                  {promotion.description && (
                    <p className="text-sm text-muted-foreground">{promotion.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => handleEdit(promotion, event.currentTarget)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePromotion(promotion.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium text-2xl text-primary">
                    {formatPromotionValue(promotion)}
                  </p>
                  <p className="text-muted-foreground">
                    {promotion.type === 'percentage' ? 'Descuento' : 'Cantidad fija'}
                  </p>
                </div>
                
                {(promotion.start_at || promotion.end_at) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Período</p>
                      <p className="text-muted-foreground">
                        {promotion.start_at && format(new Date(promotion.start_at), 'dd/MM/yyyy', { locale: es })}
                        {promotion.start_at && promotion.end_at && ' - '}
                        {promotion.end_at && format(new Date(promotion.end_at), 'dd/MM/yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                )}
                
                {(promotion.time_start || promotion.time_end || promotion.days_of_week?.length) && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Horario</p>
                      <p className="text-muted-foreground">
                        {promotion.time_start && promotion.time_end && 
                          `${promotion.time_start} - ${promotion.time_end}`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDaysOfWeek(promotion.days_of_week || [])}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Se aplica a: {promotion.applies_to === 'all_services' ? 'Todos los servicios' : 
                                promotion.applies_to === 'specific_service' ? 'Servicio específico' : 'Centro específico'}
                </p>
                <Switch
                  checked={promotion.is_active}
                  onCheckedChange={(checked) => togglePromotionStatus(promotion.id, checked)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        
        {promotions.length === 0 && !loading && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No hay promociones creadas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PromotionsManagement;
