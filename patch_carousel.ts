import * as fs from 'fs';

const filePath = 'components/shared/passport-carousel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add useRef and Chevron icons import
content = content.replace(
  'import { useEffect, useState, useMemo } from "react";',
  'import { useEffect, useState, useMemo, useRef } from "react";\nimport { ChevronLeft, ChevronRight } from "lucide-react";'
);

// 2. Add scroll function and ref
const scrollLogic = `  const [dbBarbers, setDbBarbers] = useState<any[]>([]);
  const [selectedPassportStudent, setSelectedPassportStudent] = useState<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };`;

content = content.replace(
  `  const [dbBarbers, setDbBarbers] = useState<any[]>([]);\n  const [selectedPassportStudent, setSelectedPassportStudent] = useState<any>(null);`,
  scrollLogic
);

// 3. Add arrow buttons to JSX
const newJsx = `  return (
    <div className="w-full relative group">
      {/* Left Arrow */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 sm:-left-4 top-[45%] -translate-y-1/2 z-10 bg-white shadow-lg border border-slate-200 rounded-full p-2 text-slate-800 hover:bg-slate-50 transition-all opacity-90 hover:opacity-100 flex items-center justify-center"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Right Arrow */}
      <button 
        onClick={() => scroll('right')}
        className="absolute right-0 sm:-right-4 top-[45%] -translate-y-1/2 z-10 bg-white shadow-lg border border-slate-200 rounded-full p-2 text-slate-800 hover:bg-slate-50 transition-all opacity-90 hover:opacity-100 flex items-center justify-center"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div 
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory pt-4 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {studentsList.map((student, idx) => (
          <div key={student.id || idx} className="snap-start shrink-0">
            <PassportCard 
              student={student} 
              onSelect={setSelectedPassportStudent} 
            />
          </div>
        ))}
      </div>`;

content = content.replace(
  `  return (\n    <div className="w-full">\n      <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory pt-4 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>\n        {studentsList.map((student, idx) => (\n          <div key={student.id || idx} className="snap-start shrink-0">\n            <PassportCard \n              student={student} \n              onSelect={setSelectedPassportStudent} \n            />\n          </div>\n        ))}\n      </div>`,
  newJsx
);

fs.writeFileSync(filePath, content);
console.log('Successfully patched passport-carousel.tsx');
