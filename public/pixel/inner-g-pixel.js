/**
 * inner-g-pixel.js
 * Inner G Complete Agency — Client Intelligence Tracking Library
 * 
 * Version: 1.1.0
 * 
 * Instructions:
 * <script 
 *   src="https://inner-g-agency.supabase.co/storage/v1/object/public/pixel/inner-g-pixel.js" 
 *   data-client-id="YOUR_PROJECT_ID"
 *   async
 * ></script>
 */

(function() {
    "use strict";

    // 1. Initial configuration
    const SCRIPT_ID = "inner-g-pixel";
    var API_URL = "https://senkwhdxgtypcrtoggyf.supabase.co/functions/v1/pixel-ingest";
    var API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbmt3aGR4Z3R5cGNydG9nZ3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDE1MjQsImV4cCI6MjA4Nzk3NzUyNH0._ZQTmLzfR2sWdREeZk1hyGgdREMDUv345F0t2q3p16g";
 
    const LOCAL_STORAGE_KEY = "inner_g_visitor_id";

    // 2. Identify Project ID from the script tag
    const script = document.getElementById(SCRIPT_ID) || document.currentScript || document.querySelector(`script[src*="${SCRIPT_ID}"]`);
    const projectId = script ? script.getAttribute("data-client-id") : null;

    if (!projectId) {
        console.warn("[Inner G Pixel] Ready but inactive: data-client-id attribute is missing.");
        return;
    }

    // 3. Visitor & Session Management
    function getVisitorId() {
        let id = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2));
            localStorage.setItem(LOCAL_STORAGE_KEY, id);
        }
        return id;
    }

    function getSessionId() {
        let sid = sessionStorage.getItem(LOCAL_STORAGE_KEY + "_session");
        if (!sid) {
            sid = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2));
            sessionStorage.setItem(LOCAL_STORAGE_KEY + "_session", sid);
        }
        return sid;
    }

    const visitorId = getVisitorId();
    const sessionId = getSessionId();

    // 3a. Per-pageview state (as opposed to per-document state)
    //
    // This site is a Next.js App Router SPA: every internal <Link> is a
    // history.pushState, not a document load. This script used to run once per
    // document and assume that was once per page, so a soft navigation emitted
    // no page_view at all, never restarted the duration clock, and re-reported
    // the FIRST page's Web Vitals against whatever URL was current by then.
    //
    // A real session showed all three at once: a visitor landed on a school
    // page, clicked through to the exam-prep page, and that second page
    // recorded zero pageviews and a 407-second "time on page" measured from
    // the school page's load.
    //
    // Anything scoped to one pageview rather than one document lives here and
    // is reset by resetPageState() on every soft navigation.
    const newId = () => (crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).substring(2));

    let pageLoadTime = Date.now();
    let viewId = newId();

    // "hard" = a real document load, so the Web Vitals below were measured for
    // THIS page. "soft" = arrived via pushState, where the browser measures no
    // new LCP/CLS/INP at all and carrying the previous page's numbers forward
    // would be a fabrication. Read by handlePageLeave().
    let navType = "hard";

    // document.referrer does not update across a soft navigation, so on an SPA
    // it reports the original external referrer for the rest of the visit —
    // every internal page looked like it came straight from Google. Track the
    // real previous URL instead.
    let currentReferrer = document.referrer;

    // Events go out via fetch(keepalive) and are inserted concurrently, so
    // created_at cannot order events that land in the same second (a real
    // session recorded "Close menu" five seconds before "Open menu"). A
    // per-document counter makes the true order recoverable.
    let eventSeq = 0;

    // The framework updates document.title during render, after the URL has
    // already changed. Recording the new page_view immediately would attach the
    // outgoing page's title to it.
    const SOFT_NAV_TITLE_DELAY_MS = 350;

    // The hash is in-page UI state, not a distinct page. Including it split
    // page_view and page_leave onto different page_url values after an anchor
    // jump, which defeats the ingest function's server-side duration recompute
    // (it matches those two rows on page_url) and silently falls back to the
    // client's self-reported number — the value that recompute exists to
    // distrust.
    const currentUrl = () =>
        window.location.origin + window.location.pathname + window.location.search;

    // What counts as "a different page" — deliberately the path only.
    //
    // /search rewrites its query string via replaceState on
    // every filter and page change (see that page's handlers). Treating the
    // query as part of a page's identity would turn each of those into a
    // pageview, inflating that one page's traffic well above reality and
    // burying the genuine entries. Query strings here are view state, not
    // destinations.
    const currentPath = () => window.location.pathname;

    // The URL recorded for THIS pageview, frozen when it starts.
    //
    // page_view and page_leave must carry byte-identical page_url values: the
    // ingest function pairs them on that column to recompute duration from
    // server clocks, and a query string that changed mid-visit would break the
    // pairing and silently fall back to the client's number. Interaction events
    // still report the live URL, so filter state at click time is not lost.
    let viewUrl = currentUrl();

    /**
     * The title recorded for THIS pageview, frozen the same way viewUrl is.
     *
     * track() used to read document.title live, on the assumption that during
     * a soft navigation the title still held the OUTGOING page's value. It
     * does not — the framework has already swapped it by the time the handler
     * runs, so every page_leave carried the title of the page being navigated
     * TO. Real data showed the pair inverted: a /shop page_leave titled "Free
     * Community Membership", and the /membership page_leave titled "HEADSCAPE
     * Barbershop".
     *
     * page_url, durations and view_id were unaffected, so this only ever
     * mislabelled reports grouped by title — but that is exactly how someone
     * reads a funnel.
     */
    let viewTitle = document.title;

    // 3b. Core Web Vitals (LCP, CLS, a simplified INP proxy) — collected
    // continuously via PerformanceObserver and attached to the existing
    // page_leave event below rather than a new event type, since page_leave
    // already fires once per page at the right moment (page hide) and is
    // already correctly counted everywhere downstream. INP here is a
    // simplified "worst single interaction latency" (matches Chrome's own
    // 40ms duration-threshold filter), not the true spec's 98th-percentile-
    // across-all-interactions calculation the official web-vitals library
    // computes — a reasonable proxy without pulling in that dependency for
    // a plain script-tag pixel with no build step.
    let lcpValue = null;
    let clsValue = 0;
    let inpValue = null;
    // Distinguishes "measured, and the page was perfectly stable" from "never
    // measured". Reporting a true zero as null threw away the best possible
    // result and made every CLS-clean page look like missing data.
    let clsSupported = false;

    // Stop taking new measurements once the page stops loading.
    //
    // WHY THIS EXISTS: the browser keeps emitting largest-contentful-paint
    // candidates until the user first interacts. On a tab that is opened and
    // left — which is most of what a laptop user does — nothing ever stops
    // them, and each new candidate carries a startTime measured from
    // navigation. That produced a recorded LCP of 24,502 SECONDS on a session
    // that lasted 24,503 seconds: not a slow page, a page open for seven hours.
    //
    // It corrupted every percentile above the median. /careers read as p50
    // 2.94s and p75 47.79s off the same 35 samples, and the p75 was the number
    // being acted on.
    //
    // The spec's own finalisation rule is first interaction; visibility change
    // is added because a backgrounded tab is finished as far as a real user is
    // concerned. Same reasoning applies to INP, which was taking a running
    // maximum with nothing to close it.
    // Two different rules, because the metrics finalise differently:
    //
    //   LCP  stops at the FIRST INTERACTION (the spec's own rule) or when the
    //        page is hidden, whichever comes first.
    //   INP  and CLS must keep measuring after an interaction — that is what
    //        they measure — so they stop only when the page is hidden.
    //
    // Collapsing these into one flag looks tidy and destroys INP entirely,
    // since the freeze would fire on the very interaction being measured.
    let lcpDone = false;
    let pageDone = false;
    ["keydown", "click", "pointerdown"].forEach((evt) => {
        try {
            addEventListener(evt, () => { lcpDone = true; }, { once: true, capture: true, passive: true });
        } catch (e) {}
    });
    try {
        addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") { lcpDone = true; pageDone = true; }
        }, { capture: true });
    } catch (e) {}

    if (typeof PerformanceObserver !== "undefined") {
        try {
            new PerformanceObserver((list) => {
                if (lcpDone) return;
                const entries = list.getEntries();
                const last = entries[entries.length - 1];
                if (last) lcpValue = Math.round(last.renderTime || last.loadTime || last.startTime);
            }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch (e) {}

        try {
            new PerformanceObserver((list) => {
                if (pageDone) return;
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) clsValue += entry.value;
                }
            }).observe({ type: "layout-shift", buffered: true });
            clsSupported = true;
        } catch (e) {}

        try {
            new PerformanceObserver((list) => {
                if (pageDone) return;
                for (const entry of list.getEntries()) {
                    if (inpValue === null || entry.duration > inpValue) inpValue = Math.round(entry.duration);
                }
            }).observe({ type: "event", durationThreshold: 40, buffered: true });
        } catch (e) {}
    }

    // 4. Tracking Method
    function track(eventName, metadata = {}, overrides = {}) {
        // Automatically inject session_id into metadata
        metadata.session_id = sessionId;
        // Groups every event belonging to a single pageview. Without it the
        // repeated page_leave events one pageview can legitimately emit (see
        // section 8) are indistinguishable from separate visits, and any
        // average built over page_leave rows double-counts.
        metadata.view_id = viewId;
        metadata.seq = eventSeq++;
        const payload = {
            projectId: projectId,
            visitorId: visitorId,
            event: eventName,
            // A page_leave fired by a soft navigation belongs to the page being
            // left, but location has already moved by the time we observe it,
            // so that URL has to be passed in explicitly.
            url: overrides.url || currentUrl(),
            title: overrides.title || viewTitle,
            referrer: currentReferrer,
            metadata: metadata,
            timestamp: new Date().toISOString()
        };

        // We use fetch with keepalive as it supports headers (required for Supabase apikey)
        fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: { 
                "Content-Type": "application/json",
                "apikey": API_KEY,
                "Authorization": "Bearer " + API_KEY
            },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(function(e) {
            console.error("[Inner G Pixel] failed to send event: ", e);
        });
    }

    // 5. Expose Global API for manual tracking
    window.innerG = {
        track: track,
        identify: function(email, traits = {}) {
            track("identify", { email: email, ...traits });
            
            // Also update local visitor record via ingestion
            const payload = {
                projectId: projectId,
                visitorId: visitorId,
                event: "$identify",
                metadata: { email: email, ...traits }
            };
            
            // Send to ingest specifically for identity upsert
            fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: { 
                "Content-Type": "application/json",
                "apikey": API_KEY,
                "Authorization": "Bearer " + API_KEY
            },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(function(e) {
            console.error("[inner-g-pixel] failed to send event: ", e);
        });
        }
    };

    // 6. Automatic Interaction Events
    const handleInitialPing = () => {
        track("page_view", { nav_type: "hard" }, { url: viewUrl });
    };

    const handleAutoClickTracking = (e) => {
        const target = e.target.closest("button, a, [data-ig-click]");
        if (!target) return;

        let buttonText = target.innerText?.trim();
        if (!buttonText) {
            buttonText = target.getAttribute("aria-label") || target.title || "";
        }

        const metadata = {
            tag: target.tagName.toLowerCase(),
            text: buttonText.substring(0, 50),
            id: target.id || undefined,
            classes: target.className || undefined,
            href: target.href || undefined,
            ig_click: target.getAttribute("data-ig-click") || undefined
        };

        track("click", metadata);
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
        handleInitialPing();
    } else {
        window.addEventListener("DOMContentLoaded", handleInitialPing);
    }

    // Attach global click listener
    document.addEventListener("click", handleAutoClickTracking, true);

    // 7. Scroll Depth Tracking
    let scrollDepthsTracked = { 50: false, 90: false };
    const handleScroll = () => {
        const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        const winHeight = window.innerHeight;
        const scrollTop = window.scrollY || window.pageYOffset;
        // Avoid division by zero on very short pages
        if (docHeight <= winHeight) return;
        const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;

        if (scrollPercent >= 50 && !scrollDepthsTracked[50]) {
            scrollDepthsTracked[50] = true;
            track("scroll", { depth: "50%" });
        }
        if (scrollPercent >= 90 && !scrollDepthsTracked[90]) {
            scrollDepthsTracked[90] = true;
            track("scroll", { depth: "90%" });
        }
    };
    
    // Throttle scroll event to avoid performance hits
    let scrollTimeout;
    window.addEventListener("scroll", () => {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                handleScroll();
                scrollTimeout = null;
            }, 200);
        }
    }, { passive: true });

    // 8. Session Duration (Time on Page)
    // visibilitychange->hidden and pagehide both fire on a real tab close/
    // navigate-away (almost always, not just as a rare edge case), so both
    // calling the same handler produced an exact duplicate page_leave for
    // most real departures. Tracked=true is set immediately and reset on
    // visibilitychange->visible, so returning to the tab still allows a
    // later, genuinely separate departure to track again (SPA feel).
    let pageLeaveTracked = false;
    /*
     * How many times THIS view has been departed.
     *
     * The reset on visibilitychange->visible above is deliberate — someone who
     * tabs away and comes back should be able to produce a genuinely separate
     * departure. But it means one distracted visitor emits a page_leave per
     * blur, and real data shows six for a single /login view (durations 3, 13,
     * 15, 23, 25, 57).
     *
     * That is a correctness problem, not just noise. Core Web Vitals are
     * measured ONCE PER DOCUMENT — repeating lcp/cls/inp on every re-departure
     * reports the same measurement six times as six independent samples. The
     * sentinel agent needs only CWV_MIN_SAMPLES (5) to publish a verdict on a
     * page, so one person alt-tabbing can satisfy the whole threshold alone.
     *
     * So the vitals ride on the FIRST departure only. Later ones still carry
     * duration (the last is the true total) and say which they are, so a
     * consumer averaging durations can drop the intermediate ones instead of
     * silently averaging a visitor's own partial times together.
     */
    let pageLeaveIndex = 0;
    const handlePageLeave = (urlOverride, titleOverride) => {
        if (!pageLeaveTracked) {
            pageLeaveTracked = true;
            const firstLeave = pageLeaveIndex === 0;
            const durationSeconds = Math.round((Date.now() - pageLoadTime) / 1000);
            pageLeaveIndex += 1;
            track("page_leave", {
                duration_seconds: durationSeconds,
                nav_type: navType,
                // 0 is the real departure; anything higher is a return-and-leave
                // on the same view. Vitals are null on those by design.
                leave_index: firstLeave ? 0 : pageLeaveIndex - 1,
                // Only a hard navigation has Vitals that belong to this URL.
                // null is skipped by every consumer (the sentinel agent tests
                // typeof === "number" and needs CWV_MIN_SAMPLES to render a
                // verdict), so a soft-navigated page now gets no CWV verdict
                // instead of confidently getting the previous page's one.
                lcp_ms: firstLeave && navType === "hard" ? lcpValue : null,
                cls: firstLeave && navType === "hard" && clsSupported
                    ? Math.round(clsValue * 1000) / 1000
                    : null,
                inp_ms: firstLeave && navType === "hard" ? inpValue : null,
            }, {
                url: typeof urlOverride === "string" ? urlOverride : viewUrl,
                title: typeof titleOverride === "string" ? titleOverride : viewTitle,
            });
        }
    };

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            handlePageLeave();
        } else if (document.visibilityState === "visible") {
            pageLeaveTracked = false;
        }
    });

    // Wrapped, not passed by reference: the listener receives an Event, which
    // would arrive as handlePageLeave's urlOverride argument.
    window.addEventListener("pagehide", () => handlePageLeave());

    // 8b. Soft (SPA) navigation
    //
    // Next.js App Router routes internal links through history.pushState, which
    // fires no event of its own — patching the two history methods is the only
    // way to observe it. popstate covers back and forward.
    //
    // Placed after sections 7 and 8 because resetPageState() reassigns the
    // scroll and page_leave state those sections declare.
    let lastPath = currentPath();

    function resetPageState(prevUrl) {
        pageLoadTime = Date.now();
        viewId = newId();
        viewUrl = currentUrl();
        navType = "soft";
        currentReferrer = prevUrl;
        pageLeaveTracked = false;
        // A new view earns a new first departure, so its vitals are reported.
        pageLeaveIndex = 0;
        scrollDepthsTracked = { 50: false, 90: false };
        // The browser measures LCP, CLS and INP once per document and does not
        // re-measure them for a soft navigation. Clearing them is what stops
        // the previous page's numbers being attributed to this URL.
        lcpValue = null;
        clsValue = 0;
        inpValue = null;
        // The observers have nothing left to contribute to a page they cannot
        // measure; stop them accumulating into values we will not report.
        lcpDone = true;
        pageDone = true;
    }

    function handleSoftNavigation() {
        const nextPath = currentPath();
        // Anchor jumps, filter-driven replaceState calls and the framework's own
        // bookkeeping all leave the path alone and are not new pageviews.
        if (nextPath === lastPath) return;

        // The departing page's frozen URL, captured before resetPageState()
        // overwrites it.
        const prevUrl = viewUrl;
        const prevTitle = viewTitle;
        lastPath = nextPath;

        // Close out the departing page first, while navType and the Vitals
        // still describe it, then hand the new page a clean slate.
        handlePageLeave(prevUrl, prevTitle);
        resetPageState(prevUrl);

        // document.title still holds the previous page's value here. Wait for
        // the framework to render, then confirm the URL has not moved on again
        // before recording the view.
        setTimeout(() => {
            if (currentPath() !== nextPath) return;
            // Adopted here, not in resetPageState: this is the first moment the
            // framework has finished rendering and document.title is the new
            // page's. That delay is why SOFT_NAV_TITLE_DELAY_MS exists.
            viewTitle = document.title;
            track("page_view", { nav_type: "soft" }, { url: viewUrl });
        }, SOFT_NAV_TITLE_DELAY_MS);
    }

    // Deferred to a microtask so the framework has finished applying the new
    // URL before currentUrl() reads it.
    const notifyNav = () => { Promise.resolve().then(handleSoftNavigation); };

    ["pushState", "replaceState"].forEach((method) => {
        const original = history[method];
        if (typeof original !== "function") return;
        history[method] = function () {
            const result = original.apply(this, arguments);
            // Never let a tracking failure break the host app's routing.
            try { notifyNav(); } catch (e) {}
            return result;
        };
    });
    window.addEventListener("popstate", notifyNav);

    // 9. Inbound Link Identity Resolution (GoHighLevel)
    const urlParams = new URLSearchParams(window.location.search);
    const ghlId = urlParams.get('ghl_id') || urlParams.get('ghl_contact_id') || urlParams.get('contact_id');
    const userEmail = urlParams.get('email');
    const userPhone = urlParams.get('phone');

    if (ghlId || userEmail || userPhone) {
        setTimeout(() => {
            const identityTraits = {};
            if (ghlId) identityTraits.ghl_contact_id = ghlId;
            if (userPhone) identityTraits.phone = userPhone;
            
            const primaryId = userEmail || userPhone || `ghl_${ghlId}`;
            window.innerG.identify(primaryId, identityTraits);
            
            console.log(`[Inner G Pixel] Identity resolved via URL parameters:`, primaryId);
        }, 500);
    }

    console.log(`[Inner G Pixel] Initialized for project: ${projectId}`);

})();
