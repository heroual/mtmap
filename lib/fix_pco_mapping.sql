
-- ==========================================================
-- AUTO-MAPPING REPAIR SCRIPT FOR PCO CABLES
-- ==========================================================
-- This script finds all cables connected to PCOs that have missing 
-- port mapping metadata and updates them to a 1:1 default mapping.
-- ==========================================================

DO $$
DECLARE
    cable_record RECORD;
    pco_record RECORD;
    new_metadata JSONB;
    fiber_map JSONB;
    i INT;
    capacity INT;
BEGIN
    -- Iterate over all cables that end at a PCO
    FOR cable_record IN 
        SELECT c.id, c.metadata, c.fiber_count, c.end_node_id
        FROM public.cables c
        JOIN public.equipments e ON c.end_node_id = e.id
        WHERE e.type = 'PCO' 
          AND c.is_deleted = false
    LOOP
        -- Get PCO Capacity
        SELECT capacity_total INTO capacity FROM public.equipments WHERE id = cable_record.end_node_id;
        IF capacity IS NULL OR capacity = 0 THEN 
            capacity := 8; -- Default fallback
        END IF;

        -- Prepare new fibers JSON object
        fiber_map := COALESCE(cable_record.metadata->'fibers', '{}'::JSONB);
        
        -- Loop through capacity (e.g., 8 ports)
        FOR i IN 1..capacity LOOP
            -- Check if fiber exists in metadata
            IF (fiber_map->(i::text)) IS NULL OR (fiber_map->(i::text)->>'downstreamPort') IS NULL THEN
                -- Force Mapping: Fiber i -> Port i
                fiber_map := jsonb_set(
                    fiber_map,
                    ARRAY[i::text],
                    jsonb_build_object(
                        'status', 'USED',
                        'downstreamId', cable_record.end_node_id,
                        'downstreamPort', i::text
                    ),
                    true
                );
            END IF;
        END LOOP;

        -- Update the cable row
        new_metadata := jsonb_set(cable_record.metadata, '{fibers}', fiber_map);
        
        UPDATE public.cables 
        SET metadata = new_metadata 
        WHERE id = cable_record.id;
        
    END LOOP;
END $$;
