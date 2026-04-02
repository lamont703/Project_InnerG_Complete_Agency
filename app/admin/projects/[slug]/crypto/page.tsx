"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
    Loader2, 
    ArrowLeft, 
    TrendingUp, 
    Save, 
    ShieldAlert, 
    Zap, 
    Target,
    Settings,
    MessageSquare,
    CheckCircle2,
    Info,
    Plug
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface CryptoConfig {
    is_active: boolean
    symbols: string[]
    risk_per_trade_percent: number
    min_confidence_score: number
    discord_channel_id: string
    discord_channel_name?: string
    alpaca_api_key_id?: string | null
}

export default function CryptoConfigPage() {
    const router = useRouter()
    const { slug } = useParams()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [project, setProject] = useState<any>(null)
    const [alpacaConnector, setAlpacaConnector] = useState<any>(null)
    const [config, setConfig] = useState<CryptoConfig>({
        is_active: false,
        symbols: ["BTC/USD", "ETH/USD"],
        risk_per_trade_percent: 1.0,
        min_confidence_score: 80,
        discord_channel_id: "",
        alpaca_api_key_id: null
    })

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
                
                // 1. Get project details
                const { data: projData } = await (supabase
                    .from("projects")
                    .select("*")
                    .eq("slug", slug as string)
                    .single() as any)

                if (!projData) {
                    router.push("/admin/projects")
                    return
                }
                setProject(projData)

                // 2. Find any existing Alpaca Connectors for this project
                const { data: connectorData } = await (supabase
                    .from("client_db_connections")
                    .select("id, label, is_active")
                    .eq("project_id", projData.id)
                    .or("db_type.eq.alpaca,db_type.eq.alpaca_keys")
                    .single() as any)

                if (connectorData) {
                    setAlpacaConnector(connectorData)
                    // Pre-sync the config state with the discovered connector
                    setConfig(prev => ({ ...prev, alpaca_api_key_id: connectorData.id }))
                }

                // 3. Find any active Community Channels (Discord) for this project
                const { data: communityData } = await (supabase
                    .from("community_channels")
                    .select("id, name, config")
                    .eq("project_id", projData.id)
                    .eq("platform", "discord")
                    .eq("is_active", true)
                    .single() as any)

                let communityChannelId = ""
                if (communityData?.config?.channel_id || communityData?.config?.discord_channel_id) {
                    communityChannelId = communityData.config.channel_id || communityData.config.discord_channel_id
                }

                // 4. Get crypto config
                const { data: cfgData } = await (supabase
                    .from("crypto_intelligence_config")
                    .select("*")
                    .eq("project_id", projData.id)
                    .single() as any)

                if (cfgData) {
                    setConfig({
                        ...cfgData,
                        discord_channel_id: cfgData.discord_channel_id || communityChannelId,
                        discord_channel_name: communityData?.name || "Community Main"
                    })
                } else if (communityChannelId) {
                    setConfig(prev => ({ ...prev, discord_channel_id: communityChannelId }))
                }
            } catch (err) {
                console.error("Failed to load crypto config", err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [slug, router])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            // Explicitly ensure the connector ID is locked in
            const finalConfig = {
                ...config,
                project_id: project.id,
                alpaca_api_key_id: alpacaConnector?.id || config.alpaca_api_key_id,
                updated_at: new Date().toISOString()
            }

            const { error } = await (supabase
                .from("crypto_intelligence_config")
                .upsert(finalConfig as any, { onConflict: 'project_id' }))

            if (error) throw error
            toast.success("Crypto Strategy and Intelligence updated successfully")
        } catch (err) {
            console.error("Save failed", err)
            toast.error("Failed to sync neural configuration")
        } finally {
            setIsSaving(false)
        }
    }

    const handleManualScan = async () => {
        if (!project?.id) return
        setIsScanning(true)
        try {
            const supabase = createBrowserClient()
            const { error } = await supabase.functions.invoke('crypto-intelligence-engine', {
                body: { project_id: project.id }
            })

            if (error) throw error
            toast.success("Manual SMC Scan Complete. Check the Trading Hub for any staged signals.")
        } catch (err: any) {
            console.error("Scan failed", err)
            toast.error(err.message || "Manual scan failed to resolve market confluences")
        } finally {
            setIsScanning(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest italic tracking-tighter text-foreground mb-2">Accessing Strategy Core...</h2>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            <AdminHeader 
                title={`${project?.name} · Strategy Configuration`}
                subtitle="Configure the SMC/ICT Intelligence Engine & Agency Broadcasting"
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full px-6 py-10">
                <div className="max-w-4xl mx-auto space-y-10 pb-32">
                    {/* Hero Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                                    <TrendingUp size={32} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">SMC Intelligence Engine</h2>
                                    <p className="text-indigo-400/60 text-xs font-bold tracking-widest uppercase">Version 1.0.4 Neural Alpha</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
                                Activate the institutional SMC/ICT scanner to track liquidity, structure breaks, and supply/demand zones across the project's asset portfolio.
                            </p>
                            
                            {/* Alpaca Status Badge */}
                            <div className="mt-6 flex items-center gap-3">
                                {alpacaConnector ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                        <Plug size={12} /> Alpaca Linked: {alpacaConnector.label || 'Active Gateway'}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                                        <ShieldAlert size={12} /> Alpaca Connection Missing
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 relative z-10">
                            <Button 
                                onClick={handleManualScan}
                                disabled={isScanning || !config.is_active || !alpacaConnector}
                                variant="outline"
                                className="h-12 px-6 rounded-xl border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 font-black uppercase tracking-widest italic text-[10px]"
                            >
                                {isScanning ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={14} className="mr-2" />
                                        Force Neural Scan
                                    </>
                                )}
                            </Button>
                            <div className="flex flex-col items-center gap-2">
                                <Switch 
                                    checked={config.is_active}
                                    onCheckedChange={(val) => setConfig({...config, is_active: val})}
                                    className="data-[state=checked]:bg-emerald-500 scale-125"
                                />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${config.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                                    {config.is_active ? 'System Online' : 'System Offline'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Asset Portfolio */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/50 px-2 flex items-center gap-2">
                                <Zap size={14} className="text-indigo-400" /> Asset Portfolio
                            </h3>
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Tracked Symbols (Comma Separated)</label>
                                    <input 
                                        type="text"
                                        value={config.symbols.join(", ")}
                                        onChange={(e) => setConfig({...config, symbols: e.target.value.split(",").map(s => s.trim())})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-white/10 focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
                                        placeholder="BTC/USD, ETH/USD, SOL/USD"
                                    />
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {config.symbols.map(s => (
                                            <span key={s} className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black border border-indigo-500/20">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Strategy Parameters */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/50 px-2 flex items-center gap-2">
                                <Target size={14} className="text-amber-500" /> Strategy Parameters
                            </h3>
                            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Risk Per Trade</label>
                                        <span className="text-xs font-black text-white">{config.risk_per_trade_percent}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="5" 
                                        step="0.1"
                                        value={config.risk_per_trade_percent}
                                        onChange={(e) => setConfig({...config, risk_per_trade_percent: parseFloat(e.target.value)})}
                                        className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Min Confidence for Alert</label>
                                        <span className="text-xs font-black text-white">{config.min_confidence_score}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="50" 
                                        max="100" 
                                        step="1"
                                        value={config.min_confidence_score}
                                        onChange={(e) => setConfig({...config, min_confidence_score: parseInt(e.target.value)})}
                                        className="w-full accent-emerald-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Community Integration */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground/50 px-2 flex items-center gap-2">
                            <MessageSquare size={14} className="text-indigo-400" /> Community Agent Broadcasting
                        </h3>
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 relative overflow-hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start relative z-10">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block italic text-indigo-400">Discord Intelligence Channel ID</label>
                                    <div className="relative group/input">
                                        <input 
                                            type="text"
                                            value={config.discord_channel_id}
                                            onChange={(e) => setConfig({...config, discord_channel_id: e.target.value})}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-white/20 focus:ring-1 focus:ring-indigo-500 transition-all font-bold tracking-widest group-hover/input:border-white/20"
                                            placeholder="Auto-discovering community gateway..."
                                        />
                                        {config.discord_channel_id && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest">
                                                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                                Live Community Sync
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                        <Info size={14} className="text-indigo-400" />
                                        <p className="text-[10px] text-indigo-400/70 font-medium">
                                            {config.discord_channel_name ? `Linked to: ${config.discord_channel_name}` : "This ID links the Intelligence Engine directly to your chosen Community Hub Agent."}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 flex items-start gap-4">
                                         <CheckCircle2 size={20} className="text-emerald-400 mt-1" />
                                         <div>
                                             <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest italic">Agent Synchronization Valid</h4>
                                             <p className="text-[10px] text-emerald-400/60 leading-relaxed mt-1">Signals matching the confidence score will be automatically formatted and broadcasted by the Community Bot.</p>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Alert */}
                    <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                        <ShieldAlert className="text-amber-500 shrink-0 mt-1" size={20} />
                        <div>
                            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest italic">Institutional Risk Warning</h4>
                            <p className="text-[10px] text-amber-500/60 leading-relaxed mt-1">
                                These settings directly control live market execution parameters. Ensure symbols and risk thresholds align with the client mandate before initializing the scanner.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Actions */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-6">
                <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest italic shadow-2xl shadow-indigo-600/40 group active:scale-[0.98] transition-all"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-5 w-5 animate-spin mr-3" />
                            Synchronizing Neural Logic
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                            Commit Neural Config
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
