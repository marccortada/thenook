import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  MapPin,
  User,
} from "lucide-react";

const CONFIRMED_INTENT_KEY = "bookingPaymentSetup:lastConfirmedIntent";
const LAST_BOOKING_KEY = "bookingPaymentSetup:lastBookingId";

interface BookingDetails {
  id: string;
  booking_datetime: string;
  duration_minutes: number;
  total_price_cents: number;
  payment_method_status: string | null;
  services: { name: string } | null;
  employees: { profiles: { first_name: string; last_name: string } | null } | null;
  centers: { name: string | null; address: string | null } | null;
}

const PaymentSetupSuccess = () => {
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"confirming" | "confirmed" | "pending" | "error">(
    "confirming",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setupIntentParam = useMemo(
    () =>
      (
        searchParams.get("setup_intent") ||
        searchParams.get("setup_intent_id") ||
        searchParams.get("setupIntent")
      )?.trim() ?? "",
    [searchParams],
  );
  const bookingIdParam = useMemo(
    () => searchParams.get("booking_id")?.trim() ?? "",
    [searchParams],
  );

  useEffect(() => {
    document.title = "Tarjeta confirmada | The Nook Madrid";
  }, []);

  const fetchBooking = useCallback(async (bookingId: string) => {
    if (!bookingId) return null;
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        booking_datetime,
        duration_minutes,
        total_price_cents,
        payment_method_status,
        services(name),
        employees(profiles(first_name,last_name)),
        centers(name,address)
      `,
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    return data as BookingDetails | null;
  }, []);

  useEffect(() => {
    let ignore = false;

    const confirmAndLoad = async () => {
      setLoading(true);
      let resolvedBookingId = bookingIdParam;
      const confirmedIntent =
        typeof window === "undefined"
          ? null
          : window.sessionStorage.getItem(CONFIRMED_INTENT_KEY);

      try {
        if (setupIntentParam && confirmedIntent !== setupIntentParam) {
          setStatus("confirming");
          const { data, error } = await supabase.functions.invoke("confirm-payment-method", {
            body: { setup_intent_id: setupIntentParam },
          });
          if (error) {
            throw new Error(error.message || "Error al confirmar la tarjeta");
          }
          if (ignore) return;

          const remoteStatus =
            typeof data?.status === "string" && data.status.length > 0
              ? data.status.toLowerCase()
              : "";
          const isSucceeded = remoteStatus === "succeeded";
          setStatus(isSucceeded ? "confirmed" : "pending");

          if (data?.booking_id && typeof data.booking_id === "string") {
            resolvedBookingId = data.booking_id;
          }
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(CONFIRMED_INTENT_KEY, setupIntentParam);
            if (resolvedBookingId) {
              window.sessionStorage.setItem(LAST_BOOKING_KEY, resolvedBookingId);
            }
          }

          if (isSucceeded) {
            toast({
              title: "¡Tarjeta confirmada!",
              description: "Hemos asegurado tu reserva correctamente.",
            });
          } else {
            toast({
              title: "Estamos confirmando tu tarjeta",
              description: "Te avisaremos por correo en cuanto todo esté listo.",
            });
          }
        } else if (!setupIntentParam) {
          setStatus("pending");
          if (!resolvedBookingId) {
            const storedBookingId =
              typeof window === "undefined"
                ? ""
                : window.sessionStorage.getItem(LAST_BOOKING_KEY) ?? "";
            resolvedBookingId = storedBookingId;
          }
          setErrorMessage(
            "No pudimos identificar la confirmación automáticamente, pero tu reserva sigue activa.",
          );
        } else {
          // Already confirmed in this session
          setStatus("confirmed");
          if (!resolvedBookingId) {
            const storedBookingId =
              typeof window === "undefined"
                ? ""
                : window.sessionStorage.getItem(LAST_BOOKING_KEY) ?? "";
            resolvedBookingId = storedBookingId;
          }
        }

        const bookingIdToFetch = resolvedBookingId;
        if (bookingIdToFetch) {
          const bookingData = await fetchBooking(bookingIdToFetch);
          if (!ignore) {
            setBooking(bookingData);
          }
        }
      } catch (err) {
        if (ignore) return;
        console.error("[PaymentSetupSuccess] confirm error", err);
        setStatus("error");
        const message =
          err instanceof Error
            ? err.message
            : "Hubo un problema al confirmar tu método de pago.";
        setErrorMessage(message);
        toast({
          title: "Error al confirmar la tarjeta",
          description: message,
          variant: "destructive",
        });

        try {
          const fallbackBookingId =
            resolvedBookingId ||
            (typeof window !== "undefined"
              ? window.sessionStorage.getItem(LAST_BOOKING_KEY) ?? ""
              : "");
          if (fallbackBookingId) {
            const bookingData = await fetchBooking(fallbackBookingId);
            if (!ignore) {
              setBooking(bookingData);
            }
          }
        } catch (fetchError) {
          console.error("[PaymentSetupSuccess] booking fallback error", fetchError);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    confirmAndLoad();

    return () => {
      ignore = true;
    };
  }, [bookingIdParam, fetchBooking, setupIntentParam]);

  const bookingDate = useMemo(() => {
    if (!booking?.booking_datetime) return null;
    const date = new Date(booking.booking_datetime);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [booking]);

  const formattedDate = useMemo(() => {
    if (!bookingDate) return "Fecha a confirmar";
    return bookingDate.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [bookingDate]);

  const formattedTime = useMemo(() => {
    if (!bookingDate) return "";
    return bookingDate.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [bookingDate]);

  const formattedPrice = useMemo(() => {
    const cents = booking?.total_price_cents;
    if (typeof cents !== "number") return null;
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  }, [booking]);

  const employeeName = useMemo(() => {
    const profile = booking?.employees?.profiles;
    if (!profile) return "Nuestro equipo";
    return `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Nuestro equipo";
  }, [booking]);

  const centerDisplay = useMemo(() => {
    const name = booking?.centers?.name ?? "";
    const address = booking?.centers?.address ?? "";
    if (/zurbar[aá]n/i.test(name) || /zurbar[aá]n/i.test(address)) {
      return "The Nook · Zurbarán";
    }
    if (/vergara/i.test(name) || /concha\s*espina/i.test(address)) {
      return "The Nook · Concha Espina";
    }
    return name || "The Nook Madrid";
  }, [booking]);

  const isConfirmed =
    status === "confirmed" || booking?.payment_method_status === "succeeded";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center transition-opacity hover:opacity-80">
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

      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                {isConfirmed ? "¡Reserva asegurada!" : "Confirmando tu tarjeta"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="py-6">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                  <p className="text-sm text-muted-foreground">
                    Estamos verificando la confirmación con Stripe...
                  </p>
                </div>
              ) : status === "error" ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">
                        No hemos podido confirmar tu método de pago.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {errorMessage ??
                          "Por favor, contacta con nosotros para finalizar la reserva."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    {isConfirmed
                      ? "Perfecto, tu método de pago está confirmado. El cargo se realizará automáticamente el día de tu tratamiento."
                      : "Tu método de pago está en proceso de confirmación. Te enviaremos un correo en cuanto quede asegurado."}
                  </p>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-left">
                    <p className="text-sm text-primary">
                      Si necesitas modificar o cancelar tu cita, puedes hacerlo sin coste hasta 24h
                      antes. Escríbenos si necesitas ayuda.
                    </p>
                  </div>
                  {errorMessage && status !== "error" && (
                    <p className="text-sm text-muted-foreground">{errorMessage}</p>
                  )}
                  <div className="space-y-3 pt-2">
                    <Button asChild className="w-full">
                      <Link to="/">Volver al inicio</Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                      <a href="mailto:reservas@thenookmadrid.com">Contactar con The Nook</a>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {booking && (
            <Card>
              <CardHeader>
                <CardTitle className="text-left text-xl">Detalles de tu reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-left text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={isConfirmed ? "default" : "secondary"}
                    className={isConfirmed ? "bg-green-600 hover:bg-green-600" : undefined}
                  >
                    {isConfirmed ? "Tarjeta confirmada" : "Confirmación en proceso"}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Fecha</p>
                      <p className="text-muted-foreground capitalize">{formattedDate}</p>
                      {formattedTime && (
                        <p className="text-xs text-muted-foreground">{formattedTime} h</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Duración</p>
                      <p className="text-muted-foreground">
                        {booking.duration_minutes
                          ? `${booking.duration_minutes} minutos`
                          : "Duración estimada"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Profesional</p>
                      <p className="text-muted-foreground">{employeeName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Centro</p>
                      <p className="text-muted-foreground">{centerDisplay}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Servicio</p>
                      <p className="text-muted-foreground">
                        {booking.services?.name ?? "Tratamiento personalizado"}
                      </p>
                      {formattedPrice && (
                        <p className="text-xs text-muted-foreground">Precio {formattedPrice}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentSetupSuccess;
