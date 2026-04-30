/**
 * Inner G Complete — Enterprise Analytics Layer
 * Centralized GA4 event tracking utility.
 * All custom events for the full ecosystem are defined here.
 *
 * Event Taxonomy:
 * - scholarship_*   : Barber School Pilot Scholarship Fund funnel
 * - exam_*          : Exam Deck (both public & enhanced) interactions
 * - insight_*       : Research & Insights content engagement
 * - nav_*           : Navigation & CTA click events
 * - lead_*          : Lead generation & conversion events
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

const GA_ID = 'G-VGHV9QQG46'

/**
 * Core gtag event dispatcher — safe (no-ops if gtag not loaded).
 */
function gtagEvent(eventName: string, params: Record<string, any> = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', eventName, {
    send_to: GA_ID,
    ...params,
  })
}

/**
 * Pushes the authenticated user's ID to GA4 to stitch cross-device sessions.
 */
export function setUserId(userId: string) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('config', GA_ID, {
    user_id: userId,
  })
}

// ─────────────────────────────────────────────────────────────
// 🎓 SCHOLARSHIP FUND FUNNEL EVENTS
// ─────────────────────────────────────────────────────────────

/** User views the Scholarship Fund landing page */
export function trackScholarshipPageView() {
  gtagEvent('scholarship_page_view', {
    event_category: 'Scholarship Funnel',
    event_label: 'Barber School Pilot Scholarship Fund',
  })
}

/** User clicks any CTA to open the scholarship registration form */
export function trackScholarshipFormOpen(source: string) {
  gtagEvent('scholarship_form_open', {
    event_category: 'Scholarship Funnel',
    event_label: source, // e.g. 'hero_cta', 'sticky_banner', 'floating_button'
  })
}

/** User selects a role on the registration form */
export function trackRoleSelected(role: 'student' | 'instructor' | 'owner') {
  gtagEvent('scholarship_role_selected', {
    event_category: 'Scholarship Funnel',
    event_label: role,
  })
}

/** User selects a school from the dropdown */
export function trackSchoolSelected(schoolName: string) {
  gtagEvent('scholarship_school_selected', {
    event_category: 'Scholarship Funnel',
    event_label: schoolName,
  })
}

/** User successfully submits the registration form — PRIMARY CONVERSION */
export function trackScholarshipRegistration(params: {
  role: string
  school: string
  method?: string
}) {
  gtagEvent('sign_up', { // GA4 recommended event name for registrations
    event_category: 'Scholarship Funnel',
    event_label: 'Scholarship Registration Complete',
    method: params.method || 'email',
    role: params.role,
    school: params.school,
  })

  // Also fire as a dedicated conversion event for funnel clarity
  gtagEvent('scholarship_registration_complete', {
    event_category: 'Scholarship Funnel',
    role: params.role,
    school: params.school,
  })
}

/** User focuses on or abandons a specific form field */
export function trackFormFieldFocus(fieldName: string) {
  gtagEvent('scholarship_form_field_focus', {
    event_category: 'Scholarship Funnel',
    event_label: fieldName,
  })
}

/** User encounters a form validation error */
export function trackScholarshipFormError(errorMessage: string) {
  gtagEvent('scholarship_form_error', {
    event_category: 'Scholarship Funnel',
    event_label: errorMessage,
  })
}

// ─────────────────────────────────────────────────────────────
// 📝 EXAM DECK EVENTS (Public + Enhanced)
// ─────────────────────────────────────────────────────────────

/** User starts the public or enhanced exam practice deck */
export function trackExamSessionStart(params: {
  deck_type: 'public' | 'enhanced'
  question_count: number
}) {
  gtagEvent('exam_session_start', {
    event_category: 'Exam Intelligence',
    deck_type: params.deck_type,
    question_count: params.question_count,
  })
}

