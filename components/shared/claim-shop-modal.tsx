"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Check, CheckCircle2 } from 'lucide-react';
import { submitNewBarbershopLead } from '@/app/barber-beauty-network/actions';
import { useRouter, useSearchParams } from 'next/navigation';

export function ClaimShopModal({ 
  shop, 
  isOpen, 
  onClose,
  onSuccess
}: { 
  shop?: any;
  isOpen: boolean; 
  onClose: () => void;
  onSuccess?: (shop: any) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const utmParams = {
    utm_source: searchParams?.get('utm_source'),
    utm_medium: searchParams?.get('utm_medium'),
    utm_campaign: searchParams?.get('utm_campaign'),
  };

  const [newShopSuccess, setNewShopSuccess] = useState(false);
  const [isSubmittingNewShop, setIsSubmittingNewShop] = useState(false);
  const [claimImageFile, setClaimImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [newShopForm, setNewShopForm] = useState<any>({
    id: shop?.id || null,
    shop_name: shop?.shop_name || "",
    owner_name: shop?.owner_name || "",
    street_address: shop?.formatted_address ? shop.formatted_address.split(',')[0] : "",
    city: shop?.city || "",
    state: shop?.state || "Texas",
    zip_code: shop?.zip_code || "",
    phone: shop?.phone || "",
    email: shop?.email || "",
    hiring_need: "Yes",
    specialty_desired: shop?.specialty_desired || "Barber",
    booth_count_available: shop?.booth_count_available?.toString() || "1",
    rent_type: shop?.rent_type || "Booth Rent"
  });

  const handleClose = () => {
    setNewShopSuccess(false);
    onClose();
  };

  async function handleNewShopSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingNewShop(true);
    try {
      let finalImageUrl = "";
      if (claimImageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append("file", claimImageFile);
        
        const uploadRes = await fetch("/api/upload-shop-image", {
          method: "POST",
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.imageUrl) {
          finalImageUrl = uploadData.imageUrl;
        }
        setIsUploadingImage(false);
      }

      const submissionData = { ...newShopForm } as any;
      submissionData.formatted_address = `${newShopForm.street_address}, ${newShopForm.city}, ${newShopForm.state} ${newShopForm.zip_code}`;
      delete submissionData.street_address;
      delete submissionData.state;
      delete submissionData.zip_code;
      
      if (finalImageUrl) {
        submissionData.shop_image_url = finalImageUrl;
      }

      submissionData.utm_source = utmParams.utm_source || undefined;
      submissionData.utm_medium = utmParams.utm_medium || undefined;
      submissionData.utm_campaign = utmParams.utm_campaign || undefined;

      const result = await submitNewBarbershopLead(submissionData);
      if (!result.success) throw new Error(result.error);
      
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }
      
      setNewShopSuccess(true);
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead');
      }
      setTimeout(() => {
        handleClose();
        setNewShopForm({
          id: null,
          shop_name: "",
          owner_name: "",
          street_address: "",
          city: "",
          state: "",
          zip_code: "",
          phone: "",
          email: "",
          hiring_need: "Yes",
          specialty_desired: "Barber",
          booth_count_available: "1",
          rent_type: "Booth Rent"
        });
        setClaimImageFile(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to submit shop. Please try again.");
    } finally {
      setIsSubmittingNewShop(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-slate-200 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto"
            >
              <button 
                  onClick={() => {
                    handleClose();
                  }}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {!newShopSuccess ? (
                <form onSubmit={handleNewShopSubmit} className="space-y-6">
                  <div className="text-center space-y-2 mb-2">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900">List Your Shop</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mx-auto">
                      Join our network to connect with top-tier barber and cosmetology professionals and students looking for their next chair!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shop Name</label>
                      <input type="text" required value={newShopForm.shop_name} onChange={(e) => setNewShopForm({...newShopForm, shop_name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Owner Name</label>
                      <input type="text" required value={newShopForm.owner_name} onChange={(e) => setNewShopForm({...newShopForm, owner_name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phone</label>
                      <input type="tel" required value={newShopForm.phone} onChange={(e) => setNewShopForm({...newShopForm, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email</label>
                      <input type="email" required value={newShopForm.email} onChange={(e) => setNewShopForm({...newShopForm, email: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shop Image (Optional)</label>
                      <input type="file" accept="image/jpeg, image/png, image/webp" onChange={(e) => setClaimImageFile(e.target.files?.[0] || null)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5 md:col-span-3">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Street Address</label>
                        <input type="text" required placeholder="123 Placement Dr." value={newShopForm.street_address} onChange={(e) => setNewShopForm({...newShopForm, street_address: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City</label>
                        <input type="text" required placeholder="Houston" value={newShopForm.city} onChange={(e) => setNewShopForm({...newShopForm, city: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">State</label>
                        <input type="text" required placeholder="Texas" value={newShopForm.state} onChange={(e) => setNewShopForm({...newShopForm, state: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Zip Code</label>
                        <input type="text" required placeholder="78372" value={newShopForm.zip_code} onChange={(e) => setNewShopForm({...newShopForm, zip_code: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Compensation Type</label>
                      <select value={newShopForm.rent_type} onChange={(e) => setNewShopForm({...newShopForm, rent_type: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium">
                        <option>Booth Rent</option>
                        <option>Commission</option>
                        <option>Booth Rent/Commission</option>
                        <option>Salary</option>
                        <option>Salary + Commission</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rent / Comm Rate</label>
                      <input type="text" required placeholder="e.g. $250/wk or 60/40" value={newShopForm.rent_rate} onChange={(e) => setNewShopForm({...newShopForm, rent_rate: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chairs Available To Rent</label>
                      <input type="number" required min="0" value={newShopForm.booth_count_available} onChange={(e) => setNewShopForm({...newShopForm, booth_count_available: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Website</label>
                      <input type="text" placeholder="https://" value={newShopForm.website} onChange={(e) => setNewShopForm({...newShopForm, website: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmittingNewShop}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold text-lg transition-colors mt-6 shadow-lg shadow-blue-500/20"
                  >
                    {isSubmittingNewShop ? "Submitting..." : "Submit Shop Information"}
                  </button>
                </form>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Information Submitted!</h3>
                  <p className="text-slate-500 text-sm font-medium max-w-sm mx-auto">
                    Thanks for submitting your shop information. You will now be part of our network and students can connect with you.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
    </AnimatePresence>
  );
}
