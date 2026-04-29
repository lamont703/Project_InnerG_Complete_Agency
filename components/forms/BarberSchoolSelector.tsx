"use client"

import * as React from "react"
import { Check, ChevronsUpDown, School, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TEXAS_BARBER_SCHOOLS } from "@/lib/schools"
import { motion, AnimatePresence } from "framer-motion"

interface BarberSchoolSelectorProps {
  onSelect: (value: { name: string; city: string; state: string; isOther: boolean }) => void
}

export function BarberSchoolSelector({ onSelect }: BarberSchoolSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")
  const [isOther, setIsOther] = React.useState(false)
  const [otherName, setOtherName] = React.useState("")
  const [otherCity, setOtherCity] = React.useState("")
  const [otherState, setOtherState] = React.useState("TX")

  const handleSelect = (currentValue: string) => {
    if (currentValue === "other") {
      setIsOther(true)
      setValue("other")
      setOpen(false)
      onSelect({ name: "", city: "", state: "TX", isOther: true })
    } else {
      setIsOther(false)
      setValue(currentValue)
      setOpen(false)
      onSelect({ name: currentValue, city: "", state: "TX", isOther: false })
    }
  }

  const handleOtherChange = (field: "name" | "city" | "state", val: string) => {
    const update = {
      name: field === "name" ? val : otherName,
      city: field === "city" ? val : otherCity,
      state: field === "state" ? val : otherState,
      isOther: true
    }
    if (field === "name") setOtherName(val)
    if (field === "city") setOtherCity(val)
    if (field === "state") setOtherState(val)
    onSelect(update)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          Select Your Barber School
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-6 text-sm font-bold hover:bg-slate-100 hover:border-slate-200 transition-all text-left h-auto"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <School className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">
                  {value === "other" 
                    ? "Other / School Not Listed" 
                    : value 
                      ? TEXAS_BARBER_SCHOOLS.find((school) => school === value)
                      : "Search for your school..."}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 rounded-2xl border-2 border-slate-100 shadow-2xl bg-white" align="start">
            <Command className="rounded-2xl bg-white">
              <CommandInput placeholder="Search schools..." className="h-12 text-sm font-bold border-none focus:ring-0 text-slate-900" />
              <CommandList className="max-h-[300px] no-scrollbar">
                <CommandEmpty className="py-6 text-center">
                  <p className="text-sm font-bold text-slate-400">No school found.</p>
                  <Button 
                    variant="link" 
                    className="text-primary font-black uppercase tracking-widest text-[10px] mt-2"
                    onClick={() => handleSelect("other")}
                  >
                    Select "Other / Not Listed"
                  </Button>
                </CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="other"
                    onSelect={() => handleSelect("other")}
                    className="flex items-center gap-2 p-3 aria-selected:bg-primary/5 cursor-pointer"
                  >
                    <div className={cn(
                      "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
                      value === "other" ? "border-primary bg-primary" : "border-slate-200"
                    )}>
                      {value === "other" && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm font-black text-primary italic uppercase tracking-tight">Other / My School is Not Listed</span>
                  </CommandItem>
                  {TEXAS_BARBER_SCHOOLS.map((school) => (
                    <CommandItem
                      key={school}
                      value={school}
                      onSelect={() => handleSelect(school)}
                      className="flex items-center gap-2 p-3 aria-selected:bg-slate-50 cursor-pointer"
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
                        value === school ? "border-primary bg-primary" : "border-slate-200"
                      )}>
                        {value === school && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{school}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <AnimatePresence>
        {isOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Enter School Name
              </label>
              <input
                type="text"
                required
                placeholder="Unlisted School Name"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none"
                onChange={(e) => handleOtherChange("name", e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Austin"
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-9 pr-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none"
                    onChange={(e) => handleOtherChange("city", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  State
                </label>
                <input
                  type="text"
                  required
                  placeholder="TX"
                  maxLength={2}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none uppercase"
                  onChange={(e) => handleOtherChange("state", e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
