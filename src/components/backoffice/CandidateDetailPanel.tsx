import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  User, X, FileText, ClipboardCheck, Calendar, Bookmark,
  BookmarkCheck, StickyNote, Phone, Mail, GraduationCap, Download, ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { ProfileWithEmail } from "./UserOverviewTable";

interface CandidateDetailPanelProps {
  user: ProfileWithEmail | null;
  onClose: () => void;
  onOpenChat: () => void;
}

const phaseLabels: Record<string, string> = {
  interesseren: 'Interesseren',
  orienteren: 'Oriënteren',
  beslissen: 'Beslissen',
  matchen: 'Matchen',
  voorbereiden: 'Voorbereiden',
};

const sectorLabels: Record<string, string> = {
  po: 'Primair Onderwijs',
  vo: 'Voortgezet Onderwijs',
  mbo: 'MBO',
  so: 'Speciaal Onderwijs',
  onbekend: 'Nog onbekend',
};

export function CandidateDetailPanel({ user, onClose, onOpenChat }: CandidateDetailPanelProps) {
  if (!user) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center p-8">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium text-foreground mb-2">Selecteer een kandidaat</h3>
          <p className="text-sm text-muted-foreground">
            Klik op een kandidaat om het volledige profiel te bekijken.
          </p>
        </div>
      </Card>
    );
  }

  const fullName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.first_name || 'Niet ingevuld';

  const appointments = (user as any).appointments || [];
  const savedEvents = (user as any).saved_events || [];
  const savedVacancies = (user as any).saved_vacancies || [];
  const userNotes = (user as any).user_notes || [];
  const testResults = user.test_results as Record<string, any> | null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {fullName}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {user.current_phase && (
            <Badge variant="outline">
              <GraduationCap className="h-3 w-3 mr-1" />
              {phaseLabels[user.current_phase] || user.current_phase}
            </Badge>
          )}
          {user.preferred_sector && (
            <Badge variant="secondary">
              {sectorLabels[user.preferred_sector] || user.preferred_sector}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-5">
            {/* Contact */}
            <Section title="Contact">
              <div className="space-y-2 text-sm">
                {user.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Lid sinds {format(new Date(user.created_at), 'd MMMM yyyy', { locale: nl })}
                </p>
              </div>
            </Section>

            {/* Documenten */}
            <Section title="Documenten & Test">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className={`h-4 w-4 ${user.cv_url ? 'text-primary' : 'text-muted-foreground/40'}`} />
                    <span>{user.cv_url ? 'CV geüpload' : 'Geen CV'}</span>
                  </div>
                  {user.cv_url && (
                    <Button variant="ghost" size="sm" onClick={() => window.open(user.cv_url!, '_blank')}>
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ClipboardCheck className={`h-4 w-4 ${user.test_completed ? 'text-primary' : 'text-muted-foreground/40'}`} />
                  <span>{user.test_completed ? 'Interessetest voltooid' : 'Test niet gemaakt'}</span>
                </div>
                {user.test_completed && testResults && Object.keys(testResults).length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 mt-2">
                    <p className="text-xs font-medium mb-2">Testresultaten:</p>
                    <div className="space-y-1">
                      {Object.entries(testResults).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground capitalize">{key}</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            {/* Afspraken */}
            <Section title={`Afspraken (${appointments.length})`}>
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen afspraken</p>
              ) : (
                <div className="space-y-2">
                  {appointments.slice(0, 5).map((apt: any) => (
                    <div key={apt.id} className="bg-muted/50 rounded-lg p-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{apt.subject}</span>
                        <Badge variant={apt.status === 'pending' ? 'secondary' : apt.status === 'confirmed' ? 'default' : 'outline'} className="text-xs">
                          {apt.status === 'pending' ? 'In afwachting' : apt.status === 'confirmed' ? 'Bevestigd' : apt.status}
                        </Badge>
                      </div>
                      {apt.preferred_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {format(new Date(apt.preferred_date), 'd MMM yyyy', { locale: nl })}
                          {apt.preferred_time && ` om ${apt.preferred_time}`}
                        </p>
                      )}
                      {apt.message && <p className="text-xs text-muted-foreground mt-1">{apt.message}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Opgeslagen vacatures */}
            <Section title={`Vacatures (${savedVacancies.length})`}>
              {savedVacancies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen opgeslagen vacatures</p>
              ) : (
                <div className="space-y-2">
                  {savedVacancies.slice(0, 5).map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{v.title}</p>
                        {v.organization && <p className="text-xs text-muted-foreground">{v.organization}</p>}
                      </div>
                      {v.url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(v.url, '_blank')}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Opgeslagen events */}
            <Section title={`Events (${savedEvents.length})`}>
              {savedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen opgeslagen events</p>
              ) : (
                <div className="space-y-2">
                  {savedEvents.slice(0, 5).map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{e.event_title}</p>
                        {e.event_date && <p className="text-xs text-muted-foreground">{e.event_date}</p>}
                      </div>
                      {e.event_url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(e.event_url, '_blank')}>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Notities */}
            <Section title={`Notities (${userNotes.length})`}>
              {userNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Geen notities</p>
              ) : (
                <div className="space-y-2">
                  {userNotes.slice(0, 5).map((n: any) => (
                    <div key={n.id} className="bg-muted/50 rounded-lg p-2.5 text-sm">
                      <p className="font-medium">{n.title || 'Zonder titel'}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Button variant="outline" className="w-full" onClick={onOpenChat}>
              Open chat met {user.first_name || 'kandidaat'}
            </Button>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h4>
      {children}
      <Separator className="mt-4" />
    </div>
  );
}
