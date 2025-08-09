import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface ClientResult {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface ClientSelectorProps {
  label?: string;
  placeholder?: string;
  initialQuery?: string;
  selectedId?: string;
  onSelect: (client: ClientResult) => void;
  className?: string;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  label = "Cliente",
  placeholder = "Buscar por nombre, email o teléfono...",
  initialQuery = "",
  selectedId,
  onSelect,
  className,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ClientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<ClientResult | null>(null);

  useEffect(() => {
    let timer: any;
    if (query && query.length >= 2) {
      timer = setTimeout(async () => {
        try {
          setLoading(true);
          let q = supabase
            .from("profiles")
            .select("id, first_name, last_name, email, phone")
            .limit(10);
          // Búsqueda flexible por nombre, email o teléfono
          q = q.or(
            `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
          );
          const { data, error } = await q;
          if (error) throw error;
          setResults((data || []) as ClientResult[]);
        } catch (e) {
          console.error("Error searching clients", e);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 300); // debounce
    } else {
      setResults([]);
    }
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    // Si tenemos selectedId, intentar pre cargar nombre rápido (opcional)
    const loadSelected = async () => {
      if (!selectedId) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .eq("id", selectedId)
          .maybeSingle();
        if (data) setPicked(data as ClientResult);
      } catch {}
    };
    loadSelected();
  }, [selectedId]);

  const hasPicked = !!picked;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="space-y-1">
        <label className="text-sm font-medium">{label}</label>
        {!hasPicked ? (
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        ) : (
          <Card className="p-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium">
                {picked.first_name} {picked.last_name}
              </div>
              <div className="text-muted-foreground text-xs">
                {picked.email} {picked.phone ? `· ${picked.phone}` : ""}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPicked(null)}>
              Cambiar
            </Button>
          </Card>
        )}
      </div>

      {!hasPicked && (
        <div className="space-y-1">
          {loading && <div className="text-xs text-muted-foreground">Buscando...</div>}
          {results.length > 0 && (
            <div className="border rounded-md divide-y">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted"
                  onClick={() => {
                    setPicked(r);
                    onSelect(r);
                  }}
                >
                  <div className="text-sm font-medium">
                    {r.first_name} {r.last_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.email} {r.phone ? `· ${r.phone}` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientSelector;
