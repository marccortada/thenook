import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar,
  Edit,
  MapPin,
  Mail,
  Phone,
  Plus,
  Clock,
  Tags,
  X
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Client, ClientBooking } from "@/hooks/useClients";

interface ClientDialogContentProps {
  client: Client;
  bookings: ClientBooking[];
  editingClient: Partial<Client>;
  newNote: { title: string; content: string; category: string; priority: string };
  notes: any[];
  codes: any[];
  clientCodes: any[];
  onUpdateClient: () => void;
  onCreateNote: () => void;
  onUpdateEditingClient: (updates: Partial<Client>) => void;
  onUpdateNewNote: (updates: Partial<{ title: string; content: string; category: string; priority: string }>) => void;
  onOpenEmailModal: (client: any) => void;
  onAssignCode: (codeId: string) => void;
  onUnassignCode: (assignmentId: string) => void;
  onCreateCode?: (codeData: { code: string; name: string; description?: string; category: string; color: string }) => Promise<void>;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

export const ClientDialogContent = ({
  client,
  bookings,
  editingClient,
  newNote,
  notes,
  codes,
  clientCodes,
  onUpdateClient,
  onCreateNote,
  onUpdateEditingClient,
  onUpdateNewNote,
  onOpenEmailModal,
  onAssignCode,
  onUnassignCode,
  onCreateCode,
  getStatusColor,
  getStatusText
}: ClientDialogContentProps) => {
  const [showCreateCode, setShowCreateCode] = useState(false);
  const [newCodeData, setNewCodeData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'general',
    color: '#3B82F6'
  });
  const selectFieldClass =
    "flex h-11 w-full rounded-2xl border border-border/60 bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 text-sm font-semibold text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

