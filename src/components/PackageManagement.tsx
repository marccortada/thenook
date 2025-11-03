import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppModal from '@/components/ui/app-modal';
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
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PackageManagement = () => {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showCreateGiftCardDialog, setShowCreateGiftCardDialog] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [editingGiftCard, setEditingGiftCard] = useState<GiftCard | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmUseFor, setConfirmUseFor] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirmNote, setConfirmNote] = useState('');
  const [processingUse, setProcessingUse] = useState(false);
  const { toast } = useToast();
  
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

  const handleUseSession = async (packageId: string, note?: string) => {
    // Mantengo la función antigua por compatibilidad, pero el flujo nuevo usa edge function con auditoría
    const success = await usePackageSession(packageId);
    if (success) refetch();
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
          <h2 className="text-2xl font-bold">Gestión de Bonos</h2>
          <p className="text-muted-foreground">Administra los bonos y paquetes de sesiones</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={refetch} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards - Solo bonos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <CardTitle className="text-sm font-medium">Valor Bonos</CardTitle>
            <Euro className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{packages.reduce((sum, p) => sum + (p.purchase_price_cents / 100), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar bonos por código o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bonos-all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bonos-all">Todos los Bonos</TabsTrigger>
          <TabsTrigger value="bonos-active">Solo Bonos Activos</TabsTrigger>
        </TabsList>

        {/* Pestañas de Bonos */}
        <TabsContent value="bonos-all">
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
                    <div key={pkg.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                          <div className="text-sm font-medium">Código: <span className="font-mono">{pkg.voucher_code}</span></div>
                          <Badge className={getStatusColor(pkg.status)}>
                            {getStatusLabel(pkg.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                          {pkg.status === 'active' && (
                            <Button 
                              size="sm" 
                              className="whitespace-nowrap w-full sm:w-auto"
                              disabled={pkg.used_sessions >= pkg.total_sessions}
                              onClick={() => { setConfirmUseFor(pkg.id); setConfirmChecked(false); setConfirmNote(''); }}
                            >
                              Usar sesión
                            </Button>
                          )}
                          {/* Acciones de edición/cancelación ocultas para hacer la vista consultiva */}
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
                  <div key={pkg.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                        <div className="text-sm font-medium">Código: <span className="font-mono">{pkg.voucher_code}</span></div>
                        <Badge className={getStatusColor(pkg.status)}>
                          {getStatusLabel(pkg.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button 
                          size="sm" 
                          className="whitespace-nowrap w-full sm:w-auto"
                          disabled={pkg.used_sessions >= pkg.total_sessions}
                          onClick={() => { setConfirmUseFor(pkg.id); setConfirmChecked(false); setConfirmNote(''); }}
                        >
                          Usar sesión
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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

      </Tabs>
      {/* Modal confirmación usar sesión (AppModal centrado) */}
      <AppModal open={!!confirmUseFor} onClose={() => setConfirmUseFor(null)} maxWidth={520} mobileMaxWidth={360} maxHeight={600}>
        {(() => {
            const pkg = packages.find(p => p.id === confirmUseFor);
            if (!pkg) return null;
            const nextUsed = pkg.used_sessions + 1;
            return (
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Confirmar uso de sesión</h3>
                  <p className="text-sm text-muted-foreground">Marcar una sesión como usada es irreversible.</p>
                </div>
                <div className="text-sm space-y-1">
                  <div><span className="font-medium">Cliente:</span> {pkg.profiles?.first_name} {pkg.profiles?.last_name} ({pkg.profiles?.email})</div>
                  <div><span className="font-medium">Bono:</span> {pkg.packages?.name}</div>
                  <div><span className="font-medium">Código:</span> <span className="font-mono">{pkg.voucher_code}</span></div>
                  <div><span className="font-medium">Sesiones:</span> {pkg.used_sessions}/{pkg.total_sessions} → {nextUsed}/{pkg.total_sessions}</div>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="chk-confirm" checked={confirmChecked} onCheckedChange={(v) => setConfirmChecked(!!v)} />
                  <label htmlFor="chk-confirm" className="text-sm">Entiendo y confirmo que deseo usar 1 sesión de este bono.</label>
                </div>
                <div className="space-y-1">
                  <Label>Nota interna (obligatoria)</Label>
                  <Textarea value={confirmNote} onChange={(e) => setConfirmNote(e.target.value)} placeholder="Escribe tu nombre y, si quieres, una nota" />
                  <div className="text-xs text-muted-foreground">Debes indicar tu nombre para auditar quién usó la sesión.</div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setConfirmUseFor(null)}>Cancelar</Button>
                  <Button disabled={!confirmChecked || processingUse || !confirmNote.trim()} onClick={async () => {
                    if (!confirmUseFor) return;
                    try {
                      setProcessingUse(true);
                      let ok = false; let remaining = 0; let total = 0; let errMsg: string | null = null;
                      const { data, error } = await (supabase as any).functions.invoke('use-voucher-session', {
                        body: { voucher_id: confirmUseFor, note: confirmNote }
                      });
                      if (!error && data?.ok) { ok = true; remaining = data.remaining; total = data.total; }
                      if (!ok) {
                        const rpc = await (supabase as any).rpc('use_client_package_session', { package_id: confirmUseFor });
                        if (!rpc.error && rpc.data) {
                          // Anexar nota manual manteniendo lo existente
                          const { data: existing } = await (supabase as any)
                            .from('client_packages')
                            .select('notes')
                            .eq('id', confirmUseFor)
                            .single();
                          const newNotes = ((existing?.notes ?? '') + (existing?.notes ? ' | ' : '') + `Uso manual: ${confirmNote}`).slice(0, 2000);
                          await (supabase as any).from('client_packages').update({ notes: newNotes }).eq('id', confirmUseFor);
                          ok = true;
                        } else {
                          errMsg = rpc.error?.message || data?.error || error?.message || 'No se pudo usar la sesión';
                        }
                      }
                      if (!ok) throw new Error(errMsg || 'No se pudo usar la sesión');
                      setConfirmUseFor(null);
                      toast({ title: 'Sesión registrada' });
                      await refetch();
                    } catch (e: any) {
                      toast({ title: 'Error', description: e.message || 'No se pudo usar la sesión', variant: 'destructive' });
                    } finally {
                      setProcessingUse(false);
                    }
                  }}>Confirmar</Button>
                </div>
              </div>
            );
          })()}
      </AppModal>
    </div>
  );
};

export default PackageManagement;
