import { useState } from 'react';
import { usePromotions, CreatePromotionData } from '@/hooks/usePromotions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePromotionData>({
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    applies_to: 'all_services',
    target_id: '',
    coupon_code: '',
    start_at: '',
    end_at: '',
    days_of_week: [],
    time_start: '',
    time_end: '',
    is_active: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      applies_to: 'all_services',
      target_id: '',
      coupon_code: '',
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

  const handleEdit = (promotion: any) => {
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      value: promotion.value,
      applies_to: promotion.applies_to,
      target_id: promotion.target_id || '',
      coupon_code: promotion.coupon_code || '',
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
          <h2 className="text-2xl font-bold">Gestión de Promociones</h2>
          <p className="text-muted-foreground">
            Crea y gestiona promociones, descuentos y ofertas especiales
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Promoción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                
                <div className="space-y-2">
                  <Label htmlFor="coupon_code">Código de Cupón</Label>
                  <Input
                    id="coupon_code"
                    value={formData.coupon_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, coupon_code: e.target.value }))}
                    placeholder="Ej: VERANO2024"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe los detalles de la promoción..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Descuento *</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje</SelectItem>
                      <SelectItem value="fixed_amount">Cantidad Fija</SelectItem>
                      <SelectItem value="happy_hour">Happy Hour</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Select 
                    value={formData.applies_to} 
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, applies_to: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar aplicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_services">Todos los Servicios</SelectItem>
                      <SelectItem value="specific_service">Servicio Específico</SelectItem>
                      <SelectItem value="specific_center">Centro Específico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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

              <div className="flex justify-end gap-2">
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
          </DialogContent>
        </Dialog>
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
                    {promotion.coupon_code && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {promotion.coupon_code}
                      </Badge>
                    )}
                  </CardTitle>
                  {promotion.description && (
                    <p className="text-sm text-muted-foreground">{promotion.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(promotion)}
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
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Promoción
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PromotionsManagement;