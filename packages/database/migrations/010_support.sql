-- Help & support: problems reported by signed-in users, with optional image proof.
-- Images are small (downscaled in the browser) and stored here, so no extra storage service.
CREATE TABLE support_ticket (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug','ask','account','content','security','other')),
  subject text NOT NULL CHECK (length(subject) BETWEEN 3 AND 140),
  description text NOT NULL CHECK (length(description) BETWEEN 10 AND 5000),
  page_url text CHECK (page_url IS NULL OR length(page_url) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','withdrawn')),
  staff_note text CHECK (staff_note IS NULL OR length(staff_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz
);
CREATE INDEX support_ticket_user_created ON support_ticket (user_id, created_at DESC);
CREATE INDEX support_ticket_status_created ON support_ticket (status, created_at DESC);

CREATE TABLE support_attachment (
  id bigserial PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES support_ticket(id) ON DELETE CASCADE,
  filename text NOT NULL CHECK (length(filename) BETWEEN 1 AND 200),
  content_type text NOT NULL CHECK (content_type IN ('image/png','image/jpeg','image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 2000000),
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_attachment_ticket ON support_attachment (ticket_id);
