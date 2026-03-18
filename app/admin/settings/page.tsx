"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Loader2,
    ArrowLeft,
    Settings,
    Building2,
    Globe,
    Palette,
    Bell,
    Mail,
    Shield,
    Save,
    CheckCircle2,
    Moon,
    Sun,
    Monitor
} from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"

// ─────────────────────────────────────────────
// SETTINGS SECTIONS
// ─────────────────────────────────────────────

interface SettingsSection {
    id: string
    title: string
    description: string
    icon: React.ElementType
    color: string
}

const SECTIONS: SettingsSection[] = [
    {
        id: "agency",
        title: "Agency Profile",
        description: "Name, description, and agency branding",
        icon: Building2,
        color: "text-primary",
    },
    {
        id: "domain",
        title: "Domain & URLs",
        description: "Custom domain and redirect settings",
        icon: Globe,
        color: "text-blue-400",
    },
    {
        id: "appearance",
        title: "Appearance",
        description: "Theme colors and branding assets",
        icon: Palette,
        color: "text-violet-400",
    },
    {
        id: "notifications",
        title: "Notifications",
        description: "Email alerts and notification preferences",
        icon: Bell,
        color: "text-amber-400",
    },
    {
        id: "email",
        title: "Email Configuration",
        description: "SMTP and transactional email settings",
        icon: Mail,
        color: "text-emerald-400",
    },
    {
        id: "security",
        title: "Security",
        description: "API keys, authentication, and access controls",
        icon: Shield,
        color: "text-red-400",
    },
]

