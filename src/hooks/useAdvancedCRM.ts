import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientProfile {
  id: string;
  client_id: string;
  preferred_employee_id?: string;
  allergies?: string[];
  medical_conditions?: string[];
  preferences?: Record<string, any>;
  satisfaction_score: number;
  loyalty_points: number;
  total_visits: number;
  total_spent_cents: number;
  last_visit_date?: string;
  preferred_time_slots?: string[];
  preferred_services?: string[];
  communication_preferences?: Record<string, any>;
  birthday?: string;
  anniversary?: string;
  referral_source?: string;
  vip_status: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SatisfactionSurvey {
  id: string;
  client_id: string;
  booking_id?: string;
  overall_rating: number;
  service_rating?: number;
  staff_rating?: number;
  facility_rating?: number;
  feedback?: string;
  would_recommend?: boolean;
  survey_date: string;
  created_at: string;
}

export interface LoyaltyTransaction {
  id: string;
  client_id: string;
  transaction_type: 'earned' | 'redeemed';
  points_amount: number;
  booking_id?: string;
  description?: string;
  created_at: string;
}

export const useAdvancedCRM = () => {
  const [loading, setLoading] = useState(false);
  const [clientProfiles, setClientProfiles] = useState<ClientProfile[]>([]);
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const { toast } = useToast();

  // Client Profile Management
  const fetchClientProfiles = async (searchQuery?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('client_profiles')
        .select(`
          *,
          profiles!client_profiles_client_id_fkey (
            first_name,
            last_name,
            email,
            phone
          )
        `);
      
      if (searchQuery) {
        query = query.or(`
          profiles.first_name.ilike.%${searchQuery}%,
          profiles.last_name.ilike.%${searchQuery}%,
          profiles.email.ilike.%${searchQuery}%
        `);
      }
      
      const { data, error } = await query.order('total_spent_cents', { ascending: false });
      
      if (error) throw error;
      setClientProfiles(data as any || []);
    } catch (error) {
      console.error('Error fetching client profiles:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los perfiles de clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateClientProfile = async (clientId: string) => {
    try {
      let { data: profile, error } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newProfile, error: createError } = await supabase
          .from('client_profiles')
          .insert([{ client_id: clientId }])
          .select()
          .single();

        if (createError) throw createError;
        profile = newProfile;
      } else if (error) {
        throw error;
      }

      return profile;
    } catch (error) {
      console.error('Error getting/creating client profile:', error);
      throw error;
    }
  };

  const updateClientProfile = async (clientId: string, updates: Partial<ClientProfile>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .upsert([{ client_id: clientId, ...updates }], { 
          onConflict: 'client_id' 
        })
        .select()
        .single();

      if (error) throw error;

      setClientProfiles(prev => {
        const existing = prev.find(p => p.client_id === clientId);
        if (existing) {
          return prev.map(p => p.client_id === clientId ? data as any : p);
        } else {
          return [...prev, data as any];
        }
      });

      toast({
        title: "Perfil actualizado",
        description: "El perfil del cliente ha sido actualizado",
      });
      return data;
    } catch (error) {
      console.error('Error updating client profile:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil del cliente",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Satisfaction Survey Management
  const fetchSatisfactionSurveys = async (clientId?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('satisfaction_surveys').select('*');
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query.order('survey_date', { ascending: false });
      
      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las encuestas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSatisfactionSurvey = async (surveyData: Omit<SatisfactionSurvey, 'id' | 'survey_date' | 'created_at'>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('satisfaction_surveys')
        .insert([surveyData])
        .select()
        .single();

      if (error) throw error;

      setSurveys(prev => [data, ...prev]);
      
      // Update client satisfaction score
      await updateClientSatisfactionScore(surveyData.client_id);

      toast({
        title: "Encuesta registrada",
        description: "La encuesta de satisfacción ha sido registrada",
      });
      return data;
    } catch (error) {
      console.error('Error creating survey:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la encuesta",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateClientSatisfactionScore = async (clientId: string) => {
    try {
      // Calculate average satisfaction score
      const { data: surveys, error } = await supabase
        .from('satisfaction_surveys')
        .select('overall_rating')
        .eq('client_id', clientId);

      if (error) throw error;

      if (surveys && surveys.length > 0) {
        const averageScore = Math.round(
          surveys.reduce((sum, survey) => sum + survey.overall_rating, 0) / surveys.length * 20
        ); // Convert from 1-5 to 0-100 scale

        await updateClientProfile(clientId, { satisfaction_score: averageScore });
      }
    } catch (error) {
      console.error('Error updating satisfaction score:', error);
    }
  };

  // Loyalty Program Management
  const fetchLoyaltyTransactions = async (clientId?: string) => {
    setLoading(true);
    try {
      let query = supabase.from('loyalty_transactions').select('*');
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setLoyaltyTransactions(data as any || []);
    } catch (error) {
      console.error('Error fetching loyalty transactions:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las transacciones de fidelización",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLoyaltyPoints = async (clientId: string, points: number, description?: string, bookingId?: string) => {
    setLoading(true);
    try {
      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('loyalty_transactions')
        .insert([{
          client_id: clientId,
          transaction_type: 'earned',
          points_amount: points,
          description,
          booking_id: bookingId
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update client's total points
      const profile = await getOrCreateClientProfile(clientId);
      await updateClientProfile(clientId, { 
        loyalty_points: profile.loyalty_points + points 
      });

      setLoyaltyTransactions(prev => [transaction as any, ...prev]);

      toast({
        title: "Puntos añadidos",
        description: `Se han añadido ${points} puntos de fidelización`,
      });
      return transaction;
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      toast({
        title: "Error",
        description: "No se pudieron añadir los puntos",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const redeemLoyaltyPoints = async (clientId: string, points: number, description?: string) => {
    setLoading(true);
    try {
      const profile = await getOrCreateClientProfile(clientId);
      
      if (profile.loyalty_points < points) {
        throw new Error('Puntos insuficientes');
      }

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('loyalty_transactions')
        .insert([{
          client_id: clientId,
          transaction_type: 'redeemed',
          points_amount: -points,
          description
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update client's total points
      await updateClientProfile(clientId, { 
        loyalty_points: profile.loyalty_points - points 
      });

      setLoyaltyTransactions(prev => [transaction as any, ...prev]);

      toast({
        title: "Puntos canjeados",
        description: `Se han canjeado ${points} puntos`,
      });
      return transaction;
    } catch (error) {
      console.error('Error redeeming loyalty points:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron canjear los puntos",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    clientProfiles,
    surveys,
    loyaltyTransactions,
    fetchClientProfiles,
    getOrCreateClientProfile,
    updateClientProfile,
    fetchSatisfactionSurveys,
    createSatisfactionSurvey,
    updateClientSatisfactionScore,
    fetchLoyaltyTransactions,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
  };
};