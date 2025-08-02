import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatbot } from '@/hooks/useChatbot';
import { MessageCircle, X, Send, Trash2 } from 'lucide-react';

const ChatBot = () => {
  const { messages, isLoading, isOpen, sendMessage, clearMessages, toggleChat } = useChatbot();
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Mensaje de bienvenida
  const welcomeMessage = `¡Hola! Soy tu asistente virtual de The Nook Madrid 🏢

💡 **Ejemplos de lo que puedo hacer:**

🔍 **Buscar reservas:**
• "buscar reservas juan@email.com"
• "reservas de María González"
• "mi reserva"
• "encontrar cita de Ana"

📅 **Consultar por fechas:**
• "citas de hoy"
• "reserva del 15/12"
• "agenda de mañana"

❌ **Cancelar o modificar:**
• "cancelar mi reserva"
• "modificar mi cita"

¿En qué puedo ayudarte hoy?`;

  // Mostrar mensaje de bienvenida si no hay mensajes
  const displayMessages = messages.length === 0 ? [
    {
      id: 'welcome',
      role: 'assistant' as const,
      content: welcomeMessage,
      timestamp: new Date(),
    }
  ] : messages;

  const handleSend = async () => {
    if (inputValue.trim()) {
      await sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [displayMessages, isLoading]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Toggle Button */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="w-80 sm:w-96 h-[450px] sm:h-[500px] shadow-xl border-2 border-primary/20 mx-2 sm:mx-0">
          <CardHeader className="bg-primary text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Asistente Virtual</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearMessages}
                  className="text-white hover:bg-white/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleChat}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea 
              ref={scrollAreaRef} 
              className="h-[290px] sm:h-[340px] p-2 sm:p-4"
            >
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 text-primary/50" />
                  <div className="text-sm whitespace-pre-wrap">
                    {welcomeMessage}
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block max-w-[90%] sm:max-w-[80%] p-2 sm:p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="text-left mb-4">
                  <div className="inline-block max-w-[80%] p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-2 sm:p-4 border-t">
            <div className="flex w-full gap-1 sm:gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default ChatBot;