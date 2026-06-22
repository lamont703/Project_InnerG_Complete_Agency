/**
 * inner-g-pixel.js
 * Inner G Complete Agency — Client Intelligence Tracking Library
 * 
 * Version: 1.0.0
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
    const pageLoadTime = Date.now();

    // 4. Tracking Method
    function track(eventName, metadata = {}) {
        // Automatically inject session_id into metadata
        metadata.session_id = sessionId;
        const payload = {
            projectId: projectId,
            visitorId: visitorId,
            event: eventName,
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
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
        track("page_view");
    };

    const handleAutoClickTracking = (e) => {
        const target = e.target.closest("button, a, [data-ig-click]");
        if (!target) return;

        const metadata = {
            tag: target.tagName.toLowerCase(),
            text: target.innerText?.trim().substring(0, 50),
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
    // Use an object to avoid tracking multiple times if visibility changes rapidly
    let pageLeaveTracked = false;
    const handlePageLeave = () => {
        if (!pageLeaveTracked) {
            const durationSeconds = Math.round((Date.now() - pageLoadTime) / 1000);
            track("page_leave", { duration_seconds: durationSeconds });
            // Don't mark tracked=true if we want them to re-track on return.
            // But typical page_leave implies they left. We'll leave it re-trackable for SPA feel.
        }
    };

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            handlePageLeave();
        }
    });

    window.addEventListener("pagehide", handlePageLeave);

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
