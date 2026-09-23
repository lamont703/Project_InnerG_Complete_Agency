"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Plug, Copy, Check, ShieldCheck, Trash2, ArrowLeft, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Navbar } from "@/components/layout/navbar"
import { createBrowserClient } from "@/lib/supabase/browser"

/**
 * Connect your own Claude to your own listing.
 *
 * THE ONE THING THIS PAGE HAS TO GET RIGHT is that the URL it produces is a
 * credential and is shown exactly once. So:
 *
 *  - the new URL sits in its own panel with a copy button and a plain warning,
 *    rather than in a toast that disappears
 *  - the list below shows prefixes only, because the server cannot return the
 *    key again even if this page asked it to
 *  - revoking is one click and always available, since "I pasted it somewhere I
 *    shouldn't have" is the likely reason anyone reads this page twice
 *
 * The second thing is expectation setting: a connected Claude can READ this
 * owner's listing and DRAFT changes to it. It cannot publish. That sentence is
 * on the page in the owner's language, not only in the model's instructions,
 * because the owner is the one who will wonder why Google hasn't changed yet.
 */

interface KeyRow {
  id: string
  keyPrefix: string
  label: string | null
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "never"

export default function ConnectClaudePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [label, setLabel] = useState("")
  const [isMinting, setIsMinting] = useState(false)
  // Held in memory only, and only until the page is left. There is no way to
  // fetch it back, which is the point.
  const [freshUrl, setFreshUrl] = useState<string | null>(null)
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [mcpBase, setMcpBase] = useState<string>("https://shearquery.com/mcp")
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/account/claude")
        return
      }
      setAuthChecked(true)
    })
  }, [router])

  const load = () =>
    fetch("/api/account/mcp-keys", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setKeys(data.keys || [])
      })
      .catch((err) => toast.error(err.message || "Could not load your connections."))
      .finally(() => setIsLoading(false))

  useEffect(() => {
    if (!authChecked) return
    load()
  }, [authChecked])

  const mint = async () => {
    setIsMinting(true)
    try {
      const res = await fetch("/api/account/mcp-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      /**
       * The server returns the CANONICAL url (shearquery.com), because that is
       * the address a real owner installs. On a dev host that url points at
       * production, where the key does not exist — so the link shown is rebuilt
       * on the origin actually being used. The key is the credential; the host
       * is just where it is presented.
       */
      const localOrigin = window.location.origin
      const isCanonical = data.url?.startsWith(localOrigin)
      setFreshUrl(isCanonical ? data.url : `${localOrigin}/mcp/k/${data.key}`)
      setFreshKey(data.key)
      setMcpBase(isCanonical ? `${new URL(data.url).origin}/mcp` : `${localOrigin}/mcp`)
      setLabel("")
      setCopied(null)
      await load()
    } catch (err: any) {
      toast.error(err.message || "Could not create a connection.")
    } finally {
      setIsMinting(false)
    }
  }

  const revoke = async (id: string) => {
    try {
      const res = await fetch(`/api/account/mcp-keys?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success("Connection revoked. It stops working immediately.")
      await load()
    } catch (err: any) {
      toast.error(err.message || "Could not revoke that connection.")
    }
  }

  const copy = async (what: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(what)
      setTimeout(() => setCopied((c) => (c === what ? null : c)), 2500)
    } catch {
      // Clipboard access can be refused. The URL is on screen and selectable,
      // so this is a missing convenience, not a dead end.
      toast.message("Copy it manually — your browser blocked the clipboard.")
    }
  }

  const live = keys.filter((k) => !k.revokedAt)

  if (!authChecked || isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 light text-slate-900">
      <Navbar />
      <main className="flex-1 px-4 pb-20 pt-24 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/account/manage-listing"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to my listing
          </Link>

          <header className="mt-6">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
              <Plug className="h-3 w-3" />
              Connect your own AI
            </span>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Use your Claude on your own shop</h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Add one link to Claude and it can look at your own listing — your audit score, your
              reviews, what Google is missing — and write the fixes for you. You approve every change
              here before anything reaches Google.
            </p>
          </header>

          {/* The new credential. Its own panel, because it is shown once. */}
          {freshUrl && freshKey && (
            <section className="mt-8 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
              <h2 className="flex items-center gap-2 text-lg font-black text-emerald-900">
                <ShieldCheck className="h-5 w-5" />
                Your new connection
              </h2>
              <p className="mt-2 text-sm font-semibold text-emerald-900">
                Copy it now. This is the only time it is shown — we don&apos;t keep a copy, so if you
                lose it you make a new one.
              </p>

              {/* Recommended first. Claude stores a request header and never
                  shows it again; a URL gets pasted into screenshots and chats. */}
              <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-800">
                  Recommended — URL plus a header
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Keeps the secret out of the address. Claude stores header values securely.
                </p>
                <label className="mt-3 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Server URL
                </label>
                <div className="mt-1 flex items-stretch gap-2">
                  <code className="flex-1 overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">
                    {mcpBase}
                  </code>
                  <button
                    onClick={() => copy("base", mcpBase)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-800"
                  >
                    {copied === "base" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "base" ? "Copied" : "Copy"}
                  </button>
                </div>
                <label className="mt-3 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Request header — name
                </label>
                <div className="mt-1 flex items-stretch gap-2">
                  <code className="flex-1 rounded-lg bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">
                    Authorization
                  </code>
                  <button
                    onClick={() => copy("hname", "Authorization")}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-800"
                  >
                    {copied === "hname" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "hname" ? "Copied" : "Copy"}
                  </button>
                </div>
                <label className="mt-3 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Request header — value
                </label>
                <div className="mt-1 flex items-stretch gap-2">
                  <code className="flex-1 overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">
                    Bearer {freshKey}
                  </code>
                  <button
                    onClick={() => copy("hvalue", `Bearer ${freshKey}`)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white transition hover:bg-emerald-800"
                  >
                    {copied === "hvalue" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "hvalue" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* The fallback, for anything with only a URL field. */}
              <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Or — one link, nothing else
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  For any client with no header field. The key is in the address, so treat the whole
                  link as the password.
                </p>
                <div className="mt-3 flex items-stretch gap-2">
                  <code className="flex-1 overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">
                    {freshUrl}
                  </code>
                  <button
                    onClick={() => copy("url", freshUrl)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-800"
                  >
                    {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "url" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-emerald-900">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Either way, treat it like a password. Anyone who has it can see your listing data and
                queue drafts on your account. It cannot publish to Google, and you can revoke it below
                at any time.
              </p>
            </section>
          )}

          {/* Create */}
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">Create a connection</h2>
            <p className="mt-1 text-sm text-slate-600">
              Name it after where you&apos;re putting it, so you know which is which later.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={60}
                placeholder="My phone, front desk laptop…"
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
              <button
                onClick={mint}
                disabled={isMinting || live.length >= 5}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                {isMinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                Create link
              </button>
            </div>
            {live.length >= 5 && (
              <p className="mt-3 text-xs font-semibold text-amber-700">
                You have five active connections, which is the limit. Revoke one you don&apos;t use.
              </p>
            )}
          </section>

          {/* Existing */}
          <section className="mt-8">
            <h2 className="text-lg font-black">Your connections</h2>
            {keys.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">None yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className={`flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                      k.revokedAt ? "border-slate-200 opacity-60" : "border-slate-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{k.label || "Unnamed connection"}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{k.keyPrefix}…</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Added {when(k.createdAt)} · Last used {when(k.lastUsedAt)}
                        {k.revokedAt ? ` · Revoked ${when(k.revokedAt)}` : ""}
                      </p>
                    </div>
                    {!k.revokedAt && (
                      <button
                        onClick={() => revoke(k.id)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* How to install it. Two clients, because they take it differently. */}
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">Where to paste it</h2>

            <h3 className="mt-5 text-sm font-black uppercase tracking-wide text-slate-500">
              Claude app or claude.ai
            </h3>
            <ol className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-700">
              <li>1. Open Settings, then Connectors, and add a custom connector.</li>
              <li>2. Paste the server URL.</li>
              <li>
                3. On the Authentication step, choose{" "}
                <strong className="font-black">No sign-in</strong>. Claude should already have
                detected that — ShearQuery uses a key, not a Google-style sign-in flow, so the other
                two options have nothing to sign in to.
              </li>
              <li>
                4. If you used the recommended method, add your header under{" "}
                <strong className="font-black">Request headers</strong>: name{" "}
                <code className="rounded bg-slate-100 px-1 font-mono text-[12px]">Authorization</code>
                , value <code className="rounded bg-slate-100 px-1 font-mono text-[12px]">Bearer …</code>
                . If you used the one-link method, leave headers empty.
              </li>
              <li>5. Save it.</li>
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Claude warns that without sign-in anyone holding the URL can use the connector. That is
              true and it is why the key exists: it identifies your account, and it can never publish
              to Google. Revoke it here the moment you think it has been seen.
            </p>

            <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-slate-500">Claude Code</h3>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 font-mono text-[13px] text-emerald-300">
{`claude mcp add --transport http shearquery ${mcpBase} \\
  --header "Authorization: Bearer <your key>"`}
            </pre>

            {/* The step that used to be missing. Claude asks per tool, and the
                answer is uniform today because every tool only reads. */}
            <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-slate-500">
              Then it asks about each tool
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Claude shows a permission screen listing every tool and asks whether to allow it or
              ask you each time. <strong className="font-black">Allow all of them.</strong> Every
              tool ShearQuery offers today only <em>looks things up</em> — none of them changes
              anything, spends anything, or touches your Google profile. We mark them read-only in
              the connection itself, so a client that reads those markers can work that out without
              asking you.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              That will change, and this is the line to watch for. Tools whose names begin with{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-[12px]">propose_</code> are
              coming — they write a draft change to your listing. Set those to{" "}
              <strong className="font-black">ask each time</strong>. They still cannot publish
              anything; you approve every change here. But a tool that writes is worth seeing
              happen.
            </p>

            <p className="mt-6 text-sm leading-relaxed text-slate-600">
              Once it&apos;s connected, ask it something like{" "}
              <em>&quot;audit my Google profile and fix what you can&quot;</em>. Drafts land in{" "}
              <Link href="/account/my-requests" className="font-bold text-blue-700 underline">
                your requests
              </Link>{" "}
              for you to approve.
            </p>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-100 p-6">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
              What a connection can and can&apos;t do
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <li>
                <strong>Can</strong> read your claimed listing, your audit, your reviews and your photo
                coverage.
              </li>
              <li>
                <strong>Can</strong> write drafts — a post, a reply, a description — and queue them for
                you.
              </li>
              <li>
                <strong>Cannot</strong> publish anything to Google. Approval happens on this site, by
                you.
              </li>
              <li>
                <strong>Cannot</strong> see other people&apos;s private listings, your password, or your
                payment details.
              </li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Not an owner yet? The free prompts at{" "}
              <Link href="/for-claude" className="font-bold text-blue-700 underline">
                /for-claude
              </Link>{" "}
              work without any of this.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
