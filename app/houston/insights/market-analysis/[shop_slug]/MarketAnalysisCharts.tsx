import React from 'react';
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Target,
  Sparkles,
  ArrowUpRight,
  Info
} from "lucide-react";
import MarketAnalysisMap from './MarketAnalysisMap';

export default function MarketAnalysisCharts({ shopData }: { shopData: any }) {
  const oppStatus = shopData.opportunity_status || 'UNKNOWN OPPORTUNITY';
  const wealthInd = shopData.local_wealth_indicator || 'UNKNOWN PRICING';
  const momentum = shopData.review_momentum_status || 'UNKNOWN MOMENTUM';
  const vibe = shopData.ai_culture_summary || 'Analysis pending...';
  const compCount = shopData.competitor_count_800m ?? 0;
  
  let topAnchors = [];
  try {
    if (typeof shopData.top_anchor_tenants === 'string') {
      topAnchors = JSON.parse(shopData.top_anchor_tenants);
    } else if (Array.isArray(shopData.top_anchor_tenants)) {
      topAnchors = shopData.top_anchor_tenants;
    }
  } catch (e) {
    console.error("Failed to parse anchors", e);
  }

  const calculateWalkInScore = () => {
    let score = 0;
    if (momentum.includes('EXPLODING')) score += 30;
    else if (momentum.includes('STABLE')) score += 20;
    else score += 5;

    if (topAnchors.length >= 4) score += 25;
    else if (topAnchors.length >= 2) score += 15;
    else if (topAnchors.length === 1) score += 10;

    if (compCount <= 2) score += 20;
    else if (compCount <= 5) score += 15;
    else if (compCount <= 8) score += 10;
    else score += 5;

    const rating = parseFloat(shopData.rating || 0);
    const reviews = parseInt(shopData.total_reviews || 0);
    if (rating >= 4.5 && reviews > 50) score += 15;
    else if (rating >= 4.0 && reviews > 20) score += 10;
    else score += 5;

    const rentType = shopData.rent_type || "";
    if (rentType.toLowerCase().includes('commission')) score += 10;
    else if (rentType.toLowerCase().includes('booth rent')) score += 5;

    return Math.min(score, 100);
  };

  const walkInScore = calculateWalkInScore();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 py-16">
      
      {/* Left Column: Map & Anchors */}
      <div className="lg:col-span-7 flex flex-col gap-8">
        
        {/* Native Embedded Map */}
        <div className="rounded-2xl border border-slate-200 bg-white h-[400px] relative shadow-sm overflow-hidden">
          <MarketAnalysisMap shopData={shopData} />
          
          <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none z-10">
            <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 shadow-md pointer-events-auto flex items-center gap-3">
              <div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Walking Distance</div>
                <div className="text-sm font-bold text-slate-900">800m Radius</div>
              </div>
            </div>
            
            <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 shadow-md pointer-events-auto flex items-center gap-3">
              <div>
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Competitor Density</div>
                <div className="text-sm font-bold text-slate-900">{compCount} Rival Shops</div>
              </div>
            </div>
          </div>
        </div>

        {/* Anchor Tenants List */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Top Traffic Generators
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Massive retail anchors driving daily foot traffic to this plaza.</p>
          </div>

          {topAnchors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topAnchors.map((anchor: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900">{anchor.name}</h3>
                    <div className="text-[10px] px-2 py-1 bg-white border border-slate-200 text-slate-600 uppercase tracking-widest font-black rounded-md">{anchor.type?.replace(/_/g, ' ')}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {anchor.reviews?.toLocaleString()} reviews
                    </span>
                    {anchor.rating && (
                      <span className="flex items-center gap-1 text-amber-500">
                        ⭐ {anchor.rating}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl bg-slate-50">
              No major anchor tenants detected in this immediate area.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Intelligence Panels */}
      <div className="lg:col-span-5 flex flex-col gap-6">

        {/* Walk-In Score */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
            <Target className="h-32 w-32" />
          </div>
          <h2 className="text-xs font-black tracking-widest uppercase text-slate-400 mb-6">
            Walk-In Opportunity Score
          </h2>
          
          <div className="flex items-center gap-6 mb-6">
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                <circle 
                  cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 40}`} 
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - walkInScore / 100)}`} 
                  className={`transition-all duration-1000 ease-out ${walkInScore >= 80 ? 'text-emerald-500' : walkInScore >= 60 ? 'text-amber-500' : 'text-red-500'}`} 
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900">{walkInScore}</span>
              </div>
            </div>
            
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Grade Level</div>
              <div className={`text-3xl font-black ${walkInScore >= 80 ? 'text-emerald-500' : walkInScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {walkInScore >= 95 ? 'S-Tier' : walkInScore >= 90 ? 'A+' : walkInScore >= 80 ? 'A' : walkInScore >= 70 ? 'B' : walkInScore >= 60 ? 'C' : 'D'}
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 font-medium leading-relaxed">
            <span className="font-black text-slate-900">Barber Assessment: </span>
            {walkInScore >= 80 
              ? "Excellent walk-in potential. This shop has high anchor traffic and solid momentum. Sitting here gives you a very high probability of building a clientele quickly." 
              : walkInScore >= 60 
              ? "Moderate walk-in potential. You will see some traffic, but you may need to market yourself on social media to stay consistently busy."
              : "Low walk-in potential. This shop either faces extreme competition or lacks anchor traffic. You must bring your own clientele to survive here."}
          </div>
        </div>
        
        {/* Wealth Indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
            <DollarSign className="h-32 w-32" />
          </div>
          <h2 className="text-xs font-black tracking-widest uppercase text-slate-400 mb-2">Local Wealth Indicator</h2>
          <div className="text-2xl font-black text-slate-900 mb-2">
            {wealthInd}
          </div>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            Based on the surrounding retail pricing ceiling. 
            {wealthInd.includes('VALUE') 
              ? " Success here depends on high-volume, affordable cuts ($20 - $35)."
              : wealthInd.includes('$$$') 
              ? " High likelihood of supporting premium haircut pricing ($50+)."
              : " A good fit for standard market-rate haircuts ($30 - $45)."}
          </p>
        </div>

        {/* AI Vibe Check */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white p-6 shadow-sm relative overflow-hidden">
          <h2 className="text-xs font-black tracking-widest uppercase text-indigo-500 mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Culture Summary
          </h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {vibe.split('|').map((tag: string, i: number) => (
              <span key={i} className="px-3 py-1.5 bg-white text-indigo-700 rounded-lg text-xs font-black uppercase tracking-wider border border-indigo-100 shadow-sm">
                {tag.trim()}
              </span>
            ))}
          </div>
          <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              <Info className="h-3.5 w-3.5" />
              Barber Strategy Match
            </div>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              Make sure your cutting style and personality match this vibe. If you specialize in these areas, you will seamlessly absorb their walk-in traffic.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
