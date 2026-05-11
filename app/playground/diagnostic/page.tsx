"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Brain, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw, 
  Award,
  Zap,
  ShieldCheck,
  GraduationCap,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

// --- Mock Agent JSON Data (from test run) ---

const MOCK_QUESTION_DECK = [
  {
    id: "bi_q_020",
    domain: "Anatomy & Physiology",
    question: "The fifth cranial nerve, which is the chief sensory nerve of the face and is critical to consider during facial massage, is the:",
    options: {
      a: "Facial nerve",
      b: "Optic nerve",
      c: "Trigeminal nerve",
      d: "Vagus nerve"
    },
    correct_answer: "c",
    rationale: "The Trigeminal nerve (or trifacial nerve) is the primary sensory nerve of the face. Knowledge of its branches is essential for performing safe and effective massage services."
  },
  {
    id: "q10",
    domain: "Chemistry",
    question: "The pH of hair, skin, and nails is naturally:",
    options: {
      a: "Alkaline",
      b: "Neutral",
      c: "Acidic",
      d: "Variable"
    },
    correct_answer: "c",
    rationale: "The natural pH of hair, skin, and nails is in the acidic range of 4.5 to 5.5. Understanding the acid mantle is critical for selecting the correct products."
  },
  // Adding more for simulation...
  {
    id: "q3",
    domain: "Sanitation",
    question: "Which of the following is the highest level of decontamination?",
    options: {
      a: "Sanitization",
      b: "Cleaning",
      c: "Disinfection",
      d: "Sterilization"
    },
    correct_answer: "d",
    rationale: "Sterilization destroys all microbial life, including spores."
  }
];

const MOCK_REPORT = {
  summary_text: "Your performance indicates strong theoretical knowledge in Skin Care, but critical gaps remain in high-stakes areas like Shaving Procedures and Chemistry.",
  domain_breakdown: [
    { domain: "Anatomy", score: 0.85, recommendation: "Solid understanding. Review the muscular system of the neck for complete mastery." },
    { domain: "Chemistry", score: 0.50, recommendation: "Critical Gap. Focus on the pH scale and its relation to chemical relaxers." },
    { domain: "Sanitation", score: 0.95, recommendation: "Mastery achieved. You are ready for the Infection Control portion of the exam." },
    { domain: "Shaving", score: 0.40, recommendation: "Significant Gap. Revisit the 14-stroke standard procedure and blade angle theory." }
  ]
};

// --- Main Playground Page ---

