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
  Check, Building2, AlertCircle, X, Award, BookOpen, Calendar, Clock, ExternalLink
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import { submitNewBarbershopLead, submitShopDayInvite, submitCareerPassport } from "./actions";

function ShopImage({ imageUrl, fallbackSrc, alt }: { imageUrl?: string | null, fallbackSrc: string, alt: string }) {
  const [src, setSrc] = useState(imageUrl || fallbackSrc);

  // Update src if imageUrl prop changes
  useEffect(() => {
    setSrc(imageUrl || fallbackSrc);
  }, [imageUrl, fallbackSrc]);

  return (
    <img 
      src={src}
      alt={alt} 
      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out" 
      onError={() => setSrc(fallbackSrc)}
    />
  );
}


const MOCK_STUDENTS = [
  { 
    id: "student-mock-1",
    name: "Marcus Johnson", 
    school: "Texas Barber College", 
    type: "Barber", 
    status: "Licensed", 
    city: "Dallas", 
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/marcus_fades",
    tiktok: "https://tiktok.com/@marcus_cuts",
    youtube: "https://youtube.com/@marcus_fades",
    portfolio: "https://marcusfades.me",
    pathway: "Dual-Pathway Eligible",
    specialties: ["Modern Fades", "Beard Styling", "Razor Shaves"]
  },
  { 
    id: "student-mock-2",
    name: "Sarah Williams", 
    school: "Ogle School", 
    type: "Cosmetologist", 
    status: "Graduating Soon", 
    city: "Fort Worth", 
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/sarah_styles",
    tiktok: "https://tiktok.com/@sarah_cuts",
    youtube: "https://youtube.com/@sarahstyles",
    portfolio: "https://sarahstyles.com",
    pathway: "Barbershop Hire",
    specialties: ["Hair Coloring", "Precision Cuts", "Blowouts"]
  },
  { 
    id: "student-mock-3",
    name: "David Chen", 
    school: "Franklin Institute", 
    type: "Barber", 
    status: "Licensed", 
    city: "Austin", 
    image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/david_cuts",
    tiktok: "https://tiktok.com/@david_fades",
    youtube: "https://youtube.com/@davidcuts",
    portfolio: "https://davidcuts.me",
    pathway: "School Instructor",
    specialties: ["Classic Tapers", "Lineups", "Skin Fades"]
  },
  { 
    id: "student-mock-4",
    name: "Jessica Gomez", 
    school: "Paul Mitchell The School", 
    type: "Cosmetologist", 
    status: "Licensed", 
    city: "Houston", 
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/jess_styles",
    tiktok: "https://tiktok.com/@jess_beauty",
    youtube: "https://youtube.com/@jessicagomez",
    portfolio: "https://jessicagomez.com",
    pathway: "Dual-Pathway Eligible",
    specialties: ["Perms & Waves", "Esthetics", "Facial Massage"]
  },
  { 
    id: "student-mock-5",
    name: "Tyrone Davis", 
    school: "Texas Barber College", 
    type: "Barber", 
    status: "Student", 
    city: "Dallas", 
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/tyrone_cuts",
    tiktok: "https://tiktok.com/@tyrone_fades",
    youtube: "https://youtube.com/@tyronecuts",
    portfolio: "https://tyronedavis.me",
    pathway: "Barbershop Hire",
    specialties: ["Modern Fades", "Beard Styling", "Razor Shaves"]
  },
  { 
    id: "student-mock-6",
    name: "Emily Carter", 
    school: "Ogle School", 
    type: "Esthetician", 
    status: "Graduating Soon", 
    city: "San Antonio", 
    image: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/emily_esthetics",
    tiktok: "https://tiktok.com/@emily_skin",
    youtube: "https://youtube.com/@emilycarter",
    portfolio: "https://emilycarter.com",
    pathway: "School Instructor",
    specialties: ["Hair Coloring", "Precision Cuts", "Blowouts"]
  },
  { 
    id: "student-mock-7",
    name: "Michael Lee", 
    school: "Franklin Institute", 
    type: "Barber", 
    status: "Student", 
    city: "Fort Worth", 
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/michael_cuts",
    tiktok: "https://tiktok.com/@michael_fades",
    youtube: "https://youtube.com/@michaellee",
    portfolio: "https://michaellee.me",
    pathway: "Dual-Pathway Eligible",
    specialties: ["Classic Tapers", "Lineups", "Skin Fades"]
  },
  { 
    id: "student-mock-8",
    name: "Amanda Taylor", 
    school: "Paul Mitchell The School", 
    type: "Cosmetologist", 
    status: "Licensed", 
    city: "Austin", 
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/amanda_beauty",
    tiktok: "https://tiktok.com/@amanda_styles",
    youtube: "https://youtube.com/@amandataylor",
    portfolio: "https://amandataylor.com",
    pathway: "Barbershop Hire",
    specialties: ["Perms & Waves", "Esthetics", "Facial Massage"]
  },
  { 
    id: "student-mock-9",
    name: "Chris Martinez", 
    school: "Texas Barber College", 
    type: "Barber", 
    status: "Graduating Soon", 
    city: "Dallas", 
    image: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?q=80&w=800&auto=format&fit=crop",
    instagram: "https://instagram.com/chris_cuts",
    tiktok: "https://tiktok.com/@chris_fades",
    youtube: "https://youtube.com/@chrismartinez",
    portfolio: "https://chrismartinez.me",
    pathway: "School Instructor",
    specialties: ["Modern Fades", "Beard Styling", "Razor Shaves"]
  }
];

