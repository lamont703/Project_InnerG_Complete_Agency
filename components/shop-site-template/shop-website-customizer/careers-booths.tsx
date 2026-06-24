"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Scissors, 
  TrendingUp, 
  Briefcase, 
  Check, 
  ArrowRight, 
  UserCheck, 
  Store, 
  X, 
  Loader2 
} from "lucide-react"

type RoleType = "commission" | "booth"

interface FormState {
  name: string
  email: string
  phone: string
  role: RoleType
  experience: string
  instagram: string
  message: string
}

import { SiteConfig, defaultSiteConfig } from "./config-defaults"

export function CareersBooths({ config = defaultSiteConfig }: { config?: SiteConfig }) {
  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleType>("booth")
  const [formState, setFormState] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    role: "booth",
    experience: "1-3 years",
    instagram: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Calculator State
  const [avgPrice, setAvgPrice] = useState(45)
  const [cutsPerDay, setCutsPerDay] = useState(8)
  const [daysPerWeek, setDaysPerWeek] = useState(5)
  const [commissionSplit, setCommissionSplit] = useState(60) // Barber keeps 60%

  // Parse rent amount from string (e.g. "$200/week" -> 200), default to 250
  const parsedRent = parseInt((config.careers?.rentRate || "250").replace(/[^0-9]/g, ''))
  const BOOTH_RENT_WEEKLY = isNaN(parsedRent) ? 250 : parsedRent

  // Math calculations
  const cutsPerWeek = cutsPerDay * daysPerWeek
  const weeklyGross = cutsPerWeek * avgPrice
  const monthlyGross = weeklyGross * 4.33 // average weeks in month

  // Booth Option Net Profit
  const weeklyBoothNet = Math.max(0, weeklyGross - BOOTH_RENT_WEEKLY)
  const monthlyBoothNet = weeklyBoothNet * 4.33

  // Commission Option Net Profit
  const weeklyCommissionNet = weeklyGross * (commissionSplit / 100)
  const monthlyCommissionNet = weeklyCommissionNet * 4.33

  // Open modal with preselected role
  const handleOpenModal = (role: RoleType) => {
    setSelectedRole(role)
    setFormState((prev) => ({ ...prev, role }))
    setModalOpen(true)
  }

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
    }, 1500)
  }

  const handleResetForm = () => {
    setFormState({
      name: "",
      email: "",
      phone: "",
      role: "booth",
      experience: "1-3 years",
      instagram: "",
      message: "",
    })
    setIsSuccess(false)
    setModalOpen(false)
  }

  return (
    <section id="careers" className="border-t border-border bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Join Our Shop
          </p>
          <h2 className="mt-3 font-heading text-4xl font-bold uppercase tracking-tight text-foreground sm:text-5xl">
            Elevate Your Barber Career
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {config.shopInfo?.name || "Legends"} is your premier shop. Whether you want the security of commission clients or the freedom of running your own business with booth rental, we have a chair for you.
          </p>
        </div>

        {/* Dual Paths: Commission vs Booth Rental */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          
          {/* Card 1: Commission Barber */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 size-24 rounded-full bg-primary/10 blur-xl" />
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Briefcase className="size-6" />
            </div>
            
            <h3 className="mt-6 font-heading text-2xl font-bold uppercase tracking-wide text-foreground">
              Commission Barber
            </h3>
            <p className="mt-2 text-sm text-primary font-medium tracking-wider uppercase">
              Steady Client Flow & Support
            </p>
            
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Perfect for talented barbers who want to focus on their craft without the stress of managing booth rent. We feed you high-quality clients 24 hours a day, handle your marketing, and support your growth.
            </p>

            <ul className="mt-8 space-y-3.5">
              {[
                "High walk-in volume from Georgia State and local airport traffic",
                "Up to 70% commission split based on experience and retention",
                "All supplies, premium backbar products, and towels provided",
                "Paid marketing, Instagram promotions, and booking app profile",
                "Flexible scheduling in a high-energy, respectful environment"
              ].map((perk, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-border/60">
              <Button 
                onClick={() => handleOpenModal("commission")} 
                size="lg" 
                className="w-full h-11"
              >
                Apply as Commission Barber
                <ArrowRight className="ml-2 size-4 group-hover/button:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Card 2: Booth Rental */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 size-24 rounded-full bg-primary/10 blur-xl" />
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="size-6" />
            </div>
            
            <h3 className="mt-6 font-heading text-2xl font-bold uppercase tracking-wide text-foreground">
              Station & Booth Rental
            </h3>
            <p className="mt-2 text-sm text-primary font-medium tracking-wider uppercase">
              Be Your Own Boss (100% Profits)
            </p>
            
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Designed for established professionals looking to run their independent business. Benefit from our premium, fully-equipped shop space, premium amenities, and our unique 24-hour keycard access.
            </p>

            <ul className="mt-8 space-y-3.5">
              {[
                "24/7 keycard access — work when you and your high-paying clients want",
                `Flat weekly rent (${config.careers?.rentRate || "$250/wk"}) — keep 100% of your earnings after rent`,
                "Premium Italian leather chair, spacious tool station, and LED lighting",
                "Access to wash stations, laundry facilities, and clean towels",
                "Ring lights, styling backdrops, and media kit support for content"
              ].map((perk, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-border/60">
              <Button 
                onClick={() => handleOpenModal("booth")} 
                size="lg" 
                className="w-full h-11"
              >
                Apply for Station Rental
                <ArrowRight className="ml-2 size-4 group-hover/button:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

        </div>

        {/* Interactive Earnings Estimator */}
        <div className="mt-20 rounded-2xl border border-border bg-card/40 p-8 lg:p-12">
          <div className="grid gap-12 lg:grid-cols-12 items-center">
            
            {/* Calculator Left: Slider Controls */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                  <TrendingUp className="size-4" />
                  Take-home Calculator
                </span>
                <h3 className="mt-2 font-heading text-3xl font-bold uppercase text-foreground">
                  Estimate Your Earnings
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Compare how much you take home renting a booth at {config.shopInfo?.name || "Legends"} versus working on a commission split. Drag the sliders to match your typical numbers.
                </p>
              </div>

              <div className="space-y-6">
                
                {/* Slider 1: Avg Haircut Price */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Average Haircut Price</span>
                    <span className="text-foreground font-semibold">${avgPrice}</span>
                  </div>
                  <input 
                    type="range" 
                    min="25" 
                    max="100" 
                    step="5"
                    value={avgPrice}
                    onChange={(e) => setAvgPrice(Number(e.target.value))}
                    className="w-full accent-primary bg-secondary rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$25</span>
                    <span>$100</span>
                  </div>
                </div>

                {/* Slider 2: Cuts Per Day */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Cuts Per Day</span>
                    <span className="text-foreground font-semibold">{cutsPerDay} cuts</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="15" 
                    step="1"
                    value={cutsPerDay}
                    onChange={(e) => setCutsPerDay(Number(e.target.value))}
                    className="w-full accent-primary bg-secondary rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3 cuts</span>
                    <span>15 cuts</span>
                  </div>
                </div>

                {/* Slider 3: Days Per Week */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Days Worked Per Week</span>
                    <span className="text-foreground font-semibold">{daysPerWeek} days</span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="6" 
                    step="1"
                    value={daysPerWeek}
                    onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                    className="w-full accent-primary bg-secondary rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3 days</span>
                    <span>6 days</span>
                  </div>
                </div>

                {/* Slider 4: Commission Split */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Commission Split (Barber Keep)</span>
                    <span className="text-foreground font-semibold">{commissionSplit}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="50" 
                    max="80" 
                    step="5"
                    value={commissionSplit}
                    onChange={(e) => setCommissionSplit(Number(e.target.value))}
                    className="w-full accent-primary bg-secondary rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>50% (Standard)</span>
                    <span>80% (Master Barber)</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Calculator Right: Output Comparison */}
            <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-6 lg:p-8 space-y-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimated Business Volume
                </h4>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-foreground">
                    ${weeklyGross.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">/ week gross</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ({cutsPerWeek} cuts/wk | Approx. ${Math.round(monthlyGross).toLocaleString()}/mo gross)
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                
                {/* Comparison Card: Booth Rental */}
                <div className="rounded-xl bg-background border border-primary/20 p-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
                    Booth Rental
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {config.shopInfo?.name || "Legends"} Rental Take-Home
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-heading text-2xl font-bold text-foreground">
                      ${weeklyBoothNet.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">/ week</span>
                  </div>
                  <p className="text-[11px] text-primary mt-1 font-medium">
                    Monthly Net: ${Math.round(monthlyBoothNet).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    (After flat weekly rent of ${BOOTH_RENT_WEEKLY})
                  </p>
                </div>

                {/* Comparison Card: Commission Split */}
                <div className="rounded-xl bg-background/50 border border-border p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-secondary text-muted-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
                    Commission
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    {config.shopInfo?.name || "Legends"} Commission Take-Home
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-heading text-2xl font-bold text-foreground">
                      ${weeklyCommissionNet.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">/ week</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                    Monthly Net: ${Math.round(monthlyCommissionNet).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    (Based on your {commissionSplit}% payout split)
                  </p>
                </div>

              </div>

              {/* Calculator Call-To-Action */}
              <div className="pt-2">
                <Button 
                  onClick={() => handleOpenModal(weeklyBoothNet > weeklyCommissionNet ? "booth" : "commission")} 
                  size="lg" 
                  className="w-full text-sm font-semibold uppercase tracking-wider"
                >
                  Apply & Lock in Your Chair
                </Button>
                <p className="text-[11px] text-center text-muted-foreground mt-2.5">
                  *Calculations are estimates based on standard volume and don't include retail commission or tips (you keep 100% tips).
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Unified Inquiry Form Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          
          {/* Backdrop Overlay */}
          <div 
            onClick={handleResetForm}
            className="absolute inset-0 bg-background/85 backdrop-blur-sm transition-opacity duration-300" 
          />

          {/* Modal Content container */}
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300 scale-100 animate-in fade-in-50 zoom-in-95">
            
            {/* Close Button */}
            <button
              onClick={handleResetForm}
              className="absolute top-4 right-4 p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            {/* Modal Body */}
            <div className="p-6 sm:p-8">
              
              {!isSuccess ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Scissors className="size-4.5" />
                    </span>
                    <div>
                      <h3 className="font-heading text-xl font-bold uppercase tracking-wider text-foreground">
                        {formState.role === "booth" ? "Rent a Station" : "Join the Barber Crew"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {config.shopInfo?.name || "Legends Barbershop"} — {config.shopInfo?.address?.split(',')[1] || "Atlanta, GA"}
                      </p>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    
                    {/* Role Choice */}
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Preferred Arrangement
                      </label>
                      <div className="grid grid-cols-2 gap-3 mt-1.5">
                        <button
                          type="button"
                          onClick={() => setFormState((p) => ({ ...p, role: "booth" }))}
                          className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-all ${
                            formState.role === "booth"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Booth Rental
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState((p) => ({ ...p, role: "commission" }))}
                          className={`py-2 px-3 rounded-lg border text-sm font-semibold transition-all ${
                            formState.role === "commission"
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Commission
                        </button>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label htmlFor="form-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Full Name
                      </label>
                      <input
                        id="form-name"
                        type="text"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState((p) => ({ ...p, name: e.target.value }))}
                        placeholder="John Doe"
                        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                    </div>

                    {/* Contact Details Grid */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="form-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Phone Number
                        </label>
                        <input
                          id="form-phone"
                          type="tel"
                          required
                          value={formState.phone}
                          onChange={(e) => setFormState((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="(404) 555-0100"
                          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="form-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Email Address
                        </label>
                        <input
                          id="form-email"
                          type="email"
                          required
                          value={formState.email}
                          onChange={(e) => setFormState((p) => ({ ...p, email: e.target.value }))}
                          placeholder="johndoe@gmail.com"
                          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Experience & Instagram */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="form-exp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Experience
                        </label>
                        <select
                          id="form-exp"
                          value={formState.experience}
                          onChange={(e) => setFormState((p) => ({ ...p, experience: e.target.value }))}
                          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="< 1 year">Less than 1 year</option>
                          <option value="1-3 years">1 - 3 years</option>
                          <option value="3-5 years">3 - 5 years</option>
                          <option value="5+ years">5+ years</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="form-insta" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Instagram Portfolio
                        </label>
                        <div className="relative mt-1.5 flex rounded-lg border border-border bg-background focus-within:border-primary">
                          <span className="flex items-center px-3.5 text-sm text-muted-foreground border-r border-border select-none">
                            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                          </span>
                          <input
                            id="form-insta"
                            type="text"
                            required
                            value={formState.instagram}
                            onChange={(e) => setFormState((p) => ({ ...p, instagram: e.target.value }))}
                            placeholder="handle"
                            className="w-full bg-transparent px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div>
                      <label htmlFor="form-msg" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tell us about yourself / Questions
                      </label>
                      <textarea
                        id="form-msg"
                        rows={3}
                        value={formState.message}
                        onChange={(e) => setFormState((p) => ({ ...p, message: e.target.value }))}
                        placeholder="I specialize in razor shaves and hair designs. Ready to set up a tour!"
                        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        size="lg"
                        className="w-full h-11 text-sm font-semibold uppercase tracking-wider"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Application"
                        )}
                      </Button>
                    </div>

                  </form>
                </>
              ) : (
                
                // Success state
                <div className="flex flex-col items-center text-center py-8">
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 animate-bounce">
                    <UserCheck className="size-7" />
                  </div>
                  <h3 className="mt-6 font-heading text-2xl font-bold uppercase tracking-wider text-foreground">
                    Application Sent!
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground max-w-sm leading-relaxed">
                    Thanks, <strong>{formState.name}</strong>. We've received your inquiry for the <strong>{formState.role === "booth" ? "Station Rental" : "Commission Barber"}</strong> position.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
                    Our shop manager will review your Instagram portfolio (<strong>@{formState.instagram.replace("@", "")}</strong>) and reach out to you via text or email within 24 hours to schedule a tour!
                  </p>
                  
                  <Button
                    onClick={handleResetForm}
                    size="lg"
                    className="mt-8 px-8"
                  >
                    Done
                  </Button>
                </div>
              )}

            </div>
          </div>

        </div>
      )}
    </section>
  )
}
