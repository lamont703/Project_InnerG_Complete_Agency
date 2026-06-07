"use client";

import React, { useState } from "react";
import { fetchBarberMatches, requestShopDay, updateBarberProfile, uploadPassportImage } from "./actions";
import { Phone, Lock, Building, Users, MapPin, CheckCircle2, ChevronRight, Scissors, Star, Briefcase, Sparkles, ShieldCheck, Settings, X, Save, Upload } from "lucide-react";


function maskPhone(phone: string | null) {
  if (!phone) return "No Phone Listed";
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return "****";
  const last4 = cleaned.slice(-4);
  return `(***) ***-${last4}`;
}

function maskEmail(email: string | null) {
  if (!email) return "No Email Listed";
  const parts = email.split("@");
  if (parts.length !== 2) return "****@****.com";
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.substring(0, Math.min(2, name.length)) + "****";
  return `${maskedName}@${domain}`;
}

export default function MatchesClient() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barberState, setBarberState] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  // Track which shops the user has requested a shop day for
  const [requestedShops, setRequestedShops] = useState<Set<string>>(new Set());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchBarberMatches(phone);
      if (result.error) {
        setError(result.error);
        if (result.barberName) setBarberState({ id: result.barberId!, name: result.barberName, ...(result.barber || {}) });
      } else {
        setBarberState({ id: result.barberId!, name: result.barberName!, ...(result.barber || {}) });
        setMatches(result.matches!);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestShopDay = async (shopId: string) => {
    if (!barberState) return;
    
    // Optimistic UI update
    setRequestedShops(prev => new Set(prev).add(shopId));
    
    const result = await requestShopDay(barberState.id, shopId);
    if (result.error) {
      alert(result.error);
      // Revert if failed
      setRequestedShops(prev => {
        const next = new Set(prev);
        next.delete(shopId);
        return next;
      });
    }
  };

  const openSettings = () => {
    setSettingsForm({
      name: barberState.name || "",
      phone: barberState.phone || "",
      address: barberState.address || "",
      desired_pay_structure: barberState.desired_pay_structure || "",
      school_name: barberState.school_name || "",
      specialty_type: barberState.specialty_type || "",
      licensure_status: barberState.licensure_status || "",
      completed_school_hours: barberState.completed_school_hours || "",
      instagram_handle: barberState.instagram_handle || "",
      tiktok_handle: barberState.tiktok_handle || "",
      youtube_channel: barberState.youtube_channel || "",
      placement_pathway: barberState.placement_pathway || "",
      desired_specialties: barberState.desired_specialties || "",
      email: barberState.email || "",
      website_url: barberState.website_url || "",
      passport_image_url: barberState.passport_image_url || ""
    });
    setSelectedImage(null);
    setIsSettingsOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    
    let updatedForm = { ...settingsForm };

    if (selectedImage) {
      const formData = new FormData();
      formData.append("file", selectedImage);
      formData.append("barberId", barberState.id);
      
      const uploadRes = await uploadPassportImage(formData);
      if (uploadRes.error) {
        alert(uploadRes.error);
        setSavingSettings(false);
        return;
      }
      updatedForm.passport_image_url = uploadRes.imageUrl;
    }

    const res = await updateBarberProfile(barberState.id, updatedForm);
    if (res.error) {
      alert(res.error);
    } else {
      setBarberState({ ...barberState, ...updatedForm });
      setIsSettingsOpen(false);
    }
    setSavingSettings(false);
  };

  if (!barberState) {
    // Login State
    return (
      <div className="max-w-md mx-auto bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Access Your Matches</h2>
        <p className="text-slate-500 text-center mb-8 text-sm">Enter the phone number you used when speaking with our team.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="(555) 555-5555"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-2 font-medium px-2">{error}</p>}
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 group"
          >
            {loading ? "Verifying..." : "View My Matches"}
            {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
      </div>
    );
  }

  // Dashboard State
  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-lg border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Welcome, {barberState.name}!</h2>
          <p className="text-slate-500 font-medium">
            {matches.length > 0 
              ? `We found ${matches.length} highly-rated barbershops hiring within exactly 10 miles of your location.`
              : error ? error : "We couldn't find any hiring shops within a 10 mile radius at this moment."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={openSettings}
            className="text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 p-2.5 rounded-xl transition-colors"
            title="Profile Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={() => { setBarberState(null); setPhone(""); setMatches([]); }}
            className="text-slate-500 hover:text-slate-900 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {matches.length > 0 && (
        <>
          <div className="bg-blue-50/80 border border-blue-200 p-5 rounded-3xl mb-8 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mt-0.5 bg-blue-100 p-2 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-black text-blue-950 text-lg mb-1 tracking-tight">How Shop Days Work</h3>
              <p className="text-blue-800 text-sm font-medium leading-relaxed max-w-4xl">
                When you click <strong>Request Shop Day</strong>, the shop owner will immediately receive your request along with your Career Passport. They will review your profile and contact you directly by phone to coordinate a date and time for you to visit the shop!
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((shop) => {
            const isRequested = requestedShops.has(shop.id);
            return (
              <div key={shop.id} className="rounded-[2.2rem] border border-slate-200 p-6 bg-white hover:border-blue-400 hover:shadow-2xl transition-all flex flex-col group relative overflow-hidden">
                {/* Hiring Pulsing Badge */}
                {shop.hiring_need || (shop.booth_count_available && shop.booth_count_available >= 1) ? (
                  <span className="absolute top-4 right-4 z-10 px-3.5 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md animate-pulse">
                    Hiring: {shop.booth_count_available || 1}+ Chairs
                  </span>
                ) : null}

                {/* Gallery Image */}
                <div className="relative w-full h-52 rounded-2xl overflow-hidden mb-6 border border-slate-100 shadow-sm bg-slate-50 group-hover:shadow-md transition-shadow">
                  <img 
                    src={shop.shop_image_url || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-assets/shop-images/${shop.id}`}
                    alt={shop.shop_name} 
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-80 pointer-events-none" />
                  
                  {/* Distance Overlaid Tag */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/20 shadow-sm">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-extrabold text-slate-800">{shop.distance_miles} miles away</span>
                  </div>
                </div>

                
                <div className="flex-1 flex flex-col">
                  {/* Shop Name & Website Link */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                        {shop.shop_name}
                      </h3>
                      {shop.formatted_address ? (
                        <span className="text-xs text-slate-500 font-medium mt-1 block truncate w-[280px]" title={shop.formatted_address}>
                          {shop.formatted_address}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic mt-1 block">No Address Listed</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200/50">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-black text-amber-800">{shop.rating || "4.8"}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 mt-1">{shop.total_reviews || 120} Reviews</span>
                    </div>
                  </div>

                  {/* Specialty place tags */}
                  {shop.place_types && shop.place_types.split('|').length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {shop.place_types.split('|').map((t: string) => t.trim().replace(/_/g, ' ')).slice(0, 3).map((tag: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200/40">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Hiring Specifications */}
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4 mb-4 text-xs font-semibold">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Available Chairs</span>
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <Scissors className="w-3.5 h-3.5 text-blue-500" />
                        {shop.booth_count_available > 0 ? `${shop.booth_count_available} Chairs` : "No Chairs (Waitlist)"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Compensation</span>
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                        {shop.rent_type && shop.rent_type !== "Unknown" ? shop.rent_type : "Booth Rent / Commission"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5 border-t border-slate-200/60 pt-2 col-span-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Rent Rate</span>
                      <span className="font-black text-blue-600 text-sm flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {shop.rent_rate ? shop.rent_rate : "Negotiable (Claim to update)"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 border-t border-slate-200/60 pt-2 col-span-2">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Desired Specialties</span>
                      <span className="font-bold text-slate-700 bg-white border border-slate-200/80 px-2 py-1 rounded-lg mt-0.5 max-w-max text-[11px]">
                        {shop.specialty_desired && shop.specialty_desired !== "Unknown" ? shop.specialty_desired : "General Fades, Lineups & Shaves"}
                      </span>
                    </div>
                  </div>

                  {/* Owner & Obscured Contact Info Card */}
                  <div className="border border-slate-200 rounded-2xl p-4 mb-4 bg-slate-50/40 relative overflow-hidden">
                    <div className="absolute top-3 right-3 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-black uppercase tracking-wider mb-1">
                        <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                        Verified Owner Profile
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Owner Name:</span>
                        <span className="text-slate-700 font-bold">{shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : "Unclaimed (Claim to add)"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email Address:</span>
                        <span className="text-slate-700 font-bold font-mono">{maskEmail(shop.email)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Owner Phone:</span>
                        <span className="text-slate-700 font-bold font-mono">{maskPhone(shop.phone)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Call to action */}
                  <div className="mt-auto pt-4 space-y-3 border-t border-slate-100">
                    <button
                      onClick={() => handleRequestShopDay(shop.id)}
                      disabled={isRequested}
                      className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-md active:scale-[0.98] ${
                        isRequested 
                          ? "bg-green-50 border border-green-200 text-green-700 shadow-none cursor-default" 
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer"
                      }`}
                    >
                      {isRequested ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Shop Day Requested
                        </>
                      ) : (
                        <>
                          <Scissors className="w-4 h-4 text-blue-400" />
                          Request Shop Day
                        </>
                      )}
                    </button>

                    {shop.outreach_status?.trim().toLowerCase() === 'shop claimed' && (
                      <div className="w-full py-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50 text-emerald-600 font-bold text-xs inline-flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Shop Claimed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );

          })}
        </div>
        </>
      )}
      </div>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">Profile Settings</h3>
                <p className="text-sm text-slate-500 font-medium">Update your personal information below.</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="settings-form" onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Name</label>
                  <input type="text" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phone</label>
                  <input type="tel" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email</label>
                  <input type="email" value={settingsForm.email} onChange={e => setSettingsForm({...settingsForm, email: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Address</label>
                  <input type="text" value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Desired Pay Structure</label>
                  <select value={settingsForm.desired_pay_structure} onChange={e => setSettingsForm({...settingsForm, desired_pay_structure: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Option</option>
                    <option value="Booth Rent">Booth Rent</option>
                    <option value="Commission">Commission</option>
                    <option value="Salary">Salary</option>
                    <option value="Hourly">Hourly</option>
                    <option value="Open to any structure">Open to any structure</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Placement Pathway</label>
                  <select value={settingsForm.placement_pathway} onChange={e => setSettingsForm({...settingsForm, placement_pathway: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Option</option>
                    <option value="Seeking Immediate Placement">Seeking Immediate Placement</option>
                    <option value="Browsing Options">Browsing Options</option>
                    <option value="Future Placement (1+ month)">Future Placement (1+ month)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">School Name</label>
                  <input type="text" value={settingsForm.school_name} onChange={e => setSettingsForm({...settingsForm, school_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Completed Hours</label>
                  <input type="text" value={settingsForm.completed_school_hours} onChange={e => setSettingsForm({...settingsForm, completed_school_hours: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Licensure Status</label>
                  <select value={settingsForm.licensure_status} onChange={e => setSettingsForm({...settingsForm, licensure_status: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Status</option>
                    <option value="Licensed">Licensed</option>
                    <option value="Student">Student</option>
                    <option value="Permit">Permit</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Specialty Type</label>
                  <input type="text" placeholder="e.g. Barber, Cosmetologist, Braider" value={settingsForm.specialty_type} onChange={e => setSettingsForm({...settingsForm, specialty_type: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Desired Specialties</label>
                  <input type="text" placeholder="e.g. Fades, Braids, Color" value={settingsForm.desired_specialties} onChange={e => setSettingsForm({...settingsForm, desired_specialties: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Instagram Handle</label>
                  <input type="text" placeholder="@username" value={settingsForm.instagram_handle} onChange={e => setSettingsForm({...settingsForm, instagram_handle: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">TikTok Handle</label>
                  <input type="text" placeholder="@username" value={settingsForm.tiktok_handle} onChange={e => setSettingsForm({...settingsForm, tiktok_handle: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">YouTube Channel</label>
                  <input type="text" placeholder="Channel Link" value={settingsForm.youtube_channel} onChange={e => setSettingsForm({...settingsForm, youtube_channel: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Website URL</label>
                  <input type="url" placeholder="https://" value={settingsForm.website_url} onChange={e => setSettingsForm({...settingsForm, website_url: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Passport Image</label>
                  <div className="flex items-center gap-4">
                    {settingsForm.passport_image_url && !selectedImage && (
                      <img src={settingsForm.passport_image_url} alt="Passport" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-colors flex flex-col items-center justify-center gap-2">
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">
                          {selectedImage ? selectedImage.name : "Upload new passport image"}
                        </span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex justify-end gap-3">
              <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 transition-colors">
                Cancel
              </button>
              <button type="submit" form="settings-form" disabled={savingSettings} className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 transition-colors flex items-center gap-2">
                {savingSettings ? "Saving..." : <><Save className="w-4 h-4" /> Save Profile</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
