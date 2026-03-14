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
    Play,
    ThumbsUp,
    MessageSquare,
    Share2,
    Eye,
    Video,
    UserCheck,
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
    Play,
    ThumbsUp,
    MessageSquare,
    Share2,
    Eye,
    Video,
    UserCheck
}

export function getIcon(name: string) {
    return SLOT_ICON_MAP[name] || Layout
}
