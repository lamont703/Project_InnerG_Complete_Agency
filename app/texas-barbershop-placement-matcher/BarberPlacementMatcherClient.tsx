"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { 
  MapPin, 
  Sliders, 
  Search, 
  Send, 
  Cpu, 
  Navigation, 
  User, 
  Phone, 
  Mail, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ArrowRight, 
  Building2, 
  Sparkles, 
  Clock,
  ShieldCheck,
  Star
} from "lucide-react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { useTheme } from 'next-themes'

// Coordinates for major Texas metro hubs
const METRO_COORDINATES: { [key: string]: { lat: number; lon: number } } = {
  DALLAS: { lat: 32.7767, lon: -96.7970 },
  HOUSTON: { lat: 29.7604, lon: -95.3698 },
  AUSTIN: { lat: 30.2672, lon: -97.7431 },
  "SAN ANTONIO": { lat: 29.4241, lon: -98.4936 },
  "FORT WORTH": { lat: 32.7555, lon: -97.3308 },
  "EL PASO": { lat: 31.7619, lon: -106.4850 }
};

interface Shop {
  licenseType?: string;
  licenseNumber: string;
  businessCounty: string;
  businessName: string;
  addressLine1: string;
  addressLine2?: string;
  cityStateZip: string;
  telephone: string;
  expirationDate?: string;
  ownerName: string;
  subtype: string;
  continuingEducation?: string;
  longitude: number;
  latitude: number;
}

interface ClientProps {
  initialShops: Shop[];
  errorMsg: string;
}

