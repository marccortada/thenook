import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'happy_hour';
  value: number;
  applies_to: 'all_services' | 'specific_service' | 'specific_center';
  target_id?: string;
  coupon_code?: string;
  start_at?: string;
  end_at?: string;
  days_of_week?: number[];
  time_start?: string;
  time_end?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreatePromotionData {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'happy_hour';
  value: number;
  applies_to: 'all_services' | 'specific_service' | 'specific_center';
  target_id?: string;
  coupon_code?: string;
  start_at?: string;
  end_at?: string;
  days_of_week?: number[];
  time_start?: string;
  time_end?: string;
  is_active?: boolean;
}

export const usePromotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromotions(data as Promotion[] || []);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las promociones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createPromotion = async (promotionData: CreatePromotionData) => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data, error } = await supabase
        .from('promotions')
        .insert({
          ...promotionData,
          created_by: profile?.id,
          is_active: promotionData.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;

      setPromotions(prev => [data as Promotion, ...prev]);
      toast({
        title: "Éxito",
        description: "Promoción creada exitosamente"
      });
      
      return data;
    } catch (error) {
      console.error('Error creating promotion:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la promoción",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePromotion = async (id: string, updates: Partial<CreatePromotionData>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPromotions(prev => prev.map(p => p.id === id ? data as Promotion : p));
      toast({
        title: "Éxito",
        description: "Promoción actualizada exitosamente"
      });
      
      return data;
    } catch (error) {
      console.error('Error updating promotion:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la promoción",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePromotion = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPromotions(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Éxito",
        description: "Promoción eliminada exitosamente"
      });
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la promoción",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const togglePromotionStatus = async (id: string, isActive: boolean) => {
    await updatePromotion(id, { is_active: isActive });
  };

  const getActivePromotions = () => {
    return promotions.filter(p => p.is_active);
  };

  const getPromotionsByCoupon = (couponCode: string) => {
    return promotions.filter(p => 
      p.coupon_code?.toLowerCase() === couponCode.toLowerCase() && p.is_active
    );
  };

  const calculateDiscount = (promotion: Promotion, originalPrice: number) => {
    if (promotion.type === 'percentage') {
      return (originalPrice * promotion.value) / 100;
    } else if (promotion.type === 'fixed_amount') {
      return Math.min(promotion.value, originalPrice);
    }
    return 0;
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  return {
    promotions,
    loading,
    fetchPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotionStatus,
    getActivePromotions,
    getPromotionsByCoupon,
    calculateDiscount
  };
};