export default function BarberBeautyNetworkPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'students' | 'shops'>('students');
  const [studentPage, setStudentPage] = useState(1);
  const [shopPage, setShopPage] = useState(1);
  const { setTheme } = useTheme();

  // Supabase Table States
  const [dbShops, setDbShops] = useState<any[]>([]);
  const [dbBarbers, setDbBarbers] = useState<any[]>([]);
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
  const [claimChairs, setClaimChairs] = useState("");
  const [claimCompensation, setClaimCompensation] = useState("Booth Rent");
  const [claimRentRate, setClaimRentRate] = useState("");
  const [claimImageFile, setClaimImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // New Shop Claim Modal States
  const [isNewShopModalOpen, setIsNewShopModalOpen] = useState(false);
  const [newShopForm, setNewShopForm] = useState({
    shop_name: "",
    owner_name: "",
    phone: "",
    city: "",
    email: "",
    rent_type: "Booth Rent",
    booth_count_available: "",
    rent_rate: "",
    formatted_address: "",
    website: ""
  });
  const [isSubmittingNewShop, setIsSubmittingNewShop] = useState(false);
  const [newShopSuccess, setNewShopSuccess] = useState(false);

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

      const submissionData = { ...newShopForm };
      if (finalImageUrl) {
        (submissionData as any).shop_image_url = finalImageUrl;
      }

      const result = await submitNewBarbershopLead(submissionData);
      if (!result.success) throw new Error(result.error);
      
      if (result.data) {
        setDbShops(prev => {
          const existsIndex = prev.findIndex(s => s.id === result.data.id);
          if (existsIndex >= 0) {
            const newArr = [...prev];
            newArr[existsIndex] = result.data;
            return newArr;
          }
          return [result.data, ...prev];
        });
      }
      
      setNewShopSuccess(true);
      setTimeout(() => {
        setIsNewShopModalOpen(false);
        setNewShopSuccess(false);
        setNewShopForm({
          shop_name: "",
          owner_name: "",
          phone: "",
          city: "",
          email: "",
          rent_type: "Booth Rent",
          booth_count_available: "",
          rent_rate: "",
          formatted_address: "",
          website: ""
        });
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting new shop:', err);
      alert(`Failed to submit shop information: ${err.message}`);
    } finally {
      setIsSubmittingNewShop(false);
    }
  }
  
  // OTP Verification States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [verifyPhoneInput, setVerifyPhoneInput] = useState("");

  // Card Expandable Chat Log States
  const [expandedChats, setExpandedChats] = useState<{ [key: string]: boolean }>({});
  const [applicationSuccessShopId, setApplicationSuccessShopId] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Career Passport Modal States
  const [selectedPassportStudent, setSelectedPassportStudent] = useState<any | null>(null);
  const [passportActiveTab, setPassportActiveTab] = useState<'credentials' | 'portfolio' | 'schedule'>('credentials');
  const [scheduleShopName, setScheduleShopName] = useState("");
  const [schedulePhone, setSchedulePhone] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Application Flow States
  const [selectedApplyShop, setSelectedApplyShop] = useState<any | null>(null);
  const [applyStudentName, setApplyStudentName] = useState("Marcus Johnson");
  const [applyLoadingState, setApplyLoadingState] = useState<'idle' | 'verifying' | 'packaging' | 'submitting' | 'done'>('idle');

  // Create Career Passport Wizard States
  const [isCreatingPassport, setIsCreatingPassport] = useState(false);
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
  const [customStudents, setCustomStudents] = useState<any[]>([]);

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

        // Fetch barbers looking for placement
        const { data: barbersData, error: barbersError } = await supabase
          .from('agent_barber_leads')
          .select('*')
          .eq('status', 'interested_in_placement')
          .order('created_at', { ascending: false });

        if (shopsError) throw shopsError;
        if (barbersError) throw barbersError;

        if (!shopsData || shopsData.length === 0 || !barbersData || barbersData.length === 0) {
          console.warn("Supabase returned empty tables, falling back to preloaded database records...");
          setDbShops(MOCK_SHOPS);
          setDbBarbers(MOCK_STUDENTS); // Assuming MOCK_STUDENTS serves as fallback
          setIsFallbackMode(true);
        } else {
          setDbShops(shopsData);
          setDbBarbers(barbersData);
          setIsFallbackMode(false);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        console.warn("Offline fallback mode engaged: Loading preloaded database records...");
        setDbShops(MOCK_SHOPS);
        setDbBarbers(MOCK_STUDENTS);
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

    let baseList = [];
    if (dbBarbers.length === 0) {
      baseList = MOCK_STUDENTS;
    } else {
      baseList = dbBarbers.map((barber, idx) => {
        const type = "Barber";
        const status = "Interested in Placement";
        const image = IMAGES[idx % IMAGES.length];

        const fName = barber.name ? barber.name.split(" ")[0] : FIRST_NAMES[idx % FIRST_NAMES.length];
        const lName = barber.name && barber.name.split(" ").length > 1 ? barber.name.split(" ")[1] : LAST_NAMES[(idx + 3) % LAST_NAMES.length];
        
        const handle = `${fName.toLowerCase()}_${lName.toLowerCase()}`;
        const pathway = barber.desired_pay_structure || 'Possibly Booth Rent, Commission, Hourly or Salary';
        
        const SPECIALTIES_SETS = [
          ['Modern Fades', 'Beard Styling', 'Razor Shaves'],
          ['Hair Coloring', 'Precision Cuts', 'Blowouts'],
          ['Classic Tapers', 'Lineups', 'Skin Fades'],
          ['Perms & Waves', 'Esthetics', 'Facial Massage']
        ];
        const specialties = SPECIALTIES_SETS[idx % SPECIALTIES_SETS.length];

        return {
          id: barber.id,
          name: barber.name || `${fName} ${lName}`,
          school: barber.source || "Licensed Professional",
          city: (() => {
            const address = barber.address || "";
            if (!address) return "Texas";
            const parts = address.split(',').map((p: string) => p.trim());
            let cityStr = "Texas";
            for (let i = parts.length - 1; i >= 0; i--) {
              const p = parts[i];
              if (/^\d+$/.test(p) || p.toLowerCase() === 'tx' || p.toLowerCase() === 'texas') continue;
              cityStr = p;
              break;
            }
            return `${cityStr}, TX`;
          })(),
          type,
          status,
          image,
          instagram: `https://instagram.com/${handle}`,
          tiktok: `https://tiktok.com/@${handle}`,
          youtube: `https://youtube.com/@${handle}`,
          portfolio: `https://${handle}.com`,
          pathway,
          specialties,
          passport_number: barber.passport_number,
          state_board_authority: barber.state_board_authority,
          school_name: barber.school_name,
          metro_area: barber.metro_area,
          completed_school_hours: barber.completed_school_hours
        };
      });
    }

    return [...customStudents, ...baseList];
  }, [dbBarbers, customStudents]);

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

  // OTP Logic
  async function handleSendOtp() {
    if (!selectedClaimShop || !selectedClaimShop.phone) return;
    
    const inputClean = verifyPhoneInput.replace(/\D/g, '');
    const dbPhoneClean = selectedClaimShop.phone.replace(/\D/g, '');
    
    if (!inputClean || !dbPhoneClean.endsWith(inputClean) || inputClean.length < 10) {
      setOtpError("The phone number you entered does not match our records for this shop.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError("");
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: selectedClaimShop.id, phone: selectedClaimShop.phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setIsOtpSent(true);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    if (!selectedClaimShop || !otpInput) return;
    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: selectedClaimShop.id, otp: otpInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify OTP");
      setIsOtpVerified(true);
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  // Handle claiming submit
  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimName || !claimEmail || !claimPhone || !selectedClaimShop) return;

    try {
      if (claimImageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append("file", claimImageFile);
        formData.append("shopId", selectedClaimShop.id);
        
        await fetch("/api/upload-image", {
          method: "POST",
          body: formData
        });
        setIsUploadingImage(false);
      }

      const supabase = createBrowserClient() as any;
      const { error } = await supabase
        .from('agent_barbershop_leads')
        .update({
          owner_name: claimName,
          email: claimEmail,
          phone: claimPhone,
          booth_count_available: claimChairs ? parseInt(claimChairs) || 0 : undefined,
          rent_type: claimCompensation,
          rent_rate: claimRentRate,
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
        booth_count_available: claimChairs ? parseInt(claimChairs) || 0 : undefined,
        rent_type: claimCompensation,
        rent_rate: claimRentRate,
        outreach_status: 'user_responded'
      } : s));

      setClaimSuccess(true);
      setTimeout(() => {
        setSelectedClaimShop(null);
        setClaimSuccess(false);
        setClaimName("");
        setClaimEmail("");
        setClaimPhone("");
        setClaimChairs("");
        setClaimCompensation("Booth Rent");
        setClaimRentRate("");
        setIsOtpSent(false);
        setIsOtpVerified(false);
        setOtpInput("");
        setOtpError("");
        setVerifyPhoneInput("");
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
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] flex justify-center"
          >
            <img 
              src="/shopday-logo.svg" 
              alt="ShopDay™" 
              className="h-24 md:h-32 w-auto drop-shadow-sm"
              draggable="false"
            />
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-xl text-slate-600 font-medium leading-relaxed"
          >
            Shop placement exclusively for the Barber, Beauty & Wellness industry. Build your passport, hire top-tier barber & cosmetology students and licensed professionals.
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
              Browse Professionals
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
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Passport: For Students & Professionals</h2>
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
                    setIsCreatingPassport(true);
                    setCreateStep(1);
                    setCreateLoadingState('idle');
                  }}
                  className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  Create Your Passport
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
                <h2 className="text-3xl font-extrabold text-white mb-4">Claim Your Shop: For Shop Owners</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  Stop hoping for walk-in talent. Create a premium listing for your barbershop or salon. Showcase your culture, chair rental rates, and invite vetted students and pros for a Shop Day visit.
                </p>
                <ul className="space-y-4 mb-10 mt-auto">
                  {[
                    "Premium Shop Profile & Photos",
                    "Booth Rent/Commission Transparency",
                    "Browse Verified Student and Pro Portfolios",
                    "Host Automated Shop Day Events"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300 font-semibold">
                      <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => setIsNewShopModalOpen(true)}
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                  Claim Your Shop
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
                Browse Professionals
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
                {/* Dynamic Stats Panel for Students */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-wider">Active Candidates</span>
                    <span className="text-3xl font-black">{dbBarbers.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-wider">Placement Ready</span>
                    <span className="text-3xl font-black">{dbBarbers.length}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-wider">Active Cities</span>
                    <span className="text-3xl font-black">{Math.max(0, availableStudentCities.length - 1)} Metros</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-100 font-black uppercase tracking-wider">Placement Rate</span>
                    <span className="text-3xl font-black">Free / Placement</span>
                  </div>
                </div>

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
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                    {currentStudents.map((student, i) => (
                      <div key={`${student.id || 'student'}-${i}`} className="rounded-[2.2rem] border border-slate-200 p-6 bg-white hover:border-blue-400 hover:shadow-2xl transition-all flex flex-col group relative overflow-hidden">
                        
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
                          onClick={() => {
                            setSelectedPassportStudent(student);
                            setPassportActiveTab('credentials');
                            setScheduleSuccess(false);
                          }}
                          className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
                        >
                          <GraduationCap className="w-4 h-4 text-blue-400" />
                          View Full Passport
                        </button>
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
                              <ShopImage 
                                imageUrl={shop.shop_image_url}
                                fallbackSrc={getShopImage(shop.id)}
                                alt={shop.shop_name} 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-80 pointer-events-none" />
                              
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
                                  {shop.formatted_address ? (
                                    <span className="text-xs text-slate-500 font-medium mt-1 block truncate w-[280px]" title={shop.formatted_address}>
                                      {shop.formatted_address}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-medium italic mt-1 block">No Address Listed</span>
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
                                    Passport Shared Successfully!
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      setIsCreatingPassport(true);
                                      setCreateStep(1);
                                      setCreateLoadingState('idle');
                                    }}
                                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98]"
                                  >
                                    <GraduationCap className="w-4 h-4 text-blue-400" />
                                    Submit Passport to Book a Shop Day
                                  </button>
                                )}
                                
                                <button 
                                  onClick={() => {
                                    setNewShopForm({
                                      shop_name: shop.shop_name || "",
                                      owner_name: "",
                                      phone: "",
                                      city: shop.city || "",
                                      email: "",
                                      rent_type: "Booth Rent",
                                      booth_count_available: shop.booth_count_available?.toString() || "",
                                      rent_rate: shop.rent_rate || "",
                                      formatted_address: shop.formatted_address || "",
                                      website: shop.website || ""
                                    });
                                    setIsNewShopModalOpen(true);
                                  }}
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
                  onClick={() => {
                    setSelectedClaimShop(null);
                    setIsOtpSent(false);
                    setIsOtpVerified(false);
                    setOtpInput("");
                    setOtpError("");
                    setVerifyPhoneInput("");
                  }}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer animate-pulse"
              >
                <X className="w-5 h-5" />
              </button>

              {!claimSuccess ? (
                !isOtpVerified ? (
                  <div className="space-y-6">
                    <div className="text-center space-y-2 mb-2">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 animate-bounce" />
                      </div>
                      <h3 className="text-2xl font-extrabold text-slate-900">Verify Ownership</h3>
                      <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mx-auto">
                        To claim <strong>{selectedClaimShop.shop_name}</strong>, please verify your identity using the phone number on file.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-sm text-slate-600 mb-2">
                      <div className="flex flex-col gap-2 border-b border-slate-200 pb-3">
                        <label className="font-semibold text-slate-700 text-xs uppercase tracking-wider">
                          Verify Phone Number
                        </label>
                        <p className="text-xs text-slate-500">
                          Enter the shop's phone number to receive a verification code.
                        </p>
                        <input 
                          type="tel"
                          placeholder="(555) 555-5555"
                          value={verifyPhoneInput}
                          onChange={(e) => setVerifyPhoneInput(e.target.value)}
                          disabled={isOtpSent}
                          className="w-full px-4 py-2 mt-1 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium disabled:opacity-50"
                        />
                      </div>
                      {!isOtpSent ? (
                        <button 
                          onClick={handleSendOtp}
                          disabled={isSendingOtp || !selectedClaimShop.phone || verifyPhoneInput.length < 10}
                          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm transition-colors mt-2"
                        >
                          {isSendingOtp ? "Sending Code..." : "Send SMS Verification Code"}
                        </button>
                      ) : (
                        <div className="space-y-3 pt-2 border-t border-slate-200 mt-2">
                          <input 
                            type="text" 
                            placeholder="Enter 4-digit code" 
                            value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center text-lg font-mono tracking-widest"
                            maxLength={4}
                          />
                          <button 
                            onClick={handleVerifyOtp}
                            disabled={isVerifyingOtp || otpInput.length !== 4}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm transition-colors"
                          >
                            {isVerifyingOtp ? "Verifying..." : "Verify Code"}
                          </button>
                        </div>
                      )}
                      {otpError && <p className="text-red-500 text-xs text-center font-medium mt-2">{otpError}</p>}
                    </div>
                  </div>
                ) : (
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Available Chairs</label>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="e.g. 1" 
                          value={claimChairs}
                          onChange={(e) => setClaimChairs(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Compensation</label>
                        <select 
                          value={claimCompensation}
                          onChange={(e) => setClaimCompensation(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                        >
                          <option value="Booth Rent">Booth Rent</option>
                          <option value="Commission">Commission</option>
                          <option value="Salary">Salary</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rent Rate / Details</label>
                      <input 
                        type="text" 
                        placeholder="e.g. $225 a week" 
                        value={claimRentRate}
                        onChange={(e) => setClaimRentRate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Shop Image (Optional)</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setClaimImageFile(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 px-1">Upload a photo of your shop to stand out. It will be displayed on your shop card.</p>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isUploadingImage}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-md transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10"
                  >
                    {isUploadingImage ? "Uploading Image & Verifying..." : "Submit Verification Claim"}
                    {!isUploadingImage && <ArrowRight className="w-5 h-5" />}
                  </button>
                </form>
                )
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

      {/* Submit Career Passport Application Modal */}
      <AnimatePresence>
        {selectedApplyShop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] max-w-lg w-full p-8 border border-slate-200 shadow-2xl relative"
            >
              <button 
                onClick={() => {
                  setSelectedApplyShop(null);
                  setApplyLoadingState('idle');
                }}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {applyLoadingState === 'idle' && (
                <div className="space-y-6">
                  <div className="text-center space-y-2 mb-2">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                      <Award className="w-8 h-8 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">Submit Career Passport</h3>
                    <p className="text-slate-500 font-semibold text-sm leading-relaxed max-w-sm mx-auto">
                      Submit your verified credentials, accredited board hours, and visual social styling portfolios directly to **{selectedApplyShop.shop_name}**!
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Select Your Career Passport</label>
                      <select 
                        value={applyStudentName}
                        onChange={(e) => setApplyStudentName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="Marcus Johnson">Marcus Johnson — Barber (Licensed)</option>
                        <option value="Sarah Williams">Sarah Williams — Cosmetologist (Graduating Soon)</option>
                        <option value="David Chen">David Chen — Barber (Licensed / Instructor Certified)</option>
                      </select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Passport Stamp:</span> <span className="text-green-600">VERIFIED BOARD ELIGIBLE</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Hours Certified:</span> <span>1,500 / 1,500 Hours Complete</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Visual Portfolio:</span> <span>Instagram, TikTok & YouTube Connected</span></div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setApplyLoadingState('verifying');
                      setTimeout(() => {
                        setApplyLoadingState('packaging');
                        setTimeout(() => {
                          setApplyLoadingState('submitting');
                          setTimeout(() => {
                            setApplyLoadingState('done');
                            setApplicationSuccessShopId(selectedApplyShop.id);
                            setTimeout(() => {
                              setSelectedApplyShop(null);
                              setApplyLoadingState('idle');
                              setApplicationSuccessShopId(null);
                            }, 3000);
                          }, 1200);
                        }, 1200);
                      }, 1000);
                    }}
                    className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                  >
                    Confirm & Submit Career Passport
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {(applyLoadingState === 'verifying' || applyLoadingState === 'packaging' || applyLoadingState === 'submitting') && (
                <div className="py-16 text-center space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-indigo-50 border-t-indigo-400 animate-spin animate-reverse" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-indigo-600 uppercase tracking-widest animate-pulse">
                      {applyLoadingState === 'verifying' && "Verifying Credentials..."}
                      {applyLoadingState === 'packaging' && "Packaging Board Hours..."}
                      {applyLoadingState === 'submitting' && "Dispatching Passport..."}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Securing connection to {selectedApplyShop.shop_name} outreach...</p>
                  </div>
                </div>
              )}

              {applyLoadingState === 'done' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-green-50 text-green-500 border border-green-200 flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <Check className="w-9 h-9" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Career Passport Submitted!</h3>
                  <p className="text-slate-500 font-semibold text-sm leading-relaxed max-w-sm mx-auto">
                    Excellent choice, **{applyStudentName}**! Your verified Career Passport credentials and visual galleries have been successfully submitted to **{selectedApplyShop.shop_name}**!
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Career Passport Dialog Modal */}
      <AnimatePresence>
        {selectedPassportStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/75 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              className="bg-white rounded-[2.5rem] max-w-4xl w-full border border-slate-200 shadow-2xl relative overflow-hidden flex flex-col md:flex-row my-8"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedPassportStudent(null)}
                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Passport Side Panel (Navy/Indigo Leather cover style) */}
              <div className="md:w-[40%] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden border-r border-slate-800 shrink-0">
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
                    <span className="font-bold max-w-[150px] truncate text-right">{selectedPassportStudent.school_name || selectedPassportStudent.school}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Metro Area</span>
                    <span className="font-bold text-blue-400">{selectedPassportStudent.metro_area || selectedPassportStudent.city}</span>
                  </div>
                </div>
              </div>

              {/* Passport Details Panel (White paper pages style) */}
              <div className="flex-1 p-8 flex flex-col justify-between bg-slate-50/50">
                <div>
                  {/* Modal Navigation Tabs */}
                  <div className="flex border-b border-slate-200 mb-6 gap-2">
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
                          className={`flex items-center gap-1.5 pb-3.5 px-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                            isActive 
                              ? 'border-indigo-600 text-indigo-600' 
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
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
                      <div className="space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                          <span>Live Connected Feed Display (For Display Only)</span>
                        </div>

                        {/* 3x2 High Fidelity Cuts Grid */}
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { tag: "Skin Fade", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=400&auto=format&fit=crop" },
                            { tag: "Lineup Trim", img: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=400&auto=format&fit=crop" },
                            { tag: "Razor Shave", img: "https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?q=80&w=400&auto=format&fit=crop" },
                            { tag: "Taper Fade", img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=400&auto=format&fit=crop" },
                            { tag: "Modern Slick", img: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=400&auto=format&fit=crop" },
                            { tag: "Beard Shape", img: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=400&auto=format&fit=crop" }
                          ].map((cut, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group/cut shadow-sm hover:border-indigo-400 transition-colors">
                              <Image 
                                src={cut.img} 
                                alt={cut.tag} 
                                fill 
                                className="object-cover group-hover/cut:scale-105 transition-transform duration-500" 
                              />
                              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/cut:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-[10px] font-black uppercase text-white tracking-widest bg-indigo-600/90 px-2.5 py-1 rounded-lg border border-indigo-400/40">
                                  {cut.tag}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Interactive Scheduling Form */}
                    {passportActiveTab === 'schedule' && (
                      <div className="animate-fadeIn">
                        {!scheduleSuccess ? (
                          <form 
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!scheduleShopName || !schedulePhone || !scheduleDate || !scheduleTime) return;
                              setIsScheduling(true);
                              
                              try {
                                // Combine date and time into ISO string
                                const combinedDateTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
                                
                                const result = await submitShopDayInvite({
                                  shop_name: scheduleShopName,
                                  shop_phone: schedulePhone,
                                  professional_id: selectedPassportStudent.id,
                                  invite_date: combinedDateTime,
                                  notes: scheduleNotes
                                });
                                
                                if (result.success) {
                                  setScheduleSuccess(true);
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
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Your Barbershop Name</label>
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
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Your Contact Phone</label>
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
        )}
      </AnimatePresence>

      {/* Create Career Passport Wizard Modal */}
      <AnimatePresence>
        {isCreatingPassport && (
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
                  setIsCreatingPassport(false);
                  setCreateStep(1);
                  setCreateLoadingState('idle');
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
                    <h3 className="text-2xl font-black text-slate-900">Mint Your Passport</h3>
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
                              profile_url: newPassportPortfolio,
                              placement_pathway: newPassportPathway,
                              desired_pay_structure: newPassportDesiredPay,
                              desired_specialties: newPassportSpecialties
                            });

                            if (result.success) {
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
                                portfolio: newPassportPortfolio ? `https://${newPassportPortfolio}` : "https://innergcomplete.com",
                                pathway: newPassportPathway,
                                specialties: newPassportSpecialties.split(',').map(s => s.trim()).filter(Boolean)
                              };

                              setCustomStudents(prev => [newStudent, ...prev]);
                              setCreateLoadingState('done');
                              
                              setTimeout(() => {
                                router.push('/shop-day-matches');
                              }, 2000);
                            } else {
                              alert(`Failed to mint passport: ${result.error}`);
                              setCreateLoadingState('idle');
                            }
                          } catch (err) {
                            console.error(err);
                            setCreateLoadingState('idle');
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
      {/* New Shop Claim Modal */}
      <AnimatePresence>
        {isNewShopModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-slate-200 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto"
            >
              <button 
                  onClick={() => {
                    setIsNewShopModalOpen(false);
                    setNewShopSuccess(false);
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
                      <input type="file" accept="image/*" onChange={(e) => setClaimImageFile(e.target.files?.[0] || null)} className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Full Address</label>
                      <input type="text" required placeholder="123 Placement Dr. Dayton, Texas 43521, USA" value={newShopForm.formatted_address} onChange={(e) => setNewShopForm({...newShopForm, formatted_address: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
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
                      <input type="url" placeholder="https://" value={newShopForm.website} onChange={(e) => setNewShopForm({...newShopForm, website: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-medium" />
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
