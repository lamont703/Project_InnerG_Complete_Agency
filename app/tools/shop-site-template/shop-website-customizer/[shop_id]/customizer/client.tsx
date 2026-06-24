"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Send,
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  Sparkles,
  ArrowLeft,
  Check,
  Code,
  Undo,
  X,
  MessageSquare,
  Eye,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Mic,
  Loader2,
  Sliders,
  ExternalLink
} from "lucide-react"
import { defaultSiteConfig, type SiteConfig } from "@/components/shop-site-template/shop-website-customizer/config-defaults"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from "@/components/ui/resizable"
import { saveSiteConfigAction } from "./actions"

interface Message {
  id: string
  sender: "user" | "assistant"
  text: string
  timestamp: Date
  steps?: { title: string; status: "success" | "pending" | "idle" }[]
  diffPreview?: { field: string; from: string; to: string }[]
}

type DeviceMode = "desktop" | "tablet" | "mobile"
type TabMode = "chat" | "preview"

const PRESET_IMAGES = [
  "/images/gallery/black_man_braids_taper_1782315612759.png", // Braids & taper fade
  "/images/gallery/black_barber_cutting_boy_1782315583127.png", // Barber cutting boy's fade
  "/images/gallery/black_man_beard_trim_1782315593358.png", // Premium beard shape-up
  "/images/gallery/black_man_razor_lineup_1782315601802.png", // Crisp razor lineup
  "/images/service-haircut.png", // Original haircut image
  "/images/service-fade.png", // Original fade image
  "/images/service-beard.png", // Original beard trim image
  "/images/service-styling.png", // Original styling image
  "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=600&auto=format&fit=crop", // Barber working
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=600&auto=format&fit=crop", // Clean fade closeup
]

