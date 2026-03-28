
-- Update handle_new_user to also auto-create tenant and default attendant
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
  
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, user_name);
  
  -- Default role is client
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  
  -- Auto-create tenant
  INSERT INTO public.tenants (name, slug, owner_id, plan, status)
  VALUES (user_name, tenant_slug, NEW.id, 'starter', 'trial')
  RETURNING id INTO new_tenant_id;
  
  -- Auto-create default attendant
  INSERT INTO public.attendants (name, tenant_id, status, model, temperature, channels, persona, instructions)
  VALUES (
    'Meu Atendente',
    new_tenant_id,
    'offline',
    'google/gemini-3-flash-preview',
    0.7,
    '{"whatsapp","web"}',
    '',
    ''
  );
  
  RETURN NEW;
END;
$function$;
