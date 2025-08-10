import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
}

type GiftType = "fixed" | "custom";

interface GiftCardItem {
  id: string;
  name: string;
  type: GiftType;
  priceCents?: number; // only for fixed
  imageUrl?: string | null;
  description?: string;
}

const euro = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    cents / 100
  );

const fixed = (id: number, name: string, euros: number): GiftCardItem => ({
  id: String(id),
  name,
  type: "fixed",
  priceCents: Math.round(euros * 100),
});

const custom: GiftCardItem = {
  id: "custom",
  name: "TARJETA REGALO por VALOR personalizado",
  type: "custom",
  description: "Elige un importe fijo o escribe otro importe.",
};

const GIFT_ITEMS: GiftCardItem[] = [
  fixed(1, "Piernas Cansadas", 45),
  custom,
  fixed(3, "Masaje Descontracturante 55 minutos", 60),
  fixed(4, "Reflexología Podal", 60),
  fixed(5, "Shiatsu", 60),
  fixed(6, "Masaje para Embarazada 50 minutos", 60),
  fixed(7, "Masaje Relajante 55 minutos", 60),
  fixed(8, "Masaje Deportivo 50 minutos", 60),
  fixed(9, "Masaje con Piedras Calientes", 65),
  fixed(10, "Bambuterapia Masaje con Cañas de Bambú", 65),
  fixed(11, "Ritual Romántico Individual", 70),
  fixed(12, "Ritual Energizante Individual", 70),
  fixed(13, "Drenaje Linfático 75 minutos", 75),
  fixed(14, "Antiestrés The Nook", 80),
  fixed(15, "Masaje para Embarazada 75 minutos", 80),
  fixed(16, "Masaje Descontracturante 75 minutos", 80),
  fixed(17, "Masaje dos Personas 45 minutos", 90),
  fixed(18, "Ritual del Kobido Individual", 90),
  fixed(19, "Masaje 90 minutos", 90),
  fixed(20, "Ritual Sakura Individual", 100),
  fixed(21, "Masaje dos Personas 55 minutos", 110),
  fixed(22, "Masaje a Cuatro Manos 50 minutos", 110),
  fixed(23, "Masaje Relajante Extra Largo 110 minutos", 115),
  fixed(24, "Bambuterapia Masaje con Cañas de Bambú para dos Personas", 120),
  fixed(25, "Masaje con Piedras Calientes para dos personas", 120),
  fixed(26, "Ritual Beauty Individual", 125),
  fixed(27, "Ritual Energizante para dos Personas", 130),
  fixed(28, "Ritual Romántico para dos Personas", 130),
  fixed(29, "Masaje dos Personas 75 minutos", 140),
  fixed(30, "Masaje a Cuatro Manos 80 minutos", 160),
  fixed(31, "Ritual del Kobido para dos Personas", 170),
  fixed(32, "Masaje dos Personas 110 minutos", 190),
  fixed(33, "Ritual Sakura para dos Personas", 190),
  fixed(34, "Ritual Beauty para dos Personas", 230),
  fixed(35, "BONO 5 masajes para Embarazada", 264),
  fixed(36, "BONO 5 masajes Reductor Anticelulítico", 264),
  fixed(37, "BONO 5 masajes 55 minutos", 264),
  fixed(38, "BONO 5 masajes 75 minutos", 355),
  fixed(39, "BONO 5 masajes dos Personas 45 minutos", 396),
  fixed(40, "BONO 10 masajes 55 minutos", 510),
  fixed(41, "BONO 10 masajes Reductor Anticelulítico", 510),
  fixed(42, "BONO 10 masajes para Embarazada", 510),
  fixed(43, "BONO 5 masajes dos Personas 75 minutos", 615),
].map((it) => ({
  ...it,
  description:
    it.type === "fixed"
      ? `Tarjeta regalo válida para ${it.name}`
      : it.description,
}));

