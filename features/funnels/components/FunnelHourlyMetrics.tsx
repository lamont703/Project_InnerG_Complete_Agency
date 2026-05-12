"use client"

import React from "react"
import { useProjectFunnel } from "../hooks/use-project-funnel"
import { Target, Users, Zap, TrendingUp, Loader2 } from "lucide-react"

interface FunnelHourlyMetricsProps {
    projectSlug: string
}

export function FunnelHourlyMetrics({ projectSlug }: FunnelHourlyMetricsProps) {
    const {
        isLoading,
        youtubeMetrics,
        tiktokMetrics,
        linkedinMetrics,
        instagramMetrics,
        facebookMetrics,
        twitterMetrics,
        pixelMetrics24h: pixelMetrics,
        socialGrowth24h,
        funnelConfig
    } = useProjectFunnel(projectSlug)

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse mt-12">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-3xl border border-border bg-muted/10" />
                ))}
            </div>
        )
    }

    // Default configuration if missing
    const config = funnelConfig || {
        sources: [
            { id: 'yt', enabled: true, metric: 'views' },
            { id: 'tt', enabled: true, metric: 'totalViews' },
            { id: 'li', enabled: true, metric: 'views' },
            { id: 'ig', enabled: true, metric: 'reach' },
            { id: 'fb', enabled: true, metric: 'reach' },
            { id: 'tw', enabled: true, metric: 'impressions' }
        ],
        engagement: {
            metrics: [
                { id: "likes", enabled: true },
                { id: "comments", enabled: true },
                { id: "shares", enabled: true },
                { id: "visitors", enabled: true }
            ]
        },
        conversion: {
            metrics: [
                { event_name: "Go To Step #2", enabled: true },
                { event_name: "Request Growth Audit", enabled: true },
                { event_name: "Schedule a Growth Audit", enabled: true },
                { event_name: "button-CLEbFRjXN7_btn", enabled: true }
            ]
        },
        subscribers: {
            metrics: [
                { event_name: "Newsletter Subscribe", enabled: true }
            ]
        }
    }

    if (funnelConfig && !funnelConfig.subscribers) {
        config.subscribers = {
            metrics: [{ event_name: "Newsletter Subscribe", enabled: true }]
        }
    }

    // 1. Global Source Intake (24h Growth Delta)
    const totalSourceIntake = config.sources.filter((s:any) => s.enabled).reduce((acc: number, s: any) => {
        if (!socialGrowth24h) return 0;
        
        const delta = s.id === 'yt' ? socialGrowth24h.youtube : 
                      s.id === 'tt' ? socialGrowth24h.tiktok : 
                      s.id === 'li' ? socialGrowth24h.linkedin : 
                      s.id === 'ig' ? socialGrowth24h.instagram : 
                      s.id === 'tw' ? socialGrowth24h.twitter :
                      s.id === 'fb' ? socialGrowth24h.facebook : 0;
        
        return acc + (delta || 0);
    }, 0);

    // 2. Engagement Pool (24h Growth Delta)
    const totalEngagement = (socialGrowth24h?.engagement || 0) + (pixelMetrics?.uniqueVisitors || 0);

    // 3. Conversion Hub
    const totalConversions = config.conversion.metrics.filter((m:any) => m.enabled).reduce((acc: number, m: any) => {
        return acc + (pixelMetrics?.clicks[m.event_name || ''] || 0);
    }, 0);

    // 4. Subscribers
    const totalSubscribers = config.subscribers.metrics.filter((m:any) => m.enabled).reduce((acc: number, m: any) => {
        return acc + (pixelMetrics?.clicks[m.event_name || ''] || 0);
    }, 0);

    // Hourly Calculations (Rolling 24h approximation)
    const metrics = [
        { 
            title: "Global Source Intake", 
            value: (Math.round(totalSourceIntake / 24) || 0).toLocaleString(), 
            suffix: "/hr",
            status: "VOLUME",
            icon: Zap, 
            color: "text-blue-400", 
            bg: "bg-blue-500/10" 
        },
        { 
            title: "Engagement Pool", 
            value: (Math.round(totalEngagement / 24) || 0).toLocaleString(), 
            suffix: "/hr",
            status: "ACTIVE",
            icon: Users, 
            color: "text-violet-400", 
            bg: "bg-violet-500/10" 
        },
        { 
            title: "Conversion Hub", 
            value: (Math.round(totalConversions / 24) || 0).toLocaleString(), 
            suffix: "/hr",
            status: "CONVERTING",
            icon: Target, 
            color: "text-emerald-400", 
            bg: "bg-emerald-500/10" 
        },
        { 
            title: "Subscribers", 
            value: (Math.round(totalSubscribers / 24) || 0).toLocaleString(), 
            suffix: "/hr",
            status: "GROWTH",
            icon: TrendingUp, 
            color: "text-amber-400", 
            bg: "bg-amber-500/10" 
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            {metrics.map((stat: any) => (
                <div key={stat.title} className="p-6 rounded-3xl border border-border bg-muted/10 backdrop-blur-sm group hover:border-primary/20 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon className="h-4 w-4" />
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${stat.bg} ${stat.color}`}>{stat.status}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1 group-hover:text-foreground transition-colors">{stat.title}</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-black text-foreground">{stat.value}</p>
                        <span className="text-sm font-bold text-muted-foreground">{stat.suffix}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
