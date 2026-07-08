import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Texas Barber Exam Practice Test | PSI Written Exam Prep | Inner G Complete",
  description:
    "Free Texas Class A Barber written exam practice questions, aligned to the PSI exam TDLR uses to administer the actual license test. Milady-cited answers and explanations for every question.",
  keywords: [
    "texas barber exam practice test",
    "texas barber written exam practice",
    "psi barber exam practice questions",
    "tdlr barber exam prep",
    "texas barber exam quizlet",
  ],
  openGraph: {
    title: "Texas Barber Exam Practice Test | PSI Written Exam Prep",
    description:
      "Free Texas Class A Barber written exam practice questions, aligned to the PSI exam TDLR uses to administer the actual license test.",
  },
  alternates: { canonical: "https://innergcomplete.com/tools/texas-barber-exam-practice-deck" },
};

export default function PracticeDeckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
