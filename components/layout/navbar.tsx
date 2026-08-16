"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Menu, X, ArrowRight, ChevronDown, LogOut, User as UserIcon, LayoutGrid, Store, BarChart3, TrendingUp, Search, GraduationCap, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackNavClick, trackCTAClick } from "@/lib/analytics"
import { createBrowserClient } from "@/lib/supabase/browser"
import { LOGO_LOCKUP } from "@/lib/brand";
import { ViewAsMenuItem, ViewAsPicker, useViewAs } from "@/components/layout/view-as";

const navLinks = [
  { label: "AI Lab", href: "/ai-solutions" },
  { label: "Membership", href: "/membership" },
  // Points at the free audit rather than the service page: a nav click is cold,
  // and the audit gives a shop owner their own score before asking for anything.
  // Pricing is one click on from there.
  { label: "Google Profile", href: "/google-business-profile-audit" },
  { label: "Advertise", href: "/media-kit" },
]

/**
 * Ordered by depth of coverage, not alphabetically. Texas and California carry
 * the business directory; everything below them is exam content only, and a
 * visitor scanning this list is better served by the fullest hub first.
 */
const stateHubLinks = [
  { label: "Texas Hub", href: "/texas" },
  { label: "California Hub", href: "/california" },
  { label: "Maryland Hub", href: "/maryland" },
  { label: "Mississippi Hub", href: "/mississippi" },
  { label: "Virginia Hub", href: "/virginia" },
  { label: "Ohio Hub", href: "/ohio" },
  { label: "Tennessee Hub", href: "/tennessee" },
  { label: "Minnesota Hub", href: "/minnesota" },
]

interface AccountProject {
  slug: string
  name: string
  href: string
}