// Haversine Formula for distance calculation in miles
function getDistanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function BarberPlacementMatcherClient({ initialShops, errorMsg }: ClientProps) {
  const { setTheme } = useTheme();
  
  // Force Light Theme
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  // Filter States
  const [selectedMetro, setSelectedMetro] = useState("DALLAS");
  const [radius, setRadius] = useState(15);
  const [selectedSubtype, setSelectedSubtype] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customCoords, setCustomCoords] = useState<{lat: number, lon: number} | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleGeocodeCustomAddress = async () => {
    if (!customAddress.trim()) return;
    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customAddress + ", Texas")}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        setCustomCoords({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
        setSelectedMetro("CUSTOM");
      } else {
        alert("Could not locate that exact address in Texas. Please try a valid street or city name.");
      }
    } catch (err) {
      console.error("Geocoding failed", err);
      alert("Geocoding service unavailable.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // UI Selection States
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    school: "",
    practiceScore: 85,
    specialty: "fades"
  });

  // AI Simulation States
  const [simulationStep, setSimulationStep] = useState<"form" | "terminal" | "outcome">("form");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [mockActionCards, setMockActionCards] = useState<any[]>([]);

  // Dynamic Loader States
  const [mounted, setMounted] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Leaflet Map Refs
  const mapContainerId = "geo-street-map";
  const mapRef = useRef<any>(null);
  const markerGroupRef = useRef<any>(null);
  const markerRefs = useRef<{ [key: string]: any }>({});
  const radiusCircleRef = useRef<any>(null);
  const studentMarkerRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset selected shops on metro change
  useEffect(() => {
    setSelectedShops([]);
  }, [selectedMetro]);

  // Inbound Script injection to fetch Leaflet securely from CDN without version conflicts
  useEffect(() => {
    if (!mounted) return;

    // 1. Inject CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // 2. Inject JS
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      document.body.appendChild(script);
    } else {
      if ((window as any).L) {
        setLeafletLoaded(true);
      }
    }
  }, [mounted]);

  // Compute distances and filter shops in real-time, applying deterministic geodetic jittering
  const filteredShops = useMemo(() => {
    const center = selectedMetro === "CUSTOM" && customCoords ? customCoords : METRO_COORDINATES[selectedMetro];
    if (!center) return [];

    return initialShops
      .map(shop => {
        const finalLat = shop.latitude;
        const finalLon = shop.longitude;

        const dist = getDistanceInMiles(center.lat, center.lon, finalLat, finalLon);
        return { 
          ...shop, 
          latitude: finalLat, 
          longitude: finalLon, 
          distance: dist 
        };
      })
      .filter(shop => {
        // Radius filter
        if (shop.distance > radius) return false;

        // Strict Subtype filter
        const isBarber = shop.subtype === "BS" || shop.businessName.toUpperCase().includes("BARBER") || (shop.licenseType && shop.licenseType.toUpperCase().includes("BARBER"));
        if (selectedSubtype === "BS" && !isBarber) return false;
        if (selectedSubtype === "CS" && isBarber) return false;

        // Search Query filter
        if (searchQuery) {
          const query = searchQuery.toUpperCase();
          const matchName = shop.businessName.toUpperCase().includes(query);
          const matchCounty = shop.businessCounty.toUpperCase().includes(query);
          const matchAddr = shop.cityStateZip.toUpperCase().includes(query);
          if (!matchName && !matchCounty && !matchAddr) return false;
        }

        return true;
      })
      .sort((a, b) => a.distance - b.distance);
  }, [initialShops, selectedMetro, customCoords, radius, selectedSubtype, searchQuery]);

  // Initialize and update Live Leaflet Map dynamically
  useEffect(() => {
    if (!leafletLoaded || !mounted) return;
    const L = (window as any).L;
    if (!L) return;

    const center = selectedMetro === "CUSTOM" && customCoords ? customCoords : METRO_COORDINATES[selectedMetro];
    if (!center) return;

    // A. Create Map instance if not initialized
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerId, {
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([center.lat, center.lon], 11);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        maxZoom: 19
      }).addTo(mapRef.current);

      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    } else {
      mapRef.current.setView([center.lat, center.lon], mapRef.current.getZoom());
    }

    // B. Plot Student Core Pin
    if (studentMarkerRef.current) {
      studentMarkerRef.current.setLatLng([center.lat, center.lon]);
    } else {
      const studentIcon = L.divIcon({
        className: 'custom-student-pin',
        html: `<div style="background-color: #e6af00; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.35); position: relative;"><div style="position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px; border-radius: 50%; border: 2px solid #e6af00; animation: ping 1.5s infinite; opacity: 0.6;"></div></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      studentMarkerRef.current = L.marker([center.lat, center.lon], { icon: studentIcon })
        .addTo(mapRef.current)
        .bindPopup("<b style='color: #0f172a;'>Graduate Placement Center</b><br><span style='color: #64748b;'>Selected Search Hub</span>");
    }

    // C. Plot Radius Circle
    const radiusInMeters = radius * 1609.34;
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([center.lat, center.lon]);
      radiusCircleRef.current.setRadius(radiusInMeters);
    } else {
      radiusCircleRef.current = L.circle([center.lat, center.lon], {
        radius: radiusInMeters,
        color: '#e6af00',
        fillColor: '#e6af00',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(mapRef.current);
    }

    // Smoothly scale maps bounds to display the entire circle
    mapRef.current.fitBounds(radiusCircleRef.current.getBounds(), { padding: [15, 15] });

    // D. Clear previous pins and plot new matching storefront markers
    markerGroupRef.current.clearLayers();
    markerRefs.current = {};

    // Gather shops to plot: Top 50 nearest shops, and guarantee EVERY selected shop is plotted as well!
    const plottedShops = [...filteredShops.slice(0, 50)];
    selectedShops.forEach(licenseNum => {
      // Look up inside already-jittered filteredShops first to preserve coordinate spreading
      let selectedShop = filteredShops.find(s => s.licenseNumber === licenseNum);
      
      if (!selectedShop) {
        // Fallback to initialShops using raw Mapbox rooftop coordinates
        const rawShop = initialShops.find(s => s.licenseNumber === licenseNum);
        if (rawShop) {
          selectedShop = {
            ...rawShop,
            latitude: rawShop.latitude,
            longitude: rawShop.longitude,
            distance: getDistanceInMiles(center.lat, center.lon, rawShop.latitude, rawShop.longitude)
          };
        }
      }

      if (selectedShop && !plottedShops.some(s => s.licenseNumber === licenseNum)) {
        plottedShops.push(selectedShop);
      }
    });

    plottedShops.forEach(shop => {
      const isBarber = shop.subtype === "BS" || shop.businessName.toUpperCase().includes("BARBER") || (shop.licenseType && shop.licenseType.toUpperCase().includes("BARBER"));
      const isSelected = selectedShops.includes(shop.licenseNumber);
      
      let pinIcon;
      if (isSelected) {
        const pinColor = isBarber ? '#f59e0b' : '#10b981';
        pinIcon = L.divIcon({
          className: 'custom-shop-pin-selected',
          html: `<div style="background-color: ${pinColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${pinColor}; position: relative; z-index: 9999;"><div style="position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px; border-radius: 50%; border: 2px solid ${pinColor}; animation: ping 1s infinite; opacity: 0.8;"></div></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
      } else {
        pinIcon = L.divIcon({
          className: 'custom-shop-pin',
          html: `<div style="background-color: ${isBarber ? '#f59e0b' : '#10b981'}; width: 11px; height: 11px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.25);"></div>`,
          iconSize: [11, 11],
          iconAnchor: [5.5, 5.5]
        });
      }

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 11px; color: #0f172a; padding: 2px; line-height: 1.4;">
          <b style="text-transform: uppercase; font-size: 12px;">${shop.businessName}</b><br>
          <span style="color: #64748b;">${shop.addressLine1}</span><br>
          <span style="font-weight: bold; color: #e6af00;">${shop.distance.toFixed(1)} Miles Away</span><br>
          <span style="font-family: monospace; color: #64748b; font-size: 9px; display: block; margin-top: 3px;">GPS: ${shop.latitude.toFixed(5)}, ${shop.longitude.toFixed(5)}</span>
          <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: ${isBarber ? '#d97706' : '#059669'}; background-color: ${isBarber ? '#fef3c7' : '#d1fae5'}; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">
            ${isBarber ? 'Barber Shop' : 'Cosmetology'}
          </span>
        </div>
      `;

      const marker = L.marker([shop.latitude, shop.longitude], { icon: pinIcon })
        .addTo(markerGroupRef.current)
        .bindPopup(popupHtml);

      markerRefs.current[shop.licenseNumber] = marker;
    });

  }, [leafletLoaded, selectedMetro, customCoords, radius, filteredShops, selectedShops, initialShops]);

  // Handle Multi-Select checkbox toggles
  const handleSelectShop = (shop: Shop) => {
    const licenseNumber = shop.licenseNumber;
    const isNowSelected = !selectedShops.includes(licenseNumber);
    
    setSelectedShops(prev => 
      prev.includes(licenseNumber) 
        ? prev.filter(id => id !== licenseNumber) 
        : [...prev, licenseNumber]
    );

    // Smoothly pan map to selected shop coordinates and zoom in slightly
    if (isNowSelected && mapRef.current) {
      mapRef.current.setView([shop.latitude, shop.longitude], 13, {
        animate: true,
        duration: 0.8
      });

      // Programmatically open marker popup after a brief delay to match the panning transition
      setTimeout(() => {
        const marker = markerRefs.current[licenseNumber];
        if (marker) {
          marker.openPopup();
        }
      }, 800);
    }
  };

  // Select all visible filtered shops
  const handleSelectAll = () => {
    if (selectedShops.length === filteredShops.length) {
      setSelectedShops([]);
    } else {
      setSelectedShops(filteredShops.map(s => s.licenseNumber));
    }
  };

  // Run outreach simulation
  const startSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.phone || !leadForm.email) return;

    setSimulationStep("terminal");
    setTerminalLogs([]);

    const logs = [
      `[SYS] Initializing Sovereign Recruiter Agent v2.46...`,
      `[SYS] Loading profile for candidate: ${leadForm.name.toUpperCase()}...`,
      `[SYS] Attended: ${leadForm.school.toUpperCase() || "TEXAS ACCREDITED BARBER COLLEGE"}`,
      `[SYS] State Board Practice Score: ${leadForm.practiceScore}% (Licensure Ready)`,
      `[SYS] Core Focus: ${leadForm.specialty.toUpperCase()}`,
      `[SYS] Targeting ${selectedShops.length} selected establishments...`,
      `--------------------------------------------------`
    ];

    let logIndex = 0;
    const interval = setInterval(() => {
      if (logIndex < logs.length) {
        setTerminalLogs(prev => [...prev, logs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(interval);
        simulateMultipleShopOutreach();
      }
    }, 400);
  };

  const simulateMultipleShopOutreach = () => {
    const actionCards: any[] = [];
    const logs: string[] = [];

    // Simulate outreach for up to 3 selected shops to show rich outcomes
    const targetShops = selectedShops.slice(0, 3).map(licenseNum => 
      filteredShops.find(s => s.licenseNumber === licenseNum)
    ).filter(Boolean) as Shop[];

    targetShops.forEach((shop, index) => {
      const isBarber = shop.subtype === "BS" || shop.businessName.toUpperCase().includes("BARBER") || (shop.licenseType && shop.licenseType.toUpperCase().includes("BARBER"));
      logs.push(`[AGENT] Dispatching custom SMS outreach to: "${shop.businessName.toUpperCase()}"`);
      logs.push(`[SYS] GPS Coordinate Target: [${shop.latitude.toFixed(5)}, ${shop.longitude.toFixed(5)}]`);
      logs.push(`[SMS] Sending direct packet to owner telephone: ${shop.telephone || "972-555-0144"}...`);
      logs.push(`[SYS] Owner response detected from "${shop.ownerName.toUpperCase()}"`);
      logs.push(`[AI-PARSER] Sentiment: POSITIVE. Audition generated.`);
      logs.push(`--------------------------------------------------`);

      actionCards.push({
        shopName: shop.businessName,
        county: shop.businessCounty,
        address: shop.addressLine1 + ", " + shop.cityStateZip,
        coordinates: `${shop.latitude.toFixed(5)}° N, ${Math.abs(shop.longitude).toFixed(5)}° W`,
        action: "Live Styling Audition & Interview",
        requirements: isBarber ? "Bring personal clippers, trimmers, guards, and a live hair model." : "Bring styling combs, shears, blow dryer, and a live model.",
        time: `This Thursday at ${2 + index}:00 PM`,
      });
    });

    if (selectedShops.length > 3) {
      logs.push(`[AGENT] Queued remaining ${selectedShops.length - 3} outreach requests into background queue...`);
      logs.push(`[SYS] Secure batch placement database synchronized successfully.`);
    } else {
      logs.push(`[SYS] Secure placement database synchronized successfully.`);
    }

    let logIndex = 0;
    const interval = setInterval(() => {
      if (logIndex < logs.length) {
        setTerminalLogs(prev => [...prev, logs[logIndex]]);
        logIndex++;
      } else {
        clearInterval(interval);
        setMockActionCards(actionCards);
        setTimeout(() => {
          setSimulationStep("outcome");
        }, 800);
      }
    }, 450);
  };

  return (
    <main className="min-h-screen bg-white text-slate-950 flex flex-col pt-20 selection:bg-primary/20 light">
      <Navbar />

      {/* Hero Header */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 lg:py-16">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 border-b border-slate-100 pb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px]">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Sovereign Career Tools
            </div>
            <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-slate-950 leading-tight">
              Barbershop & Cosmetology <br />Placement Matcher & Agent™
            </h1>
            <p className="text-sm font-bold text-slate-600 max-w-xl leading-relaxed">
              Explore your Texas job placement index for both barbershops and cosmetology salons. Using 35,399 real active state board licenses, select your commute boundaries, and let our autonomous AI Recruiter dispatch applications to shop owners instantly.
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 flex items-center gap-4 max-w-xs w-full">
            <Building2 className="h-10 w-10 text-primary shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">State Registry Size</p>
              <p className="text-2xl font-black italic text-slate-950">35,399 <span className="text-[10px] not-italic text-slate-400 font-bold uppercase">Shops</span></p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center gap-4 mb-10 text-red-800">
            <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
            <p className="text-sm font-bold">{errorMsg}</p>
          </div>
        )}

        {/* Spatial Intelligence Control Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Controls Panel */}
          <div className="bg-slate-50/60 border border-slate-100 rounded-[2.5rem] p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-slate-800">
                <Sliders className="h-5 w-5 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Commuter Bounds</span>
              </div>

              {/* Metro Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Selected City Hub</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(METRO_COORDINATES).map(city => (
                    <button
                      key={city}
                      onClick={() => setSelectedMetro(city)}
                      className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                        selectedMetro === city
                          ? "bg-slate-950 border-slate-950 text-white font-black shadow-lg shadow-slate-200 scale-105"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Address Geocoder */}
              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
                  <span>Or Enter Custom Address</span>
                  {isGeocoding && <span className="text-primary animate-pulse">Geocoding...</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 123 Main St, TX..."
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-[10px] font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleGeocodeCustomAddress();
                      }
                    }}
                  />
                  <button 
                    onClick={handleGeocodeCustomAddress}
                    disabled={!customAddress || isGeocoding}
                    className="bg-primary text-slate-950 px-3 rounded-xl flex items-center justify-center hover:bg-slate-950 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Navigation className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Radius Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Commute Radius</label>
                  <span className="text-sm font-black italic text-primary">{radius} Miles</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full accent-primary h-1 bg-slate-200 rounded-full appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[8px] font-bold text-slate-400">
                  <span>0 MI (LOCAL)</span>
                  <span>7.5 MI (COMMUTE)</span>
                  <span>15 MI (REGIONAL)</span>
                </div>
              </div>

              {/* Subtype Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Specialty Classification</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "ALL SHOPS" },
                    { id: "BS", label: "BARBER SHOPS" },
                    { id: "CS", label: "COSMETOLOGY" }
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedSubtype(type.id)}
                      className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-wider border transition-all ${
                        selectedSubtype === type.id
                          ? "bg-slate-950 border-slate-950 text-white font-black"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Keyword Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="SEARCH NAME, COUNTY, OR ZIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold tracking-widest placeholder-slate-400 text-slate-900 focus:outline-none focus:border-primary uppercase"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Spatial Live Interactive Geo Street Map */}
          <div className="lg:col-span-2 bg-slate-50 border border-slate-100 rounded-[2.5rem] p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[380px] shadow-sm">
            {/* Map Anchor Node */}
            <div 
              id={mapContainerId} 
              className="h-full w-full absolute inset-0 rounded-[2.5rem] bg-slate-100 z-10"
            />

            {!leafletLoaded && (
              <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center space-y-4 z-20">
                <div className="h-10 w-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Street Telemetry...</p>
              </div>
            )}

            {/* Real-time map telemetry box */}
            <div className="absolute bottom-6 left-8 right-8 flex justify-between items-center z-20 bg-white/95 border border-slate-100 px-6 py-3 rounded-2xl shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
                <MapPin className="h-4 w-4 text-primary shrink-0 animate-bounce" />
                Live Map Enabled
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Showing {Math.min(filteredShops.length, 50)} nearest shops
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Shops List and Application Gateway */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-100 rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedShops.length === filteredShops.length && filteredShops.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded accent-primary bg-white border-slate-200 cursor-pointer"
              />
              <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                Selected {selectedShops.length} / {filteredShops.length} Matching Salons
              </span>
            </div>

            {selectedShops.length > 0 && (
              <button
                onClick={() => {
                  setSimulationStep("form");
                  setIsModalOpen(true);
                }}
                className="w-full sm:w-auto bg-slate-950 text-white font-black uppercase tracking-[0.15em] text-[10px] py-4 px-8 rounded-2xl hover:bg-slate-800 transition-all scale-105 shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
              >
                <Cpu className="h-4 w-4" />
                Deploy AI Recruiter
              </button>
            )}
          </div>

          {/* Grid Layout of Storefronts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.length > 0 ? (
              filteredShops.slice(0, 15).map(shop => {
                const isBarber = shop.subtype === "BS" || shop.businessName.toUpperCase().includes("BARBER") || (shop.licenseType && shop.licenseType.toUpperCase().includes("BARBER"));
                const isSelected = selectedShops.includes(shop.licenseNumber);

                return (
                  <div
                    key={shop.licenseNumber}
                    onClick={() => handleSelectShop(shop)}
                    className={`bg-white border rounded-[2rem] p-6 space-y-4 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100/50 transition-all cursor-pointer select-none relative overflow-hidden group ${
                      isSelected ? "border-primary/60 bg-primary/[0.03] shadow-md shadow-primary/[0.02]" : "border-slate-100 shadow-sm"
                    }`}
                  >
                    {/* Specialty Subtype Tag */}
                    <div className="flex justify-between items-start">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        isBarber ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                      }`}>
                        {isBarber ? "Barber Shop" : "Cosmetology"}
                      </span>
                      <span className="text-[10px] font-black italic text-primary">
                        {shop.distance.toFixed(1)} Miles
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-base font-black uppercase tracking-tight text-slate-900 leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {shop.businessName}
                      </h3>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {shop.businessCounty} COUNTY
                        </p>
                        <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest pl-4">
                          GPS: {shop.latitude.toFixed(5)}, {shop.longitude.toFixed(5)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-t border-slate-100 pt-4">
                      <p className="line-clamp-1">{shop.addressLine1}</p>
                      <p className="line-clamp-1">{shop.cityStateZip}</p>
                      <p className="text-slate-900 font-black italic">TEL: {shop.telephone || "N/A"}</p>

                      <div className="pt-3 mt-3 border-t border-slate-100/60 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-[8px]">LICENSE EXPIRATION:</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {shop.expirationDate || "UNKNOWN"}
                          </span>
                        </div>
                        {shop.continuingEducation === 'Y' && (
                          <div className="flex justify-between items-center text-amber-700 bg-amber-500/10 rounded px-2 py-1">
                            <span className="text-[8px] tracking-widest font-black">CE CREDITS REQUIRED</span>
                            <ShieldCheck className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkbox Trigger Overlay */}
                    <div className="absolute top-6 right-6">
                      <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
                        isSelected ? "bg-slate-950 border-slate-950 text-white" : "border-slate-200 bg-white"
                      }`}>
                        {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 font-black" />}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full bg-slate-50 border border-slate-100 rounded-[2.5rem] p-12 text-center text-slate-500 space-y-2">
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold uppercase tracking-widest">No establishments found in Commuter bounds.</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Expand your commute radius slider or try a different city center hub.</p>
              </div>
            )}

            {filteredShops.length > 15 && (
              <div className="col-span-full text-center py-4 bg-slate-50 rounded-2xl border border-slate-100 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                + {filteredShops.length - 15} More Stores Available inside radius bounds.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Outreach Recruiter Modal (Lead Form) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 w-full max-w-2xl rounded-[2.5rem] p-8 sm:p-10 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-950 text-xs font-black uppercase tracking-widest"
            >
              [ Close ]
            </button>

            {simulationStep === "form" && (
              <form onSubmit={startSimulation} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
                    <Cpu className="h-4 w-4" />
                    Sovereign AI Lead Form
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-900">Deploy AI Recruiter</h2>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase">
                    Register your profile to simulate deploying an autonomous AI candidate outreach agent to {selectedShops.length} selected Texas storefronts.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <User className="h-3 w-3" /> Candidate Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MARCUS JOHNSON"
                      value={leadForm.name}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <Phone className="h-3 w-3" /> Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 214-555-0199"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <Mail className="h-3 w-3" /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. MARCUS@GMAIL.COM"
                      value={leadForm.email}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <GraduationCap className="h-3 w-3" /> Barber/Cosmetology School
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TEXAS ACCREDITED BARBER ACADEMY"
                      value={leadForm.school}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, school: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        State Board Practice Score
                      </label>
                      <span className="text-xs font-black italic text-primary">{leadForm.practiceScore}%</span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="100"
                      value={leadForm.practiceScore}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, practiceScore: parseInt(e.target.value) }))}
                      className="w-full accent-primary h-1 bg-slate-200 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-slate-400">Grooming Specialty Focus</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "fades", label: "Fades & Blending" },
                        { id: "shaves", label: "Straight Razor" },
                        { id: "color", label: "Color & Chemistry" }
                      ].map(spec => (
                        <button
                          type="button"
                          key={spec.id}
                          onClick={() => setLeadForm(prev => ({ ...prev, specialty: spec.id }))}
                          className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                            leadForm.specialty === spec.id
                              ? "bg-slate-950 border-slate-950 text-white font-black"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          {spec.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-slate-950 font-black uppercase tracking-[0.2em] text-[10px] py-5 px-8 rounded-2xl hover:bg-slate-950 hover:text-white transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  Start Autonomous AI Application Simulation
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {simulationStep === "terminal" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
                    <Cpu className="h-4 w-4 shrink-0" />
                    AI Recruiter Terminal Console
                  </div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Outreach Live Stream</h2>
                </div>

                {/* Console Output Screen */}
                <div className="bg-slate-950 border border-white/5 rounded-2xl p-6 font-mono text-[10px] text-emerald-400 space-y-2 min-h-[300px] max-h-[350px] overflow-y-auto no-scrollbar shadow-inner select-none leading-relaxed">
                  {terminalLogs.map((log, i) => (
                    <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {log}
                    </div>
                  ))}
                  <div className="h-2 w-2 bg-emerald-400 rounded-full animate-ping mt-4" />
                </div>
              </div>
            )}

            {simulationStep === "outcome" && mockActionCards.length > 0 && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-2">
                  <div className="h-14 w-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-slate-950 font-black" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-900">Placement Hub Synchronized</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Outreach Simulation Completed for {selectedShops.length} shops!
                  </p>
                </div>

                {/* Dynamic Outcome Carousel/List for Selected Shops */}
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 no-scrollbar">
                  {mockActionCards.map((card, idx) => (
                    <div key={idx} className="bg-slate-950 text-white rounded-[2rem] p-8 border border-white/5 space-y-4 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10" />
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase bg-white text-slate-950 px-3 py-1 rounded-full tracking-widest italic">Target Shop #{idx + 1}</span>
                          <h3 className="text-xl font-black uppercase tracking-tight italic pt-2">{card.shopName}</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{card.county} County | {card.address}</p>
                          <p className="text-[9px] font-mono text-primary uppercase tracking-widest pt-1">Coordinates: {card.coordinates}</p>
                        </div>
                        <Star className="h-5 w-5 text-primary fill-primary" />
                      </div>

                      <div className="border-t border-white/10 pt-4 space-y-3 relative z-10">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Next Hiring Goal</p>
                            <p className="text-xs font-black italic text-white">{card.action}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Interview Timestamp</p>
                            <p className="text-xs font-black text-white">{card.time}</p>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Audition Requirements</p>
                          <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">{card.requirements}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex items-center gap-4 text-slate-600">
                  <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    Lead Saved. Our InnerG Complete Placement Agency has received your credentials. We will call you at {leadForm.phone} within 24 hours to sync with the live database and initiate mass placement outreach!
                  </p>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-slate-950 text-white font-black uppercase tracking-[0.2em] text-[10px] py-5 px-8 rounded-2xl hover:bg-primary hover:text-slate-950 transition-all flex items-center justify-center gap-2"
                >
                  Return to Commuter Scan
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Footer Audit Protocol Section */}
      <div className="mt-auto border-t border-slate-100 pt-12 flex flex-col items-center text-center space-y-6 bg-slate-50 px-4 pb-12">
        <div className="flex items-center gap-4 text-primary">
          <Cpu className="h-6 w-6 animate-pulse" />
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.5em] text-slate-800">Sovereign Placement Gateway</span>
        </div>
        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-relaxed max-w-sm px-4">
          Direct SMS/Email database integrations designed to secure employment for graduates and bulletproof institutional placement compliance.
        </p>
      </div>

      <Footer />
    </main>
  );
}
