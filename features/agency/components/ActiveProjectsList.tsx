"use client"

import Link from "next/link"
import { Building2, BarChart3, ArrowRight } from "lucide-react"

export interface AgencyProject {
    id: string
    name: string
    slug: string
    status: string
    type: string
    active_campaign_name?: string
    clients?: {
        name: string
        industry: string
    }
}

interface ActiveProjectsListProps {
    projects: AgencyProject[]
}

export function ActiveProjectsList({ projects }: ActiveProjectsListProps) {
    return (
        <div className="glass-panel rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Active Projects
                </h3>
                <Link href="/select-portal" className="text-xs text-primary hover:underline flex items-center gap-1">
                    View All <ArrowRight className="h-3 w-3" />
                </Link>
            </div>
            <div className="space-y-3">
                {projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No active projects</p>
                ) : (
                    projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/dashboard/${project.slug}`}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{project.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                        {project.clients?.name || "No Client"} • {project.status}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] py-0.5 px-2 rounded-full bg-white/5 text-muted-foreground border border-white/5 uppercase font-bold tracking-tighter">
                                    {project.type}
                                </span>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
