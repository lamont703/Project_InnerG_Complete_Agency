import {
    UserPlus,
    Download,
    Zap,
    Instagram,
    Building2,
    AlertTriangle,
    Sparkles,
    Layout,
    Target,
    BarChart3,
    Linkedin,
    Youtube,
    Play
} from "lucide-react"

export const SLOT_ICON_MAP: Record<string, any> = {
    UserPlus,
    Download,
    Zap,
    Instagram,
    Building2,
    AlertTriangle,
    Sparkles,
    Layout,
    Target,
    BarChart3,
    Linkedin,
    Youtube,
    Play
}

export function getIcon(name: string) {
    return SLOT_ICON_MAP[name] || Layout
}
