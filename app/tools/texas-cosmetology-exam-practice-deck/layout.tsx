import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Texas Cosmetology Exam Practice Test | PSI Written Exam Prep | Inner G Complete",
  description:
    "Free Texas Cosmetology Operator written exam practice questions, aligned to the PSI exam TDLR uses to administer the actual license test. Milady-cited answers and explanations for every question.",
  keywords: [
    "texas cosmetology exam practice test",
    "cosmetology practice test texas",
    "texas cosmetology exam practice",
    "texas cosmetology written exam practice",
    "texas cosmetology written exam practice test",
    "texas cosmetology state board practice test",
    "psi cosmetology exam practice questions",
    "tdlr cosmetology exam prep",
    "texas cosmetology exam quizlet",
  ],
  openGraph: {
    title: "Texas Cosmetology Exam Practice Test | PSI Written Exam Prep",
    description:
      "Free Texas Cosmetology Operator written exam practice questions, aligned to the PSI exam TDLR uses to administer the actual license test.",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/tools/texas-cosmetology-exam-practice-deck" },
};

export default function PracticeDeckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
