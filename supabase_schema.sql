
-- Enable PostGIS for geospatial data types
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Equipments Table
CREATE TABLE IF NOT EXISTS public.equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'SITE', 'OLT', 'PCO', etc.
    parent_id UUID, -- References equipments.id (Self-referencing for hierarchy)
    location GEOMETRY(POINT, 4326), -- PostGIS Point
    status TEXT DEFAULT 'PLANNED',
    capacity_total INT DEFAULT 0,
    capacity_used INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::JSONB, -- For extra fields like ports, model, etc.
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS equipments_location_idx ON public.equipments USING GIST (location);

-- 2. Cables Table
CREATE TABLE IF NOT EXISTS public.cables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'CABLE',
    category TEXT, -- 'TRANSPORT', 'DISTRIBUTION'
    start_node_id UUID, -- References equipments.id
    end_node_id UUID,   -- References equipments.id
    path_geometry GEOMETRY(LINESTRING, 4326), -- PostGIS Line
    fiber_count INT DEFAULT 1,
    status TEXT DEFAULT 'PLANNED',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cables_path_idx ON public.cables USING GIST (path_geometry);

-- 3. Clients Table (Optional for PCO management)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES public.equipments(id),
    login TEXT,
    name TEXT,
    contact_info JSONB DEFAULT '{}'::JSONB,
    contract_info JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Operations / Audit Log
CREATE TABLE IF NOT EXISTS public.operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    technician TEXT,
    target_id UUID,
    details TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public access (Warning: Restrict this in production via RLS)
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

-- Simple Policies for Demo (Allow All)
CREATE POLICY "Allow All Equipments" ON public.equipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Cables" ON public.cables FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Operations" ON public.operations FOR ALL USING (true) WITH CHECK (true);
