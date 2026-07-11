-- Queue of generated Pinterest pin graphics, decoupled from actual posting.
-- Generation (render + upload to the pinterest-images storage bucket) and
-- posting (currently manual, via copying these fields into GoHighLevel's
-- Pinterest composer) are separate steps on purpose — this table is the
-- handoff point between them, and the natural place to wire in automated
-- posting later if GHL's API ends up supporting it.
CREATE TABLE IF NOT EXISTS pinterest_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL,
  board_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  link text NOT NULL,
  image_path text NOT NULL,
  image_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'skipped')),
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pinterest_pins_status ON pinterest_pins (status, created_at);
