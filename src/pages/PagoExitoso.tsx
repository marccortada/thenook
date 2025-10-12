import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

const PagoExitoso = () => {
  const [search] = useSearchParams();
  const sessionId = search.get("session_id");
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const intent = result?.intent;
  const storedIntent = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.sessionStorage.getItem("lastCheckoutIntent");
    } catch (_e) {
      return null;
    }
  }, []);

  const storedGiftCards = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.sessionStorage.getItem("lastGiftCardSummary");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];
      return [];
    } catch (_e) {
      return [];
    }
  }, []);

  const giftCards = useMemo(() => {
    const raw =
      result?.gift_cards ??
      (result as any)?.giftCards ??
      (result as any)?.data?.gift_cards ??
      (result as any)?.data?.giftCards;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    if (raw && typeof raw === "object") return [raw];
    return storedGiftCards;
  }, [result, storedGiftCards]);

  const normalizedIntent = useMemo(() => {
    const base = result?.intent ?? (result as any)?.data?.intent ?? storedIntent;
    return typeof base === "string" ? base.toLowerCase() : "";
  }, [result, storedIntent]);

  const isGiftCard = useMemo(() => {
    if (giftCards.length > 0) return true;
    if (normalizedIntent.includes("gift")) return true;
    const metaIntent = (result as any)?.metadata?.intent ?? (result as any)?.metadata?.type;
    if (typeof metaIntent === "string" && metaIntent.toLowerCase().includes("gift")) return true;
    return storedIntent?.toLowerCase() === "gift_cards";
  }, [giftCards, normalizedIntent, result, storedIntent]);

  const isPackageVoucher = !isGiftCard && normalizedIntent === "package_voucher";
  const formatEuro = (cents?: number) =>
    typeof cents === "number"
      ? new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "EUR",
        }).format(cents / 100)
      : null;

  useEffect(() => {
    document.title = "Pago Exitoso | The Nook Madrid";
    if (!sessionId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        console.log("[PagoExitoso] verify-payment response", { data, error });
        if (error) throw error;
        setResult(data);
        if (data?.paid) toast.success("¡Pago completado exitosamente!");
        else toast.error("El pago está siendo procesado");
      } catch (e: any) {
        console.error("[PagoExitoso] verify-payment error", e);
        toast.error(e.message || "Error al verificar el pago");
      } finally {
        setLoading(false);
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.removeItem("lastCheckoutIntent");
            window.sessionStorage.removeItem("lastGiftCardSummary");
          } catch (_e) {
            // ignore
          }
        }
      }
    })();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
              <img
                src="/lovable-uploads/475dc4d6-6d6b-4357-a8b5-4611869beb43.png"
                alt="The Nook Madrid"
                className="h-8 w-auto md:h-10"
                loading="lazy"
                width={160}
                height={40}
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                ¡Pago Completado!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Verificando tu pago...</p>
                </div>
              ) : (
                <>
                  {result?.paid ? (
                    <>
                      <p className="text-muted-foreground">
                        {isGiftCard
                          ? "Tu tarjeta regalo se ha emitido correctamente."
                          : isPackageVoucher
                            ? "Tu bono se ha emitido correctamente."
                            : "Tu pago se ha procesado correctamente."}
                      </p>

                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-left">
                        <p className="text-sm text-green-800">
                          {isGiftCard
                            ? "En unos minutos recibirás un correo con la tarjeta regalo personalizada, lista para descargar y compartir."
                            : isPackageVoucher
                              ? "En unos minutos recibirás un correo con el código del bono y las instrucciones para canjearlo."
                              : "Recibirás un correo electrónico con los detalles de tu compra en los próximos minutos."}
                        </p>
                      </div>

                      {isGiftCard && giftCards.length > 0 && (
                        <div className="bg-white border border-primary/20 rounded-lg p-4 text-left space-y-3">
                          <p className="text-sm font-medium text-primary">
                            Resumen de tu tarjeta regalo
                          </p>
                          {giftCards.map((card: any, index: number) => (
                            <div
                              key={card.id ?? index}
                              className="rounded-md bg-primary/5 p-3 space-y-1"
                            >
                              <p className="text-sm font-semibold text-primary">
                                {card.gift_card_name || "Tarjeta regalo"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Código: <span className="font-mono font-semibold">{card.code}</span>
                              </p>
                              {typeof card.amount_cents === "number" && (
                                <p className="text-sm text-muted-foreground">
                                  Valor: <span className="font-semibold">{formatEuro(card.amount_cents)}</span>
                                </p>
                              )}
                              {card.recipient_name && (
                                <p className="text-sm text-muted-foreground">
                                  Destinatario: <span className="font-semibold">{card.recipient_name}</span>
                                  {card.recipient_email ? (
                                    <span className="font-normal"> · {card.recipient_email}</span>
                                  ) : null}
                                </p>
                              )}
                            </div>
                          ))}
                          <p className="text-xs text-muted-foreground">
                            También hemos enviado la tarjeta personalizada por correo electrónico como adjunto para que la descargues.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Tu pago está siendo procesado. Te notificaremos cuando se complete.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3 pt-4">
                    <Button asChild className="w-full">
                      <Link to={isGiftCard ? "/gift-cards" : "/packages"}>
                        <Download className="w-4 h-4 mr-2" />
                        {isGiftCard ? "Comprar otra tarjeta regalo" : "Comprar otro bono"}
                      </Link>
                    </Button>
                    
                    <Button variant="outline" asChild className="w-full">
                      <Link to="/">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al inicio
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PagoExitoso;
