
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, User, BrainCircuit } from 'lucide-react';
import { getTechnicalAdvice } from '../geminiService';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const AIChatBot: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Protocol Assistant online. Need technical cues for your current phase?' }
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const advice = await getTechnicalAdvice(userMsg);
      setMessages(prev => [...prev, { role: 'ai', text: advice }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error syncing with protocol. Focus on fundamental alignment." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-10 right-10 z-[1000]">
      {/* Floating Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all active:scale-95 group relative"
        style={{ backgroundColor: accentColor, boxShadow: `0 20px 40px -10px ${accentColor}` }}
      >
        {isOpen ? <X size={28} /> : <BrainCircuit size={28} className="group-hover:animate-pulse" />}
        <span className="absolute -top-2 -right-2 bg-blue-400 w-5 h-5 rounded-full border-4 border-[#020617]"></span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-24 right-0 w-[350px] md:w-[400px] h-[550px] glass-card rounded-[2.5rem] border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
          {/* Header */}
          <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="text-blue-400" size={18} />
              <h4 className="font-black brand-font uppercase text-white tracking-widest text-sm">Pocket Coach</h4>
            </div>
            <div className="px-2 py-1 bg-emerald-500/10 rounded-md">
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Live Support</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-slate-900 border border-white/5 text-slate-300 rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl rounded-bl-none flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-slate-700 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 bg-white/5 border-t border-white/5">
            <div className="relative">
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="ASK FOR CORRECTIONS..."
                className="w-full bg-slate-950 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-[10px] font-black text-white brand-font uppercase tracking-widest outline-none focus:ring-1 ring-blue-500 transition-all"
              />
              <button 
                onClick={handleSend}
                className="absolute right-2 top-2 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatBot;
