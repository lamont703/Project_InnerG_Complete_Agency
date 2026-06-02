"use client";

import React, { useState } from "react";
import { fetchShopRequests, updateRequestStatus } from "./actions";
import { Phone, Lock, Building, MapPin, CheckCircle2, ChevronRight, XCircle, CalendarClock, User } from "lucide-react";

export default function RequestsClient() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopState, setShopState] = useState<{ id: string; name: string } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

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
        if (result.shopName) setShopState({ id: result.shopId!, name: result.shopName });
      } else {
        setShopState({ id: result.shopId!, name: result.shopName! });
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
      <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-lg border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Welcome, {shopState.name}!</h2>
          <p className="text-slate-500 font-medium">
            {requests.length > 0 
              ? `You have ${requests.length} Shop Day requests from local barbers.`
              : error ? error : "You don't have any Shop Day requests at the moment."}
          </p>
        </div>
        <button 
          onClick={() => { setShopState(null); setPhone(""); setRequests([]); }}
          className="text-slate-500 hover:text-slate-900 font-bold text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors"
        >
          Sign Out
        </button>
      </div>

      {requests.length > 0 && (
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

                {/* Avatar Placeholder */}
                <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-6 border border-slate-100 shadow-sm bg-slate-100 flex flex-col items-center justify-center">
                  <User className="w-16 h-16 text-slate-300" />
                </div>

                <div className="flex-1 flex flex-col">
                  {/* Barber Name & Location */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                        {barber.name}
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
