
-- Knowledge base table for RAG (text-based, no vector)
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  attendant_id uuid,
  source_type text NOT NULL DEFAULT 'document',
  source_url text,
  source_name text,
  content text NOT NULL,
  chunk_index integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  search_vector tsvector,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX knowledge_base_tenant_idx ON public.knowledge_base(tenant_id);
CREATE INDEX knowledge_base_attendant_idx ON public.knowledge_base(attendant_id);
CREATE INDEX knowledge_base_search_idx ON public.knowledge_base USING gin(search_vector);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can manage knowledge"
  ON public.knowledge_base FOR ALL
  USING (EXISTS (
    SELECT 1 FROM tenants WHERE tenants.id = knowledge_base.tenant_id AND tenants.owner_id = auth.uid()
  ));

CREATE POLICY "Admins can view all knowledge"
  ON public.knowledge_base FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-update search vector
CREATE OR REPLACE FUNCTION public.update_knowledge_search_vector()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese', COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.source_name, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER knowledge_search_vector_trigger
  BEFORE INSERT OR UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_knowledge_search_vector();

-- Get all knowledge chunks for an attendant
CREATE OR REPLACE FUNCTION public.get_attendant_knowledge(p_attendant_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(content text, source_type text, source_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT kb.content, kb.source_type, kb.source_name
  FROM public.knowledge_base kb
  WHERE kb.attendant_id = p_attendant_id
  ORDER BY kb.created_at DESC
  LIMIT p_limit;
$$;
