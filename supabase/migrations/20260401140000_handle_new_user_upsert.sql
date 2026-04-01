
-- Make handle_new_user resilient to user re-creation (upsert instead of plain INSERT)
-- Fixes: if user is deleted and re-created, orphan data no longer causes duplicate key errors
-- Also fixes: default model changed from Gemini to GPT-4.1 Mini (ADR #23)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id uuid;
  user_name text;
  tenant_slug text;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Meu Negócio');
  tenant_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(NEW.id::text, 1, 8);

  -- Create or update profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, user_name)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now();

  -- Create role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Check if tenant already exists for this owner
  SELECT id INTO new_tenant_id
  FROM public.tenants
  WHERE owner_id = NEW.id
  LIMIT 1;

  IF new_tenant_id IS NULL THEN
    -- Auto-create tenant
    INSERT INTO public.tenants (name, slug, owner_id, plan, status)
    VALUES (user_name, tenant_slug, NEW.id, 'starter', 'trial')
    RETURNING id INTO new_tenant_id;

    -- Auto-create default attendant only for new tenants
    INSERT INTO public.attendants (name, tenant_id, status, model, temperature, channels, persona, instructions)
    VALUES (
      'Meu Atendente',
      new_tenant_id,
      'offline',
      'openai/gpt-4.1-mini',
      0.7,
      '{"whatsapp","web"}',
      '',
      ''
    );
  END IF;

  RETURN NEW;
END;
$function$;
