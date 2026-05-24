"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { 
  Users, Briefcase, GraduationCap, ArrowRight, 
  Search, MapPin, Star, Scissors, CheckCircle2, ShieldCheck
} from "lucide-react";
import Image from "next/image";

export default function BarberBeautyNetworkPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'shops'>('students');
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900 selection:bg-blue-500/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden pointer-events-none">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          >
            <source src="/network-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white" />
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none z-0" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-widest uppercase"
          >
            <ShieldCheck className="w-4 h-4" />
            The Ultimate Placement Network
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
          >
            Connect Talent With <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Opportunity.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-xl text-slate-600 font-medium leading-relaxed"
          >
            The premium networking platform exclusively for the Barber and Beauty industry. Build your portfolio, discover top-tier talent, and schedule direct Shop Day visits.
          </motion.p>
        </div>
      </section>

      {/* Dual Value Proposition */}
      <section className="py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Student Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col group overflow-hidden"
            >
              <div className="relative w-full h-64 lg:h-80 mb-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                 <Image 
                   src="/student_portfolio_ui.png" 
                   alt="Student Portfolio UI Mockup" 
                   fill 
                   className="object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
                  <Scissors className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4">For Students & Graduates</h2>
                <p className="text-slate-600 text-lg leading-relaxed mb-8">
                  Stop relying on generic resumes. Create a rich, visual portfolio that showcases your cuts, styles, and licensure status. Let top barbershops and salons discover you before you even graduate.
                </p>
                <ul className="space-y-4 mb-10 mt-auto">
                  {[
                    "Digital Portfolio & Image Gallery",
                    "State Licensure Verification",
                    "Direct Messages from Shop Owners",
                    "Shop Day Visit Requests"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2">
                  Create Your Portfolio
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            {/* Shop Owner Card */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-900 rounded-[2.5rem] p-8 lg:p-10 border border-slate-800 shadow-2xl flex flex-col group overflow-hidden"
            >
              <div className="relative w-full h-64 lg:h-80 mb-8 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
                 <Image 
                   src="/shop_listing_ui.png" 
                   alt="Shop Listing UI Mockup" 
                   fill 
                   className="object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              </div>

              <div className="relative z-10 flex-1 flex flex-col">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20 shadow-sm">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-4">For Shop Owners</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  Stop hoping for walk-in talent. Create a premium listing for your barbershop or salon. Showcase your culture, chair rental rates, and invite vetted students for a Shop Day visit.
                </p>
                <ul className="space-y-4 mb-10 mt-auto">
                  {[
                    "Premium Shop Profile & Photos",
                    "Booth Rent/Commission Transparency",
                    "Browse Verified Student Portfolios",
                    "Host Automated Shop Day Events"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300 font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2">
                  List Your Shop
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Interactive Network Browser */}
      <section className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Explore The Network</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">See how easy it is to find your perfect match.</p>
          </div>

          {/* Custom Tabs */}
          <div className="flex justify-center mb-12">
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button
                onClick={() => setActiveTab('students')}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Browse Students
              </button>
              <button
                onClick={() => setActiveTab('shops')}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'shops' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Browse Shops
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'students' ? (
              <motion.div
                key="students"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid md:grid-cols-3 gap-6"
              >
                {[
                  { name: "Marcus Johnson", school: "Texas Barber College", type: "Barber", status: "Licensed", image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=800&auto=format&fit=crop" },
                  { name: "Sarah Williams", school: "Ogle School", type: "Cosmetologist", status: "Graduating Soon", image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=800&auto=format&fit=crop" },
                  { name: "David Chen", school: "Franklin Institute", type: "Barber", status: "Licensed", image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop" },
                ].map((student, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-6 bg-white hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group">
                    <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6 border border-slate-100">
                      <Image src={student.image} alt={student.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-slate-900">{student.name}</h3>
                      <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">{student.status}</span>
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-4">{student.type} • {student.school}</p>
                    <button className="w-full py-3 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors">View Portfolio</button>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="shops"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid md:grid-cols-3 gap-6"
              >
                {[
                  { name: "Elite Fades Barbershop", location: "Dallas, TX", type: "Booth Rent", price: "$200/wk", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop" },
                  { name: "Luxe Beauty Studio", location: "Houston, TX", type: "Commission", price: "60/40 Split", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=800&auto=format&fit=crop" },
                  { name: "The Razor's Edge", location: "Austin, TX", type: "Booth Rent", price: "$250/wk", image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=800&auto=format&fit=crop" },
                ].map((shop, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 p-6 bg-white hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group">
                    <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6 border border-slate-100">
                      <Image src={shop.image} alt={shop.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-slate-900">{shop.name}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold">5.0</span>
                      </div>
                    </div>
                    <p className="text-slate-500 font-medium text-sm mb-4">{shop.location} • {shop.type} ({shop.price})</p>
                    <button className="w-full py-3 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors">View Shop Listing</button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 text-center px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Ready to Join the Network?</h2>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">Whether you are looking for the perfect chair or the perfect barber, everything starts here.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-colors">
            I am a Student
          </button>
          <button className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-lg transition-colors">
            I am a Shop Owner
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
