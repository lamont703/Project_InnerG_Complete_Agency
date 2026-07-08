"use client"

import { useState, useMemo } from "react"
import { Calculator } from "lucide-react"

export function BoothRentCalculator() {
  const [weeklyRevenue, setWeeklyRevenue] = useState(600)
  const [boothRent, setBoothRent] = useState(180)
  const [commissionSplit, setCommissionSplit] = useState(60)

  const { boothTakeHome, commissionTakeHome, winner, breakeven } = useMemo(() => {
    const booth = weeklyRevenue - boothRent
    const commission = weeklyRevenue * (commissionSplit / 100)
    const breakevenRevenue = boothRent / (1 - commissionSplit / 100)
    return {
      boothTakeHome: booth,
      commissionTakeHome: commission,
      winner: booth === commission ? "tie" : booth > commission ? "booth" : "commission",
      breakeven: breakevenRevenue,
    }
  }, [weeklyRevenue, boothRent, commissionSplit])

  return (
    <div className="not-prose my-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="h-4 w-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
          Your Numbers, Not Ours
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-3 mb-8">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Your weekly revenue
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-bold">$</span>
            <input
              type="number"
              value={weeklyRevenue}
              onChange={(e) => setWeeklyRevenue(Math.max(0, Number(e.target.value)))}
              className="w-full p-2.5 bg-white border border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Weekly booth rent
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-bold">$</span>
            <input
              type="number"
              value={boothRent}
              onChange={(e) => setBoothRent(Math.max(0, Number(e.target.value)))}
              className="w-full p-2.5 bg-white border border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Your commission split
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={commissionSplit}
              onChange={(e) => setCommissionSplit(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-full p-2.5 bg-white border border-border rounded-lg text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-muted-foreground font-bold">%</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div
          className={`rounded-2xl border p-5 ${
            winner === "booth" ? "border-primary bg-white shadow-sm" : "border-border bg-white/50"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
            Booth Rent ({boothRent >= 0 ? `$${boothRent}/wk flat` : ""})
          </p>
          <p className="text-2xl font-black text-foreground tracking-tighter">
            ${boothTakeHome.toFixed(0)}
            <span className="text-sm font-bold text-muted-foreground">/wk kept</span>
          </p>
        </div>
        <div
          className={`rounded-2xl border p-5 ${
            winner === "commission" ? "border-primary bg-white shadow-sm" : "border-border bg-white/50"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
            Commission ({commissionSplit}% split)
          </p>
          <p className="text-2xl font-black text-foreground tracking-tighter">
            ${commissionTakeHome.toFixed(0)}
            <span className="text-sm font-bold text-muted-foreground">/wk kept</span>
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground font-medium leading-relaxed">
        {winner === "tie" ? (
          <>At ${weeklyRevenue}/week, both models pay you exactly the same.</>
        ) : (
          <>
            At ${weeklyRevenue}/week, <strong className="text-foreground">{winner === "booth" ? "booth rent" : "commission"}</strong> nets
            you ${Math.abs(boothTakeHome - commissionTakeHome).toFixed(0)} more per week.
          </>
        )}{" "}
        Your breakeven point — where both models pay identically — is{" "}
        <strong className="text-foreground">${breakeven.toFixed(0)}/week</strong> in gross revenue at these rates. Above
        that, booth rent wins; below it, commission wins.
      </p>
    </div>
  )
}