  const handleCreateCode = async () => {
    if (!onCreateCode || !newCodeData.code.trim() || !newCodeData.name.trim()) return;
    
    try {
      await onCreateCode(newCodeData);
      setNewCodeData({
        code: '',
        name: '',
        description: '',
        category: 'general',
        color: '#3B82F6'
      });
      setShowCreateCode(false);
    } catch (error) {
      console.error('Error creating code:', error);
    }
  };
  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-auto">
        <TabsTrigger value="info" className="text-xs sm:text-sm px-2 py-2">Info</TabsTrigger>
        <TabsTrigger value="codes" className="text-xs sm:text-sm px-2 py-2">Códigos</TabsTrigger>
        <TabsTrigger value="bookings" className="text-xs sm:text-sm px-2 py-2">Reservas</TabsTrigger>
        <TabsTrigger value="notes" className="text-xs sm:text-sm px-2 py-2">Notas</TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="space-y-3 sm:space-y-4 mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="first_name" className="text-sm">Nombre</Label>
                <Input
                  id="first_name"
                  value={editingClient.first_name || ""}
                  onChange={(e) => onUpdateEditingClient({ first_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="last_name" className="text-sm">Apellidos</Label>
                <Input
                  id="last_name"
                  value={editingClient.last_name || ""}
                  onChange={(e) => onUpdateEditingClient({ last_name: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email" className="text-sm">Email</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="email"
                  type="email"
                  value={editingClient.email || ""}
                  onChange={(e) => onUpdateEditingClient({ email: e.target.value })}
                  className="flex-1"
                />
                {editingClient.email && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEmailModal(editingClient);
                    }}
                    title="Enviar email"
                  >
                    <Mail className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone" className="text-sm">Teléfono</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="phone"
                  value={editingClient.phone || ""}
                  onChange={(e) => onUpdateEditingClient({ phone: e.target.value })}
                  className="flex-1"
                />
                {editingClient.phone && (
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a 
                      href={`tel:${editingClient.phone}`} 
                      title="Llamar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <Button onClick={onUpdateClient} className="w-full mt-4">
              <Edit className="h-4 w-4 mr-2" />
              <span className="text-sm">Guardar Cambios</span>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">Estadísticas</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-primary">{client.total_bookings}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Reservas</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  €{((client.total_spent || 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Gastado</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {client.last_booking 
                    ? format(new Date(client.last_booking), 'dd/MM/yy', { locale: es })
                    : 'N/A'
                  }
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Última Visita</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="codes" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Códigos Asignados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientCodes.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No hay códigos asignados
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {clientCodes.map((assignment) => {
                  const code = codes.find(c => c.id === assignment.code_id);
                  if (!code) return null;
                  return (
                    <div key={assignment.id} className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className="text-sm"
                        style={{
                          borderColor: code.color,
                          color: code.color,
                          backgroundColor: `${code.color}15`
                        }}
                      >
                        {code.name}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => onUnassignCode(assignment.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Asignar Códigos</span>
              {onCreateCode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateCode(!showCreateCode)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Crear Código
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showCreateCode && onCreateCode && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/20 mb-4">
                <h4 className="font-medium text-sm">Crear Nuevo Código</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="new_code" className="text-xs">Código</Label>
                    <Input
                      id="new_code"
                      value={newCodeData.code}
                      onChange={(e) => setNewCodeData({ ...newCodeData, code: e.target.value.toUpperCase() })}
                      placeholder="ej. VIP"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_name" className="text-xs">Nombre</Label>
                    <Input
                      id="new_name"
                      value={newCodeData.name}
                      onChange={(e) => setNewCodeData({ ...newCodeData, name: e.target.value })}
                      placeholder="ej. Cliente VIP"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="new_category" className="text-xs">Categoría</Label>
                    <select
                      id="new_category"
                      className={selectFieldClass}
                      value={newCodeData.category}
                      onChange={(e) => setNewCodeData({ ...newCodeData, category: e.target.value })}
                    >
                      <option value="general">General</option>
                      <option value="vip">VIP</option>
                      <option value="behavior">Comportamiento</option>
                      <option value="preferences">Preferencias</option>
                      <option value="medical">Médico</option>
                      <option value="payment">Pago</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="new_color" className="text-xs">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="new_color"
                        type="color"
                        value={newCodeData.color}
                        onChange={(e) => setNewCodeData({ ...newCodeData, color: e.target.value })}
                        className="w-12 h-8 p-1"
                      />
                      <div 
                        className="flex-1 border rounded px-3 flex items-center text-sm"
                        style={{ backgroundColor: newCodeData.color + '20', borderColor: newCodeData.color }}
                      >
                        {newCodeData.color}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new_description" className="text-xs">Descripción (opcional)</Label>
                  <Textarea
                    id="new_description"
                    value={newCodeData.description}
                    onChange={(e) => setNewCodeData({ ...newCodeData, description: e.target.value })}
                    placeholder="Descripción del código..."
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateCode}
                    disabled={!newCodeData.code.trim() || !newCodeData.name.trim()}
                  >
                    Crear y Asignar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateCode(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-sm">Códigos disponibles</Label>
              <div className="flex flex-wrap gap-2">
                {codes.filter(code => !clientCodes.some(assignment => assignment.code_id === code.id)).map((code) => (
                  <Badge
                    key={code.id}
                    variant="outline"
                    className="cursor-pointer transition-colors hover:shadow-sm text-sm"
                    style={{
                      borderColor: code.color,
                      color: code.color,
                      backgroundColor: 'transparent'
                    }}
                    onClick={() => onAssignCode(code.id)}
                  >
                    + {code.name}
                  </Badge>
                ))}
              </div>
              {codes.filter(code => !clientCodes.some(assignment => assignment.code_id === code.id)).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Todos los códigos disponibles ya están asignados
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bookings" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial de Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay reservas registradas
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {format(new Date(booking.booking_datetime), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {booking.center_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(booking.status)}>
                            {getStatusText(booking.status)}
                          </Badge>
                          <p className="text-sm font-medium mt-1">
                            €{(booking.total_price_cents / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <p><strong>Servicio:</strong> {booking.service_name}</p>
                        <p><strong>Duración:</strong> {booking.duration_minutes} min</p>
                        {booking.notes && (
                          <p><strong>Notas:</strong> {booking.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="notes" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Añadir Nueva Nota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="note_title">Título</Label>
              <Input
                id="note_title"
                value={newNote.title}
                onChange={(e) => onUpdateNewNote({ title: e.target.value })}
                placeholder="Título de la nota"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="note_category">Categoría</Label>
                <select
                  id="note_category"
                  className={selectFieldClass}
                  value={newNote.category}
                  onChange={(e) => onUpdateNewNote({ category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="preferences">Preferencias</option>
                  <option value="medical">Médico</option>
                  <option value="allergies">Alergias</option>
                  <option value="behavior">Comportamiento</option>
                  <option value="payment">Pago</option>
                  <option value="complaints">Quejas</option>
                  <option value="compliments">Cumplidos</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="note_priority">Prioridad</Label>
                <select
                  id="note_priority"
                  className={selectFieldClass}
                  value={newNote.priority}
                  onChange={(e) => onUpdateNewNote({ priority: e.target.value })}
                >
                  <option value="low">Baja</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="note_content">Contenido</Label>
              <Textarea
                id="note_content"
                value={newNote.content}
                onChange={(e) => onUpdateNewNote({ content: e.target.value })}
                placeholder="Escribe aquí el contenido de la nota..."
                rows={3}
              />
            </div>
            
            <Button onClick={onCreateNote} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Nota
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notas Existentes</CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay notas registradas
              </p>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{note.title}</h4>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {note.category}
                          </Badge>
                          <Badge 
                            variant={note.priority === 'urgent' ? 'destructive' : 
                                   note.priority === 'high' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {note.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{note.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
