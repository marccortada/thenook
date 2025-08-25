import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GiftCard {
  id: string;
  code: string;
  initial_balance_cents: number;
  remaining_balance_cents: number;
  status: string;
  expiry_date?: string;
  assigned_client_id?: string;
  purchased_by_email?: string;
  purchased_by_name?: string;
  purchased_at: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CreateGiftCardData {
  initial_balance_cents: number;
  assigned_client_id?: string;
  expiry_date?: string;
  purchased_by_email?: string;
  purchased_by_name?: string;
}

export function useGiftCards(searchTerm?: string) {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchGiftCards = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('gift_cards')
        .select(`
          *,
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,purchased_by_name.ilike.%${searchTerm}%,purchased_by_email.ilike.%${searchTerm}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setGiftCards((data || []) as GiftCard[]);
    } catch (err) {
      console.error('Error fetching gift cards:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const createGiftCard = async (giftCardData: CreateGiftCardData) => {
    try {
      const { data, error: createError } = await (supabase as any)
        .from('gift_cards')
        .insert({
          initial_balance_cents: giftCardData.initial_balance_cents,
          remaining_balance_cents: giftCardData.initial_balance_cents,
          status: 'active',
          assigned_client_id: giftCardData.assigned_client_id,
          expiry_date: giftCardData.expiry_date,
          purchased_by_email: giftCardData.purchased_by_email,
          purchased_by_name: giftCardData.purchased_by_name,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      toast({
        title: 'Tarjeta regalo creada',
        description: `Se ha creado la tarjeta con código ${data.code}`,
      });

      return data;
    } catch (err) {
      console.error('Error creating gift card:', err);
      toast({
        title: 'Error',
        description: 'No se pudo crear la tarjeta regalo',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateGiftCard = async (id: string, updates: Partial<GiftCard>) => {
    try {
      const { error: updateError } = await supabase
        .from('gift_cards')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: 'Tarjeta actualizada',
        description: 'Los cambios se han guardado correctamente',
      });

      return true;
    } catch (err) {
      console.error('Error updating gift card:', err);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarjeta regalo',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deactivateGiftCard = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('gift_cards')
        .update({ status: 'expired' })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: 'Tarjeta desactivada',
        description: 'La tarjeta regalo ha sido desactivada',
      });

      return true;
    } catch (err) {
      console.error('Error deactivating gift card:', err);
      toast({
        title: 'Error',
        description: 'No se pudo desactivar la tarjeta regalo',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchGiftCards();
  }, [searchTerm]);

  return {
    giftCards,
    loading,
    error,
    refetch: fetchGiftCards,
    createGiftCard,
    updateGiftCard,
    deactivateGiftCard,
  };
}

export function useExpiringGiftCards(daysAhead: number = 30) {
  const [expiringGiftCards, setExpiringGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpiringGiftCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error: fetchError } = await supabase
        .from('gift_cards')
        .select(`
          *,
          profiles (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'active')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDate.toISOString())
        .order('expiry_date', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setExpiringGiftCards((data || []) as GiftCard[]);
    } catch (err) {
      console.error('Error fetching expiring gift cards:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiringGiftCards();
  }, [daysAhead]);

  return {
    expiringGiftCards,
    loading,
    error,
    refetch: fetchExpiringGiftCards,
  };
}