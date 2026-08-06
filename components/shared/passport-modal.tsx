"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ArrowRight, User, GraduationCap, Clock, Award, Scissors, CheckCircle2, Lock, Camera, MapPin, Search } from 'lucide-react';
import { submitCareerPassport } from '@/app/barber-beauty-network/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { SITE_URL } from "@/lib/site";

export function PassportModal({ 
  isOpen, 
  onClose,
  onSuccess
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSuccess?: (student: any) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const utmParams = {
    utm_source: searchParams?.get('utm_source'),
    utm_medium: searchParams?.get('utm_medium'),
    utm_campaign: searchParams?.get('utm_campaign'),
  };

  const [createStep, setCreateStep] = useState(1);
  const [newPassportName, setNewPassportName] = useState("");
  const [newPassportSchool, setNewPassportSchool] = useState("");
  const [newPassportCity, setNewPassportCity] = useState("");
  const [newPassportAddress, setNewPassportAddress] = useState("");
  const [newPassportPhone, setNewPassportPhone] = useState("");
  const [newPassportEmail, setNewPassportEmail] = useState("");
  const [newPassportDesiredPay, setNewPassportDesiredPay] = useState("Booth Rent");
  const [newPassportType, setNewPassportType] = useState("Barber");
  const [newPassportStatus, setNewPassportStatus] = useState("Student");
  const [newPassportHours, setNewPassportHours] = useState(1500);
  const [newPassportInstagram, setNewPassportInstagram] = useState("");
  const [newPassportTiktok, setNewPassportTiktok] = useState("");
  const [newPassportYoutube, setNewPassportYoutube] = useState("");
  const [newPassportPortfolio, setNewPassportPortfolio] = useState("");
  const [newPassportPathway, setNewPassportPathway] = useState("Barbershop Hire");
  const [newPassportSpecialties, setNewPassportSpecialties] = useState("Modern Fades, Beard Styling");
  const [createLoadingState, setCreateLoadingState] = useState<'idle' | 'generating' | 'done'>('idle');
  const [newPassportImageFile, setNewPassportImageFile] = useState<File | null>(null);

  const resetForm = () => {
    setCreateStep(1);
    setCreateLoadingState('idle');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewPassportImageFile(e.target.files[0]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] max-w-xl w-full p-8 border border-slate-200 shadow-2xl relative flex flex-col my-8"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  handleClose();
                  
                  
                }}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {createLoadingState === 'idle' && (
                <div className="space-y-6">
                  {/* Wizard Header */}
                  <div className="text-center space-y-2 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <Award className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">Complete Your Passport to get Unlimited Shop Day Requests</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mx-auto my-2">
                      This form is only for Professionals and Students looking to rent a chair at a local shop.
                    </p>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-4">Step {createStep} of 4</p>
                    
                    {/* Step progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 max-w-[200px] mx-auto">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${createStep * 25}%` }} />
                    </div>
                  </div>

                  {/* Step 1: Personal Details */}
                  {createStep === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Candidate Full Name</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Marcus Johnson"
                          value={newPassportName}
                          onChange={(e) => setNewPassportName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">Passport Profile Image (Optional)</label>
                        <input 
                          type="file" 
                          accept="image/jpeg, image/png, image/webp"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setNewPassportImageFile(e.target.files[0]);
                            }
                          }}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Phone Number</label>
                          <input 
                            type="tel" 
                            required 
                            placeholder="(555) 555-5555"
                            value={newPassportPhone}
                            onChange={(e) => setNewPassportPhone(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Email Address</label>
                          <input 
                            type="email" 
                            required 
                            placeholder="marcus@example.com"
                            value={newPassportEmail}
                            onChange={(e) => setNewPassportEmail(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Accredited Academy / School Name</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. Texas Barber College"
                          value={newPassportSchool}
                          onChange={(e) => setNewPassportSchool(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Current Barbershop Full Address or Home Full Address</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. 123 Main St, Dallas, TX 75001"
                          value={newPassportAddress}
                          onChange={(e) => setNewPassportAddress(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Specialty Type</label>
                        <select 
                          value={newPassportType}
                          onChange={(e) => setNewPassportType(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="Barber">Barber</option>
                          <option value="Cosmetologist">Cosmetologist</option>
                          <option value="Esthetician">Esthetician</option>
                          <option value="Makeup Artist">Makeup Artist</option>
                          <option value="Nail Technician">Nail Technician</option>
                          <option value="Massage Therapist">Massage Therapist</option>
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Credential Vetting */}
                  {createStep === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Licensure Status</label>
                          <select 
                            value={newPassportStatus}
                            onChange={(e) => setNewPassportStatus(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="Licensed">Licensed</option>
                            <option value="Graduating Soon">Graduating Soon</option>
                            <option value="Student">Student</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Completed Board Hours</label>
                          <input 
                            type="number" 
                            required 
                            min="0"
                            max="1500"
                            placeholder="e.g. 1500"
                            value={newPassportHours}
                            onChange={(e) => setNewPassportHours(Number(e.target.value))}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>


                    </motion.div>
                  )}

                  {/* Step 3: Social Portfolios Sync */}
                  {createStep === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="text-xs font-bold text-slate-500 mb-2">
                        Instead of uploading styling photos, link your existing social media portfolios beautifully for display-only verification:
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Instagram Username</label>
                          <input 
                            type="text" 
                            placeholder="e.g. marcus_fades"
                            value={newPassportInstagram}
                            onChange={(e) => setNewPassportInstagram(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">TikTok Handle</label>
                          <input 
                            type="text" 
                            placeholder="e.g. @marcus_cuts"
                            value={newPassportTiktok}
                            onChange={(e) => setNewPassportTiktok(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">YouTube Handle</label>
                          <input 
                            type="text" 
                            placeholder="e.g. @marcuscuts"
                            value={newPassportYoutube}
                            onChange={(e) => setNewPassportYoutube(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Personal Website</label>
                          <input 
                            type="text" 
                            placeholder="e.g. marcuscuts.com"
                            value={newPassportPortfolio}
                            onChange={(e) => setNewPassportPortfolio(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Specialties & Pathway */}
                  {createStep === 4 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Placement Pathway</label>
                        <select 
                          value={newPassportPathway}
                          onChange={(e) => setNewPassportPathway(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="Barbershop Hire">Barbershop Hire — Chair/Booth Placements</option>
                          <option value="Cosmetology Hire">Cosmetology Hire — Salon Placements</option>
                          <option value="School Instructor">School Instructor — Academy Staff Placements</option>
                          <option value="Dual-Pathway Eligible">Dual-Pathway Eligible — Highly Versatile Candidate</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Desired Pay Structure</label>
                        <select 
                          value={newPassportDesiredPay}
                          onChange={(e) => setNewPassportDesiredPay(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="Booth Rent">Booth Rent</option>
                          <option value="Commission">Commission</option>
                          <option value="Hourly">Hourly</option>
                          <option value="Salary">Salary</option>
                        </select>
                      </div>


                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Desired Specialties (Comma Separated)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Modern Fades, Beard Styling, Hair Coloring"
                          value={newPassportSpecialties}
                          onChange={(e) => setNewPassportSpecialties(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Wizard Footer Controls */}
                  <div className="flex gap-4 pt-4 border-t border-slate-100">
                    {createStep > 1 && (
                      <button 
                        onClick={() => setCreateStep(s => s - 1)}
                        className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-colors hover:bg-slate-50 cursor-pointer"
                      >
                        Back
                      </button>
                    )}
                    
                    <button 
                      onClick={async () => {
                        if (createStep < 4) {
                          if (createStep === 1) {
                            if (!newPassportName || !newPassportPhone || !newPassportEmail || !newPassportSchool || !newPassportAddress) {
                              alert("Please fill out all mandatory fields: Candidate Full Name, Phone Number, Email Address, School Name, and Address before continuing.");
                              return;
                            }
                            
                            // Basic Regex to ensure: Starts with a number, has some text, and ends with a 5-digit zip code
                            const addressRegex = /^\d+\s+.*\d{5}$/;
                            if (!addressRegex.test(newPassportAddress.trim())) {
                              alert("Please enter a complete address including Street Number, Street Name, City, State, and a 5-digit Zip Code (e.g., '123 Main St, Dallas, TX 75001').");
                              return;
                            }
                          }
                          setCreateStep(s => s + 1);
                        } else {
                          
                          setCreateLoadingState('generating');
                          
                          try {
                            let finalImageUrl = "";
                            if (newPassportImageFile) {
                              const formData = new FormData();
                              formData.append("file", newPassportImageFile);
                              
                              const uploadRes = await fetch("/api/upload-passport-image", {
                                method: "POST",
                                body: formData
                              });
                              const uploadData = await uploadRes.json();
                              if (uploadData.imageUrl) {
                                finalImageUrl = uploadData.imageUrl;
                              }
                            }

                            const result = await submitCareerPassport({
                              name: newPassportName,
                              phone: newPassportPhone,
                              email: newPassportEmail,
                              school_name: newPassportSchool,
                              address: newPassportAddress,
                              specialty_type: newPassportType,
                              licensure_status: newPassportStatus,
                              completed_school_hours: newPassportHours,
                              instagram_handle: newPassportInstagram,
                              tiktok_handle: newPassportTiktok,
                              youtube_channel: newPassportYoutube,
                              website_url: newPassportPortfolio,
                              placement_pathway: newPassportPathway,
                              desired_pay_structure: newPassportDesiredPay,
                              desired_specialties: newPassportSpecialties,
                              passport_image_url: finalImageUrl || undefined,
                              utm_source: utmParams.utm_source || undefined,
                              utm_medium: utmParams.utm_medium || undefined,
                              utm_campaign: utmParams.utm_campaign || undefined
                            });

                            if (result.success) {
                              if (typeof window !== 'undefined' && (window as any).fbq) {
                                (window as any).fbq('track', 'Lead');
                              }
                              const newStudent = {
                                id: result.data.id || `student-custom-${Date.now()}`,
                                name: newPassportName,
                                school: newPassportSchool || "Independent Barber Academy",
                                city: newPassportCity || "Texas Hub",
                                type: newPassportType,
                                status: newPassportStatus,
                                image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop",
                                instagram: newPassportInstagram ? `https://instagram.com/${newPassportInstagram}` : "https://instagram.com",
                                tiktok: newPassportTiktok ? `https://tiktok.com/@${newPassportTiktok.replace('@', '')}` : "https://tiktok.com",
                                youtube: newPassportYoutube ? `https://youtube.com/@${newPassportYoutube.replace('@', '')}` : "https://youtube.com",
                                portfolio: newPassportPortfolio ? `https://${newPassportPortfolio}` : "${SITE_URL}",
                                pathway: newPassportPathway,
                                specialties: newPassportSpecialties.split(',').map(s => s.trim()).filter(Boolean)
                              };

                              if (onSuccess) onSuccess(newStudent);
                              setCreateLoadingState('done');
                              
                              setTimeout(() => {
                                router.push('/shop-day-matches');
                              }, 2000);
                            } else {
                              alert(`Failed to mint passport: ${result.error}`);
                              
                            }
                          } catch (err) {
                            console.error(err);
                            
                          }
                        }
                      }}
                      className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                    >
                      {createStep === 4 ? "Mint Career Passport" : "Continue"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Minting Passport loading screens */}
              {createLoadingState === 'generating' && (
                <div className="py-16 text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-amber-100 border-t-amber-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-amber-50 border-t-amber-300 animate-spin animate-reverse" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-amber-500 uppercase tracking-widest animate-pulse">
                      Minting Career Passport...
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Assembling Security Watermarks...
                    </p>
                  </div>
                </div>
              )}

              {/* Minting Success Screen */}
              {createLoadingState === 'done' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-6"
                >
                  <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 border border-green-200 flex items-center justify-center mx-auto mb-2 animate-bounce">
                    <Check className="w-9 h-9" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900">Career Passport Minted!</h3>
                    <p className="text-slate-500 font-semibold text-xs leading-relaxed max-w-sm mx-auto">
                      Congratulations, {newPassportName}! Your verified Career Passport has been successfully generated and added to the official placement network.
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      router.push('/shop-day-matches');
                    }}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10"
                  >
                    View Shop Day Matches
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
    </AnimatePresence>
  );
}
