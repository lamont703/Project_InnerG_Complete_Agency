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
    const API_URL = "https://senkwhdxgtypcrtoggyf.supabase.co/functions/v1/pixel-ingest"; 
    const LOCAL_STORAGE_KEY = "inner_g_visitor_id";

    // 2. Identify Project ID from the script tag
    const script = document.currentScript || document.querySelector(`script[src*="${SCRIPT_ID}"]`);
    const projectId = script ? script.getAttribute("data-client-id") : null;

    if (!projectId) {
        console.warn("[Inner G Pixel] Ready but inactive: data-client-id attribute is missing.");
        return;
    }

    // 3. Visitor Management (Permanent ID)
    function getVisitorId() {
        let id = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!id) {
            id = crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substring(2));
            localStorage.setItem(LOCAL_STORAGE_KEY, id);
        }
        return id;
    }

    const visitorId = getVisitorId();

    // 4. Tracking Method
    function track(eventName, metadata = {}) {
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

        // Use beacon for reliability if available, fallback to fetch
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
            navigator.sendBeacon(API_URL, blob);
        } else {
            fetch(API_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {}); // Fail silently
        }
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        }
    };

    // 6. Automatic Interaction Events
    const handleInitialPing = () => {
        track("page_view");
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
        handleInitialPing();
    } else {
        window.addEventListener("DOMContentLoaded", handleInitialPing);
    }

    // 7. Session Duration (Heartbeat) - Optional, kept simple for v1
    // window.addEventListener("beforeunload", () => track("session_end"));

    console.log(`[Inner G Pixel] Initialized for project: ${projectId}`);

})();
