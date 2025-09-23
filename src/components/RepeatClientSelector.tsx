import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface RepeatClient {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  booking_count: number;
}

interface RepeatClientSelectorProps {
  label?: string;
  placeholder?: string;
  onSelect: (client: RepeatClient) => void;
  className?: string;
}

const RepeatClientSelector: React.FC<RepeatClientSelectorProps> = ({
  label = "Cliente habitual",
  placeholder = "Buscar cliente que haya venido más de una vez...",
  onSelect,
  className,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RepeatClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<RepeatClient | null>(null);

  useEffect(() => {
    let timer: any;
    if (query && query.length >= 2) {
      timer = setTimeout(async () => {
        try {
          setLoading(true);
          
          // Fetch all clients that match the search query
          const { data, error } = await supabase
            .from("profiles")
            .select(`
              id, first_name, last_name, email, phone,
              bookings:bookings(count)
            `)
            .eq('role', 'client')
            .or(
              `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
            )
            .limit(10);

          if (error) throw error;

          // Format all clients as habitual clients (if they exist in DB, they are habitual)
          const repeatClients = (data || [])
            .map(client => ({
              ...client,
              booking_count: client.bookings[0]?.count || 0
            }))
            .map(({ bookings, ...client }) => client as RepeatClient);

          setResults(repeatClients);
        } catch (e) {
          console.error("Error searching repeat clients", e);
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
                {picked.email} {picked.phone ? `· ${picked.phone}` : ""} · {picked.booking_count} visitas
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
            <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
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
                    {r.email} {r.phone ? `· ${r.phone}` : ""} · {r.booking_count} visitas previas
                  </div>
                </button>
              ))}
            </div>
          )}
          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="text-xs text-muted-foreground p-2 text-center">
              No hay clientes habituales que coincidan con la búsqueda
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RepeatClientSelector;