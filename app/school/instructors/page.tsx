import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { firstSchool, programsFor } from "@/lib/school/store";
import { instructorRoster } from "@/lib/school/learning-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { InstructorsClient, type BlockRow, type InstructorCard } from "./instructors-client";

export const metadata: Metadata = {
  title: "Instructors",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (m: number) =>
  `${((Math.floor(m / 60) + 11) % 12) + 1}:${String(m % 60).padStart(2, "0")}${Math.floor(m / 60) < 12 ? "am" : "pm"}`;

export default async function InstructorsPage() {
  if (!(await isAdmin())) notFound();

  const school = await firstSchool();
  if (!school) notFound();

  const [roster, programs] = await Promise.all([
    instructorRoster(school.id),
    programsFor(school.id),
  ]);
  const programName = new Map(programs.map((p) => [p.id, p.name]));

  const { data: rawBlocks } = await (createAdminClient() as any)
    .from("sis_schedule_blocks")
    .select("id, label, weekday, starts_minute, ends_minute, modality, program_id, instructor_id")
    .eq("school_id", school.id)
    .order("weekday")
    .order("starts_minute");

  const blocks: BlockRow[] = (rawBlocks ?? []).map((b: any) => ({
    id: b.id,
    label: b.label,
    when: `${DAYS[b.weekday]} ${hhmm(b.starts_minute)}–${hhmm(b.ends_minute)}`,
    programName: programName.get(b.program_id) ?? "",
    modality: b.modality,
    instructorId: b.instructor_id ?? null,
  }));

  const cards: InstructorCard[] = roster.map((i) => ({
    id: i.id, name: i.name, licenseNumber: i.licenseNumber, email: i.email,
    active: i.active, claimedAt: i.claimedAt, claimToken: i.claimToken,
    blockCount: i.blocks.length,
  }));

  return (
    <div className="light flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-24 sm:px-6">
        <Link
          href="/school/roster"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Roster
        </Link>

        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Instructors</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          The people who sign for distance hours. An instructor with their own account signs as
          themselves; without one, anything signed in their name is recorded as asserted by whoever
          was at the console. Both are allowed — somebody on holiday should not mean hours go
          unsigned — but the record now tells them apart.
        </p>

        <div className="mt-8">
          <InstructorsClient instructors={cards} blocks={blocks} origin={SITE_URL} />
        </div>
      </main>
    </div>
  );
}
