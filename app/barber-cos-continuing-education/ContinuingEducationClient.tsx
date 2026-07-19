"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import {
  Sparkles,
  BookOpen,
  Clock,
  Award,
  Star,
  Search,
  Play,
  Check,
  X,
  GraduationCap,
  Lock,
  Unlock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  Mail,
  ShieldCheck,
  Video,
  FileText,
  Bookmark
} from 'lucide-react';

interface RawSchool {
  license_type: string;
  license_number: string;
  business_county: string;
  business_name: string;
  business_address_line1: string;
  business_city_state_zip: string;
  business_telephone: string;
  owner_name: string;
}

interface ContinuingEducationClientProps {
  schools: RawSchool[];
  errorMsg: string;
}

interface Course {
  id: string;
  title: string;
  category: string;
  hours: number;
  tdlrApprovalCode: string;
  description: string;
  instructorName: string;
  instructorTitle: string;
  rating: number;
  studentCount: number;
  videoDuration: string;
  coverUrl: string;
  lessons: { title: string; duration: string }[];
}

const CE_COURSES: Course[] = [
  {
    id: "exam-prep-infection-control",
    title: "State Board Mastery: Infection Control & Safe Working Practices",
    category: "EXAM PREP & SANITATION",
    hours: 1.5,
    tdlrApprovalCode: "TDLR-EXAM-101-2026",
    description: "Crucial preparation for the largest domain on the written exam. Master bacteriology, OSHA standards, EPA-registered disinfectants, exposure incidents, and cross-contamination prevention. Dual-purposed for your mandatory sanitation CE hours.",
    instructorName: "DR. ALAN STERLING",
    instructorTitle: "State Board Examiner & Infection Control Expert",
    rating: 5.0,
    studentCount: 14205,
    videoDuration: "1h 35m",
    coverUrl: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop&q=80",
    lessons: [
      { title: "Bacteriology & Virology for Barbers", duration: "25:00" },
      { title: "OSHA, SDS & EPA-Registered Disinfectants", duration: "20:30" },
      { title: "Standard Precautions & Blood Spill Procedures", duration: "25:15" },
      { title: "Exam Simulator: Infection Control Drills", duration: "24:15" }
    ]
  },
  {
    id: "exam-prep-anatomy-chemistry",
    title: "State Board Mastery: Anatomy, Physiology & Chemical Mechanics",
    category: "EXAM PREP & SCIENCE",
    hours: 2.0,
    tdlrApprovalCode: "TDLR-EXAM-201-2026",
    description: "Decode the complex scientific questions on the state board. Review skeletal and muscular systems of the head, face, and neck. Master the pH scale, cosmetic chemistry, and the chemical mechanics of perms and relaxers.",
    instructorName: "SARAH VANDERBILT",
    instructorTitle: "Master Cosmetologist & Science Educator",
    rating: 4.8,
    studentCount: 9840,
    videoDuration: "1h 50m",
    coverUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop&q=80",
    lessons: [
      { title: "Nerves, Muscles & Bones of the Head/Neck", duration: "30:00" },
      { title: "The pH Scale & Cosmetic Chemistry", duration: "25:40" },
      { title: "Chemical Restructuring & Keratin Bonds", duration: "35:20" },
      { title: "Exam Simulator: Science & Chemistry Drills", duration: "19:00" }
    ]
  },
  {
    id: "exam-prep-texas-laws",
    title: "State Board Mastery: Texas Barber Laws & TDLR Regulations",
    category: "EXAM PREP & BUSINESS",
    hours: 1.0,
    tdlrApprovalCode: "TDLR-EXAM-301-2026",
    description: "Ensure you don't fail on regulatory technicalities. A comprehensive breakdown of TDLR Chapter 82, facility licensing requirements, inspector compliance, prohibited practices, and license renewal procedures.",
    instructorName: "MARCUS JENKINS",
    instructorTitle: "TDLR Compliance Consultant",
    rating: 4.9,
    studentCount: 18211,
    videoDuration: "1h 10m",
    coverUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80",
    lessons: [
      { title: "Chapter 82 & Barbering Statutes", duration: "15:00" },
      { title: "Facility Licensing & Inspection Readiness", duration: "20:30" },
      { title: "License Renewals & Prohibited Practices", duration: "18:40" },
      { title: "Exam Simulator: Texas Law Drills", duration: "15:50" }
    ]
  },
  {
    id: "exam-prep-shaving-design",
    title: "State Board Mastery: Shaving & Facial Hair Design",
    category: "EXAM PREP & DESIGN",
    hours: 1.5,
    tdlrApprovalCode: "TDLR-EXAM-401-2026",
    description: "A deep dive into the 14 shaving areas of the face. Master straight razor techniques, stroke patterns (freehand, backhand, reverse), skin tensioning, and mustache/beard design geometry required to pass the written exam.",
    instructorName: "LACHAYA MONIEK WRIGHT",
    instructorTitle: "Master Shave Barber, G.A. Beauty",
    rating: 5.0,
    studentCount: 11530,
    videoDuration: "1h 35m",
    coverUrl: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&auto=format&fit=crop&q=80",
    lessons: [
      { title: "The 14 Shaving Areas & Stroke Patterns", duration: "25:00" },
      { title: "Straight Razor Handling & Tension Mechanics", duration: "30:00" },
      { title: "Facial Hair Geometry & Beard Design", duration: "20:00" },
      { title: "Exam Simulator: Shaving Protocol Drills", duration: "20:00" }
    ]
  },
  {
    id: "exam-prep-hair-cutting",
    title: "State Board Mastery: Hair Cutting & Styling Theory",
    category: "EXAM PREP & DESIGN",
    hours: 1.5,
    tdlrApprovalCode: "TDLR-EXAM-501-2026",
    description: "Master the foundational theory of haircutting. Covers elevation degrees, overdirection, reference points, texturizing tool usage, and thermal styling safety required for state board mastery.",
    instructorName: "RAY ROWELL",
    instructorTitle: "Lead Styling Instructor, Premier Barber School",
    rating: 4.8,
    studentCount: 8940,
    videoDuration: "1h 45m",
    coverUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80",
    lessons: [
      { title: "Elevation Angles & Reference Points", duration: "25:10" },
      { title: "Shear, Clipper & Razor Cutting Theory", duration: "35:00" },
      { title: "Thermal Styling & Blow-Drying Physics", duration: "25:00" },
      { title: "Exam Simulator: Haircutting Theory Drills", duration: "19:50" }
    ]
  },
  {
    id: "exam-prep-hair-scalp-care",
    title: "State Board Mastery: Hair & Scalp Disorders",
    category: "EXAM PREP & SCIENCE",
    hours: 1.0,
    tdlrApprovalCode: "TDLR-EXAM-601-2026",
    description: "Crucial diagnostic theory. Learn to identify alopecia, tinea capitis, pityriasis, and trichoptilosis. Master draping procedures, scalp massage manipulations, and shampoo chemistry to answer diagnostic board questions accurately.",
    instructorName: "AARON WAAJID",
    instructorTitle: "Trichology Specialist",
    rating: 4.9,
    studentCount: 6710,
    videoDuration: "1h 15m",
    coverUrl: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&auto=format&fit=crop&q=80",
    lessons: [
      { title: "Identifying Scalp Disorders & Parasites", duration: "20:00" },
      { title: "Hair Growth Cycles & Types of Alopecia", duration: "25:00" },
      { title: "Draping, Shampooing & Massage Manipulations", duration: "15:00" },
      { title: "Exam Simulator: Scalp Diagnosis Drills", duration: "15:00" }
    ]
  }
];

