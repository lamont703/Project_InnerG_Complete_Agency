"use client"

import { useState, Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ArrowLeft, ArrowRight, CheckCircle2, UploadCloud, Briefcase, User, FileText, CheckSquare, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const steps = [
  { id: 1, title: "You", icon: User },
  { id: 2, title: "Education", icon: FileText },
  { id: 3, title: "Experience", icon: Briefcase },
  { id: 4, title: "Details", icon: UploadCloud },
  { id: 5, title: "Review", icon: CheckSquare },
]

const roleTitles: Record<string, string> = {
  "senior-product-manager-ai": "Senior Product Manager, AI & Agentic Systems",
  "senior-ml-engineer-scaling": "Senior Machine Learning Engineer (Foundational Systems)",
  "senior-blockchain-architect-zk": "Senior Blockchain Architect (Protocol & ZK Systems)",
}

function ApplyFlowContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const roleSlug = searchParams.get("role") || ""
  
  const roleTitle = roleTitles[roleSlug] || "Open Application"

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    resumeFile: null as File | null,
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+1",
    phone: "",
    education: "",
    university: "",
    yearsExperience: "",
    linkedinUrl: "",
    visaStatus: "",
    portfolioUrl: "",
    additionalNote: "",
    previouslyEmployed: "",
    personalizeProfile: "",
    privacyConsent: false,
    certifyAccurate: false,
  })

  const updateForm = (field: keyof typeof formData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      updateForm("resumeFile", e.target.files[0])
    }
  }

  const nextStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    setCurrentStep((prev) => Math.min(prev + 1, steps.length))
  }
  
  const prevStep = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Safety check: if the browser natively triggers a submit event 
    // before the final step (e.g. from pressing Enter in an input field), 
    // we should intercept it and just advance to the next step instead.
    if (currentStep < steps.length) {
      nextStep()
      return
    }

    // Mock submission
    setIsSubmitted(true)
  }

  return (
    <main className="min-h-screen bg-background light text-foreground">
      <Navbar />

      <div className="pt-32 pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <Link 
            href={roleSlug ? `/careers/${roleSlug}` : "/careers"} 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-12"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Role Description
          </Link>

          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground uppercase italic mb-3">
              Application Process
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              Applying for: <span className="text-primary font-bold">{roleTitle}</span>
            </p>
          </div>

          {isSubmitted ? (
            <div className="glass-panel p-10 sm:p-16 rounded-3xl border border-primary/20 text-center animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto shadow-[0_0_40px_oklch(var(--primary)/0.15)] flex flex-col items-center">
               <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 border border-primary/20 shadow-[0_0_30px_oklch(var(--primary)/0.3)]">
                 <CheckCircle2 className="h-12 w-12 text-primary drop-shadow-[0_0_10px_oklch(var(--primary)/0.5)]" />
               </div>
               <h2 className="text-3xl font-bold uppercase italic text-foreground mb-4">Application Received</h2>
               <p className="text-muted-foreground leading-relaxed mb-10 max-w-lg">
                 Thank you for submitting your application for the <span className="text-primary font-bold">{roleTitle}</span> role. Our intelligence systems have logged your information securely. We will be in touch shortly regarding the next steps in the screening process.
               </p>
               <Button size="lg" className="font-bold uppercase tracking-widest px-10 gap-3 bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                 <Link href="/careers"><ArrowLeft className="h-4 w-4" /> Back to Careers Hub</Link>
               </Button>
            </div>
          ) : (
            <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-border/50">
              {/* Stepper */}
            <div className="mb-10 overflow-x-auto pb-4 custom-scrollbar">
              <div className="flex items-center min-w-max justify-between relative px-2">
                {/* Connecting lines */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-secondary/50 -z-10" />
                <div 
                  className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-primary transition-all duration-300 -z-10" 
                  style={{ width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 48px)` }}
                />

                {steps.map((step) => {
                  const Icon = step.icon
                  const isActive = currentStep === step.id
                  const isCompleted = currentStep > step.id

                  return (
                    <div key={step.id} className="flex flex-col items-center gap-3 relative z-10 bg-glass px-2">
                      <div 
                        className={`h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          isActive 
                            ? "bg-primary border-primary text-primary-foreground shadow-[0_0_20px_oklch(var(--primary)/0.4)]" 
                            : isCompleted
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-secondary border-border text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${isActive || isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                        {step.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="min-h-[300px]">
              
              {/* Step 1: Info & Compliance */}
              {currentStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold uppercase mb-2">Basic Info & Compliance</h2>
                    <p className="text-muted-foreground text-sm">Please provide your resume, contact details, and consent information.</p>
                  </div>
                  
                  {/* Resume Upload */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-foreground uppercase tracking-wider text-sm flex items-center gap-2"><UploadCloud className="h-4 w-4 text-primary" /> Resume / CV</h3>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-2xl p-8 text-center group cursor-pointer bg-secondary/10"
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".pdf,.doc,.docx"
                      />
                      {formData.resumeFile ? (
                        <>
                          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 text-primary">
                             <CheckCircle2 className="h-8 w-8" />
                          </div>
                          <div className="font-bold text-primary mb-1">{formData.resumeFile.name}</div>
                          <div className="text-xs text-muted-foreground mb-4">Click to change file</div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-foreground mb-1">Click to upload or drag and drop</div>
                          <div className="text-xs text-muted-foreground mb-4">PDF, DOCX up to 10MB</div>
                          <Button type="button" variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/5 pointer-events-none">Select File</Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-4 pt-6 border-t border-border/50">
                    <h3 className="font-bold text-foreground uppercase tracking-wider text-sm flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Contact Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Legal First Name</label>
                        <input type="text" value={formData.firstName} onChange={(e) => updateForm("firstName", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none text-sm appearance-none" placeholder="e.g. Satoshi" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Legal Last Name</label>
                        <input type="text" value={formData.lastName} onChange={(e) => updateForm("lastName", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none text-sm appearance-none" placeholder="e.g. Nakamoto" required />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                        <input type="email" value={formData.email} onChange={(e) => updateForm("email", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none text-sm appearance-none" placeholder="e.g. s.nakamoto@example.com" required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country Code</label>
                        <select value={formData.countryCode} onChange={(e) => updateForm("countryCode", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none text-sm appearance-none">
                          <option value="+1">+1 (US/CA/etc)</option>
                          <option value="+44">+44 (UK)</option>
                          <option value="+61">+61 (AU)</option>
                          <option value="+91">+91 (IN)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                        <input type="tel" value={formData.phone} onChange={(e) => updateForm("phone", e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none text-sm appearance-none" placeholder="(555) 000-0000" required />
                      </div>
                    </div>
                  </div>

                  {/* Config Options */}
                  <div className="space-y-8 pt-6 border-t border-border/50">
                    <h3 className="font-bold text-foreground uppercase tracking-wider text-sm flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" /> Compliance & Preferences</h3>
                    
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground leading-relaxed">Do you currently or have you previously worked for Inner G Complete Agency in any capacity? This includes, but is not limited to Intern, Student Ambassador, Student Researcher, Fellow, Full-time Employee; served on a current or prior engagement supporting Inner G Complete Agency as either Temp, Vendor or Contractor; or were part of a prior acquisition. *</p>
                      <div className="flex gap-6 mt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium"><input type="radio" name="previouslyEmployed" value="yes" checked={formData.previouslyEmployed === 'yes'} onChange={(e) => updateForm("previouslyEmployed", e.target.value)} className="accent-primary h-4 w-4" required /> Yes</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium"><input type="radio" name="previouslyEmployed" value="no" checked={formData.previouslyEmployed === 'no'} onChange={(e) => updateForm("previouslyEmployed", e.target.value)} className="accent-primary h-4 w-4" required /> No</label>
                      </div>
                      <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl text-xs leading-relaxed text-muted-foreground">
                        <strong className="text-primary block mb-1 uppercase tracking-wider">Disclaimer</strong> 
                        This information is used to prevent delays in the hiring process and ensure a smooth hiring experience. We recommend reviewing your resume and highlighting work you completed while employed directly or as part of an assignment with Inner G Complete Agency in the past.
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2 text-primary mb-1">
                        <div className="p-1 rounded-md bg-primary/10 border border-primary/20 text-[10px] uppercase font-bold tracking-widest">info</div>
                      </div>
                      <p className="text-sm font-medium text-foreground leading-relaxed">Inner G Complete Agency securely stores your personal work history to give you personalized job alerts and help recruiters find the perfect job.<br/><br/>Personalize your Inner G Careers profile with job recommendations and related content? *</p>
                      <div className="flex gap-6 mt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium"><input type="radio" name="personalizeProfile" value="yes" checked={formData.personalizeProfile === 'yes'} onChange={(e) => updateForm("personalizeProfile", e.target.value)} className="accent-primary h-4 w-4" required /> Yes</label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer font-medium"><input type="radio" name="personalizeProfile" value="no" checked={formData.personalizeProfile === 'no'} onChange={(e) => updateForm("personalizeProfile", e.target.value)} className="accent-primary h-4 w-4" required /> No</label>
                      </div>
                    </div>

                    <div className="space-y-5 pt-4">
                      <label className="flex items-start gap-4 cursor-pointer group">
                        <input type="checkbox" checked={formData.privacyConsent} onChange={(e) => updateForm("privacyConsent", e.target.checked)} className="mt-1 accent-primary h-4 w-4 shrink-0" required />
                        <span className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                          I understand that the information I provide will be used in accordance with Inner G Complete Agency's applicant and candidate privacy policy. I consent to the processing of my information as described in that policy including that, in limited circumstances, Inner G Complete Agency may share my contact information with trusted third parties, to assist in certain phases of the hiring process (such as conducting background checks).*
                        </span>
                      </label>
                      <label className="flex items-start gap-4 cursor-pointer group">
                        <input type="checkbox" checked={formData.certifyAccurate} onChange={(e) => updateForm("certifyAccurate", e.target.checked)} className="mt-1 accent-primary h-4 w-4 shrink-0" required />
                        <span className="text-sm text-foreground font-medium leading-relaxed group-hover:text-primary transition-colors">
                          I hereby certify that, to the best of my knowledge, the provided information is true and accurate.*
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Education */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-bold uppercase mb-6">Education Details</h2>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Highest Education Level</label>
                      <select 
                        value={formData.education}
                        onChange={(e) => updateForm("education", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium appearance-none"
                      >
                        <option value="">Select Level</option>
                        <option value="bachelors">Bachelor's Degree</option>
                        <option value="masters">Master's Degree</option>
                        <option value="phd">PhD</option>
                        <option value="other">Other / Self-Taught</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">University / Institution</label>
                      <input 
                        type="text" 
                        value={formData.university}
                        onChange={(e) => updateForm("university", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
                        placeholder="e.g. MIT"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Experience */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-bold uppercase mb-6">Professional Experience</h2>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Years of Relevant Experience</label>
                      <select 
                        value={formData.yearsExperience}
                        onChange={(e) => updateForm("yearsExperience", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium appearance-none"
                      >
                        <option value="">Select Years</option>
                        <option value="1-3">1 - 3 Years</option>
                        <option value="3-5">3 - 5 Years</option>
                        <option value="5-10">5 - 10 Years</option>
                        <option value="10+">10+ Years</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">LinkedIn Profile URL</label>
                      <input 
                        type="url" 
                        value={formData.linkedinUrl}
                        onChange={(e) => updateForm("linkedinUrl", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Details */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <h2 className="text-2xl font-bold uppercase mb-6">Role Details</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Work Authorization Setup</label>
                      <select 
                        value={formData.visaStatus}
                        onChange={(e) => updateForm("visaStatus", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium appearance-none"
                      >
                        <option value="">Require Visa Sponsorship?</option>
                        <option value="no">No - Authorized to work</option>
                        <option value="yes">Yes - Require Sponsorship</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Portfolio / GitHub URL</label>
                      <input 
                        type="url" 
                        value={formData.portfolioUrl}
                        onChange={(e) => updateForm("portfolioUrl", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium"
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Additional Note / Cover Letter (Optional)</label>
                      <textarea 
                        value={formData.additionalNote}
                        onChange={(e) => updateForm("additionalNote", e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all text-sm font-medium resize-none"
                        placeholder="Any additional context about your background..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold uppercase mb-2">Review & Submit</h2>
                    <p className="text-muted-foreground text-sm">Please verify your information before submitting.</p>
                  </div>

                  <div className="bg-secondary/20 border border-border rounded-2xl p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                       <div>
                         <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Name</div>
                         <div className="font-semibold">{formData.firstName || "-"} {formData.lastName || "-"}</div>
                       </div>
                       <div>
                         <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Phone</div>
                         <div className="font-semibold">{formData.countryCode} {formData.phone || "-"}</div>
                       </div>
                       <div className="sm:col-span-2">
                         <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Email</div>
                         <div className="font-semibold">{formData.email || "-"}</div>
                       </div>
                       <div>
                         <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Previously Employed?</div>
                         <div className="font-semibold capitalize">{formData.previouslyEmployed || "-"}</div>
                       </div>
                       <div>
                         <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Experience</div>
                         <div className="font-semibold">{formData.yearsExperience ? formData.yearsExperience + " Years" : "-"}</div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="mt-12 flex items-center justify-between pt-6 border-t border-border">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep} 
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>

                {currentStep < steps.length ? (
                  <Button 
                    type="button" 
                    onClick={nextStep}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8"
                  >
                    Next Step <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 border border-primary/20 glow-primary"
                  >
                    Submit Application <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <ApplyFlowContent />
    </Suspense>
  )
}
