"use client";

import React, { useState } from "react";
import { fetchShopRequests, updateRequestStatus, updateShopDetails, uploadShopImage } from "./actions";
import { Phone, Lock, Building, MapPin, CheckCircle2, ChevronRight, XCircle, CalendarClock, User, Image as ImageIcon, Store, Save, X, Upload } from "lucide-react";

export default function RequestsClient() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopState, setShopState] = useState<{ id: string; name: string; address?: string; imageUrl?: string } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  const [isEditingShop, setIsEditingShop] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", address: "", imageUrl: "" });
  const [saveLoading, setSaveLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchShopRequests(phone);
      if (result.error) {
        setError(result.error);
        if (result.shopName) {
          setShopState({ id: result.shopId!, name: result.shopName, address: result.shopAddress, imageUrl: result.shopImageUrl });
          setEditForm({ name: result.shopName, address: result.shopAddress || "", imageUrl: result.shopImageUrl || "" });
        }
      } else {
        setShopState({ id: result.shopId!, name: result.shopName!, address: result.shopAddress, imageUrl: result.shopImageUrl });
        setEditForm({ name: result.shopName!, address: result.shopAddress || "", imageUrl: result.shopImageUrl || "" });
        setRequests(result.requests!);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: "approved" | "denied") => {
    // Optimistic UI update
    setRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, status: newStatus } : req
    ));
    
    const result = await updateRequestStatus(requestId, newStatus);
    if (result.error) {
      alert(result.error);
      // Revert if failed (requires re-fetching or saving original state, but for simplicity we alert)
    }
  };

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSaveShopDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopState) return;
    
    setSaveLoading(true);
    let finalImageUrl = editForm.imageUrl;

    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);
      // We import uploadShopImage at the top
      const uploadResult = await uploadShopImage(shopState.id, formData);
      if (uploadResult.error) {
        alert(uploadResult.error);
        setSaveLoading(false);
        return;
      }
      if (uploadResult.imageUrl) {
        finalImageUrl = uploadResult.imageUrl;
      }
    }

    const result = await updateShopDetails(shopState.id, {
      shop_name: editForm.name,
      formatted_address: editForm.address,
      shop_image_url: finalImageUrl
    });
    setSaveLoading(false);

    if (result.error) {
      alert(result.error);
    } else {
      setShopState({ ...shopState, name: editForm.name, address: editForm.address, imageUrl: finalImageUrl });
      setIsEditingShop(false);
      setImageFile(null);
      setPreviewUrl(null);
      // Clear error if they were editing because it was their only option in the empty state
      if (error && requests.length === 0) {
        setError(null);
      }
    }
  };

  if (!shopState) {
    // Login State
    return (
      <div className="max-w-md mx-auto bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-slate-200">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Access Shop Portal</h2>
        <p className="text-slate-500 text-center mb-8 text-sm">Enter your registered shop phone number to view incoming requests.</p>
        
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
            {loading ? "Verifying..." : "View Requests"}
            {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
      </div>
    );
  }

  // Dashboard State
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-lg border border-slate-200 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {shopState.imageUrl ? (
             <img src={shopState.imageUrl} alt={shopState.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-200" />
          ) : (
             <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
               <Store className="w-7 h-7" />
             </div>
          )}
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-1">{shopState.name}</h2>
            {shopState.address && (
              <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {shopState.address}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsEditingShop(true)}
            className="flex-1 md:flex-none text-blue-600 hover:text-blue-700 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-5 py-3 rounded-xl transition-colors border border-blue-200"
          >
            Edit Profile
          </button>
          <button 
            onClick={() => { setShopState(null); setPhone(""); setRequests([]); }}
            className="flex-1 md:flex-none text-slate-500 hover:text-slate-900 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-5 py-3 rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {isEditingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900">Edit Shop Listing</h3>
              <button onClick={() => setIsEditingShop(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveShopDetails} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-slate-400" /> Shop Name
                </label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" /> Formatted Address
                </label>
                <input 
                  type="text" 
                  value={editForm.address} 
                  onChange={e => setEditForm({...editForm, address: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="123 Barber St, City, State ZIP"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-slate-400" /> Shop Image
                </label>
                <div className="flex items-center gap-4">
                  {(previewUrl || editForm.imageUrl) && (
                    <img 
                      src={previewUrl || editForm.imageUrl} 
                      alt="Shop Preview" 
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm"
                    />
                  )}
                  <div className="flex-1">
                    <label className="flex items-center justify-center w-full px-4 py-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        <Upload className="w-4 h-4" />
                        <span>{imageFile ? imageFile.name : "Upload a photo..."}</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            setPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-medium">Upload a high-quality photo of your barbershop.</p>
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditingShop(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saveLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {saveLoading ? "Saving..." : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl p-10 md:p-14 rounded-[2.5rem] shadow-sm border border-slate-200 text-center max-w-3xl mx-auto mt-12">
           <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <CalendarClock className="w-10 h-10 text-blue-500" />
           </div>
           <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">No Shop Day Requests Yet</h3>
           <p className="text-slate-600 text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
             This is where you will be able to view Shop Day Requests from licensed professionals looking to rent a chair. Continue checking back to view your requests. We will send you a notification when someone has requested a Shop Day at your location.
           </p>
           <button 
             onClick={() => setIsEditingShop(true)}
             className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-xl shadow-slate-900/20 inline-flex items-center gap-2"
           >
             <Store className="w-5 h-5" />
             Update Your Shop Listing
           </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((request) => {
            const barber = request.agent_barber_leads;
            // Handle possibility of missing barber data due to broken join
            if (!barber) return null;

            const isPending = request.status === "pending";
            const isApproved = request.status === "approved";
            const isDenied = request.status === "denied";

            return (
              <div key={request.id} className="rounded-[2.2rem] border border-slate-200 p-6 bg-white hover:border-blue-400 hover:shadow-2xl transition-all flex flex-col group relative overflow-hidden">
                {/* Status Badge */}
                {isPending && (
                   <span className="absolute top-4 right-4 z-10 px-3.5 py-1.5 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                     Needs Review
                   </span>
                )}
                {isApproved && (
                   <span className="absolute top-4 right-4 z-10 px-3.5 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                     Approved
                   </span>
                )}
                {isDenied && (
                   <span className="absolute top-4 right-4 z-10 px-3.5 py-1.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                     Denied
                   </span>
                )}

                {/* Avatar / Profile Image */}
                <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-6 border border-slate-100 shadow-sm bg-slate-100 flex flex-col items-center justify-center group/image">
                  <img 
                    src="https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=400&q=80" 
                    alt="Mock Barber Profile" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60"></div>
                </div>

                <div className="flex-1 flex flex-col">
                  {/* Barber Name & Location */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                        {barber.profile_url ? (
                          <a href={barber.profile_url} target="_blank" rel="noreferrer" className="hover:underline">
                            {barber.name}
                          </a>
                        ) : (
                          barber.name
                        )}
                      </h3>
                      <span className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {barber.address || "Local"}
                      </span>
                    </div>
                  </div>

                  {/* Barber Specifications */}
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4 mb-4 text-xs font-semibold">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Requested Date</span>
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-blue-500" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Target Pay Model</span>
                      <span className="font-extrabold text-slate-800 flex items-center gap-1 truncate" title={barber.desired_pay_structure}>
                        <Building className="w-3.5 h-3.5 text-indigo-500" />
                        {barber.desired_pay_structure || "Any"}
                      </span>
                    </div>
                  </div>

                  {/* Call to action */}
                  <div className="mt-auto pt-2 flex gap-3">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(request.id, "approved")}
                          className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(request.id, "denied")}
                          className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Deny
                        </button>
                      </>
                    ) : (
                       <button
                         disabled
                         className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-none cursor-default ${
                           isApproved ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                         }`}
                       >
                         {isApproved ? "Request Approved" : "Request Denied"}
                       </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
