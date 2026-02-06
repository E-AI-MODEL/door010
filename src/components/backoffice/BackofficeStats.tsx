import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  Users, 
  TrendingUp,
  Clock,
  UserCheck,
  MessageCircle,
  AlertCircle
} from "lucide-react";
import type { ProfileWithEmail } from "./UserOverviewTable";

interface BackofficeStatsProps {
  profiles: ProfileWithEmail[];
}

export function BackofficeStats({ profiles }: BackofficeStatsProps) {
  const stats = {
    total: profiles.length,
    newThisWeek: profiles.filter(p => {
      const createdDate = new Date(p.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    }).length,
    byPhase: profiles.reduce((acc, p) => {
      const phase = p.current_phase || 'interesseren';
      acc[phase] = (acc[phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    needsAttention: profiles.filter(p => (p.unread_messages ?? 0) > 0).length,
    activeToday: Math.floor(profiles.length * 0.3), // Mock: 30% active today
  };

  const statCards = [
    {
      icon: Users,
      value: stats.total,
      label: 'Totaal kandidaten',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: TrendingUp,
      value: stats.newThisWeek,
      label: 'Nieuw deze week',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: MessageCircle,
      value: stats.activeToday,
      label: 'Actief vandaag',
      color: 'bg-accent/10 text-accent',
    },
    {
      icon: AlertCircle,
      value: stats.needsAttention,
      label: 'Wacht op reactie',
      color: 'bg-destructive/10 text-destructive',
    },
    {
      icon: Clock,
      value: stats.byPhase['interesseren'] || 0,
      label: 'Fase: Interesseren',
      color: 'bg-accent/10 text-accent',
    },
    {
      icon: UserCheck,
      value: stats.byPhase['matchen'] || 0,
      label: 'Fase: Matchen',
      color: 'bg-primary/20 text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => (
        <motion.div 
          key={stat.label}
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