export default function CustomizerClient({
  initialConfig,
  shopId,
  shopName
}: {
  initialConfig: SiteConfig
  shopId: string
  shopName: string
}) {
  const [config, setConfig] = useState<SiteConfig>(initialConfig)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Welcome to the Shop Website Customizer! 💈 I can update the copywriting, colors, and structure of your site. \n\nTry asking me to:\n* *'Change the primary color to gold and the background to deep black'*\n* *'Rewrite the hero title to say Welcome to Atlanta's Best Cuts'*\n* *'Change the features subtitle to Built around you'*",
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop")
  const [activeTab, setActiveTab] = useState<TabMode>("preview")
  const [consoleTab, setConsoleTab] = useState<"chat" | "manual">("chat")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [iframeKey, setIframeKey] = useState(0) // increment to force reload
  const [showPublishSuccess, setShowPublishSuccess] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})
  const [galleryOpenFor, setGalleryOpenFor] = useState<string | null>(null)
  
  // Onboarding Tour State
  const [tourStep, setTourStep] = useState<number>(0)
  const [showTour, setShowTour] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [isMounted, setIsMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  // Track window size to render Resizable panels on desktop only, avoiding hydration mismatches
  useEffect(() => {
    setIsMounted(true)
    const checkSize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkSize()
    window.addEventListener("resize", checkSize)
    
    // Check if user has seen tour
    if (!localStorage.getItem("hasSeenCustomizerTour")) {
      setTimeout(() => {
        setShowTour(true)
        setTourStep(1)
        setActiveTab("chat")
        setConsoleTab("chat")
      }, 1000) // slight delay for smooth entry
    }
    
    return () => window.removeEventListener("resize", checkSize)
  }, [])

  // Load configuration from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`legends-site-config-${shopId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Deep merge with defaultSiteConfig so new schema fields (like services) don't turn up blank!
        setConfig({
          ...defaultSiteConfig,
          ...initialConfig,
          ...parsed,
          hero: { ...defaultSiteConfig.hero, ...initialConfig.hero, ...parsed.hero, stats: { ...defaultSiteConfig.hero?.stats, ...initialConfig.hero?.stats, ...parsed.hero?.stats } },
          header: parsed.header || initialConfig.header || defaultSiteConfig.header,
          features: { ...defaultSiteConfig.features, ...initialConfig.features, ...parsed.features },
          shopInfo: { ...defaultSiteConfig.shopInfo, ...initialConfig.shopInfo, ...parsed.shopInfo },
          careers: { ...defaultSiteConfig.careers, ...initialConfig.careers, ...parsed.careers },
          services: parsed.services || initialConfig.services || defaultSiteConfig.services,
          testimonials: parsed.testimonials || initialConfig.testimonials || defaultSiteConfig.testimonials,
          contact: parsed.contact || initialConfig.contact || defaultSiteConfig.contact,
          footer: parsed.footer || initialConfig.footer || defaultSiteConfig.footer
        })
      } catch (e) {
        console.error(e)
      }
    }
  }, [initialConfig])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (consoleTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isTyping, consoleTab])

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // Listener for dynamic edit requests from iframe preview
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data) {
        if (event.data.type === "UPDATE_SITE_CONFIG") {
          const newConfig = event.data.config as SiteConfig
          setConfig(newConfig)
          localStorage.setItem(`legends-site-config-${shopId}`, JSON.stringify(newConfig))
        } else if (event.data.type === "VISUAL_EDIT_REQUEST") {
          const field = event.data.field as string

          // 1. Swap sidebar console sub-tab to Manual Settings
          setConsoleTab("manual")

          // 2. On mobile, switch bottom tab bar to Editor Console panel
          setActiveTab("chat")

          // 3. Scroll and focus corresponding input element after DOM renders
          setTimeout(() => {
            if (event.data.field.startsWith("services.list.") && event.data.field.endsWith(".image")) {
              setGalleryOpenFor(event.data.field)
              // Scroll to services
              const el = document.getElementById("input-services.title")
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
            } else {
              const el = document.getElementById(`input-${field}`) as HTMLInputElement | HTMLTextAreaElement | null
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" })
                el.focus()

                // Trigger quick temporary border glow animation
                const isTextArea = el.tagName.toLowerCase() === "textarea"
                const originalClass = el.className
                const baseClass = "w-full rounded border bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
                const textAreaAddon = isTextArea ? " resize-none" : ""
                
                el.className = `${baseClass}${textAreaAddon} border-primary ring-2 ring-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)]`
                setTimeout(() => {
                  el.className = originalClass
                }, 1500)
              }
            }
          }, 100)
        }
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [config])

  // Sync state changes to iframe
  const syncConfigToIframe = (newConfig: SiteConfig) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "UPDATE_SITE_CONFIG",
          config: newConfig
        },
        "*"
      )
    }
  }

  // Handle updates locally and send to iframe
  const updateConfig = (newConfig: SiteConfig) => {
    setConfig(newConfig)
    localStorage.setItem(`legends-site-config-${shopId}`, JSON.stringify(newConfig))
    syncConfigToIframe(newConfig)
  }

  const handleReset = () => {
    updateConfig(initialConfig)
    setIframeKey((k) => k + 1)
    
    const newMsg: Message = {
      id: `reset-${Date.now()}`,
      sender: "assistant",
      text: "I have reset the site layout and theme back to their original default settings.",
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, newMsg])
  }

  // Helper to postMessage after iframe finishes loading
  const handleIframeLoad = () => {
    syncConfigToIframe(config)
  }

  // AI Prompt Processor with Real LLM and 48-Hour Rate Limiting
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const userText = inputValue.trim()
    setInputValue("")

    // --- Enforce 48-Hour Rolling Rate Limit ---
    const now = Date.now()
    const limitWindow = 48 * 60 * 60 * 1000 // 48 hours in milliseconds
    let queriesHistory: number[] = []

    try {
      const savedQueries = localStorage.getItem("legends-ai-queries")
      if (savedQueries) {
        queriesHistory = JSON.parse(savedQueries)
      }
    } catch (err) {
      console.error("Error reading rate limit logs:", err)
    }

    // Filter queries history to keep only timestamps within the last 48 hours
    const activeQueries = queriesHistory.filter((ts) => now - ts < limitWindow)

    if (activeQueries.length >= 10) {
      // Append user's query first
      const userMsg: Message = {
        id: `user-${now}`,
        sender: "user",
        text: userText,
        timestamp: new Date()
      }

      // Append assistant's limit warning message
      const limitMsg: Message = {
        id: `limit-${now}`,
        sender: "assistant",
        text: "You have reached your limit of 10 AI customization queries for this 48-hour period. Please use the Manual Settings tab at the top to customize your page directly!",
        timestamp: new Date()
      }

      setMessages((prev) => [...prev, userMsg, limitMsg])
      
      // Auto-redirect to Manual Settings
      setConsoleTab("manual")
      setToastMessage("AI query limit reached! Manual settings active.")
      return
    }

    // Record this query timestamp and save back to local storage
    activeQueries.push(now)
    localStorage.setItem("legends-ai-queries", JSON.stringify(activeQueries))

    // Append user message
    const userMsg: Message = {
      id: `user-${now}`,
      sender: "user",
      text: userText,
      timestamp: new Date()
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    // Setup visual steps log
    const responseId = `ai-${now}`
    const agentSteps = [
      { title: "Analyzing customization request", status: "pending" as const },
      { title: "Querying Gemini 1.5 Flash", status: "idle" as const },
      { title: "Applying modifications to site config", status: "idle" as const },
      { title: "Syncing style variables to preview render", status: "idle" as const }
    ]

    const aiResponseMsg: Message = {
      id: responseId,
      sender: "assistant",
      text: "",
      timestamp: new Date(),
      steps: [...agentSteps]
    }
    setMessages((prev) => [...prev, aiResponseMsg])

    try {
      // Step 1 done, calling model is pending
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === responseId
              ? {
                  ...m,
                  steps: m.steps?.map((s, idx) =>
                    idx === 0
                      ? { ...s, status: "success" }
                      : idx === 1
                      ? { ...s, status: "pending" }
                      : s
                  )
                }
              : m
          )
        )
      }, 400)

      // POST request to live Gemini API customizer endpoint
      const res = await fetch("/api/tools/shop-site-template/shop-website-customizer/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, config })
      })

      if (!res.ok) {
        throw new Error(`Server returned error status: ${res.status}`)
      }

      const data = await res.json()
      if (data.error) {
        throw new Error(data.error)
      }

      // Step 2 done, applying modifications is pending
      setMessages((prev) =>
        prev.map((m) =>
          m.id === responseId
            ? {
                ...m,
                steps: m.steps?.map((s, idx) =>
                  idx === 1
                    ? { ...s, status: "success" }
                    : idx === 2
                    ? { ...s, status: "pending" }
                    : s
                )
              }
            : m
        )
      )

      // Step 3 done, syncing preview is pending
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === responseId
              ? {
                  ...m,
                  steps: m.steps?.map((s, idx) =>
                    idx === 2
                      ? { ...s, status: "success" }
                      : idx === 3
                      ? { ...s, status: "pending" }
                      : s
                  )
                }
              : m
          )
        )

        // Apply config changes to frame
        updateConfig(data.config)

        // Step 4 done
        setTimeout(() => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === responseId
                ? {
                    ...m,
                    text: data.replyText || "Your page has been customized!",
                    diffPreview: data.diffs || [],
                    steps: m.steps?.map((s) => ({ ...s, status: "success" }))
                  }
                : m
            )
          )
          setIsTyping(false)

          // Mobile / Tablet Auto-Transition to Preview
          if (window.innerWidth < 1024) {
            setActiveTab("preview")
            setToastMessage("Layout updated! Tap here to return to Chat.")
          }
        }, 500)

      }, 400)

    } catch (err: any) {
      console.error("Customizer AI processing failed:", err)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === responseId
            ? {
                ...m,
                text: `I encountered an error while trying to process your request: "${err.message}". Please try again or use the Manual Settings panel to customize the page.`,
                steps: m.steps?.map((s) =>
                  s.status === "pending" ? { ...s, status: "idle" } : s
                )
              }
            : m
        )
      )
      setIsTyping(false)
    }
  }

  const toggleSteps = (msgId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  const handlePublish = async () => {
    setIsTyping(true)
    const result = await saveSiteConfigAction(shopId, config)
    setIsTyping(false)
    if (result.success) {
      setShowPublishSuccess(true)
      setToastMessage("Successfully saved to database!")
    } else {
      setToastMessage(`Save failed: ${result.error}`)
    }
  }

  const sidebarContent = (
    <>
      {/* Chat Header */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-800 px-4">
        <div className="flex items-center gap-2">
          <a href="/tools/shop-site-template/shop-website-customizer" className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground hover:opacity-90">
            <ArrowLeft className="size-4" />
          </a>
          <div>
            <h1 className="font-heading text-sm font-bold uppercase tracking-wider text-white">
              Shop Website Editor
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium leading-none">
              Page Customizer
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="h-7 text-xs border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            <Undo className="mr-1 size-3.5" />
            Reset
          </Button>
          <Button
            onClick={handlePublish}
            size="sm"
            className="h-7 text-xs bg-primary text-primary-foreground font-semibold px-3 hover:bg-primary/90"
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Dual Tab Switcher (AI Chat vs Manual Settings) */}
      <div className="flex border-b border-neutral-800 bg-neutral-900/60 px-4">
        <button
          onClick={() => setConsoleTab("chat")}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
            consoleTab === "chat"
              ? "border-primary text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <MessageSquare className="size-3.5" />
          AI Chat Editor
        </button>
        <button
          onClick={() => setConsoleTab("manual")}
          className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
            consoleTab === "manual"
              ? "border-primary text-white"
              : "border-transparent text-neutral-400 hover:text-neutral-200"
          } ${showTour && tourStep === 3 ? "relative z-[201] ring-4 ring-amber-500 rounded-lg bg-neutral-900 shadow-[0_0_30px_rgba(245,158,11,0.5)]" : ""}`}
        >
          <Sliders className="size-3.5" />
          Manual Settings
        </button>
      </div>

      {/* Console Tab Content */}
      {consoleTab === "chat" ? (
        <>
          {/* Message Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "assistant" && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
                    <Sparkles className="size-4" />
                  </div>
                )}

                <div className="max-w-[85%] space-y-2">
                  {/* Text Bubble */}
                  <div
                    className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-neutral-800 text-white"
                        : "bg-neutral-900/50 border border-neutral-800/80 text-neutral-200"
                    }`}
                  >
                    {msg.text || (
                      <div className="flex items-center gap-1 py-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-neutral-400" />
                        <span className="size-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:0.2s]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:0.4s]" />
                      </div>
                    )}
                  </div>

                  {/* Agent Steps log */}
                  {msg.sender === "assistant" && msg.steps && (
                    <div className="rounded-lg border border-neutral-800/60 bg-neutral-950/40 p-2 text-xs">
                      <button
                        onClick={() => toggleSteps(msg.id)}
                        className="flex w-full items-center justify-between font-semibold text-neutral-400 hover:text-white"
                      >
                        <span className="flex items-center gap-1.5">
                          <Code className="size-3 text-primary" />
                          AI Tool Agent Execution Log
                        </span>
                        {expandedSteps[msg.id] ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </button>
                      
                      {(expandedSteps[msg.id] || msg.text === "") && (
                        <ul className="mt-2 space-y-1.5 pl-2 border-l border-neutral-800">
                          {msg.steps.map((step, sIdx) => (
                            <li key={sIdx} className="flex items-center justify-between text-neutral-400">
                              <span>{step.title}</span>
                              {step.status === "success" && (
                                <Check className="size-3.5 text-emerald-500 font-bold" />
                              )}
                              {step.status === "pending" && (
                                <RotateCw className="size-3.5 animate-spin text-primary" />
                              )}
                              {step.status === "idle" && (
                                <span className="size-1.5 rounded-full bg-neutral-700" />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Config Diff Preview */}
                  {msg.sender === "assistant" && msg.diffPreview && msg.diffPreview.length > 0 && (
                    <div className="rounded-lg border border-neutral-800/80 bg-neutral-950 p-3 space-y-1.5 text-xs font-mono">
                      <div className="text-[10px] uppercase font-bold text-primary tracking-wider border-b border-neutral-800 pb-1">
                        Applied Changes Schema
                      </div>
                      {msg.diffPreview.map((d, dIdx) => (
                        <div key={dIdx} className="space-y-0.5">
                          <div className="text-neutral-400 font-semibold">{d.field}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-red-500 line-through opacity-70 truncate max-w-[120px]">{d.from}</span>
                            <span className="text-neutral-500">→</span>
                            <span className="text-emerald-500 truncate max-w-[180px]">{d.to}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-neutral-800 p-4 pb-6 lg:pb-4">
             {/* Chat Input */}
          <div className={`relative mt-2 flex items-end gap-2 ${showTour && tourStep === 1 ? "z-[201] ring-4 ring-blue-500 rounded-xl bg-neutral-900 p-2 shadow-[0_0_30px_rgba(59,130,246,0.5)]" : ""}`}>
            <form onSubmit={handleSendMessage} className="relative">
              <textarea
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask AI to customize buttons to gold or edit titles..."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-3 pr-20 pt-2.5 pb-2 text-sm text-white placeholder:text-neutral-500 focus:border-neutral-700 focus:outline-none resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />
              <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
                  title="Attach Files"
                >
                  <Paperclip className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-900 hover:text-neutral-300"
                  title="Voice Input"
                >
                  <Mic className="size-4" />
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:pointer-events-none hover:bg-primary/90 transition-all"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </form>
            </div>
            <div className="mt-2 text-[10px] text-center text-neutral-500">
              AI updates colors and copywriting instantly in real-time.
            </div>
          </div>
        </>
      ) : (
        /* Manual Settings Forms with scroll focus Refs */
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Color Theme Fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Brand Accent Colors
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  Primary Accent
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.theme.primary.startsWith("oklch") ? "#9f1239" : config.theme.primary}
                    onChange={(e) => {
                      const updated = { ...config }
                      updated.theme.primary = e.target.value
                      updateConfig(updated)
                    }}
                    className="size-7 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.theme.primary}
                    onChange={(e) => {
                      const updated = { ...config }
                      updated.theme.primary = e.target.value
                      updateConfig(updated)
                    }}
                    className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  Background
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.theme.background.startsWith("oklch") ? "#0f172a" : config.theme.background}
                    onChange={(e) => {
                      const updated = { ...config }
                      updated.theme.background = e.target.value
                      updated.theme.card = e.target.value
                      updateConfig(updated)
                    }}
                    className="size-7 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.theme.background}
                    onChange={(e) => {
                      const updated = { ...config }
                      updated.theme.background = e.target.value
                      updateConfig(updated)
                    }}
                    className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Hero Copy Fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Hero Section Copy
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  Hero Title
                </label>
                <input
                  id="input-hero.title"
                  type="text"
                  value={config.hero.title}
                  onChange={(e) => {
                    const updated = { ...config }
                    updated.hero.title = e.target.value
                    updateConfig(updated)
                  }}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  Hero Subtitle
                </label>
                <textarea
                  id="input-hero.subtitle"
                  rows={3}
                  value={config.hero.subtitle}
                  onChange={(e) => {
                    const updated = { ...config }
                    updated.hero.subtitle = e.target.value
                    updateConfig(updated)
                  }}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  CTA Button Label
                </label>
                <input
                  id="input-hero.ctaText"
                  type="text"
                  value={config.hero.ctaText}
                  onChange={(e) => {
                    const updated = { ...config }
                    updated.hero.ctaText = e.target.value
                    updateConfig(updated)
                  }}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Features Title/Subtitle */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Features Header
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  Features Title
                </label>
                <input
                  id="input-features.title"
                  type="text"
                  value={config.features.title}
                  onChange={(e) => {
                    const updated = { ...config }
                    updated.features.title = e.target.value
                    updateConfig(updated)
                  }}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                  Features Subtitle
                </label>
                <input
                  id="input-features.subtitle"
                  type="text"
                  value={config.features.subtitle}
                  onChange={(e) => {
                    const updated = { ...config }
                    updated.features.subtitle = e.target.value
                    updateConfig(updated)
                  }}
                  className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Feature Cards Loop */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Feature Cards List
            </h3>
            <div className="space-y-4 divide-y divide-neutral-800/60">
              {config.features.list.map((item, idx) => {
                return (
                  <div key={idx} className="space-y-3 pt-3 first:pt-0">
                    <span className="text-[9px] font-bold text-primary tracking-wider uppercase">
                      Feature Card #{idx + 1}
                    </span>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                        Title
                      </label>
                      <input
                        id={`input-features.list.${idx}.title`}
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = { ...config }
                          updated.features.list[idx].title = e.target.value
                          updateConfig(updated)
                        }}
                        className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                        Description
                      </label>
                      <textarea
                        id={`input-features.list.${idx}.description`}
                        rows={2}
                        value={item.description}
                        onChange={(e) => {
                          const updated = { ...config }
                          updated.features.list[idx].description = e.target.value
                          updateConfig(updated)
                        }}
                        className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all resize-none"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Shop Info Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Shop Details & Contact
            </h3>
            <div>
              <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                Shop Name
              </label>
              <input
                id="input-shopInfo.name"
                type="text"
                value={config.shopInfo?.name || ""}
                onChange={(e) => {
                  const updated = { ...config, shopInfo: { ...config.shopInfo!, name: e.target.value } }
                  updateConfig(updated)
                }}
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                Phone Number
              </label>
              <input
                id="input-shopInfo.phone"
                type="text"
                value={config.shopInfo?.phone || ""}
                onChange={(e) => {
                  const updated = { ...config, shopInfo: { ...config.shopInfo!, phone: e.target.value } }
                  updateConfig(updated)
                }}
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                Address
              </label>
              <textarea
                id="input-shopInfo.address"
                rows={2}
                value={config.shopInfo?.address || ""}
                onChange={(e) => {
                  const updated = { ...config, shopInfo: { ...config.shopInfo!, address: e.target.value } }
                  updateConfig(updated)
                }}
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all resize-none"
              />
            </div>
          </div>

          {/* Careers Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Careers & Hiring
            </h3>
            <div>
              <label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">
                Weekly Booth Rent Rate
              </label>
              <input
                id="input-careers.rentRate"
                type="text"
                value={config.careers?.rentRate || ""}
                onChange={(e) => {
                  const updated = { ...config, careers: { ...config.careers!, rentRate: e.target.value } }
                  updateConfig(updated)
                }}
                className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all"
              />
            </div>
          </div>

          
          {/* Header Branding & Nav */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Header Branding & Nav
            </h3>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Logo Text</label><input id="input-header.logoText" type="text" value={config.header?.logoText || ""} onChange={(e) => { const updated = { ...config, header: { ...config.header!, logoText: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Status Badge Text</label><input id="input-header.statusText" type="text" value={config.header?.statusText || ""} onChange={(e) => { const updated = { ...config, header: { ...config.header!, statusText: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">CTA Button Text</label><input id="input-header.ctaText" type="text" value={config.header?.ctaText || ""} onChange={(e) => { const updated = { ...config, header: { ...config.header!, ctaText: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            
            <div className="space-y-2 pt-2 border-t border-neutral-800/60">
              <span className="text-[9px] font-bold text-primary tracking-wider uppercase mb-2 block">Navigation Links</span>
              {config.header?.links.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-1"><input id={`input-header.links.${idx}.label`} type="text" value={link.label} onChange={(e) => { const updated = { ...config }; updated.header!.links[idx].label = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Stats Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Hero Stats & Badge
            </h3>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Location Badge</label><input id="input-hero.locationBadge" type="text" value={config.hero?.locationBadge || ""} onChange={(e) => { const updated = { ...config, hero: { ...config.hero, locationBadge: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Hours Stat</label><input id="input-hero.stats.hours" type="text" value={config.hero?.stats?.hours || ""} onChange={(e) => { const updated = { ...config, hero: { ...config.hero, stats: { ...config.hero.stats!, hours: e.target.value } } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Address Stat</label><input id="input-hero.stats.address" type="text" value={config.hero?.stats?.address || ""} onChange={(e) => { const updated = { ...config, hero: { ...config.hero, stats: { ...config.hero.stats!, address: e.target.value } } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Rating</label><input id="input-hero.stats.rating" type="text" value={config.hero?.stats?.rating || ""} onChange={(e) => { const updated = { ...config, hero: { ...config.hero, stats: { ...config.hero.stats!, rating: e.target.value } } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
              <div className="flex-1"><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Rating Text</label><input id="input-hero.stats.ratingText" type="text" value={config.hero?.stats?.ratingText || ""} onChange={(e) => { const updated = { ...config, hero: { ...config.hero, stats: { ...config.hero.stats!, ratingText: e.target.value } } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            </div>
          </div>

          {/* Services Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Services Section
            </h3>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Title</label><input id="input-services.title" type="text" value={config.services?.title || ""} onChange={(e) => { const updated = { ...config, services: { ...config.services!, title: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Subtitle</label><input id="input-services.subtitle" type="text" value={config.services?.subtitle || ""} onChange={(e) => { const updated = { ...config, services: { ...config.services!, subtitle: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">CTA Text</label><input id="input-services.ctaText" type="text" value={config.services?.ctaText || ""} onChange={(e) => { const updated = { ...config, services: { ...config.services!, ctaText: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div className="space-y-4 divide-y divide-neutral-800/60 pt-2">
              {config.services?.list.map((service, idx) => (
                <div key={idx} className="pt-4 space-y-3">
                  <div className="flex gap-4">
                    <div className="w-20 h-24 shrink-0 rounded overflow-hidden relative group border border-neutral-800">
                      <img src={service.image} alt={service.title} className="size-full object-cover" />
                      <div 
                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => setGalleryOpenFor(`services.list.${idx}.image`)}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white">Replace</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Service {idx + 1} Title</label><input id={`input-services.list.${idx}.title`} type="text" value={service.title} onChange={(e) => { const updated = { ...config }; updated.services!.list[idx].title = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
                      <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Price</label><input id={`input-services.list.${idx}.price`} type="text" value={service.price} onChange={(e) => { const updated = { ...config }; updated.services!.list[idx].price = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
                    </div>
                  </div>
                  <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Description</label><textarea id={`input-services.list.${idx}.description`} rows={2} value={service.description} onChange={(e) => { const updated = { ...config }; updated.services!.list[idx].description = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all resize-none" /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Testimonials Section
            </h3>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Title</label><input id="input-testimonials.title" type="text" value={config.testimonials?.title || ""} onChange={(e) => { const updated = { ...config, testimonials: { ...config.testimonials!, title: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Subtitle</label><input id="input-testimonials.subtitle" type="text" value={config.testimonials?.subtitle || ""} onChange={(e) => { const updated = { ...config, testimonials: { ...config.testimonials!, subtitle: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div className="space-y-4 divide-y divide-neutral-800/60 pt-2">
              {config.testimonials?.reviews.map((item, idx) => (
                <div key={idx} className="space-y-3 pt-3 first:pt-0">
                  <span className="text-[9px] font-bold text-primary tracking-wider uppercase">Review #{idx + 1}</span>
                  <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Quote</label><textarea id={`input-testimonials.reviews.${idx}.quote`} rows={2} value={item.quote} onChange={(e) => { const updated = { ...config }; updated.testimonials!.reviews[idx].quote = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all resize-none" /></div>
                  <div className="flex gap-2">
                    <div className="flex-1"><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Name</label><input id={`input-testimonials.reviews.${idx}.name`} type="text" value={item.name} onChange={(e) => { const updated = { ...config }; updated.testimonials!.reviews[idx].name = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
                    <div className="flex-1"><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Detail</label><input id={`input-testimonials.reviews.${idx}.detail`} type="text" value={item.detail} onChange={(e) => { const updated = { ...config }; updated.testimonials!.reviews[idx].detail = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operating Hours Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Operating Hours
            </h3>
            <div className="space-y-2">
              {config.contact?.hoursInfo.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="w-24"><input id={`input-contact.hoursInfo.${idx}.day`} type="text" value={item.day} onChange={(e) => { const updated = { ...config }; updated.contact!.hoursInfo[idx].day = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
                  <div className="flex-1"><input id={`input-contact.hoursInfo.${idx}.time`} type="text" value={item.time} onChange={(e) => { const updated = { ...config }; updated.contact!.hoursInfo[idx].time = e.target.value; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Branding Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-neutral-800 pb-1">
              Footer Branding
            </h3>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Shop Title</label><input id="input-footer.title" type="text" value={config.footer?.title || ""} onChange={(e) => { const updated = { ...config, footer: { ...config.footer!, title: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Description</label><textarea id="input-footer.description" rows={2} value={config.footer?.description || ""} onChange={(e) => { const updated = { ...config, footer: { ...config.footer!, description: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all resize-none" /></div>
            <div className="flex gap-2">
              <div className="flex-1"><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Contact Header</label><input id="input-footer.contactText" type="text" value={config.footer?.contactText || ""} onChange={(e) => { const updated = { ...config, footer: { ...config.footer!, contactText: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
              <div className="flex-1"><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Explore Header</label><input id="input-footer.exploreText" type="text" value={config.footer?.exploreText || ""} onChange={(e) => { const updated = { ...config, footer: { ...config.footer!, exploreText: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
            </div>
            <div><label className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1">Copyright</label><input id="input-footer.copyright" type="text" value={config.footer?.copyright || ""} onChange={(e) => { const updated = { ...config, footer: { ...config.footer!, copyright: e.target.value } }; updateConfig(updated) }} className="w-full rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-700 transition-all" /></div>
          </div>

          {/* Quick tips */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400 leading-relaxed space-y-1">
            <span className="font-bold text-white block">💡 Mobile Editing Pro-Tip</span>
            You can tap on any title, subtitle, or button directly in the website preview panel on the right. Tapping it will automatically bring you here and focus the input field!
          </div>

        </div>
      )}
    </>
  )

  const previewContent = (
    <>
      {/* Workspace Toolbar */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-800 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] lg:text-xs text-neutral-400 font-mono truncate max-w-[140px] sm:max-w-xs">
            {isMounted && typeof window !== "undefined" ? window.location.host : "localhost:3000"}/tools/shop-site-template/shop-website-customizer/{shopId}
          </span>
        </div>

        {/* Size Toggles (Hidden on mobile/tablet viewports to save space) */}
        <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-neutral-800 bg-neutral-900 p-0.5">
          <button
            onClick={() => setDeviceMode("desktop")}
            className={`flex size-7 items-center justify-center rounded ${
              deviceMode === "desktop" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
            }`}
            title="Desktop View"
          >
            <Monitor className="size-4" />
          </button>
          <button
            onClick={() => setDeviceMode("tablet")}
            className={`flex size-7 items-center justify-center rounded ${
              deviceMode === "tablet" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
            }`}
            title="Tablet View"
          >
            <Tablet className="size-4" />
          </button>
          <button
            onClick={() => setDeviceMode("mobile")}
            className={`flex size-7 items-center justify-center rounded ${
              deviceMode === "mobile" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
            }`}
            title="Mobile View"
          >
            <Smartphone className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="flex size-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
            title="Reload Frame"
          >
            <RotateCw className="size-4" />
          </button>
        </div>
      </div>

      {/* Live Frame Container (Grid dot layout) */}
      <div className="relative flex-1 overflow-auto bg-neutral-950 p-0 lg:p-6 flex items-center justify-center bg-[radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:16px_16px]">
        
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40 bg-gradient-to-b from-neutral-950 via-transparent to-neutral-950" />

        {/* Iframe Device Frame (Always fullscreen h-full w-full on small screens) */}
        <div
          className={`z-10 overflow-hidden bg-neutral-950 transition-all duration-300 h-full w-full lg:rounded-none ${
            deviceMode === "desktop"
              ? "lg:h-full lg:w-full"
              : deviceMode === "tablet"
              ? "lg:h-[90%] lg:max-h-[800px] lg:w-[768px] lg:rounded-2xl lg:border lg:border-neutral-800 lg:shadow-2xl"
              : "lg:h-[85%] lg:max-h-[700px] lg:w-[375px] lg:rounded-[36px] lg:border-[8px] lg:border-neutral-800 lg:shadow-2xl"
          }`}
        >
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={`/tools/shop-site-template/shop-website-customizer/${shopId}`}
            onLoad={handleIframeLoad}
            className="h-full w-full border-0 bg-neutral-950"
            title="Site customization live preview"
          />
        </div>

      </div>
    </>
  )

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row overflow-hidden bg-neutral-950 font-sans text-neutral-200" style={{ height: '100dvh' }}>
      
      {/* Dynamic Toast Alert (mainly for mobile transition triggers) */}
      {toastMessage && (
        <div 
          onClick={() => {
            setActiveTab("chat")
            setToastMessage(null)
          }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-150 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-neutral-900/95 px-4 py-3 shadow-xl backdrop-blur-md cursor-pointer animate-in fade-in-50 slide-in-from-top-6 duration-300 hover:border-primary/50"
        >
          <div className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-3 animate-pulse" />
          </div>
          <span className="text-xs font-medium text-white">{toastMessage}</span>
          <button 
            type="button" 
            onClick={(e) => {
              e.stopPropagation()
              setToastMessage(null)
            }}
            className="text-neutral-400 hover:text-neutral-200"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {isMounted && isDesktop ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1 h-full w-full">
          <ResizablePanel
            defaultSize={30}
            minSize={20}
            maxSize={60}
            className="flex flex-col border-r border-neutral-800 bg-neutral-900 h-full"
          >
            {sidebarContent}
          </ResizablePanel>

          <ResizableHandle withHandle className="w-1.5 bg-neutral-800 hover:bg-primary/50 transition-colors" />

          <ResizablePanel
            defaultSize={70}
            className={`flex flex-col bg-neutral-950 h-full relative ${showTour && tourStep === 2 ? "z-[201] ring-4 ring-primary ring-offset-4 ring-offset-black rounded-xl shadow-[0_0_50px_rgba(var(--primary),0.6)]" : ""}`}
          >
            {previewContent}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <>
          {/* 1. EDITOR SIDEBAR CONSOLE (Full screen on mobile if activeTab === 'chat', else hidden) */}
          <div className={`w-full lg:w-[430px] lg:shrink-0 flex-col border-r border-neutral-800 bg-neutral-900 flex-1 min-h-0 overflow-hidden lg:h-full ${
            activeTab === "chat" ? "flex" : "hidden lg:flex"
          }`}>
            {sidebarContent}
          </div>

          {/* 2. WEB PREVIEW PANEL (Full screen on mobile if activeTab === 'preview', else hidden) */}
          <div className={`flex-1 flex-col bg-neutral-950 min-h-0 overflow-hidden lg:h-full ${
            activeTab === "preview" ? "flex" : "hidden lg:flex"
          } ${showTour && tourStep === 2 ? "relative z-[201] ring-4 ring-primary ring-offset-4 ring-offset-black rounded-xl shadow-[0_0_50px_rgba(var(--primary),0.6)]" : ""}`}>
            {previewContent}
          </div>
        </>
      )}

      {/* 3. MOBILE BOTTOM TAB BAR — shrink-0 ensures it never collapses */}
      <div className="flex lg:hidden h-14 shrink-0 border-t border-neutral-800 bg-neutral-900 backdrop-blur-md items-center justify-around px-6 z-40">
        <button
          onClick={() => {
            setActiveTab("chat")
            setToastMessage(null)
          }}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "chat" ? "text-primary font-bold" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <div className="relative">
            <MessageSquare className="size-5" />
            {isTyping && (
              <span className="absolute -top-1 -right-1 flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider">Editor Panel</span>
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === "preview" ? "text-primary font-bold" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Eye className="size-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Live Preview</span>
        </button>
      </div>

      {/* Publish Success Dialog Modal */}
      {showPublishSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          <div
            onClick={() => setShowPublishSuccess(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <Check className="size-6 font-bold" />
            </div>
            <h3 className="mt-4 font-heading text-lg font-bold uppercase tracking-wider text-white">
              Successfully Deployed!
            </h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Your site changes have been compiled and published. Your public site is now live at:
            </p>
            
            <div className="mt-4 bg-black/50 border border-neutral-800 rounded-lg p-3 flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={typeof window !== 'undefined' ? `${window.location.origin}/s/${shopId}` : `/s/${shopId}`}
                className="w-full bg-transparent text-xs text-neutral-300 focus:outline-none" 
                onClick={(e) => e.currentTarget.select()}
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/s/${shopId}` : `/s/${shopId}`)
                  setToastMessage("Link copied to clipboard!")
                }}
                className="text-neutral-500 hover:text-white transition-colors"
                title="Copy Link"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">Copy</span>
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPublishSuccess(false)}
                className="flex-1 rounded-lg bg-neutral-800 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
              >
                Close
              </button>
              <a
                href={`/s/${shopId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPublishSuccess(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Open Live Site <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Picker Modal */}
      {galleryOpenFor && !showTour && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            onClick={() => setGalleryOpenFor(null)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading text-xl font-bold text-white">Select an Image</h3>
                <p className="text-sm text-neutral-400 mt-1">Choose a premium high-resolution photo from our curated barbering library.</p>
              </div>
              <button onClick={() => setGalleryOpenFor(null)} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {PRESET_IMAGES.map((imgUrl, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    if (galleryOpenFor) {
                      // Parse "services.list.0.image"
                      const pathParts = galleryOpenFor.split('.')
                      if (pathParts[0] === 'services' && pathParts[1] === 'list') {
                        const index = parseInt(pathParts[2])
                        const updated = { ...config }
                        if (updated.services && updated.services.list[index]) {
                          updated.services.list[index].image = imgUrl
                          updateConfig(updated)
                        }
                      }
                      setGalleryOpenFor(null)
                    }
                  }}
                  className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary transition-all shadow-lg"
                >
                  <img src={imgUrl} alt={`Curated preset ${idx}`} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl">Use Photo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3-Step Interactive Onboarding Tour */}
      {showTour && (
        <>
          {/* Backdrop sits below highlighted elements */}
          <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm pointer-events-auto" />

          {/* Tour Modal Container sits above highlighted elements */}
          <div className="fixed inset-0 z-[205] flex items-center justify-center pointer-events-none">
            <div className="relative w-[90%] max-w-md pointer-events-auto rounded-2xl border border-primary/50 bg-neutral-900 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-300">
              {/* Step Counter */}
              <div className="absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg border border-neutral-900">
                {tourStep}/3
              </div>

              <div className="text-center">
                {tourStep === 1 && (
                  <>
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wider">Meet Your AI Assistant</h3>
                    <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
                      Welcome to your intelligent website builder! Tell the AI what you want to change—like <strong className="text-white">"Make it a dark theme"</strong> or <strong className="text-white">"Add a hot towel shave service"</strong>—and watch it happen instantly.
                    </p>
                  </>
                )}
                {tourStep === 2 && (
                  <>
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span className="text-2xl">🖱️</span>
                    </div>
                    <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wider">Direct Click-to-Edit</h3>
                    <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
                      See something you want to change right now? Just click on any text, button, map, or photo directly in the live preview on the right to instantly edit it!
                    </p>
                  </>
                )}
                {tourStep === 3 && (
                  <>
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                      <span className="text-2xl">⚙️</span>
                    </div>
                    <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wider">Granular Control</h3>
                    <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
                      Need absolute precision? Switch over to the <strong className="text-white">Manual Settings tab</strong> to tweak individual prices, descriptions, and pick curated gallery photos. Click <strong className="text-primary">Publish</strong> when you're ready to go live!
                    </p>
                  </>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="mt-8 flex justify-between items-center border-t border-neutral-800/60 pt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTour(false)
                    localStorage.setItem("hasSeenCustomizerTour", "true")
                    setActiveTab("preview")
                  }}
                  className="text-xs font-semibold text-neutral-500 hover:text-white transition-colors uppercase tracking-wider"
                >
                  Skip Tour
                </button>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (tourStep < 3) {
                      const nextStep = tourStep + 1;
                      setTourStep(nextStep);
                      if (nextStep === 2) {
                        setActiveTab("preview");
                      } else if (nextStep === 3) {
                        setActiveTab("chat");
                        setConsoleTab("manual");
                      }
                    } else {
                      setShowTour(false)
                      localStorage.setItem("hasSeenCustomizerTour", "true")
                      setActiveTab("preview")
                    }
                  }}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors uppercase tracking-wider"
                >
                  {tourStep === 3 ? "Get Started" : "Next Step"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
