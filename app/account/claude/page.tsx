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
 * SIGN-IN IS THE MAIN PATH NOW (2026-09-28). An owner adds the plain
 * shearquery.com/mcp URL to Claude and signs in when Claude first reaches an
 * owner tool — nothing secret is copied (lib/mcp/oauth.ts). Connection keys
 * still work and are kept under "Advanced" for clients without OAuth, but the
 * page leads with sign-in because a key in a URL is a password in a place
 * passwords leak from.
 *
 * The second thing is expectation setting: a connected Claude can READ this
 * owner's listing and DRAFT changes to it, and — only on a connection created
 * with publishing switched on — publish a draft after the owner says yes in
 * Claude. Approval happens in Claude by the product owner's decision of
 * 2026-09-27 (see lib/gbp-changes.ts). The switch is per connection so an
 * owner can keep a read-and-draft link somewhere less trusted.
 */

interface GrantRow {
  id: string
  clientHost: string
  clientName: string | null
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

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
  const [grants, setGrants] = useState<GrantRow[]>([])
  const [label, setLabel] = useState("")
  const [allowPublish, setAllowPublish] = useState(true)
  const [freshCanPublish, setFreshCanPublish] = useState(false)
  const [isMinting, setIsMinting] = useState(false)
  // Held in memory only, and only until the page is left. There is no way to
  // fetch it back, which is the point.
  const [freshUrl, setFreshUrl] = useState<string | null>(null)
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [mcpBase, setMcpBase] = useState<string>("https://shearquery.com/mcp")
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    // The address shown is the one this page is served from, so a preview or
    // local run shows a URL that actually reaches it.
    setMcpBase(`${window.location.origin}/mcp`)
  }, [])

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
    Promise.all([
      fetch("/api/account/mcp-keys", { credentials: "include" }).then((res) => res.json()),
      fetch("/api/account/mcp-grants", { credentials: "include" }).then((res) => res.json()),
    ])
      .then(([keyData, grantData]) => {
        if (keyData.error) throw new Error(keyData.error)
        setKeys(keyData.keys || [])
        setGrants(grantData.grants || [])
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
        body: JSON.stringify({ label, allowPublish }),
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
      setFreshCanPublish(Array.isArray(data.row?.scopes) && data.row.scopes.includes("publish"))
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

  const disconnect = async (id: string) => {
    try {
      const res = await fetch(`/api/account/mcp-grants?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success("Disconnected. That app has to sign in again to use your account.")
      await load()
    } catch (err: any) {
      toast.error(err.message || "Could not disconnect that app.")
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
  const liveGrants = grants.filter((g) => !g.revokedAt)

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
              Add ShearQuery to Claude and sign in once. Claude can then look at your own listing —
              your audit score, your reviews, what Google is missing — and fix it for you: hours,
              description, services, categories, review replies, posts and photos. Claude shows you
              each change first and nothing reaches Google until you say yes.
            </p>
          </header>

          {/* The main path: a plain URL, then sign-in inside Claude. */}
          <section className="mt-8 rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black">Connect Claude</h2>
            <div className="mt-4 flex items-stretch gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">
                {mcpBase}
              </code>
              <button
                onClick={() => copy("signin", mcpBase)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-800"
              >
                {copied === "signin" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "signin" ? "Copied" : "Copy"}
              </button>
            </div>
            <ol className="mt-4 space-y-1.5 text-sm leading-relaxed text-slate-700">
              <li>1. In Claude, open Settings, then Connectors, and add a custom connector.</li>
              <li>2. Paste the address above and save. Leave the advanced OAuth fields empty.</li>
              <li>
                3. Ask Claude something about your business, like{" "}
                <em>&quot;audit my Google profile&quot;</em>. It shows a{" "}
                <strong className="font-black">Connect</strong> button.
              </li>
              <li>
                4. Sign in to ShearQuery, choose whether Claude may publish, and tap{" "}
                <strong className="font-black">Allow</strong>. Claude carries on from there.
              </li>
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Nothing secret to copy or lose: Claude gets its own pass, which expires on its own and
              renews in the background. Claude Code:{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-[12px]">
                claude mcp add --transport http shearquery {mcpBase}
              </code>
              , then run <code className="rounded bg-slate-100 px-1 font-mono text-[12px]">/mcp</code>{" "}
              to sign in.
            </p>
          </section>

          <p className="mt-4 text-sm text-slate-600">
            Want Claude to read your Instagram too?{" "}
            <Link href="/account/instagram" className="font-bold text-blue-700 underline">
              Connect Instagram
            </Link>
            . Run your appointment book from Claude:{" "}
            <Link href="/account/calendar" className="font-bold text-blue-700 underline">
              Calendar
            </Link>
            .
          </p>

          {/* Apps the owner has signed in from. */}
          <section className="mt-8">
            <h2 className="text-lg font-black">Connected apps</h2>
            {liveGrants.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">None yet. They appear here after you tap Allow.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {liveGrants.map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{g.clientName || g.clientHost}</p>
                      <p className="mt-0.5 text-xs font-black text-slate-500">
                        {g.scopes.includes("publish") ? "can publish" : g.scopes.includes("propose") ? "read and draft only" : "read only"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Allowed {when(g.createdAt)} · Last used {when(g.lastUsedAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => disconnect(g.id)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* The older path, kept for clients with no OAuth. Collapsed unless in use. */}
          <details className="mt-10 rounded-2xl border border-slate-200 bg-white p-6" open={!!freshUrl || live.length > 0}>
            <summary className="cursor-pointer text-sm font-black uppercase tracking-wide text-slate-500">
              Advanced — connection keys, for apps that can&apos;t sign in
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              The older way to connect: a secret key you paste into the app. Use it only if an app has
              no sign-in option. Anyone who gets the key can use it, so revoke any you no longer need.
            </p>

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
                draft changes{freshCanPublish ? " — and, because publishing is on, publish them to your Google profile" : ""}.
                {freshCanPublish ? " We email you every change it publishes, so you will know if it is ever used without you." : " It cannot publish to Google."}{" "}
                You can revoke it below at any time.
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
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              <input
                type="checkbox"
                checked={allowPublish}
                onChange={(e) => setAllowPublish(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-slate-900"
              />
              <span>
                <strong className="font-black">Let Claude publish changes to my Google profile.</strong>{" "}
                Claude shows you each change and asks before publishing it, and we email you every
                change it makes. Most can be undone by asking Claude. Untick this for a connection that
                can only look and draft.
              </span>
            </label>
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
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {k.keyPrefix}…{" "}
                        <span className="font-sans font-black">
                          · {k.scopes.includes("publish") ? "can publish" : "read and draft only"}
                        </span>
                      </p>
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
                <strong className="font-black">No sign-in</strong>, because the key does the job
                sign-in would.
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
              true, and it is why the key is treated as a password: it identifies your account and, if
              publishing is on, can change your Google profile. Revoke it here the moment you think it
              has been seen.
            </p>

            <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-slate-500">Claude Code</h3>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 font-mono text-[13px] text-emerald-300">
{`claude mcp add --transport http shearquery ${mcpBase} \\
  --header "Authorization: Bearer <your key>"`}
            </pre>

          </section>
          </details>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Claude asks per tool. The markers we send make the safe answer obvious,
                but the owner is the one choosing, so say what each group does. */}
            <h3 className="mt-6 text-sm font-black uppercase tracking-wide text-slate-500">
              Then it asks about each tool
            </h3>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
              <li>
                <strong className="font-black">Tools starting with my_ or find_</strong> only look
                things up. Allow them.
              </li>
              <li>
                <strong className="font-black">Tools starting with propose_</strong> save a draft.
                Nothing on Google changes. Allowing them is safe.
              </li>
              <li>
                <strong className="font-black">publish_change and undo_change</strong> change your live
                Google profile. Set these to <strong className="font-black">ask each time</strong>, so
                Claude checks with you before every change goes out.
              </li>
            </ul>

            <p className="mt-6 text-sm leading-relaxed text-slate-600">
              Once it&apos;s connected, ask it something like{" "}
              <em>&quot;audit my Google profile and fix what you can&quot;</em>. It will show you each
              change as a draft and publish only the ones you approve. Every change is listed at{" "}
              <Link href="/account/changes" className="font-bold text-blue-700 underline">
                your change history
              </Link>
              , with an undo button.
            </p>
          </section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-100 p-6">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
              What a connection can and can&apos;t do
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
              <li>
                <strong>Can</strong> read your claimed listing, your audit, and your whole Google profile:
                hours, description, categories, services, reviews, posts and photos.
              </li>
              <li>
                <strong>Can</strong> draft changes — a post, a reply, new hours — and show them to you
                first.
              </li>
              <li>
                <strong>Can</strong> publish a draft to Google only if publishing is on for that
                connection, and only after you say yes in Claude. Every published change is emailed to
                you.
              </li>
              <li>
                <strong>Cannot</strong> change your business name, address or main category, or see
                other people&apos;s private listings, your password, or your payment details.
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
