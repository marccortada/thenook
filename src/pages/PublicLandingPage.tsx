import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Calendar, Star, MapPin, Phone, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function PublicLandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Precise map configuration; set lat/lng when you want exact pin placement
  const MAPS = {
    chamberi: {
      address: 'Centro de masajes Madrid Zurbarán - The Nook, C. de Zurbarán, 10, bajo dcha, Chamberí, 28010 Madrid',
      label: 'Centro de masajes Madrid Zurbarán - The Nook',
      lat: 40.430162857302524,
      lng: -3.6917834872211705,
    },
    chamartin: {
      address: 'Centro de masajes Madrid Concha Espina - The Nook, C. del Príncipe de Vergara, 204 duplicado posterior, local 10, 28002 Madrid',
      label: 'Centro de masajes Madrid Concha Espina - The Nook',
      lat: 40.44962561648345,
      lng: -3.6771259067454367,
    }
  } as const;

  const buildEmbed = (cfg: { address: string; label?: string; lat?: number; lng?: number }) => {
    if (cfg.lat != null && cfg.lng != null) {
      const { lat, lng } = cfg;
      const q = cfg.label ? `${cfg.label}, ${cfg.address}` : `${lat},${lng}`;
      return `https://maps.google.com/maps?hl=es&q=${encodeURIComponent(q)}&ll=${lat},${lng}&z=18&output=embed`;
    }
    const qAddr = cfg.label ? `${cfg.label}, ${cfg.address}` : cfg.address;
    return `https://www.google.com/maps?hl=es&q=${encodeURIComponent(qAddr)}&z=17&output=embed`;
  };
  const buildMapLink = (cfg: { address: string; label?: string; lat?: number; lng?: number }) => {
    const q = cfg.label ? `${cfg.label}, ${cfg.address}` : cfg.address;
    if (cfg.lat != null && cfg.lng != null) {
      return `https://maps.google.com/?q=${encodeURIComponent(q)}&ll=${cfg.lat},${cfg.lng}&z=18`;
    }
    return `https://maps.google.com/?q=${encodeURIComponent(q)}`;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Simple Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold">
              <Link to="/" className="inline-flex items-center gap-3">
                <img
                  src="/lovable-uploads/475dc4d6-6d6b-4357-a8b5-4611869beb43.png"
                  alt="Logotipo The Nook Madrid"
                  className="h-8 w-auto md:h-10"
                  loading="lazy"
                  width={160}
                  height={40}
                />
                <span className="sr-only">The Nook Madrid</span>
              </Link>
            </h1>
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

      {/* Main Widgets - Mobile Optimized */}
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {/* Reservar Cita */}
          <Card className="glass-effect border-primary/20 shadow-lg flex flex-col">
            <CardHeader className="text-center p-4 sm:p-6 flex-1 flex flex-col gap-2">
              <CardTitle className="flex items-center justify-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="text-sm sm:text-base">{t('book_appointment')}</span>
              </CardTitle>
              <CardDescription className="text-center text-sm">
                {t('book_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center p-4 sm:p-6 pt-0 mt-auto">
              <Button size="lg" asChild className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground text-sm sm:text-base py-3">
                <Link to="/client-reservation">
                  <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {t('book_now')}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Bonos */}
          <Card className="glass-effect border-primary/20 shadow-lg flex flex-col">
            <CardHeader className="text-center p-4 sm:p-6 flex-1 flex flex-col gap-2">
              <CardTitle className="flex items-center justify-center gap-2 text-lg sm:text-xl">
                <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="text-sm sm:text-base">{t('vouchers')}</span>
              </CardTitle>
              <CardDescription className="text-center text-sm">
                {t('vouchers_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center p-4 sm:p-6 pt-0 mt-auto">
              <Button size="lg" variant="outline" asChild className="w-full text-sm sm:text-base py-3">
                <Link to="/packages">
                  <Gift className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {t('buy_voucher')}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Tarjetas de Regalo */}
          <Card className="glass-effect border-primary/20 shadow-lg flex flex-col">
            <CardHeader className="text-center p-4 sm:p-6 flex-1 flex flex-col gap-2">
              <CardTitle className="flex items-center justify-center gap-2 text-lg sm:text-xl">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span className="text-sm sm:text-base">{t('gift_cards')}</span>
              </CardTitle>
              <CardDescription className="text-center text-sm">
                {t('gift_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center p-4 sm:p-6 pt-0 mt-auto">
              <Button size="lg" variant="outline" asChild className="w-full text-sm sm:text-base py-3">
                <Link to="/gift-cards">
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
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto items-stretch">
          {/* Chamberí */}
          <Card className="glass-effect border-primary/20 shadow-lg h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {t('chamberi_zurbaran')}
              </CardTitle>
              <CardDescription>
                {MAPS.chamberi.address}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-4 flex-1 flex flex-col">
                <iframe
                  src={buildEmbed(MAPS.chamberi)}
                  width="100%"
                  height="220"
                  style={{ border: 0, borderRadius: "8px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="mt-auto">
                  <Button variant="outline" className="w-full" asChild>
                    <a 
                      href={buildMapLink(MAPS.chamberi)}
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {t('open_maps')}
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chamartín */}
          <Card className="glass-effect border-primary/20 shadow-lg h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {t('chamartin_concha_espina')}
              </CardTitle>
              <CardDescription>
                {MAPS.chamartin.address}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-4 flex-1 flex flex-col">
                <iframe
                  src={buildEmbed(MAPS.chamartin)}
                  width="100%"
                  height="220"
                  style={{ border: 0, borderRadius: "8px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="mt-auto">
                  <Button variant="outline" className="w-full" asChild>
                    <a 
                      href={buildMapLink(MAPS.chamartin)}
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {t('open_maps')}
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 text-muted-foreground">
            <a href="tel:911481474" className="flex items-center gap-2 hover:text-primary transition-colors">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm whitespace-nowrap">911 481 474</span>
            </a>
            <a href="https://wa.me/+34622360922" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
              <span className="text-sm">💬</span>
              <span className="text-sm whitespace-nowrap">WhatsApp</span>
            </a>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm break-all sm:break-normal">reservas@thenookmadrid.com</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {t('copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
}
