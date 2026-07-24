import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cosmetology State Board Practice Test — Free 2026 Texas Written Exam Prep | Inner G Complete",
  description:
    "Free cosmetology state board practice test for the Texas written exam, aligned to the PSI exam TDLR uses for the actual cosmetology operator license. Milady-cited answers and explanations for every question — practice before your state board.",
  keywords: [
    "cosmetology state board practice test",
    "cosmetology state board practice test online",
    "cosmetology practice test",
    "texas cosmetology state board practice test",
    "cosmetology state board exam practice",
    "texas cosmetology exam practice test",
    "cosmetology practice test texas",
    "texas cosmetology written exam practice test",
    "psi cosmetology exam practice questions",
    "tdlr cosmetology exam prep",
  ],
  openGraph: {
    title: "Cosmetology State Board Practice Test — Free Texas Written Exam Prep",
    description:
      "Free cosmetology state board practice test for the Texas written exam, aligned to the PSI exam TDLR uses for the actual license.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/tools/texas-cosmetology-exam-practice-deck" },
};

export default function PracticeDeckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
