"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Link2, Unlink, Loader2, ShieldCheck, MapPin } from "lucide-react"
import { toast } from "sonner"

interface MemberLink {
  linkId: string
  entityType: "shop" | "salon"
  entityId: string
  entitySlug: string
  entityName: string
  entityAddress: string | null
  linkedAt: string
}

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string
  link: MemberLink | null
}

interface EntityResult {
  entityType: "shop" | "salon"
  id: string
  slug: string
  name: string
  address: string | null
  alreadyClaimed: boolean
}

// Manual linking dashboard between community_members (thin, self-serve
// directory signups) and real shop/salon entities — see the
// 20260720000000 migration for why this exists: only a real entity can
// ever be recommended in search, and linking one to a member is also what
// toggles off that entity's "Is this your shop? Claim your business" CTA.
export default function CommunityEntityLinksPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [memberFilter, setMemberFilter] = useState("")
  const [linkingMemberId, setLinkingMemberId] = useState<string | null>(null)
  const [entityQuery, setEntityQuery] = useState("")
  const [entityResults, setEntityResults] = useState<EntityResult[]>([])
  const [isSearchingEntities, setIsSearchingEntities] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/community-entity-links")
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setMembers(data.data)
    } catch (err: any) {
      toast.error(err.message || "Failed to load community members.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    if (entityQuery.trim().length < 2) {
      setEntityResults([])
      return
    }
    setIsSearchingEntities(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/community-entity-links/search-entities?q=${encodeURIComponent(entityQuery)}`)
        const data = await res.json()
        if (data.success) setEntityResults(data.data)
      } catch {
        // Silent — this is a live-typing autocomplete, not a critical action.
      } finally {
        setIsSearchingEntities(false)
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [entityQuery])

  const handleLink = async (member: Member, entity: EntityResult) => {
    setPendingAction(member.id)
    try {
      const res = await fetch("/api/admin/community-entity-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityMemberId: member.id, entityType: entity.entityType, entityId: entity.id }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Linked ${member.first_name} ${member.last_name} to ${entity.name}.`)
      setLinkingMemberId(null)
      setEntityQuery("")
      setEntityResults([])
      await loadMembers()
    } catch (err: any) {
      toast.error(err.message || "Failed to create link.")
    } finally {
      setPendingAction(null)
    }
  }

  const handleUnlink = async (member: Member) => {
    if (!member.link) return
    setPendingAction(member.id)
    try {
      const res = await fetch(`/api/admin/community-entity-links/${member.link.linkId}`, { method: "DELETE" })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      toast.success(`Unlinked ${member.first_name} ${member.last_name}.`)
      await loadMembers()
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink.")
    } finally {
      setPendingAction(null)
    }
  }

  const filteredMembers = members.filter((m) => {
    if (!memberFilter.trim()) return true
    const haystack = `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase()
    return haystack.includes(memberFilter.toLowerCase())
  })

  return (
    <div className="min-h-full bg-background">
      {/* Plain header, not AdminHeader — AdminHeader pulls in
          useAgencyData(), which does its own auth check for an
          agency-provisioned admin profile (a different concept from
          community_members) and redirects to /select-portal when it
          can't find one. This dashboard's only real gate is the
          lamont703@gmail.com screensaver in middleware.ts. */}
      <header className="sticky top-0 z-40 h-24 flex items-center px-4 md:px-10 glass-panel-strong border-b border-border backdrop-blur-2xl">
        <div>
          <h1 className="text-lg font-black uppercase tracking-[0.2em] text-foreground leading-none">Community ↔ Entity Links</h1>
          <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest font-bold">Manually link members to a real shop or salon</p>
        </div>
      </header>

      <div className="p-4 md:p-10 max-w-4xl mx-auto space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter members by name or email..."
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="w-full bg-secondary/30 border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-20">No community members found.</p>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div key={member.id} className="glass-panel rounded-2xl p-5 border border-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-bold text-foreground text-sm">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>

                  {member.link ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {member.link.entityName}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{member.link.entityType} · claimed</p>
                      </div>
                      <button
                        onClick={() => handleUnlink(member)}
                        disabled={pendingAction === member.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-600 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {pendingAction === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                        Unlink
                      </button>
                    </div>
                  ) : linkingMemberId === member.id ? (
                    <div className="w-full mt-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search shop or salon by name..."
                          value={entityQuery}
                          onChange={(e) => setEntityQuery(e.target.value)}
                          className="w-full bg-white border border-border rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      {isSearchingEntities && <p className="text-[10px] text-muted-foreground mt-1.5">Searching...</p>}
                      {entityResults.length > 0 && (
                        <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
                          {entityResults.map((entity) => (
                            <button
                              key={`${entity.entityType}-${entity.id}`}
                              onClick={() => handleLink(member, entity)}
                              disabled={entity.alreadyClaimed || pendingAction === member.id}
                              className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{entity.name}</p>
                                {entity.address && (
                                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                    <MapPin className="h-2.5 w-2.5 shrink-0" /> {entity.address}
                                  </p>
                                )}
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground shrink-0">
                                {entity.alreadyClaimed ? "Already Claimed" : entity.entityType}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => { setLinkingMemberId(null); setEntityQuery(""); setEntityResults([]) }}
                        className="text-[10px] text-muted-foreground hover:text-foreground mt-2"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setLinkingMemberId(member.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Link Entity
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
