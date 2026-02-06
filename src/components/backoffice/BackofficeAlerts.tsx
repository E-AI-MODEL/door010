import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  ArrowRight, 
  MessageCircle, 
  AlertTriangle,
  Clock,
  UserCheck,
  HelpCircle,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export type AlertType = 
  | 'phase_change' 
  | 'critical_point' 
  | 'inactive' 
  | 'needs_support' 
  | 'has_question'
  | 'new_signup';

export interface DashboardAlert {
  id: string;
  type: AlertType;
  user_name: string;
  user_id: string;
  message: string;
  detail?: string;
  created_at: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
}

// Mock alerts for development
const mockAlerts: DashboardAlert[] = [
  {
    id: '1',
    type: 'phase_change',
    user_name: 'Maria de Jong',
    user_id: 'user-1',
    message: 'Is naar fase "Beslissen" gegaan',
    detail: 'Oriënteren → Beslissen',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    is_read: false,
    priority: 'medium',
  },
  {
    id: '2',
    type: 'has_question',
    user_name: 'Jan Bakker',
    user_id: 'user-2',
    message: 'Heeft een vraag gesteld aan een medewerker',
    detail: '"Kan iemand mij helpen met de toelatingseisen?"',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    is_read: false,
    priority: 'high',
  },
  {
    id: '3',
    type: 'critical_point',
    user_name: 'Sophie van der Berg',
    user_id: 'user-3',
    message: 'Bevindt zich op een kritiek beslismoment',
    detail: 'Twijfelt tussen zij-instroom en deeltijd opleiding',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    is_read: false,
    priority: 'high',
  },
  {
    id: '4',
    type: 'inactive',
    user_name: 'Thomas Visser',
    user_id: 'user-4',
    message: 'Is al 7 dagen niet actief geweest',
    detail: 'Laatste activiteit: oriëntatie PO',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    is_read: true,
    priority: 'medium',
  },
  {
    id: '5',
    type: 'needs_support',
    user_name: 'Emma Smit',
    user_id: 'user-5',
    message: 'DOORai detecteerde ondersteuningsbehoefte',
    detail: 'Meerdere vragen over financiering en toelating',
    created_at: new Date(Date.now() - 21600000).toISOString(),
    is_read: true,
    priority: 'medium',
  },
  {
    id: '6',
    type: 'new_signup',
    user_name: 'Daan Jansen',
    user_id: 'user-6',
    message: 'Nieuwe aanmelding',
    detail: 'Interesse: VO, Wiskunde',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    is_read: true,
    priority: 'low',
  },
];

const alertConfig: Record<AlertType, { 
  icon: typeof Bell; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  phase_change: {
    icon: TrendingUp,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    label: 'Fase wijziging',
  },
  critical_point: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Kritiek punt',
  },
  inactive: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Inactief',
  },
  needs_support: {
    icon: HelpCircle,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    label: 'Ondersteuning nodig',
  },
  has_question: {
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Vraag gesteld',
  },
  new_signup: {
    icon: UserCheck,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    label: 'Nieuwe aanmelding',
  },
};

interface BackofficeAlertsProps {
  onSelectUser?: (userId: string) => void;
}

export function BackofficeAlerts({ onSelectUser }: BackofficeAlertsProps) {
  const alerts = mockAlerts;
  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Meldingen</CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-accent text-accent-foreground text-xs">
                {unreadCount} nieuw
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs">
            Alles gelezen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px]">
          <div className="space-y-1 px-4 pb-4">
            {alerts.map((alert, index) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer hover:bg-muted/50 ${
                    !alert.is_read ? 'bg-muted/30 border-primary/20' : 'border-transparent'
                  }`}
                  onClick={() => onSelectUser?.(alert.user_id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 ${config.bgColor}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">
                          {alert.user_name}
                        </p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(alert.created_at), 'HH:mm', { locale: nl })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {alert.message}
                      </p>
                      {alert.detail && (
                        <p className="text-xs text-muted-foreground/80 mt-1 italic">
                          {alert.detail}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-xs ${config.color} border-current/20`}>
                          {config.label}
                        </Badge>
                        {alert.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
