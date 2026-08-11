"use client";

import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Navbar } from "@/components/layout/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { Footer } from "@/components/layout/footer"

export default function Home() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <HeroSection />
      <Footer />
    </main>
  )
}
