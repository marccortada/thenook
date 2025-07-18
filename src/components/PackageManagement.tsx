import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Gift, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Plus, 
  User,
  CalendarDays,
  Euro,
  RotateCcw,
  Edit3,
  Trash2,
  QrCode,
  AlertCircle
} from 'lucide-react';
import { useClientPackages, useExpiringPackages, type ClientPackage } from '@/hooks/useClientPackages';
import { usePackages } from '@/hooks/useDatabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PackageManagement = () => {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  
  const { packages, loading, error, refetch, createPackage, usePackageSession, cancelPackage, updatePackageNotes } = useClientPackages(selectedClient);
  const { expiringPackages, loading: expiringLoading, refetch: refetchExpiring } = useExpiringPackages(7);
  const { packages: availablePackages } = usePackages();

  const getStatusColor = (status: ClientPackage['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'used_up':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: ClientPackage['status']) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'expired':
        return 'Expirado';
      case 'used_up':
        return 'Agotado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getProgressPercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  const handleCreatePackage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const packageData = {
      client_id: formData.get('client_id') as string,
      package_id: formData.get('package_id') as string,
      expiry_date: formData.get('expiry_date') as string,
      purchase_price_cents: parseInt(formData.get('purchase_price_cents') as string) * 100,
      total_sessions: parseInt(formData.get('total_sessions') as string),
      notes: formData.get('notes') as string || undefined,
    };

    try {
      await createPackage(packageData);
      setShowCreateDialog(false);
      refetch();
    } catch (error) {
      console.error('Error creating package:', error);
    }
  };

  const handleUseSession = async (packageId: string) => {
    const success = await usePackageSession(packageId);
    if (success) {
      refetch();
    }
  };

  const handleCancelPackage = async (packageId: string) => {
    await cancelPackage(packageId);
    refetch();
  };

  const handleUpdateNotes = async (packageId: string) => {
    await updatePackageNotes(packageId, notesText);
    setEditingNotes(null);
    setNotesText('');
    refetch();
  };

  const startEditingNotes = (packageId: string, currentNotes: string) => {
    setEditingNotes(packageId);
    setNotesText(currentNotes || '');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Bonos</h2>
          <p className="text-muted-foreground">Administra los bonos y paquetes de sesiones</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={refetch} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Crear Bono
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Bono</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePackage} className="space-y-4">
                <div>
                  <Label htmlFor="client_id">Cliente ID</Label>
                  <Input 
                    id="client_id" 
                    name="client_id" 
                    placeholder="UUID del cliente"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="package_id">Paquete</Label>
                  <Select name="package_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar paquete" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - {pkg.sessions_count} sesiones
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiry_date">Fecha de Vencimiento</Label>
                  <Input 
                    id="expiry_date" 
                    name="expiry_date" 
                    type="datetime-local"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="purchase_price_cents">Precio (€)</Label>
                  <Input 
                    id="purchase_price_cents" 
                    name="purchase_price_cents" 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="49.99"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="total_sessions">Total Sesiones</Label>
                  <Input 
                    id="total_sessions" 
                    name="total_sessions" 
                    type="number"
                    min="1"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea 
                    id="notes" 
                    name="notes" 
                    placeholder="Información adicional..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Bono
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonos Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packages.filter(p => p.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expiringPackages.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Próximos 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packages.filter(p => p.status === 'expired').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Euro className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{packages.reduce((sum, p) => sum + (p.purchase_price_cents / 100), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todos los Bonos</TabsTrigger>
          <TabsTrigger value="expiring">Por Vencer</TabsTrigger>
          <TabsTrigger value="active">Solo Activos</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Bonos</CardTitle>
            </CardHeader>
            <CardContent>
              {packages.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay bonos registrados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <QrCode className="h-5 w-5 text-muted-foreground" />
                            <span className="font-mono text-sm font-medium">{pkg.voucher_code}</span>
                          </div>
                          <Badge className={getStatusColor(pkg.status)}>
                            {getStatusLabel(pkg.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {pkg.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleUseSession(pkg.id)}
                            >
                              Usar Sesión
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => startEditingNotes(pkg.id, pkg.notes || '')}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {pkg.status === 'active' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Cancelar bono?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. El bono será marcado como cancelado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancelPackage(pkg.id)}>
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {pkg.profiles?.first_name} {pkg.profiles?.last_name}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{pkg.profiles?.email}</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <Gift className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{pkg.packages?.name}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercentage(pkg.used_sessions, pkg.total_sessions)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {pkg.used_sessions}/{pkg.total_sessions}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Vence: {format(new Date(pkg.expiry_date), 'PPP', { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              €{(pkg.purchase_price_cents / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {pkg.notes && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm">{pkg.notes}</p>
                        </div>
                      )}
                      
                      {editingNotes === pkg.id && (
                        <div className="mt-4 space-y-2">
                          <Textarea 
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="Agregar notas..."
                          />
                          <div className="flex justify-end space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingNotes(null)}
                            >
                              Cancelar
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handleUpdateNotes(pkg.id)}
                            >
                              Guardar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>Bonos Próximos a Vencer</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : expiringPackages.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay bonos próximos a vencer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expiringPackages.map((pkg) => (
                    <div key={pkg.id} className="border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{pkg.client_name}</div>
                          <div className="text-sm text-muted-foreground">{pkg.client_email}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{pkg.package_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {pkg.remaining_sessions} sesiones restantes
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{pkg.voucher_code}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm font-medium text-yellow-700">
                            {pkg.days_to_expiry} días restantes
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Bonos Activos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {packages.filter(p => p.status === 'active').length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay bonos activos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {packages.filter(p => p.status === 'active').map((pkg) => (
                    <div key={pkg.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <QrCode className="h-5 w-5 text-muted-foreground" />
                            <span className="font-mono text-sm font-medium">{pkg.voucher_code}</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-green-300">
                            Activo
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleUseSession(pkg.id)}
                        >
                          Usar Sesión
                        </Button>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {pkg.profiles?.first_name} {pkg.profiles?.last_name}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{pkg.profiles?.email}</p>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <Gift className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{pkg.packages?.name}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercentage(pkg.used_sessions, pkg.total_sessions)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {pkg.used_sessions}/{pkg.total_sessions}
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Vence: {format(new Date(pkg.expiry_date), 'PPP', { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              €{(pkg.purchase_price_cents / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
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
  );
};

export default PackageManagement;