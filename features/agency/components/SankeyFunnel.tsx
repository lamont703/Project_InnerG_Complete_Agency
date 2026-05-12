"use client"

import { motion } from "framer-motion"
import { Youtube, Music, Linkedin, Instagram, Sparkles, Target, Zap, Users, MousePointer2, MessageSquare, UserPlus, TrendingUp, Facebook, Twitter, AtSign, Globe } from "lucide-react"

export interface FunnelSource {
    id: string
    icon: any
    label: string
    value: string
    rawValue: number
    subValue: string
    color: string
    glowColor: string
    hex: string
}

export interface FunnelData {
    sources: FunnelSource[]
    engagement: {
        label: string
        value: string
        rawValue: number
        subValue: string
        metrics: { label: string, value: string }[]
    }
    conversion: {
        label: string
        value: string
        rawValue: number
        subValue: string
        metrics: { label: string, value: string }[]
    }
    subscribers?: {
        label: string
        value: string
        rawValue: number
        subValue: string
        metrics: { label: string, value: string }[]
    }
}

interface FunnelNodeProps {
    icon: any
    label: string
    value: string
    subValue: string
    color: string
    glowColor: string
}

const FunnelNode = ({ icon: Icon, label, value, subValue, color, glowColor }: FunnelNodeProps) => (
    <div className={`relative group flex flex-col items-center justify-center p-2.5 md:p-3 rounded-lg md:rounded-xl border border-white/20 bg-black/60 backdrop-blur-xl transition-all duration-500 hover:border-${color}/50 hover:shadow-[0_0_20px_rgba(0,0,0,0.5),0_0_10px_${glowColor}] w-full min-h-[85px] md:min-h-[100px] z-10 overflow-hidden`}>
        <div className={`p-1.5 rounded-lg ${color} mb-1 bg-opacity-30 flex items-center justify-center`}>
            <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${color.replace('bg-', 'text-')}`} />
        </div>
        <span className="text-[7px] md:text-[9px] font-black uppercase tracking-[0.15em] text-white/70 group-hover:text-white transition-colors truncate w-full text-center">{label}</span>
        <span className="text-xs md:text-base font-black text-white">{value}</span>
        <span className="text-[6px] md:text-[8px] font-bold text-white/50 whitespace-nowrap">{subValue}</span>
        
        <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_8px_${glowColor}] animate-pulse`} />
    </div>
)

