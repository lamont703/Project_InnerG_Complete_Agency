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
  Sliders
} from "lucide-react"
import { defaultSiteConfig, type SiteConfig } from "@/components/shop-site-template/shop-website-customizer/config-defaults"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from "@/components/ui/resizable"

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

export default function CustomizerPage() {
  const [config, setConfig] = useState<SiteConfig>(defaultSiteConfig)
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
  const [activeTab, setActiveTab] = useState<TabMode>("chat")
  const [consoleTab, setConsoleTab] = useState<"chat" | "manual">("chat")
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [iframeKey, setIframeKey] = useState(0) // increment to force reload
  const [showPublishSuccess, setShowPublishSuccess] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Scroll and Focus Input Refs
  const heroTitleRef = useRef<HTMLInputElement>(null)
  const heroSubtitleRef = useRef<HTMLTextAreaElement>(null)
  const heroCtaRef = useRef<HTMLInputElement>(null)
  const featuresTitleRef = useRef<HTMLInputElement>(null)
  const featuresSubtitleRef = useRef<HTMLInputElement>(null)
  const feat0TitleRef = useRef<HTMLInputElement>(null)
  const feat0DescRef = useRef<HTMLTextAreaElement>(null)
  const feat1TitleRef = useRef<HTMLInputElement>(null)
  const feat1DescRef = useRef<HTMLTextAreaElement>(null)
  const feat2TitleRef = useRef<HTMLInputElement>(null)
  const feat2DescRef = useRef<HTMLTextAreaElement>(null)
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
    return () => window.removeEventListener("resize", checkSize)
  }, [])

  // Load configuration from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("legends-site-config")
    if (saved) {
      try {
        setConfig(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

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
          localStorage.setItem("legends-site-config", JSON.stringify(newConfig))
        } else if (event.data.type === "VISUAL_EDIT_REQUEST") {
          const field = event.data.field as string

          // 1. Swap sidebar console sub-tab to Manual Settings
          setConsoleTab("manual")

          // 2. On mobile, switch bottom tab bar to Editor Console panel
          setActiveTab("chat")

          // 3. Scroll and focus corresponding input element after DOM renders
          setTimeout(() => {
            let targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null> | null = null

            if (field === "hero.title") targetRef = heroTitleRef
            else if (field === "hero.subtitle") targetRef = heroSubtitleRef
            else if (field === "hero.ctaText") targetRef = heroCtaRef
            else if (field === "features.title") targetRef = featuresTitleRef
            else if (field === "features.subtitle") targetRef = featuresSubtitleRef
            else if (field === "features.list.0.title") targetRef = feat0TitleRef
            else if (field === "features.list.0.description") targetRef = feat0DescRef
            else if (field === "features.list.1.title") targetRef = feat1TitleRef
            else if (field === "features.list.1.description") targetRef = feat1DescRef
            else if (field === "features.list.2.title") targetRef = feat2TitleRef
            else if (field === "features.list.2.description") targetRef = feat2DescRef

            if (targetRef && targetRef.current) {
              const el = targetRef.current
              el.scrollIntoView({ behavior: "smooth", block: "center" })
              el.focus()

              // Trigger quick temporary border glow animation
              el.classList.add("ring-4", "ring-primary/60", "border-primary")
              setTimeout(() => {
                el.classList.remove("ring-4", "ring-primary/60", "border-primary")
              }, 1200)
            }
          }, 150)
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
    localStorage.setItem("legends-site-config", JSON.stringify(newConfig))
    syncConfigToIframe(newConfig)
  }

  const handleReset = () => {
    updateConfig(defaultSiteConfig)
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

  const handlePublish = () => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      setShowPublishSuccess(true)
    }, 1800)
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
          }`}
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
                  ref={heroTitleRef}
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
                  ref={heroSubtitleRef}
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
                  ref={heroCtaRef}
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
                  ref={featuresTitleRef}
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
                  ref={featuresSubtitleRef}
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
                const titleRef = idx === 0 ? feat0TitleRef : idx === 1 ? feat1TitleRef : feat2TitleRef
                const descRef = idx === 0 ? feat0DescRef : idx === 1 ? feat1DescRef : feat2DescRef
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
                        ref={titleRef}
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
                        ref={descRef}
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
            localhost:3000/tools/shop-site-template/shop-website-customizer
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
            src="/tools/shop-site-template/shop-website-customizer"
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
            className="flex flex-col bg-neutral-950 h-full"
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
          }`}>
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
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          
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
              Your site changes have been compiled, tailwind theme configurations optimized, and static routes pre-rendered to production.
            </p>
            <button
              onClick={() => setShowPublishSuccess(false)}
              className="mt-6 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
