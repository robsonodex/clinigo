CREATE OR REPLACE FUNCTION public.audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- For DELETE operations, pass NULL for user_id to avoid FK violation
    IF (TG_OP = 'DELETE') THEN
        PERFORM create_audit_log(
            OLD.clinic_id,                  -- clinic_id
            NULL::uuid,                     -- user_id (NULL to avoid constraint error)
            'USER_DELETED'::text,           -- action
            'user'::text,                   -- entity_type
            OLD.id,                         -- entity_id
            NULL::jsonb,                    -- details
            to_jsonb(OLD),                  -- old_values
            NULL::jsonb,                    -- new_values
            'warning'::text                 -- severity
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.role IS DISTINCT FROM NEW.role OR 
            OLD.email IS DISTINCT FROM NEW.email OR 
            OLD.full_name IS DISTINCT FROM NEW.full_name) THEN
            
            PERFORM create_audit_log(
                NEW.clinic_id,
                NEW.id,
                'USER_UPDATED',
                'user',
                NEW.id,
                jsonb_build_object('diff', 'updated'),
                to_jsonb(OLD),
                to_jsonb(NEW),
                'info'
            );
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        PERFORM create_audit_log(
            NEW.clinic_id,
            NEW.id,
            'USER_CREATED',
            'user',
            NEW.id,
            NULL::jsonb,
            NULL::jsonb,
            to_jsonb(NEW),
            'info'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-run the deletion
DELETE FROM auth.users 
WHERE id IN (
  '30f373fc-77d5-4503-a2d0-bb5abfe9551c',
  'e6e4ae32-942f-4306-9803-c78ab2e4e3d2',
  'f3e819dc-14a7-4b9f-8b16-1d6f11c376c4',
  'ff60ceed-f580-40d6-90e9-4b6d87181251'
);

DELETE FROM public.users 
WHERE id IN (
  '30f373fc-77d5-4503-a2d0-bb5abfe9551c',
  'e6e4ae32-942f-4306-9803-c78ab2e4e3d2',
  'f3e819dc-14a7-4b9f-8b16-1d6f11c376c4',
  'ff60ceed-f580-40d6-90e9-4b6d87181251'
);