export default function AgencySettingsPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [activeSection, setActiveSection] = useState("agency")
    const [isSaving, setIsSaving] = useState(false)
    const [showSaved, setShowSaved] = useState(false)
    const { theme, setTheme } = useTheme()

    const [agencyName, setAgencyName] = useState("")
    const [agencyDescription, setAgencyDescription] = useState("")
    const [supportEmail, setSupportEmail] = useState("")
    const [primaryDomain, setPrimaryDomain] = useState("")
    
    // Appearance state
    const [primaryColor, setPrimaryColor] = useState("#C8FF00")
    const [accentColor, setAccentColor] = useState("#8B5CF6")
    const [backgroundColor, setBackgroundColor] = useState("dynamic")

    const AGENCY_SENTINEL_ID = '00000000-0000-0000-0000-000000000000'

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push("/login"); return }

                const { data: profile } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single() as any

                if (!profile || profile.role !== "super_admin") {
                    router.push("/select-portal")
                    return
                }

                // Fetch real data from agency_profile
                const { data: settingsData, error: settingsError } = await (supabase
                    .from("agency_profile")
                    .select("*")
                    .eq("id", AGENCY_SENTINEL_ID)
                    .maybeSingle() as any)

                if (settingsError) {
                    console.error("[Settings] Fetch error:", settingsError)
                } else if (settingsData) {
                    setAgencyName(settingsData.name || "Inner G Complete")
                    setAgencyDescription(settingsData.description || "")
                    setSupportEmail(settingsData.support_email || "")
                    setPrimaryDomain(settingsData.primary_domain || "")
                    
                    // Set appearance from DB
                    if (settingsData.theme_preference) setTheme(settingsData.theme_preference)
                    if (settingsData.brand_colors) {
                        setPrimaryColor(settingsData.brand_colors.primary || "#C8FF00")
                        setAccentColor(settingsData.brand_colors.accent || "#8B5CF6")
                        setBackgroundColor(settingsData.brand_colors.background || "dynamic")
                    }
                }
            } catch (err) {
                console.error("[Settings] Load error:", err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [router, setTheme])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase
                .from("agency_profile")
                .upsert({
                    id: AGENCY_SENTINEL_ID,
                    name: agencyName,
                    description: agencyDescription,
                    support_email: supportEmail,
                    primary_domain: primaryDomain,
                    theme_preference: theme,
                    brand_colors: {
                        primary: primaryColor,
                        accent: accentColor,
                        background: backgroundColor
                    },
                    updated_at: new Date().toISOString()
                }) as any)

            if (error) throw error

            setShowSaved(true)
            setTimeout(() => setShowSaved(false), 2500)
        } catch (err) {
            console.error("[Settings] Save error:", err)
            alert("Failed to save settings. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading settings...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <AdminHeader 
                title="Agency Settings" 
                subtitle="Infrastructure & Branding Configuration"
            />

            <div className="flex-1 p-6 md:p-10 relative z-10 max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
                    {/* Sidebar Nav */}
                    <nav className="space-y-1">
                        {SECTIONS.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all ${activeSection === section.id
                                        ? "bg-primary/10 text-primary font-medium border border-primary/20"
                                        : "text-muted-foreground hover:bg-muted/10 border border-transparent"
                                    }`}
                            >
                                <section.icon className={`h-4 w-4 ${activeSection === section.id ? section.color : ""}`} />
                                {section.title}
                            </button>
                        ))}
                    </nav>

                    {/* Content Area */}
                    <div className="glass-panel rounded-2xl border border-border p-6 md:p-8">
                        {activeSection === "agency" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground mb-1">Agency Profile</h2>
                                    <p className="text-xs text-muted-foreground">Basic information about your agency.</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Agency Name</label>
                                        <Input
                                            value={agencyName}
                                            onChange={(e) => setAgencyName(e.target.value)}
                                            className="bg-background border-border rounded-xl max-w-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Description</label>
                                        <textarea
                                            value={agencyDescription}
                                            onChange={(e) => setAgencyDescription(e.target.value)}
                                            rows={3}
                                            className="w-full max-w-md px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Support Email</label>
                                        <Input
                                            value={supportEmail}
                                            onChange={(e) => setSupportEmail(e.target.value)}
                                            className="bg-background border-border rounded-xl max-w-md"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === "domain" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground mb-1">Domain & URLs</h2>
                                    <p className="text-xs text-muted-foreground">Custom domain settings for your agency portal.</p>
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Primary Domain</label>
                                    <Input
                                        value={primaryDomain}
                                        onChange={(e) => setPrimaryDomain(e.target.value)}
                                        placeholder="agency.innergcomplete.com"
                                        className="bg-background border-border rounded-xl max-w-md"
                                    />
                                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">Custom domain for white-label client portals.</p>
                                </div>
                            </div>
                        )}

                        {activeSection === "appearance" && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground mb-1">Theme Preference</h2>
                                    <p className="text-xs text-muted-foreground mb-4">Choose how the agency dashboard appears to you.</p>
                                    
                                    <div className="flex flex-wrap gap-4">
                                        {[
                                            { id: 'light', name: 'Light Mode', icon: Sun },
                                            { id: 'dark', name: 'Dark Mode', icon: Moon },
                                            { id: 'system', name: 'System', icon: Monitor }
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTheme(t.id)}
                                                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all w-32 ${
                                                    theme === t.id 
                                                    ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5" 
                                                    : "bg-muted/5 border-border text-muted-foreground hover:bg-muted/10"
                                                }`}
                                            >
                                                <t.icon className="h-6 w-6" />
                                                <span className="text-xs font-bold uppercase tracking-wider">{t.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-border">
                                    <h2 className="text-lg font-bold text-foreground mb-1">Color Palette</h2>
                                    <p className="text-xs text-muted-foreground mb-4">Brand color configuration.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-xl">
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Primary</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="color" 
                                                    value={primaryColor}
                                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                                    className="h-10 w-10 rounded-lg bg-transparent border-none cursor-pointer"
                                                />
                                                <Input 
                                                    value={primaryColor}
                                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                                    className="bg-background border-border rounded-xl text-[10px] h-10"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Accent</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="color" 
                                                    value={accentColor}
                                                    onChange={(e) => setAccentColor(e.target.value)}
                                                    className="h-10 w-10 rounded-lg bg-transparent border-none cursor-pointer"
                                                />
                                                <Input 
                                                    value={accentColor}
                                                    onChange={(e) => setAccentColor(e.target.value)}
                                                    className="bg-background border-border rounded-xl text-[10px] h-10"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Background Style</label>
                                            <select
                                                value={backgroundColor}
                                                onChange={(e) => setBackgroundColor(e.target.value)}
                                                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                            >
                                                <option value="dynamic">Dynamic Noise</option>
                                                <option value="solid">Solid Glass</option>
                                                <option value="gradient">Deep Gradient</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground/60">Advanced branding customization coming in a future update.</p>
                            </div>
                        )}

                        {(activeSection === "notifications" || activeSection === "email" || activeSection === "security") && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground mb-1">
                                        {SECTIONS.find(s => s.id === activeSection)?.title}
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        {SECTIONS.find(s => s.id === activeSection)?.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/5 border border-border">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Settings className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-foreground">Coming Soon</p>
                                        <p className="text-[10px] text-muted-foreground">This section will be available in a future update.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save Button */}
                        <div className="mt-8 pt-6 border-t border-border flex items-center gap-3">
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : showSaved ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {showSaved ? "Saved!" : "Save Changes"}
                            </Button>
                            {showSaved && (
                                <span className="text-xs text-emerald-400 animate-in fade-in">Settings saved successfully</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
