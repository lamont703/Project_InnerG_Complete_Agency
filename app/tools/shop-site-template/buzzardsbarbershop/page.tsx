import Image from "next/image"
import Link from "next/link"
import { MapPin, Phone, Mail, Instagram, Star, Scissors, Users, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ShopSiteTemplate() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 font-sans selection:bg-amber-500/30 overflow-x-hidden relative">
      
      {/* Global Background Orbs for Glassmorphism */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
        <div className="absolute top-3/4 left-1/4 w-[400px] h-[400px] bg-amber-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-zinc-900/20 backdrop-blur-2xl border-b border-white/10 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500/90 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg border border-white/20">
              <Scissors className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white uppercase drop-shadow-md">Buzzard's<span className="text-amber-500">.</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-widest uppercase text-white/70">
            <a href="#about" className="hover:text-white transition-colors">The Club</a>
            <a href="#careers" className="hover:text-amber-400 transition-colors">Careers</a>
            <a href="#contact" className="hover:text-white transition-colors">Location</a>
          </div>
          <div>
            <Button className="bg-amber-500/90 hover:bg-amber-500 text-black font-bold uppercase tracking-wider rounded-xl px-4 md:px-6 text-xs md:text-sm shadow-xl shadow-amber-500/20 border border-white/20 backdrop-blur-md transition-all">
              Book Appointment
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center pt-20">
        <div className="absolute inset-2 md:inset-6 z-0 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl">
          <Image
            src="/premium_barbershop_hero.png"
            alt="Buzzard's Barbershop Interior"
            fill
            className="object-cover opacity-60 brightness-75 scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-900/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/40 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
          <div className="max-w-3xl bg-zinc-950/20 backdrop-blur-lg p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl">
            <h2 className="text-amber-400 font-bold tracking-widest uppercase mb-4 text-sm md:text-base flex items-center gap-2 drop-shadow-md">
              <Star className="w-4 h-4 fill-amber-400" />
              Premium Grooming
            </h2>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6 text-white drop-shadow-xl">
              The Shop <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                Club.
              </span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-zinc-200 font-light max-w-2xl leading-relaxed mb-10 border-l-4 border-amber-500 pl-4 md:pl-6 drop-shadow-md">
              Not a walk-in shop. We treat it more like a suite. Bring your clients, bring your hustle, and elevate your craft.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="bg-amber-500/90 backdrop-blur-md border border-white/20 hover:bg-amber-500 text-black font-bold uppercase tracking-wider rounded-xl text-lg px-8 h-14 shadow-xl shadow-amber-500/20 transition-all" asChild>
                <a href="#careers">Join The Team</a>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/5 backdrop-blur-md border-white/20 text-white hover:bg-white hover:text-black uppercase tracking-wider rounded-xl text-lg px-8 h-14 transition-all shadow-lg" asChild>
                <a href="#about">View Services</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* The Vibe / Ethos Section */}
      <section id="about" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-10 md:p-14 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mb-6 text-zinc-900">
                More Than A <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-400">Barbershop</span>
              </h3>
              <div className="space-y-6 text-lg text-zinc-700 font-light leading-relaxed">
                <p>
                  At Buzzard's Barbershop, we don't rely on foot traffic. We've built an exclusive, high-end environment designed for established professionals who take their craft—and their clientele—seriously.
                </p>
                <p>
                  We operate with the privacy and premium feel of a suite, combined with the camaraderie of an elite club. If you have extreme hustle and the drive to get out and build your book, this is your new home.
                </p>
              </div>
              
              <div className="mt-12 grid grid-cols-2 gap-8">
                <div className="bg-white/50 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-sm">
                  <div className="text-4xl font-black text-zinc-900 mb-2">72+</div>
                  <div className="text-sm uppercase tracking-widest text-amber-600 font-bold">5-Star Reviews</div>
                </div>
                <div className="bg-white/50 backdrop-blur-md border border-white/60 p-6 rounded-2xl shadow-sm">
                  <div className="text-4xl font-black text-zinc-900 mb-2">100%</div>
                  <div className="text-sm uppercase tracking-widest text-amber-600 font-bold">Client Focus</div>
                </div>
              </div>
            </div>
            
            <div className="relative h-[300px] md:h-[600px] mt-12 md:mt-0 w-full">
              <div className="absolute inset-0 bg-white/30 backdrop-blur-3xl border border-white/50 rounded-[2.5rem] transform md:rotate-3 shadow-2xl" />
              <div className="absolute inset-0 bg-zinc-100 rounded-[2.5rem] border border-white/80 overflow-hidden shadow-2xl transform -rotate-1 transition-transform hover:rotate-0 duration-500">
                <Image
                  src="/barbershop.webp"
                  alt="Shop Atmosphere"
                  fill
                  className="object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Careers / Hiring Section */}
      <section id="careers" className="py-32 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 bg-white/30 backdrop-blur-2xl border border-white/50 p-8 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
            <h2 className="text-amber-600 font-bold tracking-widest uppercase mb-4 text-sm flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              Join The Elite
            </h2>
            <h3 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase tracking-tight mb-6 text-zinc-900">
              Now Hiring <br />Booth Renters
            </h3>
            <p className="text-lg md:text-xl text-zinc-700 font-light bg-white/50 inline-block px-6 py-2 rounded-full border border-white/60 shadow-sm">
              We currently have <span className="text-zinc-900 font-bold">2 chairs available</span> for the right talent.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Pricing Card */}
            <div className="bg-white/60 backdrop-blur-2xl border border-white/80 p-10 relative group hover:-translate-y-2 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-[2rem]">
              <div className="absolute -top-4 right-8 bg-amber-500/90 backdrop-blur-md border border-white/40 text-black text-xs font-bold uppercase tracking-widest px-6 py-2 rounded-full shadow-lg">
                Special Rate
              </div>
              <h4 className="text-2xl font-black uppercase mb-2 text-zinc-900">First Month</h4>
              <div className="flex items-baseline gap-2 mb-6 border-b border-black/5 pb-6">
                <span className="text-5xl font-black text-amber-600 drop-shadow-sm">$200</span>
                <span className="text-zinc-500 uppercase tracking-widest text-sm">/ week</span>
              </div>
              <p className="text-zinc-600 font-light mb-8">
                Get settled in and build your momentum with our discounted introductory booth rent rate.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-zinc-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Premium Station
                </li>
                <li className="flex items-center gap-3 text-sm text-zinc-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Suite-like Privacy
                </li>
                <li className="flex items-center gap-3 text-sm text-zinc-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> 24/7 Access
                </li>
              </ul>
            </div>

            {/* Pricing Card 2 */}
            <div className="bg-white/40 backdrop-blur-xl border border-white/50 p-10 mt-0 md:mt-8 hover:-translate-y-2 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[2rem]">
              <h4 className="text-2xl font-black uppercase mb-2 text-zinc-900">Standard Rate</h4>
              <div className="flex items-baseline gap-2 mb-6 border-b border-black/5 pb-6">
                <span className="text-5xl font-black text-zinc-900">$225</span>
                <span className="text-zinc-500 uppercase tracking-widest text-sm">/ week</span>
              </div>
              <p className="text-zinc-600 font-light mb-8">
                Our standard competitive rate kicks in after your first month of establishing your presence.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-sm text-zinc-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-zinc-400" /> Premium Station
                </li>
                <li className="flex items-center gap-3 text-sm text-zinc-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-zinc-400" /> Suite-like Privacy
                </li>
                <li className="flex items-center gap-3 text-sm text-zinc-700 font-medium">
                  <div className="w-2 h-2 rounded-full bg-zinc-400" /> 24/7 Access
                </li>
              </ul>
            </div>

            {/* Requirements */}
            <div className="bg-gradient-to-br from-amber-400/90 to-amber-600/90 backdrop-blur-2xl border border-white/40 p-10 text-zinc-900 flex flex-col justify-center shadow-[0_8px_32px_rgba(245,158,11,0.2)] rounded-[2rem] hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30 shadow-inner">
                <Users className="w-8 h-8 text-zinc-900" />
              </div>
              <h4 className="text-3xl font-black uppercase tracking-tight mb-4 leading-none text-black">
                What We<br/>Expect
              </h4>
              <p className="text-black/80 font-medium mb-8 leading-relaxed">
                Having some clients is crucial to get you started. If you don't have a massive book yet, you must possess extreme hustle to get out and acquire them. We provide the elite space; you provide the clientele.
              </p>
              <Button className="bg-zinc-900/90 backdrop-blur-md hover:bg-zinc-900 text-white uppercase tracking-widest font-bold rounded-xl w-full h-14 shadow-xl border border-white/10 transition-all">
                Apply Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Location & Footer */}
      <footer id="contact" className="relative z-10 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 mb-20">
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-10 md:p-14 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-8 text-zinc-900">Location & <br/><span className="text-amber-600">Contact</span></h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 transition-all hover:bg-white/70">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 border border-black/5">
                    <MapPin className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-zinc-900 uppercase tracking-widest text-sm mb-1">Address</h5>
                    <p className="text-zinc-600">13150 Breton Ridge St<br/>Houston, TX 77070</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 transition-all hover:bg-white/70">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 border border-black/5">
                    <Phone className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-zinc-900 uppercase tracking-widest text-sm mb-1">Owner</h5>
                    <p className="text-zinc-600">Ryan Greear<br/>+1 806-746-2562</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 transition-all hover:bg-white/70">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 border border-black/5">
                    <Mail className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-zinc-900 uppercase tracking-widest text-sm mb-1">Email</h5>
                    <p className="text-zinc-600">ryangreear@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-3xl border border-white/10 p-10 md:p-14 rounded-[2rem] shadow-2xl flex flex-col justify-center">
              <h3 className="text-2xl font-black uppercase mb-6 text-white drop-shadow-sm">Inquire About A Chair</h3>
              <form className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Your Name" 
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-xl text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white/20 focus:border-amber-500 transition-all shadow-inner"
                />
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-xl text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white/20 focus:border-amber-500 transition-all shadow-inner"
                />
                <input 
                  type="text" 
                  placeholder="Instagram Handle (Optional)" 
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-xl text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white/20 focus:border-amber-500 transition-all shadow-inner"
                />
                <Button className="bg-amber-500 hover:bg-amber-400 text-black uppercase tracking-widest font-bold rounded-xl w-full h-14 mt-6 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all">
                  Send Inquiry
                </Button>
              </form>
            </div>
          </div>

          <div className="border-t border-black/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/50 shadow-sm">
              <Scissors className="w-5 h-5 text-amber-600" />
              <span className="text-lg font-bold tracking-tight text-zinc-900 uppercase">Buzzard's<span className="text-amber-500">.</span></span>
            </div>
            
            <p className="text-zinc-500 text-sm bg-white/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/50">
              © {new Date().getFullYear()} Buzzard's Barbershop. Built by <span className="text-zinc-800 font-bold">Inner G Complete Agency</span>.
            </p>

            <div className="flex gap-4">
              <a href="#" className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur-md border border-white/60 shadow-sm flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all text-zinc-600 hover:-translate-y-1">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
