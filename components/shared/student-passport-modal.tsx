"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Award, Check, Scissors, Calendar, Clock, Phone, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { submitShopDayInvite } from "@/app/barber-beauty-network/actions";

export function StudentPassportModal({
  selectedPassportStudent,
  onClose,
}: {
  selectedPassportStudent: any;
  onClose: () => void;
}) {
  const [passportActiveTab, setPassportActiveTab] = useState<'credentials' | 'portfolio' | 'schedule'>('schedule');
  const [scheduleShopName, setScheduleShopName] = useState("");
  const [schedulePhone, setSchedulePhone] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  // Reset state when a new student is selected
  
  useEffect(() => {
    if (selectedPassportStudent) {
      setPassportActiveTab('schedule');
      setScheduleSuccess(false);
      setScheduleShopName("");
      setSchedulePhone("");
      setScheduleDate("");
      setScheduleTime("");
      setScheduleNotes("");
    }
  }, [selectedPassportStudent]);

  if (!selectedPassportStudent) return null;

  return (
    <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/75 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              className="bg-white rounded-3xl md:rounded-[2.5rem] max-w-4xl w-full border border-slate-200 shadow-2xl relative flex flex-col md:flex-row my-auto max-h-[95vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden"
            >
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Passport Side Panel (Navy/Indigo Leather cover style) */}
              <div className="md:w-[40%] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
                
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center gap-2 text-amber-400 uppercase tracking-widest text-[10px] font-black">
                    <Award className="w-5 h-5 text-amber-400" />
                    Verified Credentials
                  </div>

                  <div className="flex flex-col items-center text-center space-y-4 pt-4">
                    {/* Headshot with Golden Border */}
                    <div className="relative w-32 h-40 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-xl bg-slate-800">
                      <Image
                        src={selectedPassportStudent.image}
                        alt={selectedPassportStudent.name}
                        fill
                        className="object-cover object-top"
                        unoptimized
                      />
                      {/* Gold Wax Seal Stamp */}
                      <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 border border-amber-300 flex items-center justify-center shadow-lg animate-pulse" title="Board Verified Eligible">
                        <Check className="w-4 h-4 text-slate-900 font-bold" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl font-black tracking-tight text-white">{selectedPassportStudent.name}</h3>
                      <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-500/20">
                        {selectedPassportStudent.type} candidate
                      </span>
                    </div>
                  </div>
                </div>

                {/* Passport Biometrics Table */}
                <div className="mt-8 pt-6 border-t border-white/10 space-y-3.5 text-xs text-slate-300 relative z-10">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Passport No.</span>
                    <span className="font-mono font-bold text-amber-400">
                      {selectedPassportStudent.passport_number ? `TX-PS-${selectedPassportStudent.passport_number.toUpperCase()}` : "TX-PS-PENDING"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Authority</span>
                    <span className="font-bold">{selectedPassportStudent.state_board_authority || "Texas Licensing Board"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">School of Origin</span>
                    <span className="font-bold max-w-[150px] truncate text-right">
                      {selectedPassportStudent.school_name || ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Metro Area</span>
                    <span className="font-bold text-blue-400">{selectedPassportStudent.metro_area || selectedPassportStudent.city}</span>
                  </div>
                </div>
              </div>

              {/* Passport Details Panel (White paper pages style) */}
              <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-slate-50/50 md:overflow-y-auto">
                <div>
                  {/* Modal Navigation Tabs */}
                  <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl mb-6 gap-1 border border-slate-200 shadow-inner">
                    {[
                      { id: 'credentials', label: 'Vetted Credentials', icon: Award },
                      { id: 'portfolio', label: 'Visual Gallery', icon: Scissors },
                      { id: 'schedule', label: 'Schedule Shop Day', icon: Calendar }
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = passportActiveTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setPassportActiveTab(tab.id as any)}
                          className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 text-[10px] md:text-xs font-black uppercase tracking-wider transition-all rounded-xl cursor-pointer ${
                            isActive 
                              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60' 
                              : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Contents */}
                  <div className="min-h-[280px]">
                    
                    {/* Tab 1: Vetted Credentials */}
                    {passportActiveTab === 'credentials' && (
                      <div className="space-y-6 animate-fadeIn">
                        
                        {/* Progress hours bar */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-500">Board Required Hours Completed</span>
                            <span className="text-indigo-600 font-extrabold text-sm">{selectedPassportStudent.completed_school_hours ? Number(selectedPassportStudent.completed_school_hours).toLocaleString() : "1,500"} Hours</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full w-full" />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-extrabold uppercase mt-1">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Accredited Program Hours Fully Completed & Signed Off
                          </div>
                        </div>

                        {/* Vetted Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { title: "Texas Board Written Exam", desc: "Successfully Passed with Honors", status: "PASSED" },
                            { title: "Texas Board Practical Exam", desc: "Board Exam Date Vetted & Scheduled", status: "SCHEDULED" }
                          ].map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-start gap-3">
                              <div className="p-1 rounded-full bg-green-50 text-green-600 border border-green-200 shrink-0">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">{item.title}</h4>
                                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{item.desc}</p>
                                <span className="inline-block mt-2 px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 text-[8px] font-black rounded uppercase tracking-wider">
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Visual Portfolio Mock Gallery */}
                    {passportActiveTab === 'portfolio' && (
                      <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-center space-y-4 animate-fadeIn bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 mb-2">
                          <Scissors className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-slate-800">No Visuals Uploaded Yet</h4>
                        <p className="text-xs text-slate-500 font-semibold max-w-[280px] leading-relaxed">
                          {selectedPassportStudent.name} hasn't uploaded their visual gallery to their passport yet. 
                          <br/><br/>
                          You can still invite them to a <span className="text-indigo-600 font-black cursor-pointer hover:underline" onClick={() => setPassportActiveTab('schedule')}>Shop Day</span> to see their skills in person!
                        </p>
                      </div>
                    )}

                    {/* Tab 3: Interactive Scheduling Form */}
                    {passportActiveTab === 'schedule' && (
                      <div className="animate-fadeIn">
                        {!scheduleSuccess ? (
                          <form 
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!scheduleShopName || !schedulePhone) return;
                              setIsScheduling(true);
                              
                              try {
                                // Combine date and time into ISO string if both are provided, otherwise null
                                const combinedDateTime = (scheduleDate && scheduleTime) ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : null;
                                
                                const result = await submitShopDayInvite({
                                  shop_name: scheduleShopName,
                                  shop_phone: schedulePhone,
                                  professional_id: selectedPassportStudent.id,
                                  invite_date: combinedDateTime,
                                  notes: scheduleNotes
                                });
                                
                                if (result.success) {
                                  setScheduleSuccess(true);
                                  if (typeof window !== 'undefined' && (window as any).fbq) {
                                    (window as any).fbq('track', 'Schedule');
                                  }
                                } else {
                                  alert(`Failed to send invite: ${result.error}`);
                                }
                              } catch (err) {
                                console.error(err);
                                alert("An error occurred while sending the invite.");
                              } finally {
                                setIsScheduling(false);
                              }
                            }}
                            className="space-y-4"
                          >
                            <div className="text-xs font-bold text-slate-500 mb-1">
                              Invite {selectedPassportStudent.name} for a dedicated Shop Day Visit at your location!
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5 col-span-2 md:col-span-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Your Barbershop Name <span className="text-red-500">*</span></label>
                                <input 
                                  type="text" 
                                  required 
                                  placeholder="e.g. Dallas Fades Barbershop"
                                  value={scheduleShopName}
                                  onChange={(e) => setScheduleShopName(e.target.value)}
                                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              <div className="space-y-1.5 col-span-2 md:col-span-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Your Contact Phone <span className="text-red-500">*</span></label>
                                <div className="relative">
                                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  <input 
                                    type="tel" 
                                    required 
                                    placeholder="(555) 555-5555"
                                    value={schedulePhone}
                                    onChange={(e) => setSchedulePhone(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              {/* 
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Proposed Visit Date</label>
                                <div className="relative">
                                  <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  <input 
                                    type="date" 
                                    required
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5 col-span-2 md:col-span-1">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Proposed Start Time</label>
                                <div className="relative">
                                  <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  <input 
                                    type="time" 
                                    required
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                                  />
                                </div>
                              </div>
                              */}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Outreach Notes / Special Requirements</label>
                              <textarea 
                                placeholder="Describe what type of chair structures you have available, potential tools you want them to bring, and any specific styling tasks they can run..."
                                value={scheduleNotes}
                                onChange={(e) => setScheduleNotes(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none focus:border-indigo-500 h-20 resize-none"
                              />
                            </div>

                            <button 
                              type="submit"
                              disabled={isScheduling}
                              className={`w-full py-3 rounded-xl text-white font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 shadow-md ${isScheduling ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-indigo-600/10'}`}
                            >
                              <Calendar className={`w-4 h-4 ${isScheduling ? 'animate-pulse' : ''}`} />
                              {isScheduling ? "Sending Invite..." : "Schedule Shop Day Invitation"}
                            </button>
                          </form>
                        ) : (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-10 text-center space-y-4"
                          >
                            <div className="w-14 h-14 rounded-full bg-green-50 text-green-500 border border-green-200 flex items-center justify-center mx-auto mb-2 animate-bounce">
                              <Check className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Invitation Dispatched!</h3>
                            <p className="text-slate-500 font-semibold text-xs leading-relaxed max-w-sm mx-auto">
                              Your Shop Day request has been successfully compiled and sent to {selectedPassportStudent.name}!
                            </p>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Bottom Branding Footer */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">
                  <span>Inner G Complete Placement</span>
                  <span>Authentic Board Seal</span>
                </div>
              </div>
            </motion.div>
          </div>
    </AnimatePresence>
  );
}
