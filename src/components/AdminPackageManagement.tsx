import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Package, 
  Euro, 
  Edit, 
  Trash2,
  Eye,
  Save,
  X
} from 'lucide-react';
import { usePackages, useCenters, useServices } from '@/hooks/useDatabase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';

interface PackageForm {
  name: string;
  description: string;
  center_id: string;
  service_id: string;
  sessions_count: number;
  price_cents: number;
  discount_percentage: number;
}

const AdminPackageManagement = () => {
  const { packages, loading, refetch } = usePackages();
  const { centers } = useCenters();
  const { services } = useServices();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const [packageForm, setPackageForm] = useState<PackageForm>({
    name: '',
    description: '',
    center_id: '',
    service_id: '',
    sessions_count: 1,
    price_cents: 0,
    discount_percentage: 0
  });

  const resetForm = () => {
    setPackageForm({
      name: '',
      description: '',
      center_id: '',
      service_id: '',
      sessions_count: 1,
      price_cents: 0,
      discount_percentage: 0
    });
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('packages')
        .insert([{
          ...packageForm,
          active: true
        }]);

      if (error) throw error;

      toast({
        title: "Paquete creado",
        description: "El nuevo paquete ha sido creado exitosamente.",
      });

      setShowCreateDialog(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error('Error creating package:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el paquete: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdatePackage = async (packageId: string, updates: Partial<PackageForm>) => {
    try {
      const { error } = await supabase
        .from('packages')
        .update(updates)
        .eq('id', packageId);

      if (error) throw error;

      toast({
        title: "Paquete actualizado",
        description: "Los cambios han sido guardados exitosamente.",
      });

      setEditingPackage(null);
      refetch();
    } catch (error: any) {
      console.error('Error updating package:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el paquete: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (packageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('packages')
        .update({ active: !currentStatus })
        .eq('id', packageId);

      if (error) throw error;

      toast({
        title: !currentStatus ? "Paquete activado" : "Paquete desactivado",
        description: `El paquete ha sido ${!currentStatus ? 'activado' : 'desactivado'} exitosamente.`,
      });

      refetch();
    } catch (error: any) {
      console.error('Error toggling package status:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado del paquete.",
        variant: "destructive",
      });
    }
  };

  const calculateDiscountedPrice = (originalPrice: number, discount: number) => {
    return originalPrice * (1 - discount / 100);
  };

  const filteredPackages = packages.filter(pkg => {
    switch (activeTab) {
      case 'active':
        return pkg.active;
      case 'inactive':
        return !pkg.active;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Paquetes/Bonos</h2>
          <p className="text-muted-foreground">
            Administra los paquetes y bonos disponibles para la venta
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Paquete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('create_new_package')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePackage} className="space-y-4">
              <div>
                <Label htmlFor="name">{t('package_name')}</Label>
                <Input
                  id="name"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  placeholder="Ej: Bono 5 Sesiones Masaje"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                  placeholder={t('package_description')}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="center">Centro</Label>
                <Select 
                  value={packageForm.center_id} 
                  onValueChange={(value) => setPackageForm({ ...packageForm, center_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="service">{t('service')}</Label>
                <Select 
                  value={packageForm.service_id} 
                  onValueChange={(value) => setPackageForm({ ...packageForm, service_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_service')} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {(service.price_cents / 100).toFixed(2)}€
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessions">Sesiones</Label>
                  <Input
                    id="sessions"
                    type="number"
                    min="1"
                    value={packageForm.sessions_count}
                    onChange={(e) => setPackageForm({ ...packageForm, sessions_count: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Descuento (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={packageForm.discount_percentage}
                    onChange={(e) => setPackageForm({ ...packageForm, discount_percentage: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="price">Precio (€)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={(packageForm.price_cents / 100).toFixed(2)}
                  onChange={(e) => setPackageForm({ ...packageForm, price_cents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                  required
                />
                {packageForm.discount_percentage > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio con descuento: €{(calculateDiscountedPrice(packageForm.price_cents / 100, packageForm.discount_percentage)).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {t('create_package')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t('cancel')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Total Paquetes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" />
              Paquetes Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages.filter(p => p.active).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Euro className="w-4 h-4 text-yellow-600" />
              Valor Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{packages.length > 0 ? (packages.reduce((sum, p) => sum + p.price_cents, 0) / packages.length / 100).toFixed(2) : '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="active">Activos</TabsTrigger>
          <TabsTrigger value="inactive">Inactivos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' ? 'Todos los Paquetes' : 
                 activeTab === 'active' ? 'Paquetes Activos' : 'Paquetes Inactivos'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead>Sesiones</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Descuento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPackages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell className="font-medium">
                          {pkg.name}
                          {pkg.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {pkg.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {pkg.services?.name || 'N/A'}
                        </TableCell>
                        <TableCell>{pkg.sessions_count}</TableCell>
                        <TableCell>
                          €{(pkg.price_cents / 100).toFixed(2)}
                          {pkg.discount_percentage > 0 && (
                            <p className="text-xs text-green-600">
                              Con desc: €{(calculateDiscountedPrice(pkg.price_cents / 100, pkg.discount_percentage || 0)).toFixed(2)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {pkg.discount_percentage > 0 ? (
                            <Badge variant="outline" className="text-green-600">
                              {pkg.discount_percentage}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={pkg.active ? 'default' : 'secondary'}>
                            {pkg.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleActive(pkg.id, pkg.active)}
                            >
                              {pkg.active ? 'Desactivar' : 'Activar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredPackages.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No hay paquetes {activeTab === 'active' ? 'activos' : activeTab === 'inactive' ? 'inactivos' : ''} registrados.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPackageManagement;