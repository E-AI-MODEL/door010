&nbsp;

## Probleem

De migratie `20260314102000_superuser_prompt_controls.sql` is nooit toegepast op de database. De twee tabellen die de Superuser tab nodig heeft bestaan niet:

- `llm_prompt_configs` — voor prompt overrides per chatbot
- `chatbot_pipeline_events` — voor pipeline fout-logging

## Plan

### Stap 1: Voer de migratie uit

Maak de twee tabellen aan met RLS, triggers en seed-data via een database migratie:

```sql
-- Tabel: llm_prompt_configs
CREATE TABLE IF NOT EXISTS public.llm_prompt_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  prompt_override TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabel: chatbot_pipeline_events
CREATE TABLE IF NOT EXISTS public.chatbot_pipeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatbot_key TEXT NOT NULL,
  stage TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','error')),
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.llm_prompt_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_pipeline_events ENABLE ROW LEVEL SECURITY;

-- Policies: alleen admins
CREATE POLICY "Admins can manage llm prompt configs"
  ON public.llm_prompt_configs FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read pipeline events"
  ON public.chatbot_pipeline_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert pipeline events"
  ON public.chatbot_pipeline_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_llm_prompt_configs_updated_at
  BEFORE UPDATE ON public.llm_prompt_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed de twee chatbot configs
INSERT INTO public.llm_prompt_configs (chatbot_key, title, prompt_override, active) VALUES
  ('doorai-chat', 'DoorAI Authenticated Chat (doorai-chat)', NULL, true),
  ('homepage-coach', 'DoorAI Public Widget (homepage-coach)', NULL, true)
ON CONFLICT (chatbot_key) DO NOTHING;
```

### Stap 2: Verwijder het dubbele migratiebestand

Het bestaande bestand `supabase/migrations/20260314102000_superuser_prompt_controls.sql` bevat dezelfde SQL maar is nooit uitgevoerd. Na de nieuwe migratie kan dit bestand verwijderd worden om conflicten te voorkomen.

### Resultaat

Na de migratie toont de Superuser tab:

- Twee prompt-config kaarten (doorai-chat + homepage-coach) met textarea voor overrides
- Pipeline events tabel (initieel leeg, wordt gevuld door edge functions)
- De aanpassingen in de prompt zijn "plug-in-overrides" op de bestaande systeemprompt en kunnen met toggle aan en uit worden gezet. Deze aanpassing moet! Dus indedaarop volgende werking van de ai chatbots 
-  hebbb.. tot de toggl weer uit gaat. 
- Daarnaast kijk je of je meer. Migraties gemist hebt, analyseert die en geeft een terugkoppeling. 
- Blif binnen scope 