import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  CreditCard, 
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
  Search
} from 'lucide-react';
import { useGiftCards, useExpiringGiftCards, type GiftCard } from '@/hooks/useGiftCards';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClientSelector from '@/components/ClientSelector';

const GiftCardManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  const { giftCards, loading, error, refetch, createGiftCard, updateGiftCard, deactivateGiftCard } = useGiftCards(searchTerm);
  const [daysAhead, setDaysAhead] = useState<number>(30);
  const { expiringGiftCards, loading: expiringLoading, refetch: refetchExpiring } = useExpiringGiftCards(daysAhead);
  const [createClientId, setCreateClientId] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'used_up':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'expired':
        return 'Expirada';
      case 'used_up':
        return 'Agotada';
      default:
        return status;
    }
  };

  const getUsagePercentage = (remaining: number, initial: number) => {
    return Math.round(((initial - remaining) / initial) * 100);
  };

  const handleCreateGiftCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const giftCardData = {
      initial_balance_cents: Math.round(parseFloat(formData.get('amount') as string) * 100),
      assigned_client_id: createClientId || undefined,
      purchased_by_name: (formData.get('purchased_by_name') as string) || undefined,
      purchased_by_email: (formData.get('purchased_by_email') as string) || undefined,
    };

    if (!giftCardData.initial_balance_cents || giftCardData.initial_balance_cents <= 0) {
      return;
    }

    try {
      await createGiftCard(giftCardData);
      setShowCreateDialog(false);
      setCreateClientId('');
      setSelectedDate(undefined);
      refetch();
    } catch (error) {
      console.error('Error creating gift card:', error);
    }
  };

  const handleUpdateGiftCard = async (id: string, updates: Partial<GiftCard>) => {
    const success = await updateGiftCard(id, updates);
    if (success) {
      setEditingCard(null);
      refetch();
    }
  };

  const handleDeactivateGiftCard = async (id: string) => {
    const success = await deactivateGiftCard(id);
    if (success) {
      refetch();
    }
  };

  if (loading) {
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
          <h2 className="text-2xl font-bold">Gestión de Tarjetas Regalo</h2>
          <p className="text-muted-foreground">Administra las tarjetas regalo y su saldo</p>
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
                Crear Tarjeta Regalo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Tarjeta Regalo</DialogTitle>
                <DialogDescription>Crea una nueva tarjeta regalo especificando el monto y cliente opcional.</DialogDescription>
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
                    onSelect={(c) => setCreateClientId(c.id)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Opcional - deja vacío para tarjeta sin cliente asignado</p>
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
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Tarjeta Regalo
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por código, nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarjetas Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {giftCards.filter(g => g.status === 'active').length}
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
              {expiringGiftCards.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Próximos {daysAhead} días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiradas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {giftCards.filter(g => g.status === 'expired').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Activo</CardTitle>
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

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas las Tarjetas</TabsTrigger>
          <TabsTrigger value="expiring">Por Vencer</TabsTrigger>
          <TabsTrigger value="active">Solo Activas</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todas las Tarjetas Regalo</CardTitle>
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
                            onClick={() => setEditingCard(card)}
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
                                    Esta acción marcará la tarjeta como expirada. El saldo restante se perderá.
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
                          <p className="text-sm text-muted-foreground">
                            Creada: {format(new Date(card.created_at), "dd/MM/yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
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
              <div className="flex items-center justify-between">
                <CardTitle>Tarjetas por Vencer</CardTitle>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="daysAhead">Días a futuro:</Label>
                  <Input
                    id="daysAhead"
                    type="number"
                    min="1"
                    max="365"
                    value={daysAhead}
                    onChange={(e) => setDaysAhead(parseInt(e.target.value) || 30)}
                    className="w-20"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {expiringLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : expiringGiftCards.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay tarjetas por vencer en los próximos {daysAhead} días</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expiringGiftCards.map((card) => (
                    <div key={card.id} className="border rounded-lg p-4 border-yellow-200 bg-yellow-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium">Código: <span className="font-mono">{card.code}</span></div>
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                            Vence: {card.expiry_date && format(new Date(card.expiry_date), "dd/MM/yyyy", { locale: es })}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-4">
                        <div className="text-sm">
                          Saldo: €{(card.remaining_balance_cents / 100).toFixed(2)}
                        </div>
                        {card.profiles && (
                          <div className="text-sm">
                            Cliente: {card.profiles.first_name} {card.profiles.last_name}
                          </div>
                        )}
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
              <CardTitle>Tarjetas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {giftCards.filter(card => card.status === 'active').map((card) => (
                  <div key={card.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm font-medium">Código: <span className="font-mono">{card.code}</span></div>
                        <Badge className={getStatusColor(card.status)}>
                          {getStatusLabel(card.status)}
                        </Badge>
                      </div>
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

      {/* Edit Dialog */}
      {editingCard && (
        <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Tarjeta Regalo</DialogTitle>
              <DialogDescription>Modifica los datos de la tarjeta regalo</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input value={editingCard.code} disabled />
              </div>
              <div>
                <Label>Saldo Restante (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(editingCard.remaining_balance_cents / 100).toString()}
                  onChange={(e) => setEditingCard({
                    ...editingCard,
                    remaining_balance_cents: Math.round(parseFloat(e.target.value) * 100)
                  })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingCard(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleUpdateGiftCard(editingCard.id, { remaining_balance_cents: editingCard.remaining_balance_cents })}>
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

export default GiftCardManagement;