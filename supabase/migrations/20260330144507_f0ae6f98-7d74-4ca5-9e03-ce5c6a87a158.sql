
-- Table to track WhatsApp instances per tenant via Evolution API
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  display_name text,
  phone_number text,
  status text NOT NULL DEFAULT 'created',
  qr_code text,
  connected_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, instance_name)
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all instances"
  ON public.whatsapp_instances FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant owners can manage instances"
  ON public.whatsapp_instances FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tenants
    WHERE tenants.id = whatsapp_instances.tenant_id
    AND tenants.owner_id = auth.uid()
  ));

-- Auto-update updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
