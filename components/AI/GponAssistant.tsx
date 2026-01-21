
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Loader2, Minimize2, Maximize2, Zap } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';
import { DashboardAnalytics } from '../../lib/dashboard-analytics';
import { ai, AI_MODELS, generateNetworkContextPrompt } from '../../lib/ai/client';
import ReactMarkdown from 'react-markdown'; // Assuming react-markdown might be used, but for now simple text
import { NetworkState } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

const GponAssistant: React.FC = () => {
  const { sites, olts, msans, pcos, splitters, cables, joints, slots, ports, equipments, chambers } = useNetwork();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your GPON Intelligence Assistant. I have access to the current network telemetry. How can I assist with your planning or troubleshooting today?',
      timestamp: new Date()
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Compile Context on the fly
  const getContext = () => {
    // Fix: provide the full NetworkState structure
    const state: NetworkState = { 
        sites, olts, msans, pcos, splitters, cables, joints, slots, ports, equipments, chambers
    };
    const metrics = DashboardAnalytics.getUtilization(state);
    const fiber = DashboardAnalytics.getFiberMetrics(state);
    const health = DashboardAnalytics.getHealthStatus(state);
    
    return {
        sites: sites.length,
        olts: olts.length,
        splitters: splitters.length,
        pcos: pcos.length,
        saturatedNodes: metrics.saturatedNodes,
        warningNodes: metrics.warningNodes,
        incidents: health.offline + health.maintenance,
        fiberLength: fiber.totalLengthKm.toFixed(2)
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    try {
      const stats = getContext();
      const systemInstruction = generateNetworkContextPrompt(stats);
      
      const response = await ai.models.generateContent({
        model: AI_MODELS.TEXT,
        contents: [
            { role: 'user', parts: [{ text: input }] }
        ],
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.4, // Low temp for more factual technical answers
        }
      });

      const text = response.text || "I couldn't generate a response at this time.";
      
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "I'm having trouble connecting to the neural network. Please check your API key or connection.", timestamp: new Date() }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
      setInput(prompt);
      // Optional: auto-send
      // handleSend(); 
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[2000] w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 group border-2 border-white/20"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900"></span>
      </button>
    );
  }

  return (
    <div className={`fixed z-[2000] transition-all duration-300 shadow-2xl flex flex-col glass-panel border border-indigo-500/30 overflow-hidden ${
        isMinimized 
            ? 'bottom-6 right-6 w-72 h-14 rounded-full cursor-pointer' 
            : 'bottom-6 right-6 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] rounded-2xl'
    }`}>
        {/* Header */}
        <div 
            className="p-4 bg-gradient-to-r from-indigo-600 to-purple-700 flex items-center justify-between shrink-0 cursor-pointer"
            onClick={() => isMinimized && setIsMinimized(false)}
        >
            <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                    <Bot className="text-white w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm leading-tight">GPON Intelligence</h3>
                    {!isMinimized && <div className="text-[10px] text-indigo-200 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/> Online</div>}
                </div>
            </div>
            <div className="flex items-center gap-1">
                {!isMinimized && (
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <Minimize2 size={16} />
                    </button>
                )}
                {isMinimized && (
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                        <Maximize2 size={16} />
                    </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }} className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                    <X size={16} />
                </button>
            </div>
        </div>

        {!isMinimized && (
            <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`
                                max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                                ${msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'}
                            `}>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                                <div className={`text-[10px] mt-1 opacity-70 ${msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-indigo-500" />
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Analyzing topology...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions (Suggestions) */}
                <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => handleQuickAction("Analyze current network risks")} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs font-bold text-slate-600 dark:text-slate-400 rounded-full whitespace-nowrap transition-colors border border-slate-200 dark:border-slate-700">
                        <Zap size={12} className="text-amber-500" /> Analyze Risks
                    </button>
                    <button onClick={() => handleQuickAction("List saturated PCOs")} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs font-bold text-slate-600 dark:text-slate-400 rounded-full whitespace-nowrap transition-colors border border-slate-200 dark:border-slate-700">
                        <Zap size={12} className="text-rose-500" /> Saturated Nodes
                    </button>
                    <button onClick={() => handleQuickAction("Feasibility rules for drop cable")} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-xs font-bold text-slate-600 dark:text-slate-400 rounded-full whitespace-nowrap transition-colors border border-slate-200 dark:border-slate-700">
                        <Zap size={12} className="text-emerald-500" /> Rules
                    </button>
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about network capacity, feasibility..." 
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 border focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isThinking}
                        className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none transition-all"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </>
        )}
    </div>
  );
};

export default GponAssistant;
