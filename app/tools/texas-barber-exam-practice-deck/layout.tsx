import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Texas Barber Exam Practice Test — Free 2026 State Board Written Prep | Inner G Complete",
  description:
    "Free Texas barber exam practice test for the Class A written state board exam, aligned to the PSI exam TDLR uses for the actual license. Milady-cited answers and explanations for every question — practice before your state board.",
  keywords: [
    "barber exam practice test",
    "barber practice test",
    "texas barber exam practice test",
    "barber state board practice test",
    "barber state board exam",
    "texas barber written exam practice test",
    "barber board practice test",
    "psi barber exam practice questions",
    "tdlr barber exam prep",
  ],
  openGraph: {
    title: "Texas Barber Exam Practice Test — Free State Board Written Prep",
    description:
      "Free Texas barber exam practice test for the Class A written state board exam, aligned to the PSI exam TDLR uses for the actual license.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/tools/texas-barber-exam-practice-deck" },
};

export default function PracticeDeckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
