
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, ChevronLeft, MessageSquare, ClipboardCheck, Activity, Clock, Shield, User as UserIcon, ArrowUpRight, Zap, RefreshCcw, Lock, ArrowLeftRight, Info, MessageCircle } from 'lucide-react';
import { ClientData, Message } from '../types';

interface Props {
  client: ClientData;
  isCoach: boolean;
  coachAvatar?: string;
  onSendMessage: (text: string) => void;
  onViewProtocol: (meta: Message['meta'], timestamp: string) => void;
  onBack: () => void;
}

const ChatInterface: React.FC<Props> = ({ client, isCoach, coachAvatar, onSendMessage, onBack, onViewProtocol }) => {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [client?.messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const clientFirstName = (client?.name || 'ATHLETE').split(' ')[0].toUpperCase();

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col glass-card rounded-[3rem] border-slate-800 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      {/* Chat Header */}
      <header className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/5 overflow-hidden">
              {isCoach ? (
                client?.avatar ? <img src={client.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black">ATH</div>
              ) : (
                coachAvatar ? <img src={coachAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white font-black">CH</div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-black brand-font uppercase text-white leading-none">
                {isCoach ? (client?.name || 'Athlete') : "CHAT"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isCoach ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocol Direct Linked</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar scroll-smooth">
        {/* Technical Context Mini Header */}
        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex items-start gap-4">
          <div className="p-3 bg-blue-600/10 text-blue-500 rounded-xl shrink-0">
            <Info size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200 leading-relaxed">
              Here you will be able to track workouts and summaries sent to coach.
            </p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
              <MessageCircle size={10} className="text-emerald-500" /> WhatsApp will still be our main source of communication
            </p>
          </div>
        </div>

        {(!client?.messages || client.messages.length === 0) && (
          <div className="flex flex-col items-center justify-center text-center opacity-20 py-10">
            <MessageSquare size={48} className="mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">No direct transmissions active</p>
          </div>
        )}
        
        {(client?.messages || []).map((msg) => {
          const isCoachMsg = msg.senderId === 'coach';
          
          if (msg.type === 'system') {
            const isCoachReply = msg.senderId === 'coach';
            
            return (
              <div key={msg.id} className="flex justify-center group/sys-container">
                <button 
                  onClick={() => onViewProtocol(msg.meta, msg.timestamp)}
                  className={`group/sys border px-4 py-1.5 rounded-2xl flex items-center gap-3 transition-all shadow-2xl active:scale-95 relative overflow-hidden max-w-[70%] ${
                    isCoachReply 
                    ? 'bg-blue-600/5 border-blue-500/20 hover:bg-blue-600/10 hover:border-blue-500/50' 
                    : 'bg-emerald-600/5 border-emerald-500/20 hover:bg-emerald-600/10 hover:border-emerald-500/50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isCoachReply ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {isCoachReply ? <Shield size={14} /> : <Zap size={14} />}
                  </div>

                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${
                        isCoachReply ? 'text-blue-500' : 'text-emerald-500'
                      }`}>
                        {isCoachReply ? 'COACH FEEDBACK' : 'ATHLETE SYNC'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                      <span className="text-[6px] text-slate-600 font-black tracking-tighter uppercase">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[9px] font-black brand-font uppercase tracking-wider transition-colors mt-0.5 truncate ${
                      isCoachReply ? 'text-blue-200 group-hover/sys:text-white' : 'text-emerald-200 group-hover/sys:text-white'
                    }`}>
                      {msg.text}
                    </p>
                  </div>

                  <div className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all shrink-0 ${
                    isCoachReply 
                    ? 'border-blue-500/20 text-blue-500 group-hover/sys:border-blue-500 group-hover/sys:translate-x-1' 
                    : 'border-emerald-500/20 text-emerald-500 group-hover/sys:border-emerald-500 group-hover/sys:translate-x-1'
                  }`}>
                    <ArrowUpRight size={12} />
                  </div>
                </button>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex justify-start w-full">
              <div className="flex items-start gap-4 max-w-[70%] group">
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border transition-colors shadow-lg ${
                  isCoachMsg 
                  ? 'bg-blue-600/10 border-blue-500/30 text-blue-500' 
                  : 'bg-emerald-600/10 border-emerald-500/30 text-emerald-500'
                }`}>
                  {isCoachMsg ? <Shield size={14} /> : <UserIcon size={14} />}
                </div>

                <div className="flex flex-col items-start space-y-1">
                  <div className="flex items-center gap-3 px-1">
                    <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${isCoachMsg ? 'text-blue-500' : 'text-emerald-500'}`}>
                      {isCoachMsg ? 'ILAI' : clientFirstName}
                    </span>
                    <span className="text-[7px] font-black text-slate-700 uppercase tracking-tighter flex items-center gap-1">
                      <Clock size={7} /> {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className={`px-4 py-2 md:px-5 md:py-3 rounded-[1.5rem] text-sm font-medium leading-relaxed shadow-xl rounded-tl-none border-l-4 w-fit max-w-full ${
                    isCoachMsg 
                    ? 'bg-blue-600 text-white border-blue-400' 
                    : 'bg-emerald-600 text-white border-emerald-400'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Area / Status Area */}
      <div className="p-8 bg-white/5 border-t border-white/5">
        <div className="max-w-4xl mx-auto relative">
          {isCoach ? (
            /* Coach: Full Input Capabilities */
            <>
              <input 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="TYPE TECHNICAL DIRECTIVE..."
                className="w-full bg-slate-950 border border-white/10 rounded-2xl py-5 pl-8 pr-20 text-[11px] font-black text-white brand-font uppercase tracking-widest outline-none focus:ring-1 ring-blue-500 transition-all shadow-inner"
              />
              <button 
                onClick={handleSend}
                className="absolute right-3 top-2 w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all active:scale-95 shadow-lg"
              >
                <Send size={20} />
              </button>
            </>
          ) : (
            /* Athlete: Restricted Input */
            <div className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-5 px-8 flex items-center justify-between group/lock transition-all hover:bg-slate-900">
               <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                     <Lock size={16} className="animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Terminal Status: Reception Only</p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">Direct messaging disabled. Context required via protocol modules.</p>
                  </div>
               </div>
               <button 
                 onClick={onBack}
                 className="flex items-center gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-blue-500/50 transition-all text-[8px] font-black uppercase tracking-widest"
               >
                 <ArrowLeftRight size={14} /> RETURN TO MODULES
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
