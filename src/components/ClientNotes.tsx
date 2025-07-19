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
import { Switch } from '@/components/ui/switch';
import { 
  StickyNote, 
  AlertTriangle, 
  Search, 
  Plus, 
  User,
  Calendar,
  Edit3,
  Trash2,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  RefreshCw,
  Filter,
  FileText,
  Activity
} from 'lucide-react';
import { useClientNotes, useClientAlerts, type ClientNote } from '@/hooks/useClientNotes';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ClientNotes = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { notes, loading, error, refetch, createNote, updateNote, deleteNote, toggleAlert } = useClientNotes(
    selectedClient || undefined,
    selectedCategory === 'all' ? undefined : selectedCategory || undefined,
    searchQuery || undefined
  );
  
  const { alerts, loading: alertsLoading, refetch: refetchAlerts, dismissAlert } = useClientAlerts();

  const categories = [
    { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800' },
    { value: 'preferences', label: 'Preferencias', color: 'bg-blue-100 text-blue-800' },
    { value: 'medical', label: 'Médico', color: 'bg-red-100 text-red-800' },
    { value: 'allergies', label: 'Alergias', color: 'bg-orange-100 text-orange-800' },
    { value: 'behavior', label: 'Comportamiento', color: 'bg-purple-100 text-purple-800' },
    { value: 'payment', label: 'Pago', color: 'bg-green-100 text-green-800' },
    { value: 'complaints', label: 'Quejas', color: 'bg-red-100 text-red-800' },
    { value: 'compliments', label: 'Cumplidos', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'follow_up', label: 'Seguimiento', color: 'bg-yellow-100 text-yellow-800' },
  ];

  const priorities = [
    { value: 'low', label: 'Baja', color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-800' },
  ];

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[0];
  };

  const getPriorityInfo = (priority: string) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  const handleCreateNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const noteData = {
      client_id: formData.get('client_id') as string,
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as ClientNote['category'],
      priority: formData.get('priority') as ClientNote['priority'],
      is_private: formData.get('is_private') === 'on',
      is_alert: formData.get('is_alert') === 'on',
    };

    try {
      await createNote(noteData);
      setShowCreateDialog(false);
      refetch();
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleUpdateNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingNote) return;

    const formData = new FormData(e.currentTarget);
    
    const updates = {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as ClientNote['category'],
      priority: formData.get('priority') as ClientNote['priority'],
      is_private: formData.get('is_private') === 'on',
      is_alert: formData.get('is_alert') === 'on',
    };

    try {
      await updateNote(editingNote.id, updates);
      setEditingNote(null);
      refetch();
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      refetch();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleToggleAlert = async (noteId: string, isAlert: boolean) => {
    try {
      await toggleAlert(noteId, isAlert);
      refetch();
      refetchAlerts();
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const handleDismissAlert = async (noteId: string) => {
    try {
      await dismissAlert(noteId);
      refetchAlerts();
      refetch();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedClient('');
    setShowFilters(false);
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
                <Skeleton key={i} className="h-24 w-full" />
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
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={refetch} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
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
          <h2 className="text-2xl font-bold">Notas de Clientes</h2>
          <p className="text-muted-foreground">Gestiona las notas y observaciones de tus clientes</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={refetch} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Nota
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nueva Nota</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateNote} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="category">Categoría</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select name="priority" defaultValue="normal">
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((pri) => (
                          <SelectItem key={pri.value} value={pri.value}>
                            {pri.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-4 pt-6">
                    <div className="flex items-center space-x-2">
                      <Switch id="is_private" name="is_private" />
                      <Label htmlFor="is_private">Privada</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="is_alert" name="is_alert" />
                      <Label htmlFor="is_alert">Alerta</Label>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="Título de la nota"
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="content">Contenido</Label>
                  <Textarea 
                    id="content" 
                    name="content" 
                    placeholder="Descripción detallada..."
                    rows={4}
                    required 
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Nota
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category-filter">Categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="client-filter">Cliente ID</Label>
                <Input
                  id="client-filter"
                  placeholder="ID específico del cliente"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters}>
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <Bell className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas Privadas</CardTitle>
            <EyeOff className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notes.filter(n => n.is_private).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Prioridad</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notes.filter(n => n.priority === 'high' || n.priority === 'urgent').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas las Notas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas Activas</TabsTrigger>
          <TabsTrigger value="recent">Recientes</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todas las Notas</CardTitle>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay notas que coincidan con los filtros</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{note.title}</h3>
                            <Badge className={getCategoryInfo(note.category).color}>
                              {getCategoryInfo(note.category).label}
                            </Badge>
                            <Badge className={getPriorityInfo(note.priority).color}>
                              {getPriorityInfo(note.priority).label}
                            </Badge>
                            {note.is_alert && (
                              <Badge className="bg-orange-100 text-orange-800">
                                <Bell className="h-3 w-3 mr-1" />
                                Alerta
                              </Badge>
                            )}
                            {note.is_private && (
                              <Badge className="bg-purple-100 text-purple-800">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Privada
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{note.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{note.client_name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(note.created_at), 'PPp', { locale: es })}</span>
                            </div>
                            <div>Por: {note.staff_name}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleAlert(note.id, !note.is_alert)}
                          >
                            {note.is_alert ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingNote(note)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar nota?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. La nota será eliminada permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-500" />
                <span>Alertas Activas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay alertas activas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{alert.title}</h3>
                            <Badge className={getCategoryInfo(alert.category).color}>
                              {getCategoryInfo(alert.category).label}
                            </Badge>
                            <Badge className={getPriorityInfo(alert.priority).color}>
                              {getPriorityInfo(alert.priority).label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{alert.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{alert.client_name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(alert.created_at), 'PPp', { locale: es })}</span>
                            </div>
                            <div>Por: {alert.staff_name}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDismissAlert(alert.id)}
                        >
                          Descartar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Notas Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {notes.slice(0, 10).length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay notas recientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.slice(0, 10).map((note) => (
                    <div key={note.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold">{note.title}</h3>
                            <Badge className={getCategoryInfo(note.category).color}>
                              {getCategoryInfo(note.category).label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{note.content}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{note.client_name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(note.created_at), 'PPp', { locale: es })}</span>
                            </div>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Nota</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <form onSubmit={handleUpdateNote} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Select name="category" defaultValue={editingNote.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-priority">Prioridad</Label>
                  <Select name="priority" defaultValue={editingNote.priority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((pri) => (
                        <SelectItem key={pri.value} value={pri.value}>
                          {pri.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch id="edit-is_private" name="is_private" defaultChecked={editingNote.is_private} />
                  <Label htmlFor="edit-is_private">Privada</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="edit-is_alert" name="is_alert" defaultChecked={editingNote.is_alert} />
                  <Label htmlFor="edit-is_alert">Alerta</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-title">Título</Label>
                <Input 
                  id="edit-title" 
                  name="title" 
                  defaultValue={editingNote.title}
                  required 
                />
              </div>
              <div>
                <Label htmlFor="edit-content">Contenido</Label>
                <Textarea 
                  id="edit-content" 
                  name="content" 
                  defaultValue={editingNote.content}
                  rows={4}
                  required 
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingNote(null)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Actualizar Nota
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientNotes;