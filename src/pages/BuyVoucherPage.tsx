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
import { Gift, ArrowLeft } from "lucide-react";
const currency = (cents?: number) =>
  typeof cents === "number" ? (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "";

export default function BuyVoucherPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { packages } = usePackages();
  const [pkgId, setPkgId] = useState<string>("");
  const [mode, setMode] = useState<"self" | "gift">("self");
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [recipient, setRecipient] = useState({ name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const selectedPkg = useMemo(() => packages.find(p => p.id === pkgId), [packages, pkgId]);

  const byType = useMemo(() => {
    const acc: Record<string, typeof packages> = {} as any;
    packages.forEach((p) => {
      const t = (p as any).services?.type || 'otros';
      (acc[t] ||= []).push(p);
    });
    return acc;
  }, [packages]);

  const typeLabel = (t: string) => (t === 'massage' ? 'Masajes' : t === 'treatment' ? 'Tratamientos' : 'Otros');

  useEffect(() => {
    document.title = "Comprar Bono | The Nook Madrid";
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgId) {
      toast({ title: "Selecciona un bono", variant: "destructive" });
      return;
    }
    if (!buyer.name || !buyer.email) {
      toast({ title: "Datos del comprador requeridos", variant: "destructive" });
      return;
    }
    const rec = mode === "self" ? buyer : recipient;
    if (!rec.name || !rec.email) {
      toast({ title: "Datos del destinatario requeridos", variant: "destructive" });
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
        window.open(data.url, "_blank");
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
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
                <Link to="/admin-login">Admin</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="hover-lift glass-effect border-primary/20">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Comprar Bono</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Elige el bono y completa los datos del destinatario</p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={submit} className="space-y-6">
                <div>
                  <Label>Bono</Label>
                  <Select value={pkgId} onValueChange={setPkgId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona un bono" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(byType).map(([t, list]) => (
                        <SelectGroup key={t}>
                          <SelectLabel>{typeLabel(t)}</SelectLabel>
                          {list.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} · {p.sessions_count} sesiones · {currency(p.price_cents)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>¿Para quién es?</Label>
                  <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="mt-2 grid grid-cols-2 gap-2">
                    <Label className="border rounded-md p-3 flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="self" /> Para mí
                    </Label>
                    <Label className="border rounded-md p-3 flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="gift" /> Es un regalo
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
                      <h3 className="font-medium mb-2">Destinatario</h3>
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

                <div className="flex justify-end">
                  <Button type="submit">Confirmar compra</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