// Simple local cart (persisted to localStorage)
const useLocalCart = () => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem("cart:giftcards");
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("cart:giftcards", JSON.stringify(items));
  }, [items]);

  const add = (item: Omit<CartItem, "quantity" | "id"> & { quantity?: number }) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.name === item.name && i.priceCents === item.priceCents
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + (item.quantity ?? 1) };
        return copy;
      }
      return [
        ...prev,
        { id: crypto.randomUUID(), name: item.name, priceCents: item.priceCents, quantity: item.quantity ?? 1 },
      ];
    });
    toast.success("Añadido al carrito");
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const clear = () => setItems([]);
  const totalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    [items]
  );

  return { items, add, remove, clear, totalCents };
};

const PlaceholderImage = ({ text = "Tarjeta de Regalo" }: { text?: string }) => (
  <div className="h-full w-full rounded-md bg-muted/60 text-muted-foreground flex items-center justify-center">
    <span className="text-xs sm:text-sm font-medium">{text}</span>
  </div>
);

const GiftCardsPage = () => {
  const { items, add, remove, clear, totalCents } = useLocalCart();
  const [customAmount, setCustomAmount] = useState<number | "">("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const presets = [25, 50, 100, 200];

  useEffect(() => {
    document.title = "Tarjetas de Regalo | The Nook Madrid";

    const desc = "Tarjetas de regalo elegantes para todos los tratamientos en The Nook Madrid.";
    const ensureMeta = (name: string, content: string) => {
      let m = document.querySelector(`meta[name="${name}"]`);
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", name);
        document.head.appendChild(m);
      }
      m.setAttribute("content", content);
    };
    ensureMeta("description", desc);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", window.location.href);
  }, []);

  const addCustomToCart = () => {
    const amount = selectedPreset ?? (typeof customAmount === "number" ? customAmount : NaN);
    if (!amount || amount <= 0) {
      toast.error("Indica un importe válido");
      return;
    }
    add({ name: custom.name, priceCents: Math.round(amount * 100) });
  };

  return (
    <main className="container mx-auto px-3 sm:px-4 py-6">
      <article>
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Tarjetas de Regalo</h1>
            <p className="text-sm text-muted-foreground">
              Elige tu tarjeta regalo. Diseño elegante y 100% responsive.
            </p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Carrito ({items.length})</Button>
            </SheetTrigger>
            <SheetContent className="w-[90vw] sm:w-[480px]">
              <SheetHeader>
                <SheetTitle>Tu carrito</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tu carrito está vacío.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                        <div>
                          <p className="text-sm font-medium leading-tight">{it.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {euro(it.priceCents)} × {it.quantity}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => remove(it.id)}>
                          Quitar
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-semibold">{euro(totalCents)}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="secondary" onClick={clear} className="flex-1">
                        Vaciar
                      </Button>
                      <Button className="flex-1">Continuar</Button>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <section aria-label="Listado de tarjetas de regalo">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {GIFT_ITEMS.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug line-clamp-2" title={item.name}>
                    {item.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <AspectRatio ratio={4 / 3}>
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={`Tarjeta de regalo ${item.name}`}
                        className="h-full w-full object-cover rounded-md"
                        loading="lazy"
                      />
                    ) : (
                      <PlaceholderImage />
                    )}
                  </AspectRatio>
                  <p className="text-xs text-muted-foreground min-h-8">
                    {item.description}
                  </p>
                  {item.type === "fixed" ? (
                    <p className="font-semibold">{euro(item.priceCents!)}</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {presets.map((p) => (
                          <Button
                            key={p}
                            variant={selectedPreset === p ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedPreset((prev) => (prev === p ? null : p))}
                          >
                            {euro(p * 100)}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          value={customAmount === "" ? "" : customAmount}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              setCustomAmount("");
                              return;
                            }
                            const n = Number(v);
                            if (!Number.isNaN(n)) setCustomAmount(n);
                          }}
                          placeholder="Otro importe (€)"
                          className="h-9"
                        />
                        <Button size="sm" onClick={addCustomToCart}>
                          Comprar
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Consejo: puedes elegir un importe fijo o escribir otro importe.
                      </p>
                    </div>
                  )}
                </CardContent>
                {item.type === "fixed" && (
                  <CardFooter>
                    <Button className="w-full" onClick={() => add({ name: item.name, priceCents: item.priceCents! })}>
                      Comprar
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
};

export default GiftCardsPage;
