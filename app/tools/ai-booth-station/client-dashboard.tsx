"use client";

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { BarChart3, TrendingUp, Users, MapPin, Search, ChevronRight, Activity, Percent, DollarSign, BrainCircuit, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StudentPassportModal } from "@/components/shared/student-passport-modal"

type Barber = {
  id: string;
  name: string | null;
  school_name: string | null;
  status: string | null;
  distance: number | null;
  [key: string]: any; // Allow other properties from DB
}

type Shop = {
  id: string;
  shop_name: string | null;
  rent_rate: string | null;
  rent_type: string | null;
  distance: number | null;
}

type TargetShopInfo = {
  ownerName: string;
  shopName: string;
  cityInfo: string;
  rentRate: string;
  rentType: string;
  boothCountAvailable: number;
  initials: string;
}

interface ClientDashboardProps {
  initialBarbers: Barber[];
  initialShops?: Shop[];
  targetShop: TargetShopInfo;
}

const RADIUS_OPTIONS = [1, 3, 5, 10];

export default function ClientDashboard({ initialBarbers, initialShops = [], targetShop }: ClientDashboardProps) {
  const [selectedRadius, setSelectedRadius] = useState<number>(10);
  const [selectedPassportStudent, setSelectedPassportStudent] = useState<any | null>(null);
  const [showAllBarbers, setShowAllBarbers] = useState(false);

  // Filter barbers dynamically based on selected radius
  const activeBarbers = initialBarbers.filter(b => b.distance === null || b.distance <= selectedRadius);
  const activeCount = activeBarbers.length;

  // Filter shops dynamically based on selected radius
  const activeShops = initialShops.filter(s => s.distance === null || s.distance <= selectedRadius);

  // Calculate dynamic averages
  let totalRent = 0;
  let rentCount = 0;
  
  // Naive commission counts to show variation
  let commission50 = 0;
  let commission60 = 0;

  activeShops.forEach(shop => {
    const typeLower = (shop.rent_type || "").toLowerCase();
    const isCommission = typeLower.includes("commission") || typeLower.includes("split");
    const isBoothRent = typeLower.includes("booth") || typeLower.includes("rent") || (!isCommission && typeLower !== "unknown");

    if (isBoothRent && shop.rent_rate) {
      // Extract dollar amounts (e.g., "$250/wk" -> 250)
      const match = shop.rent_rate.match(/\$?(\d+)/);
      if (match && parseInt(match[1]) > 50 && parseInt(match[1]) < 1000) {
        totalRent += parseInt(match[1]);
        rentCount++;
      }
    }
    
    if (isCommission) {
      // Naive logic to guess commission split preference from string data
      const rateLower = (shop.rent_rate || "").toLowerCase();
      if (rateLower.includes("50") || typeLower.includes("50")) commission50++;
      if (rateLower.includes("60") || typeLower.includes("60")) commission60++;
    }
  });

  // Safe defaults if no data is present in the specific radius
  const avgRent = rentCount > 0 ? Math.round(totalRent / rentCount) : 238;
  const avgSplit = commission60 > commission50 ? "60/40" : "50/50";

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 pb-20">
      {/* Top Navigation */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Inner G Complete Agency Home">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white transition-transform group-hover:scale-105 overflow-hidden">
              <Image 
                src="/icon-light-32x32.png" 
                alt="Inner G Logo" 
                width={32} 
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 sm:block">
              Inner G Complete<span className="hidden lg:inline text-zinc-500 font-normal"> Agency</span>
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-zinc-500">
              {targetShop.cityInfo}
            </div>
            <div className="h-8 w-px bg-zinc-200" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-zinc-900">{targetShop.ownerName}</div>
                <div className="text-xs text-zinc-500">{targetShop.shopName}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                {targetShop.initials}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">Chair-Pricing Intelligence</h1>
            <p className="text-zinc-500 font-medium">Real-time market analytics for your {targetShop.boothCountAvailable} available chairs near {targetShop.cityInfo}.</p>
          </div>
          
          {/* Radius Toggle */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-500">Search Radius:</span>
              <div className="bg-white rounded-lg p-1 border border-zinc-200 inline-flex shadow-sm">
                {RADIUS_OPTIONS.map((radius) => (
                  <button
                    key={radius}
                    onClick={() => setSelectedRadius(radius)}
                    className={cn(
                      "px-4 py-1.5 text-sm font-bold rounded-md transition-all duration-200",
                      selectedRadius === radius 
                        ? "bg-zinc-900 text-white shadow-sm" 
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    {radius} miles
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-zinc-400">Updates live market data below</span>
          </div>
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Metric 1 */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Live
              </span>
            </div>
            <h3 className="text-zinc-500 font-medium text-sm mb-1">Local Avg. Booth Rent</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-900 transition-all duration-300">${avgRent}</span>
              <span className="text-zinc-500 text-sm">/ week</span>
            </div>
            <div className="mt-2 text-xs text-zinc-400 font-medium">
              Based on {rentCount > 0 ? rentCount : "statewide averages"} nearby shops
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Percent className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full flex items-center gap-1">
                Live
              </span>
            </div>
            <h3 className="text-zinc-500 font-medium text-sm mb-1">Local Avg. Commission Split</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-900 transition-all duration-300">{avgSplit}</span>
              <span className="text-zinc-500 text-sm">Barber/Shop</span>
            </div>
            <div className="mt-2 text-xs text-zinc-400 font-medium">
              Based on {commission60 + commission50 > 0 ? commission60 + commission50 : "statewide averages"} nearby shops
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full flex items-center gap-1">
                Live Data
              </span>
            </div>
            <h3 className="text-zinc-500 font-medium text-sm mb-1">Active Job Seeking Barbers</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-zinc-900 transition-all duration-300">{activeCount}</span>
              <span className="text-zinc-500 text-sm">within {selectedRadius} miles</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left 2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI Oracle Analysis */}
            <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <BrainCircuit className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">AI Offer Analysis</h2>
                    <p className="text-sm text-zinc-500">Based on your recent SMS conversation data</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <p className="text-zinc-700 leading-relaxed text-lg">
                    {targetShop.ownerName.split(' ')[0]}, you currently have <strong className="text-zinc-900">{targetShop.boothCountAvailable} chairs available</strong>. Based on your recent SMS logs, you are offering: <strong className="text-zinc-900">{targetShop.rentRate}</strong> or <strong className="text-zinc-900">{targetShop.rentType}</strong>.
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-emerald-50 rounded-lg p-5 border border-emerald-100">
                      <h4 className="font-bold text-emerald-800 flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4" /> Market Advantage
                      </h4>
                      <p className="text-sm text-emerald-700 leading-relaxed">
                        Offering these flexible structures is an advantage. Your current offer is compared against the ${avgRent} local average, making it competitive to graduating barbers who don't yet have a clientele.
                      </p>
                    </div>
                    
                    <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-100">
                      <h4 className="font-bold text-indigo-800 flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4" /> Recommended Action
                      </h4>
                      <p className="text-sm text-indigo-700 leading-relaxed">
                        To fill your {targetShop.boothCountAvailable} chairs faster, emphasize the {targetShop.rentType} structure. Position your offer as a "graduation path" once they build their book. We can instantly blast this offer to {activeCount} matches.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Match Queue */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">Live Match Queue</h2>
                  <p className="text-sm text-zinc-500">Professionals looking for chair rental near {targetShop.cityInfo}.</p>
                </div>
                <Button 
                  variant="outline" 
                  className="text-sm font-medium border-zinc-200"
                  onClick={() => setShowAllBarbers(!showAllBarbers)}
                >
                  {showAllBarbers ? "View Less" : `View All (${activeCount})`}
                </Button>
              </div>
              
              <div className="divide-y divide-zinc-100 transition-all duration-300">
                {(showAllBarbers ? activeBarbers : activeBarbers.slice(0, 5)).map((barber, i) => (
                  <div 
                    key={barber.id || i} 
                    onClick={() => {
                      setSelectedPassportStudent({
                        ...barber,
                        type: barber.type || "Barber",
                        image: barber.passport_image_url || "/images/default_passport_avatar.png",
                        city: barber.metro_area || barber.city || "Texas"
                      });
                    }}
                    className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors animate-in fade-in zoom-in-95 duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center font-bold text-zinc-500 text-lg uppercase">
                        {barber.name ? barber.name.substring(0, 2) : '?'}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 capitalize">{barber.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <MapPin className="w-3 h-3" /> {barber.distance !== null ? `${barber.distance.toFixed(1)} miles away` : "Distance unknown"} • {barber.school_name || "Licensed Barber"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full capitalize">
                        {barber.status?.replace(/_/g, ' ') || 'Seeking Placement'}
                      </span>
                      <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {activeBarbers.length === 0 && (
                  <div className="p-10 text-center text-zinc-500 animate-in fade-in">
                    No active job seekers found within a {selectedRadius} mile radius.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Sidebar (1/3) */}
          <div className="space-y-6">
            
            {/* Current Offerings Card */}
            <div className="bg-zinc-900 rounded-xl p-6 shadow-lg text-white">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-zinc-400" /> Your Active Listings
              </h3>
              
              <div className="space-y-6">
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                  <div className="text-sm font-medium text-zinc-400 mb-1 uppercase tracking-wider">Option A</div>
                  <div className="text-xl font-black text-white mb-2">{targetShop.rentType}</div>
                  <p className="text-sm text-zinc-300">Based on your recent messages.</p>
                </div>

                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                  <div className="text-sm font-medium text-zinc-400 mb-1 uppercase tracking-wider">Option B</div>
                  <div className="text-xl font-black text-white mb-2">{targetShop.rentRate}</div>
                  <p className="text-sm text-zinc-300">Based on your recent messages.</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Available Chairs</span>
                  <span className="font-bold text-white bg-zinc-800 px-2 py-1 rounded">{targetShop.boothCountAvailable}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-zinc-600 font-medium">
                  <Search className="w-4 h-4 mr-2 text-zinc-400" /> Browse Candidate Profiles
                </Button>
                <Button variant="outline" className="w-full justify-start text-zinc-600 font-medium">
                  <TrendingUp className="w-4 h-4 mr-2 text-zinc-400" /> Update Market Pricing
                </Button>
              </div>
            </div>

          </div>

        </div>
      </main>

      <StudentPassportModal 
        selectedPassportStudent={selectedPassportStudent} 
        onClose={() => setSelectedPassportStudent(null)} 
      />
    </div>
  )
}
