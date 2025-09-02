import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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
  AlertCircle,
  Search,
  CreditCard
} from 'lucide-react';
import { useClientPackages, useExpiringPackages, type ClientPackage } from '@/hooks/useClientPackages';
import { useGiftCards, useExpiringGiftCards, type GiftCard } from '@/hooks/useGiftCards';
import { usePackages } from '@/hooks/useDatabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClientSelector from '@/components/ClientSelector';

const PackageManagement = () => {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateGiftCardDialog, setShowCreateGiftCardDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [editingGiftCard, setEditingGiftCard] = useState<GiftCard | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hooks para bonos
  const { packages, loading, error, refetch, createPackage, usePackageSession, cancelPackage, updatePackageNotes } = useClientPackages(selectedClient);
  const [daysAhead, setDaysAhead] = useState<number>(7);
  const { expiringPackages, loading: expiringLoading, refetch: refetchExpiring } = useExpiringPackages(daysAhead);
  const { packages: availablePackages } = usePackages();
  const [createClientId, setCreateClientId] = useState<string>("");
  
  // Hooks para tarjetas regalo
  const { giftCards, loading: giftCardsLoading, error: giftCardsError, refetch: refetchGiftCards, createGiftCard, updateGiftCard, deactivateGiftCard } = useGiftCards(searchTerm);
  const [giftCardDaysAhead, setGiftCardDaysAhead] = useState<number>(30);
  const { expiringGiftCards, loading: expiringGiftCardsLoading, refetch: refetchExpiringGiftCards } = useExpiringGiftCards(giftCardDaysAhead);
  const [createGiftCardClientId, setCreateGiftCardClientId] = useState<string>('');

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo/a';
      case 'expired':
        return 'Expirado/a';
      case 'used_up':
        return 'Agotado/a';
      case 'cancelled':
        return 'Cancelado/a';
      default:
        return status;
    }
  };

  const getProgressPercentage = (used: number, total: number) => {
    return Math.round((used / total) * 100);
  };

  const getUsagePercentage = (remaining: number, initial: number) => {
    return Math.round(((initial - remaining) / initial) * 100);
  };

  const handleCreatePackage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const selectedPkg = availablePackages.find((p) => p.id === selectedPackageId);

    const packageData = {
      client_id: createClientId,
      package_id: selectedPackageId,
      purchase_price_cents: selectedPkg?.price_cents ?? 0,
      total_sessions: selectedPkg?.sessions_count ?? 1,
      notes: (formData.get('notes') as string) || undefined,
    };

    if (!packageData.client_id || !packageData.package_id) {
      return;
    }

    try {
      await createPackage(packageData);
      setShowCreateDialog(false);
      refetch();
    } catch (error) {
      console.error('Error creating package:', error);
    }
  };

  const handleCreateGiftCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const giftCardData = {
      initial_balance_cents: Math.round(parseFloat(formData.get('amount') as string) * 100),
      assigned_client_id: createGiftCardClientId || undefined,
      expiry_date: selectedDate ? selectedDate.toISOString() : undefined,
      purchased_by_name: (formData.get('purchased_by_name') as string) || undefined,
      purchased_by_email: (formData.get('purchased_by_email') as string) || undefined,
    };

    if (!giftCardData.initial_balance_cents || giftCardData.initial_balance_cents <= 0) {
      return;
    }

    try {
      await createGiftCard(giftCardData);
      setShowCreateGiftCardDialog(false);
      setCreateGiftCardClientId('');
      setSelectedDate(undefined);
      refetchGiftCards();
    } catch (error) {
      console.error('Error creating gift card:', error);
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

  const handleUpdateGiftCard = async (id: string, updates: Partial<GiftCard>) => {
    const success = await updateGiftCard(id, updates);
    if (success) {
      setEditingGiftCard(null);
      refetchGiftCards();
    }
  };

  const handleDeactivateGiftCard = async (id: string) => {
    const success = await deactivateGiftCard(id);
    if (success) {
      refetchGiftCards();
    }
  };

  const startEditingNotes = (packageId: string, currentNotes: string) => {
    setEditingNotes(packageId);
    setNotesText(currentNotes || '');
  };

  if (loading || giftCardsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
      </div>
    );
  }

  if (error || giftCardsError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 mb-4">{error || giftCardsError}</p>
              <Button onClick={() => { refetch(); refetchGiftCards(); }} variant="outline">
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
          <h2 className="text-2xl font-bold">Gestión de Bonos y Tarjetas Regalo</h2>
          <p className="text-muted-foreground">Administra los bonos, paquetes de sesiones y tarjetas regalo</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => { refetch(); refetchGiftCards(); }} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards - Combinando bonos y tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonos Activos</CardTitle>
            <Gift className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {packages.filter(p => p.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarjetas Activas</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {giftCards.filter(g => g.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Bonos</CardTitle>
            <Euro className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{packages.reduce((sum, p) => sum + (p.purchase_price_cents / 100), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Tarjetas</CardTitle>
            <Euro className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{giftCards
                .filter(g => g.status === 'active')
                .reduce((sum, g) => sum + (g.remaining_balance_cents / 100), 0)
                .toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar tarjetas por código, nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bonos-all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bonos-all">Todos los Bonos</TabsTrigger>
          <TabsTrigger value="bonos-active">Solo Bonos Activos</TabsTrigger>
          <TabsTrigger value="tarjetas-all">Todas las Tarjetas</TabsTrigger>
          <TabsTrigger value="tarjetas-active">Solo Tarjetas Activas</TabsTrigger>
        </TabsList>

        {/* Pestañas de Bonos */}
        <TabsContent value="bonos-all">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Todos los Bonos</CardTitle>
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
                    <DialogDescription>Selecciona el cliente y el paquete.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePackage} className="space-y-4">
                    <div>
                      <ClientSelector
                        placeholder="Busca por nombre, email o teléfono"
                        onSelect={(c) => setCreateClientId(c.id)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="package_id">Paquete</Label>
                      <Select name="package_id" required value={selectedPackageId} onValueChange={setSelectedPackageId}>
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
                      <Button type="submit" disabled={!createClientId || !selectedPackageId}>
                        Crear Bono
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
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
                          <div className="text-sm font-medium">Código: <span className="font-mono">{pkg.voucher_code}</span></div>
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
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              €{(pkg.purchase_price_cents / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
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

        <TabsContent value="bonos-active">
          <Card>
            <CardHeader>
              <CardTitle>Bonos Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {packages.filter(p => p.status === 'active').map((pkg) => (
                  <div key={pkg.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium">Código: <span className="font-mono">{pkg.voucher_code}</span></div>
                        <Badge className={getStatusColor(pkg.status)}>
                          {getStatusLabel(pkg.status)}
                        </Badge>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleUseSession(pkg.id)}
                      >
                        Usar Sesión
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm">
                        {pkg.profiles?.first_name} {pkg.profiles?.last_name}
                      </div>
                      <div className="text-sm">
                        {pkg.used_sessions}/{pkg.total_sessions} sesiones
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestañas de Tarjetas Regalo */}
        <TabsContent value="tarjetas-all">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Todas las Tarjetas Regalo</CardTitle>
              <Dialog open={showCreateGiftCardDialog} onOpenChange={setShowCreateGiftCardDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Tarjeta Regalo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Tarjeta Regalo</DialogTitle>
                    <DialogDescription>Crea una nueva tarjeta regalo especificando el monto.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateGiftCard} className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Monto (€)</Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="50.00"
                      />
                    </div>
                    <div>
                      <Label>Cliente (opcional)</Label>
                      <ClientSelector
                        placeholder="Busca por nombre, email o teléfono"
                        onSelect={(c) => setCreateGiftCardClientId(c.id)}
                      />
                    </div>
                    <div>
                      <Label>Fecha de vencimiento (opcional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="purchased_by_name">Comprado por (nombre)</Label>
                      <Input
                        id="purchased_by_name"
                        name="purchased_by_name"
                        placeholder="Nombre del comprador"
                      />
                    </div>
                    <div>
                      <Label htmlFor="purchased_by_email">Email del comprador</Label>
                      <Input
                        id="purchased_by_email"
                        name="purchased_by_email"
                        type="email"
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateGiftCardDialog(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        Crear Tarjeta Regalo
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {giftCards.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay tarjetas regalo registradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {giftCards.map((card) => (
                    <div key={card.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium">Código: <span className="font-mono">{card.code}</span></div>
                          <Badge className={getStatusColor(card.status)}>
                            {getStatusLabel(card.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingGiftCard(card)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {card.status === 'active' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Desactivar tarjeta regalo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción marcará la tarjeta como expirada.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeactivateGiftCard(card.id)}>
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
                          {card.profiles ? (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {card.profiles.first_name} {card.profiles.last_name}
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              {card.purchased_by_name || 'Sin asignar'}
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {card.profiles?.email || card.purchased_by_email || ''}
                          </p>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              €{(card.remaining_balance_cents / 100).toFixed(2)} / €{(card.initial_balance_cents / 100).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${100 - getUsagePercentage(card.remaining_balance_cents, card.initial_balance_cents)}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {100 - getUsagePercentage(card.remaining_balance_cents, card.initial_balance_cents)}%
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {card.expiry_date 
                                ? format(new Date(card.expiry_date), "dd/MM/yyyy", { locale: es })
                                : 'Sin vencimiento'
                              }
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

        <TabsContent value="tarjetas-active">
          <Card>
            <CardHeader>
              <CardTitle>Tarjetas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {giftCards.filter(card => card.status === 'active').map((card) => (
                  <div key={card.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Código: <span className="font-mono">{card.code}</span></div>
                      <Badge className={getStatusColor(card.status)}>
                        {getStatusLabel(card.status)}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm">
                        Saldo: €{(card.remaining_balance_cents / 100).toFixed(2)}
                      </div>
                      {card.profiles && (
                        <div className="text-sm">
                          {card.profiles.first_name} {card.profiles.last_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Gift Card Dialog */}
      {editingGiftCard && (
        <Dialog open={!!editingGiftCard} onOpenChange={() => setEditingGiftCard(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Tarjeta Regalo</DialogTitle>
              <DialogDescription>Modifica los datos de la tarjeta regalo</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input value={editingGiftCard.code} disabled />
              </div>
              <div>
                <Label>Saldo Restante (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(editingGiftCard.remaining_balance_cents / 100).toString()}
                  onChange={(e) => setEditingGiftCard({
                    ...editingGiftCard,
                    remaining_balance_cents: Math.round(parseFloat(e.target.value) * 100)
                  })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingGiftCard(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleUpdateGiftCard(editingGiftCard.id, { remaining_balance_cents: editingGiftCard.remaining_balance_cents })}>
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PackageManagement;