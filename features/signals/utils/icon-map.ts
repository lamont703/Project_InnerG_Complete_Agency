import {
    Zap,
    AlertTriangle,
    Sparkles,
    Activity,
    MessageSquare,
    Cpu,
    Target
} from "lucide-react"

export const SIGNAL_ICON_MAP: Record<string, any> = {
    Zap,
    AlertTriangle,
    Sparkles,
    Activity,
    MessageSquare,
    Cpu,
    Target
}

export function getSignalIcon(name: string) {
    return SIGNAL_ICON_MAP[name] || Activity
}
