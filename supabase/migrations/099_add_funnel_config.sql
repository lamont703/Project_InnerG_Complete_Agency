-- Migration 099: Add funnel_config to project_agent_config
-- Inner G Complete Agency — Client Intelligence Portal
-- Allows Super Admins to configure labels and source visibility for the Omni-Channel Funnel Visualization.

ALTER TABLE public.project_agent_config
ADD COLUMN funnel_config JSONB DEFAULT '{
  "sources": [
    {"id": "yt", "enabled": true, "metric": "views", "label": "YouTube", "subLabel": "Channel Views", "color": "bg-red-500", "hex": "#EF4444"},
    {"id": "tt", "enabled": true, "metric": "totalViews", "label": "TikTok", "subLabel": "Video Reach", "color": "bg-pink-500", "hex": "#EC4899"},
    {"id": "li", "enabled": true, "metric": "views", "label": "LinkedIn", "subLabel": "Post Reach", "color": "bg-blue-500", "hex": "#3B82F6"},
    {"id": "ig", "enabled": true, "metric": "reach", "label": "Instagram", "subLabel": "Direct Reach", "color": "bg-purple-500", "hex": "#A855F7"},
    {"id": "fb", "enabled": true, "metric": "reach", "label": "Facebook", "subLabel": "Organic Flow", "color": "bg-blue-600", "hex": "#2563EB"},
    {"id": "tw", "enabled": false, "metric": "reach", "label": "X / Twitter", "subLabel": "Pulse Traffic", "color": "bg-zinc-800", "hex": "#A1A1AA"},
    {"id": "th", "enabled": false, "metric": "reach", "label": "Threads", "subLabel": "Social Threads", "color": "bg-zinc-100", "hex": "#FFFFFF"}
  ],
  "engagement": {
    "label": "Engagement Pool",
    "subLabel": "Intention Signal Filter",
    "metrics": [
      {"id": "likes", "label": "Total Hearts/Likes", "enabled": true},
      {"id": "comments", "label": "Conversation (Comments)", "enabled": true},
      {"id": "shares", "label": "Share Velocity", "enabled": true},
      {"id": "visitors", "label": "Pixel Unique Visitors", "enabled": true}
    ]
  },
  "conversion": {
    "label": "Conversion Hub",
    "subLabel": "Revenue Qualified Output",
    "metrics": [
      {"id": "step_2", "label": "Step #2 Clicks", "enabled": true, "event_name": "Go To Step #2"},
      {"id": "audit_request", "label": "Request Audit", "enabled": true, "event_name": "Request Growth Audit"},
      {"id": "audit_schedule", "label": "Schedule Audit", "enabled": true, "event_name": "Schedule a Growth Audit"},
      {"id": "school_login", "label": "School Logins", "enabled": true, "event_name": "button-CLEbFRjXN7_btn"}
    ]
  }
}'::jsonb;

COMMENT ON COLUMN public.project_agent_config.funnel_config IS 'JSON configuration for the Omni-Channel Funnel diagram, defining sources, metrics, and custom labels.';

-- Update existing records to have the default config
UPDATE public.project_agent_config SET funnel_config = '{
  "sources": [
    {"id": "yt", "enabled": true, "metric": "views", "label": "YouTube", "subLabel": "Channel Views", "color": "bg-red-500", "hex": "#EF4444"},
    {"id": "tt", "enabled": true, "metric": "totalViews", "label": "TikTok", "subLabel": "Video Reach", "color": "bg-pink-500", "hex": "#EC4899"},
    {"id": "li", "enabled": true, "metric": "views", "label": "LinkedIn", "subLabel": "Post Reach", "color": "bg-blue-500", "hex": "#3B82F6"},
    {"id": "ig", "enabled": true, "metric": "reach", "label": "Instagram", "subLabel": "Direct Reach", "color": "bg-purple-500", "hex": "#A855F7"},
    {"id": "fb", "enabled": true, "metric": "reach", "label": "Facebook", "subLabel": "Organic Flow", "color": "bg-blue-600", "hex": "#2563EB"},
    {"id": "tw", "enabled": false, "metric": "reach", "label": "X / Twitter", "subLabel": "Pulse Traffic", "color": "bg-zinc-800", "hex": "#A1A1AA"},
    {"id": "th", "enabled": false, "metric": "reach", "label": "Threads", "subLabel": "Social Threads", "color": "bg-zinc-100", "hex": "#FFFFFF"}
  ],
  "engagement": {
    "label": "Engagement Pool",
    "subLabel": "Intention Signal Filter",
    "metrics": [
      {"id": "likes", "label": "Total Hearts/Likes", "enabled": true},
      {"id": "comments", "label": "Conversation (Comments)", "enabled": true},
      {"id": "shares", "label": "Share Velocity", "enabled": true},
      {"id": "visitors", "label": "Pixel Unique Visitors", "enabled": true}
    ]
  },
  "conversion": {
    "label": "Conversion Hub",
    "subLabel": "Revenue Qualified Output",
    "metrics": [
      {"id": "step_2", "label": "Step #2 Clicks", "enabled": true, "event_name": "Go To Step #2"},
      {"id": "audit_request", "label": "Request Audit", "enabled": true, "event_name": "Request Growth Audit"},
      {"id": "audit_schedule", "label": "Schedule Audit", "enabled": true, "event_name": "Schedule a Growth Audit"},
      {"id": "school_login", "label": "School Logins", "enabled": true, "event_name": "button-CLEbFRjXN7_btn"}
    ]
  }
}'::jsonb WHERE funnel_config IS NULL;
