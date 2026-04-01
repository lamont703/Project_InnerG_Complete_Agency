import React, { useState } from 'react';
import { 
  ChevronRight, 
  Target, 
  ShieldCheck, 
  BrainCircuit, 
  TrendingUp, 
  TrendingDown,
  Info,
  Clock,
  ExternalLink,
  Zap
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { toast } from 'sonner';

const supabase = createBrowserClient();

interface SignalProps {
  signal: {
    id: string;
    symbol: string;
    bias: 'LONG' | 'SHORT';
    entry_price: number;
    stop_loss: number;
    take_profit_1: number;
    risk_reward_ratio: number;
    confidence_score: number;
    narrative_reasoning: string;
    smc_reasoning: {
      structure?: string;
      zone_type?: string;
      tf_confirmation?: string;
    };
    created_at: string;
    status: string;
  };
}

export const TradingSignalCard: React.FC<SignalProps> = ({ signal }) => {
  const [showNarrative, setShowNarrative] = useState(false);
  const isUp = signal.bias === 'LONG';
  
  const statusColors = {
    PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    ACTIVE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    HIT_TP: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    HIT_SL: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    CANCELLED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  return (
    <div className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-500 shadow-2xl hover:shadow-indigo-500/10">
      {/* Background Gradient Effect */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 pointer-events-none rounded-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>

      {/* Header Info */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isUp ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
            {isUp ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{signal.symbol}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-black px-2 py-0.5 rounded uppercase tracking-widest ${isUp ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                {signal.bias}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[signal.status as keyof typeof statusColors]}`}>
                {signal.status}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 mb-1 flex items-center justify-end gap-1">
            <Clock size={12} />
            {new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-black text-indigo-400 leading-none">{signal.confidence_score}%</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Confidence</span>
          </div>
        </div>
      </div>

      {/* SMC Tech Logic */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 group-hover:border-white/10 transition-colors">
          <div className="text-[10px] text-gray-500 uppercase font-black mb-2 flex items-center gap-1">
             <Target size={12} /> Logic Details
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
               <span className="text-gray-400">Structure</span>
               <span className="text-white font-medium">{signal.smc_reasoning.structure || 'BOS'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
               <span className="text-gray-400">Zone Type</span>
               <span className="text-white font-medium uppercase">{signal.smc_reasoning.zone_type || 'Demand'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
               <span className="text-gray-400">Validation</span>
               <span className="text-emerald-400 font-medium">{signal.smc_reasoning.tf_confirmation || '5m CHoCH'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-3 border border-white/5 group-hover:border-white/10 transition-colors">
          <div className="text-[10px] text-gray-500 uppercase font-black mb-2 flex items-center gap-1">
             <ShieldCheck size={12} /> Risk Metrics
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-rose-400">
               <span className="text-gray-400">SL</span>
               <span className="font-mono">{signal.stop_loss.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-indigo-400">
               <span className="text-gray-400">TP 1</span>
               <span className="font-mono">{signal.take_profit_1.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-400">
               <span className="text-gray-400">R:R Ratio</span>
               <span className="font-black">1:{signal.risk_reward_ratio}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Narrative Section */}
      <button 
        onClick={() => setShowNarrative(!showNarrative)}
        className="w-full flex items-center justify-between bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs py-3 px-4 rounded-xl transition-all duration-300 mb-2 group-active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit size={16} />
          <span className="font-bold">AI NARRATIVE INSIGHT</span>
        </div>
        <ChevronRight size={16} className={`transition-transform duration-300 ${showNarrative ? 'rotate-90' : ''}`} />
      </button>

      {showNarrative && (
        <div className="animate-in slide-in-from-top-4 duration-300 overflow-hidden bg-black/20 rounded-xl p-4 mb-4 text-xs text-gray-300 leading-relaxed border border-indigo-500/20 shadow-inner">
           {signal.narrative_reasoning || "Analyzing project fundamentals and narrative sentiment for AI/DePIN confluence..."}
        </div>
      )}

      {/* Footer Actions - Human In The Loop (HITL) */}
      <div className="grid grid-cols-2 gap-2">
        {signal.status === 'STAGED' ? (
          <>
            <button 
              onClick={async () => {
                const { error } = await supabase.from('crypto_signals').update({ status: 'ACTIVE' } as any).eq('id', signal.id);
                if (!error) {
                    await fetch('/functions/v1/broadcast-to-community', {
                        method: 'POST',
                        body: JSON.stringify({ 
                            type: 'TRADING_SIGNAL', 
                            signal_id: signal.id,
                            channel_id: 'discord' 
                        })
                    });
                    toast.success("Intelligence Broadcasted to Community!");
                }
              }}
              className="flex items-center justify-center gap-2 bg-emerald-500 text-white text-[10px] font-black py-3 rounded-xl hover:bg-emerald-400 transition-all active:scale-[0.95] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
            >
               <Zap size={14} className="animate-pulse" /> APPROVE & BROADCAST
            </button>
            <button 
              onClick={async () => {
                await supabase.from('crypto_signals').update({ status: 'CANCELLED' }).eq('id', signal.id);
                toast.info("Signal Dismissed");
              }}
              className="flex items-center justify-center gap-2 bg-white/5 text-gray-400 text-[10px] font-black py-3 rounded-xl border border-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all active:scale-[0.95] uppercase tracking-widest"
            >
               DISMISS
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 bg-white/5 text-gray-500 text-[10px] font-black py-2.5 rounded-xl border border-white/5 uppercase tracking-widest cursor-default">
               LIVE SIGNAL
            </div>
            <button className="flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-400 text-[10px] font-black py-2.5 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/40 transition-all active:scale-[0.95] uppercase tracking-widest">
               <ExternalLink size={14} /> VIEW CHART
            </button>
          </>
        )}
      </div>
    </div>
  );
};
