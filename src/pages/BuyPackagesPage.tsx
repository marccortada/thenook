import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Gift, Package, Plus, Minus, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PackageOption {
  id: string;
  name: string;
  sessions_count: number;
  price_cents: number;
  services?: {
    name: string;
    duration_minutes: number;
  };
  centers?: {
    name: string;
  };
}

interface CartItem {
  packageId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (packageOption: PackageOption) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.packageId === packageOption.id);
      if (existing) {
        return prev.map((i) =>
          i.packageId === packageOption.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          packageId: packageOption.id,
          name: packageOption.name,
          priceCents: packageOption.price_cents,
          quantity: 1,
        },
      ];
    });
  };

  const remove = (packageId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.packageId === packageId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter((i) => i.packageId !== packageId);
      }
      return prev.map((i) =>
        i.packageId === packageId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  const clear = () => setItems([]);

  const totalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    [items]
  );

  return { items, add, remove, clear, totalCents };
};

const BuyPackagesPage = () => {
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [purchasedByName, setPurchasedByName] = useState("");
  const [purchasedByEmail, setPurchasedByEmail] = useState("");
  const { t } = useTranslation();
  const { toast } = useToast();
  const cart = useCart();

  useEffect(() => {
    document.title = "Comprar Bonos | The Nook Madrid";
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          services(name, duration_minutes),
          centers(name)
        `)
        .eq('active', true)
        .order('price_cents');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los bonos disponibles",
        variant: "destructive",
      });
    }
  };

  const handlePurchase = async () => {
    if (!purchasedByName || !purchasedByEmail || cart.items.length === 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('purchase-voucher', {
        body: {
          purchaser_name: purchasedByName,
          purchaser_email: purchasedByEmail,
          items: cart.items,
          total_cents: cart.totalCents,
          type: 'package'
        }
      });

      if (error) throw error;

      toast({
        title: "¡Compra exitosa!",
        description: "Te hemos enviado la confirmación por email",
      });

      cart.clear();
      setPurchasedByName("");
      setPurchasedByEmail("");
    } catch (error) {
      console.error('Error purchasing packages:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar la compra. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (cents: number) => (cents / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR'
  });

  // Agrupar bonos por tipo
  const groupedPackages = useMemo(() => {
    const groups = {
      individual: packages.filter(p => !p.name.toLowerCase().includes('pareja') && !p.name.toLowerCase().includes('dos')),
      duo: packages.filter(p => p.name.toLowerCase().includes('pareja') || p.name.toLowerCase().includes('dos'))
    };
    return groups;
  }, [packages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              ← The Nook Madrid
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              Comprar Bonos de Masaje
            </h1>
            <p className="text-lg text-muted-foreground">
              Ahorra comprando paquetes de sesiones con descuento
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Packages Selection */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Selecciona tus Bonos</CardTitle>
                  <CardDescription>
                    Elige entre nuestros bonos disponibles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {/* Bonos Individuales */}
                    {groupedPackages.individual.length > 0 && (
                      <AccordionItem value="individual">
                        <AccordionTrigger>Bonos Individuales</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-4">
                            {groupedPackages.individual.map((pkg) => (
                              <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                  <h4 className="font-medium">{pkg.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {pkg.sessions_count} sesiones
                                    {pkg.services?.duration_minutes && ` · ${pkg.services.duration_minutes} min`}
                                  </p>
                                  <p className="font-semibold text-primary">
                                    {formatPrice(pkg.price_cents)}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => cart.add(pkg)}
                                  className="ml-4"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Añadir
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Bonos para Parejas */}
                    {groupedPackages.duo.length > 0 && (
                      <AccordionItem value="duo">
                        <AccordionTrigger>Bonos para Parejas</AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-4">
                            {groupedPackages.duo.map((pkg) => (
                              <div key={pkg.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                  <h4 className="font-medium">{pkg.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {pkg.sessions_count} sesiones
                                    {pkg.services?.duration_minutes && ` · ${pkg.services.duration_minutes} min`}
                                  </p>
                                  <p className="font-semibold text-primary">
                                    {formatPrice(pkg.price_cents)}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => cart.add(pkg)}
                                  className="ml-4"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Añadir
                                </Button>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            {/* Cart & Purchase */}
            <div className="space-y-6">
              {/* Cart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Tu Carrito
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.items.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No hay bonos en el carrito
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {cart.items.map((item) => (
                        <div key={item.packageId} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(item.priceCents)} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cart.remove(item.packageId)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Badge variant="secondary">{item.quantity}</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => cart.add({ 
                                id: item.packageId, 
                                name: item.name, 
                                price_cents: item.priceCents 
                              } as PackageOption)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>{formatPrice(cart.totalCents)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Purchase Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Datos de Compra</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre Completo *</Label>
                    <Input
                      id="name"
                      value={purchasedByName}
                      onChange={(e) => setPurchasedByName(e.target.value)}
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={purchasedByEmail}
                      onChange={(e) => setPurchasedByEmail(e.target.value)}
                      placeholder="tu@email.com"
                    />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handlePurchase}
                    disabled={cart.items.length === 0 || !purchasedByName || !purchasedByEmail}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Comprar por {formatPrice(cart.totalCents)}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BuyPackagesPage;