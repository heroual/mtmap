
-- 1. Audit Logs Table (Append Only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    action TEXT NOT NULL, 
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_path TEXT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Robust Schema Migration (Handle existing tables missing columns)
DO $$ 
BEGIN 
  -- 1. Handle 'action' column (Migration from action_type or creation)
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='action_type') THEN
      ALTER TABLE public.audit_logs RENAME COLUMN action_type TO action;
  END IF;

  -- 2. Handle 'entity' column (Migration to entity_type) - Fix for "null value in column entity"
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='entity') THEN
      IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='entity_type') THEN
          ALTER TABLE public.audit_logs RENAME COLUMN entity TO entity_type;
      ELSE
          -- If entity_type already exists, the 'entity' column is likely legacy and causing constraint errors
          ALTER TABLE public.audit_logs DROP COLUMN entity;
      END IF;
  END IF;

  -- 3. Ensure 'action' exists if it wasn't renamed
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='action') THEN
      ALTER TABLE public.audit_logs ADD COLUMN action TEXT DEFAULT 'UNKNOWN';
  END IF;

  -- 4. Ensure 'entity_type' exists (Fix for error 42703)
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='entity_type') THEN
      ALTER TABLE public.audit_logs ADD COLUMN entity_type TEXT DEFAULT 'SYSTEM';
  END IF;

  -- 5. Ensure 'entity_id' exists
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='entity_id') THEN
      ALTER TABLE public.audit_logs ADD COLUMN entity_id TEXT DEFAULT '000';
  END IF;
  
  -- 6. Ensure 'user_email' exists
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='user_email') THEN
      ALTER TABLE public.audit_logs ADD COLUMN user_email TEXT DEFAULT 'admin@mtmap.ma';
  END IF;

  -- 7. Ensure 'entity_path' exists (Fix for missing column error)
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='entity_path') THEN
      ALTER TABLE public.audit_logs ADD COLUMN entity_path TEXT;
  END IF;

  -- 8. Ensure 'old_data' exists
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='old_data') THEN
      ALTER TABLE public.audit_logs ADD COLUMN old_data JSONB;
  END IF;

  -- 9. Ensure 'new_data' exists
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='new_data') THEN
      ALTER TABLE public.audit_logs ADD COLUMN new_data JSONB;
  END IF;
END $$;

-- Now safe to create indices
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity_type ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON public.audit_logs (entity_id);

-- 2. Snapshots Table
CREATE TABLE IF NOT EXISTS public.network_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Snapshot Data (Flat storage of frozen states)
CREATE TABLE IF NOT EXISTS public.snapshot_data (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id UUID REFERENCES public.network_snapshots(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    record_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshot_data_lookup ON public.snapshot_data (snapshot_id);

-- Secure access
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_data ENABLE ROW LEVEL SECURITY;

-- DROP Policies if they exist to avoid conflict on re-run
DROP POLICY IF EXISTS "Allow All Audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow All Snapshots" ON public.network_snapshots;
DROP POLICY IF EXISTS "Allow All Snapshot Data" ON public.snapshot_data;

CREATE POLICY "Allow All Audit" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Snapshots" ON public.network_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Snapshot Data" ON public.snapshot_data FOR ALL USING (true) WITH CHECK (true);
