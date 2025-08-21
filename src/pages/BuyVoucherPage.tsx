import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { usePackages } from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Gift, ArrowLeft, ChevronDown } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PaymentMethodsInfo } from "@/components/PaymentMethodsInfo";
import { useTranslation } from "@/hooks/useTranslation";
const currency = (cents?: number) =>
  typeof cents === "number" ? (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "";

export default function BuyVoucherPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { packages } = usePackages();
  const { t } = useTranslation();
  const [pkgId, setPkgId] = useState<string>("");
  const [mode, setMode] = useState<"self" | "gift">("self");
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [recipient, setRecipient] = useState({ name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const selectedPkg = useMemo(() => packages.find(p => p.id === pkgId), [packages, pkgId]);

  const isDuo = (name?: string) => {
    const txt = (name || "").toLowerCase();
    return /(dos|pareja|parejas|dúo|duo)/.test(txt) || /\b2\s*personas?\b/.test(txt) || /para\s*2\s*personas?/.test(txt) || /\b(2p|2\s*pax)\b/.test(txt);
  };
  const isCuatroManos = (name?: string) => !!name?.toLowerCase().includes("cuatro manos");
  const isRitual = (name?: string, description?: string) => {
    const txt = `${name || ""} ${description || ""}`.toLowerCase();
    return txt.includes("ritual");
  };

  const categorized = useMemo(() => {
    // Deduplicar por nombre manteniendo el menor precio
    const pmap = new Map<string, any>();
    for (const p of packages as any[]) {
      const key = (p?.name || "").trim().toLowerCase();
      const existing = pmap.get(key);
      const price = typeof p?.price_cents === 'number' ? p.price_cents : Number.MAX_SAFE_INTEGER;
      const existingPrice = typeof existing?.price_cents === 'number' ? existing.price_cents : Number.MAX_SAFE_INTEGER;
      if (!existing || price < existingPrice) {
        pmap.set(key, p);
      }
    }
    const list = Array.from(pmap.values());

    const grupos: Record<string, typeof packages> = {
      individuales: [] as any,
      cuatro: [] as any,
      rituales: [] as any,
      paraDos: [] as any,
    };

    list.forEach((p: any) => {
      const name = p?.services?.name || p?.name || "";
      const desc = p?.services?.description || p?.description || "";
      if (isCuatroManos(name)) grupos.cuatro.push(p);
      else if (isRitual(name, desc)) grupos.rituales.push(p);
      else if (isDuo(name)) grupos.paraDos.push(p);
      else grupos.individuales.push(p);
    });
    return grupos;
  }, [packages]);

  useEffect(() => {
    document.title = `${t('buy_voucher')} | The Nook Madrid`;
  }, [t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgId) {
      toast({ title: t('select_voucher_error'), variant: "destructive" });
      return;
    }
    if (!buyer.name || !buyer.email) {
      toast({ title: t('buyer_data_required'), variant: "destructive" });
      return;
    }
    const rec = mode === "self" ? buyer : recipient;
                      if (!rec.name || !rec.email) {
                        toast({ title: t('beneficiary_data_required'), variant: "destructive" });
                        return;
                      }

    try {
      const payload = {
        intent: "package_voucher" as const,
        package_voucher: {
          package_id: pkgId,
          mode,
          buyer,
          recipient: rec,
          notes,
        },
        currency: "eur",
      };
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: payload });
      if (error) throw error;
      if (data?.url) {
        setShowPayment(true);
        // Scroll to payment section
        setTimeout(() => {
          document.getElementById("payment-section")?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        toast({ title: "Error", description: "No se pudo iniciar el pago" , variant: "destructive"});
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "No se pudo iniciar el pago", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                The Nook Madrid
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <LanguageSelector />
              <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('back')}
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                <Link to="/admin-login">{t('admin')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="hover-lift glass-effect border-primary/20 shadow-lg">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{t('buy_voucher')}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t('voucher_subtitle')}</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={submit} className="space-y-6">
                <div>
                  <Label>{t('voucher')}</Label>
                  <Select value={pkgId} onValueChange={setPkgId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('select_voucher')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-primary font-semibold text-sm">🧘 {t('individual_massages')}</SelectLabel>
                        {categorized.individuales.length > 0 ? (
                          categorized.individuales.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="pl-6">
                              {p.name} · {p.sessions_count} {t('sessions')} · {currency(p.price_cents)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no_ind__" disabled>
                            No hay bonos individuales
                          </SelectItem>
                        )}
                      </SelectGroup>

                      <SelectGroup>
                        <SelectLabel className="text-primary font-semibold text-sm">✋ Masajes a Cuatro Manos</SelectLabel>
                        {categorized.cuatro.length > 0 ? (
                          categorized.cuatro.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="pl-6">
                              {p.name} · {p.sessions_count} sesiones · {currency(p.price_cents)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no_cuatro__" disabled>
                            No hay bonos a cuatro manos
                          </SelectItem>
                        )}
                      </SelectGroup>

                      <SelectGroup>
                        <SelectLabel className="text-primary font-semibold text-sm">🌸 Rituales</SelectLabel>
                        {categorized.rituales.length > 0 ? (
                          categorized.rituales.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="pl-6">
                              {p.name} · {p.sessions_count} sesiones · {currency(p.price_cents)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no_rit__" disabled>
                            No hay bonos de rituales
                          </SelectItem>
                        )}
                      </SelectGroup>

                      <SelectGroup>
                        <SelectLabel className="text-primary font-semibold text-sm">💑 Bonos para Dos Personas</SelectLabel>
                        {categorized.paraDos.length > 0 ? (
                          categorized.paraDos.map((p: any) => (
                            <SelectItem key={p.id} value={p.id} className="pl-6">
                              {p.name} · {p.sessions_count} sesiones · {currency(p.price_cents)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__no_dos__" disabled>
                            No hay bonos para dos
                          </SelectItem>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('who_for')}</Label>
                  <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="mt-2 grid grid-cols-2 gap-2">
                    <Label className="border rounded-md p-3 flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="self" /> {t('for_me')}
                    </Label>
                    <Label className="border rounded-md p-3 flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="gift" /> {t('its_gift')}
                    </Label>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Comprador</h3>
                    <Label>Nombre</Label>
                    <Input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} className="mb-2" />
                    <Label>Email</Label>
                    <Input type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} className="mb-2" />
                    <Label>Teléfono</Label>
                    <Input value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} />
                  </div>
                  {mode === 'gift' && (
                    <div>
                      <h3 className="font-medium mb-2">Beneficiario</h3>
                      <Label>Nombre</Label>
                      <Input value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} className="mb-2" />
                      <Label>Email</Label>
                      <Input type="email" value={recipient.email} onChange={(e) => setRecipient({ ...recipient, email: e.target.value })} className="mb-2" />
                      <Label>Teléfono</Label>
                      <Input value={recipient.phone} onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })} />
                    </div>
                  )}
                </div>

                <div>
                  <Label>Notas (opcional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Escribe aquí si quieres comentarnos cualquier cosa" />
                </div>

                {selectedPkg && (
                  <div className="text-sm text-muted-foreground">
                    Total: {currency(selectedPkg.price_cents)} · {selectedPkg.sessions_count} sesiones
                  </div>
                )}

                <PaymentMethodsInfo />

                <div className="flex justify-end">
                  <Button type="submit" className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground px-8 py-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                    Confirmar compra
                  </Button>
                </div>

                {/* Payment Section */}
                {showPayment && (
                  <div id="payment-section" className="mt-8 p-6 bg-gradient-to-r from-accent/10 to-primary/10 rounded-lg border border-primary/20 animate-fade-in">
                    <div className="text-center space-y-4">
                      <h3 className="text-lg font-semibold text-primary">Proceder al Pago</h3>
                      <p className="text-sm text-muted-foreground">
                        Se abrirá una nueva ventana segura para completar tu compra.
                        El bono se enviará automáticamente por email al comprador y beneficiario.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                          <span>✉️ Email al comprador</span>
                          <span>✉️ Email al beneficiario</span>
                          <span>✉️ Notificación al centro</span>
                        </div>
                        <Button 
                          onClick={async () => {
                            try {
                              const payload = {
                                intent: "package_voucher" as const,
                                package_voucher: {
                                  package_id: pkgId,
                                  mode,
                                  buyer,
                                  recipient: mode === "self" ? buyer : recipient,
                                  notes,
                                },
                                currency: "eur",
                              };
                              const { data, error } = await supabase.functions.invoke("create-checkout", { body: payload });
                              if (error) throw error;
                              if (data?.url) {
                                window.open(data.url, "_blank");
                              }
                            } catch (err: any) {
                              toast({ title: "Error", description: err.message || "No se pudo iniciar el pago", variant: "destructive" });
                            }
                          }}
                          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Abrir Página de Pago Seguro
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
