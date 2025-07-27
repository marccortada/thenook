import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { profile, isAdmin, isEmployee } = useSupabaseAuth();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    console.log('Sending chatbot message with user info:', {
      userInfo: profile ? {
        id: profile.id,
        email: profile.email,
        name: `${profile.first_name} ${profile.last_name}`,
        role: profile.role,
        isAdmin,
        isEmployee
      } : null,
      isStaff: profile && (isAdmin || isEmployee)
    });

    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: { 
          message: content,
          context: messages.slice(-5), // Últimos 5 mensajes para contexto
          userInfo: profile ? {
            id: profile.id,
            email: profile.email,
            name: `${profile.first_name} ${profile.last_name}`,
            role: profile.role,
            isAdmin,
            isEmployee
          } : null,
          capabilities: [
            'gestionar_reservas', 
            'buscar_por_email', 
            'cancelar_reservas', 
            'modificar_reservas',
            'consultar_bonos',
            'informacion_servicios'
          ]
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, toast, profile, isAdmin, isEmployee]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    clearMessages,
    toggleChat,
  };
};