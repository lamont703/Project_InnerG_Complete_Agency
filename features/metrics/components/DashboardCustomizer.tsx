"use client"

import { useState } from "react"
import {
    Settings2,
    X,
    Layout,
    Check,
    EyeOff,
    Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSlotContext } from "../SlotContext"
import { getIcon } from "../utils/icon-map"

export function DashboardCustomizer() {
    const [isOpen, setIsOpen] = useState(false)
    const {
        activeSlotIds,
        availableSlots,
        toggleSlot
    } = useSlotContext()

    return (
        <>
            {/* Floating Trigger Button */}
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-primary shadow-2xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all z-50 border border-border"
                size="icon"
            >
                <Settings2 className="h-6 w-6 text-primary-foreground" />
            </Button>

            {/* Customizer Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-background/95 backdrop-blur-2xl border-l border-border z-[100] transform transition-transform duration-700 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} shadow-[0_0_100px_rgba(0,0,0,0.8)]`}>
                <div className="flex flex-col h-full relative">
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

                    {/* Header */}
                    <div className="p-8 border-b border-border flex items-center justify-between relative z-10">
                        <div>
                            <h2 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                                <Layout className="h-5 w-5 text-primary" />
                                Aura Layout
                            </h2>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">Configure Architecture View</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="h-10 w-10 rounded-xl bg-muted/10 hover:bg-muted/20 flex items-center justify-center transition-all border border-border"
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Slot List */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10 space-y-10">
                        {/* Metrics Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary">Key Performance Ports</h3>
                                <div className="text-[10px] font-bold text-muted-foreground/40">{availableSlots.length} Available</div>
                            </div>

                            <div className="space-y-4">
                                {availableSlots.map(slot => {
                                    const isActive = activeSlotIds.includes(slot.id)
                                    const Icon = getIcon(slot.iconName)

                                    return (
                                        <div
                                            key={slot.id}
                                            onClick={() => toggleSlot(slot.id)}
                                            className={`group p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${isActive
                                                ? 'bg-primary/10 border-primary/30'
                                                : 'bg-muted/5 border-border hover:border-primary/20'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border transition-all ${isActive ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/20 text-muted-foreground border-border'
                                                    }`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-sm font-bold tracking-tight ${isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                            {slot.label}
                                                        </span>
                                                        {isActive ? (
                                                            <div className="h-5 w-5 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/40">
                                                                <Check className="h-3 w-3 text-primary" />
                                                            </div>
                                                        ) : (
                                                            <EyeOff className="h-4 w-4 text-muted-foreground/20" />
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground/60 mt-1 leading-relaxed">
                                                        {slot.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        {/* intelligence configuration hint */}
                        <div className="p-6 rounded-2xl bg-muted/5 border border-border border-dashed text-center">
                            <Sparkles className="h-5 w-5 text-primary/40 mx-auto mb-3" />
                            <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest">Aura Intelligence Sync</p>
                            <p className="text-[10px] text-muted-foreground/30 mt-2 leading-relaxed">
                                Your layout selections are synced across all your architectures. The AI will prioritize signals related to your pinned ports.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-border relative z-10 bg-muted/5">
                        <Button
                            className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
                            onClick={() => setIsOpen(false)}
                        >
                            Commit Configuration
                        </Button>
                    </div>
                </div>
            </div>
        </>
    )
}
