"use client"

import { ActivityFeed as ModularActivityFeed } from "@/features/activity/ActivityFeed"

interface ActivityFeedProps {
    projectSlug: string
    entries?: any[]
}

/**
 * @deprecated Use @/features/activity/ActivityFeed instead.
 * This wrapper maintains compatibility during the modular transition.
 */
export function ActivityFeed({ projectSlug, entries }: ActivityFeedProps) {
    return (
        <ModularActivityFeed
            projectSlug={projectSlug}
            initialEntries={entries}
        />
    )
}
