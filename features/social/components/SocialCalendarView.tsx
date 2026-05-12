"use client"

import { useState } from "react"
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    addMonths, 
    subMonths 
} from "date-fns"
import { 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    Zap,
    Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

interface ScheduledPost {
    id: string
    platform: string
    content: string
    title: string | null
    scheduled_at: string | null
    status: string
    type: 'manual' | 'agent'
}

interface SocialCalendarViewProps {
    posts: ScheduledPost[]
    onPublishNow: (id: string) => void
    getPlatformIcon: (platform: string) => React.ReactNode
}

export function SocialCalendarView({ posts, onPublishNow, getPlatformIcon }: SocialCalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const postsByDay = (day: Date) => {
        return posts.filter(post => {
            const date = post.scheduled_at ? new Date(post.scheduled_at) : null
            return date && isSameDay(date, day)
        })
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    return (
        <div className="space-y-8 max-w-7xl mx-auto w-full">
            {/* HUD Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-6">
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-foreground flex items-center gap-4">
                        {format(currentMonth, "MMMM")}
                        <span className="text-primary font-light italic">{format(currentMonth, "yyyy")}</span>
                    </h2>
                    <div className="flex items-center gap-1 bg-muted/10 border border-border/40 rounded-xl p-1">
                        <button 
                            onClick={prevMonth}
                            className="p-2 hover:bg-muted/20 rounded-lg text-muted-foreground hover:text-primary transition-all"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button 
                            onClick={() => setCurrentMonth(new Date())}
                            className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                        >
                            Today
                        </button>
                        <button 
                            onClick={nextMonth}
                            className="p-2 hover:bg-muted/20 rounded-lg text-muted-foreground hover:text-primary transition-all"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/5 border border-border/40 rounded-2xl">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operational Status: Ready</span>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border/20 border border-border/40 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-3xl">
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="bg-background/80 py-4 text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{day}</span>
                    </div>
                ))}

                {/* Days */}
                {calendarDays.map((day, idx) => {
                    const dayPosts = postsByDay(day)
                    const isToday = isSameDay(day, new Date())
                    const isCurrentMonth = isSameMonth(day, monthStart)

                    return (
                        <div 
                            key={day.toISOString()}
                            className={`min-h-[160px] bg-background/40 p-4 transition-all relative group border-r border-b border-border/10 last:border-r-0 ${
                                isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/20'
                            } ${isToday ? 'bg-primary/5' : ''} hover:bg-muted/5`}
                        >
                            {/* Day Number */}
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-sm font-black ${isToday ? 'h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center -mt-1 -ml-1' : ''}`}>
                                    {format(day, "d")}
                                </span>
                                {dayPosts.length > 0 && (
                                    <span className="text-[8px] font-black bg-muted/20 px-2 py-0.5 rounded-md uppercase tracking-widest text-muted-foreground">
                                        {dayPosts.length} post{dayPosts.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            {/* Post Badges */}
                            <div className="space-y-2 overflow-y-auto max-h-[100px] custom-scrollbar pr-1">
                                {dayPosts.map(post => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: -5 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={post.id}
                                        className={`p-2 rounded-xl border flex items-center gap-2 group/item transition-all cursor-pointer ${
                                            post.status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/10' :
                                            post.status === 'pending' ? 'bg-primary/10 border-primary/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10' :
                                            'bg-red-500/5 border-red-500/10'
                                        }`}
                                    >
                                        <div className="shrink-0 scale-75">
                                            {getPlatformIcon(post.platform)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold truncate leading-tight">{post.title || post.platform}</p>
                                            <div className="flex items-center gap-1 text-[8px] text-muted-foreground uppercase font-black opacity-60">
                                                <Clock className="h-2 w-2" />
                                                {format(new Date(post.scheduled_at!), "HH:mm")}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Add Icon on Hover */}
                            {isCurrentMonth && (
                                <button className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-primary text-primary-foreground scale-0 group-hover:scale-100 transition-all shadow-xl shadow-primary/20 flex items-center justify-center active:scale-95">
                                    <Zap className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Legend / Quick Stats */}
            <div className="flex gap-6">
                <div className="p-6 rounded-[2rem] glass-panel border border-border flex-1 flex items-center justify-between">
                    <div className="flex gap-10">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Monthly Goal</span>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-32 bg-muted/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-3/4 rounded-full" />
                                </div>
                                <span className="text-sm font-bold">75%</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 text-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">High Engagement</span>
                            <span className="text-sm font-bold text-emerald-400">Tue / Thu</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase font-black italic">
                        <Info className="h-4 w-4 text-primary" />
                        AI suggests optimal posting times based on historical reach
                    </div>
                </div>
            </div>
        </div>
    )
}
