import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RefreshCw, Save, Wrench, AlertTriangle, Bot, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type PromptConfig = {
  id: string;
  chatbot_key: string;
  title: string;
  prompt_override: string | null;
  active: boolean;
  notes: string | null;
  updated_at: string;
};

type PipelineEvent = {
  id: string;
  chatbot_key: string;
  stage: string;
  severity: "info" | "warning" | "error";
  message: string;
  created_at: string;
  resolved: boolean;
};

const CHATBOT_KEYS = ["homepage-coach", "doorai-chat"];

function severityBadgeVariant(severity: PipelineEvent["severity"]) {
  if (severity === "error") return "destructive" as const;
  if (severity === "warning") return "secondary" as const;
  return "outline" as const;
}

export function SuperuserControlTab() {
  const [promptConfigs, setPromptConfigs] = useState<PromptConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notesDrafts, setNotesDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [pipelineEvents, setPipelineEvents] = useState<PipelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [filterBot, setFilterBot] = useState<string>("all");

  const loadPromptConfigs = useCallback(async () => {
    const { data, error } = await supabase
      .from("llm_prompt_configs")
      .select("id, chatbot_key, title, prompt_override, active, notes, updated_at")
      .order("chatbot_key", { ascending: true });

    if (error) {
      toast.error("Kon prompt-instellingen niet laden");
      console.error("Failed to load prompt configs", error);
      return;
    }

    const rows = (data ?? []) as PromptConfig[];
    setPromptConfigs(rows);
    setDrafts(
      Object.fromEntries(rows.map((row) => [row.chatbot_key, row.prompt_override ?? ""])),
    );
    setNotesDrafts(
      Object.fromEntries(rows.map((row) => [row.chatbot_key, row.notes ?? ""])),
    );
  }, []);

  const loadPipelineEvents = useCallback(async () => {
    setLoadingEvents(true);
    const query = supabase
      .from("chatbot_pipeline_events")
      .select("id, chatbot_key, stage, severity, message, created_at, resolved")
      .order("created_at", { ascending: false })
      .limit(80);

    const { data, error } = await query;
    if (error) {
      toast.error("Kon pipeline-events niet laden");
      console.error("Failed to load pipeline events", error);
      setLoadingEvents(false);
      return;
    }

    setPipelineEvents((data ?? []) as PipelineEvent[]);
    setLoadingEvents(false);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPromptConfigs(), loadPipelineEvents()]);
    setLoading(false);
  }, [loadPromptConfigs, loadPipelineEvents]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const saveConfig = async (config: PromptConfig) => {
    setSavingKey(config.chatbot_key);

    const { data: authData } = await supabase.auth.getUser();
    const updatePayload = {
      prompt_override: drafts[config.chatbot_key]?.trim() || null,
      notes: notesDrafts[config.chatbot_key]?.trim() || null,
      updated_by: authData.user?.id ?? null,
    };

    const { error } = await supabase
      .from("llm_prompt_configs")
      .update(updatePayload)
      .eq("id", config.id);

    if (error) {
      toast.error("Opslaan mislukt");
      console.error("Failed to save prompt config", error);
      setSavingKey(null);
      return;
    }

    toast.success("Prompt-instelling opgeslagen");
    await loadPromptConfigs();
    setSavingKey(null);
  };

  const clearOverride = async (config: PromptConfig) => {
    setDrafts((prev) => ({ ...prev, [config.chatbot_key]: "" }));
    setSavingKey(config.chatbot_key);

    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("llm_prompt_configs")
      .update({ prompt_override: null, updated_by: authData.user?.id ?? null })
      .eq("id", config.id);

    if (error) {
      toast.error("Reset van prompt override mislukt");
      console.error("Failed to clear prompt override", error);
      setSavingKey(null);
      return;
    }

    toast.success("Override verwijderd - fallback prompt actief");
    await loadPromptConfigs();
    setSavingKey(null);
  };

  const filteredEvents = useMemo(() => {
    if (filterBot === "all") return pipelineEvents;
    return pipelineEvents.filter((event) => event.chatbot_key === filterBot);
  }, [filterBot, pipelineEvents]);

  const eventCounts = useMemo(() => {
    return {
      total: pipelineEvents.length,
      errors: pipelineEvents.filter((e) => e.severity === "error").length,
      warnings: pipelineEvents.filter((e) => e.severity === "warning").length,
      unresolved: pipelineEvents.filter((e) => !e.resolved).length,
    };
  }, [pipelineEvents]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Superuser besturing
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                Hier kun je per chatbot de systeemprompt overriden en pipeline-fouten monitoren.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading || loadingEvents}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading || loadingEvents ? "animate-spin" : ""}`} />
              Vernieuwen
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Pipeline events</p>
            <p className="text-2xl font-semibold">{eventCounts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Errors</p>
            <p className="text-2xl font-semibold text-destructive">{eventCounts.errors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Warnings</p>
            <p className="text-2xl font-semibold text-amber-500">{eventCounts.warnings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Open issues</p>
            <p className="text-2xl font-semibold">{eventCounts.unresolved}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {promptConfigs.map((config) => (
          <Card key={config.id} className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Bot className="h-4 w-4" />
                  {config.title}
                </span>
                <Badge variant={config.active ? "outline" : "secondary"}>{config.active ? "Actief" : "Inactief"}</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Key: {config.chatbot_key}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Systeemprompt override</p>
                <Textarea
                  value={drafts[config.chatbot_key] ?? ""}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [config.chatbot_key]: e.target.value }))}
                  placeholder="Laat leeg om fallback in code te gebruiken"
                  className="min-h-40 text-xs"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notities / tuning rationale</p>
                <Textarea
                  value={notesDrafts[config.chatbot_key] ?? ""}
                  onChange={(e) => setNotesDrafts((prev) => ({ ...prev, [config.chatbot_key]: e.target.value }))}
                  placeholder="Bijv. waarom deze override is ingesteld"
                  className="min-h-20 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => saveConfig(config)} disabled={savingKey === config.chatbot_key}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Opslaan
                </Button>
                <Button variant="outline" size="sm" onClick={() => clearOverride(config)} disabled={savingKey === config.chatbot_key}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset override
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Laatste update: {new Date(config.updated_at).toLocaleString("nl-NL")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pipeline fouten & waarschuwingen
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                value={filterBot}
                onChange={(e) => setFilterBot(e.target.value)}
                placeholder="Filter bot (all / homepage-coach / doorai-chat)"
                className="h-8 text-xs w-[280px]"
              />
              <Button variant="outline" size="sm" onClick={loadPipelineEvents} disabled={loadingEvents}>
                <RefreshCw className={`h-3.5 w-3.5 ${loadingEvents ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && pipelineEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">Laden...</p>
          ) : filteredEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">Geen events gevonden voor dit filter.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredEvents.map((event) => (
                <div key={event.id} className="rounded-lg border p-3 bg-card">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={severityBadgeVariant(event.severity)} className="capitalize">
                      {event.severity}
                    </Badge>
                    <Badge variant="outline">{event.chatbot_key}</Badge>
                    <span className="text-[11px] text-muted-foreground">{event.stage}</span>
                    {!event.resolved && <Badge variant="secondary">open</Badge>}
                  </div>
                  <p className="text-sm">{event.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(event.created_at).toLocaleString("nl-NL")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {promptConfigs.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Geen prompt-configs gevonden. Controleer of de migratie voor superuser controls is toegepast.
            </p>
          </CardContent>
        </Card>
      )}

      {CHATBOT_KEYS.some((key) => !promptConfigs.some((config) => config.chatbot_key === key)) && !loading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Let op: niet alle verwachte chatbot keys zijn aanwezig in <code>llm_prompt_configs</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
