import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Calendar, Users, Star, MapPin, Clock, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                The Nook Madrid
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <LanguageSelector />
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin-login">Admin</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Centro de Bienestar
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Descubre la armonía perfecta entre relajación y bienestar en nuestro exclusivo centro de masajes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground px-8 py-4 text-lg" asChild>
              <Link to="/client-reservation">
                <Calendar className="mr-2 h-5 w-5" />
                Reservar Cita
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-4 text-lg" asChild>
              <Link to="/gift-cards">
                <Gift className="mr-2 h-5 w-5" />
                Tarjetas Regalo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Nuestros Servicios</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ofrecemos una amplia gama de tratamientos diseñados para tu bienestar
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover-lift glass-effect border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Masajes Individuales
              </CardTitle>
              <CardDescription>
                Tratamientos personalizados para tu bienestar personal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Masaje Relajante</li>
                <li>• Masaje Descontracturante</li>
                <li>• Reflexología Podal</li>
                <li>• Masaje Deportivo</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover-lift glass-effect border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Masajes para Parejas
              </CardTitle>
              <CardDescription>
                Momentos especiales para compartir en pareja
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Masaje para Dos Personas</li>
                <li>• Ritual Romántico</li>
                <li>• Masaje con Piedras Calientes</li>
                <li>• Bambuterapia</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover-lift glass-effect border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Rituales Especiales
              </CardTitle>
              <CardDescription>
                Experiencias únicas para una relajación profunda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Ritual del Kobido</li>
                <li>• Ritual Sakura</li>
                <li>• Ritual Energizante</li>
                <li>• Ritual Beauty</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gradient-to-r from-primary/5 to-accent/5 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Contáctanos</h2>
            <p className="text-lg text-muted-foreground">
              Estamos aquí para ayudarte a encontrar tu momento de bienestar
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="glass-effect border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground">
                  Encuentra nuestro centro de bienestar en el corazón de Madrid
                </p>
                <Button variant="outline" className="w-full">
                  Ver en Maps
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-effect border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Horarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Lun - Vie: 9:00 - 21:00</p>
                  <p>Sáb - Dom: 10:00 - 20:00</p>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/client-reservation">
                    <Calendar className="mr-2 h-4 w-4" />
                    Reservar Ahora
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center space-x-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="text-sm">+34 XXX XXX XXX</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="text-sm">info@thenookmadrid.com</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            © 2024 The Nook Madrid. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}