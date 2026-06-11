"use client";

import { Award, MapPin, Globe, GraduationCap } from "lucide-react";

export function PassportCard({ 
  student, 
  onSelect 
}: { 
  student: any;
  onSelect: (student: any) => void;
}) {
  return (
    <div className="rounded-[2.2rem] border border-slate-200 p-6 bg-white hover:border-blue-400 hover:shadow-2xl transition-all flex flex-col group relative overflow-hidden min-w-[320px] max-w-[400px]">
      
      {/* Passport Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
        <div className="flex items-center gap-1.5 text-xs font-black text-indigo-600 uppercase tracking-widest">
          <Award className="w-4.5 h-4.5 text-indigo-500" />
          Passport
        </div>
        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${
          student.status === 'Licensed' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
            : 'bg-blue-50 text-blue-700 border-blue-200/60'
        }`}>
          {student.status}
        </span>
      </div>

      {/* Headshot & Basic Details */}
      <div className="flex gap-4 items-start mb-4">
        <div className="relative w-20 h-24 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 shadow-inner group-hover:border-blue-400 transition-all duration-300">
          <img src={student.image} alt={student.name} className="w-full h-full object-cover object-top" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-lg text-slate-900 truncate leading-snug group-hover:text-blue-600 transition-colors">{student.name}</h3>
          <p className="text-xs font-bold text-slate-400 mt-0.5 truncate uppercase tracking-wider">{student.type} Candidate</p>
          
          <div className="text-slate-500 font-bold text-[11px] mt-2.5 leading-snug">
            <span className="text-slate-400 font-semibold mr-1">Looking For:</span>
            <span className="text-blue-600">{student.pathway}</span>
          </div>
          <div className="text-slate-500 font-bold text-[11px] mt-1 leading-snug flex items-center">
            <MapPin className="w-3 h-3 text-slate-400 mr-1" />
            <span className="text-slate-400 font-semibold mr-1">Location:</span>
            <span className="text-blue-600 truncate">{student.city}</span>
          </div>
        </div>
      </div>

      {/* Placement Pathway Section */}
      <div className="bg-slate-50/60 p-3 rounded-2xl border border-slate-200/60 mb-4 flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Placement Pathway</span>
        <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200/60">
          Licensed Barber Facility
        </span>
      </div>

      {/* Expertise Specialties */}
      <div className="mb-4">
        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1.5">Expertise Focus</span>
        <div className="flex flex-wrap gap-1">
          {student.specialties && student.specialties.map((spec: string, idx: number) => (
            <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200/40">
              {spec}
            </span>
          ))}
        </div>
      </div>

      {/* Social Galleries / Portfolios */}
      <div className="mb-6 pt-3.5 border-t border-slate-100 mt-auto">
        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-2">Visual Gallery / Portfolios</span>
        <div className="grid grid-cols-4 gap-2">
          <div 
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 shadow-sm"
            title="Instagram Portfolio Connected"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            <span className="text-[8px] font-black mt-1 uppercase tracking-wider">Instagram</span>
          </div>
          
          <div 
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 shadow-sm"
            title="TikTok Gallery Connected"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
            </svg>
            <span className="text-[8px] font-black mt-1 uppercase tracking-wider">TikTok</span>
          </div>
          
          <div 
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 shadow-sm"
            title="YouTube Channel Connected"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            <span className="text-[8px] font-black mt-1 uppercase tracking-wider">YouTube</span>
          </div>
          
          <div 
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 shadow-sm"
            title="Personal Website Connected"
          >
            <Globe className="w-4.5 h-4.5" />
            <span className="text-[8px] font-black mt-1 uppercase tracking-wider">Website</span>
          </div>
        </div>
      </div>

      {/* Interactive Call to Action */}
      <button 
        onClick={() => onSelect(student)}
        className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
      >
        <GraduationCap className="w-4 h-4 text-blue-400" />
        Send A Shop Day Invite
      </button>
    </div>
  );
}
