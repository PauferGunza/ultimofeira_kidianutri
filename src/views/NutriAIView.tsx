import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { sendNutriMessage, ChatMessage } from '../services/nutriService';

interface NutriAIViewProps {
  onBack: () => void;
}

export const NutriAIView = ({ onBack }: NutriAIViewProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ia', content: 'Olá! Sou a NutriAI, a tua assistente de nutrição. Como posso ajudar-te a comer melhor hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    
    setInput('');
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await sendNutriMessage(updatedMessages);
      setMessages(prev => [...prev, { role: 'ia', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'ia', 
        content: 'Desculpa, tive uma falha na ligação. Podes tentar perguntar novamente?' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-screen bg-dark-bg"
    >
      {/* Header */}
      <div className="px-6 pt-10 pb-4 flex items-center gap-4 bg-card-bg/50 backdrop-blur-md sticky top-0 z-10 border-b border-gray-800">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-gray-800/50 rounded-full flex items-center justify-center border border-gray-700 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
            <Bot size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display leading-tight flex items-center gap-2">
              NutriAI <Sparkles size={14} className="text-primary fill-primary" />
            </h1>
            <p className="text-[10px] text-primary/70 font-bold uppercase tracking-wider">Assistente Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 1 && (
            <div className="py-6 text-center">
                <div className="w-16 h-16 bg-gray-800/30 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-gray-800">
                    <MessageSquare size={24} className="text-gray-500" />
                </div>
                <h3 className="text-gray-400 text-sm font-medium mb-1">Dicas de perguntas</h3>
                <div className="flex flex-wrap justify-center gap-2 max-w-xs mx-auto">
                    {["Dieta barata", "Como perder peso?", "Ingredientes angolanos", "Ganho de massa"].map(tip => (
                        <button 
                            key={tip}
                            onClick={() => setInput(tip)}
                            className="px-3 py-1.5 bg-card-bg border border-gray-800 rounded-full text-[10px] text-gray-500 hover:border-primary/50 hover:text-primary transition-colors"
                        >
                            {tip}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                msg.role === 'user' ? 'bg-primary/20 border-primary/30' : 'bg-gray-800 border-gray-700'
              }`}>
                {msg.role === 'user' ? <User size={16} className="text-primary" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xl ${
                msg.role === 'user' 
                  ? 'bg-primary text-black font-medium rounded-tr-none' 
                  : 'bg-card-bg border border-gray-800 text-gray-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-card-bg border border-gray-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-3 shadow-xl">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span className="text-xs text-gray-400 italic">A NutriAI está a pensar...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 bg-dark-bg/80 backdrop-blur-xl border-t border-gray-800/50 pb-8">
        <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Pergunta sobre a tua alimentação..."
                    className="w-full bg-card-bg border border-gray-800 rounded-2xl px-6 py-4 pr-14 text-sm focus:border-primary/50 outline-none transition-all shadow-2xl placeholder:text-gray-600"
                />
                <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-2 bottom-2 w-10 bg-primary rounded-xl flex items-center justify-center text-black active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-3 flex items-center justify-center gap-1">
            <HelpCircle size={10} /> O conteúdo é meramente informativo.
        </p>
      </div>
    </motion.div>
  );
};
