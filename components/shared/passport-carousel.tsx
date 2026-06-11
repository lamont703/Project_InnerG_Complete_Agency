"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { PassportCard } from "./passport-card";
import { StudentPassportModal } from "./student-passport-modal";

const MOCK_STUDENTS = [
  {
    id: 'mock-1',
    name: "Marcus Johnson",
    school: "Texas Barber College",
    city: "Dallas, TX",
    type: "Barber",
    status: "Licensed",
    image: "/images/default_passport_avatar.png",
    instagram: "https://instagram.com/marcusj_cuts",
    tiktok: "https://tiktok.com/@marcusj_cuts",
    youtube: "https://youtube.com/@marcusj_cuts",
    portfolio: "https://marcusjohnson.com",
    pathway: "Booth Rent or Commission",
    specialties: ['Modern Fades', 'Beard Styling', 'Razor Shaves'],
    passport_number: "293847",
    state_board_authority: "Texas Licensing Board",
    school_name: "Texas Barber College",
    completed_school_hours: 1500,
    metro_area: "Dallas"
  },
  {
    id: 'mock-2',
    name: "Sarah Williams",
    school: "Ogle School",
    city: "Houston, TX",
    type: "Cosmetologist",
    status: "Graduating Soon",
    image: "/images/default_passport_avatar.png",
    instagram: "https://instagram.com/sarahstyles",
    tiktok: "https://tiktok.com/@sarahstyles",
    youtube: "https://youtube.com/@sarahstyles",
    portfolio: "https://sarahwilliams.com",
    pathway: "Commission or Hourly",
    specialties: ['Hair Coloring', 'Precision Cuts', 'Blowouts'],
    passport_number: "982736",
    state_board_authority: "Texas Licensing Board",
    school_name: "Ogle School",
    completed_school_hours: 1450,
    metro_area: "Houston"
  },
  {
    id: 'mock-3',
    name: "David Chen",
    school: "Dallas Barber Institute",
    city: "Austin, TX",
    type: "Barber",
    status: "Student",
    image: "/images/default_passport_avatar.png",
    instagram: "https://instagram.com/dchen_blends",
    tiktok: "https://tiktok.com/@dchen_blends",
    youtube: "https://youtube.com/@dchen_blends",
    portfolio: "https://davidchen.com",
    pathway: "Apprenticeship to Booth Rent",
    specialties: ['Classic Tapers', 'Lineups', 'Skin Fades'],
    passport_number: "475829",
    state_board_authority: "Texas Licensing Board",
    school_name: "Dallas Barber Institute",
    completed_school_hours: 900,
    metro_area: "Austin"
  }
];

export function PassportCarousel() {
  const [dbBarbers, setDbBarbers] = useState<any[]>([]);
  const [selectedPassportStudent, setSelectedPassportStudent] = useState<any>(null);

  useEffect(() => {
    async function fetchDbBarbers() {
      try {
        const supabase = createBrowserClient() as any;
        const { data: barbersData, error: barbersError } = await supabase
          .from('agent_barber_leads')
          .select('*')
          .eq('status', 'interested_in_placement')
          .order('created_at', { ascending: false })
          .limit(10);

        if (barbersError) throw barbersError;

        if (!barbersData || barbersData.length === 0) {
          setDbBarbers(MOCK_STUDENTS);
        } else {
          setDbBarbers(barbersData);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err.message || err);
        setDbBarbers(MOCK_STUDENTS);
      }
    }
    fetchDbBarbers();
  }, []);

  const studentsList = useMemo(() => {
    const FIRST_NAMES = ["Marcus", "Sarah", "David", "Jessica", "Tyrone", "Emily", "Michael", "Amanda", "Chris", "Brandon"];
    const LAST_NAMES = ["Johnson", "Williams", "Chen", "Gomez", "Davis", "Carter", "Lee", "Taylor", "Martinez", "Jackson"];
    const MOCK_PASSPORT_IMAGE = "/images/default_passport_avatar.png";

    if (dbBarbers.length > 0 && dbBarbers[0].id === 'mock-1') {
      return MOCK_STUDENTS;
    }

    return dbBarbers.map((barber, idx) => {
      const type = "Barber";
      const status = "Interested in Placement";
      const image = barber.passport_image_url || MOCK_PASSPORT_IMAGE;

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
        completed_school_hours: barber.completed_school_hours,
        metro_area: barber.metro_area
      };
    });
  }, [dbBarbers]);

  return (
    <div className="w-full">
      <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory pt-4 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {studentsList.map((student, idx) => (
          <div key={student.id || idx} className="snap-start shrink-0">
            <PassportCard 
              student={student} 
              onSelect={setSelectedPassportStudent} 
            />
          </div>
        ))}
      </div>

      <StudentPassportModal 
        selectedPassportStudent={selectedPassportStudent}
        onClose={() => setSelectedPassportStudent(null)}
      />
    </div>
  );
}
