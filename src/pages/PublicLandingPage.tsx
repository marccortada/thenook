import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Calendar, Star, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import AppLogo from "@/components/AppLogo";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function PublicLandingPage() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Simple Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <AppLogo className="h-8 w-auto" />
            <div className="flex items-center space-x-3">
              <LanguageSelector />
              {/* Secret admin access */}
              <Link to="/panel-gestion-nook-madrid-2024" className="opacity-5 hover:opacity-100 transition-opacity">
                <span className="text-xs text-muted-foreground">•</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Widgets */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Reservar Cita */}
          <Card className="hover-lift glass-effect border-primary/20 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Calendar className="h-6 w-6 text-primary" />
                {t('book_appointment')}
              </CardTitle>
              <CardDescription className="text-center">
                {t('book_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground" asChild>
                <Link to="/client-reservation">
                  <Calendar className="mr-2 h-5 w-5" />
                  {t('book_now')}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Bonos */}
          <Card className="hover-lift glass-effect border-primary/20 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Gift className="h-6 w-6 text-primary" />
                {t('vouchers')}
              </CardTitle>
              <CardDescription className="text-center">
                {t('vouchers_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" variant="outline" className="w-full" asChild>
                <Link to="/comprar-bono">
                  <Gift className="mr-2 h-5 w-5" />
                  {t('buy_voucher')}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Tarjetas de Regalo */}
          <Card className="hover-lift glass-effect border-primary/20 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-xl">
                <Star className="h-6 w-6 text-primary" />
                {t('gift_cards')}
              </CardTitle>
              <CardDescription className="text-center">
                {t('gift_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button size="lg" variant="outline" className="w-full" asChild>
                <Link to="/tarjetas-regalo">
                  <Star className="mr-2 h-5 w-5" />
                  {t('gift_cards')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Locations with Maps */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('our_locations')}</h2>
          <p className="text-lg text-muted-foreground">
            {t('locations_subtitle')}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Centro Zurbarán */}
          <Card className="glass-effect border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Centro Zurbarán
              </CardTitle>
              <CardDescription>
                C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3036.5489!2d-3.6917!3d40.4296!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd4228849b1e5263%3A0x7e1b9e3f8b3c1234!2sC.%20de%20Zurbar%C3%A1n%2C%2010%2C%20Chamber%C3%AD%2C%2028010%20Madrid!5e0!3m2!1sen!2ses!4v1234567890"
                  width="100%"
                  height="200"
                  style={{ border: 0, borderRadius: "8px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
                <Button variant="outline" className="w-full" asChild>
                  <a 
                    href="https://maps.google.com/?q=C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {t('open_maps')}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Centro Concha Espina */}
          <Card className="glass-effect border-primary/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Centro Concha Espina
              </CardTitle>
              <CardDescription>
                C. del Príncipe de Vergara, 204 duplicado posterior, local 10, 28002 Madrid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3035.8765!2d-3.6789!3d40.4387!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd4227a8b2e5f123%3A0x9f2c8d7e6a5b4321!2sC.%20del%20Pr%C3%ADncipe%20de%20Vergara%2C%20204%2C%2028002%20Madrid!5e0!3m2!1sen!2ses!4v1234567890"
                  width="100%"
                  height="200"
                  style={{ border: 0, borderRadius: "8px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
                <Button variant="outline" className="w-full" asChild>
                  <a 
                    href="https://maps.google.com/?q=C. del Príncipe de Vergara, 204 duplicado posterior, local 10, 28002 Madrid" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {t('open_maps')}
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
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
            © 2024 The Nook Madrid. {t('rights_reserved')}.
          </p>
        </div>
      </footer>
    </div>
  );
}