export function SankeyFunnel({ data }: { data?: FunnelData }) {
    // Current Active Sources
    const sources = data?.sources || []
    
    // Dynamic Path Coordinates from Column 1 to Column 2
    const sourcePoints = sources.map((_, i) => {
        return {
            x: 260,
            y: 90 + i * (420 / Math.max(1, sources.length - 1))
        }
    })

    const totalReach = sources.reduce((acc, s) => acc + s.rawValue, 0)
    const engagementRate = totalReach > 0 ? (data?.engagement.rawValue || 0) / totalReach * 100 : 0
    const conversionRate = (data?.engagement.rawValue || 0) > 0 ? (data?.conversion.rawValue || 0) / data!.engagement.rawValue * 100 : 0
    const subscriberRate = (data?.conversion.rawValue || 0) > 0 ? (data?.subscribers?.rawValue || 0) / data!.conversion.rawValue * 100 : 0

    return (
        <div className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-6 rounded-3xl">
            <div className="relative w-full min-w-full md:min-w-[1800px] py-8 md:py-12 px-2 md:px-12 overflow-hidden min-h-[600px] md:min-h-[700px] flex flex-col md:flex-row items-center justify-between bg-transparent mx-auto gap-12 md:gap-8">
                {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

            {/* Desktop SVG Streams Layer */}
            <svg 
                viewBox="0 0 1000 600" 
                className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" 
                preserveAspectRatio="none"
            >
                <defs>
                    {sources.map(s => (
                        <linearGradient key={`grad-h-${s.id}`} id={`grad-h-${s.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="20%" stopColor={s.hex} stopOpacity="0.05" />
                            <stop offset="60%" stopColor={s.hex} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={s.hex} stopOpacity="0.8" />
                        </linearGradient>
                    ))}
                    <linearGradient id="grad-output-glow-2-top" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="20%" stopColor="#EC4899" stopOpacity="0.05" />
                        <stop offset="60%" stopColor="#EC4899" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#EC4899" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="grad-output-glow-2-bottom" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="20%" stopColor="#A855F7" stopOpacity="0.05" />
                        <stop offset="60%" stopColor="#A855F7" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#A855F7" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="grad-output-glow-3-top" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.05" />
                        <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
                    </linearGradient>
                    <linearGradient id="grad-output-glow-3-bottom" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="20%" stopColor="#EF4444" stopOpacity="0.05" />
                        <stop offset="60%" stopColor="#EF4444" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="bloom-ultra" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="15" result="blur"/>
                        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                </defs>

                {/* Background Flowing Paths */}
                {sources.map((s, i) => (
                    <FlowPathHorizontal 
                        key={s.id} 
                        fromX={sourcePoints[i].x} 
                        fromY={sourcePoints[i].y} 
                        toY={300} 
                        colorId={`grad-h-${s.id}`} 
                        colorHex={s.hex} 
                        delay={i * 0.4} 
                    />
                ))}

                {/* Flow from Col 2 to Col 3 (Top Stream) */}
                <g>
                    <path d="M 527 260 Q 572 280 617 260" stroke="url(#grad-output-glow-2-top)" strokeWidth="40" fill="none" style={{ strokeLinecap: 'round', opacity: 1 }} />
                    <motion.path d="M 527 260 Q 572 280 617 260" stroke="#EC4899" strokeWidth="6" fill="none" strokeDasharray="80 120" style={{ strokeLinecap: 'round' }} initial={{ strokeDashoffset: 200, opacity: 0 }} animate={{ strokeDashoffset: [200, 0], opacity: [0, 0.7, 0], transition: { duration: 2.3, repeat: Infinity, ease: "linear" }}} />
                    <motion.circle r="6" fill="white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], transition: { duration: 2.3, repeat: Infinity, ease: "easeInOut" }}} style={{ filter: "drop-shadow(0 0 10px white)" }}>
                        <animateMotion dur="2.3s" repeatCount="indefinite" path="M 527 260 Q 572 280 617 260" />
                    </motion.circle>
                </g>

                {/* Flow from Col 2 to Col 3 (Bottom Stream) */}
                <g>
                    <path d="M 527 340 Q 572 360 617 340" stroke="url(#grad-output-glow-2-bottom)" strokeWidth="40" fill="none" style={{ strokeLinecap: 'round', opacity: 1 }} />
                    <motion.path d="M 527 340 Q 572 360 617 340" stroke="#A855F7" strokeWidth="6" fill="none" strokeDasharray="80 120" style={{ strokeLinecap: 'round' }} initial={{ strokeDashoffset: 200, opacity: 0 }} animate={{ strokeDashoffset: [200, 0], opacity: [0, 0.7, 0], transition: { duration: 2.7, repeat: Infinity, ease: "linear" }}} />
                    <motion.circle r="6" fill="white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], transition: { duration: 2.7, repeat: Infinity, ease: "easeInOut" }}} style={{ filter: "drop-shadow(0 0 10px white)" }}>
                        <animateMotion dur="2.7s" repeatCount="indefinite" path="M 527 340 Q 572 360 617 340" />
                    </motion.circle>
                </g>

                {/* Flow from Col 3 to Col 4 (Top Stream) */}
                <g>
                    <path d="M 750 260 Q 795 280 840 260" stroke="url(#grad-output-glow-3-top)" strokeWidth="40" fill="none" style={{ strokeLinecap: 'round', opacity: 1 }} />
                    <motion.path d="M 750 260 Q 795 280 840 260" stroke="#3B82F6" strokeWidth="6" fill="none" strokeDasharray="80 120" style={{ strokeLinecap: 'round' }} initial={{ strokeDashoffset: 200, opacity: 0 }} animate={{ strokeDashoffset: [200, 0], opacity: [0, 0.7, 0], transition: { duration: 2.4, repeat: Infinity, ease: "linear" }}} />
                    <motion.circle r="6" fill="white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}} style={{ filter: "drop-shadow(0 0 10px white)" }}>
                        <animateMotion dur="2.4s" repeatCount="indefinite" path="M 750 260 Q 795 280 840 260" />
                    </motion.circle>
                </g>

                {/* Flow from Col 3 to Col 4 (Bottom Stream) */}
                <g>
                    <path d="M 750 340 Q 795 360 840 340" stroke="url(#grad-output-glow-3-bottom)" strokeWidth="40" fill="none" style={{ strokeLinecap: 'round', opacity: 1 }} />
                    <motion.path d="M 750 340 Q 795 360 840 340" stroke="#EF4444" strokeWidth="6" fill="none" strokeDasharray="80 120" style={{ strokeLinecap: 'round' }} initial={{ strokeDashoffset: 200, opacity: 0 }} animate={{ strokeDashoffset: [200, 0], opacity: [0, 0.7, 0], transition: { duration: 2.8, repeat: Infinity, ease: "linear" }}} />
                    <motion.circle r="6" fill="white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}} style={{ filter: "drop-shadow(0 0 10px white)" }}>
                        <animateMotion dur="2.8s" repeatCount="indefinite" path="M 750 340 Q 795 360 840 340" />
                    </motion.circle>
                </g>
            </svg>

            <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-12 md:gap-12 pointer-events-none h-full px-4 md:px-10 content-stretch">
                
                {/* Desktop Conversion Tags */}
                <div className="hidden md:block absolute left-[30.5%] top-[10%] pointer-events-auto">
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-1.5 group">
                         <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-500/30 border border-blue-400/50 backdrop-blur-2xl shadow-[0_0_30px_rgba(59,130,246,0.4)]">
                             <TrendingUp className="h-3 w-3 text-white" />
                             <span className="text-xs font-black text-white">{engagementRate.toFixed(1)}%</span>
                         </div>
                         <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/90 drop-shadow-md">Engagement Rate</span>
                         <div className="w-px h-14 bg-gradient-to-b from-blue-400/60 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                    </motion.div>
                </div>

                <div className="hidden md:block absolute left-[57%] top-[10%] pointer-events-auto">
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-1.5 group">
                         <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/30 border border-emerald-400/50 backdrop-blur-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                             <Target className="h-3 w-3 text-white" />
                             <span className="text-xs font-black text-white">{conversionRate.toFixed(1)}%</span>
                         </div>
                         <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/90 drop-shadow-md">Conversion Rate</span>
                         <div className="w-px h-14 bg-gradient-to-b from-emerald-400/60 to-transparent shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                    </motion.div>
                </div>

                {data?.subscribers && (
                <div className="hidden md:block absolute left-[79.5%] top-[10%] pointer-events-auto">
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-col items-center gap-1.5 group">
                         <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-500/30 border border-amber-400/50 backdrop-blur-2xl shadow-[0_0_30px_rgba(251,191,36,0.4)]">
                             <UserPlus className="h-3 w-3 text-white" />
                             <span className="text-xs font-black text-white">{subscriberRate.toFixed(1)}%</span>
                         </div>
                         <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/90 drop-shadow-md">Retention Rate</span>
                         <div className="w-px h-14 bg-gradient-to-b from-amber-400/60 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.3)]" />
                    </motion.div>
                </div>
                )}

                {/* Left Section: Cumulative Source Total + 2-Column Grid */}
                <div className="flex flex-col gap-4 w-full md:w-[420px] pointer-events-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center text-center shadow-lg"
                    >
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60 mb-1">Global Source Intake</span>
                         <span className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                            {totalReach.toLocaleString()}
                         </span>
                         <div className="mt-2 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                         <span className="mt-1 text-[8px] font-bold text-white/40 uppercase tracking-widest leading-none">Total Aggregate Noise Reach</span>
                    </motion.div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4 w-full overflow-x-hidden p-2 md:p-0">
                        {sources.map(s => (
                            <FunnelNode 
                                key={s.id}
                                icon={s.icon}
                                label={s.label}
                                value={s.value}
                                subValue={s.subValue}
                                color={s.color}
                                glowColor={s.glowColor}
                            />
                        ))}
                    </div>
                </div>

                {/* Center Section: Engagement Pool */}
                <div className="flex items-center justify-center w-full md:w-[320px] pointer-events-auto">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative group p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-white/20 bg-black/40 backdrop-blur-3xl transition-all duration-700 hover:border-blue-400/40 shadow-2xl w-full h-auto min-h-[260px] md:h-[320px] flex flex-col items-center justify-center text-center z-10"
                    >
                        <div className="absolute inset-0 rounded-[2.5rem] md:rounded-[4rem] bg-gradient-to-br from-blue-400/10 to-purple-400/10 animate-pulse pointer-events-none" />
                        <Zap className="h-6 w-6 md:h-8 md:w-8 text-blue-300 mb-2 md:mb-4 animate-bounce" />
                        <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] text-white mb-2">{data?.engagement.label || "Engagement Pool"}</span>
                        <span className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{data?.engagement.value || "0"}</span>
                        
                        <div className="mt-6 grid grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 border-t border-white/10 pt-6 w-full opacity-90">
                            {(data?.engagement.metrics || []).map((m, idx) => (
                                <div key={idx} className="flex flex-col items-center">
                                    <span className="text-[8px] md:text-[9px] font-black text-white/80 uppercase tracking-widest leading-none mb-1.5 text-center drop-shadow-sm">{m.label}</span>
                                    <span className="text-xs md:text-sm font-black text-white">{m.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right Section: Conversion Hub */}
                <div className="flex flex-col gap-6 items-center justify-center w-full md:w-[240px] pointer-events-auto">
                    <motion.div 
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="relative group p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/20 bg-black/40 backdrop-blur-2xl transition-all duration-500 hover:border-emerald-400/50 shadow-xl w-full h-auto min-h-[170px] md:h-56 flex flex-col items-center justify-center text-center z-10"
                    >
                        <Target className="h-6 w-6 md:h-8 md:w-8 text-emerald-300 mb-2 md:mb-4" />
                        <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-white mb-2">{data?.conversion.label || "Conversions"}</span>
                        <span className="text-2xl md:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{data?.conversion.value || "0"}</span>
                        
                        <div className="mt-4 flex flex-col gap-2 w-full border-t border-white/10 pt-4 opacity-90">
                             {(data?.conversion.metrics || []).map((m, idx) => (
                                <div key={idx} className="flex justify-between items-center px-1">
                                    <span className="text-[8px] md:text-[9px] font-black text-white/80 uppercase tracking-tight drop-shadow-sm">{m.label}</span>
                                    <span className="text-[10px] md:text-xs font-black text-white">{m.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Fourth Section: Subscribers */}
                {data?.subscribers && (
                    <div className="flex flex-col gap-6 items-center justify-center w-full md:w-[240px] pointer-events-auto">
                        <motion.div 
                            initial={{ x: 30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="relative group p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/20 bg-black/40 backdrop-blur-2xl transition-all duration-500 hover:border-amber-400/50 shadow-xl w-full h-auto min-h-[170px] md:h-56 flex flex-col items-center justify-center text-center z-10"
                        >
                            <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-white mb-2">{data.subscribers.label || "Subscribers"}</span>
                            <span className="text-2xl md:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{data.subscribers.value || "0"}</span>
                            
                            <div className="mt-4 flex flex-col gap-2 w-full border-t border-white/10 pt-4 opacity-90">
                                 {(data.subscribers.metrics || []).map((m, idx) => (
                                    <div key={idx} className="flex justify-between items-center px-1">
                                        <span className="text-[8px] md:text-[9px] font-black text-white/80 uppercase tracking-tight drop-shadow-sm">{m.label}</span>
                                        <span className="text-[10px] md:text-xs font-black text-white">{m.value}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </div>
            </div>
        </div>
    )
}

function FlowPathHorizontal({ fromX, fromY, toY, colorId, colorHex, delay }: { fromX: number, fromY: number, toY: number, colorId: string, colorHex: string, delay: number }) {
    const toX = 350
    const midX = (fromX + toX) / 2
    const path = `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
    
    return (
        <g>
            <path d={path} stroke={`url(#${colorId})`} strokeWidth="40" fill="none" style={{ strokeLinecap: 'round', opacity: 1 }} />
            <motion.path d={path} stroke={colorHex} strokeWidth="6" fill="none" strokeDasharray="80 120" style={{ strokeLinecap: 'round' }} initial={{ strokeDashoffset: 200, opacity: 0 }} animate={{ strokeDashoffset: [200, 0], opacity: [0, 0.7, 0], transition: { duration: 3.5, repeat: Infinity, delay, ease: "linear" }}} />
            <motion.circle r="6" fill="white" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], transition: { duration: 3.5, repeat: Infinity, delay: delay + 1.5, ease: "easeInOut" }}} style={{ filter: "drop-shadow(0 0 10px white)" }}>
                <animateMotion dur="3.5s" repeatCount="indefinite" begin={`${delay + 1.5}s`} path={path} />
            </motion.circle>
        </g>
    )
}
