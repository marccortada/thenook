import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useGiftCards, type GiftCard } from '@/hooks/useGiftCards';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ClientSelector from '@/components/ClientSelector';
import { ImageUploadCropper } from '@/components/ImageUploadCropper';
import { ViewportSafeWrapper } from '@/components/ViewportSafeWrapper';

const GiftCardManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [giftCardImage, setGiftCardImage] = useState<File | null>(null);
  const [giftCardImageCrop, setGiftCardImageCrop] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  const { giftCards, loading, error, refetch, createGiftCard, updateGiftCard, deactivateGiftCard } = useGiftCards(searchTerm);
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
    if (!initial || initial <= 0) return 0;
    return Math.round(((initial - remaining) / initial) * 100);
  };

  const getSessionUsagePercentage = (remaining?: number | null, total?: number | null) => {
    if (!total || total <= 0 || remaining == null) return 0;
    return Math.round(((total - remaining) / total) * 100);
  };

  const handleUpdateGiftCard = async (id: string, updates: Partial<GiftCard>) => {
    const success = await updateGiftCard(id, updates);
    if (success) {
      setEditingCard(null);
      setIsEditDialogOpen(false);
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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold truncate">Gestión de Tarjetas Regalo</h2>
          <p className="text-sm text-muted-foreground">Administra las tarjetas regalo y su saldo</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={refetch} variant="outline" size="sm" className="w-full sm:w-auto">
            <RotateCcw className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Actualizar</span>
            <span className="sm:hidden">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Tarjetas Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
              {giftCards.filter(g => g.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Valor Total Activo</CardTitle>
            <Euro className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">
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
        <TabsList className="grid w-full grid-cols-2 h-auto p-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-2">Todas</TabsTrigger>
          <TabsTrigger value="active" className="text-xs sm:text-sm px-2 py-2">Activas</TabsTrigger>
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
                <div className="space-y-3 sm:space-y-4">
                  {giftCards.map((card) => (
                    <div key={card.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                          <div className="text-xs sm:text-sm font-medium truncate">
                            Código: <span className="font-mono">{card.code}</span>
                          </div>
                          <Badge className={`${getStatusColor(card.status)} text-xs`}>
                            {getStatusLabel(card.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingCard({ ...card });
                              setIsEditDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          {card.status === 'active' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="h-8 w-8 p-0">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="max-w-md mx-auto">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Desactivar tarjeta regalo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción marcará la tarjeta como expirada. El saldo restante se perderá.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                  <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeactivateGiftCard(card.id)} className="w-full sm:w-auto">
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 space-y-2 sm:mt-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0">
                        <div className="min-w-0">
                          {card.profiles ? (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium truncate">
                                {card.profiles.first_name} {card.profiles.last_name}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm text-muted-foreground truncate">
                              {card.purchased_by_name || 'Sin asignar'}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            {card.profiles?.email || card.purchased_by_email || ''}
                          </p>
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <Euro className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium truncate">
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
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {100 - getUsagePercentage(card.remaining_balance_cents, card.initial_balance_cents)}%
                            </span>
                          </div>

                          {(card.total_sessions ?? 0) > 0 && (
                            <div className="mt-3 space-y-1">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium truncate">
                                  {(card.remaining_sessions ?? 0)} / {(card.total_sessions ?? 0)} sesiones
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${100 - getSessionUsagePercentage(card.remaining_sessions, card.total_sessions)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  {100 - getSessionUsagePercentage(card.remaining_sessions, card.total_sessions)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
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
                    {(card.total_sessions ?? 0) > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Sesiones restantes: {(card.remaining_sessions ?? 0)} / {(card.total_sessions ?? 0)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog
        modal
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingCard(null);
          }
        }}
      >
        <DialogContent className="p-0 sm:max-w-lg">
          <ViewportSafeWrapper
            isOpen={isEditDialogOpen}
            className="flex flex-col gap-6 p-6"
          >
            <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b bg-background text-left">
              <DialogTitle>Editar Tarjeta Regalo</DialogTitle>
              <DialogDescription>Modifica los datos de la tarjeta regalo</DialogDescription>
            </DialogHeader>
            {editingCard && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input value={editingCard.code} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Saldo restante (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(editingCard.remaining_balance_cents / 100).toString()}
                      onChange={(e) => {
                        const parsed = parseFloat(e.target.value || "0");
                        const cents = Number.isNaN(parsed) ? 0 : Math.round(parsed * 100);
                        setEditingCard({
                          ...editingCard,
                          remaining_balance_cents: cents,
                        });
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sesiones totales</Label>
                      <Input
                        type="number"
                        min="0"
                        value={String(editingCard.total_sessions ?? 0)}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value || "0", 10);
                          const sanitized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
                          const adjustedRemaining = Math.min(editingCard.remaining_sessions ?? 0, sanitized);
                          setEditingCard({
                            ...editingCard,
                            total_sessions: sanitized,
                            remaining_sessions: adjustedRemaining,
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sesiones restantes</Label>
                      <Input
                        type="number"
                        min="0"
                        value={String(editingCard.remaining_sessions ?? 0)}
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value || "0", 10);
                          const sanitized = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
                          const capped =
                            editingCard.total_sessions != null && editingCard.total_sessions > 0
                              ? Math.min(sanitized, editingCard.total_sessions)
                              : sanitized;
                          setEditingCard({
                            ...editingCard,
                            remaining_sessions: capped,
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingCard(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() =>
                      handleUpdateGiftCard(editingCard.id, {
                        remaining_balance_cents: editingCard.remaining_balance_cents,
                        total_sessions: editingCard.total_sessions ?? 0,
                        remaining_sessions: editingCard.remaining_sessions ?? 0,
                      })
                    }
                  >
                    Guardar
                  </Button>
                </DialogFooter>
              </>
            )}
          </ViewportSafeWrapper>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GiftCardManagement;