export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [isStateHubsOpen, setIsStateHubsOpen] = useState(false)
  const router = useRouter()

  // Auth state is fetched client-side only — the navbar renders on public,
  // unauthenticated pages far more often than authenticated ones, so this
  // deliberately doesn't block first paint on a session check the way
  // middleware already does for the actually-protected routes.
  const [authChecked, setAuthChecked] = useState(false)
  const [accountLabel, setAccountLabel] = useState<string | null>(null)
  const [accountProjects, setAccountProjects] = useState<AccountProject[]>([])
  // Which audience this member signed up as. Used only to ADD an item that is
  // relevant to them — never to remove one. NULL for every member who predates
  // the column, and they see exactly what they always have.
  const [accountAudience, setAccountAudience] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient()

    const loadAccount = async (userId: string, email: string | undefined) => {
      const { data: profile } = await supabase
        .from("users")
        .select("full_name, role")
        .eq("id", userId)
        .maybeSingle() as any

      setAccountLabel(profile?.full_name || email || "Account")

      // community_members is a public directory table by design (its RLS
      // policy is USING(true)), so this is readable with the anon key like
      // the rest of it. Nothing private is fetched here — just which set of
      // menu items to show.
      const { data: memberRow } = await supabase
        .from("community_members")
        .select("audience")
        .eq("user_id", userId)
        .maybeSingle() as any
      setAccountAudience(memberRow?.audience ?? null)

      // Community members have no project associations at all — this
      // query just comes back empty for them, which is correct (their
      // dropdown shows their name + Log Out only, no dashboard links).
      const role = profile?.role || ""
      let query = supabase.from("projects").select("slug, name")
      if (role !== "super_admin" && role !== "developer") {
        query = query.neq("status", "archived")
      }
      const { data: projects } = await query as any
      setAccountProjects(
        (projects || []).map((p: any) => ({
          slug: p.slug,
          name: p.name || p.slug,
          href: `/dashboard/${p.slug}`,
        }))
      )
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadAccount(user.id, user.email)
      setAuthChecked(true)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadAccount(session.user.id, session.user.email)
      } else {
        setAccountLabel(null)
        setAccountProjects([])
        setAccountAudience(null)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  // Admin-only "View As" (components/layout/view-as.tsx). While it's active the
  // account menu shows the viewed-as member's name and *their* project
  // dashboards rather than the admin's, which is the whole point — the menu is
  // one of the things that differs between accounts. Authentication itself still
  // reflects the real session; View As changes what's displayed and which member
  // the server-rendered account pages resolve to, not who is logged in.
  const viewAs = useViewAs()
  // Owned here rather than inside ViewAsMenuItem: the item is rendered inside the
  // account/mobile menu blocks, and opening the picker closes those — which would
  // unmount the item and its state before the picker could render.
  const [isViewAsOpen, setIsViewAsOpen] = useState(false)
  const accountEmail = viewAs.viewingAs?.email ?? null
  const effectiveLabel = viewAs.viewingAs
    ? viewAs.effectiveAccount?.label ?? viewAs.viewingAs.name
    : accountLabel
  const effectiveProjects = viewAs.viewingAs
    ? viewAs.effectiveAccount?.projects ?? []
    : accountProjects

  const isAuthenticated = authChecked && !!accountLabel
  // Adds "My Licence Journey" to the account menu. ADDITIVE ONLY.
  //
  // The first version of this treated audience as exclusive — a student got
  // the journey link and lost Manage My Listing, My Google Audit, Listing
  // Insights and Ad Performance. Two things wrong with that. Somebody can
  // genuinely be both: a student who also owns a shop, or an admin who filled
  // in the journey form to test it — which is exactly what happened, and it
  // took the site owner's own admin menu away. And more generally, an audience
  // is a hint about what to OFFER someone; it is never grounds for withdrawing
  // a capability their account already has.
  const isStudent = accountAudience === "student"

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#')) {
      const id = href.replace('/#', '');
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', href);
      }
    }
    trackNavClick(e.currentTarget.textContent || href, href);
    setIsMobileOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    setAccountLabel(null)
    setAccountProjects([])
    // Cleared with the rest, or a student's menu persists into the next
    // person to sign in on this browser.
    setAccountAudience(null)
    setIsAccountOpen(false)
    setIsMobileOpen(false)
    router.push("/login")
    router.refresh()
  }

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
        ? "glass-panel-strong py-3"
        : "bg-transparent py-5"
        }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 group"
          aria-label={LOGO_LOCKUP === "product" ? "ShearQuery by Inner G Complete Agency Home" : "Inner G Complete Agency Home"}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105 overflow-hidden">
            <Image
              src="/icon-light-32x32.webp"
              alt="Inner G Logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
              unoptimized
            />
          </div>
          {LOGO_LOCKUP === "product" ? (
            // Two lines stacked to roughly the icon's own height, so the header
            // bar doesn't grow — the attribution reads as fine print under the
            // product name rather than competing with it. The subtext is hidden
            // on the smallest screens, where "ShearQuery" alone is still
            // shorter than the wordmark this replaced.
            <span className="flex flex-col justify-center leading-none">
              {/* Same split the hero uses (components/landing/hero-section.tsx):
                  "Shear" in the foreground colour, "Query" in the accent. */}
              <span className="text-xl font-bold tracking-tight text-foreground">
                Shear<span className="text-primary">Query</span>
              </span>
              <span className="hidden sm:block mt-0.5 text-[10px] font-normal tracking-wide text-muted-foreground">
                by Inner G Complete Agency
              </span>
            </span>
          ) : (
            <span className="text-xl font-bold tracking-tight text-foreground sm:block">
              Inner G Complete<span className="hidden lg:inline text-muted-foreground font-normal"> Agency</span>
            </span>
          )}
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
            >
              {link.label}
            </Link>
          ))}

          <div className="relative">
            <button
              onClick={() => setIsStateHubsOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
            >
              State Hubs
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isStateHubsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStateHubsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsStateHubsOpen(false)} />
                <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-48">
                  {stateHubLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => {
                        setIsStateHubsOpen(false)
                        handleNavClick(e, link.href)
                      }}
                      className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsAccountOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
              >
                <UserIcon className="h-4 w-4" />
                Account
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAccountOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsAccountOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-2 w-64">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{effectiveLabel}</p>
                      {viewAs.viewingAs && (
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-amber-600">
                          Viewing as {accountEmail || viewAs.viewingAs.name}
                        </p>
                      )}
                    </div>
                    {effectiveProjects.length > 0 && (
                      <div className="py-1 max-h-64 overflow-y-auto">
                        {effectiveProjects.map((project) => (
                          <Link
                            key={project.slug}
                            href={project.href}
                            onClick={() => setIsAccountOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-foreground transition-colors"
                          >
                            <LayoutGrid className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{project.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    <div className="py-1 border-t border-slate-100">
                      <Link
                        href="/account/manage-listing"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-foreground transition-colors"
                      >
                        <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        Manage My Listing
                      </Link>
                      <Link
                        href="/account/gbp-audit"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-foreground transition-colors"
                      >
                        <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        My Google Audit
                      </Link>
                      {/* Above Listing Insights on purpose: a booking request
                          is someone waiting for a phone call, insights are a
                          report that keeps. ADDITIVE — nothing removed. */}
                      <Link
                        href="/account/booking-requests"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-foreground transition-colors"
                      >
                        <CalendarCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        Booking Requests
                      </Link>
                      <Link
                        href="/account/leads"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-foreground transition-colors"
                      >
                        <TrendingUp className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        Listing Insights
                      </Link>
                      <Link
                        href="/account/ad-performance"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-foreground transition-colors"
                      >
                        <BarChart3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        Ad Performance
                      </Link>
                      {/* ADDITIVE, never a replacement. An earlier version made
                          this an either/or — students got the journey link and
                          LOST the four items above. That is wrong twice over:
                          somebody can genuinely be both (a student who also
                          owns a shop), and the audience is a hint about what to
                          offer, never a reason to take away a capability an
                          account already has. It cost the site owner his own
                          admin menu the moment he filled in the journey form
                          while testing. */}
                      {isStudent && (
                        <Link
                          href="/account/journey"
                          onClick={() => setIsAccountOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-foreground transition-colors"
                        >
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          My Licence Journey
                        </Link>
                      )}
                    </div>
                    <ViewAsMenuItem
                      isAdmin={viewAs.isAdmin}
                      onClick={() => {
                        setIsViewAsOpen(true)
                        setIsAccountOpen(false)
                      }}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-foreground"
                    />
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-foreground transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/login" onClick={(e) => handleNavClick(e, '/login')}>Login</Link>
            </Button>
          )}
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1 lg:gap-2 shadow-[0_0_15px_rgba(209,173,117,0.3)] transition-all hover:shadow-[0_0_25px_rgba(209,173,117,0.5)]"
            asChild
          >
            <Link
              href="/tools/barbershop-search"
              onClick={() => trackCTAClick({ cta_label: 'Search ShearQuery', page: 'Navbar', destination: '/tools/barbershop-search' })}
            >
              Search ShearQuery
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* 44px, not 40. Apple's minimum tap target is 44pt and this button sits
            near the screen edge, where a near-miss reads to the user as "I tapped
            it and nothing happened". The negative margin keeps it visually where
            it was while giving the touch area the extra 4px on each axis. */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="-mr-0.5 flex h-11 w-11 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-secondary/50 active:bg-secondary lg:hidden"
          aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileOpen}
          aria-controls="mobile-nav-panel"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* The panel lives inside a `fixed` header, so anything past the fold is
          unreachable — the page cannot be scrolled to it. Measured at 663px with
          13 items, which overflows a 667px phone (iPhone SE/8) and strands the
          bottom of the menu permanently. Capping to the viewport and scrolling
          inside the panel is what makes those items reachable.

          100dvh rather than 100vh: on mobile Safari and Chrome, 100vh is the
          viewport WITHOUT the retracting browser chrome, so a vh-based cap is
          taller than the space actually visible and re-creates the same problem
          in a subtler form. */}
      {isMobileOpen && (
        <div
          id="mobile-nav-panel"
          className="glass-panel-strong mx-4 mt-3 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-2xl p-4 lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-2 border-t border-border pt-2">
              <p className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                State Hubs
              </p>
              {stateHubLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {isAuthenticated && (
              <div className="mt-2 border-t border-border pt-2">
                <p className="px-4 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {effectiveLabel}
                  {viewAs.viewingAs && <span className="text-amber-500"> · viewing as</span>}
                </p>
                {effectiveProjects.map((project) => (
                  <Link
                    key={project.slug}
                    href={project.href}
                    onClick={(e) => handleNavClick(e, project.href)}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                    {project.name}
                  </Link>
                ))}
                <Link
                  href="/account/manage-listing"
                  onClick={(e) => handleNavClick(e, "/account/manage-listing")}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                >
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  Manage My Listing
                </Link>
                <Link
                  href="/account/gbp-audit"
                  onClick={(e) => handleNavClick(e, "/account/gbp-audit")}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                >
                  <Search className="h-3.5 w-3.5 shrink-0" />
                  My Google Audit
                </Link>
                <Link
                  href="/account/booking-requests"
                  onClick={(e) => handleNavClick(e, "/account/booking-requests")}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                >
                  <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                  Booking Requests
                </Link>
                <Link
                  href="/account/leads"
                  onClick={(e) => handleNavClick(e, "/account/leads")}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                >
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  Listing Insights
                </Link>
                <Link
                  href="/account/ad-performance"
                  onClick={(e) => handleNavClick(e, "/account/ad-performance")}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                >
                  <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                  Ad Performance
                </Link>
                {isStudent && (
                  <Link
                    href="/account/journey"
                    onClick={(e) => handleNavClick(e, "/account/journey")}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                  >
                    <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                    My Licence Journey
                  </Link>
                )}
                <ViewAsMenuItem
                  isAdmin={viewAs.isAdmin}
                  onClick={() => {
                    setIsViewAsOpen(true)
                    setIsMobileOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary/50"
                />
              </div>
            )}

            <div className="mt-3 border-t border-border pt-3 flex flex-col gap-2">
              <Button className="w-full bg-primary text-primary-foreground gap-2 shadow-lg" asChild>
                <Link
                  href="/tools/barbershop-search"
                  onClick={() => {
                    setIsMobileOpen(false);
                    trackCTAClick({ cta_label: 'Search ShearQuery (Mobile)', page: 'Navbar', destination: '/tools/barbershop-search' });
                  }}
                >
                  Search ShearQuery
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              {isAuthenticated ? (
                <Button variant="ghost" className="w-full text-muted-foreground gap-2" onClick={handleSignOut}>
                  <LogOut className="h-3.5 w-3.5" />
                  Log Out
                </Button>
              ) : (
                <Button variant="ghost" className="w-full text-muted-foreground" asChild>
                  <Link
                    href="/login"
                    onClick={() => {
                      setIsMobileOpen(false);
                      trackCTAClick({ cta_label: 'Login (Mobile)', page: 'Navbar', destination: '/login' });
                    }}
                  >
                    Login
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>

    {isViewAsOpen && viewAs.isAdmin && (
      <ViewAsPicker
        members={viewAs.members}
        activeMemberId={viewAs.viewingAs?.memberId ?? null}
        onClose={() => setIsViewAsOpen(false)}
      />
    )}
    </>
  )
}
