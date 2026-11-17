CREATE TABLE IF NOT EXISTS consent_preferences (
  visitor_id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  personal_data boolean NOT NULL DEFAULT false,
  analytics_cookies boolean NOT NULL DEFAULT false,
  decision text NOT NULL CHECK (decision IN ('accept_all', 'necessary_only', 'customized')),
  policy_version text NOT NULL CHECK (char_length(policy_version) BETWEEN 1 AND 40),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consent_preferences_user_id_idx
  ON consent_preferences (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE consent_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE consent_preferences FROM PUBLIC;

DO $
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE consent_preferences FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE consent_preferences FROM authenticated';
  END IF;
END
$;
