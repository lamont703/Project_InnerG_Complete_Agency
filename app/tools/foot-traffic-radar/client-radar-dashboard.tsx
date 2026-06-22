"use client"

import React, { useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { 
  Radar, 
  MapPin, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Store,
  Navigation,
  ShieldAlert,
  Target,
  Sparkles,
  ArrowUpRight,
  Info,
  CheckCircle2,
  Scissors
} from "lucide-react";
import dynamic from 'next/dynamic';
import BackButton from './BackButton';

const DynamicRadarMap = dynamic(() => import('./RadarMapLayer'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-muted-foreground">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
      <p>Loading Map Engine...</p>
    </div>
  )
});

export default function ClientRadarDashboard({ shopData }: { shopData: any }) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
  
  const targetLat = shopData.latitude ? parseFloat(shopData.latitude) : 29.552846;
  const targetLng = shopData.longitude ? parseFloat(shopData.longitude) : -95.1190174;

  const [viewState, setViewState] = useState({
    latitude: targetLat,
    longitude: targetLng,
    zoom: 14,
    pitch: 45,
    bearing: 0
  });

  const [barberId, setBarberId] = useState<string | null>(null);
  const [isRequested, setIsRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  React.useEffect(() => {
    const savedPhone = localStorage.getItem("matches_phone");
    if (savedPhone) {
      import('@/app/shop-day-matches/actions').then(m => {
        m.fetchBarberMatches(savedPhone).then(result => {
          if (result.barberId) {
            setBarberId(result.barberId);
          }
        });
      });
    }
  }, []);

  const handleRequestShopDay = async () => {
    if (!barberId) {
      // Redirect to login if not authenticated
      window.location.href = "/shop-day-matches";
      return;
    }
    
    setIsRequesting(true);
    try {
      const { requestShopDay } = await import('@/app/shop-day-matches/actions');
      const result = await requestShopDay(barberId, shopData.id);
      if (result.error) {
        alert(result.error);
      } else {
        setIsRequested(true);
      }
    } catch (e) {
      alert("Failed to request shop day.");
    } finally {
      setIsRequesting(false);
    }
  };

  // Extract Radar Data
  const oppStatus = shopData.opportunity_status || 'UNKNOWN OPPORTUNITY';
  const wealthInd = shopData.local_wealth_indicator || 'UNKNOWN PRICING';
  const momentum = shopData.review_momentum_status || 'UNKNOWN MOMENTUM';
  const vibe = shopData.ai_culture_summary || 'Analysis pending...';
  const compCount = shopData.competitor_count_800m ?? 0;
  
  // Safely parse top anchors
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

  // Calculate Walk-In Score
  const calculateWalkInScore = () => {
    let score = 0;

    // 1. Momentum (Max 30)
    if (momentum.includes('EXPLODING')) score += 30;
    else if (momentum.includes('STABLE')) score += 20;
    else score += 5;

    // 2. Anchors (Max 25)
    if (topAnchors.length >= 4) score += 25;
    else if (topAnchors.length >= 2) score += 15;
    else if (topAnchors.length === 1) score += 10;

    // 3. Competitor Density (Max 20)
    if (compCount <= 2) score += 20;
    else if (compCount <= 5) score += 15;
    else if (compCount <= 8) score += 10;
    else score += 5;

    // 4. Google Authority (Max 15)
    const rating = parseFloat(shopData.rating || 0);
    const reviews = parseInt(shopData.total_reviews || 0);
    if (rating >= 4.5 && reviews > 50) score += 15;
    else if (rating >= 4.0 && reviews > 20) score += 10;
    else score += 5;

    // 5. Structure (Max 10)
    const rentType = shopData.rent_type || "";
    if (rentType.toLowerCase().includes('commission')) score += 10;
    else if (rentType.toLowerCase().includes('booth rent')) score += 5;

    return Math.min(score, 100);
  };

  const walkInScore = calculateWalkInScore();

  // Define dynamic colors based on status
  const isGoldmine = oppStatus.includes('UNICORN');
  const isBattleground = oppStatus.includes('BATTLEGROUND');
  
  const statusColor = isGoldmine ? 'bg-emerald-500' : isBattleground ? 'bg-amber-500' : 'bg-blue-500';
  const statusBg = isGoldmine ? 'bg-emerald-500/10 border-emerald-500/20' : isBattleground ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20';
  const statusText = isGoldmine ? 'text-emerald-500' : isBattleground ? 'text-amber-500' : 'text-blue-500';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton label="Back to Directory" />
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${statusColor} text-white shadow-lg shadow-black/5 ml-4`}>
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {shopData.shop_name} 
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {shopData.formatted_address || shopData.city}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className={`px-4 py-1.5 rounded-full border text-sm font-semibold flex items-center gap-2 ${statusBg} ${statusText}`}>
              <Target className="h-4 w-4" />
              {oppStatus}
            </div>
            
            <button 
              onClick={handleRequestShopDay}
              disabled={isRequested || isRequesting}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 ${
                isRequested 
                  ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
              }`}
            >
              {isRequested ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Requested
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4" />
                  {isRequesting ? "Requesting..." : "Request Shop Day"}
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 mx-auto max-w-7xl px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Map & Anchors */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* Mapbox Container */}
          <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm h-[400px] relative">
            {mapboxToken ? (
              <DynamicRadarMap
                viewState={viewState}
                setViewState={setViewState}
                targetLat={targetLat}
                targetLng={targetLng}
                mapboxToken={mapboxToken}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                <MapPin className="h-8 w-8 mb-2 opacity-50" />
                <p>Mapbox Token Required</p>
              </div>
            )}
            
            {/* Map Overlay Stats */}
            <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
              <div className="bg-background/90 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50 shadow-lg pointer-events-auto flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Walking Distance</div>
                  <div className="text-sm font-bold">800m Radius</div>
                </div>
              </div>
              
              <div className="bg-background/90 backdrop-blur-md px-4 py-2 rounded-xl border border-border/50 shadow-lg pointer-events-auto flex items-center gap-3">
                <ShieldAlert className={`h-5 w-5 ${isBattleground ? 'text-amber-500' : 'text-emerald-500'}`} />
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Competitor Count</div>
                  <div className="text-sm font-bold">{compCount} Rival Shops</div>
                </div>
              </div>
            </div>
          </div>

          {/* Anchor Tenants List */}
          <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Top Traffic Generators
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Massive retail anchors driving daily foot traffic to this plaza.</p>
              </div>
            </div>

            {topAnchors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {topAnchors.map((anchor: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-border/50 bg-slate-50 dark:bg-slate-950 flex flex-col gap-3 group hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{anchor.name}</h3>
                      <div className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-md font-medium">{anchor.type?.replace(/_/g, ' ')}</div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
                No major anchor tenants detected in this immediate area.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Intelligence Panels */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Walk-In Opportunity Score */}
          <div className="rounded-2xl border border-transparent bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-[1px] shadow-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[15px] p-6 h-full backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                <Target className="h-32 w-32" />
              </div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground mb-6 flex items-center justify-between">
                Walk-In Opportunity Score
              </h2>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="relative flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle 
                      cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 40}`} 
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - walkInScore / 100)}`} 
                      className={`transition-all duration-1000 ease-out ${walkInScore >= 80 ? 'text-emerald-500' : walkInScore >= 60 ? 'text-amber-500' : 'text-red-500'}`} 
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{walkInScore}</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Grade Level</div>
                  <div className={`text-2xl font-black ${walkInScore >= 80 ? 'text-emerald-500' : walkInScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                    {walkInScore >= 95 ? 'S-Tier' : walkInScore >= 90 ? 'A+' : walkInScore >= 80 ? 'A' : walkInScore >= 70 ? 'B' : walkInScore >= 60 ? 'C' : 'D'}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-border/50 text-sm text-foreground leading-relaxed">
                <span className="font-bold">Barber Assessment: </span>
                {walkInScore >= 80 
                  ? "Excellent walk-in potential. This shop has high anchor traffic and solid momentum. Sitting here gives you a very high probability of building a clientele quickly." 
                  : walkInScore >= 60 
                  ? "Moderate walk-in potential. You will see some traffic, but you may need to market yourself on social media to stay consistently busy."
                  : "Low walk-in potential. This shop either faces extreme competition or lacks anchor traffic. You must bring your own clientele to survive here."}
              </div>
            </div>
          </div>
          
          {/* Wealth Indicator */}
          <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <DollarSign className="h-32 w-32" />
            </div>
            <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground mb-4">Local Wealth Indicator</h2>
            <div className="text-2xl font-bold text-foreground mb-2">
              {wealthInd}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Based on the surrounding retail pricing ceiling. 
              {wealthInd.includes('VALUE') 
                ? " Success here depends on high-volume, affordable cuts ($20 - $35)."
                : wealthInd.includes('$$$') 
                ? " High likelihood of supporting premium haircut pricing ($50+)."
                : " A good fit for standard market-rate haircuts ($30 - $45)."}
            </p>
          </div>

          {/* Review Momentum */}
          <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground mb-4 flex items-center justify-between">
              Growth Velocity
              <ArrowUpRight className="h-4 w-4" />
            </h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xl font-bold text-foreground">
                {momentum}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {momentum.includes('EXPLODING') 
                ? "They have received multiple high-rating reviews recently. Momentum and walk-in traffic is accelerating."
                : momentum.includes('STABLE')
                ? "Consistent recent reviews. The shop maintains a steady flow of clientele."
                : "High historical reviews, but recent traction is slowing. Walk-in traffic may be declining."}
            </p>
          </div>

          {/* AI Vibe Check */}
          <div className="rounded-2xl border border-transparent bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 p-[1px] shadow-sm">
            <div className="bg-white dark:bg-slate-900 rounded-[15px] p-6 h-full backdrop-blur-xl">
              <h2 className="text-sm font-bold tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                AI Culture Summary
              </h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {vibe.split('|').map((tag: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-semibold border border-indigo-100 dark:border-indigo-900/50">
                    {tag.trim()}
                  </span>
                ))}
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  <Info className="h-3.5 w-3.5" />
                  Barber Strategy Match
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  Make sure your cutting style and personality match this vibe. If you specialize in these areas, you will seamlessly absorb their walk-in traffic.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
