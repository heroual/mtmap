
-- Allow equipment to exist without a parent (e.g. Outdoor MSANs, Street Cabinets)
ALTER TABLE public.equipments ALTER COLUMN parent_id DROP NOT NULL;
