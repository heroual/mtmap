
-- OPTIMIZATION FOR PORT MAPPING LOOKUPS
-- Since connection logic is stored in JSONB columns, GIN indexes are essential for performance.

-- 1. Index for locating cables by their fiber mapping (Downstream lookups)
CREATE INDEX IF NOT EXISTS idx_cables_fibers 
ON public.cables 
USING GIN ((metadata -> 'fibers'));

-- 2. Index for locating equipment connections (Upstream/Downstream port status)
CREATE INDEX IF NOT EXISTS idx_equipments_connections 
ON public.equipments 
USING GIN ((metadata -> 'connections'));

-- 3. (Optional) Dedicated table if migrating away from JSONB in future
-- CREATE TABLE IF NOT EXISTS public.fiber_mappings (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     cable_id UUID REFERENCES public.cables(id) ON DELETE CASCADE,
--     fiber_index INT NOT NULL,
--     connected_equipment_id UUID REFERENCES public.equipments(id),
--     connected_port_index INT,
--     status TEXT DEFAULT 'CONNECTED',
--     updated_at TIMESTAMPTZ DEFAULT NOW(),
--     UNIQUE(cable_id, fiber_index)
-- );
-- CREATE INDEX IF NOT EXISTS idx_fiber_mappings_equip ON public.fiber_mappings(connected_equipment_id);
