import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

const Dashboard = () => {
  const todayStats = {
    totalBookings: 12,
    confirmedBookings: 8,
    pendingBookings: 3,
    revenue: 720,
  };

  const upcomingBookings = [
    {
      id: 1,
      client: "Ana García",
      service: "Masaje Relajante",
      time: "10:00",
      duration: 60,
      center: "Madrid Centro",
      lane: "Sala 1",
      status: "confirmed",
    },
    {
      id: 2,
      client: "Carlos López",
      service: "Masaje Deportivo",
      time: "11:30",
      duration: 90,
      center: "Madrid Centro",
      lane: "Sala 2",
      status: "pending",
    },
    {
      id: 3,
      client: "María Rodríguez",
      service: "Tratamiento Facial",
      time: "14:00",
      duration: 45,
      center: "Madrid Centro",
      lane: "Sala VIP",
      status: "confirmed",
    },
  ];

  const statusColors = {
    confirmed: "bg-accent text-accent-foreground",
    pending: "bg-secondary text-secondary-foreground",
    cancelled: "bg-destructive text-destructive-foreground",
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reservas Hoy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {todayStats.confirmedBookings} confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">Por confirmar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{todayStats.revenue}</div>
            <p className="text-xs text-muted-foreground">Estimado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">75%</div>
            <p className="text-xs text-muted-foreground">Promedio del día</p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Reservas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-medium">{booking.time}</div>
                  <div>
                    <div className="font-medium">{booking.client}</div>
                    <div className="text-sm text-muted-foreground">
                      {booking.service} • {booking.duration} min
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center space-x-2">
                      <MapPin className="h-3 w-3" />
                      <span>{booking.center} - {booking.lane}</span>
                    </div>
                  </div>
                </div>
                <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                  {booking.status === "confirmed" ? "Confirmada" : "Pendiente"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;