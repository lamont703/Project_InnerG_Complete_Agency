"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/browser';
import { MarketBiasIndicator } from '@/features/trading/components/MarketBiasIndicator';
import { TradingSignalCard } from '@/features/trading/components/TradingSignalCard';
import { 
  TrendingUp, 
  BrainCircuit, 
  Loader2, 
  AlertCircle,
  Database,
  Search
} from 'lucide-react';

export default function ProjectCryptoDashboard() {
  const { slug } = useParams();
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // 1. Get Project ID from Slug
        const { data: project } = await (supabase
          .from('projects')
          .select('id')
          .eq('slug', slug as string)
          .single() as any);

        if (project) {
          setProjectId(project.id);

          // 2. Initial Fetch of Signals
          const { data: signalData } = await supabase
            .from('crypto_signals')
            .select('*')
            .eq('project_id', project.id as string)
            .order('created_at', { ascending: false });

          if (signalData) setSignals(signalData);
        }
      } catch (err) {
        console.error('Error loading crypto dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();

    // 3. Subscribe to Real-time Signal Updates
    const subscription = supabase
      .channel('crypto-signals-feed')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'crypto_signals' 
      }, (payload) => {
        // Refresh local state based on project isolation
        if (payload.new && (payload.new as any).project_id === projectId) {
             setSignals(prev => {
                const exists = prev.find(s => s.id === (payload.new as any).id);
                if (exists) {
                    return prev.map(s => s.id === (payload.new as any).id ? payload.new : s);
                }
                return [payload.new, ...prev];
             });
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [slug, projectId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
        <h2 className="text-xl font-black uppercase tracking-tighter italic text-white">Synchronizing Neural Market Data...</h2>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background relative overflow-hidden">
      {/* Dynamic Background Effect */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      {/* Header Area */}
      <header className="px-8 py-10 border-b border-white/5 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <BrainCircuit size={20} />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter uppercase">
                Trading <span className="text-indigo-400 font-light underline decoration-indigo-500/30 underline-offset-8">Intelligence</span>
              </h1>
            </div>
            <p className="text-gray-400 text-sm font-medium max-w-xl leading-relaxed">
              Real-time institutional analysis using Smart Money Concepts (SMC) and Neural Sentiment filtering.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
             <MarketBiasIndicator />
             <div className="flex items-center gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Scanner Online: 4H / 1H / 5m
             </div>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* Active Statistics / Summary Area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <TrendingUp size={14} className="text-emerald-500" /> Active Edge
                </div>
                <div className="text-3xl font-black text-white tracking-tighter italic">
                   {signals.filter(s => s.status === 'ACTIVE').length} <span className="text-xs text-gray-500 not-italic uppercase tracking-widest">Active Signals</span>
                </div>
             </div>
             <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Search size={14} className="text-indigo-400" /> Neural Pipeline
                </div>
                <div className="text-3xl font-black text-white tracking-tighter italic">
                   {signals.filter(s => s.status === 'STAGED').length} <span className="text-xs text-gray-500 not-italic uppercase tracking-widest">Awaiting Approval</span>
                </div>
             </div>
             <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                <div className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Database size={14} className="text-amber-500" /> Memory Node
                </div>
                <div className="text-3xl font-black text-white tracking-tighter italic">
                   {signals.length} <span className="text-xs text-gray-500 not-italic uppercase tracking-widest">Total Identified Events</span>
                </div>
             </div>
          </div>

          {/* Signals Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] italic">Current Intelligence Stream</h3>
               <div className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest italic">Live Feed Connected</div>
            </div>

            {signals.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
                 <div className="p-4 rounded-3xl bg-white/5 mb-4 text-gray-500">
                    <AlertCircle size={40} strokeWidth={1} />
                 </div>
                 <h4 className="text-lg font-black text-white uppercase tracking-tighter italic mb-2">Analyzing Liquid Markets</h4>
                 <p className="text-gray-500 text-xs max-w-xs leading-relaxed">
                   The Intelligence Engine is currently scanning supply/demand zones. Signals will appear here in real-time as confluences are identified.
                 </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {signals.map((signal) => (
                  <TradingSignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