/** User submits an answer to a question */
export function trackExamAnswerSubmitted(params: {
  question_index: number
  domain: string
  is_correct: boolean
  time_spent_ms: number
  changed_answer: boolean
}) {
  gtagEvent('exam_answer_submitted', {
    event_category: 'Exam Intelligence',
    domain: params.domain,
    is_correct: params.is_correct,
    time_spent_ms: params.time_spent_ms,
    changed_answer: params.changed_answer,
    question_index: params.question_index,
  })
}

/** User completes a full 10-question exam session */
export function trackExamSessionComplete(params: {
  deck_type: 'public' | 'enhanced'
  score: number
  total: number
  pass_rate: number
}) {
  gtagEvent('exam_session_complete', {
    event_category: 'Exam Intelligence',
    deck_type: params.deck_type,
    score: params.score,
    total: params.total,
    pass_rate: params.pass_rate,
    value: params.score, // maps to 'value' in GA4 for scoring
  })
}

/** User resets/retakes the exam */
export function trackExamRetake(deck_type: 'public' | 'enhanced') {
  gtagEvent('exam_retake', {
    event_category: 'Exam Intelligence',
    deck_type,
  })
}

// ─────────────────────────────────────────────────────────────
// 📊 INSIGHTS / RESEARCH CONTENT EVENTS
// ─────────────────────────────────────────────────────────────

/** User views an individual insight article */
export function trackInsightView(slug: string, title: string) {
  gtagEvent('insight_article_view', {
    event_category: 'Insights Content',
    article_slug: slug,
    article_title: title,
  })
}

/** User scrolls to 50%+ of an insight article (content engagement) */
export function trackInsightEngagement(slug: string, depth: '50%' | '75%' | '100%') {
  gtagEvent('insight_scroll_depth', {
    event_category: 'Insights Content',
    article_slug: slug,
    scroll_depth: depth,
  })
}

/** User clicks the CTA within an insight article (e.g. "View Rescue Report") */
export function trackInsightCTAClick(source_slug: string, destination: string) {
  gtagEvent('insight_cta_click', {
    event_category: 'Insights Content',
    source_article: source_slug,
    destination_url: destination,
  })
}

// ─────────────────────────────────────────────────────────────
// 🔗 NAVIGATION & CTA CLICK EVENTS
// ─────────────────────────────────────────────────────────────

/** User clicks a main navigation link */
export function trackNavClick(link_label: string, destination: string) {
  gtagEvent('nav_link_click', {
    event_category: 'Navigation',
    link_label,
    destination_url: destination,
  })
}

/** User clicks any primary CTA button on public-facing pages */
export function trackCTAClick(params: {
  cta_label: string
  page: string
  destination: string
}) {
  gtagEvent('cta_click', {
    event_category: 'CTA Engagement',
    cta_label: params.cta_label,
    source_page: params.page,
    destination_url: params.destination,
  })
}

/** User clicks the "View Scholarship Details" from the El Paso or Texas prep pages */
export function trackViewScholarshipCTA(source_page: string) {
  gtagEvent('view_scholarship_cta_click', {
    event_category: 'Lead Generation',
    source_page,
  })
}

/** User clicks the "View Rescue Report" from the prep page */
export function trackViewRescueReportCTA(source_page: string) {
  gtagEvent('view_rescue_report_cta_click', {
    event_category: 'Lead Generation',
    source_page,
  })
}

// ─────────────────────────────────────────────────────────────
// 🏢 LEAD GENERATION / OUTBOUND EVENTS
// ─────────────────────────────────────────────────────────────

/** User clicks the "Request Phase I Audit" or contact CTA */
export function trackLeadInquiry(source_page: string) {
  gtagEvent('lead_inquiry_click', {
    event_category: 'Lead Generation',
    event_label: 'Phase I Audit Request',
    source_page,
  })
}

/** User submits the main contact form on the agency site */
export function trackContactFormSubmit() {
  gtagEvent('contact_form_submit', {
    event_category: 'Lead Generation',
    event_label: 'Contact Form Submission',
  })
}
