
-- 1. Ensure cables table has metadata column for storing extra attributes
ALTER TABLE public.cables 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- 2. Add length_meters if missing (Critical for persistence)
ALTER TABLE public.cables 
ADD COLUMN IF NOT EXISTS length_meters FLOAT DEFAULT 0;

-- 3. Add Index on Equipments Metadata to speed up Fiber Usage lookups
CREATE INDEX IF NOT EXISTS idx_equipments_metadata_connections 
ON public.equipments 
USING GIN ((metadata -> 'connections'));

-- 4. Function to help find which cable is connected to a specific OLT Port (Backend utility)
CREATE OR REPLACE FUNCTION get_cable_for_port(equipment_id UUID, port_id TEXT)
RETURNS UUID AS $$
DECLARE
    cable_id UUID;
BEGIN
    SELECT (metadata -> 'connections' -> port_id ->> 'cableId')::UUID
    INTO cable_id
    FROM public.equipments
    WHERE id = equipment_id;
    
    RETURN cable_id;
END;
$$ LANGUAGE plpgsql;
