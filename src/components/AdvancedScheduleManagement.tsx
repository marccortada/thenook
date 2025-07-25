import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Users, 
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useScheduleManagement } from '@/hooks/useScheduleManagement';
import { useEmployees } from '@/hooks/useDatabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const AdvancedScheduleManagement = () => {
  const {
    loading,
    shifts,
    absences,
    availability,
    fetchShifts,
    createShift,
    updateShift,
    fetchAbsences,
    createAbsence,
    updateAbsenceStatus,
    fetchAvailability,
    updateAvailability,
  } = useScheduleManagement();

  const { employees } = useEmployees();
  const [activeTab, setActiveTab] = useState('shifts');
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showAbsenceDialog, setShowAbsenceDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_active: true
  });

  const [absenceForm, setAbsenceForm] = useState({
    employee_id: '',
    absence_type: 'vacation' as 'vacation' | 'sick_leave' | 'personal' | 'training',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchShifts();
    fetchAbsences();
    fetchAvailability();
  }, []);

  const handleCreateShift = async () => {
    try {
      await createShift(shiftForm);
      setShowShiftDialog(false);
      resetShiftForm();
    } catch (error) {
      console.error('Error creating shift:', error);
    }
  };

  const handleCreateAbsence = async () => {
    try {
      await createAbsence({ ...absenceForm, status: 'pending' });
      setShowAbsenceDialog(false);
      resetAbsenceForm();
    } catch (error) {
      console.error('Error creating absence:', error);
    }
  };

  const resetShiftForm = () => {
    setShiftForm({
      employee_id: '',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      is_active: true
    });
  };

  const resetAbsenceForm = () => {
    setAbsenceForm({
      employee_id: '',
      absence_type: 'vacation',
      start_date: '',
      end_date: '',
      reason: ''
    });
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.profiles?.first_name} ${employee.profiles?.last_name}` : 'N/A';
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek];
  };

  const getAbsenceTypeLabel = (type: string) => {
    const types = {
      vacation: 'Vacaciones',
      sick_leave: 'Baja médica',
      personal: 'Personal',
      training: 'Formación'
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión Avanzada de Horarios</h2>
          <p className="text-muted-foreground">
            Gestiona turnos, ausencias y disponibilidad del personal
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Turno
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Turno</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="employee">Empleado</Label>
                  <Select value={shiftForm.employee_id} onValueChange={(value) => 
                    setShiftForm({ ...shiftForm, employee_id: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {getEmployeeName(employee.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="day">Día de la semana</Label>
                  <Select value={shiftForm.day_of_week.toString()} onValueChange={(value) => 
                    setShiftForm({ ...shiftForm, day_of_week: parseInt(value) })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {getDayName(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">Hora inicio</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={shiftForm.start_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">Hora fin</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={shiftForm.end_time}
                      onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handleCreateShift} className="w-full" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Turno'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAbsenceDialog} onOpenChange={setShowAbsenceDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Nueva Ausencia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Ausencia</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="absence_employee">Empleado</Label>
                  <Select value={absenceForm.employee_id} onValueChange={(value) => 
                    setAbsenceForm({ ...absenceForm, employee_id: value })
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {getEmployeeName(employee.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="absence_type">Tipo de ausencia</Label>
                  <Select value={absenceForm.absence_type} onValueChange={(value: any) => 
                    setAbsenceForm({ ...absenceForm, absence_type: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacaciones</SelectItem>
                      <SelectItem value="sick_leave">Baja médica</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="training">Formación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Fecha inicio</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={absenceForm.start_date}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Fecha fin</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={absenceForm.end_date}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="reason">Motivo</Label>
                  <Input
                    id="reason"
                    value={absenceForm.reason}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                    placeholder="Describe el motivo de la ausencia"
                  />
                </div>

                <Button onClick={handleCreateAbsence} className="w-full" disabled={loading}>
                  {loading ? 'Creando...' : 'Solicitar Ausencia'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shifts">Turnos</TabsTrigger>
          <TabsTrigger value="absences">Ausencias</TabsTrigger>
          <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts">
          <Card>
            <CardHeader>
              <CardTitle>Turnos de Trabajo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Día</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell>{getEmployeeName(shift.employee_id)}</TableCell>
                        <TableCell>{getDayName(shift.day_of_week)}</TableCell>
                        <TableCell>{shift.start_time} - {shift.end_time}</TableCell>
                        <TableCell>
                          <Badge variant={shift.is_active ? 'default' : 'secondary'}>
                            {shift.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateShift(shift.id, { is_active: !shift.is_active })}
                          >
                            {shift.is_active ? 'Desactivar' : 'Activar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {shifts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay turnos configurados. Crea el primer turno usando el botón "Nuevo Turno".
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="absences">
          <Card>
            <CardHeader>
              <CardTitle>Ausencias y Vacaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fechas</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absences.map((absence) => (
                      <TableRow key={absence.id}>
                        <TableCell>{getEmployeeName(absence.employee_id)}</TableCell>
                        <TableCell>{getAbsenceTypeLabel(absence.absence_type)}</TableCell>
                        <TableCell>
                          {format(new Date(absence.start_date), 'dd/MM/yyyy')} - {format(new Date(absence.end_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{absence.reason || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(absence.status) as any} className="flex items-center gap-1">
                            {getStatusIcon(absence.status)}
                            {absence.status === 'pending' ? 'Pendiente' : 
                             absence.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {absence.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => updateAbsenceStatus(absence.id, 'approved', 'current-user-id')}
                              >
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAbsenceStatus(absence.id, 'rejected', 'current-user-id')}
                              >
                                Rechazar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {absences.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No hay ausencias registradas.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidad por Días</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Label className="text-base font-medium">Seleccionar Fecha</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <Label className="text-base font-medium">Empleados Disponibles</Label>
                  <div className="mt-4 space-y-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <span>{getEmployeeName(employee.id)}</span>
                        <Badge variant="outline">Disponible</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedScheduleManagement;