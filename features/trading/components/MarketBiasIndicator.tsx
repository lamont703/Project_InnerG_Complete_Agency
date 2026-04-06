import React, { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const supabase = createBrowserClient();

interface BiasState {
  symbol: string;
  bias_state: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  structure_type: string;
  updated_at: string;
}

export const MarketBiasIndicator: React.FC = () => {
  const [bias, setBias] = useState<BiasState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBias = async () => {
      const { data, error } = await supabase
        .from('crypto_market_bias')
        .select('*')
        .eq('symbol', 'BTC/USD')
        .single();

      if (!error && data) {
        setBias(data);
      }
      setLoading(false);
    };

    fetchBias();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('market-bias')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'crypto_market_bias' }, (payload) => {
        if (payload.new.symbol === 'BTC/USD') {
          setBias(payload.new as BiasState);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div className="h-10 w-40 animate-pulse bg-gray-100 rounded-lg"></div>;

  const config = {
    BULLISH: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: TrendingUp, label: 'BULLISH' },
    BEARISH: { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: TrendingDown, label: 'BEARISH' },
    NEUTRAL: { color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Minus, label: 'NEUTRAL' },
  };

  const state = bias?.bias_state || 'NEUTRAL';
  const { color, bg, icon: Icon, label } = config[state];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bg} ${color} border border-current/20 font-medium text-sm transition-all duration-300 hover:scale-105 select-none animate-in fade-in slide-in-from-top-4`}>
       <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bg}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${bg}`}></span>
       </span>
       <Icon size={16} />
       <span className="tracking-wider">BTC {label} BIAS</span>
       {bias?.structure_type && (
         <span className="ml-2 text-[10px] opacity-70 border-l border-current/30 pl-2">
           {bias.structure_type} Confirmed
         </span>
       )}
    </div>
  );
};
