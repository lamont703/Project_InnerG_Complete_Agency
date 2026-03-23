"use client"

import React from "react"
import { Youtube, Music, Linkedin, Instagram, Facebook, Twitter, AtSign, Zap, Loader2 } from "lucide-react"
import { useProjectFunnel } from "../hooks/use-project-funnel"
import { SankeyFunnel } from "@/features/agency/components/SankeyFunnel"

interface OmniChannelStreamProps {
    projectSlug: string
    title?: string
    showMetricsGrid?: boolean
}

export function OmniChannelStream({ projectSlug, title = "Omni-Channel Stream", showMetricsGrid = false }: OmniChannelStreamProps) {
    const {
        isLoading,
        youtubeMetrics,
        tiktokMetrics,
        linkedinMetrics,
        instagramMetrics,
        facebookMetrics,
        pixelMetrics,
        funnelConfig
    } = useProjectFunnel(projectSlug)

    if (isLoading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const PLATFORM_ICONS: Record<string, any> = {
        yt: Youtube,
        tt: Music,
        li: Linkedin,
        ig: Instagram,
        fb: Facebook,
        tw: Twitter,
        th: AtSign,
    }

    // Default values if no config is available yet
    const config = funnelConfig || {
        sources: [
            { id: 'yt', enabled: true, metric: 'views', label: "YouTube", subLabel: "Channel Views", color: "bg-red-500", hex: "#EF4444" },
            { id: 'tt', enabled: true, metric: 'totalViews', label: "TikTok", subLabel: "Video Reach", color: "bg-pink-500", hex: "#EC4899" },
            { id: 'li', enabled: true, metric: 'views', label: "LinkedIn", subLabel: "Post Reach", color: "bg-blue-500", hex: "#3B82F6" },
            { id: 'ig', enabled: true, metric: 'reach', label: "Instagram", subLabel: "Direct Reach", color: "bg-purple-500", hex: "#A855F7" },
            { id: 'fb', enabled: true, metric: 'reach', label: "Facebook", subLabel: "Organic Flow", color: "bg-blue-600", hex: "#2563EB" },
            { id: 'tw', enabled: false, metric: 'reach', label: "X / Twitter", subLabel: "Pulse Traffic", color: "bg-zinc-800", hex: "#A1A1AA" },
            { id: 'th', enabled: false, metric: 'reach', label: "Threads", subLabel: "Social Threads", color: "bg-zinc-100", hex: "#FFFFFF" },
        ],
        engagement: {
            label: "Engagement Pool",
            subLabel: "Intention Signal Filter",
            metrics: [
                { id: "likes", label: "Total Hearts/Likes", enabled: true },
                { id: "comments", label: "Conversation (Comments)", enabled: true },
                { id: "shares", label: "Share Velocity", enabled: true },
                { id: "visitors", label: "Pixel Unique Visitors", enabled: true }
            ]
        },
        conversion: {
            label: "Conversion Hub",
            subLabel: "Revenue Qualified Output",
            metrics: [
                { id: "step_2", label: "Step #2 Clicks", enabled: true, event_name: "Go To Step #2" },
                { id: "audit_request", label: "Request Audit", enabled: true, event_name: "Request Growth Audit" },
                { id: "audit_schedule", label: "Schedule Audit", enabled: true, event_name: "Schedule a Growth Audit" },
                { id: "school_login", label: "School Logins", enabled: true, event_name: "button-CLEbFRjXN7_btn" }
            ]
        }
    }

    const funnelData = {
        sources: config.sources.map((s: any) => {
            const metricsSource = s.id === 'yt' ? youtubeMetrics : 
                                 s.id === 'tt' ? tiktokMetrics : 
                                 s.id === 'li' ? linkedinMetrics : 
                                 s.id === 'ig' ? instagramMetrics : 
                                 s.id === 'fb' ? facebookMetrics : null;
            
            const rawVal = metricsSource ? (metricsSource[s.metric] || 0) : 0;
            const displayVal = rawVal > 1000 ? (rawVal / 1000).toFixed(1) + "k" : rawVal.toString();

            return {
                id: s.id,
                icon: PLATFORM_ICONS[s.id] || Zap,
                label: s.label,
                value: s.enabled ? displayVal : "0",
                rawValue: s.enabled ? rawVal : 0,
                subValue: s.subLabel,
                color: s.color,
                hex: s.hex
            };
        }),
        engagement: {
            label: config.engagement.label,
            subValue: config.engagement.subLabel,
            rawValue: (
                (config.engagement.metrics.find((m: any) => m.id === 'likes')?.enabled ? (
                    (youtubeMetrics?.likes || 0) + (linkedinMetrics?.likes || 0) + (instagramMetrics?.likes || 0) + (tiktokMetrics?.videoLikes || 0) + (facebookMetrics?.likes || 0)
                ) : 0) +
                (config.engagement.metrics.find((m: any) => m.id === 'comments')?.enabled ? (
                    (youtubeMetrics?.comments || 0) + (linkedinMetrics?.comments || 0) + (instagramMetrics?.comments || 0) + (tiktokMetrics?.videoComments || 0) + (facebookMetrics?.comments || 0)
                ) : 0) +
                (config.engagement.metrics.find((m: any) => m.id === 'shares')?.enabled ? (
                    (linkedinMetrics?.shares || 0) + (tiktokMetrics?.videoShares || 0)
                ) : 0) +
                (config.engagement.metrics.find((m: any) => m.id === 'visitors')?.enabled ? (pixelMetrics?.uniqueVisitors || 0) : 0)
            ),
            value: (
                (config.engagement.metrics.find((m: any) => m.id === 'likes')?.enabled ? (
                    (youtubeMetrics?.likes || 0) + (linkedinMetrics?.likes || 0) + (instagramMetrics?.likes || 0) + (tiktokMetrics?.videoLikes || 0) + (facebookMetrics?.likes || 0)
                ) : 0) +
                (config.engagement.metrics.find((m: any) => m.id === 'comments')?.enabled ? (
                    (youtubeMetrics?.comments || 0) + (linkedinMetrics?.comments || 0) + (instagramMetrics?.comments || 0) + (tiktokMetrics?.videoComments || 0) + (facebookMetrics?.comments || 0)
                ) : 0) +
                (config.engagement.metrics.find((m: any) => m.id === 'shares')?.enabled ? (
                    (linkedinMetrics?.shares || 0) + (tiktokMetrics?.videoShares || 0)
                ) : 0) +
                (config.engagement.metrics.find((m: any) => m.id === 'visitors')?.enabled ? (pixelMetrics?.uniqueVisitors || 0) : 0)
            ).toLocaleString(),
            metrics: config.engagement.metrics.filter((m: any) => m.enabled).map((m: any) => {
                let val = "0";
                if (m.id === 'likes') val = ((youtubeMetrics?.likes || 0) + (linkedinMetrics?.likes || 0) + (instagramMetrics?.likes || 0) + (tiktokMetrics?.videoLikes || 0) + (facebookMetrics?.likes || 0)).toLocaleString();
                if (m.id === 'comments') val = ((youtubeMetrics?.comments || 0) + (linkedinMetrics?.comments || 0) + (instagramMetrics?.comments || 0) + (tiktokMetrics?.videoComments || 0) + (facebookMetrics?.comments || 0)).toLocaleString();
                if (m.id === 'shares') val = ((linkedinMetrics?.shares || 0) + (tiktokMetrics?.videoShares || 0)).toLocaleString();
                if (m.id === 'visitors') val = (pixelMetrics?.uniqueVisitors || 0).toLocaleString();
                return { label: m.label, value: val };
            })
        },
        conversion: {
            label: config.conversion.label,
            subValue: config.conversion.subLabel,
            rawValue: config.conversion.metrics.filter((m:any) => m.enabled).reduce((acc: number, m: any) => {
                return acc + (pixelMetrics?.clicks[m.event_name || ''] || 0);
            }, 0),
            value: config.conversion.metrics.filter((m:any) => m.enabled).reduce((acc: number, m: any) => {
                return acc + (pixelMetrics?.clicks[m.event_name || ''] || 0);
            }, 0).toString(),
            metrics: config.conversion.metrics.filter((m: any) => m.enabled).map((m: any) => {
                return { label: m.label, value: (pixelMetrics?.clicks[m.event_name || ''] || 0).toString() };
            })
        }
    }

    return (
        <section className="relative p-10 rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-3xl overflow-hidden shadow-2xl w-full">
            <div className="absolute top-6 left-10 flex items-center gap-3 z-20">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{title} • Rendering</span>
            </div>

            <div className="absolute top-6 right-10 flex items-center gap-6 z-20">
                <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Project Reach</span>
                    <span className="text-sm font-black text-white tracking-tight">
                        {((youtubeMetrics?.views || 0) + (tiktokMetrics?.totalViews || 0) + (linkedinMetrics?.views || 0) + (instagramMetrics?.reach || 0)).toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="relative min-h-[600px] flex items-center justify-center pt-8">
                <SankeyFunnel data={funnelData} />
            </div>
            
            {showMetricsGrid && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/5">
                    {funnelData.sources.filter(s => s.rawValue > 0).slice(0, 4).map(source => (
                        <div key={source.id} className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{source.label}</span>
                            <span className="text-lg font-black text-white leading-none">{source.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