export default function ContinuingEducationClient({ schools, errorMsg }: ContinuingEducationClientProps) {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Modals state
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [showRegGate, setShowRegGate] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');

  // Registration Form Fields
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    licenseNumber: '',
    schoolName: '',
    password: ''
  });

  // Simulated Active Learning States
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [playProgress, setPlayProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter courses based on category and query search
  const filteredCourses = useMemo(() => {
    return CE_COURSES.filter(course => {
      const matchesCategory = selectedCategory === 'ALL' || course.category === selectedCategory;
      const matchesSearch = 
        course.title.toUpperCase().includes(searchQuery.toUpperCase()) ||
        course.instructorName.toUpperCase().includes(searchQuery.toUpperCase()) ||
        course.tdlrApprovalCode.toUpperCase().includes(searchQuery.toUpperCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Handle playing / viewing trigger in Skool modal
  const handlePlayLesson = (idx: number) => {
    if (!isRegistered) {
      setAuthMode('register');
      setShowRegGate(true);
    } else {
      setSelectedLessonIdx(idx);
      setPlayProgress(0);
      setIsPlaying(true);
    }
  };

  // Simulated play video progress loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && isRegistered) {
      interval = setInterval(() => {
        setPlayProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 2.5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isRegistered]);

  // Handle successful registration
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API registration lag
    setTimeout(() => {
      setIsRegistered(true);
      setShowRegGate(false);
      // Automatically trigger play state for the selected lesson upon success
      setIsPlaying(true);
      setPlayProgress(0);
    }, 800);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-primary/20 light">
      <Navbar />
      {/* Hero Header */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-28 pb-12 lg:pb-16">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 gap-6 border-b border-slate-100 pb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-[10px]">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Accredited CE Academy
            </div>
            <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter text-slate-950 leading-tight">
              Continuing Education <br />Portal & Registrar™
            </h1>
            <p className="text-sm font-bold text-slate-600 max-w-xl leading-relaxed">
              Maintain your active Texas grooming licensure with ease. Browse our state-board approved 2026 course catalog, watch immersive styling modules, and earn verified TDLR continuing education credits instantly.
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6 flex items-center gap-4 max-w-xs w-full">
            <Award className="h-10 w-10 text-primary shrink-0 animate-bounce" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">State Registry Status</p>
              <p className="text-xl font-black italic text-slate-950">TDLR Approved <span className="text-[10px] not-italic text-emerald-500 font-black uppercase block mt-1">● 100% COMPLIANT</span></p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-center gap-4 mb-10 text-red-800">
            <X className="h-6 w-6 shrink-0 text-red-500" />
            <p className="text-sm font-bold">{errorMsg}</p>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8 bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {['ALL', 'EXAM PREP & SANITATION', 'EXAM PREP & SCIENCE', 'EXAM PREP & DESIGN', 'EXAM PREP & BUSINESS'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                  selectedCategory === cat
                    ? "bg-slate-950 border-slate-950 text-white font-black scale-105 shadow-md shadow-slate-200"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80 shrink-0">
            <input
              type="text"
              placeholder="SEARCH COURSE, INSTRUCTOR, CODE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-[10px] font-bold tracking-widest placeholder-slate-400 text-slate-900 focus:outline-none focus:border-primary uppercase"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>

        {/* Course Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredCourses.length > 0 ? (
            filteredCourses.map(course => (
              <div
                key={course.id}
                onClick={() => {
                  setActiveCourse(course);
                  setSelectedLessonIdx(0);
                  setPlayProgress(0);
                  setIsPlaying(false);
                }}
                className="bg-white border border-slate-100 rounded-[2.2rem] overflow-hidden hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                {/* Thumbnail Header */}
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <Image
                    src={course.coverUrl}
                    alt={course.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  {/* Category Tag */}
                  <div className="absolute top-4 left-4 flex gap-1.5">
                    <span className="bg-slate-950/80 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                      {course.category}
                    </span>
                    <span className="bg-primary text-slate-950 text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                      {course.hours} {course.hours === 1.0 ? 'Hour' : 'Hours'}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[10px]">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>{course.rating.toFixed(1)}</span>
                      <span className="text-slate-400 font-normal">({course.studentCount.toLocaleString()} alumni)</span>
                    </div>

                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>

                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                  </div>

                  <div className="space-y-4 border-t border-slate-50 pt-4">
                    {/* Instructor Info */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Instructor: <b className="text-slate-700">{course.instructorName}</b></span>
                    </div>

                    {/* Action Button */}
                    <div className="w-full bg-slate-50 rounded-xl py-3 px-4 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-800 group-hover:bg-primary group-hover:text-slate-950 transition-all">
                      <span>Explore Classroom</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-slate-50 border border-slate-100 rounded-[2.5rem] p-12 text-center text-slate-500 space-y-2">
              <BookOpen className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold uppercase tracking-widest">No Continuing Education courses found.</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Try modifying your category filter or keyword query search.</p>
            </div>
          )}
        </div>
      </div>

      {/* 1. SKOOL-STYLE CLASSROOM COURSE MODAL */}
      {activeCourse && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 w-full max-w-5xl rounded-[2.5rem] relative max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Top Bar */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <span className="bg-slate-950 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{activeCourse.category}</span>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sovereign Classroom Gateway</span>
              </div>
              <button
                onClick={() => {
                  setActiveCourse(null);
                  setIsPlaying(false);
                }}
                className="text-slate-400 hover:text-slate-950 text-xs font-black uppercase tracking-widest p-1"
              >
                [ Close ]
              </button>
            </div>

            {/* Modal Columns Container */}
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
              
              {/* LEFT COLUMN: Main Learning Player & Syllabus */}
              <div className="flex-1 p-8 space-y-6 lg:border-r lg:border-slate-100">
                
                {/* Dynamic Screen Area (Simulating locked / active streaming state) */}
                <div className="relative aspect-video w-full bg-slate-950 rounded-[2rem] overflow-hidden group shadow-lg flex items-center justify-center select-none">
                  {(!isRegistered || !isPlaying) ? (
                    // LOCKED GATED PREVIEW COVER
                    <>
                      <Image
                        src={activeCourse.coverUrl}
                        alt="Course Video Locked Cover"
                        fill
                        className="object-cover opacity-35 filter blur-xs"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-slate-900/60" />
                      
                      {/* Play overlay button */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4 z-10">
                        <button 
                          onClick={() => handlePlayLesson(selectedLessonIdx)}
                          className="h-16 w-16 bg-primary text-slate-950 rounded-full flex items-center justify-center shadow-2xl shadow-primary/20 hover:scale-105 transition-all group-hover:bg-white"
                        >
                          <Play className="h-6 w-6 shrink-0 fill-slate-950 text-slate-950 ml-1" />
                        </button>
                        <div className="space-y-1">
                          <p className="text-white text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-1.5">
                            <Lock className="h-3 w-3 text-primary animate-pulse" />
                            Gated Continuing Education Stream
                          </p>
                          <p className="text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                            Watch to earn your official <b>{activeCourse.hours} Hour</b> TDLR credit!
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    // UNLOCKED STATE: SIMULATED VIDEO PLAYER
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white space-y-6">
                      <div className="absolute top-6 left-8 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                        <span className="text-[8px] font-mono tracking-widest text-red-500 uppercase font-black">STREAMING CORE CONTENT</span>
                      </div>

                      <div className="space-y-2">
                        <Video className="h-12 w-12 text-primary mx-auto animate-pulse" />
                        <h4 className="text-sm font-black uppercase tracking-wider">{activeCourse.lessons[selectedLessonIdx].title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lesson Duration: {activeCourse.lessons[selectedLessonIdx].duration}</p>
                      </div>

                      {/* Video Player Progress and Stats */}
                      <div className="w-full max-w-sm space-y-2">
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${playProgress}%` }}
                          />
                        </div>
                        <div className="flex justify-between font-mono text-[9px] text-slate-400">
                          <span>{playProgress < 100 ? `ACCRUING CE CREDIT... ${Math.round(playProgress)}%` : 'COMPLETED'}</span>
                          <span>{playProgress < 100 ? 'ACTIVE WATCH' : 'CREDIT STAGED'}</span>
                        </div>
                      </div>

                      {playProgress >= 100 && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-in zoom-in-95">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                          Accredited hours generated! Database registry synchronized.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Course Metadata Tabs */}
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-950">
                      {activeCourse.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] font-bold leading-relaxed text-slate-500">
                    <div className="space-y-3">
                      <p className="uppercase"><b className="text-slate-800">Course Syllabus:</b><br /> {activeCourse.description}</p>
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned School Board Instructor</p>
                        <p className="text-[11px] font-black text-slate-900 uppercase italic">{activeCourse.instructorName}</p>
                        <p className="text-[9px] text-slate-500 uppercase leading-none">{activeCourse.instructorTitle}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="border border-slate-100 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center gap-2 font-black uppercase text-[10px] text-slate-900 tracking-widest">
                          <Award className="h-4 w-4 text-primary shrink-0" />
                          TDLR Accreditation
                        </div>
                        <ul className="space-y-2 text-[10px] uppercase text-slate-500">
                          <li>Accredited Course Hours: <b className="text-slate-800">{activeCourse.hours} CE Credit</b></li>
                          <li>Course Approval Code: <b className="text-slate-800">{activeCourse.tdlrApprovalCode}</b></li>
                          <li>Board Status: <b className="text-emerald-600">Active & Compliant</b></li>
                          <li>Accrediting Entity: <b className="text-slate-800">Inner G Complete Placement Agency</b></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Skool-style Classroom Lesson Sidebar */}
              <div className="w-full lg:w-80 bg-slate-50/50 shrink-0 p-8 flex flex-col justify-between border-t lg:border-t-0 border-slate-100 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Course Modules</span>
                    <span>{activeCourse.lessons.length} Lessons</span>
                  </div>

                  {/* List of lessons */}
                  <div className="space-y-2">
                    {activeCourse.lessons.map((lesson, idx) => {
                      const isSelected = selectedLessonIdx === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => handlePlayLesson(idx)}
                          className={`border rounded-2xl p-4 cursor-pointer select-none transition-all flex items-center justify-between group ${
                            isSelected 
                              ? "bg-slate-950 border-slate-950 text-white shadow-lg" 
                              : "bg-white border-slate-200/60 text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          <div className="space-y-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest block ${isSelected ? 'text-primary' : 'text-slate-400'}`}>
                              Lesson {idx + 1}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-tight leading-snug block line-clamp-2">
                              {lesson.title}
                            </span>
                            <span className={`text-[9px] font-mono flex items-center gap-1 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                              <Clock className="h-3 w-3 shrink-0" />
                              {lesson.duration}
                            </span>
                          </div>

                          <div className="shrink-0 pl-3">
                            {!isRegistered ? (
                              <Lock className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition-colors" />
                            ) : (
                              <Play className={`h-3.5 w-3.5 ${isSelected ? 'text-primary fill-primary' : 'text-slate-400'}`} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200/50 pt-4 text-center">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Verified State Board Registry</span>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* 2. REGISTRATION / LOGIN GATED MODAL */}
      {showRegGate && activeCourse && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 w-full max-w-md rounded-[2.5rem] p-8 sm:p-10 relative shadow-2xl">
            
            {/* Close Gate */}
            <button
              onClick={() => setShowRegGate(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-950 text-xs font-black uppercase tracking-widest"
            >
              [ Close ]
            </button>

            {authMode === 'register' ? (
              // REGISTRATION FORM
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    Continuing Education Gate
                  </div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Create CE Account</h2>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">
                    Register your active license to watch approved stream lessons, log course hours, and trigger automated TDLR board credits.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MARCUS JOHNSON"
                      value={regForm.name}
                      onChange={(e) => setRegForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. MARCUS@GMAIL.COM"
                      value={regForm.email}
                      onChange={(e) => setRegForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Award className="h-3 w-3" /> State Board License Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Class A Barber / Cosmetology #"
                      value={regForm.licenseNumber}
                      onChange={(e) => setRegForm(prev => ({ ...prev, licenseNumber: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* dynamic accredited school registry select */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <GraduationCap className="h-3 w-3" /> Mapped Training School
                    </label>
                    <select
                      value={regForm.schoolName}
                      onChange={(e) => setRegForm(prev => ({ ...prev, schoolName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">-- SELECT REAL ACCREDITED SCHOOL --</option>
                      {schools.map(school => (
                        <option key={school.license_number} value={school.business_name}>
                          {school.business_name} ({school.business_county} COUNTY)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    className="w-full bg-primary text-slate-950 font-black uppercase tracking-[0.2em] text-[10px] py-4 px-8 rounded-2xl hover:bg-slate-950 hover:text-white transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    Unlock Course & Start Watching
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest">
                    Already registered?{" "}
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('login')} 
                      className="text-slate-950 font-black underline"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </form>
            ) : (
              // SIGN IN FORM
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[9px]">
                    <Unlock className="h-3.5 w-3.5 text-primary animate-pulse" />
                    Accredited CE Gate
                  </div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight">Practitioner Login</h2>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase">
                    Log in to unlock lessons and verify course hours.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. MARCUS@GMAIL.COM"
                      value={regForm.email}
                      onChange={(e) => setRegForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                      <Lock className="h-3 w-3" /> Account Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="●●●●●●●●●●"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold tracking-widest text-slate-900 uppercase placeholder-slate-400 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    className="w-full bg-primary text-slate-950 font-black uppercase tracking-[0.2em] text-[10px] py-4 px-8 rounded-2xl hover:bg-slate-950 hover:text-white transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    Unlock Course & Start Watching
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest">
                    Need an account?{" "}
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('register')} 
                      className="text-slate-950 font-black underline"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      <div className="text-center py-10">
        <Link href="/tools/barbershop-search" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>
      </div>
    </main>
  );
}
