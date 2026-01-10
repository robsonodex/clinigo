CREATE OR REPLACE FUNCTION public.audit_user_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name text;
    v_user_email text;
    v_user_role text;
BEGIN
    -- For DELETE operations, we can't link to the user being deleted because of FK constraints
    IF (TG_OP = 'DELETE') THEN
        PERFORM create_audit_log(
            OLD.clinic_id,
            NULL, -- Pass NULL as user_id to avoid FK violation
            'USER_DELETED',
            'user',
            OLD.id,
            OLD.full_name,
            OLD.email,
            OLD.role,
            'system', -- acting user (system/trigger)
            'system',
            'User deleted via database direct action',
            to_jsonb(OLD),
            NULL,
            'warning'
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only log if significant fields changed
        IF (OLD.role IS DISTINCT FROM NEW.role OR 
            OLD.email IS DISTINCT FROM NEW.email OR 
            OLD.full_name IS DISTINCT FROM NEW.full_name) THEN
            
            PERFORM create_audit_log(
                NEW.clinic_id,
                NEW.id,
                'USER_UPDATED',
                'user',
                NEW.id,
                NEW.full_name,
                NEW.email,
                NEW.role,
                'system',
                'system',
                'User updated details',
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
            NEW.full_name,
            NEW.email,
            NEW.role,
            'system',
            'system',
            'User created',
            NULL,
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