export default function DiagnosticPlayground() {
  const [view, setView] = useState<"lobby" | "deck" | "decision" | "report">("lobby");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signals, setSignals] = useState<string[]>(["System Idle"]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isIntervening, setIsIntervening] = useState(false);

  const addSignal = (msg: string) => {
    setSignals(prev => [msg, ...prev].slice(0, 5));
  };

  const [isLoading, setIsLoading] = useState(false);
  const [deck, setDeck] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);

  const currentQuestion = deck[currentIndex];

  const fetchBatch = async (query: string) => {
    setIsLoading(true);
    addSignal("Calling Live Agent...");
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      
      if (data.error) {
        addSignal("AI Error: " + data.error);
        console.error("AI Error:", data.error);
        return;
      }

      // The agent wraps the response in a diagnostic_report key
      const report = data.diagnostic_report;

      if (report && report.question_deck) {
        setDeck(report.question_deck);
        setView("deck");
        setCurrentIndex(0);
        addSignal("Batch Received: " + (report.signals?.[0] || "Ready"));
      } else if (report && report.final_answer_report) {
        setReportData(report.final_answer_report);
        setView("report");
        addSignal("Report Generated: " + (report.signals?.[0] || "Ready"));
      }
    } catch (err) {
      addSignal("API Error: Check Console");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = () => {
    fetchBatch('USER_CHOICE: "keep_answering"');
  };

  const handleAnswer = (option: string) => {
    const currentQuestion = deck[currentIndex];
    setAnswers({ ...answers, [currentQuestion.id]: option });
    
    addSignal(`Logged Answer: ${option.toUpperCase()}`);

    if (currentIndex < deck.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setView("decision");
      addSignal("Batch Cycle Complete");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 p-4 md:p-8 flex flex-col items-center justify-center font-sans">
      
      {/* --- HUD / SIGNAL FEED --- */}
      <div className="fixed top-8 left-8 hidden lg:block z-50">
        <div className="glass-panel p-4 rounded-xl border-l-4 border-l-primary w-64">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Activity className="w-3 h-3 text-primary animate-pulse" />
            Signal Feed
          </div>
          <div className="space-y-2">
            {signals.map((s, i) => (
              <div key={i} className="text-xs font-mono opacity-80 animate-in fade-in slide-in-from-left-1">
                {`> ${s}`}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl w-full">
        
        {/* --- LOBBY VIEW --- */}
        {view === "lobby" && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-primary text-sm font-bold tracking-tight mb-4">
              <ShieldCheck className="w-4 h-4" />
              Institutional-Grade Diagnostic Engine
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gradient mb-6">
              Barber Intelligence <br /> Knowledge Audit
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Experience the headless AI diagnostic. Start a 10-question performance cycle to identify your cognitive gaps for the Texas State Board.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Button 
                onClick={handleStart}
                className="h-14 px-8 rounded-full bg-primary text-primary-foreground font-bold hover:scale-105 transition-all glow-primary text-lg"
              >
                {isLoading ? "Analyzing..." : "Start Mastery Session"}
                {!isLoading && <ChevronRight className="w-5 h-5 ml-2" />}
                {isLoading && <div className="w-5 h-5 ml-2 border-2 border-primary-foreground border-t-transparent animate-spin rounded-full" />}
              </Button>
              <Button 
                variant="outline"
                className="h-14 px-8 rounded-full border-border bg-glass backdrop-blur-xl hover:bg-glass-highlight text-lg"
              >
                Load State (Simulation)
              </Button>
            </div>
          </div>
        )}

        {/* --- DECK VIEW --- */}
        {view === "deck" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Question {currentIndex + 1} of {deck.length}
                </div>
                <div className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Brain className="w-6 h-6 text-accent" />
                  {currentQuestion?.domain}
                </div>
              </div>
              <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="glass-panel-strong p-8 md:p-12 rounded-[2rem] glow-primary">
              <h2 className="text-2xl md:text-3xl font-medium leading-snug mb-12">
                {deck[currentIndex].question}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(deck[currentIndex].options).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleAnswer(key)}
                    className="group relative flex items-center p-6 rounded-2xl glass-panel border border-glass-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted group-hover:bg-primary group-hover:text-primary-foreground font-bold text-lg mr-4 transition-colors">
                      {key.toUpperCase()}
                    </span>
                    <span className="text-lg font-medium opacity-90">{value as string}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- DECISION VIEW --- */}
        {view === "decision" && (
          <div className="text-center space-y-12 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse-glow">
              <Zap className="w-12 h-12 text-primary" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight">Cycle #1 Complete</h2>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                AI has identified critical mastery trends. Would you like to strengthen your gaps or view your current state board readiness?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                disabled={isLoading}
                onClick={() => fetchBatch('USER_CHOICE: "keep_answering"')}
                className="group relative glass-panel p-8 rounded-3xl border border-primary/20 hover:border-primary w-full max-w-xs transition-all text-left hover:scale-[1.02] disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-6">
                  {isLoading ? <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent animate-spin rounded-full" /> : <RotateCcw className="w-6 h-6 text-primary-foreground" />}
                </div>
                <h3 className="text-xl font-bold mb-2">Keep Answering</h3>
                <p className="text-sm text-muted-foreground opacity-70">Generate another 10 questions focused on Mastery.</p>
                <ChevronRight className="absolute bottom-8 right-8 w-6 h-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button 
                disabled={isLoading}
                onClick={() => fetchBatch('USER_CHOICE: "see_report"')}
                className="group relative glass-panel-strong p-8 rounded-3xl border border-accent/20 hover:border-accent w-full max-w-xs transition-all text-left hover:scale-[1.02] disabled:opacity-50"
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-6">
                  {isLoading ? <div className="w-6 h-6 border-2 border-accent-foreground border-t-transparent animate-spin rounded-full" /> : <Award className="w-6 h-6 text-accent-foreground" />}
                </div>
                <h3 className="text-xl font-bold mb-2">See Answer Report</h3>
                <p className="text-sm text-muted-foreground opacity-70">Analyze cognitive performance and pass probability.</p>
                <ChevronRight className="absolute bottom-8 right-8 w-6 h-6 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        )}

        {/* --- REPORT VIEW --- */}
        {view === "report" && reportData && (
          <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700 pb-20">
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-12">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-[0.3em] text-accent">Knowledge Audit Summary</div>
                <h2 className="text-5xl font-bold tracking-tight">Mastery Profile</h2>
              </div>
              <div className="glass-panel px-6 py-4 rounded-2xl flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">State Board Readiness</div>
                  <div className="text-3xl font-black text-primary">78.4%</div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin duration-1000" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 glass-panel p-8 rounded-3xl border-l-4 border-l-accent flex items-start gap-6">
                <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">AI Pedagogical Insight</h3>
                  <p className="text-muted-foreground leading-relaxed">{reportData.summary_text}</p>
                </div>
              </div>

              {reportData.domain_breakdown.map((item: any, idx: number) => (
                <div key={idx} className="glass-panel p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold tracking-tight">{item.domain}</span>
                    <span className={`text-sm font-bold ${item.score > 0.8 ? 'text-primary' : item.score > 0.6 ? 'text-accent' : 'text-destructive'}`}>
                      {Math.round(item.score * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${item.score > 0.8 ? 'bg-primary' : item.score > 0.6 ? 'bg-accent' : 'bg-destructive'}`}
                      style={{ width: `${item.score * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    {item.recommendation}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-12">
              <Button 
                onClick={() => {
                  setView("lobby");
                  setCurrentIndex(0);
                  setSignals(["System Reset"]);
                }}
                variant="ghost" 
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restart Knowledge Audit
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
