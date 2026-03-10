import { ActivityEntry } from "../types"

interface ActivityItemProps {
    activity: ActivityEntry
}

export function ActivityItem({ activity }: ActivityItemProps) {
    return (
        <div className="flex gap-4 items-start transition-all duration-500 animate-in fade-in slide-in-from-top-1">
            <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0 shadow-sm shadow-primary/50" />
            <div>
                <p className="text-sm font-medium text-foreground">{activity.action}</p>
                <p className="text-[11px] text-muted-foreground opacity-70 mt-0.5">
                    {activity.category} &bull; {activity.time}
                </p>
            </div>
        </div>
    )
}
