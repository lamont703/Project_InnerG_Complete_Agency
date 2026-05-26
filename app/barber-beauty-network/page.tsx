"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { 
  Users, Briefcase, GraduationCap, ArrowRight, 
  Search, MapPin, Star, Scissors, CheckCircle2, ShieldCheck,
  ChevronLeft, ChevronRight, Phone, Globe, Sparkles, Lock, 
  Check, Building2, AlertCircle, X
} from "lucide-react";
import Image from "next/image";
import { createBrowserClient } from "@/lib/supabase/browser";

const MOCK_STUDENTS = [
  { name: "Marcus Johnson", school: "Texas Barber College", type: "Barber", status: "Licensed", city: "Dallas", image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=800&auto=format&fit=crop" },
  { name: "Sarah Williams", school: "Ogle School", type: "Cosmetologist", status: "Graduating Soon", city: "Fort Worth", image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=800&auto=format&fit=crop" },
  { name: "David Chen", school: "Franklin Institute", type: "Barber", status: "Licensed", city: "Austin", image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop" },
  { name: "Jessica Gomez", school: "Paul Mitchell The School", type: "Cosmetologist", status: "Licensed", city: "Houston", image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800&auto=format&fit=crop" },
  { name: "Tyrone Davis", school: "Texas Barber College", type: "Barber", status: "Student", city: "Dallas", image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop" },
  { name: "Emily Carter", school: "Ogle School", type: "Esthetician", status: "Graduating Soon", city: "San Antonio", image: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=80&w=800&auto=format&fit=crop" },
  { name: "Michael Lee", school: "Franklin Institute", type: "Barber", status: "Student", city: "Fort Worth", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop" },
  { name: "Amanda Taylor", school: "Paul Mitchell The School", type: "Cosmetologist", status: "Licensed", city: "Austin", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop" },
  { name: "Chris Martinez", school: "Texas Barber College", type: "Barber", status: "Graduating Soon", city: "Dallas", image: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=800&auto=format&fit=crop" },
];

export default function BarberBeautyNetworkPage() {
  const [activeTab, setActiveTab] = useState<'students' | 'shops'>('students');
  const [studentPage, setStudentPage] = useState(1);
  const [shopPage, setShopPage] = useState(1);
  const { setTheme } = useTheme();

  // Supabase Table States
  const [dbShops, setDbShops] = useState<any[]>([]);
  const [dbSchools, setDbSchools] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  // Search & Filter States for Shops
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("All Cities");
  const [rentFilter, setRentFilter] = useState("All Structures");

  // Search & Filter States for Students
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSchoolFilter, setStudentSchoolFilter] = useState("All Schools");
  const [studentCityFilter, setStudentCityFilter] = useState("All Cities");

  // Claim Modal States
  const [selectedClaimShop, setSelectedClaimShop] = useState<any | null>(null);
  const [claimName, setClaimName] = useState("");
  const [claimEmail, setClaimEmail] = useState("");
  const [claimPhone, setClaimPhone] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Card Expandable Chat Log States
  const [expandedChats, setExpandedChats] = useState<{ [key: string]: boolean }>({});
  const [applicationSuccessShopId, setApplicationSuccessShopId] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const ITEMS_PER_PAGE_STUDENTS = 3;
  const ITEMS_PER_PAGE_SHOPS = 6;

  // Load from Supabase on mount
  useEffect(() => {
    setTheme("light");
    
    async function loadData() {
      try {
        console.log("Supabase URL in Browser:", process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log("Supabase Anon Key in Browser:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 15) + "...") : "undefined");
        const supabase = createBrowserClient() as any;
        
        // Fetch shops
        const { data: shopsData, error: shopsError } = await supabase
          .from('agent_barbershop_leads')
          .select('*')
          .or('hiring_need.eq.true,booth_count_available.gte.1')
          .order('created_at', { ascending: false });

        // Fetch schools
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('agent_barber_school_leads')
          .select('*')
          .order('school_name', { ascending: true });

        if (shopsError) throw shopsError;
        if (schoolsError) throw schoolsError;

        if (!shopsData || shopsData.length === 0 || !schoolsData || schoolsData.length === 0) {
          console.warn("Supabase returned empty tables, falling back to preloaded database records...");
          setDbShops(MOCK_SHOPS);
          setDbSchools(MOCK_SCHOOLS);
          setIsFallbackMode(true);
        } else {
          setDbShops(shopsData);
          setDbSchools(schoolsData);
          setIsFallbackMode(false);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        console.warn("Offline fallback mode engaged: Loading preloaded database records...");
        setDbShops(MOCK_SHOPS);
        setDbSchools(MOCK_SCHOOLS);
        setIsFallbackMode(true);
      } finally {
        setLoadingShops(false);
      }
    }

    loadData();
  }, [setTheme]);

  // Interactive Helpers
  const toggleChatExpand = (shopId: string) => {
    setExpandedChats(prev => ({
      ...prev,
      [shopId]: !prev[shopId]
    }));
  };

  const handleApplyToShop = (shopId: string) => {
    setApplicationSuccessShopId(shopId);
    setTimeout(() => {
      setApplicationSuccessShopId(null);
    }, 4000);
  };

  // Dynamic Student List Generator
  const studentsList = useMemo(() => {
    if (dbSchools.length === 0) {
      // Fallback if schools aren't loaded yet
      return MOCK_STUDENTS;
    }

    const FIRST_NAMES = ["Marcus", "Sarah", "David", "Jessica", "Tyrone", "Emily", "Michael", "Amanda", "Chris", "Brandon", "Ashley", "Daniel", "Taylor", "Jordan", "Alex", "Sophia", "Matthew", "Isabella", "Justin", "Megan"];
    const LAST_NAMES = ["Johnson", "Williams", "Chen", "Gomez", "Davis", "Carter", "Lee", "Taylor", "Martinez", "Jackson", "Smith", "Brown", "Rodriguez", "Jones", "Thomas", "White", "Miller", "Davis", "Garcia", "Rodriguez"];
    const TYPES = ["Barber", "Cosmetologist", "Barber", "Esthetician", "Barber", "Cosmetologist"];
    const STATUSES = ["Licensed", "Graduating Soon", "Student", "Licensed", "Graduating Soon"];
    const IMAGES = [
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=800&auto=format&fit=crop"
    ];

    // Generate one graduating student for each school to integrate real database schools!
    return dbSchools.map((school, idx) => {
      const fName = FIRST_NAMES[idx % FIRST_NAMES.length];
      const lName = LAST_NAMES[(idx + 3) % LAST_NAMES.length];
      const type = TYPES[idx % TYPES.length];
      const status = STATUSES[idx % STATUSES.length];
      const image = IMAGES[idx % IMAGES.length];

      return {
        name: `${fName} ${lName}`,
        school: school.school_name,
        city: school.city || "Texas",
        type,
        status,
        image
      };
    });
  }, [dbSchools]);

  // Filter & Search Logic for Shops
  const filteredShops = dbShops.filter(shop => {
    const matchesSearch = shop.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.owner_name && shop.owner_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (shop.city && shop.city.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCity = cityFilter === "All Cities" || 
      (shop.city && shop.city.toLowerCase() === cityFilter.toLowerCase());
      
    const matchesStructure = rentFilter === "All Structures" || 
      (shop.rent_type && shop.rent_type.toLowerCase() === rentFilter.toLowerCase());

    return matchesSearch && matchesCity && matchesStructure;
  });

  // Filter & Search Logic for Students
  const filteredStudents = studentsList.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
      student.type.toLowerCase().includes(studentSearchQuery.toLowerCase());
      
    const matchesSchool = studentSchoolFilter === "All Schools" || 
      student.school === studentSchoolFilter;
      
    const matchesCity = studentCityFilter === "All Cities" || 
      student.city === studentCityFilter;

    return matchesSearch && matchesSchool && matchesCity;
  });

  // Unique lists for dropdowns
  const availableCities = ["All Cities", ...Array.from(new Set(dbShops.map(s => s.city).filter(Boolean))).sort()];
  const availableStructures = ["All Structures", ...Array.from(new Set(dbShops.map(s => s.rent_type).filter(Boolean))).sort()];

  const availableStudentCities = ["All Cities", ...Array.from(new Set(studentsList.map(s => s.city).filter(Boolean))).sort()];
  const availableStudentSchools = ["All Schools", ...Array.from(new Set(studentsList.map(s => s.school).filter(Boolean))).sort()];

  // Pagination totals
  const studentTotalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE_STUDENTS) || 1;
  const shopTotalPages = Math.ceil(filteredShops.length / ITEMS_PER_PAGE_SHOPS) || 1;

  const currentStudents = filteredStudents.slice((studentPage - 1) * ITEMS_PER_PAGE_STUDENTS, studentPage * ITEMS_PER_PAGE_STUDENTS);
  const currentShops = filteredShops.slice((shopPage - 1) * ITEMS_PER_PAGE_SHOPS, shopPage * ITEMS_PER_PAGE_SHOPS);

  // Handle claiming submit
  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimName || !claimEmail || !claimPhone || !selectedClaimShop) return;

    try {
      const supabase = createBrowserClient() as any;
      const { error } = await supabase
        .from('agent_barbershop_leads')
        .update({
          owner_name: claimName,
          email: claimEmail,
          phone: claimPhone,
          outreach_status: 'user_responded',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedClaimShop.id);

      if (error) throw error;

      // Update local state to immediately show owner's claim!
      setDbShops(prev => prev.map(s => s.id === selectedClaimShop.id ? {
        ...s,
        owner_name: claimName,
        email: claimEmail,
        phone: claimPhone,
        outreach_status: 'user_responded'
      } : s));

      setClaimSuccess(true);
      setTimeout(() => {
        setSelectedClaimShop(null);
        setClaimSuccess(false);
        setClaimName("");
        setClaimEmail("");
        setClaimPhone("");
      }, 3000);
    } catch (err) {
      console.error('Error claiming shop:', err);
      alert('Failed to submit claim verification. Please try again.');
    }
  }

  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900 selection:bg-blue-500/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 z-0 bg-slate-50 overflow-hidden pointer-events-none">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-75"
          >
            <source src="/network-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/30 to-slate-50" />
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
              Opportunity
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-xl text-slate-600 font-medium leading-relaxed"
          >
            The premium networking platform exclusively for the Barber, Beauty & Wellness industry. Build your portfolio, discover top-tier barber & cosmetology students, and schedule direct Shop Day visits.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4"
          >
            <button 
              onClick={() => {
                document.getElementById('explore-network')?.scrollIntoView({ behavior: 'smooth' });
                setActiveTab('students');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-all shadow-[0_4px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
            >
              Browse Students
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => {
                document.getElementById('explore-network')?.scrollIntoView({ behavior: 'smooth' });
                setActiveTab('shops');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Scissors className="w-5 h-5" />
              Browse Shops
            </button>
          </motion.div>
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
                <button 
                  onClick={() => {
                    document.getElementById('explore-network')?.scrollIntoView({ behavior: 'smooth' });
                    setActiveTab('students');
                  }}
                  className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
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
                <button 
                  onClick={() => {
                    document.getElementById('explore-network')?.scrollIntoView({ behavior: 'smooth' });
                    setActiveTab('shops');
                  }}
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  List Your Shop
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Interactive Network Browser */}
      <section id="explore-network" className="py-24 bg-white border-y border-slate-200 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Explore The Network</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">See how easy it is to find your perfect match.</p>
          </div>

          {/* Custom Tabs */}
          <div className="flex justify-center mb-12">
            <div className="flex p-1 bg-slate-100 rounded-2xl">
              <button
                onClick={() => {
                  setActiveTab('students');
                  setStudentSearchQuery("");
                  setStudentSchoolFilter("All Schools");
                  setStudentCityFilter("All Cities");
                  setStudentPage(1);
                }}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  activeTab === 'students' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Browse Students
              </button>
              <button
                onClick={() => {
                  setActiveTab('shops');
                  setSearchQuery("");
                  setCityFilter("All Cities");
                  setRentFilter("All Structures");
                  setShopPage(1);
                }}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  activeTab === 'shops' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Browse Shops
              </button>
            </div>
          </div>

          {/* Dynamic Database Connectivity Notice Banner */}
          {isFallbackMode && (
            <div className="max-w-4xl mx-auto mb-10 p-5 bg-amber-50 border border-amber-200/80 text-amber-800 rounded-3xl flex items-start gap-4 shadow-md text-xs font-semibold leading-relaxed animate-pulse">
              <AlertCircle className="w-5.5 h-5.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sm block mb-1 text-amber-900">Database Offline Fallback Active</span>
                Next.js was unable to establish a live connection to your remote Supabase instance (likely due to cached environment variables in your current dev terminal). To keep the layout fully functional and beautiful, the page has loaded offline stubs using the actual data records from your database.
                <div className="mt-2 text-[11px] bg-amber-100/60 p-2 rounded-lg border border-amber-200 text-amber-900 inline-block font-sans">
                  💡 <span className="font-black">Resolution:</span> Restart your Next.js dev server in your terminal (<code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">Ctrl+C</code> then <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">npm run dev</code>) to reload env variables.
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'students' ? (
              <motion.div
                key="students"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Premium Student Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-100 p-6 rounded-2xl border border-slate-200">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search students by name, specialty..." 
                      value={studentSearchQuery}
                      onChange={(e) => {
                        setStudentSearchQuery(e.target.value);
                        setStudentPage(1);
                      }}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                    />
                  </div>

                  <div className="flex gap-4">
                    <select
                      value={studentSchoolFilter}
                      onChange={(e) => {
                        setStudentSchoolFilter(e.target.value);
                        setStudentPage(1);
                      }}
                      className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {availableStudentSchools.map((school, idx) => (
                        <option key={idx} value={school}>{school}</option>
                      ))}
                    </select>

                    <select
                      value={studentCityFilter}
                      onChange={(e) => {
                        setStudentCityFilter(e.target.value);
                        setStudentPage(1);
                      }}
                      className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {availableStudentCities.map((city, idx) => (
                        <option key={idx} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50 mb-10">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-extrabold text-slate-800 text-lg mb-1">No Students Match Your Filters</h3>
                    <p className="text-slate-500 text-sm">Try broadening your search term or adjusting filters.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6 mb-10">
                    {currentStudents.map((student, i) => (
                      <div key={i} className="rounded-2xl border border-slate-200 p-6 bg-white hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6 border border-slate-100">
                          <Image src={student.image} alt={student.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-lg text-slate-900">{student.name}</h3>
                          <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">{student.status}</span>
                        </div>
                        <p className="text-slate-500 font-semibold text-sm mb-4">
                          {student.type} • {student.school} • <span className="text-blue-600 font-bold">{student.city}</span>
                        </p>
                        <button className="w-full py-3 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">View Portfolio</button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                    disabled={studentPage === 1}
                    className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-2">
                    {getPageNumbers(studentPage, studentTotalPages).map((p, idx) => {
                      if (p === "...") {
                        return (
                          <span key={`dots-${idx}`} className="px-2 text-slate-400 font-bold select-none">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setStudentPage(Number(p))}
                          className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${
                            studentPage === p ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setStudentPage(p => Math.min(studentTotalPages, p + 1))}
                    disabled={studentPage === studentTotalPages}
                    className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="shops"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Dynamic Stats Panel for Shops */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-wider">Active Shops</span>
                    <span className="text-3xl font-black">{dbShops.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-wider">Openings Found</span>
                    <span className="text-3xl font-black">
                      {dbShops.reduce((sum, s) => sum + (s.booth_count_available || 0), 0)}+ Chairs
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-wider">Active Cities</span>
                    <span className="text-3xl font-black">{availableCities.length - 1} Metros</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-wider">Placement Rate</span>
                    <span className="text-3xl font-black">Free / Placement</span>
                  </div>
                </div>

                {/* Premium Search & Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-100 p-6 rounded-2xl border border-slate-200">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search shops by name, owner, city..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                    />
                  </div>

                  <div className="flex gap-4">
                    <select
                      value={cityFilter}
                      onChange={(e) => setCityFilter(e.target.value)}
                      className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {availableCities.map((city, idx) => (
                        <option key={idx} value={city}>{city}</option>
                      ))}
                    </select>

                    <select
                      value={rentFilter}
                      onChange={(e) => setRentFilter(e.target.value)}
                      className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {availableStructures.map((struct, idx) => (
                        <option key={idx} value={struct}>{struct}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingShops ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                    <p className="text-slate-500 font-bold text-sm">Loading Texas Barbershop placements...</p>
                  </div>
                ) : filteredShops.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <Scissors className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-extrabold text-slate-800 text-lg mb-1">No Barber Shops Match Your Filters</h3>
                    <p className="text-slate-500 text-sm">Try broadening your search term or adjusting filters.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                      {currentShops.map((shop, i) => {
                        const isChatExpanded = !!expandedChats[shop.id];
                        let turns: any[] = [];
                        
                        if (shop.conversation_turns) {
                          try {
                            turns = typeof shop.conversation_turns === 'string'
                              ? JSON.parse(shop.conversation_turns)
                              : shop.conversation_turns;
                          } catch (e) {
                            // Fallback
                          }
                        }

                        if (turns.length === 0 && shop.last_conversation_history) {
                          const lines = shop.last_conversation_history.split('\n');
                          let currentRole: 'user' | 'agent' | null = null;
                          let currentText = '';
                          
                          lines.forEach((line: string) => {
                            const isOwner = line.startsWith('Shop Owner:');
                            const isAgent = line.startsWith('Lamont:') || line.startsWith('Agent:');
                            
                            if (isOwner || isAgent) {
                              if (currentRole && currentText) {
                                turns.push({ role: currentRole, content: currentText.trim() });
                              }
                              currentRole = isOwner ? 'user' : 'agent';
                              currentText = line.substring(line.indexOf(':') + 1);
                            } else {
                              currentText += '\n' + line;
                            }
                          });
                          if (currentRole && currentText) {
                            turns.push({ role: currentRole, content: currentText.trim() });
                          }
                        }

                        const tagList = shop.place_types 
                          ? shop.place_types.split('|').map((t: string) => t.trim().replace('_', ' ')).filter((t: string) => t !== 'point of interest' && t !== 'establishment' && t !== 'service' && t !== 'health')
                          : [];

                        return (
                          <div key={shop.id} className="rounded-[2.2rem] border border-slate-200 p-6 bg-white hover:border-blue-400 hover:shadow-2xl transition-all flex flex-col group relative overflow-hidden">
                            
                            {/* Hiring Pulsing Badge */}
                            {shop.hiring_need || (shop.booth_count_available && shop.booth_count_available >= 1) ? (
                              <span className="absolute top-4 right-4 z-10 px-3.5 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md animate-pulse">
                                Hiring: {shop.booth_count_available || 1}+ Chairs
                              </span>
                            ) : (
                              <span className="absolute top-4 right-4 z-10 px-3.5 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-200">
                                Lead Profile
                              </span>
                            )}

                            {/* Gallery Image */}
                            <div className="relative w-full h-52 rounded-2xl overflow-hidden mb-6 border border-slate-100 shadow-sm bg-slate-50 group-hover:shadow-md transition-shadow">
                              <Image 
                                src={getShopImage(shop.id)}
                                alt={shop.shop_name} 
                                fill 
                                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-80" />
                              
                              {/* City Overlaid Tag */}
                              <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/20 shadow-sm">
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs font-extrabold text-slate-800">{shop.city || "Texas"}</span>
                              </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                              {/* Shop Name & Website Link */}
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                  <h3 className="font-black text-2xl text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
                                    {shop.shop_name}
                                  </h3>
                                  {shop.website && shop.website !== "N/A" ? (
                                    <a 
                                      href={shop.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold mt-1 group/link cursor-pointer"
                                    >
                                      <Globe className="w-3.5 h-3.5" />
                                      Visit Shop Website
                                      <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-medium italic mt-1 block">No Website Linked</span>
                                  )}
                                </div>
                                
                                <div className="flex flex-col items-end shrink-0">
                                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-xl border border-amber-200/50">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span className="text-xs font-black text-amber-800">{shop.rating || "4.8"}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 mt-1">{shop.total_reviews || 120} Reviews</span>
                                </div>
                              </div>

                              {/* Specialty place tags */}
                              {tagList.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                  {tagList.slice(0, 3).map((tag: string, idx: number) => (
                                    <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200/40">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Hiring Specifications (Detailed stats to help students get familiar) */}
                              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 grid grid-cols-2 gap-4 mb-4 text-xs font-semibold">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Available Chairs</span>
                                  <span className="font-extrabold text-slate-800 flex items-center gap-1">
                                    <Scissors className="w-3.5 h-3.5 text-blue-500" />
                                    {shop.booth_count_available > 0 ? `${shop.booth_count_available} Chairs` : "No Chairs (Waitlist)"}
                                  </span>
                                </div>
                                
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Compensation</span>
                                  <span className="font-extrabold text-slate-800 flex items-center gap-1">
                                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                                    {shop.rent_type && shop.rent_type !== "Unknown" ? shop.rent_type : "Booth Rent / Commission"}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-0.5 border-t border-slate-200/60 pt-2 col-span-2">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Rent Rate</span>
                                  <span className="font-black text-blue-600 text-sm flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    {shop.rent_rate ? shop.rent_rate : "Negotiable (Claim to update)"}
                                  </span>
                                </div>
                                
                                <div className="flex flex-col gap-0.5 border-t border-slate-200/60 pt-2 col-span-2">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Desired Specialties</span>
                                  <span className="font-bold text-slate-700 bg-white border border-slate-200/80 px-2 py-1 rounded-lg mt-0.5 max-w-max text-[11px]">
                                    {shop.specialty_desired && shop.specialty_desired !== "Unknown" ? shop.specialty_desired : "General Fades, Lineups & Shaves"}
                                  </span>
                                </div>
                              </div>

                              {/* Owner & Obscured Contact Info Card (To trigger owner to claim) */}
                              <div className="border border-slate-200 rounded-2xl p-4 mb-4 bg-slate-50/40 relative overflow-hidden">
                                <div className="absolute top-3 right-3 text-slate-400">
                                  <Lock className="w-4 h-4" />
                                </div>
                                
                                <div className="space-y-2 text-xs font-semibold">
                                  <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-black uppercase tracking-wider mb-1">
                                    <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                    Verified Owner Profile
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Owner Name:</span>
                                    <span className="text-slate-700 font-bold">{shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : "Unclaimed (Claim to add)"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Email Address:</span>
                                    <span className="text-slate-700 font-bold font-mono">{maskEmail(shop.email)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Owner Phone:</span>
                                    <span className="text-slate-700 font-bold font-mono">{maskPhone(shop.phone)}</span>
                                  </div>
                                </div>
                              </div>


                              {/* Call to action: students show interest / owners claim */}
                              <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                                {applicationSuccessShopId === shop.id ? (
                                  <div className="w-full py-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 font-bold text-xs flex items-center justify-center gap-2 animate-pulse">
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    Portfolio Shared Successfully!
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => handleApplyToShop(shop.id)}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98]"
                                  >
                                    <GraduationCap className="w-4 h-4" />
                                    Share Profile / Apply Now
                                  </button>
                                )}
                                
                                <button 
                                  onClick={() => setSelectedClaimShop(shop)}
                                  className="w-full py-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  Is this your shop? Claim & Get Notified!
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={() => setShopPage(p => Math.max(1, p - 1))}
                        disabled={shopPage === 1}
                        className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <div className="flex items-center gap-2">
                        {getPageNumbers(shopPage, shopTotalPages).map((p, idx) => {
                          if (p === "...") {
                            return (
                              <span key={`dots-${idx}`} className="px-2 text-slate-400 font-bold select-none">
                                ...
                              </span>
                            );
                          }
                          return (
                            <button
                              key={p}
                              onClick={() => setShopPage(Number(p))}
                              className={`w-8 h-8 rounded-full text-sm font-bold transition-all cursor-pointer ${
                                shopPage === p ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => setShopPage(p => Math.min(shopTotalPages, p + 1))}
                        disabled={shopPage === shopTotalPages}
                        className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Claim Shop Dialog Modal */}
      <AnimatePresence>
        {selectedClaimShop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-200 shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedClaimShop(null)}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer animate-pulse"
              >
                <X className="w-5 h-5" />
              </button>

              {!claimSuccess ? (
                <form onSubmit={handleClaimSubmit} className="space-y-6">
                  <div className="text-center space-y-2 mb-2">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900">Claim {selectedClaimShop.shop_name}</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mx-auto">
                      Verify your listing to manage chair availability, edit rent rates, and receive real-time student interest alerts!
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600 mb-2">
                    <div className="flex justify-between font-semibold"><span className="text-slate-400">Owner Status:</span> <span>Unclaimed Lead</span></div>
                    <div className="flex justify-between font-semibold"><span className="text-slate-400">Verified Address:</span> <span className="text-right truncate max-w-[200px]">{selectedClaimShop.formatted_address || "Texas Hub"}</span></div>
                    <div className="flex justify-between font-semibold"><span className="text-slate-400">Google Rating:</span> <span>⭐ {selectedClaimShop.rating || "4.8"} ({selectedClaimShop.total_reviews || 100}+ reviews)</span></div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Name</label>
                      <input 
                        type="text" 
                        required 
                        placeholder={selectedClaimShop.owner_name && selectedClaimShop.owner_name !== 'Unknown Owner' ? selectedClaimShop.owner_name : "Your Name"}
                        value={claimName}
                        onChange={(e) => setClaimName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Business Email</label>
                      <input 
                        type="email" 
                        required 
                        placeholder={selectedClaimShop.email || "owner@barbershop.com"} 
                        value={claimEmail}
                        onChange={(e) => setClaimEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Phone</label>
                      <input 
                        type="tel" 
                        required 
                        placeholder={selectedClaimShop.phone || "+1 (254) 420-8647"} 
                        value={claimPhone}
                        onChange={(e) => setClaimPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-md transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                  >
                    Submit Verification Claim
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 border border-green-200 flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Check className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Claim Request Submitted!</h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mx-auto">
                    Thanks, {claimName}! We have received your verification request for **{selectedClaimShop.shop_name}**. We will contact you at **{claimEmail}** within 24 hours to secure your login!
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 text-center px-6">
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Ready to Join the Network?</h2>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">Whether you are looking for the perfect chair or the perfect barber, everything starts here.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => {
              document.getElementById('explore-network')?.scrollIntoView({ behavior: 'smooth' });
              setActiveTab('students');
            }}
            className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-colors cursor-pointer"
          >
            I am a Student
          </button>
          <button 
            onClick={() => {
              document.getElementById('explore-network')?.scrollIntoView({ behavior: 'smooth' });
              setActiveTab('shops');
            }}
            className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-lg transition-colors cursor-pointer"
          >
            I am a Shop Owner
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// Helper functions for masking sensitive data
function maskEmail(email: string | null) {
  if (!email) return "Not provided (Claim to update)";
  const parts = email.split("@");
  if (parts.length !== 2) return "••••@••••.com";
  const [local, domain] = parts;
  const maskedLocal = local.length > 2 
    ? local.substring(0, 2) + "••••" + local.substring(local.length - 1)
    : "••••";
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string | null) {
  if (!phone) return "No phone listed (Claim to update)";
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    const country = cleaned.length > 10 ? `+${cleaned.substring(0, cleaned.length - 10)} ` : '';
    const area = cleaned.substring(cleaned.length - 10, cleaned.length - 7);
    const prefix = cleaned.substring(cleaned.length - 7, cleaned.length - 4);
    return `${country}(${area}) ${prefix}-••••`;
  }
  return phone.substring(0, Math.min(5, phone.length)) + "••••";
}

function sanitizeChatText(text: string | null) {
  if (!text) return "";
  let sanitized = text;
  // Mask emails
  sanitized = sanitized.replace(/([a-zA-Z0-9._%-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/g, (match, p1, p2) => {
    const masked = p1.length > 2 ? p1.substring(0, 2) + "••••" + p1.substring(p1.length - 1) : "••••";
    return `${masked}@${p2}`;
  });
  // Mask 10-digit phone numbers
  sanitized = sanitized.replace(/\b(?:\+?1[-.●]?)?\(?([0-9]{3})\)?[-.●]?([0-9]{3})[-.●]?([0-9]{4})\b/g, "($1) $2-••••");
  return sanitized;
}

const SHOP_IMAGES = [
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=800&auto=format&fit=crop"
];

function getShopImage(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SHOP_IMAGES.length;
  return SHOP_IMAGES[index];
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: (number | string)[] = [];
  const maxVisiblePages = 5;
  
  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    
    if (currentPage <= 3) {
      end = 4;
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
    }
    
    if (start > 2) {
      pages.push("...");
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (end < totalPages - 1) {
      pages.push("...");
    }
    
    pages.push(totalPages);
  }
  
  return pages;
}


const MOCK_SCHOOLS = [
  { school_name: "NeeCee's Barber College", city: "Abilene", accreditation_status: "Accredited" },
  { school_name: "Wade Gordon Hairdressing Academy", city: "Amarillo", accreditation_status: "Accredited" },
  { school_name: "Ogle School Hair Skin Nails", city: "Arlington", accreditation_status: "Accredited" },
  { school_name: "Inner G Complete Agency", city: "Atl", accreditation_status: "Accredited" },
  { school_name: "CF Barber Academy LLC", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "IMPACT Barber Academy Austin", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "The Men Barber School", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "Tre's Barber Institute", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "Xotic Barber Academy", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "Deluxe Barber College", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "DACS ACADEMY", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "Paul Mitchell The School Austin", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "Avenue Five Institute", city: "Austin", accreditation_status: "Accredited" },
  { school_name: "Mei Barber School", city: "Brownsville", accreditation_status: "Accredited" },
  { school_name: "Natural Images Beauty College", city: "Clute", accreditation_status: "Accreditation on Probation" },
  { school_name: "Modern Barber & Beauty Institute", city: "College Station", accreditation_status: "Accredited" },
  { school_name: "The Strand Institute of Beauty & Esthetics", city: "Corpus Christi", accreditation_status: "Accredited" },
  { school_name: "Career Schools of Texas", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Dallas Barber & Stylist College", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Dallas Beauty And Barber Academy", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "SOL Barber & Styling Academy", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Pro Fades Barber Academy", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Dallas Blends Barber Academy Duncanville", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Dallas Blends Barber Academy Garland", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "OZ Barber and Piercing Academy", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Texasfadez barber college Oakcliff", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Master Barbers Institute", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "INVICTUS CAREER COLLEGE", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Elegance Barber & Styling Academy", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Texas Barber College", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Dallas Blends Barber Academy", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Dallas Barber & Stylist Clg", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Dooney's Barber & Beauty Academy", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Graham's Barber College", city: "Dallas", accreditation_status: "Accredited" },
  { school_name: "Milan Institute of Cosmetology", city: "Denton", accreditation_status: "Provisional" },
  { school_name: "Ogle School Hair Skin Nails", city: "Denton", accreditation_status: "Accredited" },
  { school_name: "Southwest Barber Institute", city: "El Paso", accreditation_status: "Accredited" },
  { school_name: "El Pipo Barber College", city: "El Paso", accreditation_status: "Accredited" },
  { school_name: "Bronx Barber College", city: "El Paso", accreditation_status: "Accredited" },
  { school_name: "Academy of Barbers iInstitute/EPT", city: "El Paso", accreditation_status: "Accredited" }
];

const MOCK_SHOPS = [
  {
    id: "941152ec-0334-4bf8-822f-e48f1b673b84",
    shop_name: "Sauccy Fades Dallas Barbershop",
    owner_name: "Silverio Espinoza",
    phone: "+12544208647",
    city: "Dallas",
    hiring_need: true,
    rent_type: "Booth Rent",
    specialty_desired: "General Fades & Shaves",
    booth_count_available: 2,
    rent_rate: "$225/chair",
    email: "silverioespinoza35@gmail.com",
    outreach_status: "user_responded",
    place_id: "ChIJlwxjv0EnTIYRvJavGvFlCwg",
    formatted_address: "11909 Preston Rd, 37 1436 2nd floor, suite, Dallas, TX 75230, USA",
    website: "https://sauccyfades.com/",
    rating: "5",
    total_reviews: 517,
    place_types: "barber_shop | beautician | hair_salon | hair_care",
    business_status: "OPERATIONAL"
  },
  {
    id: "fc8b983d-eece-4550-9624-449584e7b458",
    shop_name: "The Classic Barber",
    owner_name: "Unknown Owner",
    phone: "+18175011597",
    city: "Fort Worth",
    hiring_need: true,
    rent_type: "Booth Rent",
    specialty_desired: "General Shaves & Fades",
    booth_count_available: 2,
    rent_rate: "$250 weekly",
    email: null,
    outreach_status: "user_responded",
    place_id: "ChIJR0YDJeJzToYRGEUGq71NJp4",
    formatted_address: "2603 8th Ave, Fort Worth, TX 76110, USA",
    website: "https://bestfortworthbarber.com/",
    rating: "4.8",
    total_reviews: 648,
    place_types: "barber_shop | hair_care",
    business_status: "OPERATIONAL"
  },
  {
    id: "84d3755c-ef8b-4e14-8ff8-2ee585460e8a",
    shop_name: "Dallas Fades Barbershop",
    owner_name: "Unknown Owner",
    phone: "+19728072072",
    city: "Dallas",
    hiring_need: true,
    rent_type: "Booth Rent",
    specialty_desired: "Texas Licensed ASAP",
    booth_count_available: 2,
    rent_rate: "Negotiable",
    email: null,
    outreach_status: "user_responded",
    place_id: "ChIJzQUclbiYToYRg81CYak4QAM",
    formatted_address: "124 N Peak St, Dallas, TX 75226, USA",
    website: "http://www.dallasfadesofficial.com/",
    rating: "4.5",
    total_reviews: 452,
    place_types: "barber_shop | hair_salon",
    business_status: "OPERATIONAL"
  },
  {
    id: "b2f86e70-63b7-4003-8aa0-8d172a52aab8",
    shop_name: "Ninety Degrees Barbershop",
    owner_name: "Unknown Owner",
    phone: "+19724646772",
    city: "Dallas",
    hiring_need: true,
    rent_type: "Booth Rent",
    specialty_desired: "General Cuts",
    booth_count_available: 2,
    rent_rate: "Negotiable",
    email: null,
    outreach_status: "user_responded",
    place_id: "ChIJwQRtSfKZToYRSpwJy_J95fk",
    formatted_address: "407 N Lamar St #180C, Dallas, TX 75202, USA",
    website: "https://ninetydegreesbarbershopdallas.com/90-degrees-lamar",
    rating: "4.9",
    total_reviews: 139,
    place_types: "barber_shop | hair_care",
    business_status: "OPERATIONAL"
  },
  {
    id: "433d6bfc-a894-44aa-8bad-420efdb4831a",
    shop_name: "Olde Soul Barbershop",
    owner_name: "Unknown Owner",
    phone: "+15124022523",
    city: "Austin",
    hiring_need: true,
    rent_type: "Commission",
    specialty_desired: "General Styles",
    booth_count_available: 0,
    rent_rate: "Commission-based",
    email: null,
    outreach_status: "user_responded",
    place_id: "ChIJO4Nv1eS1RIYRfKtjTaXAsek",
    formatted_address: "1614 E 6th St Unit 115, Austin, TX 78702, USA",
    website: "https://oldesoulbarbershop.com/",
    rating: "4.9",
    total_reviews: 567,
    place_types: "barber_shop | hair_care",
    business_status: "OPERATIONAL"
  },
  {
    id: "d6c5f9f9-61a0-4cb8-89df-02d6a51fef2d",
    shop_name: "Faded Souls",
    owner_name: "Unknown Owner",
    phone: "+12103380062",
    city: "San Antonio",
    hiring_need: false,
    rent_type: "Booth Rent",
    specialty_desired: "General Fades",
    booth_count_available: 1,
    rent_rate: "$225 a week",
    email: null,
    outreach_status: "user_responded",
    place_id: "ChIJPV3lqgxdXIYRsyo5TlkGp3E",
    formatted_address: "6301 Northwest Loop 410 Suite 4na, San Antonio, TX 78238, USA",
    website: "https://www.houseofslay.org/",
    rating: "4.9",
    total_reviews: 113,
    place_types: "barber_shop | hair_care",
    business_status: "OPERATIONAL"
  }
];
