"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, Users, ShieldCheck, Zap, Sparkles, MapPin, CalendarCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { submitHostShopRequest } from "./actions";

export default function BarberCosmetologyPlacementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', shopName: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<'student' | 'school'>('student');
  const [scheduleStudentData, setScheduleStudentData] = useState({ name: '', phone: '', school: '' });
  const [scheduleSchoolData, setScheduleSchoolData] = useState({ school: '', contactPerson: '', email: '' });
  const [isScheduleSubmitting, setIsScheduleSubmitting] = useState(false);
  const [isScheduleSuccess, setIsScheduleSuccess] = useState(false);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsScheduleSubmitting(true);
    // Simulate processing
    setTimeout(() => {
      setIsScheduleSubmitting(false);
      setIsScheduleSuccess(true);
      setTimeout(() => {
        setIsScheduleModalOpen(false);
        setIsScheduleSuccess(false);
        setScheduleStudentData({ name: '', phone: '', school: '' });
        setScheduleSchoolData({ school: '', contactPerson: '', email: '' });
      }, 5000);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const result = await submitHostShopRequest({
        name: formData.name,
        shopName: formData.shopName,
        phone: formData.phone
      });

      if (!result.success) throw new Error(result.error);

      setIsSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSuccess(false);
        setFormData({ name: '', shopName: '', phone: '' });
      }, 5000);
    } catch (err) {
      console.error("Failed to submit host shop request:", err);
      alert("Something went wrong while submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900 selection:bg-blue-500/20 overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-24 pb-20 md:pb-32 overflow-hidden">
          {/* Full Screen Video Background */}
          <div className="absolute inset-0 z-0 bg-slate-900">
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            >
              <source src="/barbershop-bg.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            {/* Dynamic Overlay for Depth and Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-slate-50" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-wide uppercase shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Autonomous Field Trip Orchestration
              </div>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] text-white drop-shadow-2xl">
                Bridging the Gap with <span className="text-blue-400">Shop Day</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-white/90 max-w-3xl leading-relaxed drop-shadow-md mx-auto">
                Experience the real-world culture of leading shops before graduation. Our AI agents actively facilitate immersive <strong>Shop Day field trips</strong>, coordinating seamless, scheduled visits to top local barbershops and beauty salons.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8 w-full sm:w-auto">
                <button 
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-[0_4px_20px_rgba(37,99,235,0.5)] group text-lg"
                >
                  Schedule a Shop Day
                  <CalendarCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-medium transition-all shadow-lg group text-lg"
                >
                  Become a Host Shop
                  <MapPin className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How Shop Day Works */}
        <section className="px-6 py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">Why Shop Day Changes Everything</h2>
              <p className="text-slate-600 max-w-2xl mx-auto text-lg">It isn't just about algorithms—it's about real-world connection. Here is how our AI-facilitated field trips accelerate student placement.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Users, title: "Immersive Exposure", desc: "Students step off campus and into the authentic culture and pace of leading local shops, gaining vital industry perspective before graduation." },
                { icon: Zap, title: "AI-Coordinated Logistics", desc: "Our autonomous agents handle the heavy lifting: matching shop availability, organizing schedules, and mapping the most efficient routing." },
                { icon: Briefcase, title: "Accelerated Placement", desc: "Direct face-to-face networking between shop owners and students dramatically increases post-grad hiring rates and builds lasting relationships." }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -5 }}
                  className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-6 border border-blue-200 shadow-sm">
                    <item.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{item.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Dual Value Proposition Section (Framed around Shop Day) */}
        <section className="relative px-6 py-32 border-y border-slate-200 overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0 bg-slate-900">
            <Image 
              src="/salon_background.png"
              alt="Luxurious Beauty Salon Background"
              fill
              className="object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/40 to-slate-900/70 backdrop-blur-[2px]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">A High-Signal Ecosystem</h2>
              <p className="text-slate-300 max-w-2xl mx-auto text-lg">Shop Day connects the two most vital pillars of the industry together.</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* For Schools */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-6 border border-amber-200">
                  <GraduationCap className="w-7 h-7 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">For Barber & Cosmetology Schools</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Enhance your curriculum by giving students a first-hand look at top local salons. Shop Day generates high-fidelity placement telemetry, improving graduation-to-hire rates and protecting your NACCAS/ACCSC accreditation.
                </p>
                <ul className="space-y-3">
                  {[
                    "Verifiable Placement Metrics",
                    "Automated Field Trip Outreach",
                    "Enhanced Student Experience"
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
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 border border-blue-200">
                  <MapPin className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-slate-900">For Barbershops & Salons</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Stop relying entirely on digital profiles. Host a Shop Day to meet fresh, upcoming talent face-to-face in your own environment. Our AI handles the logistics so you can focus on recruiting the perfect fit for your chairs.
                </p>
                <ul className="space-y-3">
                  {[
                    "Zero-Friction AI Scheduling",
                    "Meet Pre-Vetted Future Graduates",
                    "Showcase Your Shop's Culture"
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
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
             <div className="absolute top-[-50%] left-[20%] w-[60%] h-[100%] rounded-full bg-blue-500/10 blur-[100px]" />
          </div>
          
          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Ready for Shop Day?</h2>
            <p className="text-xl text-slate-300">Join the autonomous network revolutionizing barber and cosmetology placement through real-world connection.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-white text-slate-900 font-bold text-lg hover:bg-slate-100 transition-all shadow-[0_0_40px_-15px_rgba(255,255,255,0.3)]"
              >
                Host a Shop Day
                <ArrowRight className="w-6 h-6 text-slate-900" />
              </button>
              <button 
                onClick={() => {
                  setScheduleType('school');
                  setIsScheduleModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-lg transition-all"
              >
                For Schools
              </button>
            </div>
          </div>
        </section>

        <Footer />
      </div>

      {/* Host Shop Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && !isSuccess && setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 overflow-hidden"
            >
              {/* Decorative background element */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-500 to-blue-700 opacity-5 pointer-events-none" />
              
              {isSuccess ? (
                <div className="text-center py-8 relative z-10">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <ShieldCheck className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Request Received!</h3>
                  <p className="text-slate-600 text-lg leading-relaxed mb-6">
                    Thank you for your interest in hosting a Shop Day. Our SMS AI Agent will be texting you shortly at <strong className="text-slate-900">{formData.phone}</strong> for further details and scheduling.
                  </p>
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      setTimeout(() => {
                        setIsSuccess(false);
                        setFormData({ name: '', shopName: '', phone: '' });
                      }, 500);
                    }}
                    className="w-full px-6 py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="relative z-10">
                  <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mb-5">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Become a Host Shop</h3>
                    <p className="text-slate-600 leading-relaxed">Enter your details below and our autonomous AI agent will text you instantly to coordinate your Shop Day visit.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">Your Name</label>
                      <input 
                        type="text" 
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div>
                      <label htmlFor="shopName" className="block text-sm font-bold text-slate-700 mb-2">Shop Name</label>
                      <input 
                        type="text" 
                        id="shopName"
                        required
                        value={formData.shopName}
                        onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900"
                        placeholder="e.g. Elite Barbershop"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-2">Cell Phone Number</label>
                      <input 
                        type="tel" 
                        id="phone"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    
                    <div className="pt-6 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-6 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Submit Request"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule a Shop Day Modal */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-100"
            >
              {isScheduleSuccess ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <ShieldCheck className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-4">Request Received!</h3>
                  <p className="text-slate-600 text-lg leading-relaxed mb-8">
                    Thank you for your interest in Shop Day. Our team will review your details and reach out shortly to coordinate your visit.
                  </p>
                  <button 
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="p-8 md:p-10">
                  <div className="mb-8">
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Schedule A Shop Day</h3>
                    <p className="text-slate-600">Please let us know if you are requesting as a student or representing a school.</p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
                    <button
                      type="button"
                      onClick={() => setScheduleType('student')}
                      className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                        scheduleType === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType('school')}
                      className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                        scheduleType === 'school' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      School
                    </button>
                  </div>

                  <form onSubmit={handleScheduleSubmit} className="space-y-5">
                    {scheduleType === 'student' ? (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Your Name</label>
                          <input 
                            required
                            type="text"
                            value={scheduleStudentData.name}
                            onChange={e => setScheduleStudentData({...scheduleStudentData, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Cell Phone Number</label>
                          <input 
                            required
                            type="tel"
                            value={scheduleStudentData.phone}
                            onChange={e => setScheduleStudentData({...scheduleStudentData, phone: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">School</label>
                          <input 
                            required
                            type="text"
                            value={scheduleStudentData.school}
                            onChange={e => setScheduleStudentData({...scheduleStudentData, school: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="Cosmetology Institute of Texas"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">School Name</label>
                          <input 
                            required
                            type="text"
                            value={scheduleSchoolData.school}
                            onChange={e => setScheduleSchoolData({...scheduleSchoolData, school: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="Texas Barber College"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Contact Person</label>
                          <input 
                            required
                            type="text"
                            value={scheduleSchoolData.contactPerson}
                            onChange={e => setScheduleSchoolData({...scheduleSchoolData, contactPerson: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="Jane Smith"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                          <input 
                            required
                            type="email"
                            value={scheduleSchoolData.email}
                            onChange={e => setScheduleSchoolData({...scheduleSchoolData, email: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="jane@texasbarbercollege.edu"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="pt-6 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setIsScheduleModalOpen(false)}
                        className="px-6 py-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isScheduleSubmitting}
                        className="flex-1 px-6 py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {isScheduleSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Submit Request"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
