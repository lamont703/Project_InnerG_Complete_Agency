"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, Users, ShieldCheck, Zap, Sparkles } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function BarberCosmetologyPlacementPage() {
  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900 selection:bg-blue-500/20 overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Navigation / Header */}
        <Navbar />

        {/* Hero Section */}
        <section className="relative px-6 pt-24 pb-32">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold tracking-wide uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                </span>
                Autonomous Placement Engine Live
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
                Bridging the Gap Between Talent & Opportunity.
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed">
                The industry's first dual-agent AI placement service. We actively synchronize top graduating barbers and cosmetologists with high-intent shops seeking specialized talent.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="http://localhost:3000/texas-barbershop-placement-matcher"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] group"
                >
                  Launch Matcher Engine
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium transition-all shadow-sm">
                  For Barber Schools
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-amber-100 blur-3xl rounded-full" />
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/50 shadow-2xl bg-white p-2">
                <div className="rounded-xl overflow-hidden">
                  <Image 
                    src="/placement_engine_hero.png" 
                    alt="Barber Placement Network Hologram" 
                    width={800} 
                    height={800}
                    className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Dual Value Proposition Section */}
        <section className="px-6 py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">A High-Signal Ecosystem</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Built specifically to solve the structural deficits in cosmetology employment data and barber shop talent acquisition.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* For Schools */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl bg-slate-50/50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-6 border border-amber-200">
                  <GraduationCap className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">For Barber & Cosmetology Schools</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Protect your Title IV funding and NACCAS/ACCSC accreditation. Our autonomous engine continuously pipelines your graduates into active local shops, generating high-fidelity placement telemetry that satisfies federal audit requirements.
                </p>
                <ul className="space-y-3">
                  {[
                    "Verifiable Placement Metrics",
                    "Automated Graduate Outreach",
                    "Regional Market Demand Insights"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <ShieldCheck className="w-5 h-5 text-amber-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* For Shops */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl bg-slate-50/50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 border border-blue-200">
                  <Briefcase className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">For Barbershops & Salons</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Stop relying on walk-ins and word-of-mouth. Our conversational AI routinely queries your open chairs, commission rates, and required specialties, matching you instantly with fresh, licensed talent ready to work.
                </p>
                <ul className="space-y-3">
                  {[
                    "Zero-Friction SMS Syncing",
                    "Verified Licensure Profiles",
                    "Targeted Specialty Matching"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <Zap className="w-5 h-5 text-blue-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-32 relative overflow-hidden bg-slate-900 text-white">
          {/* Subtle dark mode background for the CTA section to make it pop */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
             <div className="absolute top-[-50%] left-[20%] w-[60%] h-[100%] rounded-full bg-blue-500/10 blur-[100px]" />
          </div>
          
          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Ready to Fill Your Empty Chairs?</h2>
            <p className="text-xl text-slate-300">Join the autonomous network revolutionizing barber and cosmetology placement across Texas.</p>
            <Link 
              href="http://localhost:3000/texas-barbershop-placement-matcher"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-white text-slate-900 font-bold text-lg hover:bg-slate-100 transition-all shadow-[0_0_40px_-15px_rgba(255,255,255,0.3)]"
            >
              Access The Matcher Engine
              <ArrowRight className="w-6 h-6 text-slate-900" />
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
